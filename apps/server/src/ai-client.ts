// AI 客户端 — 调 LongCat（OpenAI 兼容接口），prompt 移植自 legacy ai_client.py
import { getConfig } from './config.js'
import type { HexagramData } from './types.js'

const SYSTEM_PROMPT = `你是一名六爻纳甲解读分析师，熟悉六亲生克、世应关系、月令旺衰、旬空、动变等断卦方法。

【表达要求】
- 语气专业、平实、直接，像一名顾问在分析问题，不要装神弄鬼
- 不用"小友""老朽""且听我细细道来"这类戏腔，不堆砌排比和煽情
- 先给结论，再讲依据；术语点到为止，重点说它对用户问题意味着什么
- 不灌鸡汤、不空泛安慰；该说不利就说不利，同时说明可调整的空间

【断卦方法论框架】按以下流程逐步推理：
1. 用神取用：依所问之事定用神
   - 财运/求财 → 妻财；事业/官职/功名/女问婚（夫星）→ 官鬼
   - 子女/晋升喜讯/平安/医药 → 子孙；文书/合同/房产/学业/长辈/男问婚（妻星看妻财）→ 父母
   - 兄弟/朋友/竞争/合伙 → 兄弟；问自身则兼看世爻
2. 用神旺衰：逐项核对——月令（旺相休囚死）、日辰（生扶或克泄）、是否旬空、是否月破。综合定用神强弱
3. 原神/忌神/仇神：生用神者为原神（助），克用神者为忌神（阻），生忌神者为仇神。看它们各自旺衰与动静
4. 世应与动变：世为求测者、应为对方/事体，看生克距离；动爻主变化，变爻回头生/克用神决定走势；旬空月破之爻力量打折
5. 综合权衡：上述信号常相互矛盾（如用神旺却旬空、动而化回头克），需判断当前哪个因素主导，给出倾向性结论，不要简单罗列
6. 应期：依逢值、逢冲、逢合、出空等推估可能的时间节点

【重要约束】
- 只依据下方给出的卦象数据推理，不要臆造爻的干支、六亲或变爻配置；数据未提供的不要编造
- 变卦逐爻数据若已给出，动爻的变爻以该数据为准，不可自行推演

【边界】
- 结论是基于卦象的概率性判断，不是确定的预言；明确这是参考，决定权在用户
- 不做医疗、法律、投资的专业承诺，涉及时建议咨询对应专业人士`

/** 构建用户 prompt（移植自 legacy _build_user_prompt） */
function buildUserPrompt(info: HexagramData, question: string): string {
  const userQuestion = question?.trim() || '一般占问事项'
  const dong = info.dong ?? []
  const dongStr = dong.length > 0 ? `第${dong.map((i) => i + 1).join('、')}爻` : '无动爻（静卦）'
  const [shi, ying] = info.shiy

  // 变卦逐爻：动爻变出的卦象，给出每爻六亲/纳甲，避免 AI 臆造变爻配置
  let bianSection: string
  if (info.bian_name && info.bian_qin6 && info.bian_qinx) {
    const lines = info.bian_qin6.map((q, i) => {
      const dongMark = dong.includes(i) ? '（动）' : ''
      return `  第${i + 1}爻：${q}${info.bian_qinx?.[i] ?? ''}${dongMark}`
    })
    bianSection = `有变卦：${info.bian_name}\n变卦逐爻（动爻位置即变出之爻，以此为准）：\n${lines.join('\n')}`
  } else if (info.bian_name) {
    bianSection = `有变卦：${info.bian_name}`
  } else {
    bianSection = '无变卦（静卦）'
  }

  // 伏神逐爻：藏于卦下的六亲，标其所伏爻位
  let hideSection = ''
  if (info.hide_name && info.hide_qin6 && info.hide_seat) {
    const lines = info.hide_seat.map((seat) => {
      const q = info.hide_qin6?.[seat] ?? ''
      const x = info.hide_qinx?.[seat] ?? ''
      return `  伏于第${seat + 1}爻：${q}${x}`
    })
    hideSection = `\n伏神（${info.hide_name}）：\n${lines.join('\n')}`
  } else if (info.hide_name) {
    hideSection = `\n伏神：${info.hide_name}`
  }

  // 主卦逐爻一览：六亲+纳甲+六神对齐，便于 AI 定位用神与各爻关系
  const yaoLines = (info.qin6 ?? []).map((q, i) => {
    const x = info.qinx?.[i] ?? ''
    const g = info.god6?.[i] ?? ''
    const yl = info.yue_ling?.[i] ?? ''
    const flags: string[] = []
    if (shi === i + 1) flags.push('世')
    if (ying === i + 1) flags.push('应')
    if (dong.includes(i)) flags.push('动')
    const flagStr = flags.length > 0 ? `【${flags.join('')}】` : ''
    return `  第${i + 1}爻：${q}${x} ${g}${yl ? ` 月令${yl}` : ''}${flagStr}`
  })

  return `【用户问题】
${userQuestion}

【卦象信息】
主卦：${info.name}（${info.gong}宫）
卦符：${info.mark}
世爻位置：${shi ?? '未知'}爻　应爻位置：${ying ?? '未知'}爻

【主卦逐爻】（六亲·纳甲·六神·月令旺衰）
${yaoLines.join('\n')}

【时空状态】
月建：${info.yue_zhi ?? '未知'}　日辰：${info.ri_chen ?? '未知'}　动爻：${dongStr}

【变卦信息】
${bianSection}${hideSection}

【解读要求】
1. 先明确"${userQuestion}"对应的用神是哪个六亲，并指出它在第几爻
2. 按方法论框架逐步推理：用神旺衰 → 原神/忌神 → 世应动变 → 综合权衡
3. 按以下结构输出：
   - 结论：直接给出对这个问题的判断（有利/不利/需观望，及大致程度）
   - 依据：说明卦象上是怎么得出的（用神旺衰、世应生克、动变走势）
   - 建议：基于分析给出可操作的方向
   - 应期：若能判断，给出可能的时间节点及依据
4. 语气专业平实，不用戏腔，不灌鸡汤
5. 严格依据上方数据，不臆造爻的干支或变爻配置；信息不足则说明

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
    // 内容安全审核拦截（如健康/疾病类触发模型审核）转友好提示
    if (text.includes('security_audit_fail') || text.includes('security_error')) {
      throw new Error('AI 内容审核未通过，该问题可能涉及敏感领域，请换个角度提问或参考规则引擎分析')
    }
    throw new Error(`AI API 错误 (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回内容为空')
  return content
}
