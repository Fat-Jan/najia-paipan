// 独立正确性测试：卦爻动变关系（反吟/伏吟/进退神）+ 用神取用。
// 不依赖 Python 黄金数据，按传统口诀 + 手算纳甲校验。
import { describe, it, expect } from 'vitest';
import { compile, calcYaoRelation, markYongShen, inferCategory } from '../src/index';
import type { HexagramResult, PaipanInput } from '../src/types';

describe('卦爻动变关系 — 反吟/伏吟', () => {
  // 比之井（卯月壬申日占随官上任，古籍经典反吟例）：
  // 水地比 000010 → 水风井 011010，内卦二三爻动
  // 二爻 乙巳→辛亥（巳亥冲）、三爻 乙卯→辛酉（卯酉冲），内卦反吟
  it('比之井：内卦反吟', () => {
    const r = compile({ params: [2, 4, 4, 2, 1, 2] as PaipanInput['params'] });
    expect(r.name).toBe('水地比');
    expect(r.bian?.name).toBe('水风井');
    expect(r.yao_relation?.fanyin).toEqual([2, 3]);
    expect(r.yao_relation?.fanyin_scope).toBe('内');
    expect(r.yao_relation?.fuyin).toEqual([]);
  });

  // 姤之恒（申月癸巳日占父在外，古籍经典伏吟例）：
  // 天风姤 011111 → 雷风恒 011100，外卦五六爻动
  // 五爻 壬申→庚申、六爻 壬戌→庚戌（地支不变），外卦伏吟
  it('姤之恒：外卦伏吟', () => {
    const r = compile({ params: [2, 1, 1, 1, 3, 3] as PaipanInput['params'] });
    expect(r.name).toBe('天风姤');
    expect(r.bian?.name).toBe('雷风恒');
    expect(r.yao_relation?.fuyin).toEqual([5, 6]);
    expect(r.yao_relation?.fuyin_scope).toBe('外');
    expect(r.yao_relation?.fanyin).toEqual([]);
  });

  it('静卦无变卦：yao_relation 不附加', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] });
    expect(r.bian).toBeUndefined();
    expect(r.yao_relation).toBeUndefined();
  });
});

describe('卦爻动变关系 — 逐爻 changes 全标', () => {
  // 比之井：二爻 巳→亥（巳火 vs 亥水，水克火 = 回头克 + 反吟）
  //        三爻 卯→酉（卯木 vs 酉金，金克木 = 回头克 + 反吟）
  it('比之井：逐爻 changes 标本→变支与关系', () => {
    const r = compile({ params: [2, 4, 4, 2, 1, 2] as PaipanInput['params'] });
    const changes = r.yao_relation?.changes ?? [];
    expect(changes.length).toBe(2);
    const c2 = changes.find((c) => c.pos === 2)!;
    expect(c2.ben_zhi).toBe('巳');
    expect(c2.bian_zhi).toBe('亥');
    expect(c2.relation).toBe('回头克'); // 亥水克巳火
    expect(c2.fanyin).toBe(true);
    const c3 = changes.find((c) => c.pos === 3)!;
    expect(c3.ben_zhi).toBe('卯');
    expect(c3.bian_zhi).toBe('酉');
    expect(c3.relation).toBe('回头克'); // 酉金克卯木
    expect(c3.fanyin).toBe(true);
  });

  // 姤之恒：五爻 申→申、六爻 戌→戌（同支 = 化比和 + 伏吟）
  it('姤之恒：伏吟爻 relation=化比和', () => {
    const r = compile({ params: [2, 1, 1, 1, 3, 3] as PaipanInput['params'] });
    const changes = r.yao_relation?.changes ?? [];
    for (const c of changes) {
      expect(c.relation).toBe('化比和'); // 同支必同五行
      expect(c.fuyin).toBe(true);
    }
  });

  // 无妄之履：二爻 寅→卯（进神），relation 应为进神
  it('无妄之履：进神爻 relation=进神', () => {
    const r = compile({ params: [1, 4, 2, 1, 1, 1] as PaipanInput['params'] });
    const c = r.yao_relation?.changes.find((x) => x.pos === 2)!;
    expect(c.relation).toBe('进神');
    expect(c.fanyin).toBe(false);
    expect(c.fuyin).toBe(false);
  });

  // calcYaoRelation 直接调：无变卦 → changes 空
  it('无变卦：changes 为空数组', () => {
    expect(calcYaoRelation('111111', [], null).changes).toEqual([]);
  });
});

describe('卦爻动变关系 — 进神/退神', () => {
  // 无妄之履：天雷无妄 100111 → 天泽履 110111，二爻动
  // 内卦 震→兑：二爻 庚寅→丁卯，寅→卯 同为木、顺进 → 进神
  it('无妄之履：二爻进神（寅→卯）', () => {
    const r = compile({ params: [1, 4, 2, 1, 1, 1] as PaipanInput['params'] });
    expect(r.name).toBe('天雷无妄');
    expect(r.bian?.name).toBe('天泽履');
    expect(r.yao_relation?.jinshen).toEqual([2]);
    expect(r.yao_relation?.tuishen).toEqual([]);
  });

  // 履之无妄：天泽履 110111 → 天雷无妄 100111，二爻动
  // 内卦 兑→震：二爻 丁卯→庚寅，卯→寅 同为木、逆退 → 退神
  it('履之无妄：二爻退神（卯→寅）', () => {
    const r = compile({ params: [1, 3, 2, 1, 1, 1] as PaipanInput['params'] });
    expect(r.name).toBe('天泽履');
    expect(r.bian?.name).toBe('天雷无妄');
    expect(r.yao_relation?.tuishen).toEqual([2]);
    expect(r.yao_relation?.jinshen).toEqual([]);
  });

  // calcYaoRelation 直接调用：无动爻 / 无变卦 → 全空
  it('无动爻或无变卦：全空', () => {
    const empty = calcYaoRelation('111111', [], null);
    expect(empty.fanyin).toEqual([]);
    expect(empty.fuyin).toEqual([]);
    expect(empty.jinshen).toEqual([]);
    expect(empty.tuishen).toEqual([]);
  });
});

describe('用神取用 — 类别推断', () => {
  it('关键词推断各类别', () => {
    expect(inferCategory('今年能求财吗')).toBe('求财');
    expect(inferCategory('这次面试能成功升职吗')).toBe('事业');
    expect(inferCategory('这场官司能赢吗')).toBe('官非');
    expect(inferCategory('和他的感情会复合吗')).toBe('婚恋');
    expect(inferCategory('父亲的病情如何')).toBe('健康');
    expect(inferCategory('孩子高考成绩怎样')).toBe('学业');
    expect(inferCategory('这份合同能签成吗')).toBe('文书');
    expect(inferCategory('明天出行顺利吗')).toBe('出行');
    expect(inferCategory('走失的猫能找回吗')).toBe('寻人');
  });

  it('无匹配关键词 → 一般', () => {
    expect(inferCategory('占问近况')).toBe('一般');
    expect(inferCategory('')).toBe('一般');
  });
});

describe('用神取用 — 标记定位', () => {
  it('求财以妻财为用神，定位与 qin6 一致', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] });
    const ys = markYongShen(r, '今年能求财吗');
    expect(ys.category).toBe('求财');
    expect(ys.yongshen).toBe('妻财');
    const expectPos = r.qin6.map((q, i) => (q === '妻财' ? i + 1 : -1)).filter((p) => p > 0);
    expect(ys.positions).toEqual(expectPos);
  });

  it('显式 category 覆盖关键词推断', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] });
    const ys = markYongShen(r, '随便问问', '事业');
    expect(ys.category).toBe('事业');
    expect(ys.yongshen).toBe('官鬼');
  });

  it('一般类无固定用神，兼看世爻', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] });
    const ys = markYongShen(r, '占问近况');
    expect(ys.yongshen).toBe('');
    expect(ys.positions).toEqual([]);
    expect(ys.note).toContain('世爻');
  });

  it('用神多现：multiple=true，note 提示取舍', () => {
    // 构造主卦含两个妻财的合成结果
    const r: HexagramResult = {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: [6, 3, 0],
      qin6: ['妻财', '官鬼', '父母', '妻财', '兄弟', '子孙'],
      qinx: [],
      god6: [],
      dong: [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
    };
    const ys = markYongShen(r, '求财');
    expect(ys.positions).toEqual([1, 4]);
    expect(ys.multiple).toBe(true);
    expect(ys.note).toContain('多现');
  });

  it('用神伏藏：主卦无、伏神有 → hidden=true', () => {
    const r: HexagramResult = {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: [6, 3, 0],
      qin6: ['兄弟', '官鬼', '父母', '子孙', '兄弟', '官鬼'], // 无妻财
      qinx: [],
      god6: [],
      dong: [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
      hide: {
        name: 'H',
        mark: '000000',
        qin6: ['妻财', '兄弟', '官鬼', '父母', '子孙', '兄弟'],
        qinx: [],
        seat: [0],
      },
    };
    const ys = markYongShen(r, '求财');
    expect(ys.hidden).toBe(true);
    expect(ys.hidden_seat).toEqual([1]);
    expect(ys.note).toContain('伏');
  });
});

describe('用神取用 — 原忌仇神（六亲生克环推导）', () => {
  // 构造一个六亲齐全的主卦，验证各用神的原/忌/仇神六亲名 + 卦中定位
  // qin6 顺序与五行无关，原忌仇只看六亲名：生用神=原神、克用神=忌神、生忌神=仇神
  function fakeResult(qin6: string[]): HexagramResult {
    return {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: [6, 3, 0],
      qin6,
      qinx: [],
      god6: [],
      dong: [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
    };
  }

  it('用神妻财 → 原神子孙 / 忌神兄弟 / 仇神父母', () => {
    const r = fakeResult(['妻财', '子孙', '兄弟', '父母', '官鬼', '妻财']);
    const ys = markYongShen(r, '问求财');
    expect(ys.yongshen).toBe('妻财');
    expect(ys.yuanshen.qin).toBe('子孙');
    expect(ys.jishen.qin).toBe('兄弟');
    expect(ys.choushen.qin).toBe('父母');
    // 卦中定位：妻财在第 1、6 爻
    expect(ys.yuanshen.positions).toEqual([2]); // 子孙在第 2 爻
    expect(ys.jishen.positions).toEqual([3]); // 兄弟在第 3 爻
    expect(ys.choushen.positions).toEqual([4]); // 父母在第 4 爻
  });

  it('用神官鬼 → 原神妻财 / 忌神子孙 / 仇神兄弟', () => {
    const r = fakeResult(['官鬼', '妻财', '子孙', '兄弟', '父母', '官鬼']);
    const ys = markYongShen(r, '问事业');
    expect(ys.yongshen).toBe('官鬼');
    expect(ys.yuanshen.qin).toBe('妻财');
    expect(ys.jishen.qin).toBe('子孙');
    expect(ys.choushen.qin).toBe('兄弟');
  });

  it('用神子孙 → 原神兄弟 / 忌神父母 / 仇神官鬼', () => {
    const r = fakeResult(['子孙', '兄弟', '父母', '官鬼', '妻财', '子孙']);
    const ys = markYongShen(r, '问健康');
    expect(ys.yongshen).toBe('子孙');
    expect(ys.yuanshen.qin).toBe('兄弟');
    expect(ys.jishen.qin).toBe('父母');
    expect(ys.choushen.qin).toBe('官鬼');
  });

  it('用神父母 → 原神官鬼 / 忌神妻财 / 仇神子孙', () => {
    const r = fakeResult(['父母', '官鬼', '妻财', '子孙', '兄弟', '父母']);
    const ys = markYongShen(r, '问文书合同');
    expect(ys.yongshen).toBe('父母');
    expect(ys.yuanshen.qin).toBe('官鬼');
    expect(ys.jishen.qin).toBe('妻财');
    expect(ys.choushen.qin).toBe('子孙');
  });

  it('原忌仇神不上卦 → positions 为空数组', () => {
    // 主卦只有妻财，无子孙/兄弟/父母
    const r = fakeResult(['妻财', '妻财', '官鬼', '官鬼', '妻财', '官鬼']);
    const ys = markYongShen(r, '问求财');
    expect(ys.yuanshen.qin).toBe('子孙');
    expect(ys.yuanshen.positions).toEqual([]);
    expect(ys.jishen.positions).toEqual([]);
  });

  it('一般类无用神 → 原忌仇神 qin 为空串', () => {
    const r = fakeResult(['兄弟', '子孙', '妻财', '官鬼', '父母', '兄弟']);
    const ys = markYongShen(r, '随便问问');
    expect(ys.yongshen).toBe('');
    expect(ys.yuanshen.qin).toBe('');
    expect(ys.jishen.qin).toBe('');
    expect(ys.choushen.qin).toBe('');
  });
});

describe('主用神选取（primary_pos / primary_zhi）', () => {
  // 构造带 qinx（纳甲干支）/dong/shiy 的主卦
  function fakeResult(opts: {
    qin6: string[];
    qinx: string[];
    dong?: number[];
    shiy?: number[];
  }): HexagramResult {
    return {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: opts.shiy ?? [6, 3, 0],
      qin6: opts.qin6,
      qinx: opts.qinx,
      god6: [],
      dong: opts.dong ?? [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
    };
  }

  it('单现 → 直接取该爻', () => {
    const r = fakeResult({
      qin6: ['官鬼', '父母', '兄弟', '妻财', '子孙', '父母'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    });
    const ys = markYongShen(r, '问事业'); // 用神官鬼，第1爻
    expect(ys.primary_pos).toBe(1);
    expect(ys.primary_zhi).toBe('子');
  });

  it('多现且有动爻 → 取动者', () => {
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '妻财', '子孙', '官鬼'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      dong: [3],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(4);
    expect(ys.primary_zhi).toBe('午');
  });

  it('多现无动爻但临世应 → 取临世应者', () => {
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '官鬼', '子孙', '妻财'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [6, 3, 0],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(6);
    expect(ys.primary_zhi).toBe('寅');
  });

  it('多现无动爻无临世应 → 取首现', () => {
    const r = fakeResult({
      qin6: ['官鬼', '妻财', '兄弟', '父母', '妻财', '子孙'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [1, 4, 0],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(2);
    expect(ys.primary_zhi).toBe('戌');
  });

  it('无用神（一般类）→ primary_pos 0、primary_zhi 空', () => {
    const r = fakeResult({
      qin6: ['兄弟', '子孙', '妻财', '官鬼', '父母', '兄弟'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    });
    const ys = markYongShen(r, '随便问问');
    expect(ys.primary_pos).toBe(0);
    expect(ys.primary_zhi).toBe('');
  });
});

describe('主用神选取（primary_pos / primary_zhi）', () => {
  // 构造带 qinx（纳甲干支）/dong/shiy 的主卦
  function fakeResult(opts: {
    qin6: string[];
    qinx: string[];
    dong?: number[];
    shiy?: number[];
  }): HexagramResult {
    return {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: opts.shiy ?? [6, 3, 0],
      qin6: opts.qin6,
      qinx: opts.qinx,
      god6: [],
      dong: opts.dong ?? [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
    };
  }

  it('单现 → 直接取该爻', () => {
    const r = fakeResult({
      qin6: ['官鬼', '父母', '兄弟', '妻财', '子孙', '父母'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    });
    const ys = markYongShen(r, '问事业'); // 用神官鬼，第1爻
    expect(ys.primary_pos).toBe(1);
    expect(ys.primary_zhi).toBe('子');
  });

  it('多现且有动爻 → 取动者', () => {
    // 妻财在第1、4爻，第4爻是动爻 → 取第4
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '妻财', '子孙', '官鬼'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      dong: [3],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(4);
    expect(ys.primary_zhi).toBe('午');
  });

  it('多现无动爻但临世应 → 取临世应者', () => {
    // 妻财在第1、6爻，世在第6爻 → 取第6
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '官鬼', '子孙', '妻财'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [6, 3, 0],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(6);
    expect(ys.primary_zhi).toBe('寅');
  });

  it('多现无动爻无临世应 → 取首现', () => {
    // 妻财在第2、5爻，世应在1/4 → 取第2（首现）
    const r = fakeResult({
      qin6: ['官鬼', '妻财', '兄弟', '父母', '妻财', '子孙'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [1, 4, 0],
    });
    const ys = markYongShen(r, '问求财');
    expect(ys.primary_pos).toBe(2);
    expect(ys.primary_zhi).toBe('戌');
  });

  it('无用神（一般类）→ primary_pos 0、primary_zhi 空', () => {
    const r = fakeResult({
      qin6: ['兄弟', '子孙', '妻财', '官鬼', '父母', '兄弟'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    });
    const ys = markYongShen(r, '随便问问');
    expect(ys.primary_pos).toBe(0);
    expect(ys.primary_zhi).toBe('');
  });
});
