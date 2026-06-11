// 六爻排盘共享类型定义（前后端共用）

/** 爻位参数：1=少阳 2=少阴 3=老阳(动) 4=老阴(动) */
export type YaoParam = 1 | 2 | 3 | 4

/** 性别 */
export type Gender = '男' | '女' | ''

/** 月令旺衰 */
export type YueLing = '旺' | '相' | '休' | '囚' | '死' | ''

/** 变卦 */
export interface TransformedHexagram {
  name: string
  mark: string
  qin6: string[]
  qinx: string[]
  gong: string
  hexagram_type: string
}

/** 伏神 */
export interface HiddenHexagram {
  name: string
  mark: string
  qin6: string[]
  qinx: string[]
  seat: number[]
}

/** 农历干支信息 */
export interface LunarInfo {
  xkong: string
  gz: {
    year: string
    month: string
    day: string
    hour: string
  }
}

/** 排盘输入 */
export interface PaipanInput {
  params: YaoParam[]
  date?: string
  gender?: Gender
  title?: string
  guaci?: boolean
}

/** 批量排盘单项结果：成功带 result，失败带 error，原输入索引保留 */
export type BatchItemResult =
  | { index: number; success: true; result: HexagramResult }
  | { index: number; success: false; error: string }

/** 批量排盘汇总 */
export interface BatchResult {
  items: BatchItemResult[]
  successCount: number
  errorCount: number
}

/** 排盘结果 */
export interface HexagramResult {
  params: number[]
  mark: string
  name: string
  gong: string
  shiy: [number, number, number]
  qin6: string[]
  qinx: string[]
  god6: string[]
  dong: number[]
  solar: string
  lunar: LunarInfo
  hexagram_type: string
  guaci?: Record<string, unknown> | null
  bian?: TransformedHexagram | null
  hide?: HiddenHexagram | null
  // 时间维度断卦属性
  yue_ling?: YueLing[] | null
  yue_po?: boolean[] | null
  xun_kong?: boolean[] | null
  yue_zhi?: string | null
  ri_chen?: string | null
}
