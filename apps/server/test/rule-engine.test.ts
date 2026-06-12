// rule-engine 单元测试 — 重点覆盖字段缺失的健壮性（不能因数据残缺崩溃）
import { describe, it, expect } from 'vitest';
import { runRuleEngine } from '../src/rule-engine';
import type { HexagramData } from '../src/types';

// 完整卦例（地山谦）
const full: HexagramData = {
  name: '地山谦',
  gong: '兑',
  mark: '001000',
  shiy: [5, 2],
  qin6: ['父母', '官鬼', '兄弟', '父母', '子孙', '兄弟'],
  qinx: ['丙辰土', '丙午火', '丙申金', '癸丑土', '癸亥水', '癸酉金'],
  god6: ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
  yue_ling: ['囚', '死', '休', '囚', '旺', '休'],
  yue_zhi: '子',
  ri_chen: '丙申',
  dong: [4],
  bian_name: '水山蹇',
};

describe('runRuleEngine — 完整数据', () => {
  it('返回 5 个分析字段', () => {
    const r = runRuleEngine(full);
    expect(r.wuxing_balance).toContain('五行分布');
    expect(r.shiy_relation).toContain('世爻在5爻');
    expect(r.yueling_status).toContain('月建子');
    expect(r.dongyao_analysis).toContain('动爻');
    expect(['大吉', '中吉', '平', '小凶', '大凶']).toContain(r.jixiong);
  });
});

describe('runRuleEngine — 字段缺失健壮性（不得抛错）', () => {
  // 这是本轮真实暴露的 bug：shiy/qinx 缺失会让旧版崩 500
  it('shiy 缺失 → 不抛错，世应标注信息不全', () => {
    const data = { ...full, shiy: undefined } as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
    const r = runRuleEngine(data);
    expect(r.shiy_relation).toContain('世应信息不全');
  });

  it('qinx 缺失 → 不抛错', () => {
    const data = { ...full, qinx: undefined } as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
    const r = runRuleEngine(data);
    expect(r.wuxing_balance).toContain('五行分布');
  });

  it('dong 缺失 → 按静卦处理', () => {
    const data = { ...full, dong: undefined } as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
    expect(runRuleEngine(data).dongyao_analysis).toContain('静卦');
  });

  it('yue_ling 缺失 → 标注无月令信息', () => {
    const data = { ...full, yue_ling: undefined, yue_zhi: undefined };
    expect(() => runRuleEngine(data)).not.toThrow();
    expect(runRuleEngine(data).yueling_status).toContain('无月令信息');
  });

  it('只有 name（其余全缺）→ 不抛错，仍返回完整结构', () => {
    const data = { name: '乾为天' } as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
    const r = runRuleEngine(data);
    expect(r.hexagram_name ?? r.jixiong).toBeDefined();
    expect(r.shiy_relation).toBeTruthy();
    expect(r.wuxing_balance).toBeTruthy();
  });

  it('空对象 → 不抛错', () => {
    const data = {} as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
  });

  it('shiy 越界（爻位超出 qinx 范围）→ 不抛错', () => {
    const data = { ...full, shiy: [9, 2] } as unknown as HexagramData;
    expect(() => runRuleEngine(data)).not.toThrow();
  });
});
