# 六爻排盘系统 - 项目文档

## 项目概述

六爻排盘系统是一个完整的六爻卜卦 Web 应用，包含前端展示界面和后端 API 服务。

- **前端**: Vue 3 + Naive UI + TypeScript (najia-web)
- **后端**: Python FastAPI + Najia 核心库 (naijia-liubo)

---

## 项目结构

```
naijia-liubo/                 # 项目根目录
├── najia-web/                # 前端 Vue 项目
│   ├── src/
│   │   ├── api/             # API 调用层
│   │   │   └── najia.ts     # TypeScript API 封装
│   │   ├── components/      # Vue 组件
│   │   │   └── Paipan.vue   # 主排盘组件
│   │   ├── router/          # Vue Router
│   │   │   └── index.ts
│   │   ├── stores/          # Pinia 状态管理
│   │   │   └── paipan.ts
│   │   ├── types/           # TypeScript 类型定义
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   ├── package.json
│   ├── vite.config.js
│   └── tsconfig.json
│
├── najia/                   # 后端 Python 核心库
│   ├── najia/
│   │   ├── najia.py         # 核心排盘逻辑
│   │   ├── result.py        # 结果处理
│   │   ├── batch.py         # 批量处理
│   │   ├── time_analysis.py # 时间分析
│   │   ├── lunar_utils.py   # 农历工具
│   │   ├── const.py         # 常量定义
│   │   ├── config.py        # 配置
│   │   └── utils.py        # 工具函数
│   ├── tests/               # 单元测试
│   └── pyproject.toml
│
├── api.py                   # FastAPI 主入口
├── api_simple.py            # 简单版 API
└── README_API.md            # API 文档
```

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5+ | 框架 |
| Naive UI | 2.43+ | UI 组件库 |
| TypeScript | 5.9+ | 类型安全 |
| Pinia | 3.0+ | 状态管理 |
| Vue Router | 4.6+ | 路由 |
| Vite | 7.3+ | 构建工具 |
| ESLint/Prettier | 9.x/3.x | 代码规范 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.9+ | 运行时 |
| FastAPI | latest | Web 框架 |
| Pydantic | latest | 数据验证 |
| Uvicorn | latest | ASGI 服务器 |

---

## 功能特性

### 核心功能

1. **六爻起卦** - 根据六个爻位参数生成卦象
2. **时间排盘** - 支持指定日期时间进行排盘
3. **性别区分** - 区分男女使用不同起卦规则
4. **卦象解析** - 包含六亲、五行、六神、世应等信息
5. **伏神计算** - 自动计算伏神
6. **变卦显示** - 显示动爻变化后的变卦
7. **批量处理** - 支持批量排盘（最多10个）

### 前端特性

- 响应式设计（移动端适配）
- Naive UI 现代化组件
- TypeScript 完整类型支持
- Pinia 状态管理
- Loading 状态与错误提示

### 后端特性

- RESTful API 设计
- Pydantic 数据验证
- CORS 跨域支持
- 批量并发处理
- 完整的类型标注

---

## API 接口

### 1. 获取 API 信息

```http
GET /
```

### 2. 获取 64 卦列表

```http
GET /api/v1/gua/64
```

### 3. 单个排盘

```http
POST /api/v1/paipan
Content-Type: application/json

{
  "params": [1, 1, 1, 1, 1, 1],
  "date": "2024-01-01 12:00",
  "gender": "男",
  "title": "问事",
  "guaci": false
}
```

**参数说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| params | array | 是 | 6 个整数，1=少阳，2=少阴，3=老阳(动)，4=老阴(动) |
| date | string | 否 | 日期时间，格式 YYYY-MM-DD HH:MM |
| gender | string | 否 | 男/女 |
| title | string | 否 | 占事标题 |
| guaci | boolean | 否 | 是否包含卦辞 |

**响应**:

```json
{
  "name": "乾为天",
  "gong": "乾",
  "mark": "111111",
  "shiy": ["6", "3", 5],
  "qin6": ["父", "兄", "子", "财", "官", "父"],
  "qinx": ["戌", "申", "午", "辰", "寅", "子"],
  "god6": ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"],
  "hexagram_type": "六冲",
  "bian": null,
  "hide": null
}
```

### 4. 批量排盘

```http
POST /api/v1/paipan/batch
Content-Type: application/json

{
  "params_list": [[1,1,1,1,1,1], [2,2,2,2,2,2]],
  "max_workers": 4
}
```

---

## 快速开始

### 前端启动

```bash
cd najia-web

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint
npm run format
```

### 后端启动

```bash
# FastAPI 版本
pip install -r requirements-api.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# 或简单版本
python api_simple.py --port 8000
```

---

## 开发规范

### 前端

- 使用 TypeScript strict 模式
- ESLint + Prettier 代码规范
- 组件使用 `<script setup lang="ts">`
- 样式使用 scoped CSS + Naive UI

### 后端

- Pydantic 模型验证
- 完整的类型标注
- 单元测试覆盖核心逻辑

---

## 运行环境

| 环境 | 前端地址 | 后端地址 |
|------|----------|----------|
| 开发 | http://localhost:5173 | http://localhost:8000 |
| 生产 | (构建产物) | (需配置) |

### 环境变量

前端 (.env):

```
VITE_API_BASE_URL=/api  # 开发环境
VITE_API_BASE_URL=https://api.example.com  # 生产环境
```

---

## 相关文档

- [API 详细文档](./README_API.md)
- [Najia 核心库](./najia/README.md)
- [优化报告](./najia_optimization_summary.md)
