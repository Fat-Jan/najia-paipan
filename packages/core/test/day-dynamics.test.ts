import { describe, it, expect } from 'vitest'
import { isChong, LIUHE_MAP } from '../src/const.js'

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
