import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    meta: {
      title: '六爻排盘系统',
    },
    component: () => import('@/components/Paipan.vue'),
  },
  {
    path: '/history',
    name: 'History',
    meta: {
      title: '历史记录 - 六爻排盘',
    },
    component: () => import('@/components/HistoryView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  next()
})

export default router