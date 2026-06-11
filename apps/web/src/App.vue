<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div id="app">
          <header class="app-header">
            <div class="container">
              <div class="header-content flex-between">
                <h1 class="app-title">六爻排盘系统</h1>
                <nav class="app-nav">
                  <router-link to="/" class="nav-link">排盘</router-link>
                  <router-link to="/history" class="nav-link">历史</router-link>
                </nav>
              </div>
            </div>
          </header>

          <main class="app-main">
            <div class="container">
              <router-view />
            </div>
          </main>

          <footer class="app-footer">
            <div class="container">
              <p class="footer-text">六爻排盘系统 v2 - Vue 3 + @najia/core</p>
            </div>
          </footer>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { GlobalThemeOverrides } from 'naive-ui'

const theme = ref<'light' | 'dark'>('light')

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#40a96c',
    primaryColorPressed: '#0d7a46',
    primaryColorSuppl: '#40a96c',
  },
}
</script>

<style scoped>
.app-header {
  background: var(--bg-color-card);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-1);
}

.app-nav {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-color-2);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  transition: all 0.2s;
}

.nav-link:hover {
  background: var(--bg-color-hover);
  color: var(--text-color-1);
}

.nav-link.router-link-active {
  background: var(--primary-color);
  color: white;
}

.app-main {
  min-height: calc(100vh - 140px);
  padding: 2rem 0;
}

.app-footer {
  background: var(--bg-color-card);
  border-top: 1px solid var(--border-color);
  padding: 1rem 0;
  text-align: center;
}

.footer-text {
  color: var(--text-color-3);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .app-nav {
    gap: 0.5rem;
  }
}
</style>
