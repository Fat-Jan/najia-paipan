// 解读接口契约 — 与前端 apps/web/src/types 对齐

export interface HexagramData {
  name: string
  gong: string
  mark: string
  shiy: number[]
  qin6: string[]
  qinx: string[]
  god6: string[]
  yue_ling?: string[]
  yue_zhi?: string
  ri_chen?: string
  dong: number[]
  bian_name?: string
  hide_name?: string
  // 变卦逐爻（动爻变出的卦象，供 AI 分析动变关系，避免瞎编）
  bian_qin6?: string[]
  bian_qinx?: string[]
  // 伏神逐爻
  hide_qin6?: string[]
  hide_qinx?: string[]
  hide_seat?: number[]
}

export interface InterpretRequest {
  hexagram_data: HexagramData
  question: string
}

export interface RuleAnalysis {
  wuxing_balance: string
  shiy_relation: string
  yueling_status: string
  dongyao_analysis: string
  jixiong: string
}

export interface InterpretResponse {
  hexagram_name: string
  jixiong: string
  rule_analysis: RuleAnalysis
  ai_interpretation: string
}
