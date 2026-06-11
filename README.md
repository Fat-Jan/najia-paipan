# 六爻排盘系统

六爻纳甲排盘 Web 应用。排盘算法在前端本地运行，后端仅作 AI 解读的薄代理。

- **架构**: TypeScript 全栈 pnpm monorepo
- **核心**: `@najia/core` 纯算法库（前后端共用，零运行时依赖除 tyme4ts）
- **前端**: Vue 3 + Naive UI + Pinia + Vite
- **后端**: Hono 薄代理（藏 AI key + 规则引擎 + AI 解读）

---

## 项目结构

```
najia-liuyao/                  # pnpm monorepo 根
├── packages/
│   └── core/                  # @najia/core — 排盘算法 + 类型
│       ├── src/
│       │   ├── const.ts       # 64卦/纳甲/六亲矩阵/五行表
│       │   ├── hexagram.ts    # 世应/卦宫/纳甲/六亲/卦型/变卦/伏神
│       │   ├── time-analysis.ts # 月令旺衰/月破/旬空（tyme4ts）
│       │   ├── compile.ts     # 排盘编排
│       │   ├── types.ts       # 共享类型
│       │   └── index.ts
│       └── test/              # 对拍 + 独立正确性测试（433 用例）
├── apps/
│   ├── web/                   # Vue 3 前端
│   │   └── src/
│   │       ├── views/         # PaipanView / HistoryView（页面）
│   │       ├── components/    # HexagramDisplay / InterpretDialog（展示）
│   │       ├── stores/        # Pinia setup store
│   │       ├── api/           # interpret（唯一走后端的调用）
│   │       ├── router/ types/
│   │       └── main.ts
│   └── server/                # Hono 后端
│       └── src/
│           ├── index.ts       # 路由 + CORS
│           ├── config.ts      # 环境变量
│           ├── rule-engine.ts # 规则引擎（五行/世应/月令/动爻 → 吉凶）
│           ├── ai-client.ts   # NVIDIA NIM 调用 + prompt
│           └── types.ts
├── legacy/                    # Python 原版（保留作算法对拍基准，勿删）
└── docs/                      # 文档 + docs/archive 历史归档
```

---

## 技术栈

| 层 | 技术 | 用途 |
|----|------|------|
| 核心 | TypeScript, tyme4ts | 排盘算法、农历/干支计算 |
| 前端 | Vue 3.5, Naive UI, Pinia, Vue Router, Vite 6 | UI + 状态 + 路由 + 构建 |
| 后端 | Hono 4, @hono/node-server | AI 解读薄代理 |
| 测试 | Vitest | core 对拍 + 正确性测试 |

---

## 快速开始

```bash
# 安装依赖（在根目录）
pnpm install

# 构建 core（web/server 依赖其产物）
pnpm --filter @najia/core build

# 启动前端（http://localhost:5173）
pnpm dev:web

# 启动后端（http://localhost:8787，需要配 .env）
pnpm dev:server

# 全量构建
pnpm build

# 跑 core 测试
pnpm test
```

### 后端环境变量

后端 AI 解读需要 NVIDIA NIM key。复制 `.env.example` 为 `apps/server/.env` 并填入：

```
NVIDIA_API_KEY=你的key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_DEFAULT_MODEL=deepseek-ai/deepseek-v3.2
NVIDIA_GLM_MODEL=z-ai/glm-4.7
ALLOWED_ORIGINS=http://localhost:5173
```

未配置 key 时，解读接口降级为仅返回规则引擎分析，不会崩溃。

---

## 架构说明

**排盘在前端本地算**：`apps/web` 直接 `import { compile } from '@najia/core'`，无需后端往返，单次排盘 < 10ms。

**后端只做 AI 代理**：`apps/server` 仅处理 `/api/v1/interpret`——藏 NVIDIA key、跑规则引擎、调大模型。排盘逻辑完全不经过后端。

**算法可靠性**：`@najia/core` 有两层测试防线——对拍测试（与 legacy Python 实现逐字段一致）+ 独立正确性测试（验传统口诀/京房卦序，不依赖 Python）。

---

## 功能

- 六爻起卦（手动/随机/摇卦动画）
- 时间排盘（月建日辰、月令旺衰、月破、旬空、六神）
- 变卦、伏神计算
- AI 智能解读（规则引擎 + DeepSeek/GLM 大模型）
- 历史记录（本地存储最近 20 次）
- 分享图片（html2canvas）

---

## API

### `POST /api/v1/interpret` — AI 智能解读

```json
{
  "hexagram_data": {
    "name": "山地剥", "gong": "乾", "mark": "000001",
    "shiy": [5, 2, 5],
    "qin6": ["..."], "qinx": ["..."], "god6": ["..."],
    "yue_ling": ["旺", "相"], "yue_zhi": "寅", "ri_chen": "甲辰",
    "dong": [2, 4], "bian_name": "火地晋"
  },
  "question": "问工作变动",
  "model": "deepseek"
}
```

响应含 `jixiong`（吉凶）、`rule_analysis`（规则引擎四项分析）、`ai_interpretation`（AI 解读文本）。

### `GET /api/health` — 健康检查

---

## 许可证

MIT
