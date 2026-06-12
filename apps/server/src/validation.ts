// 请求校验 + 限流 — AI 是付费接口，需防滥用
import type { InterpretRequest } from './types.js';

/** question 最大长度（防超长 prompt 烧额度） */
export const MAX_QUESTION_LEN = 500;
/** 字符串数组字段最大元素数（卦象固定 6 爻，留余量到 8） */
const MAX_ARR_LEN = 8;

/** 校验解读请求体；返回错误信息字符串，合法则返回 null */
export function validateInterpretRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return '请求体格式错误';
  }
  const { hexagram_data, question } = body as Partial<InterpretRequest>;

  if (typeof hexagram_data !== 'object' || hexagram_data === null) {
    return '缺少 hexagram_data';
  }
  const hd = hexagram_data as unknown as Record<string, unknown>;
  if (typeof hd.name !== 'string' || hd.name.length === 0) {
    return 'hexagram_data.name 不能为空';
  }
  if (typeof hd.mark !== 'string' || !/^[01]{6}$/.test(hd.mark)) {
    return 'hexagram_data.mark 必须是 6 位 0/1 卦码';
  }
  // 六亲/纳甲/六神数组长度防御（防构造超大数组撑爆 prompt）
  for (const key of ['qin6', 'qinx', 'god6'] as const) {
    const arr = hd[key];
    if (arr !== undefined && (!Array.isArray(arr) || arr.length > MAX_ARR_LEN)) {
      return `hexagram_data.${key} 格式错误`;
    }
  }
  if (question !== undefined && typeof question !== 'string') {
    return 'question 必须是字符串';
  }
  if (typeof question === 'string' && question.length > MAX_QUESTION_LEN) {
    return `question 过长（上限 ${MAX_QUESTION_LEN} 字）`;
  }
  return null;
}

// ── 限流：内存级固定窗口（单实例够用；多实例/重启不保留，需上 Redis）──
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export interface RateLimitOptions {
  /** 窗口时长（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  max: number;
}

/** 判断某 key（如 IP）是否超限；超限返回剩余等待秒数，未超限返回 null */
export function checkRateLimit(key: string, opts: RateLimitOptions): number | null {
  const now = Date.now();
  const w = buckets.get(key);
  if (!w || now >= w.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (w.count >= opts.max) {
    return Math.ceil((w.resetAt - now) / 1000);
  }
  w.count += 1;
  return null;
}

/** 清理过期窗口（避免 Map 无限增长），返回清理后的桶数 */
export function sweepExpired(now = Date.now()): number {
  for (const [key, w] of buckets) {
    if (now >= w.resetAt) buckets.delete(key);
  }
  return buckets.size;
}
