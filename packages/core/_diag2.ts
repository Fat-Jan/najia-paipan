import { readFileSync } from 'node:fs'
import { compile } from './src/index'

const golden = JSON.parse(readFileSync('./test/golden.json', 'utf-8'))
const c0 = golden[0]
const a0 = JSON.parse(JSON.stringify(compile(c0.input)))

// 深度找出 lunar 真正的值差异
function deepDiff(a: any, b: any, path = ''): string[] {
  const out: string[] = []
  if (typeof a !== typeof b) { out.push(`${path}: type ${typeof a} vs ${typeof b}`); return out }
  if (a && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) out.push(...deepDiff(a[k], b[k], `${path}.${k}`))
  } else if (a !== b) {
    out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`)
  }
  return out
}
console.log('lunar 值差异:', deepDiff(a0.lunar, c0.expected.lunar) || 'none')
console.log('xun_kong 差异:', deepDiff(a0.xun_kong, c0.expected.xun_kong))
console.log('yue_ling 差异:', deepDiff(a0.yue_ling, c0.expected.yue_ling))
console.log('full actual xun_kong:', JSON.stringify(a0.xun_kong))
console.log('full expect xun_kong:', JSON.stringify(c0.expected.xun_kong))
console.log('full actual yue_ling:', JSON.stringify(a0.yue_ling))
console.log('full expect yue_ling:', JSON.stringify(c0.expected.yue_ling))
