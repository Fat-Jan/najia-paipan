import { describe, it, expect } from 'vitest'
import { isChong, LIUHE_MAP, ZHIS, ZHIS_DICT, XING5_DICT } from '../src/const.js'
import { calcDayDynamics, calcYingQi } from '../src/time-analysis.js'
import { compile } from '../src/compile.js'
import { markYongShen } from '../src/yongshen.js'

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
  // qinx 为逐爻纳甲干支+五行三字（如「甲子水」），地支在第 2 字（index 1）
  it('静爻被日冲且旺相 → 暗动', () => {
    // 第1爻甲寅(木)，日辰庚申，寅申相冲；月建卯(木)→寅木为旺 → 暗动
    const qinx = ['甲寅木', '甲子水', '甲戌土', '甲申金', '甲午火', '甲辰土']
    const r = calcDayDynamics(qinx, [], '庚申', '卯')
    expect(r.states[0]).toBe('暗动')
  })

  it('静爻被日冲但休囚 → 日破', () => {
    // 第4爻甲申(金)，日辰甲寅，申寅相冲；月建巳(火)→金在巳月为死 → 日破
    const qinx = ['甲子水', '甲戌土', '甲午火', '甲申金', '甲辰土', '甲寅木']
    const r = calcDayDynamics(qinx, [], '甲寅', '巳')
    expect(r.states[3]).toBe('日破')
  })

  it('动爻被日冲 → 不标（动爻自有动变关系）', () => {
    const qinx = ['甲寅木', '甲子水', '甲戌土', '甲申金', '甲午火', '甲辰土']
    const r = calcDayDynamics(qinx, [0], '庚申', '卯')
    expect(r.states[0]).toBe('')
  })

  it('未被日冲 → 空串', () => {
    const qinx = ['甲子水', '甲戌土', '甲午火', '甲申金', '甲辰土', '甲寅木']
    const r = calcDayDynamics(qinx, [], '乙卯', '巳') // 卯只冲酉，卦中无酉
    expect(r.states.every((s) => s === '')).toBe(true)
    expect(r.note).toBe('')
  })

  it('存在暗动/日破时 note 非空且列出爻位', () => {
    const qinx = ['甲寅木', '甲子水', '甲戌土', '甲申金', '甲午火', '甲辰土']
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

// 集成测试：用真实 compile() 输出驱动，堵住「单元测试手造数据 vs 生产数据格式不符」的洞。
// 起因——qinx 实为三字（如「甲子水」=干支+五行），但单元测试曾用两字「甲子」，
// slice(-1) 在两字下碰巧取到地支、三字下取成五行，导致测试绿而生产 candidates 全空。
describe('集成：真实 compile() 驱动暗动/应期（防数据格式脱节）', () => {
  it('真实 qinx 第2字恒为地支（三字格式 干支+五行）', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] }) // 乾为天
    // qinx 形如「甲子水」，[1] 取地支、[2] 取五行
    expect(r.qinx.every((gz) => gz.length === 3)).toBe(true)
    expect(ZHIS_DICT[r.qinx[0][1]]).toBeDefined() // 第2字是合法地支
  })

  it('真实排盘 → markYongShen 的 primary_zhi 是地支而非五行', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2026-06-01 20:30' })
    const ys = markYongShen(r, '问与现任感情能否长久') // 婚恋→官鬼
    expect(ys.primary_zhi).not.toBe('') // 不空
    expect(ZHIS_DICT[ys.primary_zhi]).toBeDefined() // 必须是合法地支（非五行字「火」）
    expect(XING5_DICT[ys.primary_zhi]).toBeUndefined() // 反向确认：不是五行字
  })

  it('真实排盘 → calcYingQi 候选非空（primary_zhi 是地支才查得到）', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2026-06-01 20:30' })
    const ys = markYongShen(r, '问与现任感情能否长久')
    const yq = calcYingQi(ys.primary_zhi, false)
    expect(yq.candidates.length).toBeGreaterThan(0) // 逢值/逢冲/逢合至少 3 条
    expect(yq.candidates.find((c) => c.type === '逢值')?.zhi).toBe(ys.primary_zhi)
  })

  it('真实排盘 → calcDayDynamics 取真 qinx 地支判冲（bug 在则此爻判不出冲）', () => {
    // 关键守卫：用第1爻地支的「冲支」构造日辰，强制冲中第1爻（静爻）。
    // bug 在时 calcDayDynamics 取成五行字 → 与日辰地支判不出冲 → states[0] 空 → 红。
    // 修复后取地支 → 正确判冲 → states[0] 为暗动/日破（非空）→ 绿。
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2026-06-01 20:30' }) // 乾为天，全静
    const yao1Zhi = r.qinx[0][1] // 第1爻地支
    const chongZhi = ZHIS[(ZHIS_DICT[yao1Zhi] + 6) % 12] // 冲支
    const riChen = '甲' + chongZhi // 日辰干支（天干任意，只用末字地支判冲）
    const dd = calcDayDynamics(r.qinx, r.dong, riChen, r.yue_zhi ?? '寅')
    expect(['暗动', '日破']).toContain(dd.states[0]) // 第1爻必被冲，非空
  })
})
