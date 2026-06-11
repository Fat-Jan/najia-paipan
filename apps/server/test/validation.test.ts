// 校验 + 限流单元测试
import { describe, it, expect } from 'vitest'
import {
  validateInterpretRequest,
  checkRateLimit,
  sweepExpired,
  MAX_QUESTION_LEN,
} from '../src/validation'

const validBody = {
  hexagram_data: {
    name: '地山谦',
    gong: '兑',
    mark: '001000',
    shiy: [5, 2, 5],
    qin6: ['父母', '官鬼', '兄弟', '父母', '子孙', '兄弟'],
    qinx: ['丙辰土', '丙午火', '丙申金', '癸丑土', '癸亥水', '癸酉金'],
    god6: ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
    dong: [4],
  },
  question: '问事业',
}

describe('validateInterpretRequest', () => {
  it('合法请求通过', () => {
    expect(validateInterpretRequest(validBody)).toBeNull()
  })

  it('非对象请求体拒绝', () => {
    expect(validateInterpretRequest(null)).not.toBeNull()
    expect(validateInterpretRequest('x')).not.toBeNull()
  })

  it('缺 hexagram_data 拒绝', () => {
    expect(validateInterpretRequest({ question: 'x' })).not.toBeNull()
  })

  it('name 空拒绝', () => {
    expect(validateInterpretRequest({ ...validBody, hexagram_data: { ...validBody.hexagram_data, name: '' } })).not.toBeNull()
  })

  it('mark 非 6 位 0/1 拒绝', () => {
    for (const bad of ['00100', '0010002', '00100x', 'abcdef']) {
      const body = { ...validBody, hexagram_data: { ...validBody.hexagram_data, mark: bad } }
      expect(validateInterpretRequest(body), bad).not.toBeNull()
    }
  })

  it('question 超长拒绝', () => {
    const body = { ...validBody, question: 'x'.repeat(MAX_QUESTION_LEN + 1) }
    expect(validateInterpretRequest(body)).not.toBeNull()
  })

  it('question 恰好上限通过', () => {
    const body = { ...validBody, question: 'x'.repeat(MAX_QUESTION_LEN) }
    expect(validateInterpretRequest(body)).toBeNull()
  })

  it('question 省略通过（可选）', () => {
    const { question, ...rest } = validBody
    void question
    expect(validateInterpretRequest(rest)).toBeNull()
  })

  it('超大数组拒绝（防撑爆 prompt）', () => {
    const body = { ...validBody, hexagram_data: { ...validBody.hexagram_data, qin6: new Array(100).fill('x') } }
    expect(validateInterpretRequest(body)).not.toBeNull()
  })
})

describe('checkRateLimit', () => {
  const opts = { windowMs: 1000, max: 3 }

  it('窗口内未超限放行', () => {
    const key = 'ip-a-' + Math.random()
    expect(checkRateLimit(key, opts)).toBeNull()
    expect(checkRateLimit(key, opts)).toBeNull()
    expect(checkRateLimit(key, opts)).toBeNull()
  })

  it('超过 max 返回等待秒数', () => {
    const key = 'ip-b-' + Math.random()
    checkRateLimit(key, opts)
    checkRateLimit(key, opts)
    checkRateLimit(key, opts)
    const wait = checkRateLimit(key, opts)
    expect(wait).not.toBeNull()
    expect(wait).toBeGreaterThan(0)
  })

  it('不同 key 独立计数', () => {
    const a = 'ip-c-' + Math.random()
    const b = 'ip-d-' + Math.random()
    checkRateLimit(a, opts)
    checkRateLimit(a, opts)
    checkRateLimit(a, opts)
    expect(checkRateLimit(a, opts)).not.toBeNull() // a 超限
    expect(checkRateLimit(b, opts)).toBeNull() // b 不受影响
  })

  it('窗口过期后重置', async () => {
    const key = 'ip-e-' + Math.random()
    const fast = { windowMs: 50, max: 1 }
    expect(checkRateLimit(key, fast)).toBeNull()
    expect(checkRateLimit(key, fast)).not.toBeNull() // 立即再请求超限
    await new Promise((r) => setTimeout(r, 60))
    expect(checkRateLimit(key, fast)).toBeNull() // 过期后重置放行
  })
})

describe('sweepExpired', () => {
  it('清理过期窗口', () => {
    const key = 'ip-sweep-' + Math.random()
    checkRateLimit(key, { windowMs: 10, max: 5 })
    // 用未来时间触发清理
    const after = sweepExpired(Date.now() + 10_000)
    expect(after).toBe(0)
  })
})
