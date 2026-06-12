// 六爻纳甲常量 — 从 legacy/najia/najia/const.py 逐字段移植
// 移植对照基准：legacy Python const.py（30 测试黄金标准）

// 六神（统一用「螣蛇」，与 const.py 一致；time-analysis 的「腾蛇」为历史笔误）
export const SHEN6 = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const

// 六亲
export const QING6 = ['兄弟', '父母', '官鬼', '妻财', '子孙'] as const

// 五行
export const XING5 = ['木', '火', '土', '金', '水'] as const

// 纳甲 - (内卦干支, 外卦干支)
export const NAJIA: ReadonlyArray<readonly [string, string]> = [
  ['甲子寅辰', '壬午申戌'],
  ['丁巳卯丑', '丁亥酉未'],
  ['己卯丑亥', '己酉未巳'],
  ['庚子寅辰', '庚午申戌'],
  ['辛丑亥酉', '辛未巳卯'],
  ['戊寅辰午', '戊申戌子'],
  ['丙辰午申', '丙戌子寅'],
  ['乙未巳卯', '癸丑亥酉'],
]

// 八卦宫名
export const GUAS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const

// 卦五行（索引对应 GUAS）
export const GUA5 = [3, 3, 1, 0, 0, 4, 2, 2] as const

// 爻位（三爻二进制 → 八卦顺序）
export const YAOS = ['111', '110', '101', '100', '011', '010', '001', '000'] as const

// 天干
export const GANS: readonly string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

// 地支
export const ZHIS: readonly string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 地支五行（值为 XING5 的索引）
export const ZHI5 = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4] as const

// 旬空
export const KONG = ['子丑', '寅卯', '辰巳', '午未', '申酉', '戌亥'] as const

// 六合卦（卦名包含即六合）
export const LIUHE = ['否', '困', '旅', '豫', '节', '贲', '复', '泰'] as const

// 64 卦字典 {卦符: 卦名}
export const GUA64: Record<string, string> = {
  '111111': '乾为天', '011111': '天风姤', '001111': '天山遁', '000111': '天地否', '000011': '风地观', '000001': '山地剥',
  '000101': '火地晋', '111101': '火天大有', '110110': '兑为泽', '010110': '泽水困', '000110': '泽地萃', '001110': '泽山咸',
  '001010': '水山蹇', '001000': '地山谦', '001100': '雷山小过', '110100': '雷泽归妹', '101101': '离为火', '001101': '火山旅',
  '011101': '火风鼎', '010101': '火水未济', '010001': '山水蒙', '010011': '风水涣', '010111': '天水讼', '101111': '天火同人',
  '100100': '震为雷', '000100': '雷地豫', '010100': '雷水解', '011100': '雷风恒', '011000': '地风升', '011010': '水风井',
  '011110': '泽风大过', '100110': '泽雷随', '011011': '巽为风', '111011': '风天小畜', '101011': '风火家人', '100011': '风雷益',
  '100111': '天雷无妄', '100101': '火雷噬嗑', '100001': '山雷颐', '011001': '山风蛊', '010010': '坎为水', '110010': '水泽节',
  '100010': '水雷屯', '101010': '水火既济', '101110': '泽火革', '101100': '雷火丰', '101000': '地火明夷', '010000': '地水师',
  '001001': '艮为山', '101001': '山火贲', '111001': '山天大畜', '110001': '山泽损', '110101': '火泽睽', '110111': '天泽履',
  '110011': '风泽中孚', '001011': '风山渐', '000000': '坤为地', '100000': '地雷复', '110000': '地泽临', '111000': '地天泰',
  '111100': '雷天大壮', '111110': '泽天夬', '111010': '水天需', '000010': '水地比',
}

// 显示符号（verbose 0/1/2 三档），索引：[阳, 阳粗, 阴, 老阳标记, 老阴标记]
export const SYMBOL: string[][] = [
  ['━', '━━━━', '━', '○→', '×→'],
  ['▅▅  ▅▅', '▅▅▅▅▅▅', '▅▅  ▅▅', '○→', '×→'],
  ['▅▅▅  ▅▅▅', '▅▅▅▅▅▅▅▅', '▅▅▅  ▅▅▅', '○→', '×→'],
]

// ── 快速查找字典（替代 Python 的 .index()）──
export const XING5_DICT: Record<string, number> = { 木: 0, 火: 1, 土: 2, 金: 3, 水: 4 }
export const GANS_DICT: Record<string, number> = Object.fromEntries(GANS.map((c, i) => [c, i]))
export const ZHIS_DICT: Record<string, number> = Object.fromEntries(ZHIS.map((c, i) => [c, i]))
export const YAOS_DICT: Record<string, number> = Object.fromEntries(YAOS.map((t, i) => [t, i]))

/**
 * 地支相冲（六冲）：索引差恒为 6（子0午6、丑1未7…巳5亥11）。
 * 唯一数据源——月破、暗动/日破、应期逢冲全部复用，不再各自维护冲表。
 */
export function isChong(z1: string, z2: string): boolean {
  const i = ZHIS_DICT[z1]
  const j = ZHIS_DICT[z2]
  if (i === undefined || j === undefined) return false
  return Math.abs(i - j) === 6
}

/**
 * 地支六合表：子丑/寅亥/卯戌/辰酉/巳申/午未。
 * 六合无统一数学规律（子丑索引和=1，其余=13），必须显式表。
 */
export const LIUHE_MAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

// 六亲矩阵（5×5）；索引：0=木 1=火 2=土 3=金 4=水
export const QIN6_MATRIX: string[][] = [
  ['兄弟', '子孙', '妻财', '官鬼', '父母'], // 木
  ['父母', '兄弟', '子孙', '妻财', '官鬼'], // 火
  ['官鬼', '父母', '兄弟', '子孙', '妻财'], // 土
  ['妻财', '官鬼', '父母', '兄弟', '子孙'], // 金
  ['子孙', '妻财', '官鬼', '父母', '兄弟'], // 水
]

// ── 预计算：64 卦纳甲干支 {卦符: [6个干支]} ──
// 对应 const.py 的 NAJIA_PRECOMPUTED 构建逻辑
export const NAJIA_PRECOMPUTED: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const symbol of Object.keys(GUA64)) {
    const nei = symbol.slice(0, 3)
    const wai = symbol.slice(3)
    const neiIdx = YAOS_DICT[nei]
    const waiIdx = YAOS_DICT[wai]

    // 内卦：取 NAJIA[neiIdx][0]，首字符为干，后三字符为支
    const ganNei = NAJIA[neiIdx][0][0]
    const zhiNei = NAJIA[neiIdx][0].slice(1)
    const najiaNei = [...zhiNei].map((z) => `${ganNei}${z}`)

    // 外卦：取 NAJIA[waiIdx][1]
    const ganWai = NAJIA[waiIdx][1][0]
    const zhiWai = NAJIA[waiIdx][1].slice(1)
    const najiaWai = [...zhiWai].map((z) => `${ganWai}${z}`)

    out[symbol] = [...najiaNei, ...najiaWai]
  }
  return out
})()
