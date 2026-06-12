import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    meta: { title: '六爻排盘系统' },
    component: () => import('@/views/PaipanView.vue'),
  },
  {
    path: '/history',
    name: 'History',
    meta: { title: '历史记录 - 六爻排盘' },
    component: () => import('@/views/HistoryView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  if (to.meta.title) document.title = to.meta.title as string;
  next();
});

export default router;
