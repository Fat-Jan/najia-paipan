// 六爻排盘相关类型定义

// 爻位参数类型
export type YaoParam = 1 | 2 | 3 | 4

// 性别类型
export type Gender = '男' | '女'

// 排盘请求参数
export interface PaipanRequest {
  params: YaoParam[]
  date?: string
  gender?: Gender
  title?: string
  guaci?: boolean
}

// 排盘响应结果
export interface HexagramResult {
  params: number[]
  mark: string
  name: string
  gong: string
  shiy: [number, number, number] // [世爻位置, 应爻位置, 索引]
  qin6: string[]
  qinx: string[]
  god6: string[]
  dong: number[]
  solar: string
  lunar: {
    xkong: string
    gz: {
      year: string
      month: string
      day: string
      hour: string
    }
  }
  hexagram_type: string
  guaci?: any
  bian?: TransformedHexagram
  hide?: HiddenHexagram
  // 时间维度字段
  yue_ling?: string[]
  yue_po?: boolean[]
  xun_kong?: boolean[]
  yue_zhi?: string
  ri_chen?: string
}

// 变卦
export interface TransformedHexagram {
  name: string
  mark: string
  qin6: string[]
  qinx: string[]
  gong: string
  hexagram_type: string
}

// 伏神
export interface HiddenHexagram {
  name: string
  mark: string
  qin6: string[]
  qinx: string[]
  seat: number[]
}

// 64卦信息
export interface Gua64Info {
  mark: string
  name: string
  gong: string
}

// AI 智能解读请求
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
  model?: 'deepseek' | 'glm'
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