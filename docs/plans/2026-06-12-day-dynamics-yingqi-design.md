# P2 深度断卦设计：暗动/日破 + 应期候选地支

> 日期：2026-06-12　范围：`@najia/core` 时间维度 + 冲判定收敛　承接 [deep-interpretation.md](./deep-interpretation.md)

## 背景与动机

P0+B 批（用神/原忌仇神/卦身/旬空月破）已落地并经 LongCat 5 例实测验证：AI 已不再瞎编变爻干支、心算旬空。但实测精准暴露**唯一残留窟窿**——应期。5 个案例的"应期"段，AI 全在现场心算"逢冲申日/出空寅月"，案例5 自己都承认"具体需结合日辰推演"。这正是整批设计哲学（core 算定确定性数据，AI 只综合不心算）要消灭的最后一处。

同时 P2 清单里的暗动/日破是高频实战项，且与应期共用"地支相冲"判定。两者一并做，顺手收敛重复的冲判定。

## 设计哲学（与前批一致）

把**确定的算死**喂给 AI，把**真有流派分歧/依赖卦象综合的判断**留给 AI。不把玄学包装成精确。

- 暗动/日破：二值事实（被日冲 + 旺衰二分），可完全确定化 → core 算死
- 应期：含预测成分，"该用哪类应法"依赖用神动静且有流派分歧 → core 只算死候选地支 + 贴固定语义标签，最终取舍留给 AI

## 单元 1：暗动 / 日破（time-analysis.ts）

**职责**：判定每个静爻被日辰冲时的状态——旺相为暗动（暗中发动、有力），休囚为日破（被冲散、受损）。

**判定标准**（《增删卜易》主流派，用户已确认）：
- 静爻被日辰相冲 + 该爻月令旺/相 → **暗动**
- 静爻被日辰相冲 + 该爻月令休/囚/死 → **日破**
- 动爻不参与（动爻自有动变关系，日冲动爻属另一套，本单元只判静爻）

**接口**：
```ts
interface DayDynamics {
  /** 逐爻状态：'暗动' | '日破' | ''（1-based 对齐，索引 0 = 初爻） */
  states: string[]
  /** 一句话说明（仅当存在暗动或日破时非空） */
  note: string
}

function calcDayDynamics(
  qinx: string[],    // 逐爻纳甲地支
  dong: number[],    // 动爻位（0-based），跳过
  riChen: string,    // 日辰干支
  yueZhi: string,    // 月建地支（定旺衰）
): DayDynamics
```

**复用**：`isChong`（收敛后的共享函数）判冲、`calcYueLing` 判旺衰二分（旺/相归旺相，休/囚/死归衰）。

## 单元 2：应期候选地支（time-analysis.ts）

**职责**：给定主用神地支（+是否旬空），输出四类候选应期地支，每类贴确定性语义标签。纯查表，不做旺衰筛选、不做最终取舍。

**接口**：
```ts
interface YingQi {
  zhi: string                    // 主用神地支
  candidates: Array<{
    type: '逢值' | '逢冲' | '逢合' | '出空'
    zhi: string                  // 候选地支
    semantic: string             // 固定语义标签（口诀含义）
  }>
}

function calcYingQi(yongZhi: string, isKong: boolean): YingQi
```

**四类候选 + 固定语义**（零分歧的口诀含义，不做预测）：
| 类型 | 地支来源 | 语义标签 |
|---|---|---|
| 逢值 | 本支 | 用神值日/值月得力之时 |
| 逢冲 | 冲支（共享 isChong 反查） | 冲动之时，静而逢冲则起 |
| 逢合 | 六合支（LIUHE_MAP） | 合起或合绊之时 |
| 出空 | 旬空时=本支，否则不输出 | 空者实之（应期共识最强一条） |

**主用神地支来源**：用神可能多现（案例3 妻财两现），需先选出主用神再取其地支。

## 主用神选取（yongshen.ts 补能力）

现状：`markYongShen` 的 note 文字写了"取动者或临世应者为主"，但**代码没真选出主用神**，只给了 positions 数组。应期需要确切的主用神地支，逼出这个补充。

**选取规则**（用户已确认，与现有 note 文字一致）：**动爻 > 临世应 > 首现**

**新增输出**（纯加法，保留 positions/note）：
```ts
interface YongShenInfo {
  // ...现有字段全保留
  /** 主用神爻位（1-based）；多现时按动爻>临世应>首现选出；无用神或不上卦为 0 */
  primary_pos: number
  /** 主用神纳甲地支（从 qinx[primary_pos-1] 取）；无则空串 */
  primary_zhi: string
}
```

选取逻辑：在 positions 中，优先取在 dong 里的；无动爻则取等于 shiy[0]（世）或 shiy[1]（应）的；都无则取 positions[0]。

## 冲判定收敛（const.ts + 三处指过去）

**现状**：地支相冲散在三处——`time-analysis.ts` 的 `CHONG_MAP`（12行显式表）、`relation.ts` 的私有 `isChong`（索引差6）、月破也走 CHONG_MAP。新增暗动/应期是第四次复用。

**收敛**（每处行为等价替换，467 测试 + 对拍兜底）：
- const.ts 新增共享 `isChong(z1, z2)`（索引差6 实现，复用已有 `ZHIS_DICT`）
- const.ts 新增 `LIUHE_MAP`（地支六合：子丑/寅亥/卯戌/辰酉/巳申/午未；合无数学规律，必须显式表）
- relation.ts 删私有 `isChong`，改 import
- time-analysis.ts 删 `CHONG_MAP`，`isYuePo` 改用共享 `isChong`
- 新增暗动/应期直接用共享 `isChong`

冲判定从三份收敛到一份，净减代码，新功能零重复。

## compile.ts 挂载（纯加法）

照现有 `if (x !== null) result.x = x` 模式挂：
```ts
// 暗动/日破：有日辰+月建时算
if (riChen !== null && yueZhi !== null) {
  result.day_dynamics = calcDayDynamics(qinx, dong, riChen, yueZhi)
}
// 应期：有主用神地支时算（需先有 yongshen 信息——见下）
```

**注意**：应期依赖主用神，而 `markYongShen` 当前在**前端** InterpretDialog 调用（按问题文本推断类别），core compile 不知道问题。因此**应期不在 core compile 内算**，而在 yongshen.ts 暴露 `calcYingQi` 由前端在 markYongShen 后调用，挂进 InterpretRequest。暗动/日破是卦象+时间固有属性（不依赖问题），留在 core compile。

修正后落点（统一）：
- 暗动/日破：函数住 time-analysis.ts，**core compile 内恒算**（卦象+时间固有属性，不依赖问题）
- 应期：函数 `calcYingQi` 也住 time-analysis.ts（纯时间函数），但**不在 core compile 内调用**（依赖问题推断的主用神）。改由前端在 markYongShen 拿到 primary_zhi 后调 `calcYingQi`，挂进 InterpretRequest，走 yongshen/gua_shen 同款透传链。

即：函数都在 time-analysis.ts（同族内聚），区别在**调用点**——暗动 core 调、应期前端调。

## 数据流到 AI

- **暗动/日破**：逐爻一览行追加状态标（同旬空/月破的现有标注方式），prompt 说明"暗动=暗中发动有力、日破=被冲散受损，已算定勿心算"
- **应期**：新增"应期候选（已算定地支+语义，最终取舍结合卦象动静）"段，喂四类候选

prompt 同步去掉"让 AI 自行推逢冲逢合出空"的措辞，改为"候选地支已算定，你只需结合用神动静空破选择主导应法并表述"。

## 透传类型链（照 gua_shen 同款，纯加法）

- **暗动/日破**：core compile 已挂 `day_dynamics` → `HexagramResult` 加可选字段 → 前端 InterpretRequest payload 加 `day_dynamics` → server `HexagramData` 加字段 → buildUserPrompt 读取
- **应期**：前端在 `markYongShen` 后调 `calcYingQi(primary_zhi, isKong)`，结果挂进 InterpretRequest（与 yongshen 同级）→ server `HexagramData` 加 `ying_qi` 字段 → buildUserPrompt 读取
- 三处类型定义（core types / web types / server types）逐一补字段，与 gua_shen/yongshen 现有透传完全同构

## 测试计划（TDD，先写后实现）

**core（time-analysis）**：
- 暗动：静爻被日冲且旺相 → 暗动；休囚 → 日破；动爻被冲 → 不标
- 应期：各用神地支的逢值/冲/合/出空地支正确（穷举12支验冲合表）；旬空时出空=本支、不空时无出空候选
- 冲判定收敛后回归：isYuePo 行为不变、relation 反吟判定不变

**yongshen**：
- 主用神选取：多现取动者；无动取临世应；都无取首现；单现直接取
- primary_zhi 从 qinx 正确取出

**对拍**：diff.test.ts 加 `delete o.day_dynamics`（TS 新增、Python 无）

**实测**：改完跑 interpret-samples.mjs 5 例，验证 AI 采用暗动/日破标注、应期不再现场心算冲合。

## 验证标准

- core 全量测试绿（现 467 + 新增暗动/应期/主用神/冲收敛回归）
- 全 workspace 类型检查通过
- LongCat 5 例实测：应期段引用 core 候选地支、不再出现"需结合日辰推演"式心算
