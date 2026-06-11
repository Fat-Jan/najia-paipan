#!/usr/bin/env python3
"""
用 legacy najia (Python, 30 测试黄金标准) 批量生成排盘黄金数据，
供 TS core 对拍验证。输出 golden.json。

覆盖：
- 全 64 卦的静卦（params 全为 1/2，无动爻）
- 随机动爻组合（含 3/4）
- 多个固定日期（验证农历/时间维度）
"""
import json
import random
import sys
from pathlib import Path

# 引入 legacy 包
LEGACY = Path(__file__).resolve().parents[3] / 'legacy' / 'najia'
sys.path.insert(0, str(LEGACY))

from najia import Najia  # noqa: E402

random.seed(42)

# 固定日期集（覆盖不同月建/旬空）
# 含节气交界日：月建地支在节气当天切换，是 TS(tyme4ts 月柱) vs Python(getMonthZhi)
# 最易分歧的点，必须覆盖以暴露差异。
DATES = [
    '2019-12-25 00:20',
    '2026-02-13 10:30',
    '2024-06-01 12:00',
    '2023-01-01 08:00',
    '2025-09-15 18:45',
    # 节气边界（立春/惊蛰/清明/立夏/芒种/小暑/立秋/白露/寒露/立冬/大雪附近）
    '2026-02-04 10:00',  # 立春前后
    '2026-03-05 22:00',  # 惊蛰前后
    '2025-08-07 09:00',  # 立秋前后
    '2025-12-07 00:30',  # 大雪前后
    '2024-01-06 14:00',  # 小寒前后
]

GENDERS = [None, '男', '女']


def one(params, date, gender):
    naj = Najia(verbose=0)
    naj.compile(params=params, date=date, gender=gender, guaci=False)
    r = naj.export()
    # shiy 是 tuple，统一成 list 便于 JSON 比对
    if 'shiy' in r and isinstance(r['shiy'], tuple):
        r['shiy'] = list(r['shiy'])
    # liu_shen 在 legacy 有 bug（己日起神错+错字「腾」），TS 已删除该冗余字段，
    # 六神统一由正确的 god6 提供，故对拍不再比对 liu_shen
    r.pop('liu_shen', None)
    return r


def gen_static_64():
    """全 64 卦静卦：用每个卦符直接构造 params（1=阳静,2=阴静）"""
    from najia.const import GUA64
    cases = []
    for mark in GUA64:
        # mark 是内卦+外卦的二进制；1→少阳(1)，0→少阴(2)
        params = [1 if c == '1' else 2 for c in mark]
        cases.append({'params': params, 'date': DATES[0], 'gender': None})
    return cases


def gen_random_dynamic(n=200):
    """随机动爻组合（1-4 全覆盖）"""
    cases = []
    for _ in range(n):
        params = [random.randint(1, 4) for _ in range(6)]
        date = random.choice(DATES)
        gender = random.choice(GENDERS)
        cases.append({'params': params, 'date': date, 'gender': gender})
    return cases


def main():
    cases = gen_static_64() + gen_random_dynamic(200)
    out = []
    for c in cases:
        result = one(c['params'], c['date'], c['gender'])
        out.append({'input': c, 'expected': result})

    dest = Path(__file__).parent / 'golden.json'
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'生成 {len(out)} 条黄金数据 → {dest}')


if __name__ == '__main__':
    main()
