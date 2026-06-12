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
  // 旬空/月破：逐爻布尔（core 算好透传，AI 不必自行推旬空）
  xun_kong?: boolean[]
  yue_po?: boolean[]
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
  // 卦爻动变关系（逐爻本→变 + 反吟/伏吟/进退神），core 算好透传
  yao_relation?: {
    changes: Array<{
      pos: number
      ben_zhi: string
      bian_zhi: string
      relation: string
      fanyin: boolean
      fuyin: boolean
      note: string
    }>
    fanyin: number[]
    fanyin_scope: string
    fuyin: number[]
    fuyin_scope: string
    jinshen: number[]
    tuishen: number[]
  } | null
  // 用神标记（问题→用神六亲→爻位 + 原忌仇神）
  yongshen?: {
    category: string
    yongshen: string
    positions: number[]
    multiple: boolean
    hidden: boolean
    hidden_seat: number[]
    yuanshen: { qin: string; positions: number[] }
    jishen: { qin: string; positions: number[] }
    choushen: { qin: string; positions: number[] }
    note: string
  }
  // 卦身（月卦身），core 算好透传
  gua_shen?: {
    zhi: string
    yang_shi: boolean
    positions: number[]
    shang_gua: boolean
    note: string
  } | null
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
