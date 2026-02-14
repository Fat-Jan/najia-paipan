<template>
  <n-modal
    v-model:show="showModal"
    class="interpret-dialog"
    preset="dialog"
    title="AI 智能解读"
    :style="{ maxWidth: '800px' }"
  >
    <template #header>
      <div class="dialog-header">
        <span>AI 智能解读 - {{ hexagramResult?.name }}</span>
      </div>
    </template>

    <div class="interpret-content" v-if="hexagramResult">
      <!-- 问题输入 -->
      <div class="question-section">
        <n-form-item label="占问问题">
          <n-input
            v-model:value="question"
            type="textarea"
            :rows="3"
            placeholder="请详细描述您想问的问题，例如：问工作变动、问感情发展、问健康状况等..."
          />
        </n-form-item>
      </div>

      <!-- 模型选择 -->
      <div class="model-section">
        <n-form-item label="AI 模型">
          <n-radio-group v-model:value="selectedModel">
            <n-space>
              <n-radio value="deepseek">DeepSeek-V3.2</n-radio>
              <n-radio value="glm">GLM-4.7</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </div>

      <!-- 解读结果 -->
      <div v-if="interpretResult" class="result-section">
        <div class="result-card">
          <h4 class="result-title">卦象分析</h4>
          
          <div class="jixiong-info">
            <div class="jixiong-label">吉凶判断：</div>
            <div class="jixiong-value" :class="`jixiong-${interpretResult.jixiong}`">
              {{ interpretResult.jixiong }}
            </div>
          </div>

          <div class="rule-analysis">
            <div class="analysis-item">
              <strong>五行平衡：</strong>
              <span>{{ interpretResult.rule_analysis.wuxing_balance }}</span>
            </div>
            <div class="analysis-item">
              <strong>世应关系：</strong>
              <span>{{ interpretResult.rule_analysis.shiy_relation }}</span>
            </div>
            <div class="analysis-item">
              <strong>月令旺衰：</strong>
              <span>{{ interpretResult.rule_analysis.yueling_status }}</span>
            </div>
            <div class="analysis-item">
              <strong>动爻分析：</strong>
              <span>{{ interpretResult.rule_analysis.dongyao_analysis }}</span>
            </div>
          </div>

          <n-divider />

          <h4 class="result-title">AI 解读</h4>
          <div class="ai-interpretation">
            {{ interpretResult.ai_interpretation }}
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <n-spin size="large" />
        <p class="loading-text">AI 正在思考中...</p>
      </div>
    </div>

    <template #action>
      <n-space>
        <n-button @click="handleCancel">关闭</n-button>
        <n-button 
          type="primary" 
          @click="handleInterpret"
          :loading="loading"
          :disabled="!question.trim()"
        >
          开始解读
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HexagramResult, InterpretResponse } from '@/types'

const props = defineProps<{
  show: boolean
  hexagramResult: HexagramResult | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'interpret', question: string, model: 'deepseek' | 'glm'): void
}>()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const question = ref('')
const selectedModel = ref<'deepseek' | 'glm'>('deepseek')
const interpretResult = ref<InterpretResponse | null>(null)

// 处理解读
const handleInterpret = async () => {
  if (!question.value.trim()) {
    return
  }

  emit('interpret', question.value, selectedModel.value)

  // 在实际应用中，这里应该调用 API 获取解读结果
  // 为了演示，我们先模拟一个结果
  interpretResult.value = {
    hexagram_name: props.hexagramResult?.name || '',
    jixiong: '中吉',
    rule_analysis: {
      wuxing_balance: '五行分布均衡，土元素稍旺',
      shiy_relation: '世应相生，主吉',
      yueling_status: '整体月令偏旺，卦象有力',
      dongyao_analysis: '有 2 个动爻，主变化',
      jixiong: '中吉',
    },
    ai_interpretation: `小友你好，且听老朽为你细细道来。

您所占得的是【${props.hexagramResult?.name}】卦，这是一个中上之卦。从卦象来看，世爻得位，应爻相生，说明您所问之事有贵人相助，前景可期。

结合您问的"${question.value}"，老朽以为：
1. 当前形势稳定，不宜急躁
2. 需要等待时机，时机成熟自然水到渠成
3. 要注意与人和谐相处，多听取他人意见

总体来说，此卦提示您保持耐心，顺势而为，事情会有好的发展。`,
  }
}

// 处理取消
const handleCancel = () => {
  showModal.value = false
  // 重置状态
  question.value = ''
  interpretResult.value = null
}
</script>

<style scoped>
.interpret-dialog {
  max-width: 800px;
}

.dialog-header {
  font-size: 1.125rem;
  font-weight: 500;
}

.question-section {
  margin-bottom: 1.5rem;
}

.model-section {
  margin-bottom: 2rem;
}

.result-section {
  margin-top: 1.5rem;
}

.result-card {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.result-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--text-color-1);
}

.jixiong-info {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.jixiong-label {
  font-weight: 500;
  margin-right: 1rem;
}

.jixiong-value {
  padding: 0.25rem 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.jixiong-大吉 { background: #efe; color: #3c3; }
.jixiong-中吉 { background: #ffe; color: #cc3; }
.jixiong-小吉 { background: #eef; color: #33c; }
.jixiong-平 { background: #eee; color: #666; }
.jixiong-小凶 { background: #fee; color: #c33; }
.jixiong-大凶 { background: #fcc; color: #c00; }

.rule-analysis {
  margin-bottom: 1.5rem;
}

.analysis-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.ai-interpretation {
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--text-color-1);
}

.loading-section {
  text-align: center;
  padding: 2rem;
}

.loading-text {
  margin-top: 1rem;
  color: var(--text-color-2);
}
</style>