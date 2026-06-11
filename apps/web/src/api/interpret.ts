// AI 智能解读 API — 唯一需要后端的调用（排盘已在前端本地算）
import type { InterpretRequest, InterpretResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

/** 调用后端 AI 解读卦象 */
export async function interpret(request: InterpretRequest): Promise<InterpretResponse> {
  const res = await fetch(`${API_BASE}/v1/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error((detail as { detail?: string }).detail || `解读失败 (${res.status})`)
  }
  return res.json()
}
