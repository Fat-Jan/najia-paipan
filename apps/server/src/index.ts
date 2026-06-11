// 六爻 AI 解读后端 — Hono 薄代理
// 职责：藏 AI key + 规则引擎分析 + 调 AI 解读。排盘已在前端 @najia/core 本地算。
// 环境变量经 dev/start 脚本的 --env-file=.env 注入（Node 原生，无 dotenv 依赖）。
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { getConnInfo } from '@hono/node-server/conninfo'
import { getConfig } from './config.js'
import { runRuleEngine } from './rule-engine.js'
import { interpretHexagram } from './ai-client.js'
import { validateInterpretRequest, checkRateLimit, sweepExpired } from './validation.js'
import type { InterpretRequest, InterpretResponse } from './types.js'

const config = getConfig()
const app = new Hono()

// 限流：每 IP 每分钟最多 10 次解读（AI 付费接口防滥用）
const RATE_LIMIT = { windowMs: 60_000, max: 10 }
// 定期清理过期限流窗口，避免内存无限增长
setInterval(() => sweepExpired(), 5 * 60_000).unref()

// CORS：仅放行配置的前端源（不再 legacy 的 '*' + credentials 不安全组合）
app.use(
  '/api/*',
  cors({
    origin: config.allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/v1/interpret', async (c) => {
  // 限流（按客户端 IP）
  const ip = getConnInfo(c).remote.address ?? 'unknown'
  const retryAfter = checkRateLimit(ip, RATE_LIMIT)
  if (retryAfter !== null) {
    c.header('Retry-After', String(retryAfter))
    return c.json({ detail: `请求过于频繁，请 ${retryAfter} 秒后再试` }, 429)
  }

  let body: InterpretRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ detail: '请求体不是合法 JSON' }, 400)
  }

  // 输入校验（防超长 question / 畸形 hexagram_data 烧额度）
  const invalid = validateInterpretRequest(body)
  if (invalid !== null) {
    return c.json({ detail: invalid }, 400)
  }

  const { hexagram_data, question } = body

  // 规则引擎分析（本地计算，不依赖 AI）
  const rule = runRuleEngine(hexagram_data)

  // AI 解读（需要 key；缺失时降级为仅规则分析）
  let aiText: string
  try {
    aiText = await interpretHexagram(hexagram_data, question ?? '')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // key 未配置时不报 500，返回规则分析 + 提示
    if (!config.apiKey) {
      aiText = '（未配置 LONGCAT_API_KEY，仅提供规则引擎分析。配置后可获得 AI 个性化解读。）'
    } else {
      return c.json({ detail: `AI 解读失败: ${msg}` }, 502)
    }
  }

  const response: InterpretResponse = {
    hexagram_name: hexagram_data.name,
    jixiong: rule.jixiong,
    rule_analysis: rule,
    ai_interpretation: aiText,
  }
  return c.json(response)
})

serve({ fetch: app.fetch, port: config.port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`六爻 AI 解读服务 → http://localhost:${info.port}`)
})

export default app
