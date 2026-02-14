import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'

// 全局样式
import './style.css'

const app = createApp(App)

// 安装插件
app.use(createPinia())
app.use(router)
app.use(naive)

app.mount('#app')