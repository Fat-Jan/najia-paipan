// 用神取用 — 把「占问类别 → 用神六亲 → 所在爻位」确定化。
// AI 最易错的是「定位」(在哪几爻、是否伏藏)，不是推理；故把定位做成结构化数据。
// 类别判定优先用显式 category，无则按关键词兜底推断。
import type { HexagramResult, QuestionCategory, YongShenInfo } from './types.js'

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
    return {
      category: cat,
      yongshen: '',
      positions: [],
      multiple: false,
      hidden: false,
      hidden_seat: [],
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
    note,
  }
}
