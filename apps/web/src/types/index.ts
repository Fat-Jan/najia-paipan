// 前端类型 — 排盘相关类型直接复用 @najia/core，此处只定义前端特有类型
import type { HexagramResult, YaoParam, Gender } from '@najia/core'

export type { HexagramResult, YaoParam, Gender }

// AI 智能解读请求（走后端 /interpret）
export interface InterpretRequest {
  hexagram_data: {
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
  question: string
}

// AI 智能解读响应
export interface InterpretResponse {
  hexagram_name: string
  jixiong: string
  rule_analysis: {
    wuxing_balance: string
    shiy_relation: string
    yueling_status: string
    dongyao_analysis: string
    jixiong: string
  }
  ai_interpretation: string
}

// 历史记录项
export interface HistoryItem {
  id: string
  params: YaoParam[]
  date: string
  gender?: Gender
  title?: string
  result: HexagramResult
  createdAt: string
}
