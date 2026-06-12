# notepad — 六爻排盘系统

## Priority Context（每次会话先读）

**项目定位**：六爻纳甲排盘 Web 应用。**当前正在从 Python 全栈重写为 TypeScript 全栈（长期迭代决策，2026-06-10 定）**。

**重写决策依据**（已论证）：
- 计算特征纯查表 <10ms，性能维度中立 → 换语言不为性能
- 农历依赖有 TS 原生对等库 `tyme4ts`（6tail 出品，与原 `lunar-python` 同源同作者）
- 架构红利：排盘算法进 `@najia/core` 包，前端直接 import 本地算，**消灭排盘后端往返**，后端缩成 AI 薄代理
- 正确性保障：用现有 Python + 30 测试当黄金标准，做 TS↔Python **对拍测试**逐字段比对

**关键约束**：算法正确性是命门，一个查表错全盘错。重写每个模块必须对拍验证通过才算 done。

## 目标架构（pnpm monorepo）

```
najia-liuyao/
├── pnpm-workspace.yaml
├── packages/core/        # @najia/core 纯算法+类型，零运行时依赖（除 tyme4ts）
│   └── src/
│       ├── const.ts          # 64卦/纳甲/六亲矩阵/五行表
│       ├── hexagram.ts       # 世应/卦宫/纳甲/六亲/变卦/伏神
│       ├── time-analysis.ts  # 月令旺衰/月破/旬空/六神（用 tyme4ts）
│       └── types.ts          # 前后端共享类型
├── apps/web/             # Vue 3 + Vite + Pinia(setup store)，import @najia/core
├── apps/server/          # Hono 薄代理，藏 AI key + SSE 流式
├── docs/ + docs/archive/
└── README.md
```

## 技术选型（2026-06-10 实时验证 npm/GitHub）

- **农历**：`tyme4ts`（自带 .d.ts，旬空 getExtraEarthBranches、真太阳时 getSolarTime、六合六冲原生）
- **Monorepo**：pnpm workspaces 起步，慢了叠 Turborepo，不上 Nx
- **后端**：Hono（TS 原生，AI 代理 + SSE）
- **前端**：Vue 3 + Pinia setup store + 标准 src/ 分层
- **参考**（只借鉴算法不 copy，缺 license）：`xiegen2020/liuyaonajia`(JS 同源)、`SmallTeddyGames/divination-liuyao`(TS 结构)

## 算法移植要点（从 Python 提取的核心逻辑）

**常量表**（const.py → const.ts）：
- 五行 XING5=(木火土金水)，索引 0-4
- 地支五行 ZHI5=(子4丑2寅0卯0辰2巳1午1未2申3酉3戌2亥4)
- 六亲矩阵 QIN6_MATRIX 5×5（行=卦宫五行，列=爻五行）
- 纳甲 NAJIA 8组(内卦干支,外卦干支)
- 卦五行 GUA5=(乾3兑3离1震0巽0坎4艮2坤2)

**核心算法**：
- mark 卦码：`params 各位 %2`（1/3→1阳，2/4→0阴）
- 世应 set_shi_yao：寻世诀，有 64 卦预计算表 SHIYING_PRECOMPUTED
- 卦宫 palace：认宫诀（归魂内卦本宫/一二三六外卦宫/四五游魂内变更）
- 纳甲 get_najia：内卦取 NAJIA[idx][0]、外卦取 [1]，预计算表 NAJIA_PRECOMPUTED
- 六亲 get_qin6：卦宫五行 vs 爻五行查矩阵
- 六神 get_god6：按日干起，math.ceil((gm+1)/2)-7 偏移（注意 gm=4/5 特例）
- 卦型 get_type：游魂/归魂 > 六冲 > 六合
- 动爻 dong：params 中 >2 的位置
- 变卦 _transform：有动爻时，1/4→1、其他→0 生成变卦码
- 伏神 _hidden：当六亲不足 5 种时，用本宫纯卦补缺
- 月令旺衰 calc_yue_ling：同我旺/生我相/我生休/克我囚/我克死
- 月破 is_yue_po：爻支与月建相冲
- 旬空 get_xun_kong：(zhi_idx - gan_idx)%12 起，取前两位
- 六神排：按日干起神顺排（口诀：甲乙青龙/丙丁朱雀/戊勾陈/己螣蛇/庚辛白虎/壬癸玄武）

**已知坑（移植中已解决）**：
- **六神字段去重 + 修 bug**（2026-06-10）：legacy 有 god6(const.py，正确) 和 liu_shen(time_analysis.py) 两份六神，本是同一概念。liu_shen 有**两个 bug**：①己日起神错（应螣蛇，错成勾陈）②错字"腾蛇"。前端只消费 god6。**已删 liu_shen 字段+calcLiuShen 函数**，六神只留正确的 getGod6。教训：对拍只能保证"和 Python 一致"，不保证"正确"，故另加 correctness.test.ts 验口诀
- **月建必须按节气（干支历月柱），非农历月**：Python getMonthZhi() 实为月柱地支（立春后转寅）。TS 用 `SolarDay.getSixtyCycleDay().getMonth().getEarthBranch()`，**不是** getLunarMonth()。这是移植最大坑，已修
- 四柱/旬空 TS 用 `SolarTime.getLunarHour().getEightChar()` + `getExtraEarthBranches()`
- 伏神 seat：Python 用 set.difference，顺序受 PYTHONHASHSEED 影响**非确定**，语义是集合。TS 已改 seat 排序输出；对拍时两侧 seat 都排序比
- **ESM 相对导入必须带 `.js` 后缀**（2026-06-10）：core 用 `moduleResolution:Bundler`，源码无后缀导入 tsc 编译后原样输出，vite/vitest 能容忍但 **Node 原生 ESM import dist 会 ERR_MODULE_NOT_FOUND**。已给所有相对导入加 `.js` 后缀（TS 约定：源码 `.js` 指向 `.ts`）。新增 core 模块时务必带后缀，否则非 bundler 消费者会崩

## 已完成（清理阶段，2026-06-10）

- 🔐 config.py 硬编码 NVIDIA Key 已移到 os.getenv（**原 key 已泄露，待用户去控制台吊销**）
- 📦 najia 嵌套 git 仓库 gitlink 已解除，源码并入主仓库（弃子仓库历史）
- 🗑️ najia.backup（2023旧版）已 trash；缓存/.DS_Store 已清
- 📄 11个 md → README.md + README_API.md + docs/archive/（9个）
- 🛡️ 新建根 .gitignore + .env.example
- ✅ 当前 Python 测试 30 个全绿（装了 arrow/lunar-python 依赖）
- **未 commit**（待用户授权）

## 待办

1. [ ] 用户去 NVIDIA 控制台吊销泄露的 API key
2. [x] 搭 pnpm monorepo 骨架
3. [x] 移植 core（const → hexagram → time-analysis → compile）✅ **265/265 对拍全绿**
4. [x] 搭对拍测试（Python gen_golden.py 264条黄金 ↔ TS diff.test.ts）
5. [x] Vue web app（重构进 apps/web）✅ **build + 类型检查 + dev server 全通过**
6. [x] Hono server 薄代理 ✅ apps/server（藏 key + CORS 收紧 + 优雅降级）
7. [x] AI 解读模块 ✅ 真规则引擎（runRuleEngine）替换 legacy 假占位 + prompt 移植
8. [x] **深度断卦**✅ 走"core 算定确定性数据 + prompt 约束 AI 只综合不心算"路线（非写完整规则库，省一个量级）。已落地：用神取用、原忌仇神、用神旺衰、进退神/反吟伏吟、卦身、暗动/日破、应期候选地支、主用神选取。详见下方 P2 完成记录

## 阶段 C 完成记录（前端重构，2026-06-10）

- apps/web 全新搭建：Vue3 + Vite6 + Pinia(setup store) + naive-ui
- **架构红利落地**：排盘改为前端直接 `import { compile } from '@najia/core'` 本地算，无后端往返（paipan chunk 220KB 含 core+tyme4ts，已打进 bundle）
- 标准分层：views/(PaipanView,HistoryView) + components/(HexagramDisplay,InterpretDialog) + stores/ + api/ + router/ + types/
- **修掉的旧 bug**：
  - store 里调 useMessage()（反模式）→ 移到组件层，store 纯数据
  - window.location.href 整页刷新 → router.push
  - InterpretDialog 假模拟数据 → 改调真 API（/api/v1/interpret）
  - 爻位显示：上爻在顶倒序渲染，世应用 index+1 对齐 core 的 1-based shiy，dong 用 0-based
- types 直接复用 @najia/core（HexagramResult/YaoParam/Gender），不再手抄
- vfonts 字体依赖已移除（naive-ui 不强依赖）
- **注意**：interpret API 仍指向旧 api.py 的假规则引擎，待阶段 D Hono server 替换
- 旧 najia-web 未删，待 server 完成后一并清理

## 阶段 A+B 完成记录（2026-06-10）

- monorepo：pnpm-workspace.yaml + packages/core + apps/(web,server 待建)
- core 源码：const/hexagram/time-analysis/compile/types/index，全 strict 类型通过（关了 noUncheckedIndexedAccess，查表密集）
- 对拍：legacy Python 生成 264 条黄金（64静卦+200随机动爻+节气边界日），TS compile 逐字段比对 **265 passed**
- 独立正确性测试 correctness.test.ts **164 passed**（不依赖 Python，验传统口诀/卦表）：
  - 六神起例口诀全 10 干
  - 旬空全六十甲子 → 六旬空亡
  - **京房八宫六十四卦全表**：64 卦卦宫+世爻+应爻逐一核对标准卦序（最强验证）
  - 月破全六冲对 + 12 支两两穷举
- **合计 433 测试全绿**（265 对拍 + 168 正确性）+ 类型检查通过
- `pnpm --filter @najia/core build` 产物齐全（.js + .d.ts）
- Python 旧码已移入 legacy/ 作对拍基准，勿删

## 深度审查修复记录（2026-06-10）

code-reviewer 子代理审查 core 全量，发现并修复时间层 3 个问题（纯算法部分逐字段核验无误）：

1. **日柱 23 点滚动自相矛盾（真 bug，已修）**：getDaily 原用 `eightChar.getDay()`，tyme4ts 在 23:00 把日柱滚到次日 → god6 跟着滚，但 xkong/ri_chen 走 `getLunarDay()` 不滚 → 同一卦 god6 基于次日、旬空基于当日。改 getDaily 日柱为 `getLunarHour().getLunarDay().getSixtyCycle()`，四柱与 Python getBaZi 全对齐。黄金数据小时只到 22 点正好绕过，故 265 对拍没抓到。已加 23 点边界回归测试
2. **无 date 用 UTC + 字段缺失（已修）**：原 `new Date().toISOString()` 取 UTC，且无 date 时 yue_zhi/ri_chen/yue_ling 全不附加。**决策：core 时区中立，用本地墙钟**（用户端浏览器本地时区天然正确，不焊 Asia/Shanghai）。新增 localNow() 构造本地时间走正常 date 分支，同时修掉时区+字段缺失。注：Python 无 date 分支本身是坏的（yue_zhi 取成月柱天干'甲'），不对齐
3. **palace 末尾 return 0 掩盖错误（已修）**：非法卦码会返回假"乾宫"，改 throw 与 Python fail-fast 对齐。已加回归测试

**solar 字段后缀 `+00:00`**：继承 Python arrow 默认 UTC 约定，纯展示标签，不影响干支算法（只用 y/mo/d/h 分量）。保留以维持对拍绿

**关键教训**：对拍只保证「与 Python 一致」，抓不到 Python 自洽但黄金数据未覆盖的洞（23点）。独立正确性测试 + 边界回归才是真防线

## 阶段 C 完成记录：前端重构（2026-06-10）

- apps/web：Vue 3 + Vite 6 + Pinia(setup store) + Naive UI，依赖 @najia/core
- **架构红利落地**：排盘改为前端直接 `compile()` 本地算（paipan chunk 220KB 含 core+tyme4ts），无后端往返。仅 AI interpret 走后端
- 目录分层：views/(PaipanView,HistoryView) + components/(HexagramDisplay,InterpretDialog) + stores/ + api/(仅 interpret) + router/ + types/(复用 @najia/core)
- **修掉的旧问题**：
  - store 里的 useMessage() 反模式 → 移到组件层（store 不碰组件级 API）
  - window.location.href 整页刷新 → router.push
  - components/ 混页面与组件 → 拆 views/
  - InterpretDialog 假模拟数据 → 改调真 API（interpret.ts）
  - 弃用 axios，改 fetch（少依赖）；去掉 vfonts（未声明依赖）
- 显示修正：爻位倒序渲染（上爻在顶），世应用 index+1 对齐 1-based shiy
- 验证：`pnpm --filter @najia/web build` 通过、vue-tsc 类型检查 0 错、dev server HTTP 200、core 433 测试仍绿
- 注意：index bundle 1.4MB（Naive UI 全量），后续可按需引入优化
- najia-web/（旧前端）仍在根目录，待确认删除

## Hono 后端完成记录（2026-06-10）

- apps/server：Hono + @hono/node-server，端口 8787（vite 代理已对齐）
- 模块：config（getConfig 读 env）/ types / rule-engine / ai-client / index
- **真规则引擎** runRuleEngine：五行分布 + 世应关系 + 月令旺衰 + 动爻分析 + 吉凶打分，替换 legacy api.py 的写死占位（定位：启发式可解释规则，非深度断卦）
- ai-client：prompt 移植自 legacy ai_client.py（老师傅风格），调 NVIDIA NIM
- 安全修复：CORS 不再 '*'+credentials，改 allowedOrigins 白名单；key 走 env
- 优雅降级：无 NVIDIA_API_KEY 时返回规则分析 + 提示，不崩
- env 用 Node 原生 --env-file-if-exists，无 dotenv 依赖
- 端到端验证：health 200 / interpret 真规则输出 / 空 body 400 / 无 key 降级
- 全 workspace 类型检查通过，core 测试 433 全绿

## 清理遗留 + 待办盘点（2026-06-10）

- 删 `najia-web/`（旧前端，已被 apps/web 取代，trash 可恢复）
- 重写 `README.md`：旧版还写 Python FastAPI 架构，已改为 TS monorepo 现状
- 根目录现极干净：README + notepad + apps/packages/legacy/docs

### 待优化项（盘点，未做，等用户挑）
- [ ] apps/server/.env.example 缺失（需 NVIDIA key 但无示范）
- [ ] 新 apps 无 lint/format 配置（旧 najia-web 有，未迁移）
- [ ] server 无输入校验/限流（AI 花钱接口裸奔）
- [ ] server rule-engine 无测试覆盖
- [ ] **深度断卦**：当前 rule-engine 是启发式打分，非专业断卦体系（用神取用/应期推算等）— 用户已确认后续处理

## AI 模型切换记录（2026-06-10）

- **从 NVIDIA NIM（DeepSeek/GLM 双模型）切换到 LongCat 单模型**
- endpoint: `https://api.longcat.chat/openai`，模型 `LongCat-2.0-Preview`
- 环境变量改名：`NVIDIA_*` → `LONGCAT_API_KEY/LONGCAT_BASE_URL/LONGCAT_MODEL`
- 去掉双模型分支：ai-client 不再有 deepseek/glm 选择，config 单 model 字段
- 前端 InterpretDialog 删掉模型选择 UI（n-radio-group）+ selectedModel ref
- types（前后端）删掉 model 字段
- 真实 key 在 `apps/server/.env`（git 忽略，已确认未跟踪），示范在 `.env.example`
- ✅ 真实 LongCat 调用验证成功（返回高质量谦卦专业解读）
- 旧 NVIDIA key 仍需用户去控制台吊销（待办第1项不变）

## 模型切换 + prompt 改版（2026-06-10）

- **LongCat 替换 NVIDIA**：config 用 LONGCAT_*（key 在 apps/server/.env，已 gitignore），单模型 LongCat-2.0-Preview，endpoint https://api.longcat.chat/openai。删掉前端模型选择器 + 双模型分支
- **prompt 去戏腔**：SYSTEM_PROMPT 从"老师傅讲故事"改为"六爻解读分析师"，结构化输出（结论→依据→建议），明确禁戏腔/鸡汤，守医疗法律投资边界
- **旧 NVIDIA key**：用户决定完全不管（已废弃，git 历史不重写）。注：key 曾推送到公开 GitHub Fat-Jan/najia-paipan，大概率已泄露，但用户接受
- **server ESM 后缀 bug**：同 core 的坑，server 源码相对导入也补了 .js 后缀（Node 原生 import dist 才不崩，tsx dev 能容忍所以之前没暴露）
- **解读测试集**：apps/server/test/interpret-samples.mjs（5 卦例覆盖事业/感情/投资/健康/空问题+23点边界），真实调 LongCat 验证。效果良好：用神取用准、旺衰有据、结构清晰、边界守得住

## 待办三项完成记录（2026-06-10）

### 1. server 输入校验 + 限流 + 健壮性
- validation.ts：校验 mark（6位01）、question 长度≤500、数组长度≤8；内存级固定窗口限流（每IP 10次/分钟，标注不跨实例/重启不保留）
- **rule-engine 健壮性修复**：原代码假设 shiy/qinx 等字段必存在，缺字段时 `judgeJixiong` 解构 undefined 崩 500。已全字段加 `?? []` 防御，缺失返回"信息不全"而非崩溃
- 教训：不能默认上游数据完整——校验拦非法 + 内部容错，两层都要
- 测试：validation 14 + rule-engine 8（专测缺失字段），共 22 绿
- index.ts 接入：限流→校验→规则引擎→AI，getConnInfo 取 IP

### 2. batch 排盘移植 → core.compileBatch()
- **架构判断**：legacy 用 ThreadPoolExecutor 并行是因 Python 服务端排盘；新架构排盘在前端本地、compile 同步<10ms，JS 单线程下线程池无意义
- 实现：core 加 `compileBatch(inputs[])`，map + 错误隔离（单项失败不影响其余），返回 {items, successCount, errorCount}
- 不需要 server 端点、不需要并发。前端可直接 import 本地批量排盘
- 测试覆盖错误隔离，core 437 绿

### 3. bundle 优化（naive-ui 按需引入）
- unplugin-vue-components + NaiveUiResolver 自动按需引入组件；unplugin-auto-import 自动导入 useMessage 等
- manualChunks 拆 vendor：naive-ui(624K/gzip178K，独立可缓存) + najia(core+tyme4ts 219K) + index(33K) + PaipanView(212K)
- **主入口 chunk 1.44MB → 33KB**（业务入口），naive-ui 独立 chunk 浏览器可长期缓存
- 自动生成的 auto-imports.d.ts/components.d.ts 已入 gitignore（首次 build 自动重生成）
- gitignore 同步：`**/dist/` 替代失效的 najia-web/dist/

**全量验证**：core 437 + server 22 + legacy 30 测试全绿，全包类型检查通过

## 深度断卦完成记录（2026-06-10，增强规则+AI权衡路线）

**先验证后实现**：A/B 实验（3经典卦例×2 prompt）证伪"必须写规则库"——当前 prompt 已能正确取用神/判旺衰，AI 唯一硬伤是**瞎编变爻干支**（谦卦曾编"子孙化兄弟"）。

**据此做两件事（省一个量级，未写规则库）**：
1. SYSTEM_PROMPT 并入方法论框架：用神取用表/旺衰判断/原神忌神仇神体系/动变关系/应期方法 + "只依据给定数据不臆造"硬约束
2. buildUserPrompt 喂 core 已算出的**变卦逐爻六亲纳甲 + 伏神逐爻**（types 加 bian_qin6/bian_qinx/hide_* 扁平字段，前端 InterpretDialog 补传）

**完整验证（4卦例新版重跑）**：3/4 成功，变爻全部与 core 真值吻合（不再瞎编），用神取用全对（事业官鬼/投资妻财/婚恋官鬼）。第4卦健康类被 LongCat **security_audit_fail**（医疗内容审核）拦截——非代码 bug，已加错误处理转友好提示（识别 security/audit/safety → "解读内容未通过模型安全审核，请调整问题或稍后重试"）。

**未提交**：本批深度断卦改动 + 前几批（校验限流/batch/bundle）都待 commit。

## P2 深度断卦完成记录（2026-06-12，暗动/日破 + 应期 + 主用神）

**承接 P0+B（原忌仇神/卦身），补完 P2 两项 + 一处收敛。** 设计/计划见 `docs/plans/2026-06-12-day-dynamics-yingqi-{design,plan}.md`。

**设计哲学（延续前批）**：确定的算死喂 AI，有流派分歧/依赖卦象综合的留给 AI。暗动/日破是二值事实可算死；应期含预测成分，只算死候选地支+贴固定语义，最终取舍留 AI。

**三项产出（core）**：
1. **暗动/日破** `calcDayDynamics`（time-analysis.ts）：静爻被日辰冲 + 旺相=暗动、休囚=日破（《增删卜易》主流派）。compile 内恒算
2. **应期候选地支** `calcYingQi`（time-analysis.ts）：用神地支 → 逢值(本支)/逢冲(冲支)/逢合(LIUHE_MAP)/出空(旬空时本支)，每类贴固定语义。**不在 core compile 算**（依赖问题推断的主用神），由前端 markYongShen 后调用、走 gua_shen 同款透传链
3. **主用神选取** `pickPrimary`（yongshen.ts）：多现按 动爻>临世应>首现 选出，补 `primary_pos`/`primary_zhi`。把原来 note 里的文字规则兑现成代码
4. **冲判定收敛**：三处重复（time-analysis CHONG_MAP / relation 私有 isChong / 月破）收敛到 const.ts 单一 `isChong`（索引差6）+ 新增 `LIUHE_MAP`（六合无数学规律必须显式表）。每处等价替换，对拍兜底

**关键坑（必记教训）**：`qinx` 实为**三字**「干支+五行」（如「甲子水」），地支在 `[1]`、五行在 `[2]`。我误用 `slice(-1)` 取末字 = 取成五行 → `primary_zhi="火"` 查地支表 miss → 应期候选全空、暗动全空。**单元测试当初喂的是假两字「甲子」，slice(-1) 碰巧取到地支 → 测试绿但生产崩**。教训：单元测试手造数据格式与生产 `compile()` 输出不一致 = 测试形同虚设。已修（两处改 `[1]`）+ 加 4 条用真实 compile() 驱动的集成测试堵洞（其中一条用第1爻冲支构造日辰，bug 态必红才算有效守卫）。

**验证**：core 496 测试全绿（+冲合/暗动/应期/主用神/集成）+ build 通过。LongCat 5 例实测验收通过——暗动/日破被 AI 引用（案例1「子日冲午为暗动」、案例4「辰被戌冲日破」），应期不再现场心算改引用 core 候选（案例4 用神辰土逢冲戌/逢合酉/逢值辰，正是 bug 修复后取对地支的证明）。案例5 一般类无用神 ying_qi=null 属预期。

**纯度审查**：core 9 文件 + prompt 全是六爻纳甲专有概念，无梅花/六壬/奇门/四柱算命混入。干支月建日辰只服务卦爻旺衰判断，不排八字命格。

**P2 已全部 commit**（2664c6f core / 4c13c25 透传链 / 17960e1 bug 修复 / 398bbcf 实测验收）。剩 P3 三合局/六合（依赖暗动、收益递减，暂缓）。

## P3 三合局/半合 + lint/format 工程化（2026-06-13，P1+P2 并行）

**用户拍板解冻 P3，与 lint/format 并行（写范围天然隔离：配置文件 vs core/src），两个后台 agent 跑、主控复核物证。**

**P3 三合局/半合（core）**：
- `SANHE_MAP`（const.ts）：四组显式表 申子辰→水/亥卯未→木/寅午戌→火/巳酉丑→金，每组带 `center`（中神=四正支子午卯酉）。半合不单建表，由 calcSanHe 在 SANHE_MAP 上动态识别（恰现两支）
- `calcSanHe(qinx)`（time-analysis.ts）：扫六爻地支 → 三支全现=三合局/两支=半合，输出 type/wuxing/zhis/positions/has_center/note。**地支取 `gz[1]`**（避开 P2 那个 slice(-1) 取成五行的坑）。语义边界：只算成局结构+化气方向，是否真成局起用留 AI
- types 加 `SanHeMatch`/`SanHe`，`HexagramResult.san_he`；compile 内**恒算**（只依赖六爻地支，同暗动路线，非应期的依赖主用神路线）
- 测试 +10（496→506），含真实 compile() 驱动的集成 describe（乾为天双局/坤为地双局）+ 守卫「qinx 三字取 [1] 而非五行字」脱节洞

**san_he 喂进 AI（透传链一条龙）**：前端 compile 的 `r.san_he` → 前端 InterpretRequest type（types/index.ts import+re-export SanHe）→ server HexagramData type → ai-client 三处（SYSTEM_PROMPT 已算定列表 + sanHeSection + 拼接）。InterpretDialog 显式列字段补 `san_he: r.san_he`
- **LongCat 7 卦例实测验收通过**（原 5 + 火天大有半合含中神 + 火山旅拱合无中神）：7/7 引用合局；**核心防失败模式成立**——案例2 乾为天双三合局全现，AI 正确断「静卦无动爻引化，三合不成局…潜力待激活」，没把「成局结构」误读成「已成局起用」；案例3 半合「拱合无力/合局受破坏」力度判断也对

**lint/format（配置层，未碰源码）**：
- 新建 `eslint.config.js`（ESLint 10 flat config，typescript-eslint + eslint-plugin-vue，per-dir globals）+ `.prettierrc` + `.prettierignore`
- 根 package.json 加 lint/lint:fix/format/format:check + devDeps
- **golden.json 加进 .prettierignore**（对拍黄金基准，格式化器不该碰）
- **trash 3 个 `_diag*` 诊断脚本**（开发期对拍调试草稿，对拍已绿使命完成，git rm）
- `pnpm format` 全量格式化 39 源码文件（golden.json 已 ignore 没动），format:check 转绿

**全量验证**：core 506 + server 22 测试全绿、全 workspace build/typecheck 通过、format:check 全绿。

**未做（留后续）**：P3 六合（六合无数学规律，LIUHE_MAP 已在 P2 建表，calc 未写）；三合局起用的动静引化判定（已交给 AI，未算死）。
