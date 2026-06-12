// 对拍测试：TS compile() 输出 ≡ legacy Python golden.json 逐字段一致
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from '../src/index';
import type { PaipanInput } from '../src/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(__dirname, 'golden.json'), 'utf-8')) as Array<{
  input: { params: number[]; date: string; gender: string | null };
  expected: Record<string, unknown>;
}>;

/**
 * 规范化：hide.seat 是语义无序的位置集合，Python 用 set.difference 生成，
 * 顺序受 PYTHONHASHSEED 影响而不确定（黄金数据顺序不可信）。比对前两侧都排序。
 */
function normalize(obj: Record<string, unknown>): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const hide = o.hide as { seat?: number[] } | undefined;
  if (hide?.seat) hide.seat = [...hide.seat].sort((a, b) => a - b);
  // yao_relation 是 TS 新增的卦象固有属性，Python 黄金数据无此字段。
  // 对拍只验「与 Python 一致」的部分；新字段由 relation.test.ts 独立验证正确性。
  delete o.yao_relation;
  // gua_shen 同理：TS 新增卦身字段，Python 黄金数据无，剥离后再比对
  delete o.gua_shen;
  // day_dynamics 同理：TS 新增暗动/日破字段，Python 黄金数据无，剥离后再比对
  delete o.day_dynamics;
  // san_he 同理：TS 新增三合局/半合字段，Python 黄金数据无，剥离后再比对
  delete o.san_he;
  return o;
}

describe('TS ↔ Python 排盘对拍', () => {
  it(`黄金数据非空（${golden.length} 条）`, () => {
    expect(golden.length).toBeGreaterThan(0);
  });

  for (let i = 0; i < golden.length; i++) {
    const { input, expected } = golden[i];
    const label = `#${i} ${input.params.join('')} @${input.date}`;
    it(label, () => {
      const actual = compile({
        params: input.params as PaipanInput['params'],
        date: input.date,
        gender: (input.gender ?? '') as PaipanInput['gender'],
      });
      // 逐字段比对（normalize 把无序的 hide.seat 排序后再比）
      expect(normalize(actual as Record<string, unknown>)).toEqual(normalize(expected));
    });
  }
});
