"""
纳甲六爻排盘项目 - 优化版本

Forked from najia@1.2.4 with performance optimization and static ShiYao table.
主要改进：
- 性能优化：世应查表化、六亲矩阵化、位运算优化
- 架构完善：统一日志配置和配置验证
- 代码质量：增强类型注解，避免循环导入
- 时间维度：月建日辰、月令旺衰、月破、旬空、六神
"""

__author__ = """bopowang"""
__email__ = 'ibopo@126.com'
__version__ = '2.0.2'

from .najia import Najia
from . import const
from .time_analysis import (
    calc_yue_ling,
    is_yue_po,
    get_xun_kong,
    is_xun_kong,
    calc_liu_shen,
)
from .lunar_utils import (
    date_to_yue_ri_chen,
    lunar_month_day_to_yue_ri_chen,
)
