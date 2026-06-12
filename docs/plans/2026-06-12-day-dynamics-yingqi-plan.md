# 暗动/日破 + 应期候选地支 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 给 `@najia/core` 补两项确定性断卦数据——暗动/日破（日辰对静爻的作用）与应期候选地支（用神逢值/冲/合/出空），并把散在三处的"地支相冲"判定收敛到单一数据源。

**架构：** 冲判定 + 六合表落 const.ts 单一数据源；暗动/日破与应期两个纯函数住 time-analysis.ts，暗动在 core compile 内恒算、应期因依赖问题推断的主用神改由前端调用；yongshen.ts 补"主用神选取"把 note 里的文字规则兑现成代码；新数据走 gua_shen 同款透传链喂给 AI。

**技术栈：** TypeScript（ESM，相对导入带 `.js` 后缀）、vitest、pnpm monorepo（@najia/core / apps/server / apps/web）。

---

## 设计依据

详见 [2026-06-12-day-dynamics-yingqi-design.md](./2026-06-12-day-dynamics-yingqi-design.md)。核心决策：
- 暗动判定用《增删卜易》主流派：静爻被日冲 + 旺相=暗动、休囚=日破
- 应期只算死候选地支 + 贴固定语义，"该用哪类应法"留给 AI
- 主用神选取：动爻 > 临世应 > 首现
- 冲判定三处重复收敛到 const.ts，每处等价替换、467 测试兜底

## 文件结构

| 文件 | 职责 | 变更 |
|---|---|---|
| `packages/core/src/const.ts` | 新增共享 `isChong` + `LIUHE_MAP` | 修改 |
| `packages/core/src/relation.ts` | 删私有 `isChong`，改 import | 修改 |
| `packages/core/src/time-analysis.ts` | 删 `CHONG_MAP`，`isYuePo` 改用共享；新增 `calcDayDynamics`、`calcYingQi` | 修改 |
| `packages/core/src/yongshen.ts` | 补主用神选取 `primary_pos`/`primary_zhi` | 修改 |
| `packages/core/src/types.ts` | 新增 `DayDynamics`、`YingQi` interface + `HexagramResult.day_dynamics` 字段 + `YongShenInfo` 两字段 | 修改 |
| `packages/core/src/compile.ts` | 挂载 `day_dynamics` | 修改 |
| `packages/core/test/day-dynamics.test.ts` | 暗动/日破 + 应期 + 冲收敛回归 | 创建 |
| `packages/core/test/diff.test.ts` | 加 `delete o.day_dynamics` | 修改 |
| `packages/core/test/relation-yongshen.test.ts` | 主用神选取测试 | 修改 |
| `apps/server/src/types.ts` | `HexagramData` 加 `day_dynamics`/`ying_qi`/`yongshen` 两字段 | 修改 |
| `apps/server/src/ai-client.ts` | prompt + buildUserPrompt 喂新数据 | 修改 |
| `apps/web/src/types/index.ts` | `InterpretRequest` 加对应字段 | 修改 |
| `apps/web/src/components/InterpretDialog.vue` | 调 `calcYingQi` 并透传 | 修改 |

---

## 任务 1：冲判定收敛 + 六合表（const.ts 单一数据源）

**文件：**
- 修改：`packages/core/src/const.ts`（在末尾 `ZHIS_DICT` 定义之后追加）
- 修改：`packages/core/src/relation.ts:8-14`（删私有 `isChong`，改 import）
- 测试：`packages/core/test/day-dynamics.test.ts`（创建，先放冲收敛回归）

- [ ] **步骤 1：编写冲/合表的失败测试**

创建 `packages/core/test/day-dynamics.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { isChong, LIUHE_MAP } from '../src/const.js'

describe('地支相冲（共享 isChong）', () => {
  it('六冲对全部成立', () => {
    const pairs: Array<[string, string]> = [
      ['子', '午'], ['丑', '未'], ['寅', '申'],
      ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
    ]
    for (const [a, b] of pairs) {
      expect(isChong(a, b)).toBe(true)
      expect(isChong(b, a)).toBe(true)
    }
  })

  it('非冲对返回 false', () => {
    expect(isChong('子', '丑')).toBe(false)
    expect(isChong('子', '子')).toBe(false)
    expect(isChong('寅', '卯')).toBe(false)
  })

  it('非法地支返回 false', () => {
    expect(isChong('X', '午')).toBe(false)
  })
})

describe('地支六合（LIUHE_MAP）', () => {
  it('六合对双向一致', () => {
    const pairs: Array<[string, string]> = [
      ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
      ['辰', '酉'], ['巳', '申'], ['午', '未'],
    ]
    for (const [a, b] of pairs) {
      expect(LIUHE_MAP[a]).toBe(b)
      expect(LIUHE_MAP[b]).toBe(a)
    }
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：FAIL，报 `isChong is not exported` / `LIUHE_MAP is not exported`

- [ ] **步骤 3：在 const.ts 追加共享 isChong + LIUHE_MAP**

在 `packages/core/src/const.ts` 的 `YAOS_DICT` 定义之后追加（紧跟"快速查找字典"区块）：

```ts
/**
 * 地支相冲（六冲）：索引差恒为 6（子0午6、丑1未7…巳5亥11）。
 * 唯一数据源——月破、暗动/日破、应期逢冲全部复用，不再各自维护冲表。
 */
export function isChong(z1: string, z2: string): boolean {
  const i = ZHIS_DICT[z1]
  const j = ZHIS_DICT[z2]
  if (i === undefined || j === undefined) return false
  return Math.abs(i - j) === 6
}

/**
 * 地支六合表：子丑/寅亥/卯戌/辰酉/巳申/午未。
 * 六合无统一数学规律（子丑索引和=1，其余=13），必须显式表。
 */
export const LIUHE_MAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：PASS（冲/合两组）

- [ ] **步骤 5：relation.ts 删私有 isChong，改 import**

`packages/core/src/relation.ts` 删除现有私有函数（第 8-14 行附近）：

```ts
/** 地支相冲：六冲对索引差恒为 6（子0午6、丑1未7…巳5亥11） */
function isChong(z1: string, z2: string): boolean {
  const i = ZHIS_DICT[z1]
  const j = ZHIS_DICT[z2]
  if (i === undefined || j === undefined) return false
  return Math.abs(i - j) === 6
}
```

并在文件顶部 import 加入 `isChong`。原 import 行：

```ts
import { ZHIS_DICT, ZHI5 } from './const.js'
```

改为：

```ts
import { ZHIS_DICT, ZHI5, isChong } from './const.js'
```

- [ ] **步骤 6：time-analysis.ts 删 CHONG_MAP，isYuePo 改用共享 isChong**

`packages/core/src/time-analysis.ts` 删除 `CHONG_MAP`（第 11-15 行附近）：

```ts
// 冲关系（月破）
const CHONG_MAP: Record<string, string> = {
  子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
  午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳',
}
```

`isYuePo` 原实现：

```ts
/** 月破：爻地支与月建相冲 */
export function isYuePo(yaoDizhi: string, yueZhi: string): boolean {
  return CHONG_MAP[yaoDizhi] === yueZhi
}
```

改为：

```ts
/** 月破：爻地支与月建相冲 */
export function isYuePo(yaoDizhi: string, yueZhi: string): boolean {
  return isChong(yaoDizhi, yueZhi)
}
```

并在 time-analysis.ts 顶部 import 加入 `isChong`。原 import：

```ts
import { ZHIS, ZHI5, XING5, GANS } from './const.js'
```

改为：

```ts
import { ZHIS, ZHI5, XING5, GANS, isChong, LIUHE_MAP } from './const.js'
```

（`LIUHE_MAP` 任务 3 才用，此处一并 import 避免重复改动该行。）

- [ ] **步骤 7：运行 core 全量测试验证收敛无回归**

运行：`pnpm --filter @najia/core test`
预期：PASS（467 + 新增 5 例 = 472），重点确认月破相关（time-analysis）、反吟相关（relation）未变红

- [ ] **步骤 8：Commit**

```bash
git add packages/core/src/const.ts packages/core/src/relation.ts packages/core/src/time-analysis.ts packages/core/test/day-dynamics.test.ts
git commit -m "refactor: 地支冲判定收敛到 const.ts 单一 isChong + 新增 LIUHE_MAP"
```

---

## 任务 2：暗动 / 日破（calcDayDynamics + types + compile 挂载）

**文件：**
- 修改：`packages/core/src/types.ts`（新增 `DayDynamics` interface + `HexagramResult.day_dynamics`）
- 修改：`packages/core/src/time-analysis.ts`（新增 `calcDayDynamics`）
- 修改：`packages/core/src/compile.ts`（挂载）
- 修改：`packages/core/test/day-dynamics.test.ts`（追加暗动/日破测试）
- 修改：`packages/core/test/diff.test.ts`（剥离 day_dynamics）

- [ ] **步骤 1：types.ts 新增 DayDynamics interface + 字段**

在 `packages/core/src/types.ts` 的 `GuaShenInfo` interface 之后新增：

```ts
/** 暗动/日破 — 日辰对静爻的作用：被日冲 + 旺相=暗动、休囚=日破 */
export interface DayDynamics {
  /** 逐爻状态：'暗动' | '日破' | ''（索引 0 = 初爻，与 qinx 对齐） */
  states: string[]
  /** 一句话说明（无暗动也无日破时为空串） */
  note: string
}
```

在 `HexagramResult` 的 `gua_shen?` 字段之后新增：

```ts
  /** 暗动/日破（日辰作用于静爻）；有日辰+月建时附加 */
  day_dynamics?: DayDynamics | null
```

- [ ] **步骤 2：编写暗动/日破失败测试**

在 `packages/core/test/day-dynamics.test.ts` 追加：

```ts
import { calcDayDynamics } from '../src/time-analysis.js'

describe('暗动 / 日破（calcDayDynamics）', () => {
  // qinx 为逐爻纳甲干支（如「甲子」），取末字地支
  // 月建寅 → 木旺；卯木亦旺相。子水在寅月为休、午火在寅月为相、申金在寅月为死
  it('静爻被日冲且旺相 → 暗动', () => {
    // 第1爻甲寅(木)，日辰庚申，寅申相冲；月建卯(木)→寅木为旺 → 暗动
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [], '庚申', '卯')
    expect(r.states[0]).toBe('暗动')
  })

  it('静爻被日冲但休囚 → 日破', () => {
    // 第4爻甲申(金)，日辰甲寅，申寅相冲；月建巳(火)→金在巳月为死 → 日破
    const qinx = ['甲子', '甲戌', '甲午', '甲申', '甲辰', '甲寅']
    const r = calcDayDynamics(qinx, [], '甲寅', '巳')
    expect(r.states[3]).toBe('日破')
  })

  it('动爻被日冲 → 不标（动爻自有动变关系）', () => {
    // 第1爻甲寅被申冲，但它是动爻 → 跳过
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [0], '庚申', '卯')
    expect(r.states[0]).toBe('')
  })

  it('未被日冲 → 空串', () => {
    const qinx = ['甲子', '甲戌', '甲午', '甲申', '甲辰', '甲寅']
    const r = calcDayDynamics(qinx, [], '乙卯', '巳') // 卯只冲酉，卦中无酉
    expect(r.states.every((s) => s === '')).toBe(true)
    expect(r.note).toBe('')
  })

  it('存在暗动/日破时 note 非空且列出爻位', () => {
    const qinx = ['甲寅', '甲子', '甲戌', '甲申', '甲午', '甲辰']
    const r = calcDayDynamics(qinx, [], '庚申', '卯')
    expect(r.note).toContain('暗动')
    expect(r.note).toContain('1')
  })
})
```

- [ ] **步骤 3：运行测试验证失败**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：FAIL，报 `calcDayDynamics is not exported`

- [ ] **步骤 4：实现 calcDayDynamics**

在 `packages/core/src/time-analysis.ts` 末尾追加（`DIZHI_WUXING` 已是该文件私有常量，直接复用）：

```ts
/**
 * 暗动/日破 — 日辰冲静爻：旺相为暗动（暗中发动、有力），休囚为日破（被冲散、受损）。
 * 动爻不参与（动爻自有动变关系，日冲动爻属另一套）。
 * @param qinx 逐爻纳甲干支（如「甲子」，取末字地支）
 * @param dong 动爻位（0-based），跳过
 * @param riChen 日辰干支（取末字地支）
 * @param yueZhi 月建地支（定旺衰）
 */
export function calcDayDynamics(
  qinx: string[],
  dong: number[],
  riChen: string,
  yueZhi: string,
): DayDynamics {
  const riZhi = riChen.slice(-1)
  const hits: string[] = []
  const states = qinx.map((gz, i) => {
    if (dong.includes(i)) return '' // 动爻跳过
    const yaoZhi = gz.slice(-1)
    if (!isChong(yaoZhi, riZhi)) return ''
    const wuxing = DIZHI_WUXING[yaoZhi]
    const wang = calcYueLing(wuxing, yueZhi) // 旺/相/休/囚/死
    const state = wang === '旺' || wang === '相' ? '暗动' : '日破'
    hits.push(`第${i + 1}爻${state}`)
    return state
  })
  const note = hits.length > 0 ? `日辰${riZhi}冲：${hits.join('、')}（已算定，暗动者暗中得力、日破者被冲散）。` : ''
  return { states, note }
}
```

并在 `time-analysis.ts` 顶部 import 加上 `DayDynamics` 类型：

```ts
import type { DayDynamics } from './types.js'
```

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：PASS（暗动/日破 5 例）

- [ ] **步骤 6：compile.ts 挂载 day_dynamics**

`packages/core/src/compile.ts` 顶部 import 中，把 time-analysis 的导入加上 `calcDayDynamics`。原行：

```ts
import {
  getDaily, dateToYueRiChen, calcYueLing, isYuePo, isXunKong,
} from './time-analysis.js'
```

改为：

```ts
import {
  getDaily, dateToYueRiChen, calcYueLing, isYuePo, isXunKong, calcDayDynamics,
} from './time-analysis.js'
```

在 `result.gua_shen = calcGuaShen(...)` 之后、时间维度附加之前加：

```ts
  // 暗动/日破：日辰冲静爻，有日辰+月建时算（依赖 qinx/dong/riChen/yueZhi）
  if (riChen !== null && yueZhi !== null) {
    result.day_dynamics = calcDayDynamics(qinx, dong, riChen, yueZhi)
  }
```

- [ ] **步骤 7：diff.test.ts 剥离 day_dynamics**

`packages/core/test/diff.test.ts` 在 `delete o.gua_shen` 之后加：

```ts
  // day_dynamics 同理：TS 新增暗动/日破字段，Python 黄金数据无，剥离后再比对
  delete o.day_dynamics
```

- [ ] **步骤 8：运行 core 全量测试**

运行：`pnpm --filter @najia/core test`
预期：PASS（对拍 265 不受影响，新增暗动 5 例绿）

- [ ] **步骤 9：Commit**

```bash
git add packages/core/src/types.ts packages/core/src/time-analysis.ts packages/core/src/compile.ts packages/core/test/day-dynamics.test.ts packages/core/test/diff.test.ts
git commit -m "feat: 暗动/日破 — calcDayDynamics 日辰冲静爻旺衰二分 + compile 恒算"
```

---

## 任务 3：应期候选地支（calcYingQi + types）

**文件：**
- 修改：`packages/core/src/types.ts`（新增 `YingQi` interface）
- 修改：`packages/core/src/time-analysis.ts`（新增 `calcYingQi`）
- 修改：`packages/core/test/day-dynamics.test.ts`（追加应期测试）

- [ ] **步骤 1：types.ts 新增 YingQi interface**

在 `packages/core/src/types.ts` 的 `DayDynamics` interface 之后新增：

```ts
/** 应期候选地支 — 用神逢值/冲/合/出空，每类贴固定语义；最终取舍留给 AI */
export interface YingQi {
  /** 主用神地支 */
  zhi: string
  /** 候选应期（含类型、地支、固定语义标签） */
  candidates: Array<{
    type: '逢值' | '逢冲' | '逢合' | '出空'
    zhi: string
    semantic: string
  }>
}
```

- [ ] **步骤 2：编写应期失败测试**

在 `packages/core/test/day-dynamics.test.ts` 追加：

```ts
import { calcYingQi } from '../src/time-analysis.js'

describe('应期候选地支（calcYingQi）', () => {
  it('用神午、不空 → 逢值午/逢冲子/逢合未，无出空', () => {
    const r = calcYingQi('午', false)
    expect(r.zhi).toBe('午')
    const byType = Object.fromEntries(r.candidates.map((c) => [c.type, c.zhi]))
    expect(byType['逢值']).toBe('午')
    expect(byType['逢冲']).toBe('子')
    expect(byType['逢合']).toBe('未')
    expect(byType['出空']).toBeUndefined()
  })

  it('用神午、旬空 → 追加出空=本支午', () => {
    const r = calcYingQi('午', true)
    const byType = Object.fromEntries(r.candidates.map((c) => [c.type, c.zhi]))
    expect(byType['出空']).toBe('午')
  })

  it('逢冲反查正确（寅冲申、辰冲戌）', () => {
    expect(calcYingQi('寅', false).candidates.find((c) => c.type === '逢冲')?.zhi).toBe('申')
    expect(calcYingQi('辰', false).candidates.find((c) => c.type === '逢冲')?.zhi).toBe('戌')
  })

  it('逢合查表正确（子合丑、寅合亥）', () => {
    expect(calcYingQi('子', false).candidates.find((c) => c.type === '逢合')?.zhi).toBe('丑')
    expect(calcYingQi('寅', false).candidates.find((c) => c.type === '逢合')?.zhi).toBe('亥')
  })

  it('每个候选都带固定语义标签', () => {
    const r = calcYingQi('午', true)
    expect(r.candidates.every((c) => c.semantic.length > 0)).toBe(true)
  })

  it('空用神地支 → 空 candidates', () => {
    const r = calcYingQi('', false)
    expect(r.candidates).toEqual([])
  })
})
```

- [ ] **步骤 3：运行测试验证失败**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：FAIL，报 `calcYingQi is not exported`

- [ ] **步骤 4：实现 calcYingQi**

在 `packages/core/src/time-analysis.ts` 末尾追加：

```ts
/**
 * 应期候选地支 — 给定主用神地支（+是否旬空），输出四类候选 + 固定语义标签。
 * 纯查表，不做旺衰筛选、不做最终取舍（"该应哪类"依赖卦象动静且有流派分歧，留给 AI）。
 * @param yongZhi 主用神地支（空串时返回空候选）
 * @param isKong 主用神是否旬空（旬空才有「出空」候选）
 */
export function calcYingQi(yongZhi: string, isKong: boolean): YingQi {
  if (!yongZhi || ZHIS_DICT[yongZhi] === undefined) {
    return { zhi: yongZhi, candidates: [] }
  }
  const chongZhi = ZHIS[(ZHIS_DICT[yongZhi] + 6) % 12] // 冲支：索引 +6
  const heZhi = LIUHE_MAP[yongZhi] ?? ''
  const candidates: YingQi['candidates'] = [
    { type: '逢值', zhi: yongZhi, semantic: '用神值日/值月得力之时' },
    { type: '逢冲', zhi: chongZhi, semantic: '冲动之时，静而逢冲则起' },
  ]
  if (heZhi) {
    candidates.push({ type: '逢合', zhi: heZhi, semantic: '合起或合绊之时' })
  }
  if (isKong) {
    candidates.push({ type: '出空', zhi: yongZhi, semantic: '空者实之（应期共识最强一条）' })
  }
  return { zhi: yongZhi, candidates }
}
```

并在 `time-analysis.ts` 顶部 import 的类型行加上 `YingQi`。原行（任务 2 已加 DayDynamics）：

```ts
import type { DayDynamics } from './types.js'
```

改为：

```ts
import type { DayDynamics, YingQi } from './types.js'
```

`ZHIS` 已在 time-analysis 顶部 import，`ZHIS_DICT` 需确认——若未 import 则补。原值导入行：

```ts
import { ZHIS, ZHI5, XING5, GANS, isChong, LIUHE_MAP } from './const.js'
```

改为：

```ts
import { ZHIS, ZHIS_DICT, ZHI5, XING5, GANS, isChong, LIUHE_MAP } from './const.js'
```

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm --filter @najia/core test -- day-dynamics`
预期：PASS（应期 6 例）

- [ ] **步骤 6：运行 core 全量测试 + 类型检查**

运行：`pnpm --filter @najia/core test && pnpm --filter @najia/core build`
预期：全绿，dist 产出含 calcYingQi

- [ ] **步骤 7：Commit**

```bash
git add packages/core/src/types.ts packages/core/src/time-analysis.ts packages/core/test/day-dynamics.test.ts
git commit -m "feat: 应期候选地支 — calcYingQi 逢值/冲/合/出空查表 + 固定语义"
```

---

## 任务 4：主用神选取（yongshen.ts 补 primary_pos/primary_zhi）

**文件：**
- 修改：`packages/core/src/types.ts`（`YongShenInfo` 加两字段）
- 修改：`packages/core/src/yongshen.ts`（选取逻辑 + 两处 return 补字段）
- 修改：`packages/core/test/relation-yongshen.test.ts`（主用神选取测试）

- [ ] **步骤 1：types.ts 给 YongShenInfo 加字段**

在 `packages/core/src/types.ts` 的 `YongShenInfo` interface 中，`note` 字段之前加：

```ts
  /** 主用神爻位（1-based）；多现按动爻>临世应>首现选出；无用神/不上卦为 0 */
  primary_pos: number
  /** 主用神纳甲地支（从 qinx[primary_pos-1] 取末字）；无则空串 */
  primary_zhi: string
```

- [ ] **步骤 2：编写主用神选取失败测试**

在 `packages/core/test/relation-yongshen.test.ts` 末尾追加（复用文件已有的 `markYongShen` import 与 `HexagramResult` 构造方式；此处给出自带 qinx/dong/shiy 的完整 fake）：

```ts
describe('主用神选取（primary_pos / primary_zhi）', () => {
  // 构造带 qinx（纳甲干支）/dong/shiy 的主卦
  function fakeResult(opts: {
    qin6: string[]; qinx: string[]; dong?: number[]; shiy?: number[]
  }): HexagramResult {
    return {
      params: [1, 1, 1, 1, 1, 1],
      mark: '111111',
      name: 'X',
      gong: '乾',
      shiy: opts.shiy ?? [6, 3, 0],
      qin6: opts.qin6,
      qinx: opts.qinx,
      god6: [],
      dong: opts.dong ?? [],
      solar: '',
      lunar: { xkong: '', gz: { year: '', month: '', day: '', hour: '' } },
      hexagram_type: '',
    }
  }

  it('单现 → 直接取该爻', () => {
    const r = fakeResult({
      qin6: ['官鬼', '父母', '兄弟', '妻财', '子孙', '父母'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    })
    const ys = markYongShen(r, '问事业') // 用神官鬼，第1爻
    expect(ys.primary_pos).toBe(1)
    expect(ys.primary_zhi).toBe('子')
  })

  it('多现且有动爻 → 取动者', () => {
    // 妻财在第1、4爻，第4爻是动爻 → 取第4
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '妻财', '子孙', '官鬼'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      dong: [3],
    })
    const ys = markYongShen(r, '问求财')
    expect(ys.primary_pos).toBe(4)
    expect(ys.primary_zhi).toBe('午')
  })

  it('多现无动爻但临世应 → 取临世应者', () => {
    // 妻财在第1、6爻，世在第6爻 → 取第6
    const r = fakeResult({
      qin6: ['妻财', '父母', '兄弟', '官鬼', '子孙', '妻财'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [6, 3, 0],
    })
    const ys = markYongShen(r, '问求财')
    expect(ys.primary_pos).toBe(6)
    expect(ys.primary_zhi).toBe('寅')
  })

  it('多现无动爻无临世应 → 取首现', () => {
    // 妻财在第2、5爻，世应在1/4 → 取第2（首现）
    const r = fakeResult({
      qin6: ['官鬼', '妻财', '兄弟', '父母', '妻财', '子孙'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
      shiy: [1, 4, 0],
    })
    const ys = markYongShen(r, '问求财')
    expect(ys.primary_pos).toBe(2)
    expect(ys.primary_zhi).toBe('戌')
  })

  it('无用神（一般类）→ primary_pos 0、primary_zhi 空', () => {
    const r = fakeResult({
      qin6: ['兄弟', '子孙', '妻财', '官鬼', '父母', '兄弟'],
      qinx: ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'],
    })
    const ys = markYongShen(r, '随便问问')
    expect(ys.primary_pos).toBe(0)
    expect(ys.primary_zhi).toBe('')
  })
})
```

- [ ] **步骤 3：运行测试验证失败**

运行：`pnpm --filter @najia/core test -- relation-yongshen`
预期：FAIL，报 `primary_pos` 不存在 / undefined

- [ ] **步骤 4：实现主用神选取**

在 `packages/core/src/yongshen.ts` 新增辅助函数（放 `buildRole` 之后）：

```ts
/**
 * 从多现的用神爻位中选主用神：动爻 > 临世应 > 首现。
 * @param positions 用神爻位（1-based）
 * @param dong 动爻位（0-based）
 * @param shiy [世, 应, ...]（1-based）
 * @returns 主用神爻位（1-based），positions 空时返回 0
 */
function pickPrimary(positions: number[], dong: number[], shiy: number[]): number {
  if (positions.length === 0) return 0
  // 动爻优先（dong 是 0-based，position 是 1-based）
  const dongHit = positions.find((p) => dong.includes(p - 1))
  if (dongHit !== undefined) return dongHit
  // 临世应
  const shi = shiy[0]
  const ying = shiy[1]
  const syHit = positions.find((p) => p === shi || p === ying)
  if (syHit !== undefined) return syHit
  // 首现
  return positions[0]
}
```

在 `markYongShen` 的"一般类无用神"早返回分支中，`note` 之前加两字段：

```ts
      primary_pos: 0,
      primary_zhi: '',
```

在 `markYongShen` 末尾正常 return 之前，计算主用神（`positions`、`result.qinx`、`result.shiy`、`dong` 此处可取）：

```ts
  // 主用神：多现时按 动爻>临世应>首现 选出，取其纳甲地支（应期等下游需要确切地支）
  const dong = result.dong ?? []
  const shiy = result.shiy ?? []
  const primaryPos = pickPrimary(positions, dong, shiy)
  const primaryZhi = primaryPos > 0 ? (result.qinx?.[primaryPos - 1] ?? '').slice(-1) : ''
```

并在末尾 return 对象的 `note` 之前加：

```ts
    primary_pos: primaryPos,
    primary_zhi: primaryZhi,
```

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm --filter @najia/core test -- relation-yongshen`
预期：PASS（主用神选取 5 例）

- [ ] **步骤 6：运行 core 全量 + 类型检查**

运行：`pnpm --filter @najia/core test && pnpm --filter @najia/core build`
预期：全绿。注意 `YongShenInfo` 新增必填字段后，若有别处构造该类型的代码会报类型错——检查并修。

- [ ] **步骤 7：Commit**

```bash
git add packages/core/src/types.ts packages/core/src/yongshen.ts packages/core/test/relation-yongshen.test.ts
git commit -m "feat: 主用神选取 — 动爻>临世应>首现，补 primary_pos/primary_zhi"
```

---

## 任务 5：透传类型链 + prompt（server + web）

**文件：**
- 修改：`apps/server/src/types.ts`（`HexagramData` 加字段）
- 修改：`apps/server/src/ai-client.ts`（prompt + buildUserPrompt）
- 修改：`apps/web/src/types/index.ts`（`InterpretRequest` 加字段）
- 修改：`apps/web/src/components/InterpretDialog.vue`（调 calcYingQi + 透传）

- [ ] **步骤 1：server types.ts 加字段**

在 `apps/server/src/types.ts` 的 `HexagramData` 中，`gua_shen` 字段之后加：

```ts
  // 暗动/日破（core 算好透传）
  day_dynamics?: {
    states: string[]
    note: string
  } | null
  // 应期候选地支（前端在 markYongShen 拿到主用神后调 calcYingQi 透传）
  ying_qi?: {
    zhi: string
    candidates: Array<{ type: string; zhi: string; semantic: string }>
  } | null
```

并在 `HexagramData.yongshen` 对象类型中加 `primary_pos`/`primary_zhi`（紧跟 `choushen` 之后）：

```ts
    primary_pos: number
    primary_zhi: string
```

- [ ] **步骤 2：web types/index.ts 同步加字段**

在 `apps/web/src/types/index.ts` 的 `InterpretRequest` 中，`gua_shen` 之后加：

```ts
    // 暗动/日破（core 已算好直接透传）
    day_dynamics?: import('@najia/core').DayDynamics | null
    // 应期候选地支（前端调 calcYingQi 后透传）
    ying_qi?: import('@najia/core').YingQi | null
```

并在 `yongshen` 对象类型中加（`choushen` 之后）：

```ts
      primary_pos: number
      primary_zhi: string
```

> 说明：`DayDynamics`/`YingQi` 需从 `@najia/core` 导出——它们已在 core types.ts 定义并经 `export * from './types.js'`（index.ts）导出，无需额外操作。此处用 inline import 类型避免改顶部 import 行。若项目风格偏好顶部统一 import，改 `import type { ..., DayDynamics, YingQi }` 亦可。

- [ ] **步骤 3：InterpretDialog.vue 调 calcYingQi 并透传**

`apps/web/src/components/InterpretDialog.vue` 的 `handleInterpret` 中，顶部需 import `calcYingQi`（与已有 `markYongShen` 同源）。原 import：

```ts
import { markYongShen } from '@najia/core'
```

改为：

```ts
import { markYongShen, calcYingQi } from '@najia/core'
```

在构造 `toHexagramData`（或等价的请求体组装处）里，`yongshen: markYongShen(r, question.value)` 改为先取结果再算应期。原行：

```ts
        gua_shen: r.gua_shen,
        yongshen: markYongShen(r, question.value),
```

改为：

```ts
        gua_shen: r.gua_shen,
        day_dynamics: r.day_dynamics,
        ying_qi: (() => {
          const ys = markYongShen(r, question.value)
          // 主用神旬空：用 r.xun_kong 在主用神爻位上的标记
          const kong = ys.primary_pos > 0 ? (r.xun_kong?.[ys.primary_pos - 1] ?? false) : false
          return ys.primary_zhi ? calcYingQi(ys.primary_zhi, kong) : null
        })(),
        yongshen: markYongShen(r, question.value),
```

> 注：`markYongShen` 调了两次（一次为 ying_qi、一次为 yongshen 字段）。为避免重复计算，重构为先 `const ys = markYongShen(...)`，ying_qi 和 yongshen 都用它。实现时按下方简洁写法：

```ts
      // 在组装请求体之前先算一次用神，供 yongshen 与 ying_qi 共用
      const ys = markYongShen(r, question.value)
      const yongKong = ys.primary_pos > 0 ? (r.xun_kong?.[ys.primary_pos - 1] ?? false) : false
      const yingQi = ys.primary_zhi ? calcYingQi(ys.primary_zhi, yongKong) : null
```

然后请求体中：

```ts
        gua_shen: r.gua_shen,
        day_dynamics: r.day_dynamics,
        ying_qi: yingQi,
        yongshen: ys,
```

- [ ] **步骤 4：ai-client.ts prompt 加暗动/日破 + 应期说明**

`apps/server/src/ai-client.ts` 的 `SYSTEM_PROMPT`「数据已算定」清单中追加两项（在「卦身」之后）：

```
- 暗动/日破（日辰冲静爻：暗动=暗中得力、日破=被冲散，已逐爻算定）
- 应期候选地支（逢值/逢冲/逢合/出空，已贴固定语义；最终取舍结合卦象动静）
```

方法论框架「应期」一条原文：

```
5. 应期：依逢值、逢冲、逢合、出空等推估可能的时间节点
```

改为：

```
5. 应期：候选地支已算定并贴语义（逢值/冲/合/出空），你只需结合用神动静空破选择主导应法并表述，不要自行推算冲合
```

- [ ] **步骤 5：ai-client.ts buildUserPrompt 喂暗动/日破 + 应期**

在 `buildUserPrompt` 的逐爻一览之后、`guaShenSection` 附近，加暗动/日破段。逐爻一览的状态标已含旬空/月破，此处补暗动/日破到 states——但 day_dynamics 是独立结构，作为单独一段更清晰：

```ts
  // 暗动/日破：core 算定的日辰对静爻作用
  let dayDynSection = ''
  if (info.day_dynamics && info.day_dynamics.note) {
    dayDynSection = `\n【暗动/日破（已算定，勿自行推日冲）】\n  ${info.day_dynamics.note}`
  }

  // 应期候选地支：core 算定地支 + 固定语义，最终取舍留给 AI
  let yingQiSection = ''
  if (info.ying_qi && info.ying_qi.candidates.length > 0) {
    const lines = info.ying_qi.candidates
      .map((c) => `  ${c.type}：${c.zhi}（${c.semantic}）`)
      .join('\n')
    yingQiSection = `\n【应期候选（用神${info.ying_qi.zhi}，地支已算定，最终取舍结合用神动静空破）】\n${lines}`
  }
```

并把这两段拼到返回串中（紧跟 `guaShenSection` 之后）。原行：

```ts
${bianSection}${hideSection}${relationSection}${guaShenSection}
```

改为：

```ts
${bianSection}${hideSection}${relationSection}${guaShenSection}${dayDynSection}${yingQiSection}
```

- [ ] **步骤 6：全 workspace 类型检查**

运行：`pnpm -r build`
预期：core/server/web 全部编译通过。若 web 报 `DayDynamics`/`YingQi` 未导出，回任务 5 步骤 2 确认 core index.ts 已 `export *`。

- [ ] **步骤 7：Commit**

```bash
git add apps/server/src/types.ts apps/server/src/ai-client.ts apps/web/src/types/index.ts apps/web/src/components/InterpretDialog.vue
git commit -m "feat: 暗动/日破 + 应期透传链 + prompt 改候选地支已算定"
```

---

## 任务 6：实测验证（LongCat 5 例）

**文件：**
- 修改：`apps/server/test/interpret-samples.mjs`（补 day_dynamics/ying_qi 透传）

- [ ] **步骤 1：interpret-samples.mjs 补字段透传**

`apps/server/test/interpret-samples.mjs` 的 `toHexagramData` 中，仿 InterpretDialog 的逻辑加 day_dynamics/ying_qi。在 `gua_shen: r.gua_shen,` 之后、`yongshen:` 之前加：

```js
    day_dynamics: r.day_dynamics,
    ying_qi: (() => {
      const ys = markYongShen(r, question)
      const kong = ys.primary_pos > 0 ? (r.xun_kong?.[ys.primary_pos - 1] ?? false) : false
      return ys.primary_zhi ? calcYingQi(ys.primary_zhi, kong) : null
    })(),
```

并在文件顶部 import 加 `calcYingQi`（与 markYongShen 同源）。

- [ ] **步骤 2：server build**

运行：`pnpm --filter @najia/server build`
预期：编译通过

- [ ] **步骤 3：跑 LongCat 实测**

运行：`node --env-file-if-exists=apps/server/.env apps/server/test/interpret-samples.mjs`
预期：5 例成功，重点核对：
- 应期段引用 core 候选地支（逢值/冲/合/出空），**不再出现"需结合日辰推演"式现场心算**
- 若有暗动/日破的卦例，AI 采用 core 标注而非自行判日冲

- [ ] **步骤 4：Commit（若 mjs 有改动）**

```bash
git add apps/server/test/interpret-samples.mjs
git commit -m "test: interpret-samples 补暗动/日破 + 应期透传"
```

---

## 验证标准

- core 全量测试绿（现 467 + 新增：冲合 5 + 暗动 5 + 应期 6 + 主用神 5 ≈ 488）
- 全 workspace `pnpm -r build` 类型检查通过
- LongCat 5 例实测：应期段引用 core 候选地支、不再现场心算冲合
- 冲判定收敛后无回归（月破、反吟测试仍绿）
