// 时间维度断卦 — 从 legacy/najia/najia/{time_analysis,lunar_utils}.py 移植
// 农历/干支底层用 tyme4ts（6tail TS 原生版）
import { SolarDay, SolarTime } from 'tyme4ts'
import { ZHIS, ZHI5, XING5, GANS } from './const.js'

// 地支→五行字（由 const.ZHI5 + XING5 派生，对齐 time_analysis.DIZHI_WUXING）
const DIZHI_WUXING: Record<string, string> = Object.fromEntries(
  ZHIS.map((zhi, idx) => [zhi, XING5[ZHI5[idx]]]),
)

// 冲关系（月破）
const CHONG_MAP: Record<string, string> = {
  子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
  午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳',
}

// 五行生克
const SHENG_CYCLE = new Set(['金水', '水木', '木火', '火土', '土金'])
const KE_RELATIONS = new Set(['金木', '木土', '土水', '火金', '水火'])

/** 月令旺衰：同我为旺，生我为相，我生为休，克我为囚，我克为死 */
export function calcYueLing(yaoWuxing: string, yueZhi: string): string {
  const yueWuxing = DIZHI_WUXING[yueZhi]
  if (yueWuxing === yaoWuxing) return '旺'
  if (SHENG_CYCLE.has(yueWuxing + yaoWuxing)) return '相'
  if (SHENG_CYCLE.has(yaoWuxing + yueWuxing)) return '休'
  if (KE_RELATIONS.has(yueWuxing + yaoWuxing)) return '死'
  if (KE_RELATIONS.has(yaoWuxing + yueWuxing)) return '囚'
  return ''
}

/** 月破：爻地支与月建相冲 */
export function isYuePo(yaoDizhi: string, yueZhi: string): boolean {
  return CHONG_MAP[yaoDizhi] === yueZhi
}

/** 旬空：返回该日辰所在旬空亡的两个地支（time_analysis.get_xun_kong） */
export function getXunKong(riChen: string): string[] {
  if (riChen.length < 2) return []
  const gan = riChen[0]
  const zhi = riChen.slice(1)
  const ganIdx = GANS.indexOf(gan)
  const zhiIdx = ZHIS.indexOf(zhi)
  if (ganIdx < 0 || zhiIdx < 0) return []
  const start = ((zhiIdx - ganIdx) % 12 + 12) % 12
  const k1 = ZHIS[((start - 2) % 12 + 12) % 12]
  const k2 = ZHIS[((start - 1) % 12 + 12) % 12]
  return [k1, k2]
}

/** 爻地支是否旬空 */
export function isXunKong(yaoDizhi: string, riChen: string): boolean {
  return getXunKong(riChen).includes(yaoDizhi)
}

/**
 * 公历日期字符串 → [月建地支, 日辰干支]（lunar_utils.date_to_yue_ri_chen）
 * 用 tyme4ts 替代 lunar-python。
 */
export function dateToYueRiChen(dateStr: string): [string, string] {
  const datePart = dateStr.split(' ')[0]
  const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10))
  // 六爻月建按节气（干支历月柱），非农历月。日辰为干支历日柱。
  const scd = SolarDay.fromYmd(y, m, d).getSixtyCycleDay()
  const yueZhi = scd.getMonth().getEarthBranch().getName()
  const riChen = scd.getSixtyCycle().getName()
  return [yueZhi, riChen]
}

/**
 * 公历日期 → 四柱干支 + 旬空（替代 najia._daily）
 * 返回 { gz: {year,month,day,hour}, xkong }
 */
export function getDaily(
  y: number, mo: number, d: number, h: number,
): { gz: { year: string; month: string; day: string; hour: string }; xkong: string } {
  const lunarHour = SolarTime.fromYmdHms(y, mo, d, h, 0, 0)
    .getLunarHour()
  const eightChar = lunarHour.getEightChar()
  // 日柱统一取 LunarDay（不在 23:00 滚动到次日），与 Python getBaZi 一致。
  // EightChar.getDay() 在 23:00 会滚到次日子时，导致 god6 与旬空/ri_chen 取不同日柱而自相矛盾。
  const dayCycle = lunarHour.getLunarDay().getSixtyCycle()
  // 旬空：日柱所缺地支（与 lunar-python getDayXunKong 对齐）
  const kong = dayCycle.getExtraEarthBranches().map((b) => b.getName()).join('')
  return {
    gz: {
      year: eightChar.getYear().getName(),
      month: eightChar.getMonth().getName(),
      day: dayCycle.getName(),
      hour: eightChar.getHour().getName(),
    },
    xkong: kong,
  }
}
