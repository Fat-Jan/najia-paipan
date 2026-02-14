import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { YaoParam, Gender, PaipanRequest, HexagramResult, HistoryItem, InterpretResponse } from '@/types'
import { paipan, interpret } from '@/api/najia'
import { useMessage } from 'naive-ui'

export const usePaipanStore = defineStore('paipan', () => {
  const message = useMessage()

  // 状态
  const params = ref<YaoParam[]>([2, 2, 2, 2, 2, 2]) // 默认阴爻
  const date = ref<string>('')
  const gender = ref<Gender>('男')
  const title = ref<string>('')
  const guaci = ref<boolean>(false)

  const loading = ref<boolean>(false)
  const result = ref<HexagramResult | null>(null)
  const interpretResult = ref<InterpretResponse | null>(null)
  const interpreting = ref<boolean>(false)

  // 历史记录（本地存储）
  const history = ref<HistoryItem[]>([])

  // 响应式标签（根据当前参数计算）
  const yaoLabels = computed(() => {
    return params.value.map((p, idx) => {
      const positions = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
      const types = {
        1: '少阳',
        2: '少阴',
        3: '老阳',
        4: '老阴',
      }
      return `${positions[idx]}: ${types[p]}`
    })
  })

  const yaoNames = computed(() => {
    return params.value.map(p => {
      const types = {
        1: '⚊',
        2: '⚋',
        3: '⚊',
        4: '⚋',
      }
      return types[p]
    })
  })

  // 加载历史记录
  function loadHistory() {
    try {
      const stored = localStorage.getItem('najia-history')
      if (stored) {
        history.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  }

  // 保存历史记录
  function saveHistory() {
    try {
      localStorage.setItem('najia-history', JSON.stringify(history.value))
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  // 添加历史记录
  function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
    const historyItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    history.value.unshift(historyItem)

    // 限制历史记录数量（最多20条）
    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20)
    }

    saveHistory()
  }

  // 删除历史记录
  function removeHistory(id: string) {
    history.value = history.value.filter(item => item.id !== id)
    saveHistory()
  }

  // 清空历史记录
  function clearHistory() {
    history.value = []
    saveHistory()
  }

  // 从历史记录恢复
  function restoreFromHistory(id: string) {
    const item = history.value.find(h => h.id === id)
    if (item) {
      params.value = item.params
      date.value = item.date
      gender.value = item.gender || '男'
      title.value = item.title || ''
      result.value = item.result
    }
  }

  // 重置参数
  function reset() {
    params.value = [2, 2, 2, 2, 2, 2]
    date.value = ''
    gender.value = '男'
    title.value = ''
    guaci.value = false
    result.value = null
    interpretResult.value = null
  }

  // 随机参数
  function randomize() {
    params.value = Array.from({ length: 6 }, () => (Math.floor(Math.random() * 4) + 1) as YaoParam)
  }

  // 执行排盘
  async function performPaipan() {
    loading.value = true
    try {
      const request: PaipanRequest = {
        params: params.value,
        date: date.value || undefined,
        gender: gender.value,
        title: title.value || undefined,
        guaci: guaci.value,
      }

      const res = await paipan(request)
      result.value = res

      // 添加到历史记录
      addHistory({
        params: params.value,
        date: date.value,
        gender: gender.value as Gender,
        title: title.value,
        result: res,
      })

      return res
    } catch (error) {
      message.error(error instanceof Error ? error.message : '排盘失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // AI 解读
  async function performInterpret(question: string, model: 'deepseek' | 'glm' = 'deepseek') {
    if (!result.value) {
      message.error('请先进行排盘')
      return
    }

    interpreting.value = true
    try {
      const request = {
        hexagram_data: {
          name: result.value.name,
          gong: result.value.gong,
          mark: result.value.mark,
          shiy: result.value.shiy,
          qin6: result.value.qin6,
          qinx: result.value.qinx,
          god6: result.value.god6,
          yue_ling: result.value.yue_ling,
          yue_zhi: result.value.yue_zhi,
          ri_chen: result.value.ri_chen,
          dong: result.value.dong,
          bian_name: result.value.bian?.name,
          hide_name: result.value.hide?.name,
        },
        question,
        model,
      }

      const res = await interpret(request)
      interpretResult.value = res

      return res
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'AI 解读失败')
      throw error
    } finally {
      interpreting.value = false
    }
  }

  // 初始化
  loadHistory()

  return {
    // 状态
    params,
    date,
    gender,
    title,
    guaci,
    loading,
    result,
    interpretResult,
    interpreting,
    history,
    yaoLabels,
    yaoNames,

    // 方法
    reset,
    randomize,
    performPaipan,
    performInterpret,
    addHistory,
    removeHistory,
    clearHistory,
    restoreFromHistory,
  }
})