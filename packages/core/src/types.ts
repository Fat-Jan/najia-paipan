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

/** 单动爻的本→变五行生克关系（逐爻全标，让 AI 不必自行心算） */
export type YaoChangeRelation =
  | '进神' // 同五行顺进（亥子/寅卯/巳午/申酉），力增
  | '退神' // 同五行逆退，力减
  | '化比和' // 同五行非进退（多为土：辰戌丑未互变），力平
  | '回头生' // 变爻生本爻，得助
  | '回头克' // 变爻克本爻，受制（凶）
  | '化泄' // 本爻生变爻，泄气
  | '化耗' // 本爻克变爻，耗力

/** 单个动爻的动变明细 */
export interface YaoChange {
  /** 爻位（1-based） */
  pos: number
  /** 本爻地支 */
  ben_zhi: string
  /** 变爻地支 */
  bian_zhi: string
  /** 本→变五行生克关系 */
  relation: YaoChangeRelation
  /** 是否反吟（本变相冲，主反复） */
  fanyin: boolean
  /** 是否伏吟（本变同支，动如不动） */
  fuyin: boolean
  /** 一句话说明 */
  note: string
}

/** 卦爻动变关系（反吟/伏吟/进退神）— 纯确定性配置识别，由 compile 自动计算 */
export interface YaoRelation {
  /** 逐动爻明细：每个动爻的本→变关系全标，AI 直接采用不必心算 */
  changes: YaoChange[]
  /** 反吟爻位（1-based）：动爻变支与本支相冲 */
  fanyin: number[]
  /** 反吟范围：''=无 '内'=内卦 '外'=外卦 '内外'=内外皆反吟 */
  fanyin_scope: '' | '内' | '外' | '内外'
  /** 伏吟爻位（1-based）：动爻变支与本支相同（动如不动） */
  fuyin: number[]
  /** 伏吟范围 */
  fuyin_scope: '' | '内' | '外' | '内外'
  /** 进神爻位（1-based）：动爻化进（同五行顺进，力增） */
  jinshen: number[]
  /** 退神爻位（1-based）：动爻化退（同五行逆退，力减） */
  tuishen: number[]
}

/** 占问类别 → 用神取用 */
export type QuestionCategory =
  | '求财' | '事业' | '婚恋' | '健康' | '官非'
  | '学业' | '文书' | '出行' | '寻人' | '一般'

/** 一个六亲角色（原神/忌神/仇神）的六亲名与卦中位置 */
export interface ShenRole {
  /** 六亲名（如「子孙」） */
  qin: string
  /** 在主卦的爻位（1-based），不上卦为空数组 */
  positions: number[]
}

/** 用神标记信息 — 把「问题→用神六亲→所在爻位 + 原忌仇神」确定化，减少 AI 心算出错 */
export interface YongShenInfo {
  /** 占问类别 */
  category: QuestionCategory
  /** 用神六亲（如「妻财」）；'一般' 类无固定用神时为空串，兼看世爻 */
  yongshen: string
  /** 用神在主卦的爻位（1-based），可多现 */
  positions: number[]
  /** 用神是否多现（>1 处） */
  multiple: boolean
  /** 用神是否伏藏（主卦不上卦，在伏神中） */
  hidden: boolean
  /** 伏藏所在爻位（1-based），仅 hidden 时有值 */
  hidden_seat: number[]
  /** 原神（生用神者，助）；无用神时 qin 为空串 */
  yuanshen: ShenRole
  /** 忌神（克用神者，阻） */
  jishen: ShenRole
  /** 仇神（生忌神者，间接为害） */
  choushen: ShenRole
  /** 主用神爻位（1-based）；多现按动爻>临世应>首现选出；无用神/不上卦为 0 */
  primary_pos: number
  /** 主用神纳甲地支（从 qinx[primary_pos-1] 取末字）；无则空串 */
  primary_zhi: string
  /** 一句话说明 */
  note: string
}

/** 卦身（月卦身）— 阳世起子/阴世起午顺数到世位，定卦身地支，看临何爻 */
export interface GuaShenInfo {
  /** 卦身地支（如「午」） */
  zhi: string
  /** 世爻是否为阳爻（决定起子还是起午） */
  yang_shi: boolean
  /** 卦身临爻位（1-based）；不上卦时为空数组 */
  positions: number[]
  /** 是否上卦（卦身地支现于主卦六爻） */
  shang_gua: boolean
  /** 一句话说明 */
  note: string
}

/** 暗动/日破 — 日辰对静爻的作用：被日冲 + 旺相=暗动、休囚=日破 */
export interface DayDynamics {
  /** 逐爻状态：'暗动' | '日破' | ''（索引 0 = 初爻，与 qinx 对齐） */
  states: string[]
  /** 一句话说明（无暗动也无日破时为空串） */
  note: string
}

/** 应期候选地支 — 用神逢值/冲/合/出空，每类贴固定语义；最终取舍留给 AI */
export interface YingQi {
  /** 主用神地支 */
  zhi: string
  /** 候选应期（含类型、地支、固定语义标签） */
  candidates: Array<{
    type: '逢值' | '逢冲' | '逢合' | '出空'
    zhi: string
    semantic: string
  }>
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
  /** 卦爻动变关系（反吟/伏吟/进退神）；仅有变卦时附加 */
  yao_relation?: YaoRelation | null
  /** 卦身（月卦身）；恒附加（任何卦都有世爻可起卦身） */
  gua_shen?: GuaShenInfo | null
  /** 暗动/日破（日辰作用于静爻）；有日辰+月建时附加 */
  day_dynamics?: DayDynamics | null
  // 时间维度断卦属性
  yue_ling?: YueLing[] | null
  yue_po?: boolean[] | null
  xun_kong?: boolean[] | null
  yue_zhi?: string | null
  ri_chen?: string | null
}
