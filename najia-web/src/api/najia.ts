import axios from 'axios'
import type {
  PaipanRequest,
  HexagramResult,
  Gua64Info,
  InterpretRequest,
  InterpretResponse,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败'
    return Promise.reject(new Error(message))
  },
)

/**
 * 获取 API 信息
 */
export async function getApiInfo() {
  return api.get('/')
}

/**
 * 获取 64 卦列表
 */
export async function get64Gua(): Promise<{ total: number; gua_list: Gua64Info[] }> {
  return api.get('/api/v1/gua/64')
}

/**
 * 单个排盘
 */
export async function paipan(request: PaipanRequest): Promise<HexagramResult> {
  return api.post('/api/v1/paipan', request)
}

/**
 * 批量排盘
 */
export async function batchPaipan(params_list: number[][], max_workers: number = 4) {
  return api.post('/api/v1/paipan/batch', {
    params_list,
    max_workers,
  })
}

/**
 * 文本渲染
 */
export async function paipanText(request: PaipanRequest) {
  return api.post('/api/v1/paipan/text', request)
}

/**
 * AI 智能解读
 */
export async function interpret(request: InterpretRequest): Promise<InterpretResponse> {
  return api.post('/api/v1/interpret', request)
}

export default api