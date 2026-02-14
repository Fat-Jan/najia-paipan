# 六爻卦象智能解读系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现六爻卦象智能解读功能，结合 AI 大模型 (DeepSeek/GLM-4) 和规则引擎，提供包含卦象含义、吉凶判断、建议指导的完整解读。

**Architecture:**

- 后端: Python FastAPI 新增 `/api/v1/interpret` 端点，集成 NVIDIA NIM API 调用 DeepSeek/GLM-4
- 规则引擎: 基于六亲、五行、世应、月令、旬空等组合的规则库
- 前端: Vue 组件新增解读展示区域，支持展开/收起

**Tech Stack:**

- 后端: Python FastAPI, requests, NVIDIA NIM API
- 前端: Vue 3, TypeScript, Naive UI
- AI: DeepSeek-R1 via NVIDIA NIM

---

## Task 1: 后端 - 配置管理

**Files:**

- Modify: `najia/najia/config.py`

**Step 1: 添加 NVIDIA API 配置**

```python
# 在 config.py 中添加
class NVIDIAConfig:
    API_KEY: str = "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"
    BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DEFAULT_MODEL: str = "deepseek-ai/deepseek-r1"
    GLM_MODEL: str = "glm-4"  # 如果可用

nvidia_config = NVIDIAConfig()
```

**Step 2: 验证配置**

Run: `python -c "from najia.config import nvidia_config; print(nvidia_config.API_KEY[:20])"`
Expected: 输出配置正确

---

## Task 2: 后端 - AI 客户端封装

**Files:**

- Create: `najia/najia/ai_client.py`

**Step 1: 编写 AI 客户端**

```python
"""
NVIDIA NIM AI 客户端
支持 DeepSeek-R1 和 GLM-4 模型
"""
import requests
from typing import Optional, List, Dict, Any
from .config import nvidia_config


class AIClient:
    """AI 大模型客户端"""

    def __init__(self, model: Optional[str] = None):
        self.api_key = nvidia_config.API_KEY
        self.base_url = nvidia_config.BASE_URL
        self.model = model or nvidia_config.DEFAULT_MODEL

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """发送聊天请求"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )

        if response.status_code != 200:
            raise Exception(f"AI API Error: {response.text}")

        result = response.json()
        return result["choices"][0]["message"]["content"]

    def interpret_hexagram(
        self,
        hexagram_info: Dict[str, Any],
        question: str,
    ) -> str:
        """解读卦象"""
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(hexagram_info, question)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        return self.chat(messages)

    def _build_system_prompt(self) -> str:
        return """你是一位专业的六爻卦象解读大师，精通易经六爻预测。
你需要根据卦象信息，结合六亲、五行、世应、月令、旬空等要素，进行全面而专业的解读。
解读内容包括：
1. 卦象本身：卦名含义、卦象象征
2. 吉凶判断：根据五行生克、世应关系、月令旺衰判断吉凶
3. 建议指导：提供行动建议和注意事项

请用流畅的中文回复，条理清晰，重点突出。"""

    def _build_user_prompt(self, info: Dict[str, Any], question: str) -> str:
        return f"""请解读以下六爻卦象：

求问事项：{question}

卦象信息：
- 卦名：{info.get('name', '未知')}
- 卦宫：{info.get('gong', '未知')}
- 卦符：{info.get('mark', '未知')}
- 世爻位置：{info.get('shi_position', '未知')}爻
- 应爻位置：{info.get('ying_position', '未知')}爻
- 六亲：{', '.join(info.get('qin6', []))}
- 纳甲五行：{', '.join(info.get('qinx', []))}
- 六神：{', '.join(info.get('god6', []))}
- 月令旺衰：{', '.join(info.get('yue_ling', []))}
- 月建：{info.get('yue_zhi', '未知')}月
- 日辰：{info.get('ri_chen', '未知')}日
- 动爻：{info.get('dong', [])}
- 变卦：{info.get('bian_name', '无')}
- 伏神：{info.get('hide_name', '无')}

请给出详细解读。"""
```

**Step 2: 测试 AI 客户端**

Run: `python -c "from najia.ai_client import AIClient; c = AIClient(); print('AI Client OK')"`
Expected: 输出 "AI Client OK"

---

## Task 3: 后端 - 规则引擎

**Files:**

- Create: `najia/najia/rule_engine.py`

**Step 1: 编写规则引擎**

```python
"""
六爻规则引擎
基于六亲、五行、世应、月令等组合判断
"""
from typing import Dict, Any, List, Tuple


class HexagramRuleEngine:
    """六爻规则引擎"""

    # 五行生克
    WUXING_SHENG = {
        '木生火': '木->火', '火生土': '火->土', '土生金': '土->金',
        '金生水': '金->水', '水生木': '水->木',
    }

    WUXING_KE = {
        '木克土': '木->土', '土克水': '土->水', '水克火': '水->火',
        '火克金': '火->金', '金克木': '金->木',
    }

    # 月令旺衰
    YUELING_WANGSHUAI = {
        '旺': '得令当权',
        '相': '次之',
        '休': '退气',
        '囚': '衰落',
        '死': '受克无用',
    }

    @staticmethod
    def analyze(hexagram_info: Dict[str, Any]) -> Dict[str, Any]:
        """综合分析卦象"""
        result = {
            'wuxing_balance': HexagramRuleEngine._analyze_wuxing(hexagram_info),
            'shiy_relation': HexagramRuleEngine._analyze_shiy(hexagram_info),
            'yueling_status': HexagramRuleEngine._analyze_yueling(hexagram_info),
            'dongyao_analysis': HexagramRuleEngine._analyze_dongyao(hexagram_info),
            'jixiong': HexagramRuleEngine._judge_jixiong(hexagram_info),
        }
        return result

    @staticmethod
    def _analyze_wuxing(info: Dict[str, Any]) -> str:
        """分析五行平衡"""
        qinx = info.get('qinx', [])
        if not qinx:
            return "五行信息缺失"

        wuxing_count = {'木': 0, '火': 0, '土': 0, '金': 0, '水': 0}
        for q in qinx:
            for w in ['木', '火', '土', '金', '水']:
                if w in q:
                    wuxing_count[w] += 1

        max_elem = max(wuxing_count, key=wuxing_count.get)
        return f"五行分布：{wuxing_count}，{max_elem}元素偏旺"

    @staticmethod
    def _analyze_shiy(info: Dict[str, Any]) -> str:
        """分析世应关系"""
        shiy = info.get('shiy', [])
        if len(shiy) < 2:
            return "世应信息缺失"

        shi_idx = shiy[0] - 1  # 0-based
        ying_idx = shiy[1] - 1

        diff = abs(shi_idx - ying_idx)
        if diff == 3:
            return "世应相距三位，应生世为吉"
        elif diff == 0:
            return "世应同位，建议谨慎"
        else:
            return f"世应关系：世在{shi_idx+1}爻，应在{ying_idx+1}爻"

    @staticmethod
    def _analyze_yueling(info: Dict[str, Any]) -> str:
        """分析月令旺衰"""
        yue_ling = info.get('yue_ling', [])
        if not yue_ling:
            return "月令信息缺失"

        # 统计旺衰
        wang_count = yue_ling.count('旺') + yue_ling.count('相')
        shuai_count = yue_ling.count('死') + yue_ling.count('囚')

        if wang_count > shuai_count:
            return "整体月令偏旺，卦象有力"
        elif shuai_count > wang_count:
            return "整体月令偏衰，卦象乏力"
        else:
            return "月令平衡，需综合判断"

    @staticmethod
    def _analyze_dongyao(info: Dict[str, Any]) -> str:
        """分析动爻"""
        dong = info.get('dong', [])
        if not dong:
            return "无动爻，静卦"

        return f"有{len(dong)}个动爻：{dong}，主变化"

    @staticmethod
    def _judge_jixiong(info: Dict[str, Any]) -> str:
        """判断吉凶"""
        yue_ling = info.get('yue_ling', [])
        dong = info.get('dong', [])
        shiy = info.get('shiy', [])

        # 简单规则判断
        score = 0

        # 动爻加分
        score += len(dong) * 10

        # 月令旺相加分
        wang_count = yue_ling.count('旺') + yue_ling.count('相')
        score += wang_count * 15

        # 死囚减分
        shuai_count = yue_ling.count('死') + yue_ling.count('囚')
        score -= shuai_count * 10

        if score >= 40:
            return "大吉"
        elif score >= 20:
            return "中吉"
        elif score >= 0:
            return "平吉"
        elif score >= -20:
            return "小凶"
        else:
            return "大凶"
```

**Step 2: 测试规则引擎**

Run: `python -c "from najia.rule_engine import HexagramRuleEngine; r = HexagramRuleEngine.analyze({'qinx': ['甲午火', '乙未土'], 'yue_ling': ['旺', '相'], 'dong': [2]}); print(r)"`
Expected: 输出分析结果

---

## Task 4: 后端 - 解读 API 端点

**Files:**

- Modify: `api.py`

**Step 1: 添加解读请求模型**

```python
class InterpretRequest(BaseModel):
    """卦象解读请求"""
    hexagram_data: Dict[str, Any] = Field(..., description="卦象数据")
    question: str = Field(default="", description="求问事项")
    model: str = Field(default="deepseek", description="使用的模型: deepseek/glm")

class InterpretResponse(BaseModel):
    """卦象解读响应"""
    hexagram_name: str
    jixiong: str
    rule_analysis: Dict[str, Any]
    ai_interpretation: str
```

**Step 2: 添加解读端点**

```python
@app.post("/api/v1/interpret", response_model=InterpretResponse)
async def interpret_hexagram(request: InterpretRequest):
    """六爻卦象智能解读"""
    from najia.ai_client import AIClient
    from najia.rule_engine import HexagramRuleEngine

    hex_data = request.hexagram_data

    # 1. 规则引擎分析
    rule_result = HexagramRuleEngine.analyze(hex_data)

    # 2. 构建 AI 解读
    model_map = {
        "deepseek": "deepseek-ai/deepseek-r1",
        "glm": "glm-4",  # 如果可用
    }

    model = model_map.get(request.model, "deepseek-ai/deepseek-r1")
    ai_client = AIClient(model=model)

    hex_info = {
        'name': hex_data.get('name'),
        'gong': hex_data.get('gong'),
        'mark': hex_data.get('mark'),
        'shi_position': hex_data.get('shiy', [0])[0],
        'ying_position': hex_data.get('shiy', [0])[1],
        'qin6': hex_data.get('qin6', []),
        'qinx': hex_data.get('qinx', []),
        'god6': hex_data.get('god6', []),
        'yue_ling': hex_data.get('yue_ling', []),
        'yue_zhi': hex_data.get('yue_zhi'),
        'ri_chen': hex_data.get('ri_chen'),
        'dong': hex_data.get('dong', []),
        'bian_name': hex_data.get('bian', {}).get('name'),
        'hide_name': hex_data.get('hide', {}).get('name'),
    }

    ai_result = ai_client.interpret_hexagram(hex_info, request.question)

    return InterpretResponse(
        hexagram_name=hex_data.get('name', '未知'),
        jixiong=rule_result.get('jixiong', '未知'),
        rule_analysis=rule_result,
        ai_interpretation=ai_result,
    )
```

---

## Task 5: 前端 - 解读类型定义

**Files:**

- Modify: `najia-web/src/types/index.ts`

**Step 1: 添加解读类型**

```typescript
export interface InterpretRequest {
  hexagram_data: PaipanResponse;
  question: string;
  model?: "deepseek" | "glm";
}

export interface InterpretResponse {
  hexagram_name: string;
  jixiong: string;
  rule_analysis: {
    wuxing_balance: string;
    shiy_relation: string;
    yueling_status: string;
    dongyao_analysis: string;
    jixiong: string;
  };
  ai_interpretation: string;
}
```

---

## Task 6: 前端 - API 调用

**Files:**

- Modify: `najia-web/src/api/najia.ts`

**Step 1: 添加解读 API**

```typescript
export const api = {
  // ... 现有方法

  async interpret(
    hexagramData: PaipanResponse,
    question: string,
    model: "deepseek" | "glm" = "deepseek",
  ): Promise<InterpretResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/interpret`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hexagram_data: hexagramData,
        question: question,
        model: model,
      }),
    });
    if (!res.ok) {
      const error = (await res.json()) as ApiError;
      throw new Error(error.detail ?? "解读失败");
    }
    return res.json();
  },
};
```

---

## Task 7: 前端 - 解读组件

**Files:**

- Create: `najia-web/src/components/InterpretDialog.vue`

**Step 1: 编写解读弹窗组件**

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  NModal,
  NCard,
  NSpin,
  NAlert,
  NButton,
  NCollapse,
  NCollapseItem,
  NTabs,
  NTabPane,
} from "naive-ui";
import { usePaipanStore } from "../stores/paipan";
import { storeToRefs } from "pinia";
import { api } from "../api/najia";
import type { InterpretResponse } from "../types";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const paipanStore = usePaipanStore();
const { result, title, loading } = storeToRefs(paipanStore);

const interpreting = ref(false);
const interpretResult = ref<InterpretResponse | null>(null);
const interpretError = ref("");
const selectedModel = ref<"deepseek" | "glm">("deepseek");

async function startInterpret() {
  if (!result.value) return;

  interpreting.value = true;
  interpretError.value = "";

  try {
    interpretResult.value = await api.interpret(
      result.value,
      title.value || "一般占问",
      selectedModel.value,
    );
  } catch (e) {
    interpretError.value = e instanceof Error ? e.message : "解读失败";
  } finally {
    interpreting.value = false;
  }
}

function handleClose() {
  emit("update:show", false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="卦象解读"
    style="width: 90%; max-width: 700px"
    @update:show="handleClose"
  >
    <NSpin :show="interpreting">
      <NAlert v-if="interpretError" type="error" :title="interpretError" />

      <template v-if="!interpretResult && !interpreting">
        <div class="intro">
          <p>选择 AI 模型开始解读：</p>
          <NRadioGroup v-model:value="selectedModel" style="margin: 16px 0">
            <NRadio value="deepseek">DeepSeek-R1 (推荐)</NRadio>
            <NRadio value="glm">GLM-4</NRadio>
          </NRadioGroup>
          <NButton type="primary" @click="startInterpret" :disabled="!result">
            开始智能解读
          </NButton>
        </div>
      </template>

      <template v-else-if="interpretResult">
        <NCard title="吉凶判断" size="small" class="result-card">
          <NTag
            :type="interpretResult.jixiong.includes('吉') ? 'success' : 'error'"
            size="large"
          >
            {{ interpretResult.jixiong }}
          </NTag>
        </NCard>

        <NCard title="规则分析" size="small" class="result-card">
          <div class="analysis-item">
            <span class="label">五行平衡：</span>
            {{ interpretResult.rule_analysis.wuxing_balance }}
          </div>
          <div class="analysis-item">
            <span class="label">世应关系：</span>
            {{ interpretResult.rule_analysis.shiy_relation }}
          </div>
          <div class="analysis-item">
            <span class="label">月令状态：</span>
            {{ interpretResult.rule_analysis.yueling_status }}
          </div>
          <div class="analysis-item">
            <span class="label">动爻分析：</span>
            {{ interpretResult.rule_analysis.dongyao_analysis }}
          </div>
        </NCard>

        <NCard title="AI 智能解读" size="small" class="result-card">
          <div class="ai-content">
            {{ interpretResult.ai_interpretation }}
          </div>
        </NCard>
      </template>
    </NSpin>

    <template #footer>
      <NButton @click="handleClose">关闭</NButton>
      <NButton
        v-if="interpretResult"
        type="primary"
        @click="startInterpret"
        style="margin-left: 8px"
      >
        重新解读
      </NButton>
    </template>
  </NModal>
</template>

<style scoped>
.intro {
  text-align: center;
  padding: 20px;
}

.result-card {
  margin-bottom: 12px;
}

.analysis-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-item .label {
  font-weight: 600;
  color: #666;
}

.ai-content {
  white-space: pre-wrap;
  line-height: 1.8;
}
</style>
```

---

## Task 8: 前端 - 集成解读组件

**Files:**

- Modify: `najia-web/src/components/Paipan.vue`

**Step 1: 添加解读按钮和弹窗**

在模板中找到结果展示区域，添加解读按钮：

```vue
<!-- 在结果卡片头部添加 -->
<div class="result-header">
  <h2>{{ result.name }} ({{ result.gong }}宫)</h2>
  <div>
    <NButton size="small" type="primary" @click="showInterpret = true">
      智能解读
    </NButton>
    <NButton size="small" type="primary" @click="shareResult" :loading="sharing" style="margin-left: 8px">
      分享
    </NButton>
  </div>
</div>
```

**Step 2: 引入解读弹窗**

```typescript
import InterpretDialog from "./InterpretDialog.vue";

const showInterpret = ref(false);
```

---

## Task 9: 整体测试

**Step 1: 启动后端**

Run: `cd naijia-liubo && python -m uvicorn api:app --port 8000`

**Step 2: 启动前端**

Run: `cd najia-web && npm run dev`

**Step 3: 测试流程**

1. 打开浏览器访问 http://localhost:5173
2. 点击"起卦"按钮
3. 等待排盘结果显示
4. 点击"智能解读"按钮
5. 等待 AI 解读完成
6. 验证结果展示

---

## 完成标准

- [ ] 后端 AI 客户端可以正常调用 NVIDIA NIM API
- [ ] 规则引擎返回正确的分析结果
- [ ] 前端可以发起解读请求
- [ ] 完整流程测试通过
