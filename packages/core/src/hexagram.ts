// 六爻排盘核心算法 — 从 legacy/najia/najia/{utils,najia}.py 移植
import {
  GANS, ZHIS, ZHI5, XING5, GUAS, GUA5, GUA64, YAOS, KONG, LIUHE,
  XING5_DICT, ZHIS_DICT, YAOS_DICT, QIN6_MATRIX, NAJIA_PRECOMPUTED,
} from './const.js'

/** 干支五行：在干支后追加其地支对应的五行字（utils.GZ5X） */
export function gz5x(gz: string): string {
  const z = gz[1]
  const zm = ZHIS.indexOf(z)
  return gz + XING5[ZHI5[zm]]
}

/** 旬空（utils.xkong），输入如 '甲子' */
export function xkong(gz = '甲子'): string {
  let gm = GANS.indexOf(gz[0])
  let zm = ZHIS.indexOf(gz[1])
  if (gm === zm || zm < gm) zm += 12
  const xk = Math.trunc((zm - gm) / 2) - 1
  return KONG[xk]
}

/** 六神（utils.get_god6），输入日干支，返回 6 个六神 */
export function getGod6(gz: string): string[] {
  const SHEN6 = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
  const gm = GANS.indexOf(gz[0])
  let num = Math.ceil((gm + 1) / 2) - 7
  if (gm === 4) num = -4
  if (gm === 5) num = -3
  if (gm > 5) num += 1
  // Python: SHEN6[num:] + SHEN6[:num]（num 为负，等价右旋）
  const n = ((num % 6) + 6) % 6
  return [...SHEN6.slice(n), ...SHEN6.slice(0, n)]
}

/** 世应爻（utils.set_shi_yao）→ [世, 应, 卦宫索引] */
export function setShiYao(symbol: string): [number, number, number] {
  const nei = symbol.slice(0, 3)
  const wai = symbol.slice(3)

  const shiy = (shi: number, index?: number): [number, number, number] => {
    const ying = shi > 3 ? shi - 3 : shi + 3
    return [shi, ying, index === undefined ? shi : index]
  }

  // 天同二世天变五
  if (wai[2] === nei[2]) {
    if (wai[1] !== nei[1] && wai[0] !== nei[0]) return shiy(2)
  } else {
    if (wai[1] === nei[1] && wai[0] === nei[0]) return shiy(5)
  }

  // 人同游魂人变归
  if (wai[1] === nei[1]) {
    if (wai[0] !== nei[0] && wai[2] !== nei[2]) return shiy(4, 6)
  } else {
    if (wai[0] === nei[0] && wai[2] === nei[2]) return shiy(3, 6)
  }

  // 地同四世地变初
  if (wai[0] === nei[0]) {
    if (wai[1] !== nei[1] && wai[2] !== nei[2]) return shiy(4)
  } else {
    if (wai[1] === nei[1] && wai[2] === nei[2]) return shiy(1)
  }

  // 本宫六世
  if (wai === nei) return shiy(6)

  // 三世异
  return shiy(3)
}

/** 游魂/归魂判定（utils.soul） */
function soul(symbol: string): string {
  const nei = symbol.slice(0, 3)
  const wai = symbol.slice(3)
  if (wai[1] === nei[1]) {
    if (wai[0] !== nei[0] && wai[2] !== nei[2]) return '游魂'
  } else {
    if (wai[0] === nei[0] && wai[2] === nei[2]) return '归魂'
  }
  return ''
}

/** 六冲判定（utils.attack） */
function attack(symbol: string): boolean {
  const nei = symbol.slice(0, 3)
  const wai = symbol.slice(3)
  if (wai === nei) return true
  // 天雷无妄 / 雷天大壮：内外卦集合 ⊆ {100, 111} 且能凑齐
  const gua = new Set([nei, wai])
  for (const g of gua) if (g !== '100' && g !== '111') return false
  return true
}

/** 六合判定（utils.unite） */
function unite(symbol: string): string | null {
  const name = GUA64[symbol]
  for (const x of LIUHE) if (name.includes(x)) return '六合'
  return null
}

/** 卦象类型（utils.get_type）：游魂/归魂 > 六冲 > 六合 */
export function getType(symbol: string): string {
  const s = soul(symbol)
  if (s) return s
  if (attack(symbol)) return '六冲'
  const u = unite(symbol)
  if (u) return u
  return ''
}

/** 卦宫索引（utils.palace） */
export function palace(symbol: string, index: number): number {
  const nei = symbol.slice(0, 3)
  const wai = symbol.slice(3)
  const hun = soul(symbol)

  // 归魂内卦是本宫
  if (hun === '归魂') return YAOS_DICT[nei]

  // 一二三六外卦宫
  if ([1, 2, 3, 6].includes(index)) return YAOS_DICT[wai]

  // 四五游魂内变更
  if ([4, 5].includes(index) || hun === '游魂') {
    const neiInt = parseInt(nei, 2)
    const transformed = (neiInt ^ 0b111).toString(2).padStart(3, '0')
    return YAOS_DICT[transformed]
  }

  // 理论不可达：setShiYao 恒返回 shi∈[1,6]，三分支必命中其一。
  // 若 symbol 非法导致漏判，fail-fast 抛错而非返回假「乾宫(0)」（对齐 Python 隐式 None → 后续崩溃）。
  throw new Error(`palace: 无法确定卦宫 symbol=${symbol} index=${index}`)
}

/** 纳甲查表（utils.get_najia） */
export function getNajia(symbol: string): string[] {
  return NAJIA_PRECOMPUTED[symbol]
}

/** 两五行判六亲（utils.get_qin6），入参为五行字或索引 */
export function getQin6(w1: string | number, w2: string | number): string {
  const i1 = typeof w1 === 'string' ? XING5_DICT[w1] : w1
  const i2 = typeof w2 === 'string' ? XING5_DICT[w2] : w2
  return QIN6_MATRIX[i1][i2]
}

/** 卦宫五行索引（compile 中重复用到的派生量） */
function palaceElementIdx(gongIdx: number): number {
  return XING5_DICT[XING5[GUA5[gongIdx]]]
}

/** 由纳甲列表计算六亲（compile 内联逻辑） */
function calcQin6(mark: string, gongIdx: number): string[] {
  const pe = palaceElementIdx(gongIdx)
  return getNajia(mark).map((gz) => getQin6(pe, ZHI5[ZHIS_DICT[gz[1]]]))
}

import type { HiddenHexagram, TransformedHexagram } from './types.js'

/** 伏神（najia._hidden） */
export function calcHidden(gongIdx: number, qins: string[]): HiddenHexagram | null {
  if (new Set(qins).size < 5) {
    const mark = YAOS[gongIdx].repeat(2)
    const qin6 = calcQin6(mark, gongIdx)
    const qinx = getNajia(mark).map(gz5x)
    const missing = [...new Set(qin6)].filter((x) => !new Set(qins).has(x))
    // seat 语义为「伏神所在位置的集合」，顺序无意义；排序输出保证确定性。
    // （Python 原实现用 set.difference，顺序随 PYTHONHASHSEED 变化，不可作为顺序基准）
    const seat = missing.map((x) => qin6.indexOf(x)).sort((a, b) => a - b)
    return { name: GUA64[mark], mark, qin6, qinx, seat }
  }
  return null
}

/** 变卦（najia._transform） */
export function calcTransform(params: number[], gongIdx: number): TransformedHexagram | null {
  if (params.includes(3) || params.includes(4)) {
    const mark = params.map((v) => (v === 1 || v === 4 ? '1' : '0')).join('')
    const qin6 = calcQin6(mark, gongIdx)
    const qinx = getNajia(mark).map(gz5x)
    return {
      name: GUA64[mark],
      mark,
      qin6,
      qinx,
      gong: GUAS[gongIdx],
      hexagram_type: getType(mark),
    }
  }
  return null
}

export { calcQin6 }
