import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { compile } from '@najia/core'
import type { YaoParam, Gender, HexagramResult, HistoryItem } from '@/types'

const HISTORY_KEY = 'najia-history'
const HISTORY_MAX = 20

export const usePaipanStore = defineStore('paipan', () => {
  // ── 排盘输入状态 ──
  const params = ref<YaoParam[]>([2, 2, 2, 2, 2, 2]) // 默认六阴爻
  const date = ref<string>('')
  const gender = ref<Gender>('男')
  const title = ref<string>('')
  const guaci = ref<boolean>(false)

  // ── 结果状态 ──
  const result = ref<HexagramResult | null>(null)

  // ── 历史记录（本地存储）──
  const history = ref<HistoryItem[]>([])

  // 爻位中文标签
  const yaoLabels = computed(() =>
    params.value.map((p, idx) => {
      const positions = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
      const types: Record<YaoParam, string> = { 1: '少阳', 2: '少阴', 3: '老阳', 4: '老阴' }
      return `${positions[idx]}: ${types[p]}`
    }),
  )

  // 爻符号（阳 ⚊ / 阴 ⚋）
  const yaoNames = computed(() =>
    params.value.map((p) => (p === 1 || p === 3 ? '⚊' : '⚋')),
  )

  // ── 历史持久化 ──
  function loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) history.value = JSON.parse(stored)
    } catch (err) {
      console.error('加载历史记录失败:', err)
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch (err) {
      console.error('保存历史记录失败:', err)
    }
  }

  function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
    history.value.unshift({
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    })
    if (history.value.length > HISTORY_MAX) {
      history.value = history.value.slice(0, HISTORY_MAX)
    }
    saveHistory()
  }

  function removeHistory(id: string) {
    history.value = history.value.filter((item) => item.id !== id)
    saveHistory()
  }

  function clearHistory() {
    history.value = []
    saveHistory()
  }

  function restoreFromHistory(id: string) {
    const item = history.value.find((h) => h.id === id)
    if (item) {
      params.value = [...item.params]
      date.value = item.date
      gender.value = item.gender ?? '男'
      title.value = item.title ?? ''
      result.value = item.result
    }
  }

  // ── 排盘（本地同步计算）──
  function reset() {
    params.value = [2, 2, 2, 2, 2, 2]
    date.value = ''
    gender.value = '男'
    title.value = ''
    guaci.value = false
    result.value = null
  }

  function randomize() {
    params.value = Array.from(
      { length: 6 },
      () => (Math.floor(Math.random() * 4) + 1) as YaoParam,
    )
  }

  /** 执行排盘，返回结果（异常由调用方处理）。直接调 @najia/core 本地同步计算。 */
  function performPaipan(): HexagramResult {
    const res = compile({
      params: params.value,
      date: date.value || undefined,
      gender: gender.value,
      title: title.value || undefined,
      guaci: guaci.value,
    }) as HexagramResult
    result.value = res
    addHistory({
      params: [...params.value],
      date: date.value,
      gender: gender.value,
      title: title.value,
      result: res,
    })
    return res
  }

  loadHistory()

  return {
    params,
    date,
    gender,
    title,
    guaci,
    result,
    history,
    yaoLabels,
    yaoNames,
    reset,
    randomize,
    performPaipan,
    addHistory,
    removeHistory,
    clearHistory,
    restoreFromHistory,
  }
})
