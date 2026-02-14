<template>
  <div class="history-container">
    <div class="history-card">
      <h2 class="card-title">历史记录</h2>
      
      <div class="history-actions">
        <n-space>
          <n-button type="primary" @click="handleClear">清空历史</n-button>
          <n-button @click="handleBack">返回排盘</n-button>
        </n-space>
      </div>

      <div v-if="history.length === 0" class="empty-state">
        <n-empty description="暂无历史记录" />
      </div>

      <div v-else class="history-list">
        <div 
          v-for="item in history" 
          :key="item.id"
          class="history-item"
        >
          <div class="history-header">
            <div class="history-info">
              <h4 class="gua-name">{{ item.result.name }}</h4>
              <div class="gua-meta">
                <span class="gong">{{ item.result.gong }}宫</span>
                <span class="mark">{{ item.result.mark }}</span>
                <span class="time">{{ formatTime(item.createdAt) }}</span>
              </div>
            </div>
            <div class="history-actions-item">
              <n-button 
                size="small" 
                type="primary" 
                @click="handleRestore(item.id)"
                class="restore-btn"
              >
                恢复
              </n-button>
              <n-button 
                size="small" 
                @click="handleDelete(item.id)"
                class="delete-btn"
              >
                删除
              </n-button>
            </div>
          </div>

          <div class="history-details">
            <div class="detail-item">
              <strong>占问：</strong>
              <span>{{ item.title || '无标题' }}</span>
            </div>
            <div class="detail-item">
              <strong>性别：</strong>
              <span>{{ item.gender }}</span>
            </div>
            <div class="detail-item">
              <strong>时间：</strong>
              <span>{{ item.date || '当前时间' }}</span>
            </div>
            <div class="detail-item">
              <strong>动爻：</strong>
              <span>{{ item.result.dong.length > 0 ? item.result.dong.join('、') : '无' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePaipanStore } from '@/stores/paipan'
import { storeToRefs } from 'pinia'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'

const message = useMessage()
const router = useRouter()
const paipanStore = usePaipanStore()
const { history } = storeToRefs(paipanStore)

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' 分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' 小时前'
  } else {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
}

// 恢复历史记录
const handleRestore = (id: string) => {
  paipanStore.restoreFromHistory(id)
  message.success('已恢复到排盘区')
  router.push('/')
}

// 删除历史记录
const handleDelete = (id: string) => {
  paipanStore.removeHistory(id)
  message.success('已删除')
}

// 清空历史记录
const handleClear = () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    paipanStore.clearHistory()
    message.success('已清空')
  }
}

// 返回排盘
const handleBack = () => {
  router.push('/')
}
</script>

<style scoped>
.history-container {
  max-width: 1000px;
  margin: 0 auto;
}

.history-card {
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

.history-actions {
  margin-bottom: 1.5rem;
  text-align: right;
}

.empty-state {
  padding: 3rem;
  text-align: center;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  transition: all 0.2s;
}

.history-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-info {
  flex: 1;
}

.gua-name {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-color-1);
  margin-bottom: 0.5rem;
}

.gua-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-color-2);
  font-size: 0.875rem;
}

.history-actions-item {
  display: flex;
  gap: 0.5rem;
}

.history-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.detail-item {
  font-size: 0.875rem;
  color: var(--text-color-2);
}

.detail-item strong {
  color: var(--text-color-1);
  margin-right: 0.5rem;
}

.restore-btn {
  background: var(--primary-color);
  color: white;
}

.delete-btn {
  background: var(--error-color);
  color: white;
}

@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .history-details {
    grid-template-columns: repeat(1, 1fr);
  }

  .history-card {
    padding: 1rem;
  }
}
</style>