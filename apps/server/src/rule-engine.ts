// 规则引擎 — 基于卦象数据的启发式吉凶分析。
// 替换 legacy api.py 里写死的占位字符串，做真实可解释的计算。
// 定位：可解释的规则启发，非专业断卦。
import type { HexagramData, RuleAnalysis } from './types.js'

const WUXING = ['木', '火', '土', '金', '水'] as const
type Wuxing = (typeof WUXING)[number]

// 五行生克：相生（key 生 value）/ 相克（key 克 value）
const SHENG: Record<Wuxing, Wuxing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<Wuxing, Wuxing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

/** 从纳甲五行串（如 "丙辰土"）末字提取五行 */
function extractWuxing(qinx: string): Wuxing | null {
  const last = qinx.slice(-1)
  return (WUXING as readonly string[]).includes(last) ? (last as Wuxing) : null
}

/** 五行平衡：统计六爻五行分布，指出偏旺/偏缺 */
function analyzeWuxing(qinx: string[]): string {
  const count: Record<Wuxing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const q of qinx) {
    const w = extractWuxing(q)
    if (w) count[w]++
  }
  const entries = WUXING.map((w) => `${w}${count[w]}`)
  const max = Math.max(...WUXING.map((w) => count[w]))
  const min = Math.min(...WUXING.map((w) => count[w]))
  const strong = WUXING.filter((w) => count[w] === max)
  const absent = WUXING.filter((w) => count[w] === 0)
  let note = `五行分布：${entries.join(' ')}。`
  if (absent.length > 0) note += `缺${absent.join('、')}，`
  if (max - min >= 3) note += `${strong.join('、')}偏旺，分布欠均衡。`
  else note += '分布大体均衡。'
  return note
}

/** 世应关系：距离 + 生克（用世应爻的五行） */
function analyzeShiy(data: HexagramData): string {
  const shiy = data.shiy ?? []
  const qinx = data.qinx ?? []
  const [shi, ying] = shiy
  if (shi == null || ying == null) return '世应信息不全。'
  const shiWx = extractWuxing(qinx[shi - 1] ?? '')
  const yingWx = extractWuxing(qinx[ying - 1] ?? '')
  const dist = Math.abs(shi - ying)
  let rel = `世爻在${shi}爻、应爻在${ying}爻，相距${dist}位。`
  if (shiWx && yingWx) {
    if (SHENG[yingWx] === shiWx) rel += '应生世，外力相助，主吉。'
    else if (SHENG[shiWx] === yingWx) rel += '世生应，付出较多，宜量力。'
    else if (KE[yingWx] === shiWx) rel += '应克世，受制于外，宜谨慎。'
    else if (KE[shiWx] === yingWx) rel += '世克应，主动可成，但需把握分寸。'
    else if (shiWx === yingWx) rel += '世应比和，关系融洽。'
    else rel += '世应无直接生克。'
  }
  return rel
}

/** 月令旺衰：聚合六爻旺衰，给整体强弱 */
function analyzeYueling(yueLing?: string[], yueZhi?: string): string {
  if (!yueLing || yueLing.length === 0) return '无月令信息（未指定日期）。'
  const score: Record<string, number> = { 旺: 2, 相: 1, 休: 0, 囚: -1, 死: -2 }
  const total = yueLing.reduce((s, x) => s + (score[x] ?? 0), 0)
  const head = yueZhi ? `月建${yueZhi}，` : ''
  if (total >= 3) return `${head}整体月令偏旺，卦象有力。`
  if (total <= -3) return `${head}整体月令偏弱，卦气不足。`
  return `${head}月令旺衰参半，强弱相当。`
}

/** 动爻分析：数量 + 位置 + 是否有变卦 */
function analyzeDongyao(data: HexagramData): string {
  const dong = data.dong ?? []
  if (dong.length === 0) return '静卦无动爻，事态稳定，宜守不宜动。'
  const positions = dong.map((i) => i + 1).join('、')
  let note = `有${dong.length}个动爻（第${positions}爻），主变化。`
  if (data.bian_name) note += `变为「${data.bian_name}」，需观变卦走向。`
  if (dong.length >= 4) note += '动爻偏多，事态多变，宜静心待定。'
  return note
}

/** 综合吉凶：由月令强弱 + 世应关系粗判 */
function judgeJixiong(data: HexagramData): string {
  let score = 0
  // 月令
  if (data.yue_ling && data.yue_ling.length > 0) {
    const s: Record<string, number> = { 旺: 2, 相: 1, 休: 0, 囚: -1, 死: -2 }
    score += data.yue_ling.reduce((acc, x) => acc + (s[x] ?? 0), 0) / 3
  }
  // 世应生克
  const shiy = data.shiy ?? []
  const qinx = data.qinx ?? []
  const [shi, ying] = shiy
  if (shi != null && ying != null) {
    const shiWx = extractWuxing(qinx[shi - 1] ?? '')
    const yingWx = extractWuxing(qinx[ying - 1] ?? '')
    if (shiWx && yingWx) {
      if (SHENG[yingWx] === shiWx) score += 2
      else if (KE[yingWx] === shiWx) score -= 2
      else if (KE[shiWx] === yingWx) score += 1
    }
  }
  if (score >= 3) return '大吉'
  if (score >= 1) return '中吉'
  if (score > -1) return '平'
  if (score > -3) return '小凶'
  return '大凶'
}

/** 运行完整规则引擎 */
export function runRuleEngine(data: HexagramData): RuleAnalysis {
  const jixiong = judgeJixiong(data)
  return {
    wuxing_balance: analyzeWuxing(data.qinx ?? []),
    shiy_relation: analyzeShiy(data),
    yueling_status: analyzeYueling(data.yue_ling, data.yue_zhi),
    dongyao_analysis: analyzeDongyao(data),
    jixiong,
  }
}
