// 排盘编排 — 对应 legacy/najia/najia/najia.py 的 Najia.compile() + export()
import {
  GUA64, GUAS, GUA5, ZHI5, ZHIS_DICT, XING5, XING5_DICT,
} from './const.js'
import {
  setShiYao, palace, getNajia, getGod6, getType,
  calcHidden, calcTransform, gz5x, getQin6,
} from './hexagram.js'
import {
  getDaily, dateToYueRiChen, calcYueLing, isYuePo, isXunKong,
} from './time-analysis.js'
import type { HexagramResult, PaipanInput, YueLing, BatchResult } from './types.js'

const VALID_ZHI = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])

/**
 * 解析日期字符串 "YYYY-MM-DD HH:MM" → { y, mo, d, h, solarIso }。
 * 干支计算只用 y/mo/d/h 分量；solarIso 的 "+00:00" 后缀沿用 Python arrow 约定，
 * 仅作 solar 展示字段的标签，不参与任何算法（core 时区中立，详见 localNow）。
 */
function parseDate(date: string): { y: number; mo: number; d: number; h: number; solarIso: string } {
  const [datePart, timePart = '00:00'] = date.split(' ')
  const [y, mo, d] = datePart.split('-').map((x) => parseInt(x, 10))
  const [h, mi = 0] = timePart.split(':').map((x) => parseInt(x, 10))
  const pad = (n: number) => String(n).padStart(2, '0')
  const solarIso = `${datePart}T${pad(h)}:${pad(mi)}:00+00:00`
  return { y, mo, d, h, solarIso }
}

/**
 * 无 date 时的默认「现在」——取运行环境本地墙钟时间为 "YYYY-MM-DD HH:MM"。
 * core 时区中立：干支只认那一刻的墙钟分量，用哪个地方的钟由调用方（前端浏览器本地时区）决定。
 */
function localNow(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`
}

/** 由纳甲列表 + 卦宫计算六亲（compile 内联逻辑） */
function calcQin6FromNajia(najiaList: string[], gongIdx: number): string[] {
  const pe = XING5_DICT[XING5[GUA5[gongIdx]]]
  return najiaList.map((gz) => getQin6(pe, ZHI5[ZHIS_DICT[gz[1]]]))
}

/**
 * 六爻排盘 — 输入爻位参数（+可选日期/性别），输出完整卦象结果。
 * 与 legacy Python Najia.compile().export() 逐字段对齐。
 */
export function compile(input: PaipanInput): HexagramResult {
  const { params, date } = input
  if (!params || params.length !== 6) {
    throw new Error('params 必须为 6 个爻位（1-4）')
  }

  // 卦码：每位 %2（奇为阳1，偶为阴0）
  const mark = params.map((p) => String(p % 2)).join('')
  const shiy = setShiYao(mark)
  const gongIdx = palace(mark, shiy[0])
  const name = GUA64[mark]
  const najiaList = getNajia(mark)

  const qin6 = calcQin6FromNajia(najiaList, gongIdx)
  const qinx = najiaList.map(gz5x)

  // 动爻：params > 2
  const dong = params.map((p, i) => (p > 2 ? i : -1)).filter((i) => i >= 0)

  const hide = calcHidden(gongIdx, qin6)
  const bian = calcTransform(params, gongIdx)

  // 时间维度：无 date 时用本地墙钟「现在」（core 时区中立）
  const effectiveDate = date ?? localNow()
  const { y, mo, d, h, solarIso } = parseDate(effectiveDate)
  const daily = getDaily(y, mo, d, h)
  const god6 = getGod6(daily.gz.day)

  // 月建/日辰（按节气干支历）— 始终基于 effectiveDate，无 date 时亦回填
  const [yueZhi, riChen] = dateToYueRiChen(effectiveDate)

  let yueLing: YueLing[] | null = null
  let yuePo: boolean[] | null = null
  let xunKong: boolean[] | null = null

  if (yueZhi !== null || riChen !== null) {
    const yaoDizhi = najiaList.map((gz) => gz[1] ?? '')
    if (yueZhi !== null && VALID_ZHI.has(yueZhi)) {
      const wuxingStr = yaoDizhi.map((dz) => {
        if (dz && dz in ZHIS_DICT) {
          const zhiIdx = ZHIS_DICT[dz]
          const wIdx = zhiIdx < ZHI5.length ? ZHI5[zhiIdx] : 0
          return wIdx >= 0 && wIdx < XING5.length ? XING5[wIdx] : ''
        }
        return ''
      })
      yueLing = wuxingStr.map((w) => (w ? (calcYueLing(w, yueZhi) as YueLing) : ''))
      yuePo = yaoDizhi.map((dz) => (dz ? isYuePo(dz, yueZhi) : false))
    }
    if (riChen !== null) {
      xunKong = yaoDizhi.map((dz) => (dz ? isXunKong(dz, riChen) : false))
    }
  }

  const result: HexagramResult = {
    params,
    mark,
    name,
    gong: GUAS[gongIdx],
    shiy,
    qin6,
    qinx,
    god6,
    dong,
    solar: solarIso,
    lunar: { xkong: daily.xkong, gz: daily.gz },
    hexagram_type: getType(mark),
  }

  // 与 Python to_dict 一致：bian/hide/guaci 仅在非空时附加
  if (bian !== null) result.bian = bian
  if (hide !== null) result.hide = hide
  // 卦辞暂未移植（TODO：从 data/guaci.json 加载）

  // 与 Python to_dict 一致：时间维度字段仅在非空时附加
  if (yueLing !== null) result.yue_ling = yueLing
  if (yuePo !== null) result.yue_po = yuePo
  if (xunKong !== null) result.xun_kong = xunKong
  if (yueZhi !== null) result.yue_zhi = yueZhi
  if (riChen !== null) result.ri_chen = riChen

  return result
}

/**
 * 批量排盘 — 逐个独立编译，单个失败不影响其余（错误隔离）。
 * 新架构在 JS 单线程同步执行（每卦 <10ms），无需 legacy 的线程池并发。
 */
export function compileBatch(inputs: PaipanInput[]): BatchResult {
  const items = inputs.map((input, index) => {
    try {
      return { index, success: true as const, result: compile(input) }
    } catch (err) {
      return {
        index,
        success: false as const,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })
  const successCount = items.filter((it) => it.success).length
  return {
    items,
    successCount,
    errorCount: items.length - successCount,
  }
}
