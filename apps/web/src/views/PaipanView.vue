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
              v-for="(label, index) in yaoLabels"
              :key="index"
              class="param-item"
              :class="{ active: params[index] === 3 || params[index] === 4 }"
            >
              <div class="param-label">{{ label }}</div>
              <n-select v-model:value="params[index]" :options="yaoOptions" size="large" />
            </div>
          </div>
        </div>

        <div class="basic-settings">
          <n-form label-placement="top">
            <n-grid :cols="24" :x-gap="16">
              <n-gi :span="12">
                <n-form-item label="日期时间">
                  <n-date-picker
                    v-model:formatted-value="date"
                    value-format="yyyy-MM-dd HH:mm"
                    type="datetime"
                    placeholder="选择日期时间（留空用当前）"
                    clearable
                  />
                </n-form-item>
              </n-gi>
              <n-gi :span="12">
                <n-form-item label="性别">
                  <n-radio-group v-model:value="gender">
                    <n-space>
                      <n-radio value="男">男</n-radio>
                      <n-radio value="女">女</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
              </n-gi>
              <n-gi :span="24">
                <n-form-item label="占事标题">
                  <n-input v-model:value="title" placeholder="请输入占事标题（可选）" />
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
          <n-button :loading="shaking" @click="handleShake">
            {{ shaking ? '摇卦中...' : '摇卦' }}
          </n-button>
          <n-button type="primary" @click="handlePaipan">起卦</n-button>
          <n-button type="info" @click="router.push('/history')">历史</n-button>
          <n-button type="success" :disabled="!result" @click="handleShare">分享</n-button>
        </n-space>
      </div>

      <!-- 结果展示区 -->
      <template v-if="result">
        <HexagramDisplay :result="result" />
        <div class="interpret-section">
          <n-button type="warning" @click="showInterpret = true">智能解读</n-button>
        </div>
      </template>
    </div>

    <InterpretDialog v-model:show="showInterpret" :hexagram-result="result" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import { usePaipanStore } from '@/stores/paipan'
import HexagramDisplay from '@/components/HexagramDisplay.vue'
import InterpretDialog from '@/components/InterpretDialog.vue'
import type { YaoParam } from '@/types'

const message = useMessage()
const router = useRouter()
const store = usePaipanStore()
const { params, date, gender, title, result, yaoLabels } = storeToRefs(store)

const shaking = ref(false)
const showInterpret = ref(false)

const yaoOptions = [
  { label: '少阳 (1)', value: 1 },
  { label: '少阴 (2)', value: 2 },
  { label: '老阳 (3) - 动', value: 3 },
  { label: '老阴 (4) - 动', value: 4 },
]

function handleReset() {
  store.reset()
  message.success('已重置')
}

function handleRandom() {
  store.randomize()
  message.success('已随机')
}

// 摇卦动画：逐爻模拟三枚硬币
async function handleShake() {
  shaking.value = true
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 300))
    params.value[i] = (Math.floor(Math.random() * 4) + 1) as YaoParam
  }
  shaking.value = false
  message.success('摇卦完成')
}

// 起卦：本地同步计算（@najia/core），异常在此层提示
function handlePaipan() {
  try {
    store.performPaipan()
    message.success('排盘成功')
  } catch (err) {
    message.error(err instanceof Error ? err.message : '排盘失败')
  }
}

async function handleShare() {
  if (!result.value) return
  try {
    const el = document.querySelector('.result-section')
    if (!el) return
    const canvas = await html2canvas(el as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 2,
    })
    const link = document.createElement('a')
    link.download = `六爻排盘_${result.value.name}_${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    message.success('分享图片已生成')
  } catch {
    message.error('生成分享图片失败')
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

.interpret-section {
  margin-top: 1.5rem;
  text-align: center;
}

@media (max-width: 768px) {
  .params-grid {
    grid-template-columns: repeat(1, 1fr);
  }
  .paipan-card {
    padding: 1rem;
  }
}
</style>
