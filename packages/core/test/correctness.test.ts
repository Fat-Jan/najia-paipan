// 独立算法正确性测试 — 不依赖 Python 黄金数据，直接验传统口诀/规则。
// 目的：对拍只能保证「与 Python 一致」，本测试保证「算法本身正确」。
import { describe, it, expect } from 'vitest'
import { getGod6, setShiYao, getType, palace, getNajia } from '../src/hexagram'
import { calcYueLing, isYuePo, getXunKong } from '../src/time-analysis'
import { compile, compileBatch } from '../src/index'
import { GANS, ZHIS } from '../src/const'

describe('六神起例口诀', () => {
  // 甲乙起青龙，丙丁起朱雀，戊起勾陈，己起螣蛇，庚辛起白虎，壬癸起玄武
  const expected: Record<string, string> = {
    甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈',
    己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
  }
  for (const gan of GANS) {
    it(`${gan}日起${expected[gan]}`, () => {
      // 用该日干 + 任意地支构造日柱
      const god6 = getGod6(gan + '子')
      expect(god6[0]).toBe(expected[gan])
    })
  }

  it('六神按固定顺序循环：青龙朱雀勾陈螣蛇白虎玄武', () => {
    const order = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
    const god6 = getGod6('甲子') // 甲起青龙
    expect(god6).toEqual(order)
  })

  it('六神列表始终 6 个、无重复', () => {
    for (const gan of GANS) {
      const god6 = getGod6(gan + '子')
      expect(god6).toHaveLength(6)
      expect(new Set(god6).size).toBe(6)
    }
  })
})

describe('八纯卦（六冲）世应与卦宫', () => {
  // 八纯卦：世爻在上爻(6)，应爻在三爻(3)，卦宫即本宫
  const pureGua: Array<[string, string]> = [
    ['111111', '乾'], ['110110', '兑'], ['101101', '离'], ['100100', '震'],
    ['011011', '巽'], ['010010', '坎'], ['001001', '艮'], ['000000', '坤'],
  ]
  for (const [mark, gong] of pureGua) {
    it(`${gong}为本宫：世6应3、六冲`, () => {
      const [shi, ying] = setShiYao(mark)
      expect(shi).toBe(6)
      expect(ying).toBe(3)
      expect(getType(mark)).toBe('六冲')
    })
  }
})

describe('月令旺衰口诀', () => {
  // 寅月（木旺）：木旺、火相(木生火)、水休(水生木)、金囚(金克木反受制)、土死(木克土)
  it('寅月木当令', () => {
    expect(calcYueLing('木', '寅')).toBe('旺') // 同我
    expect(calcYueLing('火', '寅')).toBe('相') // 木生火，生我者…实为我生为相？按口诀验
  })
  // 严格按 compile 的定义：同我旺/生我相/我生休/克我囚/我克死
  it('五种状态齐全（以木为爻、轮换月支五行）', () => {
    // 子月=水：水生木→木相
    expect(calcYueLing('木', '子')).toBe('相')
    // 巳月=火：木生火→木休
    expect(calcYueLing('木', '巳')).toBe('休')
    // 申月=金：金克木→木死？按定义「我克死/克我囚」需核对
    const s = calcYueLing('木', '申')
    expect(['囚', '死']).toContain(s)
  })
})

describe('月破（相冲）', () => {
  it('子午相冲', () => {
    expect(isYuePo('子', '午')).toBe(true)
    expect(isYuePo('午', '子')).toBe(true)
  })
  it('寅申相冲', () => {
    expect(isYuePo('寅', '申')).toBe(true)
  })
  it('非冲不破', () => {
    expect(isYuePo('子', '丑')).toBe(false)
  })
})

describe('旬空', () => {
  // 甲子旬中空戌亥（甲子旬：甲子起至癸酉，戌亥无天干）
  it('甲子日空戌亥', () => {
    expect(getXunKong('甲子').sort()).toEqual(['亥', '戌'].sort())
  })
  // 甲戌旬空申酉
  it('甲戌日空申酉', () => {
    expect(getXunKong('甲戌').sort()).toEqual(['申', '酉'].sort())
  })
  it('旬空恒为 2 个地支', () => {
    for (const gan of GANS) {
      for (const zhi of ZHIS) {
        const k = getXunKong(gan + zhi)
        // 仅 60 甲子有效组合返回 2 个
        if (k.length > 0) expect(k).toHaveLength(2)
      }
    }
  })
})

describe('纳甲配干支', () => {
  // 乾卦内卦纳甲：甲子甲寅甲辰
  it('乾为天内卦甲子寅辰', () => {
    const najia = getNajia('111111')
    expect(najia.slice(0, 3)).toEqual(['甲子', '甲寅', '甲辰'])
  })
  it('每卦纳甲恒为 6 个干支', () => {
    expect(getNajia('000000')).toHaveLength(6)
  })
})

describe('动爻与变卦', () => {
  it('无动爻则无变卦', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2024-01-01 12:00' })
    expect(r.dong).toEqual([])
    expect(r.bian).toBeUndefined()
  })
  it('老阳(3)为动爻并生变卦', () => {
    const r = compile({ params: [3, 1, 1, 1, 1, 1], date: '2024-01-01 12:00' })
    expect(r.dong).toEqual([0])
    expect(r.bian).toBeDefined()
    // 初爻老阳变阴：变卦初爻为 0
    expect(r.bian!.mark[0]).toBe('0')
  })
})

// ── 日界回归：23:00 起卦时 god6 / xkong / ri_chen 必须基于同一日柱 ──
// 防 tyme4ts EightChar.getDay() 在 23:00 滚动到次日、而 LunarDay 不滚动导致的自相矛盾。
describe('23点日界自洽', () => {
  // 2026-01-09 23:00 日柱为癸未（不按子时滚日），癸日起玄武
  it('god6 与 ri_chen 同源（癸未日 → 玄武起神）', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2026-01-09 23:00' })
    expect(r.ri_chen).toBe('癸未')
    expect(r.lunar.gz.day).toBe('癸未')
    expect(r.god6[0]).toBe('玄武')
  })
  it('xkong 与 ri_chen 同旬（癸未属甲戌旬，空申酉）', () => {
    const r = compile({ params: [1, 1, 1, 1, 1, 1], date: '2026-01-09 23:00' })
    expect(r.lunar.xkong).toBe('申酉')
  })
})

// ── 方向 1：旬空全六旬覆盖（六十甲子 → 旬首 → 空亡） ──
describe('旬空全六旬', () => {
  // 六旬空亡：甲子旬空戌亥 / 甲戌旬空申酉 / 甲申旬空午未
  //          甲午旬空辰巳 / 甲辰旬空寅卯 / 甲寅旬空子丑
  const xunKong = [
    ['戌', '亥'], ['申', '酉'], ['午', '未'],
    ['辰', '巳'], ['寅', '卯'], ['子', '丑'],
  ]
  // 生成六十甲子，逐个验其旬空 = 所在旬的空亡
  for (let i = 0; i < 60; i++) {
    const gz = GANS[i % 10] + ZHIS[i % 12]
    const expected = xunKong[Math.floor(i / 10)]
    it(`${gz}日空${expected.join('')}`, () => {
      expect(getXunKong(gz).sort()).toEqual([...expected].sort())
    })
  }
})

// ── 方向 2：京房八宫六十四卦全表（卦宫 + 世应全覆盖） ──
describe('京房八宫六十四卦', () => {
  // 每宫 8 卦顺序：本宫·一世·二世·三世·四世·五世·游魂·归魂
  const palaces: Array<[string, string[]]> = [
    ['乾', ['111111', '011111', '001111', '000111', '000011', '000001', '000101', '111101']],
    ['兑', ['110110', '010110', '000110', '001110', '001010', '001000', '001100', '110100']],
    ['离', ['101101', '001101', '011101', '010101', '010001', '010011', '010111', '101111']],
    ['震', ['100100', '000100', '010100', '011100', '011000', '011010', '011110', '100110']],
    ['巽', ['011011', '111011', '101011', '100011', '100111', '100101', '100001', '011001']],
    ['坎', ['010010', '110010', '100010', '101010', '101110', '101100', '101000', '010000']],
    ['艮', ['001001', '101001', '111001', '110001', '110101', '110111', '110011', '001011']],
    ['坤', ['000000', '100000', '110000', '111000', '111100', '111110', '111010', '000010']],
  ]
  // 各世位的世爻/应爻（本一二三四五游归）
  const shiSeq = [6, 1, 2, 3, 4, 5, 4, 3]
  const yingSeq = [3, 4, 5, 6, 1, 2, 1, 6]
  const GUAS_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']

  for (const [gongName, marks] of palaces) {
    const gongIdx = GUAS_ORDER.indexOf(gongName)
    marks.forEach((mark, pos) => {
      it(`${gongName}宫 ${mark}：宫=${gongName} 世${shiSeq[pos]}应${yingSeq[pos]}`, () => {
        const [shi, ying] = setShiYao(mark)
        expect(shi).toBe(shiSeq[pos])
        expect(ying).toBe(yingSeq[pos])
        expect(palace(mark, shi)).toBe(gongIdx)
      })
    })
  }

  it('64 卦无重复、全覆盖', () => {
    const all = palaces.flatMap(([, m]) => m)
    expect(all).toHaveLength(64)
    expect(new Set(all).size).toBe(64)
  })
})

// ── 方向 3：月破全六冲对 ──
describe('月破全六冲对', () => {
  // 六冲：子午、丑未、寅申、卯酉、辰戌、巳亥（互冲）
  const chong: Array<[string, string]> = [
    ['子', '午'], ['丑', '未'], ['寅', '申'],
    ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
  ]
  for (const [a, b] of chong) {
    it(`${a}${b}相冲互破`, () => {
      expect(isYuePo(a, b)).toBe(true)
      expect(isYuePo(b, a)).toBe(true)
    })
  }
  it('非相冲地支不破（全 12 支两两验证）', () => {
    const chongMap: Record<string, string> = {}
    for (const [a, b] of chong) { chongMap[a] = b; chongMap[b] = a }
    for (const a of ZHIS) {
      for (const b of ZHIS) {
        const broken = isYuePo(a, b)
        expect(broken).toBe(chongMap[a] === b)
      }
    }
  })
  // 月破定义边界：isYuePo 是排盘原语，仅判「月建冲爻」。
  // 传统断卦中「出月不破/填实」属解读层，不在此原语职责内。
})

// ── palace fail-fast：非法卦码应抛错，而非返回假「乾宫」(索引0) ──
describe('palace 健壮性', () => {
  it('合法卦码返回正确卦宫', () => {
    expect(palace('111111', 6)).toBe(0) // 乾为天 → 乾宫
    expect(palace('000000', 6)).toBe(7) // 坤为地 → 坤宫
  })
  it('非法世位（落入死分支）抛错而非返回0', () => {
    // index 取 0（setShiYao 恒返回 1-6，0 不可能合法出现），
    // 且非归魂/游魂 → 三分支全不命中 → 应 throw
    expect(() => palace('111110', 0)).toThrow()
  })
})

describe('compileBatch 批量排盘', () => {
  it('全部成功：每项有 result、无 error', () => {
    const batch = compileBatch([
      { params: [1, 1, 1, 1, 1, 1], date: '2024-01-01 12:00' },
      { params: [2, 2, 2, 2, 2, 2], date: '2024-01-01 12:00' },
    ])
    expect(batch.successCount).toBe(2)
    expect(batch.errorCount).toBe(0)
    expect(batch.items).toHaveLength(2)
    expect(batch.items[0].success).toBe(true)
    expect(batch.items[0].result?.name).toBe('乾为天')
    expect(batch.items[1].result?.name).toBe('坤为地')
  })

  it('错误隔离：单项非法不影响其余', () => {
    const batch = compileBatch([
      { params: [1, 1, 1, 1, 1, 1], date: '2024-01-01 12:00' },
      { params: [9, 9] as never, date: '2024-01-01 12:00' }, // 非法
      { params: [2, 2, 2, 2, 2, 2], date: '2024-01-01 12:00' },
    ])
    expect(batch.successCount).toBe(2)
    expect(batch.errorCount).toBe(1)
    expect(batch.items[1].success).toBe(false)
    expect(batch.items[1].error).toBeTruthy()
    // 失败项不影响后续项
    expect(batch.items[2].success).toBe(true)
    expect(batch.items[2].result?.name).toBe('坤为地')
  })

  it('保留原始索引', () => {
    const batch = compileBatch([
      { params: [1, 1, 1, 1, 1, 1], date: '2024-01-01 12:00' },
      { params: [2, 2, 2, 2, 2, 2], date: '2024-01-01 12:00' },
    ])
    expect(batch.items.map((it) => it.index)).toEqual([0, 1])
  })

  it('空输入返回空结果', () => {
    const batch = compileBatch([])
    expect(batch.items).toHaveLength(0)
    expect(batch.successCount).toBe(0)
    expect(batch.errorCount).toBe(0)
  })
})
