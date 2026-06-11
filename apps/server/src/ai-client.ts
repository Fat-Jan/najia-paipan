// AI 客户端 — 调 LongCat（OpenAI 兼容接口），prompt 移植自 legacy ai_client.py
import { getConfig } from './config.js'
import type { HexagramData } from './types.js'

const SYSTEM_PROMPT = `你是一名六爻纳甲解读分析师，熟悉六亲生克、世应关系、月令旺衰、旬空、动变等断卦方法。

【表达要求】
- 语气专业、平实、直接，像一名顾问在分析问题，不要装神弄鬼
- 不用"小友""老朽""且听我细细道来"这类戏腔，不堆砌排比和煽情
- 先给结论，再讲依据；术语点到为止，重点说它对用户问题意味着什么
- 不灌鸡汤、不空泛安慰；该说不利就说不利，同时说明可调整的空间

【分析方法】
- 用神：根据所问之事确定用神（如问事业看官鬼、问财看妻财、问健康看世爻/子孙）
- 旺衰：结合月令、日辰判断用神及相关爻的力量
- 世应：世为求测者，应为对方/外部环境，看生克与距离
- 动变：动爻主变化方向，变卦看结果走势；旬空、月破影响爻的有效性

【边界】
- 结论是基于卦象的概率性判断，不是确定的预言；明确这是参考，决定权在用户
- 不做医疗、法律、投资的专业承诺，涉及时建议咨询对应专业人士`

/** 构建用户 prompt（移植自 legacy _build_user_prompt） */
function buildUserPrompt(info: HexagramData, question: string): string {
  const userQuestion = question?.trim() || '一般占问事项'
  const dong = info.dong ?? []
  const dongStr = dong.length > 0 ? `第${dong.map((i) => i + 1).join('、')}爻` : '无动爻（静卦）'
  const yueLingStr = info.yue_ling && info.yue_ling.length > 0 ? info.yue_ling.join('、') : '未知'
  const [shi, ying] = info.shiy

  return `【用户问题】
${userQuestion}

【卦象信息】
主卦：${info.name}（${info.gong}宫）
卦符：${info.mark}
世爻位置：${shi ?? '未知'}爻
应爻位置：${ying ?? '未知'}爻

【六亲配卦】
六亲：${(info.qin6 ?? []).join(', ')}
纳甲五行：${(info.qinx ?? []).join(', ')}
六神：${(info.god6 ?? []).join(', ')}

【时空状态】
月令旺衰：${yueLingStr}
月建：${info.yue_zhi ?? '未知'}月
日辰：${info.ri_chen ?? '未知'}日
动爻：${dongStr}

【变卦信息】
${info.bian_name ? '有变卦：' + info.bian_name : '无变卦（静卦）'}
${info.hide_name ? '伏神：' + info.hide_name : ''}

【解读要求】
1. 先明确"${userQuestion}"对应的用神是哪个六亲
2. 判断用神及相关爻的旺衰，结合世应、动变、旬空分析对该问题的影响
3. 按以下结构输出：
   - 结论：直接给出对这个问题的判断（有利/不利/需观望，及大致程度）
   - 依据：说明卦象上是怎么得出这个结论的（用神旺衰、世应生克、动变走势）
   - 建议：基于分析给出可操作的方向
4. 语气专业平实，不用戏腔，不灌鸡汤
5. 若问题不明确，按卦象整体给出通用分析，并说明信息不足之处

请开始分析。`
}

/** 调 LongCat 解读卦象。 */
export async function interpretHexagram(
  info: HexagramData,
  question: string,
): Promise<string> {
  const cfg = getConfig()
  if (!cfg.apiKey) {
    throw new Error('未配置 LONGCAT_API_KEY，无法调用 AI 解读')
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(info, question) },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI API 错误 (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回内容为空')
  return content
}
