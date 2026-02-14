<template>
  <div class="paipan-container">
    <div class="paipan-card">
      <h2 class="card-title">六爻排盘</h2>
      
      <!-- 参数设置区 -->
      <div class="settings-section">
        <div class="params-input">
          <h3 class="section-title">爻位参数</h3>
          <div class="params-grid">
            <div 
              v-for="(yao, index) in yaoLabels" 
              :key="index" 
              class="param-item"
              :class="{ 'active': params[index] === 3 || params[index] === 4 }"
            >
              <div class="param-label">{{ yao }}</div>
              <n-select
                v-model:value="params[index]"
                :options="yaoOptions"
                size="large"
                class="param-select"
              />
            </div>
          </div>
        </div>

        <div class="basic-settings">
          <n-form :model="formModel" label-placement="top">
            <n-grid :cols="24" :x-gap="16">
              <n-gi :span="12">
                <n-form-item label="日期时间">
                  <n-date-picker
                    v-model:formatted-value="formModel.date"
                    type="datetime"
                    placeholder="选择日期时间"
                    clearable
                  />
                </n-form-item>
              </n-gi>
              <n-gi :span="12">
                <n-form-item label="性别">
                  <n-radio-group v-model:value="formModel.gender">
                    <n-space>
                      <n-radio value="男">男</n-radio>
                      <n-radio value="女">女</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
              </n-gi>
              <n-gi :span="24">
                <n-form-item label="占事标题">
                  <n-input
                    v-model:value="formModel.title"
                    placeholder="请输入占事标题（可选）"
                  />
                </n-form-item>
              </n-gi>
              <n-gi :span="24">
                <n-form-item>
                  <n-checkbox v-model:value="formModel.guaci">包含卦辞</n-checkbox>
                </n-form-item>
              </n-gi>
            </n-grid>
          </n-form>
        </div>
      </div>

      <!-- 按钮操作区 -->
      <div class="action-buttons">
        <n-space>
          <n-button @click="handleReset">重置</n-button>
          <n-button @click="handleRandom">随机</n-button>
          <n-button @click="handleShake" :loading="shaking">
            {{ shaking ? '摇卦中...' : '摇卦' }}
          </n-button>
          <n-button type="primary" @click="handlePaipan" :loading="paipanStore.loading">
            起卦
          </n-button>
          <n-button type="info" @click="handleHistory">历史</n-button>
          <n-button type="success" @click="handleShare" :disabled="!result">
            分享
          </n-button>
        </n-space>
      </div>

      <!-- 结果展示区 -->
      <div v-if="result" class="result-section">
        <h3 class="section-title">排盘结果</h3>
        
        <div class="hexagram-info">
          <div class="hexagram-header">
            <h4 class="hexagram-name">{{ result.name }}</h4>
            <div class="hexagram-meta">
              <span class="gong">{{ result.gong }}宫</span>
              <span class="mark">{{ result.mark }}</span>
              <span class="type">{{ result.hexagram_type }}</span>
            </div>
          </div>

          <div class="yao-grid">
            <div 
              v-for="(yao, index) in yaoNames" 
              :key="index"
              class="yao-item"
              :class="{ 
                'dong': result.dong.includes(index),
                'shi': result.shiy[0] === index,
                'ying': result.shiy[1] === index
              }"
            >
              <div class="yao-position">{{ ['上', '五', '四', '三', '二', '初'][index] }}</div>
              <div class="yao-symbol">{{ yao }}</div>
              <div class="yao-detail">{{ result.qin6[index] }} {{ result.qinx[index] }}</div>
              <div class="yao-shen">{{ result.god6[index] }}</div>
              <div class="yao-status">
                <span v-if="result.shiy[0] === index" class="shi-label">世</span>
                <span v-if="result.shiy[1] === index" class="ying-label">应</span>
                <span v-if="result.dong.includes(index)" class="dong-label">动</span>
              </div>
            </div>
          </div>

          <div class="time-info">
            <div class="time-item">
              <strong>月建:</strong> {{ result.yue_zhi }}
            </div>
            <div class="time-item">
              <strong>日辰:</strong> {{ result.ri_chen }}
            </div>
            <div class="time-item">
              <strong>旬空:</strong> {{ result.lunar.xkong }}
            </div>
          </div>

          <div class="yueling-info">
            <strong>月令旺衰:</strong>
            <span 
              v-for="(status, index) in result.yue_ling" 
              :key="index"
              class="yueling-status"
              :class="`status-${status}`"
            >
              {{ status }}
            </span>
          </div>
        </div>

        <!-- 变卦信息 -->
        <div v-if="result.bian" class="bian-info">
          <h5 class="bian-title">变卦：{{ result.bian.name }}</h5>
        </div>

        <!-- AI 解读按钮 -->
        <div class="interpret-section">
          <n-button 
            type="warning" 
            @click="showInterpretDialog = true"
            :loading="interpreting"
          >
            智能解读
          </n-button>
        </div>
      </div>
    </div>

    <!-- AI 解读弹窗 -->
    <InterpretDialog
      v-model:show="showInterpretDialog"
      :hexagram-result="result"
      :loading="interpreting"
      @interpret="handleInterpret"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePaipanStore } from '@/stores/paipan'
import { storeToRefs } from 'pinia'
import { useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import InterpretDialog from './InterpretDialog.vue'
import type { YaoParam } from '@/types'

const message = useMessage()
const paipanStore = usePaipanStore()
const { params, date, gender, title, guaci, result, interpreting, yaoLabels, yaoNames } = storeToRefs(paipanStore)

// 摇卦动画状态
const shaking = ref(false)

// AI 解读弹窗
const showInterpretDialog = ref(false)

// 表单模型
const formModel = computed({
  get: () => ({
    date: date.value,
    gender: gender.value,
    title: title.value,
    guaci: guaci.value,
  }),
  set: (value) => {
    date.value = value.date
    gender.value = value.gender
    title.value = value.title
    guaci.value = value.guaci
  },
})

// 爻位选项
const yaoOptions = [
  { label: '少阳 (1)', value: 1 },
  { label: '少阴 (2)', value: 2 },
  { label: '老阳 (3) - 动', value: 3 },
  { label: '老阴 (4) - 动', value: 4 },
]

// 重置
const handleReset = () => {
  paipanStore.reset()
  message.success('已重置')
}

// 随机
const handleRandom = () => {
  paipanStore.randomize()
  message.success('已随机')
}

// 摇卦动画
const handleShake = async () => {
  shaking.value = true
  
  // 模拟摇卦动画
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const randomValue = (Math.floor(Math.random() * 4) + 1) as YaoParam
    params.value[i] = randomValue
  }
  
  shaking.value = false
  message.success('摇卦完成')
}

// 起卦
const handlePaipan = async () => {
  try {
    await paipanStore.performPaipan()
    message.success('排盘成功')
  } catch (error) {
    message.error('排盘失败')
  }
}

// 历史记录
const handleHistory = () => {
  window.location.href = '/history'
}

// 分享
const handleShare = async () => {
  if (!result.value) return
  
  try {
    const element = document.querySelector('.result-section')
    if (!element) return
    
    const canvas = await html2canvas(element as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 2,
    })
    
    const link = document.createElement('a')
    link.download = `六爻排盘_${result.value.name}_${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    
    message.success('分享图片已生成')
  } catch (error) {
    message.error('生成分享图片失败')
  }
}

// AI 解读
const handleInterpret = async (question: string, model: 'deepseek' | 'glm') => {
  try {
    await paipanStore.performInterpret(question, model)
    message.success('AI 解读完成')
  } catch (error) {
    message.error('AI 解读失败')
  }
}
</script>

<style scoped>
.paipan-container {
  max-width: 1000px;
  margin: 0 auto;
}

.paipan-card {
  background: var(--bg-color-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--text-color-1);
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.param-item {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: all 0.2s;
}

.param-item.active {
  border-color: var(--primary-color);
  background: rgba(24, 160, 90, 0.05);
}

.param-label {
  font-size: 0.875rem;
  color: var(--text-color-2);
  margin-bottom: 0.5rem;
}

.action-buttons {
  margin: 2rem 0;
  text-align: center;
}

.result-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.hexagram-info {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.hexagram-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.hexagram-name {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color-1);
  margin-bottom: 0.5rem;
}

.hexagram-meta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  color: var(--text-color-2);
}

.yao-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.yao-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  position: relative;
}

.yao-item.dong {
  border-color: var(--warning-color);
  background: rgba(240, 160, 32, 0.05);
}

.yao-item.shi {
  background: rgba(24, 160, 90, 0.1);
}

.yao-item.ying {
  background: rgba(32, 128, 240, 0.1);
}

.yao-position {
  width: 3rem;
  font-weight: 500;
  color: var(--text-color-2);
}

.yao-symbol {
  width: 2rem;
  text-align: center;
  font-size: 1.25rem;
}

.yao-detail {
  flex: 1;
  margin-left: 1rem;
  color: var(--text-color-1);
}

.yao-shen {
  margin: 0 1rem;
  color: var(--text-color-3);
  font-size: 0.875rem;
}

.yao-status {
  display: flex;
  gap: 0.25rem;
}

.shi-label, .ying-label, .dong-label {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.shi-label {
  background: var(--primary-color);
  color: white;
}

.ying-label {
  background: var(--info-color);
  color: white;
}

.dong-label {
  background: var(--warning-color);
  color: white;
}

.time-info {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.time-item {
  color: var(--text-color-2);
}

.yueling-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.yueling-status {
  margin: 0 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-旺 { background: #fee; color: #c33; }
.status-相 { background: #efe; color: #3c3; }
.status-休 { background: #eef; color: #33c; }
.status-囚 { background: #ffe; color: #cc3; }
.status-死 { background: #eee; color: #999; }

.interpret-section {
  margin-top: 1.5rem;
  text-align: center;
}

@media (max-width: 768px) {
  .params-grid {
    grid-template-columns: repeat(1, 1fr);
  }
  
  .time-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .paipan-card {
    padding: 1rem;
  }
}
</style>