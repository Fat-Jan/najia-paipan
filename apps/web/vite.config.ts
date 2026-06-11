import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    // 自动导入 naive-ui 的 composable（useMessage / useDialog 等）
    AutoImport({
      imports: [
        {
          'naive-ui': ['useMessage', 'useDialog', 'useNotification', 'useLoadingBar'],
        },
      ],
    }),
    // 按需引入 naive-ui 组件（仅打包用到的，替代全量 import）
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 仅 AI 解读走后端薄代理；排盘已在前端本地算（@najia/core）
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // naive-ui 作为独立 vendor chunk 体积本就偏大（已按需引入），调高阈值消除噪音警告
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // 把大依赖拆成独立 vendor chunk：可长期缓存，不随业务代码重新下载
        manualChunks: {
          'naive-ui': ['naive-ui'],
          najia: ['@najia/core'],
        },
      },
    },
  },
})
