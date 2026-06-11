# 六爻排盘引擎·月建日辰功能开发任务书

本文档是为项目准备的一份**精确、可执行**的开发规范。  
请**严格遵循**以下模块划分、函数签名、代码风格和测试要求进行编码。所有修改须保持向后兼容，并符合现有项目的架构风格。

---

## 1. 项目背景与目标

现有项目 已实现：

- 纳甲六爻排盘核心（起卦、纳支、世应、六亲、六神、变卦）
- 高性能：世应查表化（O(1)）、六亲矩阵化、位运算优化
- 良好的工程化：日志、配置、批量处理、结果序列化
- 测试覆盖：21 个测试通过，flake8 合规

**本次任务目标**：为排盘引擎增加**月建、日辰（时间维度）断卦属性**，使 API 能够返回爻的**旺衰、月破、旬空、六神**等信息。  
**最终产出**：一个**向后兼容**、**高可测**、**可插拔**的时间分析模块，并通过 REST API 暴露。

---

## 2. 功能需求（用户故事）

- **作为调用者**，我可以通过 API 传入公历日期（如 `2026-02-13`）或农历月建/日辰（如 `寅`、`甲子`），排盘结果中包含每个爻的：
  - 月令旺衰（旺/相/休/囚/死）
  - 是否月破（是/否）
  - 是否旬空（是/否）
  - 六神（青龙、朱雀、勾陈、腾蛇、白虎、玄武）
- **作为开发者**，我可以选择**不传入时间参数**，此时排盘**仅计算基础属性**，不附加任何时间断卦字段（保持原行为）。
- **所有时间计算函数必须是纯函数**，无全局状态，易于单元测试。

---

## 3. 技术选型与依赖管理

- **Python 版本**：3.9+
- **依赖库**（请在 `pyproject.toml` 中添加）：
  - `lunar-python>=1.0.11` —— 用于公历→农历、干支转换
  - （若已有）无需额外添加
- **项目包管理**：Poetry（假设项目已使用）  
  安装命令：`poetry add lunar-python`

---

## 4. 模块设计与文件结构

在现有项目根目录下新增/修改以下文件：

```
najia_optimized/
├── najia/
│   ├── __init__.py
│   ├── paipan.py          # 修改：主排盘函数增加时间参数
│   ├── result.py          # 修改：Yao 类增加时间属性字段
│   ├── lunar_utils.py     # 新增：农历/公历转换工具函数
│   ├── time_analysis.py   # 新增：旺衰、月破、旬空、六神核心计算
│   └── ... 其他现有文件
├── tests/
│   ├── test_time_analysis.py  # 新增：专门测试时间模块
│   └── test_paipan.py         # 修改：增加带时间参数的集成测试
├── api/
│   └── main.py            # 如果存在 FastAPI 接口，需扩展请求模型
└── pyproject.toml         # 修改：添加 lunar-python 依赖
```

---

## 5. 详细实现步骤与代码规范

### 5.1 新增 `lunar_utils.py`

**职责**：公历日期 ↔ 月建地支、日辰干支 的转换。  
**接口定义**：

```python
from typing import Tuple

def date_to_yue_ri_chen(date_str: str) -> Tuple[str, str]:
    """
    将公历日期字符串（YYYY-MM-DD）转换为农历月建地支、日辰干支。
    示例：
        date_to_yue_ri_chen("2026-02-13") -> ("寅", "甲子")
    """
    # 使用 lunar_python 库实现
    from lunar_python import Lunar
    lunar = Lunar.fromYmd(*map(int, date_str.split('-')))
    yue_zhi = lunar.getMonthZhi()          # '寅'
    ri_chen = lunar.getDayInGanZhi()       # '甲子'
    return yue_zhi, ri_chen

def lunar_month_day_to_yue_ri_chen(lunar_month: str, lunar_day: str) -> Tuple[str, str]:
    """
    将农历月（如'正月'）和日干支（如'甲子'）转换为月建地支、日辰干支。
    如果传入的已经是地支（'寅'）和干支（'甲子'），直接返回。
    """
    month_map = {
        '正月': '寅', '二月': '卯', '三月': '辰', '四月': '巳',
        '五月': '午', '六月': '未', '七月': '申', '八月': '酉',
        '九月': '戌', '十月': '亥', '十一月': '子', '十二月': '丑'
    }
    yue_zhi = month_map.get(lunar_month, lunar_month)  # 兼容直接传地支
    return yue_zhi, lunar_day
```

### 5.2 新增 `time_analysis.py`

**职责**：所有与时间相关的断卦属性计算。  
**所有函数均为纯函数，禁止访问外部状态**。  
**函数签名与实现**（可复制粘贴以下代码模板）：

```python
# time_analysis.py
from typing import List, Optional

# ---------- 全局常量 ----------
WUXING_MAP = {'金': 0, '木': 1, '水': 2, '火': 3, '土': 4}
WUXING_LIST = ['金', '木', '水', '火', '土']
DIZHI_WUXING = {
    '寅': '木', '卯': '木',
    '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金',
    '子': '水', '亥': '水'
}
CHONG_MAP = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉',
    '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
    '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳'
}
TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

# 六神起始表
LIUSHEN_START = {
    '甲': '青龙', '乙': '青龙',
    '丙': '朱雀', '丁': '朱雀',
    '戊': '勾陈', '己': '勾陈',
    '庚': '腾蛇', '辛': '腾蛇',
    '壬': '白虎', '癸': '白虎',
}
LIUSHEN_ORDER = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']

# ---------- 1. 月令旺衰 ----------
def calc_yue_ling(yao_wuxing: str, yue_zhi: str) -> str:
    """
    根据爻的五行和月建地支，返回月令状态。
    规则：同我为旺，生我为相，我生为休，克我为囚，我克为死。
    参数保证合法。
    """
    yue_wuxing = DIZHI_WUXING[yue_zhi]
    y = WUXING_MAP[yao_wuxing]
    m = WUXING_MAP[yue_wuxing]
    if y == m:
        return '旺'
    if (m + 1) % 5 == y:   # 月生爻
        return '相'
    if (y + 1) % 5 == m:   # 爻生月
        return '休'
    if (y + 2) % 5 == m:   # 爻克月
        return '囚'
    if (m + 2) % 5 == y:   # 月克爻
        return '死'
    return ''  # 不应发生

# ---------- 2. 月破（地支六冲）----------
def is_yue_po(yao_dizhi: str, yue_zhi: str) -> bool:
    """若爻的地支与月建地支相冲，返回 True"""
    return CHONG_MAP.get(yao_dizhi) == yue_zhi

# ---------- 3. 旬空 ----------
def get_xun_kong(ri_chen_gan_zhi: str) -> List[str]:
    """
    根据日辰干支（如'甲子'），返回该旬空亡的两个地支（如['戌','亥']）。
    若输入无效，返回空列表。
    """
    if len(ri_chen_gan_zhi) not in (2, 3):
        return []
    gan = ri_chen_gan_zhi[0]
    zhi = ri_chen_gan_zhi[1:]
    try:
        gan_index = TIANGAN.index(gan)
        zhi_index = DIZHI.index(zhi)
        # 日柱在六十甲子中的索引（简化计算）
        # 更严谨：每个旬的空亡由日柱所在旬决定
        start_zhi_index = (zhi_index - gan_index) % 12
        kong1 = DIZHI[(start_zhi_index - 2) % 12]
        kong2 = DIZHI[(start_zhi_index - 1) % 12]
        return [kong1, kong2]
    except ValueError:
        return []

def is_xun_kong(yao_dizhi: str, ri_chen_gan_zhi: str) -> bool:
    """若爻的地支属于该日的旬空地支，返回 True"""
    return yao_dizhi in get_xun_kong(ri_chen_gan_zhi)

# ---------- 4. 六神 ----------
def calc_liu_shen(yao_position: int, ri_chen_gan_zhi: str) -> str:
    """
    根据爻位（0~5，初爻至上爻）和日辰干支，返回六神名称。
    初爻配日干对应的起始六神，二爻起顺次循环。
    """
    gan = ri_chen_gan_zhi[0]
    start = LIUSHEN_START.get(gan, '青龙')
    start_index = LIUSHEN_ORDER.index(start)
    liu_shen_index = (start_index + yao_position) % 6
    return LIUSHEN_ORDER[liu_shen_index]
```

---

### 5.3 修改 `result.py`：为 `Yao` 类增加时间属性字段

在 `Yao` 类的 `__init__` 中添加以下属性（默认值见注释）：

```python
class Yao:
    def __init__(self, position: int):
        # ... 原有属性
        self.yue_ling: Optional[str] = None      # 旺/相/休/囚/死
        self.yue_po: bool = False                # 是否月破
        self.xun_kong: bool = False              # 是否旬空
        self.liu_shen: Optional[str] = None      # 六神名称
```

**注意**：这些字段在序列化时（如 `to_dict()`）应包含。请确保 `Yao.to_dict()` 方法包含这些新字段。

---

### 5.4 修改 `paipan.py`：主排盘函数集成时间参数

修改 `paipan` 函数签名，增加可选参数，并调用时间分析模块填充爻属性。

```python
from .lunar_utils import date_to_yue_ri_chen
from .time_analysis import calc_yue_ling, is_yue_po, is_xun_kong, calc_liu_shen

def paipan(coins, *, yue_zhi=None, ri_chen=None, date=None):
    """
    六爻排盘主函数。
    :param coins: 6个整数，代表摇钱结果（7/8/9/10 等）
    :param yue_zhi: 月建地支，如 '寅'（优先级低于date）
    :param ri_chen: 日辰干支，如 '甲子'（优先级低于date）
    :param date: 公历日期字符串 'YYYY-MM-DD'，若提供则忽略yue_zhi/ri_chen
    :return: 包含本卦、变卦及所用时间参数的字典
    """
    # 1. 原有排盘核心逻辑（生成卦象）
    gua = _core_paipan(coins)   # 假设已有此函数，返回 Gua 对象

    # 2. 时间参数处理：date > 单独传入 > 默认不处理
    if date is not None:
        yue_zhi, ri_chen = date_to_yue_ri_chen(date)
    # 若 date 为 None，但 yue_zhi/ri_chen 可能为 None

    # 3. 如果提供了月建或日辰，则进行时间属性计算
    if yue_zhi is not None or ri_chen is not None:
        for yao in gua.yaos:
            if yue_zhi is not None:
                yao.yue_ling = calc_yue_ling(yao.wuxing, yue_zhi)
                yao.yue_po = is_yue_po(yao.dizhi, yue_zhi)
            if ri_chen is not None:
                yao.xun_kong = is_xun_kong(yao.dizhi, ri_chen)
                yao.liu_shen = calc_liu_shen(yao.pos, ri_chen)

    # 4. 返回结果（同时返回实际使用的时间参数，便于前端显示）
    return {
        'gua': gua,
        'yue_zhi': yue_zhi,
        'ri_chen': ri_chen
    }
```

**注意**：确保 `_core_paipan` 是你现有的排盘逻辑，本函数只是增强。  
**向后兼容**：调用 `paipan(coins)` 不传任何时间参数时，不进行任何时间计算，`Yao` 对象的新属性保持默认值。

---

### 5.5 扩展 API 层（如已有 FastAPI 接口）

若项目中存在 `api/main.py` 或类似文件，请修改请求模型和路由：

```python
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class DivinationRequest(BaseModel):
    coins: list[int]
    date: Optional[str] = None          # 格式 YYYY-MM-DD
    lunar_month: Optional[str] = None   # 如 '寅' 或 '正月'
    lunar_day: Optional[str] = None     # 如 '甲子'

    @validator('date')
    def validate_date(cls, v):
        if v is not None:
            # 简单格式校验
            datetime.strptime(v, '%Y-%m-%d')
        return v

    @validator('lunar_day')
    def validate_lunar_day(cls, v, values):
        if v is not None:
            # 日干支必须是2或3字符（甲子等）
            if len(v) not in (2, 3):
                raise ValueError('日辰格式应为“甲子”等')
        return v

@app.post("/v1/paipan")
async def liuyao_paipan(req: DivinationRequest):
    from najia.paipan import paipan
    from najia.lunar_utils import lunar_month_day_to_yue_ri_chen

    if req.date:
        result = paipan(req.coins, date=req.date)
    elif req.lunar_month and req.lunar_day:
        yue, ri = lunar_month_day_to_yue_ri_chen(req.lunar_month, req.lunar_day)
        result = paipan(req.coins, yue_zhi=yue, ri_chen=ri)
    else:
        # 默认使用当前系统日期的农历
        today = datetime.now().strftime('%Y-%m-%d')
        result = paipan(req.coins, date=today)

    # 确保 Gua 对象可序列化（如实现 to_dict 方法）
    return result
```

如果项目尚未集成 API，此步骤可暂缓，但必须保留接口设计文档，以便后续对接。

---

## 6. 单元测试要求

在 `tests/test_time_analysis.py` 中编写全面的单元测试，覆盖所有分支。

**必须包含以下测试用例：**

```python
import pytest
from najia.time_analysis import (
    calc_yue_ling, is_yue_po, get_xun_kong, is_xun_kong, calc_liu_shen
)

def test_calc_yue_ling():
    assert calc_yue_ling('金', '申') == '旺'
    assert calc_yue_ling('水', '申') == '相'   # 金生水
    assert calc_yue_ling('木', '申') == '死'   # 金克木
    assert calc_yue_ling('火', '申') == '囚'   # 火克金
    assert calc_yue_ling('土', '申') == '休'   # 土生金
    # 测试所有五行组合（至少每种状态1例）

def test_is_yue_po():
    assert is_yue_po('子', '午') is True
    assert is_yue_po('丑', '未') is True
    assert is_yue_po('寅', '申') is True
    assert is_yue_po('子', '未') is False

def test_get_xun_kong():
    # 甲子日，空亡戌亥
    kong = get_xun_kong('甲子')
    assert '戌' in kong and '亥' in kong
    # 乙丑日，空亡戌亥（同一旬）
    kong2 = get_xun_kong('乙丑')
    assert '戌' in kong2 and '亥' in kong2
    # 丙寅日，空亡戌亥（甲子旬）
    kong3 = get_xun_kong('丙寅')
    assert '戌' in kong3 and '亥' in kong3
    # 甲戌日，空亡申酉
    kong4 = get_xun_kong('甲戌')
    assert '申' in kong4 and '酉' in kong4
    # 非法输入
    assert get_xun_kong('甲') == []

def test_is_xun_kong():
    assert is_xun_kong('戌', '甲子') is True
    assert is_xun_kong('亥', '甲子') is True
    assert is_xun_kong('子', '甲子') is False

def test_calc_liu_shen():
    # 甲日，初爻青龙，二爻朱雀...
    assert calc_liu_shen(0, '甲子') == '青龙'
    assert calc_liu_shen(1, '甲子') == '朱雀'
    assert calc_liu_shen(5, '甲子') == '玄武'  # 第六爻
    # 乙日，初爻青龙（同甲）
    assert calc_liu_shen(0, '乙丑') == '青龙'
    # 丙日，初爻朱雀
    assert calc_liu_shen(0, '丙寅') == '朱雀'
```

**集成测试**：在 `tests/test_paipan.py` 中添加至少一个测试，验证传入日期后，爻属性被正确填充。

```python
def test_paipan_with_date():
    from najia.paipan import paipan
    # 使用固定硬币序列，得到已知卦象（如乾为天）
    coins = [7, 7, 7, 7, 7, 7]  # 假设对应乾为天
    result = paipan(coins, date='2026-02-13')  # 丙寅月 甲子日
    gua = result['gua']
    # 检查初爻
    yao0 = gua.yaos[0]
    assert yao0.yue_ling is not None
    assert isinstance(yao0.yue_po, bool)
    assert isinstance(yao0.xun_kong, bool)
    assert yao0.liu_shen is not None
    # 更具体的值可依据六爻理论手动验证，此处仅检查存在性
```

---

## 7. 验收标准

1. **代码合并后，所有现有测试（21个）依然通过。**
2. **新增的时间分析模块单元测试通过率 100%。**
3. **API（如果存在）支持 date/lunar_month/lunar_day 参数，且优先顺序正确。**
4. **不传入时间参数时，卦象的 YueLing/YuePo/XunKong/LiuShen 字段不存在或为 None，序列化时也不应出现（或为默认值）。**
5. **项目文档（README）已更新，说明新增的时间参数用法。**

---

## 8. 注意事项

- **严禁修改现有核心排盘算法**（如纳甲、世应、六亲等逻辑），仅作新增功能。
- **保持函数纯净**：`time_analysis.py` 中的函数不得读写文件、网络，也不得依赖全局变量。
- **类型注解**：所有新增函数必须包含完整的类型注解。
- **日志**：若有异常（如日期格式错误），使用 `logging` 记录警告，但不影响排盘核心。
- **向后兼容**：原有调用 `paipan(coins)` 的方式必须完全不受影响。
- **性能**：时间属性计算量极小，不允许引入明显延迟。

---

## 9. 交付物清单

请 AI 工具完成以下文件的**创建/修改**，并生成最终代码差异：

- [ ] `najia/lunar_utils.py`
- [ ] `najia/time_analysis.py`
- [ ] `najia/result.py` （修改）
- [ ] `najia/paipan.py` （修改）
- [ ] `tests/test_time_analysis.py`
- [ ] `tests/test_paipan.py` （修改，增加集成测试）
- [ ] `api/main.py` （如果存在，修改）
- [ ] `pyproject.toml` （添加依赖）
- [ ] `README.md` （添加时间参数说明）

---

**开始实施**：请根据以上规范，生成所有必要代码，确保完整可运行。如有疑问，以本文档为准。