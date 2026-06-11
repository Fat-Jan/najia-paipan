// 解读效果测试集 — 用 @najia/core 排盘，调真实 LongCat 看解读质量。
// 跑法：node --env-file=apps/server/.env apps/server/test/interpret-samples.mjs
// 注意：会真实消耗 LongCat 额度。
import { compile, markYongShen } from '../../../packages/core/dist/index.js'
import { runRuleEngine } from '../dist/rule-engine.js'
import { interpretHexagram } from '../dist/ai-client.js'

// 典型测试卦例：覆盖不同问题类型 + 卦象形态（静卦/动爻/变卦/六冲六合）
const CASES = [
  { question: '问今年事业能否升职', params: [2, 2, 1, 2, 4, 2], date: '2026-03-15 10:00', gender: '男' },
  { question: '问与现任感情能否长久', params: [1, 1, 1, 1, 1, 1], date: '2026-06-01 20:30', gender: '女' },
  { question: '问近期投资一笔生意是否可行', params: [3, 2, 2, 1, 1, 4], date: '2026-02-20 14:00', gender: '男' },
  { question: '问搬家后家人健康', params: [2, 1, 2, 1, 2, 1], date: '2026-09-09 08:00', gender: '女' },
  { question: '', params: [4, 4, 4, 1, 1, 1], date: '2026-12-01 23:00', gender: '男' }, // 空问题 + 23点边界
]

function toHexagramData(r, question) {
  return {
    name: r.name,
    gong: r.gong,
    mark: r.mark,
    shiy: r.shiy,
    qin6: r.qin6,
    qinx: r.qinx,
    god6: r.god6,
    yue_ling: r.yue_ling ?? undefined,
    yue_zhi: r.yue_zhi ?? undefined,
    ri_chen: r.ri_chen ?? undefined,
    dong: r.dong,
    bian_name: r.bian?.name,
    hide_name: r.hide?.name,
    bian_qin6: r.bian?.qin6,
    bian_qinx: r.bian?.qinx,
    hide_qin6: r.hide?.qin6,
    hide_qinx: r.hide?.qinx,
    hide_seat: r.hide?.seat,
    yao_relation: r.yao_relation,
    yongshen: markYongShen(r, question),
  }
}

for (const [i, c] of CASES.entries()) {
  const r = compile({ params: c.params, date: c.date, gender: c.gender })
  const data = toHexagramData(r, c.question)
  const rule = runRuleEngine(data)
  console.log('\n' + '='.repeat(70))
  console.log(`【案例 ${i + 1}】问题：${c.question || '(未指定)'}`)
  console.log(`卦象：${r.name}（${r.gong}宫）${r.hexagram_type} mark=${r.mark}`)
  console.log(`世应：世${r.shiy[0]}应${r.shiy[1]} | 动爻：${r.dong.length ? r.dong.map((x) => x + 1).join('、') : '无'} | 变卦：${r.bian?.name ?? '无'}`)
  // 诊断：确认新数据已生成（验证 AI 是否采用看下方解读文本）
  console.log(`用神标记：${data.yongshen.note}`)
  if (r.yao_relation?.changes.length) {
    // 逐动爻明细：核对 AI 是否照此采用、不再自行心算进退神
    const lines = r.yao_relation.changes.map(
      (c) => `第${c.pos}爻 ${c.ben_zhi}→${c.bian_zhi} ${c.relation}${c.fanyin ? '+反吟' : ''}${c.fuyin ? '+伏吟' : ''}`,
    )
    console.log(`动变关系：${lines.join(' | ')}`)
  }
  console.log(`规则引擎吉凶：${rule.jixiong}`)
  console.log('-'.repeat(70))
  try {
    const text = await interpretHexagram(data, c.question)
    console.log(text)
  } catch (err) {
    console.log('❌ 解读失败:', err.message)
  }
}
