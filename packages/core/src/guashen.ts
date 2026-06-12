// 卦身（月卦身）— 纯口诀起法，确定性配置识别。
// 起法：阳世（世爻为阳）初爻起子、阴世（世爻为阴）初爻起午，顺数至世位定卦身地支；
// 该地支临卦中哪爻即卦身爻，卦中无此支则「不上卦」。
// 定位：判事体是否已运作有定向（上卦）/ 仅意向头绪难寻（不上卦）。
// 注：卦身有流派争议（《增删卜易》主张删），故标注性质、不强制主导吉凶。
import { ZHIS } from './const.js';
import { getNajia } from './hexagram.js';
import type { GuaShenInfo } from './types.js';

// 阳世初爻起「子」，阴世初爻起「午」（地支索引：子0…午6…）
const YANG_START = 0; // 子
const YIN_START = 6; // 午

/**
 * 计算卦身。
 * @param mark 卦符（6 位 01，初爻在最低位 index 0）
 * @param shi 世爻位（1-based）
 */
export function calcGuaShen(mark: string, shi: number): GuaShenInfo {
  // 世爻阴阳：mark[shi-1] 为 '1' 阳、'0' 阴
  const shiYang = mark[shi - 1] === '1';
  const start = shiYang ? YANG_START : YIN_START;

  // 初爻起 start，顺数至世位（每升一爻 +1 地支）
  const zhiIdx = (start + (shi - 1)) % 12;
  const zhi = ZHIS[zhiIdx];

  // 该地支临卦中哪爻（看每爻纳甲地支），可多现
  const najia = getNajia(mark);
  const positions = najia.map((gz, i) => (gz[1] === zhi ? i + 1 : -1)).filter((p) => p > 0);

  const shang = positions.length > 0;
  const note = shang
    ? `卦身为${zhi}，临第${positions.join('、')}爻，已上卦——事体有定向、已在运作。`
    : `卦身为${zhi}，不上卦（卦中无${zhi}）——事多为意向，头绪未定。`;

  return {
    zhi,
    yang_shi: shiYang,
    positions,
    shang_gua: shang,
    note,
  };
}
