import { describe, it, expect } from 'vitest'
import { isChong, LIUHE_MAP } from '../src/const.js'
import { calcDayDynamics, calcYingQi } from '../src/time-analysis.js'

describe('地支相冲（共享 isChong）', () => {
  it('六冲对全部成立', () => {
    const pairs: Array<[string, string]> = [
      ['子', '午'], ['丑', '未'], ['寅', '申'],
      ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
    ]
    for (const [a, b] of pairs) {
      expect(isChong(a, b)).toBe(true)
      expect(isChong(b, a)).toBe(true)
    }
  })

  it('非冲对返回 false', () => {
    expect(isChong('子', '丑')).toBe(false)
    expect(isChong('子', '子')).toBe(false)
    expect(isChong('寅', '卯')).toBe(false)
  })

  it('非法地支返回 false', () => {
    expect(isChong('X', '午')).toBe(false)
  })
})

describe('地支六合（LIUHE_MAP）', () => {
  it('六合对双向一致', () => {
    const pairs: Array<[string, string]> = [
      ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
      ['辰', '酉'], ['巳', '申'], ['午', '未'],
    ]
    for (const [a, b] of pairs) {
      expect(LIUHE_MAP[a]).toBe(b)
      expect(LIUHE_MAP[b]).toBe(a)
    }
  })
})

describe('暗动 / 日破（calcDayDynamics）', () => {
  // qinx 为逐爻纳甲干支（如「甲子」），取末字地支
  it('静爻被日冲且旺相 → 暗动', () => {
    // 第1爻甲寅(木)，日辰庚申，寅申相冲；月建卯(木)→寅木为旺 → 暗动
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [], '庚申', '卯')
    expect(r.states[0]).toBe('暗动')
  })

  it('静爻被日冲但休囚 → 日破', () => {
    // 第4爻甲申(金)，日辰甲寅，申寅相冲；月建巳(火)→金在巳月为死 → 日破
    const qinx = ['甲子', '甲戌', '甲午', '甲申', '甲辰', '甲寅']
    const r = calcDayDynamics(qinx, [], '甲寅', '巳')
    expect(r.states[3]).toBe('日破')
  })

  it('动爻被日冲 → 不标（动爻自有动变关系）', () => {
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [0], '庚申', '卯')
    expect(r.states[0]).toBe('')
  })

  it('未被日冲 → 空串', () => {
    const qinx = ['甲子', '甲戌', '甲午', '甲申', '甲辰', '甲寅']
    const r = calcDayDynamics(qinx, [], '乙卯', '巳') // 卯只冲酉，卦中无酉
    expect(r.states.every((s) => s === '')).toBe(true)
    expect(r.note).toBe('')
  })

  it('存在暗动/日破时 note 非空且列出爻位', () => {
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [], '庚申', '卯')
    expect(r.note).toContain('暗动')
    expect(r.note).toContain('1')
  })
})

describe('应期候选地支（calcYingQi）', () => {
  it('用神午、不空 → 逢值午/逢冲子/逢合未，无出空', () => {
    const r = calcYingQi('午', false)
    expect(r.zhi).toBe('午')
    const byType = Object.fromEntries(r.candidates.map((c) => [c.type, c.zhi]))
    expect(byType['逢值']).toBe('午')
    expect(byType['逢冲']).toBe('子')
    expect(byType['逢合']).toBe('未')
    expect(byType['出空']).toBeUndefined()
  })

  it('用神午、旬空 → 追加出空=本支午', () => {
    const r = calcYingQi('午', true)
    const byType = Object.fromEntries(r.candidates.map((c) => [c.type, c.zhi]))
    expect(byType['出空']).toBe('午')
  })

  it('逢冲反查正确（寅冲申、辰冲戌）', () => {
    expect(calcYingQi('寅', false).candidates.find((c) => c.type === '逢冲')?.zhi).toBe('申')
    expect(calcYingQi('辰', false).candidates.find((c) => c.type === '逢冲')?.zhi).toBe('戌')
  })

  it('逢合查表正确（子合丑、寅合亥）', () => {
    expect(calcYingQi('子', false).candidates.find((c) => c.type === '逢合')?.zhi).toBe('丑')
    expect(calcYingQi('寅', false).candidates.find((c) => c.type === '逢合')?.zhi).toBe('亥')
  })

  it('每个候选都带固定语义标签', () => {
    const r = calcYingQi('午', true)
    expect(r.candidates.every((c) => c.semantic.length > 0)).toBe(true)
  })

  it('空用神地支 → 空 candidates', () => {
    const r = calcYingQi('', false)
    expect(r.candidates).toEqual([])
  })
})
