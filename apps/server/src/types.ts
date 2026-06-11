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
