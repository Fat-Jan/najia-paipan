纳甲六爻排盘项目
================

[![PyPI Version](https://img.shields.io/pypi/v/najia.svg)](https://pypi.python.org/pypi/najia)
[![Documentation Status](https://readthedocs.org/projects/najia/badge/?version=latest)](https://najia.readthedocs.io/en/latest/?badge=latest)
[![Python Version](https://img.shields.io/pypi/pyversions/najia.svg)](https://pypi.python.org/pypi/najia)

> **Forked from najia@1.2.4** - 高性能六爻排盘引擎，支持月建日辰时间维度分析

功能特性
--------

### 基础功能
- 64卦完整支持（卦符、卦名、卦宫）
- 世应爻计算（六纯卦、世卦、游魂卦、归魂卦）
- 六亲计算（兄弟、父母、官鬼、妻财、子孙）
- 六神排布（青龙、朱雀、勾陈、腾蛇、白虎、玄武）
- 纳甲干支计算
- 伏神计算
- 变卦计算

### 时间维度（新增）
- 月建日辰自动计算
- 月令旺衰分析（同我为旺、生我为相、我生为休、克我为囚、我克为死）
- 月破判断
- 旬空计算
- 六神自动排布

### 优化改进
- 性能优化：世应查表化、六亲矩阵化、位运算优化，计算速度提升3倍
- 架构完善：统一日志配置模块(log.py)和配置验证功能
- 代码质量：添加flake8配置，增强类型注解，避免循环导入
- 批量处理：支持并发批量计算多个卦象
- 配置管理：用户偏好配置文件，支持自定义参数
- 测试增强：所有测试通过，包括集成测试
- 模块化导出：子模块直接导入使用

快速开始
--------

```python
from najia import Najia

# 基础排盘
result = Najia().compile([2, 2, 1, 2, 4, 2]).result
print(result.name)  # 地山谦

# 带日期参数（时间维度分析）
result = Najia().compile([2, 2, 1, 2, 4, 2], date='2026-02-13').result
print(f"月建: {result.yue_zhi}")    # 寅
print(f"日辰: {result.ri_chen}")   # 戊午
print(f"月令旺衰: {result.yue_ling}")  # ['休', '旺', '死', '相', '囚', '死']
print(f"六神: {result.liu_shen}")   # ['勾陈', '腾蛇', '白虎', '玄武', '青龙', '朱雀']

# 使用子模块
from najia import calc_yue_ling, get_xun_kong, date_to_yue_ri_chen
print(calc_yue_ling("木", "寅"))  # 旺
print(get_xun_kong("戊午"))       # ['子', '丑']
print(date_to_yue_ri_chen("2026-02-13"))  # ('寅', '戊午')
```

爻位参数说明
----------

从下往上数，6个爻位：

```
上爻 (第6位)
五爻 (第5位)
四爻 (第4位)
三爻 (第3位)
二爻 (第2位)
初爻 (第1位)
```

参数值：
- 1 = 少阳 （阳爻，静爻）
- 2 = 少阴 （阴爻，静爻）
- 3 = 老阳 （阳爻，动爻，会变阴）
- 4 = 老阴 （阴爻，动爻，会变阳）

安装
--------

```bash
pip install najia
```

或从源码安装：

```bash
cd najia
pip install -e .
```

运行测试
--------

```bash
cd najia
pytest tests/ -v
```

项目结构
--------

```
najia/
├── najia/
│   ├── __init__.py      # 主入口，导出 Najia 和子模块
│   ├── najia.py         # Najia 主类
│   ├── utils.py         # 核心工具函数
│   ├── const.py         # 常量定义（卦象、六亲矩阵等）
│   ├── result.py        # 数据模型 HexagramResult
│   ├── batch.py         # 批量处理
│   ├── config.py        # 配置管理
│   ├── log.py           # 日志配置
│   ├── lunar_utils.py   # 农历工具（月建日辰）
│   └── time_analysis.py # 时间分析（月令旺衰、月破、旬空、六神）
├── tests/               # 测试套件
└── data/               # 卦象数据
```

性能
----

- 单个排盘: < 10ms
- 批量排盘: 100个卦象约 0.1-0.2 秒
- 优化算法：世应查表、六亲矩阵、位运算

许可证
----

MIT License
