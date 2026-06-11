"""
NVIDIA NIM AI 客户端
支持 DeepSeek-R1 和 GLM-4 模型
"""
import requests
from typing import Optional, List, Dict, Any
from .config import NVIDIAConfig

config = NVIDIAConfig()


class AIClient:
    """AI 大模型客户端"""

    def __init__(self, model: Optional[str] = None):
        self.api_key = config.API_KEY
        self.base_url = config.BASE_URL
        self.model = model or config.DEFAULT_MODEL

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
        return """你是一位深受尊敬的易经六爻老师傅，研习易经三十余载，精通六爻纳甲预测。

【你的风格】
- 说话温和亲切，像一位长者循循善诱
- 用通俗易懂的语言解释深奥的易理
- 注重实际应用，给出切实可行的建议
- 善于结合用户具体问题分析，不是照本宣科

【解读原则】
1. 先理解用户问的是什么，再结合卦象分析
2. 卦象是"象"，要透过象看本质，给出人性化的解读
3. 吉凶不是绝对的，要告诉用户"事在人为"
4. 用生活化的比喻帮助用户理解

【专业功底】
- 精通六亲（父母、兄弟、夫妻、官鬼、子孙、妻财）的生克关系
- 深谙世应之道，理解求测者与所问之事的关系
- 掌握月令旺衰、旬空等玄机
- 能够将复杂的易理转化为用户能理解的建议

请用温暖、专业、易懂的语言回复，帮助用户获得启发和指引。"""

    def _build_user_prompt(self, info: Dict[str, Any], question: str) -> str:
        user_question = question if question and question.strip() else "一般占问事项"
        
        dong_yao = info.get('dong', [])
        dong_yao_str = f"第{', '.join(map(str, dong_yao))}爻" if dong_yao else "无动爻（静卦）"
        
        yue_ling = info.get('yue_ling', [])
        yue_ling_str = '、'.join(yue_ling) if yue_ling else "未知"
        
        return f"""【用户问题】
{user_question}

【卦象信息】
主卦：{info.get('name', '未知')}（{info.get('gong', '未知')}宫）
卦符：{info.get('mark', '未知')}
世爻位置：{info.get('shi_position', '未知')}爻
应爻位置：{info.get('ying_position', '未知')}爻

【六亲配卦】
六亲：{', '.join(info.get('qin6', []))}
纳甲五行：{', '.join(info.get('qinx', []))}
六神：{', '.join(info.get('god6', []))}

【时空状态】
月令旺衰：{yue_ling_str}
月建：{info.get('yue_zhi', '未知')}月
日辰：{info.get('ri_chen', '未知')}日
动爻：{dong_yao_str}

【变卦信息】
{"有变卦：" + info.get('bian_name', '无') if info.get('bian_name') else '无变卦（静卦）'}
{"伏神：" + info.get('hide_name', '无') if info.get('hide_name') else ''}

【解读要求】
1. 先理解用户问的"{user_question}"是什么含义
2. 结合上述卦象信息，分析对这个问题的启示
3. 给出清晰易懂的解读，包括：
   - 卦象在说什么（象意分析）
   - 当前形势如何（用神旺衰）
   - 建议怎么做（行动指引）
4. 语气要亲切，像老师傅讲故事一样
5. 如果用户问题不明确，可以根据卦象给出一个普适性的解读

请开始解读。"""


if __name__ == "__main__":
    import os
    import sys

    os.environ.setdefault("PYTHONDONTWRITECOLOR", "1")
    print("=" * 60)
    print("NVIDIA NIM AI 客户端")
    print("=" * 60)
