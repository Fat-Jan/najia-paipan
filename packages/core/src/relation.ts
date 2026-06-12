// 卦爻动变关系 — 反吟/伏吟/进神/退神 + 逐动爻本→变五行生克，纯确定性配置识别。
// 只比对动爻的「本支 ↔ 变支」地支关系，不做吉凶权衡（那是 AI 的活）。
// 定位：把 AI 看不出、且一遇空白就瞎编的「卦级信号」全算成结构化数据喂进 prompt。
import { ZHIS_DICT, ZHI5, isChong } from './const.js';
import { getNajia } from './hexagram.js';
import type { YaoRelation, YaoChange, YaoChangeRelation } from './types.js';

/** 地支 → 五行索引（0木 1火 2土 3金 4水） */
function zhiWuxing(z: string): number | null {
  const i = ZHIS_DICT[z];
  if (i === undefined) return null;
  return ZHI5[i];
}

// 五行相生：木→火→土→金→水→木（索引 +1 循环）
function sheng(a: number, b: number): boolean {
  return (a + 1) % 5 === b;
}
// 五行相克：木→土→水→火→金→木（索引 +2 循环）
function ke(a: number, b: number): boolean {
  return (a + 2) % 5 === b;
}

// 进神：同五行「阳→阴」顺进（力增）。退神为其逆。
// 仅取无争议的水木火金四正组；土（辰戌丑未）进退说法因流派分歧，归为「化比和」。
const JIN_MAP: Record<string, string> = { 亥: '子', 寅: '卯', 巳: '午', 申: '酉' };
const TUI_MAP: Record<string, string> = { 子: '亥', 卯: '寅', 午: '巳', 酉: '申' };

/**
 * 判定单个动爻的本→变五行生克关系。
 * 优先级：进退神（同五行四正）> 化比和（同五行其余）> 回头生克 > 化泄耗。
 */
function classifyChange(benZhi: string, bianZhi: string): YaoChangeRelation {
  if (JIN_MAP[benZhi] === bianZhi) return '进神';
  if (TUI_MAP[benZhi] === bianZhi) return '退神';

  const wb = zhiWuxing(benZhi);
  const wv = zhiWuxing(bianZhi);
  if (wb === null || wv === null) return '化比和';

  if (wb === wv) return '化比和'; // 同五行非四正（土辰戌丑未互变）
  if (sheng(wv, wb)) return '回头生'; // 变生本
  if (ke(wv, wb)) return '回头克'; // 变克本
  if (sheng(wb, wv)) return '化泄'; // 本生变
  if (ke(wb, wv)) return '化耗'; // 本克变
  return '化比和';
}

/** 关系 → 一句话说明 */
const RELATION_NOTE: Record<YaoChangeRelation, string> = {
  进神: '化进神，力增、事向前发展',
  退神: '化退神，力减、事后退消退',
  化比和: '化比和（同五行），力平、无明显进退',
  回头生: '变爻回头生本爻，得变卦扶助，力增',
  回头克: '变爻回头克本爻，受变卦制约，主受挫（凶）',
  化泄: '本爻生变爻，泄气外耗，力减',
  化耗: '本爻克变爻，耗力于外，力减',
};

/** 由爻位集合判内外卦范围：1-3 爻为内，4-6 爻为外 */
function scope(positions: number[]): YaoRelation['fanyin_scope'] {
  const inner = positions.some((p) => p <= 3);
  const outer = positions.some((p) => p >= 4);
  if (inner && outer) return '内外';
  if (inner) return '内';
  if (outer) return '外';
  return '';
}

/**
 * 计算卦爻动变关系。无动爻或无变卦时返回全空。
 * 逐动爻全标本→变关系，AI 不必自行心算（防其遇空白瞎编）。
 * @param mark 主卦卦符（6 位 01）
 * @param dong 动爻索引（0-based）
 * @param bianMark 变卦卦符；无变卦传 null
 */
export function calcYaoRelation(
  mark: string,
  dong: number[],
  bianMark: string | null,
): YaoRelation {
  const empty: YaoRelation = {
    changes: [],
    fanyin: [],
    fanyin_scope: '',
    fuyin: [],
    fuyin_scope: '',
    jinshen: [],
    tuishen: [],
  };
  if (dong.length === 0 || bianMark === null) return empty;

  const benNajia = getNajia(mark);
  const bianNajia = getNajia(bianMark);
  if (!benNajia || !bianNajia) return empty;

  const changes: YaoChange[] = [];
  const fanyin: number[] = [];
  const fuyin: number[] = [];
  const jinshen: number[] = [];
  const tuishen: number[] = [];

  for (const i of dong) {
    const benZhi = benNajia[i]?.[1];
    const bianZhi = bianNajia[i]?.[1];
    if (!benZhi || !bianZhi) continue;
    const pos = i + 1; // 1-based 爻位

    const isFanyin = isChong(benZhi, bianZhi);
    const isFuyin = benZhi === bianZhi;
    const relation = classifyChange(benZhi, bianZhi);

    if (isFanyin) fanyin.push(pos);
    else if (isFuyin) fuyin.push(pos);
    if (relation === '进神') jinshen.push(pos);
    else if (relation === '退神') tuishen.push(pos);

    // 组合说明：反伏吟是卦级象，与生克关系并列陈述
    const extra: string[] = [];
    if (isFanyin) extra.push('本变相冲为反吟，主反复成败');
    if (isFuyin) extra.push('本变同支为伏吟，动如不动');
    const note = [RELATION_NOTE[relation], ...extra].join('；');

    changes.push({
      pos,
      ben_zhi: benZhi,
      bian_zhi: bianZhi,
      relation,
      fanyin: isFanyin,
      fuyin: isFuyin,
      note,
    });
  }

  return {
    changes,
    fanyin,
    fanyin_scope: scope(fanyin),
    fuyin,
    fuyin_scope: scope(fuyin),
    jinshen,
    tuishen,
  };
}
