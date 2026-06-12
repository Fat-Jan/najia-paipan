// 用神取用 — 把「占问类别 → 用神六亲 → 所在爻位」确定化。
// AI 最易错的是「定位」(在哪几爻、是否伏藏)，不是推理；故把定位做成结构化数据。
// 类别判定优先用显式 category，无则按关键词兜底推断。
import type { HexagramResult, QuestionCategory, YongShenInfo, ShenRole } from './types.js'

/**
 * 六亲相生环（唯一数据源）— 按五行相生顺序排列：
 * 兄弟→子孙→妻财→官鬼→父母→(回)兄弟，对应五行相生（如金生水生木生火生土生金）。
 * 推导依据：兄弟=同我、子孙=我生、妻财=我克、官鬼=克我、父母=生我，
 * 这五者在五行相生环上的相对位置恒定，与用神具体五行无关。
 *
 * 原/忌/仇神全部从此环的索引偏移推导，不另立手写映射表：
 * - 原神=生用神者=环上前 1 位
 * - 忌神=克用神者=环上前 2 位（相克 = 相生环上隔一位）
 * - 仇神=生忌神者=环上前 3 位（即忌神的前 1 位）
 */
const QIN_RING = ['兄弟', '子孙', '妻财', '官鬼', '父母'] as const

/** 取相生环上相对用神偏移 offset 位的六亲（offset 为负表示「前几位」） */
function ringQin(yongshen: string, offset: number): string {
  const i = QIN_RING.indexOf(yongshen as (typeof QIN_RING)[number])
  if (i < 0) return ''
  return QIN_RING[(i + offset + QIN_RING.length * 3) % QIN_RING.length]
}

/** 在主卦 qin6 中找某六亲的爻位（1-based），可多现 */
function findPositions(qin6: string[], qin: string): number[] {
  return qin6.map((q, i) => (q === qin ? i + 1 : -1)).filter((p) => p > 0)
}

/** 构造原/忌/仇神角色（六亲名 + 卦中位置） */
function buildRole(qin6: string[], qin: string): ShenRole {
  return { qin, positions: findPositions(qin6, qin) }
}

/** 类别 → 用神六亲。'一般' 无固定用神，兼看世爻 */
const YONGSHEN_MAP: Record<QuestionCategory, string> = {
  求财: '妻财',
  事业: '官鬼',
  官非: '官鬼',
  婚恋: '官鬼', // 通用以官鬼为基准（女问夫、事体），男问妻另兼看妻财，note 说明
  健康: '子孙', // 子孙为医药/喜悦；疾病另看官鬼为病symbol，note 说明
  学业: '父母',
  文书: '父母',
  出行: '父母', // 舟车文书
  寻人: '妻财', // 寻人随事而异，默认人口/财物，note 提示
  一般: '',
}

/** 关键词兜底推断类别（无显式 category 时用） */
const KEYWORDS: Array<[QuestionCategory, string[]]> = [
  ['求财', ['财', '钱', '求财', '生意', '投资', '收入', '盈利', '债']],
  ['事业', ['事业', '工作', '升职', '晋升', '官职', '功名', '考公', '仕途', '求职', '面试']],
  ['官非', ['官司', '诉讼', '官非', '纠纷', '打官司', '法律', '案子']],
  ['婚恋', ['婚', '恋', '感情', '对象', '姻缘', '夫妻', '男友', '女友', '复合', '离']],
  ['健康', ['病', '健康', '身体', '医', '疾', '康复', '手术', '住院']],
  ['学业', ['学', '考试', '高考', '中考', '成绩', '升学', '论文', '学业']],
  ['文书', ['合同', '文书', '房', '买房', '卖房', '证', '执照', '审批']],
  ['出行', ['出行', '旅', '出差', '搬', '远行', '行程']],
  ['寻人', ['寻人', '找人', '走失', '失物', '丢', '寻物']],
]

/** 推断占问类别 */
export function inferCategory(question: string): QuestionCategory {
  const q = question ?? ''
  for (const [cat, words] of KEYWORDS) {
    if (words.some((w) => q.includes(w))) return cat
  }
  return '一般'
}

/**
 * 标记用神 — 给定排盘结果 + 问题（或显式类别），算出用神六亲及其爻位。
 * @param result 排盘结果
 * @param question 问题文本（用于关键词推断）
 * @param category 显式类别；省略则按 question 推断
 */
export function markYongShen(
  result: HexagramResult,
  question: string,
  category?: QuestionCategory,
): YongShenInfo {
  const cat = category ?? inferCategory(question)
  const yongshen = YONGSHEN_MAP[cat]

  // '一般' 无固定用神，兼看世爻
  if (!yongshen) {
    const shi = result.shiy?.[0]
    const emptyRole: ShenRole = { qin: '', positions: [] }
    return {
      category: cat,
      yongshen: '',
      positions: [],
      multiple: false,
      hidden: false,
      hidden_seat: [],
      yuanshen: emptyRole,
      jishen: emptyRole,
      choushen: emptyRole,
      note: shi ? `无固定用神，以世爻（第${shi}爻）为主体参看。` : '无固定用神，兼看世爻。',
    }
  }

  // 主卦定位（qin6 含该六亲的爻位，1-based）
  const positions = (result.qin6 ?? [])
    .map((q, i) => (q === yongshen ? i + 1 : -1))
    .filter((p) => p > 0)

  const multiple = positions.length > 1

  // 主卦不上卦 → 查伏神
  let hidden = false
  let hiddenSeat: number[] = []
  if (positions.length === 0 && result.hide) {
    const seats = (result.hide.qin6 ?? [])
      .map((q, i) => (q === yongshen ? i : -1))
      .filter((i) => i >= 0)
    // 仅取确实在 hide.seat（伏藏位）中的
    const inSeat = seats.filter((i) => result.hide!.seat.includes(i))
    if (inSeat.length > 0) {
      hidden = true
      hiddenSeat = inSeat.map((i) => i + 1).sort((a, b) => a - b)
    }
  }

  // 原/忌/仇神：从相生环索引偏移推导（唯一数据源 QIN_RING）
  const qin6 = result.qin6 ?? []
  const yuanshen = buildRole(qin6, ringQin(yongshen, -1)) // 生用神者
  const jishen = buildRole(qin6, ringQin(yongshen, -2)) // 克用神者（环上前 2 位）
  const choushen = buildRole(qin6, ringQin(yongshen, -3)) // 生忌神者

  let note: string
  if (hidden) {
    note = `${cat}以「${yongshen}」为用神，主卦不上卦，伏于第${hiddenSeat.join('、')}爻之下，需待引拔（值日月或动爻冲飞神）方显力。`
  } else if (positions.length === 0) {
    note = `${cat}以「${yongshen}」为用神，但主卦与伏神中均未见，用神不上卦，事多无头绪。`
  } else if (multiple) {
    note = `${cat}以「${yongshen}」为用神，多现于第${positions.join('、')}爻，取动者或临世应者为主，余为辅。`
  } else {
    note = `${cat}以「${yongshen}」为用神，在第${positions[0]}爻。`
  }

  return {
    category: cat,
    yongshen,
    positions,
    multiple,
    hidden,
    hidden_seat: hiddenSeat,
    yuanshen,
    jishen,
    choushen,
    note,
  }
}
