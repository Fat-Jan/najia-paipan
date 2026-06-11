import { compile } from './src/index.ts'
import golden from './test/golden.json' with { type: 'json' }

let fails = []
for (let i = 0; i < golden.length; i++) {
  const { input, expected } = golden[i]
  const actual = JSON.parse(JSON.stringify(compile({
    params: input.params, date: input.date,
    gender: input.gender ?? undefined,
  })))
  // 找出差异字段
  const allKeys = new Set([...Object.keys(actual), ...Object.keys(expected)])
  const diffs = []
  for (const k of allKeys) {
    const a = JSON.stringify(actual[k]), e = JSON.stringify(expected[k])
    if (a !== e) diffs.push(k)
  }
  if (diffs.length) fails.push({ i, params: input.params, date: input.date, diffs })
}
console.log('失败数:', fails.length)
// 统计哪些字段最常出错
const fieldCount = {}
for (const f of fails) for (const d of f.diffs) fieldCount[d] = (fieldCount[d]||0)+1
console.log('出错字段分布:', fieldCount)
console.log('\n前3个失败详情:')
for (const f of fails.slice(0,3)) console.log(JSON.stringify(f))
