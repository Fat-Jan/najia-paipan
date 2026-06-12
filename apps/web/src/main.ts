import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// naive-ui 组件/composable 由 unplugin 按需自动引入（见 vite.config.ts），不再全量 app.use(naive)
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
