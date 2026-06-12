// AI 客户端 — 调 LongCat（OpenAI 兼容接口），prompt 移植自 legacy ai_client.py
import { getConfig } from './config.js';
import type { HexagramData } from './types.js';

const SYSTEM_PROMPT = `你是一名六爻纳甲解读分析师，熟悉六亲生克、世应关系、月令旺衰、旬空、动变等断卦方法。

【表达要求】
- 语气专业、平实、直接，像一名顾问在分析问题，不要装神弄鬼
- 不用"小友""老朽""且听我细细道来"这类戏腔，不堆砌排比和煽情
- 先给结论，再讲依据；术语点到为止，重点说它对用户问题意味着什么
- 不灌鸡汤、不空泛安慰；该说不利就说不利，同时说明可调整的空间

【数据已算定，直接采用，勿自行推算】
下方卦象数据中，以下要素已由排盘程序按古法算定，你必须直接采用，不得自行重新推导（自行心算这些最易出错）：
- 用神取用（所问之事对应的六亲及其爻位）
- 原神/忌神/仇神（按六亲生克算定的助/阻/间接为害之神及其爻位）
- 各爻旬空/月破状态（已逐爻标注）
- 动爻的变爻配置及本→变关系（进退神/回头生克等，逐爻标注）
- 卦身
- 暗动/日破（日辰冲静爻：暗动=暗中得力、日破=被冲散，已逐爻算定）
- 应期候选地支（逢值/逢冲/逢合/出空，已贴固定语义；最终取舍结合卦象动静）
- 三合局/半合（六爻地支成局结构及化气方向已算定；是否真成局起用需结合动静月日）

【断卦方法论框架】在已算定数据基础上做综合推理：
1. 用神旺衰：依据已标注的月令旺衰（旺相休囚死）、日辰生克、旬空、月破，综合定用神强弱（数据已给，只需综合，勿自行推旬空/月破）
2. 原忌仇神动态：原神助用神、忌神阻用神、仇神助忌神为害。结合各自已标注的旺衰与动静，判断助力/阻力的实际强弱
3. 世应与动变：世为求测者、应为对方/事体，看生克距离；动爻变爻关系已算定，据此判走势；旬空月破之爻力量打折
4. 综合权衡：上述信号常相互矛盾（如用神旺却旬空、动而化回头克），需判断当前哪个因素主导，给出倾向性结论，不要简单罗列
5. 应期：候选地支已算定并贴语义（逢值/冲/合/出空），你只需结合用神动静空破选择主导应法并表述，不要自行推算冲合

【重要约束】
- 只依据下方给出的卦象数据推理，不要臆造爻的干支、六亲或变爻配置；数据未提供的不要编造
- 用神、原忌仇神、旬空、月破、变爻关系、卦身均已算定，直接采用，切勿自行重算或推翻

【边界】
- 结论是基于卦象的概率性判断，不是确定的预言；明确这是参考，决定权在用户
- 不做医疗、法律、投资的专业承诺，涉及时建议咨询对应专业人士`;

/** 构建用户 prompt（移植自 legacy _build_user_prompt） */
function buildUserPrompt(info: HexagramData, question: string): string {
  const userQuestion = question?.trim() || '一般占问事项';
  const dong = info.dong ?? [];
  const dongStr = dong.length > 0 ? `第${dong.map((i) => i + 1).join('、')}爻` : '无动爻（静卦）';
  const [shi, ying] = info.shiy;

  // 变卦逐爻：动爻变出的卦象，给出每爻六亲/纳甲，避免 AI 臆造变爻配置
  let bianSection: string;
  if (info.bian_name && info.bian_qin6 && info.bian_qinx) {
    const lines = info.bian_qin6.map((q, i) => {
      const dongMark = dong.includes(i) ? '（动）' : '';
      return `  第${i + 1}爻：${q}${info.bian_qinx?.[i] ?? ''}${dongMark}`;
    });
    bianSection = `有变卦：${info.bian_name}\n变卦逐爻（动爻位置即变出之爻，以此为准）：\n${lines.join('\n')}`;
  } else if (info.bian_name) {
    bianSection = `有变卦：${info.bian_name}`;
  } else {
    bianSection = '无变卦（静卦）';
  }

  // 伏神逐爻：藏于卦下的六亲，标其所伏爻位
  let hideSection = '';
  if (info.hide_name && info.hide_qin6 && info.hide_seat) {
    const lines = info.hide_seat.map((seat) => {
      const q = info.hide_qin6?.[seat] ?? '';
      const x = info.hide_qinx?.[seat] ?? '';
      return `  伏于第${seat + 1}爻：${q}${x}`;
    });
    hideSection = `\n伏神（${info.hide_name}）：\n${lines.join('\n')}`;
  } else if (info.hide_name) {
    hideSection = `\n伏神：${info.hide_name}`;
  }

  // 用神标记：把「问题→用神六亲→爻位 + 原忌仇神」确定化，AI 直接采用不必自行定位/推导
  let yongshenSection = '';
  if (info.yongshen) {
    const y = info.yongshen;
    if (y.yongshen) {
      const posStr = y.positions.length > 0 ? `第${y.positions.join('、')}爻` : '主卦不上卦';
      // 原忌仇神：core 按六亲生克环算定（生用神=原神/克用神=忌神/生忌神=仇神），AI 勿自行推导
      const roleLine = (label: string, r?: { qin: string; positions: number[] }): string => {
        if (!r || !r.qin) return '';
        const where = r.positions.length > 0 ? `第${r.positions.join('、')}爻` : '不上卦';
        return `${label}${r.qin}（${where}）`;
      };
      const roles = [
        roleLine('原神=', y.yuanshen),
        roleLine('忌神=', y.jishen),
        roleLine('仇神=', y.choushen),
      ]
        .filter(Boolean)
        .join('　');
      const roleSection = roles ? `\n原忌仇神（已算定，勿自行推导）：${roles}` : '';
      yongshenSection = `\n【用神取用（已据问题判定，直接采用）】\n类别：${y.category}　用神六亲：${y.yongshen}　位置：${posStr}${y.hidden ? `（伏于第${y.hidden_seat.join('、')}爻下）` : ''}\n${y.note}${roleSection}`;
    } else {
      yongshenSection = `\n【用神取用】\n${y.note}`;
    }
  }

  // 动变关系：逐动爻本→变全标（core 算好的卦级信号，AI 须采用，不可自行心算）
  let relationSection = '';
  if (info.yao_relation && info.yao_relation.changes.length > 0) {
    const lines = info.yao_relation.changes.map(
      (c) => `  - 第${c.pos}爻：${c.ben_zhi} → ${c.bian_zhi}，${c.note}`,
    );
    relationSection = `\n【动变关系（逐动爻已算定，须直接采用，勿自行推断进退神或生克）】\n${lines.join('\n')}`;
  }

  // 卦身（月卦身）：core 算好的事体定向信号，AI 参看（流派有争议，不强制主导）
  let guaShenSection = '';
  if (info.gua_shen) {
    guaShenSection = `\n【卦身（已算定，参看事体定向，勿自行起卦身）】\n  ${info.gua_shen.note}`;
  }

  // 暗动/日破：core 算定的日辰对静爻作用（AI 自行判日冲易错）
  let dayDynSection = '';
  if (info.day_dynamics && info.day_dynamics.note) {
    dayDynSection = `\n【暗动/日破（已算定，勿自行推日冲）】\n  ${info.day_dynamics.note}`;
  }

  // 应期候选地支：core 算定地支 + 固定语义，最终取舍留给 AI
  let yingQiSection = '';
  if (info.ying_qi && info.ying_qi.candidates.length > 0) {
    const lines = info.ying_qi.candidates
      .map((c) => `  ${c.type}：${c.zhi}（${c.semantic}）`)
      .join('\n');
    yingQiSection = `\n【应期候选（用神${info.ying_qi.zhi}，地支已算定，最终取舍结合用神动静空破）】\n${lines}`;
  }

  // 三合局/半合：core 扫六爻地支算定成局结构 + 化气方向，是否真成局起用留 AI
  let sanHeSection = '';
  if (info.san_he && info.san_he.matches.length > 0) {
    const lines = info.san_he.matches
      .map(
        (m) =>
          `  ${m.type}（化${m.wuxing}）：${m.zhis.join('')}，第${m.positions.join('、')}爻 — ${m.note}`,
      )
      .join('\n');
    sanHeSection = `\n【三合局/半合（成局结构已算定，是否真成局起用结合动静月日自行判）】\n${lines}`;
  }

  // 主卦逐爻一览：六亲+纳甲+六神+月令旺衰+旬空/月破，便于 AI 定位用神与各爻状态。
  // 旬空/月破由 core 算定（AI 自行推旬空最易错），直接标注、不让 AI 心算。
  const yaoLines = (info.qin6 ?? []).map((q, i) => {
    const x = info.qinx?.[i] ?? '';
    const g = info.god6?.[i] ?? '';
    const yl = info.yue_ling?.[i] ?? '';
    const states: string[] = [];
    if (info.xun_kong?.[i]) states.push('旬空');
    if (info.yue_po?.[i]) states.push('月破');
    const stateStr = states.length > 0 ? ` ${states.join('、')}` : '';
    const flags: string[] = [];
    if (shi === i + 1) flags.push('世');
    if (ying === i + 1) flags.push('应');
    if (dong.includes(i)) flags.push('动');
    const flagStr = flags.length > 0 ? `【${flags.join('')}】` : '';
    return `  第${i + 1}爻：${q}${x} ${g}${yl ? ` 月令${yl}` : ''}${stateStr}${flagStr}`;
  });

  return `【用户问题】
${userQuestion}

【卦象信息】
主卦：${info.name}（${info.gong}宫）
卦符：${info.mark}
世爻位置：${shi ?? '未知'}爻　应爻位置：${ying ?? '未知'}爻${yongshenSection}

【主卦逐爻】（六亲·纳甲·六神·月令旺衰）
${yaoLines.join('\n')}

【时空状态】
月建：${info.yue_zhi ?? '未知'}　日辰：${info.ri_chen ?? '未知'}　动爻：${dongStr}

【变卦信息】
${bianSection}${hideSection}${relationSection}${guaShenSection}${dayDynSection}${yingQiSection}${sanHeSection}

【解读要求】
1. 用神、原忌仇神、旬空月破、动变关系、卦身均已在上方算定，直接采用，不要自行重新推导或心算
2. 按方法论框架综合权衡：用神旺衰（据月令/日辰/旬空/月破）→ 原神忌神动静 → 世应动变 → 给倾向性结论
3. 按以下结构输出：
   - 结论：直接给出对这个问题的判断（有利/不利/需观望，及大致程度）
   - 依据：说明卦象上是怎么得出的（用神旺衰、世应生克、动变走势）
   - 建议：基于分析给出可操作的方向
   - 应期：基于上方已算定的应期候选地支（逢值/冲/合/出空），结合用神动静空破选择主导应法，给出时间节点；勿自行推算冲合
4. 语气专业平实，不用戏腔，不灌鸡汤
5. 严格依据上方数据，不臆造爻的干支或变爻配置；信息不足则说明

请开始分析。`;
}

/** 调 LongCat 解读卦象。 */
export async function interpretHexagram(info: HexagramData, question: string): Promise<string> {
  const cfg = getConfig();
  if (!cfg.apiKey) {
    throw new Error('未配置 LONGCAT_API_KEY，无法调用 AI 解读');
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
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // 内容安全审核拦截（如健康/疾病类触发模型审核）转友好提示
    if (text.includes('security_audit_fail') || text.includes('security_error')) {
      throw new Error(
        'AI 内容审核未通过，该问题可能涉及敏感领域，请换个角度提问或参考规则引擎分析',
      );
    }
    throw new Error(`AI API 错误 (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 返回内容为空');
  return content;
}
