<template>
  <n-modal
    v-model:show="showModal"
    class="interpret-dialog"
    preset="card"
    title="AI 智能解读"
    :style="{ maxWidth: '800px' }"
  >
    <template #header>
      <div class="dialog-header">AI 智能解读 - {{ hexagramResult?.name }}</div>
    </template>

    <div v-if="hexagramResult" class="interpret-content">
      <!-- 问题输入 -->
      <n-form-item label="占问问题">
        <n-input
          v-model:value="question"
          type="textarea"
          :rows="3"
          placeholder="请详细描述您想问的问题，例如：问工作变动、问感情发展、问健康状况等..."
        />
      </n-form-item>

      <!-- 错误提示 -->
      <n-alert v-if="error" type="error" :title="error" style="margin-bottom: 1rem" />

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
          <div class="ai-interpretation">{{ interpretResult.ai_interpretation }}</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <n-spin size="large" />
        <p class="loading-text">AI 正在思考中...</p>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">关闭</n-button>
        <n-button
          type="primary"
          :loading="loading"
          :disabled="!question.trim() || loading"
          @click="handleInterpret"
        >
          开始解读
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { markYongShen, calcYingQi } from '@najia/core'
import { interpret } from '@/api/interpret'
import type { HexagramResult, InterpretResponse } from '@/types'

const props = defineProps<{
  show: boolean
  hexagramResult: HexagramResult | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const question = ref('')
const interpretResult = ref<InterpretResponse | null>(null)
const loading = ref(false)
const error = ref('')

// 调真实 AI 解读 API（替代旧版的假模拟数据）
async function handleInterpret() {
  const r = props.hexagramResult
  if (!r || !question.value.trim()) return

  loading.value = true
  error.value = ''
  interpretResult.value = null
  try {
    // 先算一次用神，供 yongshen 与 ying_qi 共用（避免重复计算）
    const ys = markYongShen(r, question.value)
    const yongKong = ys.primary_pos > 0 ? (r.xun_kong?.[ys.primary_pos - 1] ?? false) : false
    const yingQi = ys.primary_zhi ? calcYingQi(ys.primary_zhi, yongKong) : null
    interpretResult.value = await interpret({
      hexagram_data: {
        name: r.name,
        gong: r.gong,
        mark: r.mark,
        shiy: r.shiy,
        qin6: r.qin6,
        qinx: r.qinx,
        god6: r.god6,
        yue_ling: r.yue_ling ?? undefined,
        yue_zhi: r.yue_zhi ?? undefined,
        ri_chen: r.ri_chen ?? undefined,
        // 旬空/月破：逐爻布尔，core 已算好，避免 AI 自行推旬空出错
        xun_kong: r.xun_kong ?? undefined,
        yue_po: r.yue_po ?? undefined,
        dong: r.dong,
        bian_name: r.bian?.name,
        hide_name: r.hide?.name,
        // 变卦/伏神逐爻：供 AI 判动变与飞伏关系，避免瞎编变爻干支
        bian_qin6: r.bian?.qin6,
        bian_qinx: r.bian?.qinx,
        hide_qin6: r.hide?.qin6,
        hide_qinx: r.hide?.qinx,
        hide_seat: r.hide?.seat,
        // 卦爻动变关系（core 已算好）+ 用神标记（按问题推断）
        yao_relation: r.yao_relation,
        gua_shen: r.gua_shen,
        day_dynamics: r.day_dynamics,
        ying_qi: yingQi,
        yongshen: ys,
      },
      question: question.value,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'AI 解读失败'
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  showModal.value = false
  question.value = ''
  interpretResult.value = null
  error.value = ''
}
</script>

<style scoped>
.dialog-header {
  font-size: 1.125rem;
  font-weight: 500;
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
