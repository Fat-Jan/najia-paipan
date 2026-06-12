// 时间维度断卦 — 从 legacy/najia/najia/{time_analysis,lunar_utils}.py 移植
// 农历/干支底层用 tyme4ts（6tail TS 原生版）
import { SolarDay, SolarTime } from 'tyme4ts';
import { ZHIS, ZHIS_DICT, ZHI5, XING5, GANS, isChong, LIUHE_MAP, SANHE_MAP } from './const.js';
import type { DayDynamics, YingQi, SanHe, SanHeMatch } from './types.js';

// 地支→五行字（由 const.ZHI5 + XING5 派生，对齐 time_analysis.DIZHI_WUXING）
const DIZHI_WUXING: Record<string, string> = Object.fromEntries(
  ZHIS.map((zhi, idx) => [zhi, XING5[ZHI5[idx]]]),
);

// 五行生克
const SHENG_CYCLE = new Set(['金水', '水木', '木火', '火土', '土金']);
const KE_RELATIONS = new Set(['金木', '木土', '土水', '火金', '水火']);

/** 月令旺衰：同我为旺，生我为相，我生为休，克我为囚，我克为死 */
export function calcYueLing(yaoWuxing: string, yueZhi: string): string {
  const yueWuxing = DIZHI_WUXING[yueZhi];
  if (yueWuxing === yaoWuxing) return '旺';
  if (SHENG_CYCLE.has(yueWuxing + yaoWuxing)) return '相';
  if (SHENG_CYCLE.has(yaoWuxing + yueWuxing)) return '休';
  if (KE_RELATIONS.has(yueWuxing + yaoWuxing)) return '死';
  if (KE_RELATIONS.has(yaoWuxing + yueWuxing)) return '囚';
  return '';
}

/** 月破：爻地支与月建相冲 */
export function isYuePo(yaoDizhi: string, yueZhi: string): boolean {
  return isChong(yaoDizhi, yueZhi);
}

/** 旬空：返回该日辰所在旬空亡的两个地支（time_analysis.get_xun_kong） */
export function getXunKong(riChen: string): string[] {
  if (riChen.length < 2) return [];
  const gan = riChen[0];
  const zhi = riChen.slice(1);
  const ganIdx = GANS.indexOf(gan);
  const zhiIdx = ZHIS.indexOf(zhi);
  if (ganIdx < 0 || zhiIdx < 0) return [];
  const start = (((zhiIdx - ganIdx) % 12) + 12) % 12;
  const k1 = ZHIS[(((start - 2) % 12) + 12) % 12];
  const k2 = ZHIS[(((start - 1) % 12) + 12) % 12];
  return [k1, k2];
}

/** 爻地支是否旬空 */
export function isXunKong(yaoDizhi: string, riChen: string): boolean {
  return getXunKong(riChen).includes(yaoDizhi);
}

/**
 * 公历日期字符串 → [月建地支, 日辰干支]（lunar_utils.date_to_yue_ri_chen）
 * 用 tyme4ts 替代 lunar-python。
 */
export function dateToYueRiChen(dateStr: string): [string, string] {
  const datePart = dateStr.split(' ')[0];
  const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10));
  // 六爻月建按节气（干支历月柱），非农历月。日辰为干支历日柱。
  const scd = SolarDay.fromYmd(y, m, d).getSixtyCycleDay();
  const yueZhi = scd.getMonth().getEarthBranch().getName();
  const riChen = scd.getSixtyCycle().getName();
  return [yueZhi, riChen];
}

/**
 * 公历日期 → 四柱干支 + 旬空（替代 najia._daily）
 * 返回 { gz: {year,month,day,hour}, xkong }
 */
export function getDaily(
  y: number,
  mo: number,
  d: number,
  h: number,
): { gz: { year: string; month: string; day: string; hour: string }; xkong: string } {
  const lunarHour = SolarTime.fromYmdHms(y, mo, d, h, 0, 0).getLunarHour();
  const eightChar = lunarHour.getEightChar();
  // 日柱统一取 LunarDay（不在 23:00 滚动到次日），与 Python getBaZi 一致。
  // EightChar.getDay() 在 23:00 会滚到次日子时，导致 god6 与旬空/ri_chen 取不同日柱而自相矛盾。
  const dayCycle = lunarHour.getLunarDay().getSixtyCycle();
  // 旬空：日柱所缺地支（与 lunar-python getDayXunKong 对齐）
  const kong = dayCycle
    .getExtraEarthBranches()
    .map((b) => b.getName())
    .join('');
  return {
    gz: {
      year: eightChar.getYear().getName(),
      month: eightChar.getMonth().getName(),
      day: dayCycle.getName(),
      hour: eightChar.getHour().getName(),
    },
    xkong: kong,
  };
}

/**
 * 暗动/日破 — 日辰冲静爻：旺相为暗动（暗中发动、有力），休囚为日破（被冲散、受损）。
 * 动爻不参与（动爻自有动变关系，日冲动爻属另一套）。
 * @param qinx 逐爻纳甲干支（如「甲子」，取末字地支）
 * @param dong 动爻位（0-based），跳过
 * @param riChen 日辰干支（取末字地支）
 * @param yueZhi 月建地支（定旺衰）
 */
export function calcDayDynamics(
  qinx: string[],
  dong: number[],
  riChen: string,
  yueZhi: string,
): DayDynamics {
  const riZhi = riChen.slice(-1);
  const hits: string[] = [];
  const states = qinx.map((gz, i) => {
    if (dong.includes(i)) return ''; // 动爻跳过
    // qinx 是 gz5x 产物「干支+五行」三字（如「甲子水」），地支在 index 1，不能取末字（末字是五行）
    const yaoZhi = gz[1] ?? '';
    if (!isChong(yaoZhi, riZhi)) return '';
    const wuxing = DIZHI_WUXING[yaoZhi];
    const wang = calcYueLing(wuxing, yueZhi); // 旺/相/休/囚/死
    const state = wang === '旺' || wang === '相' ? '暗动' : '日破';
    hits.push(`第${i + 1}爻${state}`);
    return state;
  });
  const note =
    hits.length > 0
      ? `日辰${riZhi}冲：${hits.join('、')}（已算定，暗动者暗中得力、日破者被冲散）。`
      : '';
  return { states, note };
}

/**
 * 应期候选地支 — 给定主用神地支（+是否旬空），输出四类候选 + 固定语义标签。
 * 纯查表，不做旺衰筛选、不做最终取舍（"该应哪类"依赖卦象动静且有流派分歧，留给 AI）。
 * @param yongZhi 主用神地支（空串时返回空候选）
 * @param isKong 主用神是否旬空（旬空才有「出空」候选）
 */
export function calcYingQi(yongZhi: string, isKong: boolean): YingQi {
  if (!yongZhi || ZHIS_DICT[yongZhi] === undefined) {
    return { zhi: yongZhi, candidates: [] };
  }
  const chongZhi = ZHIS[(ZHIS_DICT[yongZhi] + 6) % 12]; // 冲支：索引 +6
  const heZhi = LIUHE_MAP[yongZhi] ?? '';
  const candidates: YingQi['candidates'] = [
    { type: '逢值', zhi: yongZhi, semantic: '用神值日/值月得力之时' },
    { type: '逢冲', zhi: chongZhi, semantic: '冲动之时，静而逢冲则起' },
  ];
  if (heZhi) {
    candidates.push({ type: '逢合', zhi: heZhi, semantic: '合起或合绊之时' });
  }
  if (isKong) {
    candidates.push({ type: '出空', zhi: yongZhi, semantic: '空者实之（应期共识最强一条）' });
  }
  return { zhi: yongZhi, candidates };
}

/**
 * 三合局/半合 — 扫卦中六爻地支，识别构成的三合局（三支全现）与半合（两支现）。
 * 只算「成局结构 + 化气五行」这类查表确定的事实；是否「真成局起作用」
 * （需否动爻引动、月日是否凑齐第三支、是否被冲破）流派分歧大，留给 AI 断。
 * 半合定义：同一三合组中恰现两支。含中神（子午卯酉）者为力强半合，缺中神者为拱合（多需引动）。
 * 三支全现优先判为三合局，不再重复输出其子半合。
 * @param qinx 逐爻纳甲干支+五行三字（如「甲子水」），地支在 index 1
 */
export function calcSanHe(qinx: string[]): SanHe {
  // 地支 → 携带该支的爻位（1-based，升序）
  const zhiToPos = new Map<string, number[]>();
  qinx.forEach((gz, i) => {
    const zhi = gz[1] ?? '';
    if (!zhi || ZHIS_DICT[zhi] === undefined) return;
    const arr = zhiToPos.get(zhi) ?? [];
    arr.push(i + 1);
    zhiToPos.set(zhi, arr);
  });

  const matches: SanHeMatch[] = [];
  for (const group of SANHE_MAP) {
    const present = group.zhis.filter((z) => zhiToPos.has(z));
    if (present.length < 2) continue;
    const type = present.length === 3 ? '三合局' : '半合';
    const positions = present.flatMap((z) => zhiToPos.get(z) as number[]).sort((a, b) => a - b);
    const hasCenter = present.includes(group.center);
    const groupName = group.zhis.join('');
    const note =
      type === '三合局'
        ? `${present.join('')}三合${group.wuxing}局（三支全现，已算定化气方向；是否真成局起用留断）。`
        : `${present.join('')}半合${group.wuxing}（${groupName}缺第三支，${hasCenter ? '含中神力强' : '缺中神为拱合、多需引动或凑齐第三支'}）。`;
    matches.push({
      type,
      wuxing: group.wuxing,
      zhis: present,
      positions,
      has_center: hasCenter,
      note,
    });
  }

  const note = matches.length > 0 ? matches.map((m) => m.note).join('') : '';
  return { matches, note };
}
