#!/usr/bin/env python3
"""
世爻位置测试
测试所有64个卦象的世爻位置是否符合规则

规则：
- 八纯卦（首卦）：世爻在上爻（位置6，0-based 5）
- 一世卦：世爻在初爻（位置1，0-based 0）
- 二世卦：世爻在二爻（位置2，0-based 1）
- 三世卦：世爻在三爻（位置3，0-based 2）
- 四世卦：世爻在四爻（位置4，0-based 3）
- 五世卦：世爻在五爻（位置5，0-based 4）
- 游魂卦：世爻在四爻（位置4，0-based 3）
- 归魂卦：世爻在三爻（位置3，0-based 2）
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from najia.najia import Najia
from najia.const import GUA64, SHIYING_PRECOMPUTED


def test_shi_yao_positions():
    """测试所有64个卦象的世爻位置是否符合规则"""
    # 测试用例：(卦名, 期望世爻位置 0-based)
    test_cases = [
        # 8个宫卦的完整测试用例
        # 乾宫
        ("乾为天", 5), ("天风姤", 0), ("天山遁", 1), ("天地否", 2),
        ("风地观", 3), ("山地剥", 4), ("火地晋", 3), ("火天大有", 2),
        # 兑宫
        ("兑为泽", 5), ("泽水困", 0), ("泽地萃", 1), ("泽山咸", 2),
        ("水山蹇", 3), ("地山谦", 4), ("雷山小过", 3), ("雷泽归妹", 2),
        # 离宫
        ("离为火", 5), ("火山旅", 0), ("火风鼎", 1), ("火水未济", 2),
        ("山水蒙", 3), ("风水涣", 4), ("天水讼", 3), ("天火同人", 2),
        # 震宫
        ("震为雷", 5), ("雷地豫", 0), ("雷水解", 1), ("雷风恒", 2),
        ("地风升", 3), ("水风井", 4), ("泽风大过", 3), ("泽雷随", 2),
        # 巽宫
        ("巽为风", 5), ("风天小畜", 0), ("风火家人", 1), ("风雷益", 2),
        ("天雷无妄", 3), ("火雷噬嗑", 4), ("山雷颐", 3), ("山风蛊", 2),
        # 坎宫
        ("坎为水", 5), ("水泽节", 0), ("水雷屯", 1), ("水火既济", 2),
        ("泽火革", 3), ("雷火丰", 4), ("地火明夷", 3), ("地水师", 2),
        # 艮宫
        ("艮为山", 5), ("山火贲", 0), ("山天大畜", 1), ("山泽损", 2),
        ("火泽睽", 3), ("天泽履", 4), ("风泽中孚", 3), ("风山渐", 2),
        # 坤宫
        ("坤为地", 5), ("地雷复", 0), ("地泽临", 1), ("地天泰", 2),
        ("雷天大壮", 3), ("泽天夬", 4), ("水天需", 3), ("水地比", 2),
    ]

    errors = []
    total = len(test_cases)

    for gua_name, expected_shi in test_cases:
        try:
            # 查找对应卦名的卦符
            symbol = next((s for s, n in GUA64.items() if n == gua_name))

            # 从 SHIYING_PRECOMPUTED 中获取世爻位置 (1-based)
            shi_yao_1based = SHIYING_PRECOMPUTED[symbol][0]
            shi_yao_0based = shi_yao_1based - 1  # 转换为 0-based

            # 验证世爻位置
            if shi_yao_0based == expected_shi:
                print(f"✅ {gua_name}: 世爻位置 {expected_shi} (0-based) 正确")
            else:
                error_msg = (
                    f"❌ {gua_name}: 期望世爻位置 {expected_shi} (0-based), "
                    f"实际为 {shi_yao_0based} (0-based)"
                )
                print(error_msg)
                errors.append(error_msg)

        except StopIteration:
            error_msg = f"❌ 未找到卦名: {gua_name}"
            print(error_msg)
            errors.append(error_msg)
        except Exception as e:
            error_msg = f"❌ {gua_name}: 错误 - {str(e)}"
            print(error_msg)
            errors.append(error_msg)

    print()
    print(f"=== 测试结果: {total - len(errors)}/{total} 通过 ===")
    
    if errors:
        print(f"\n=== 发现 {len(errors)} 个错误 ===")
        for error in errors:
            print(error)
        assert False, "世爻位置测试失败"
    else:
        print("=== 所有世爻位置测试通过 ===")


if __name__ == "__main__":
    test_shi_yao_positions()
