import { readFileSync } from 'node:fs'
import { compile } from './src/index'

const golden = JSON.parse(readFileSync('./test/golden.json', 'utf-8'))

// 看第一个 lunar 差异
const c0 = golden[0]
const a0 = JSON.parse(JSON.stringify(compile(c0.input)))
console.log('=== lunar 对比 (case 0) ===')
console.log('expected.lunar:', JSON.stringify(c0.expected.lunar))
console.log('actual.lunar  :', JSON.stringify(a0.lunar))

// 看第一个 hide 差异 (case 2)
const c2 = golden[2]
const a2 = JSON.parse(JSON.stringify(compile(c2.input)))
console.log('\n=== hide 对比 (case 2) ===')
console.log('expected.hide:', JSON.stringify(c2.expected.hide))
console.log('actual.hide  :', JSON.stringify(a2.hide))
