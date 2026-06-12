<template>
  <div class="result-section">
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

      <!-- 传统六爻自上而下：上爻在顶（index 5），初爻在底（index 0） -->
      <div class="yao-grid">
        <div
          v-for="index in displayOrder"
          :key="index"
          class="yao-item"
          :class="{
            dong: result.dong.includes(index),
            shi: result.shiy[0] === index + 1,
            ying: result.shiy[1] === index + 1,
          }"
        >
          <div class="yao-position">{{ positionLabels[index] }}</div>
          <div class="yao-symbol">{{ yaoNames[index] }}</div>
          <div class="yao-detail">{{ result.qin6[index] }} {{ result.qinx[index] }}</div>
          <div class="yao-shen">{{ result.god6[index] }}</div>
          <div class="yao-status">
            <span v-if="result.shiy[0] === index + 1" class="shi-label">世</span>
            <span v-if="result.shiy[1] === index + 1" class="ying-label">应</span>
            <span v-if="result.dong.includes(index)" class="dong-label">动</span>
          </div>
        </div>
      </div>

      <div class="time-info">
        <div class="time-item"><strong>月建:</strong> {{ result.yue_zhi ?? '—' }}</div>
        <div class="time-item"><strong>日辰:</strong> {{ result.ri_chen ?? '—' }}</div>
        <div class="time-item"><strong>旬空:</strong> {{ result.lunar.xkong }}</div>
      </div>

      <div v-if="result.yue_ling" class="yueling-info">
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

    <div v-if="result.bian" class="bian-info">
      <h5 class="bian-title">变卦：{{ result.bian.name }}</h5>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HexagramResult } from '@/types';

const props = defineProps<{ result: HexagramResult }>();

const positionLabels = ['初', '二', '三', '四', '五', '上'];

// 显示顺序：上爻在顶（index 5 → 0），符合传统六爻自上而下排布
const displayOrder = [5, 4, 3, 2, 1, 0];

// 爻符号：阳 ⚊ / 阴 ⚋（按 params 原始索引，0=初爻）
const yaoNames = computed(() => props.result.params.map((p) => (p === 1 || p === 3 ? '⚊' : '⚋')));
</script>

<style scoped>
.result-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--text-color-1);
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

.shi-label,
.ying-label,
.dong-label {
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
  margin-bottom: 0.5rem;
}

.yueling-status {
  margin: 0 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-旺 {
  background: #fee;
  color: #c33;
}
.status-相 {
  background: #efe;
  color: #3c3;
}
.status-休 {
  background: #eef;
  color: #33c;
}
.status-囚 {
  background: #ffe;
  color: #cc3;
}
.status-死 {
  background: #eee;
  color: #999;
}

.bian-info {
  text-align: center;
  margin-top: 1rem;
}

.bian-title {
  font-size: 1.125rem;
  color: var(--text-color-2);
}
</style>
