// 后端配置 — 从环境变量读取，密钥绝不硬编码
export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
  port: number
  allowedOrigins: string[]
}

function parseOrigins(raw: string | undefined): string[] {
  // 逗号分隔的允许来源，默认本地 dev
  if (!raw) return ['http://localhost:5173']
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

/** 读取配置（每次调用读 env，确保 dotenv 加载后才解析） */
export function getConfig(): AiConfig {
  return {
    apiKey: process.env.LONGCAT_API_KEY ?? '',
    baseUrl: process.env.LONGCAT_BASE_URL ?? 'https://api.longcat.chat/openai',
    model: process.env.LONGCAT_MODEL ?? 'LongCat-2.0-Preview',
    port: Number(process.env.PORT ?? 8787),
    allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  }
}
