# 测试世爻位置的工作计划

## 概述

为 `test_shi_yao.py` 文件添加一个测试类，测试不同宫卦的世爻位置是否符合规则。

## 任务目标

创建一个测试文件，测试所有8个宫卦的世爻位置，验证是否符合八宫卦世爻位置规则。

## 工作流程

### 1. 创建测试文件
- 创建 `/Users/arm/Desktop/vscode/naijia-liubo/najia/tests/test_shi_yao.py`
- 实现 `test_shi_yao_positions` 函数
- 包含所有8个宫卦的测试用例

### 2. 测试用例设计

**测试规则**：
- 八纯卦（首卦）：世爻在上爻（位置6，0-based 5）
- 一世卦：世爻在初爻（位置1，0-based 0）
- 二世卦：世爻在二爻（位置2，0-based 1）
- 三世卦：世爻在三爻（位置3，0-based 2）
- 四世卦：世爻在四爻（位置4，0-based 3）
- 五世卦：世爻在五爻（位置5，0-based 4）
- 游魂卦：世爻在四爻（位置4，0-based 3）
- 归魂卦：世爻在三爻（位置3，0-based 2）

**各宫卦测试用例**：

| 宫位 | 卦名 | 类型 | 期望世爻位置 (0-based) |
|------|------|------|-----------------------|
| 乾宫 | 乾为天 | 八纯 | 5 |
| 乾宫 | 天风姤 | 一世 | 0 |
| 乾宫 | 天山遁 | 二世 | 1 |
| 乾宫 | 天地否 | 三世 | 2 |
| 乾宫 | 风地观 | 四世 | 3 |
| 乾宫 | 山地剥 | 五世 | 4 |
| 乾宫 | 火地晋 | 游魂 | 3 |
| 乾宫 | 火天大有 | 归魂 | 2 |

...（其他7宫卦的测试用例）

### 3. 实现逻辑

```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../')

from najia.const import GUA64, SHIYING_PRECOMPUTED

def test_shi_yao_positions():
    test_cases = [
        ("乾为天", 5), ("天风姤", 0), ("天山遁", 1), ("天地否", 2),
        ("风地观", 3), ("山地剥", 4), ("火地晋", 3), ("火天大有", 2),
        # 其他宫卦...
    ]
    
    for gua_name, expected_shi in test_cases:
        symbol = next(symbol for symbol, name in GUA64.items() if name == gua_name)
        actual_shi = SHIYING_PRECOMPUTED[symbol][0] - 1  # 转换为 0-based
        assert actual_shi == expected_shi, f"{gua_name} 世爻应为 {expected_shi}, 得到 {actual_shi}"
```

### 4. 执行测试

```bash
cd /Users/arm/Desktop/vscode/naijia-liubo/najia
python -m pytest tests/test_shi_yao.py::test_shi_yao_positions -v
```

## 成功标准

- 所有 64 个卦象的世爻位置测试通过
- 测试覆盖所有八宫卦类型（首卦、一世至五世、游魂、归魂）
- 验证结果与六爻理论规则一致

## 风险评估

- 低风险：测试只读取预计算的常量，不修改代码
- 依赖 SHIYING_PRECOMPUTED 常量的正确性
- 需要确保 GUA64 字典包含所有测试用例中的卦名

## 执行结果

✅ **已完成**
- 测试文件已创建: `najia/tests/test_shi_yao.py`
- 测试覆盖: 所有64个卦象
- pytest 结果: **1 passed**
