from typing import Tuple


def date_to_yue_ri_chen(date_str: str) -> Tuple[str, str]:
    """
    将公历日期字符串（YYYY-MM-DD 或 YYYY-MM-DD HH:MM）转换为农历月建地支、日辰干支。
    示例：
        date_to_yue_ri_chen("2026-02-13") -> ("寅", "甲子")
        date_to_yue_ri_chen("2026-02-13 10:30") -> ("寅", "甲子")
    """
    from lunar_python import Solar

    date_part = date_str.split(' ')[0]
    parts = date_part.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    solar = Solar.fromYmd(year, month, day)
    lunar = solar.getLunar()

    yue_zhi = lunar.getMonthZhi()
    ri_chen = lunar.getDayInGanZhi()

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
    yue_zhi = month_map.get(lunar_month, lunar_month)
    return yue_zhi, lunar_day
