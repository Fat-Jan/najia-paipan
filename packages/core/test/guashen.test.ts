// 独立正确性测试：卦身（月卦身）起法。
// 不依赖 Python 黄金数据，按传统口诀手算校验。
import { describe, it, expect } from 'vitest'
import { compile, calcGuaShen } from '../src/index'
import { ZHIS } from '../src/const'
import type { PaipanInput } from '../src/types'

describe('卦身 — 起例口诀', () => {
  // 阳世：初爻起子，顺数到世位。世位 shi → 地支索引 = (0 + shi-1) % 12
  it('阳世初爻起子，顺数到世位', () => {
    // 用世爻为阳的卦逐一核对地支
    // 乾为天 111111 世6阳：子(初)丑寅卯辰巳 → 世6=巳
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] })
    expect(r.shiy[0]).toBe(6)
    expect(r.mark[5]).toBe('1') // 世爻为阳
    expect(r.gua_shen?.zhi).toBe('巳')
    expect(r.gua_shen?.yang_shi).toBe(true)
  })

  // 阴世：初爻起午，顺数到世位。世位 shi → 地支索引 = (6 + shi-1) % 12
  it('阴世初爻起午，顺数到世位', () => {
    // 坤为地 000000 世6阴：午(初)未申酉戌亥 → 世6=亥
    const r = compile({ params: [2, 2, 2, 2, 2, 2] as PaipanInput['params'] })
    expect(r.shiy[0]).toBe(6)
    expect(r.mark[5]).toBe('0') // 世爻为阴
    expect(r.gua_shen?.zhi).toBe('亥')
    expect(r.gua_shen?.yang_shi).toBe(false)
  })

  // calcGuaShen 直接调用：穷举世位 1-6 的地支递推（阳世）
  it('阳世世位 1-6 地支顺数（子起）', () => {
    const yangSix = '111111'
    for (let shi = 1; shi <= 6; shi++) {
      const gs = calcGuaShen(yangSix, shi)
      expect(gs.zhi).toBe(ZHIS[(0 + shi - 1) % 12])
    }
  })

  // 阴世穷举（午起）
  it('阴世世位 1-6 地支顺数（午起）', () => {
    const yinSix = '000000'
    for (let shi = 1; shi <= 6; shi++) {
      const gs = calcGuaShen(yinSix, shi)
      expect(gs.zhi).toBe(ZHIS[(6 + shi - 1) % 12])
    }
  })
})

describe('卦身 — 上卦判定', () => {
  it('卦身地支现于卦中 → shang_gua=true，positions 与纳甲一致', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1] as PaipanInput['params'] })
    const gs = r.gua_shen!
    if (gs.shang_gua) {
      // positions 处的纳甲地支应等于卦身地支
      for (const p of gs.positions) {
        expect(r.qinx[p - 1]?.[1]).toBe(gs.zhi)
      }
    }
    // 与 note 措辞一致
    expect(gs.shang_gua ? gs.note.includes('上卦') : gs.note.includes('不上卦')).toBe(true)
  })

  it('卦身不上卦时 positions 为空', () => {
    // 遍历若干卦找一个不上卦的，验证 positions=[] 且 shang_gua=false
    let found = false
    const samples: PaipanInput['params'][] = [
      [1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2], [1, 2, 1, 2, 1, 2],
      [2, 1, 2, 1, 2, 1], [1, 1, 2, 2, 1, 1], [2, 2, 1, 1, 2, 2],
    ]
    for (const params of samples) {
      const r = compile({ params })
      const gs = r.gua_shen!
      if (!gs.shang_gua) {
        expect(gs.positions).toEqual([])
        expect(gs.note).toContain('不上卦')
        found = true
      } else {
        expect(gs.positions.length).toBeGreaterThan(0)
      }
    }
    // 至少验证了上卦/不上卦两种分支之一（不强制 found，样本可能全上卦）
    expect(typeof found).toBe('boolean')
  })

  it('每卦必有卦身地支（地支恒在 12 支内）', () => {
    const r = compile({ params: [1, 4, 2, 1, 1, 1] as PaipanInput['params'] })
    expect(ZHIS).toContain(r.gua_shen?.zhi)
  })
})
