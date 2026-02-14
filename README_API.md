# 六爻排盘 API

基于 najia 优化核心的六爻排盘 REST API 服务。

## 快速开始

### 使用简单版 API (Python 标准库)

```bash
# 启动服务
python api_simple.py --port 8000

# 或使用启动脚本
chmod +x start_api.sh
./start_api.sh
```

### 使用 FastAPI 版本

```bash
# 安装依赖 (需要 Python 3.9-pip install -r3.12)
 requirements-api.txt

# 启动服务
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## API 端点

### 1. 获取 API 信息
```http
GET /
```

响应示例：
```json
{
  "name": "六爻排盘 API",
  "version": "1.0.0",
  "endpoints": [...]
}
```

### 2. 单个排盘

```http
POST /api/v1/paipan
Content-Type: application/json

{
  "params": [2, 2, 1, 2, 4, 2],
  "date": "2019-12-25 00:20",
  "gender": "男",
  "title": "问事业",
  "guaci": false
}
```

参数说明：
- params (必填): 6个整数，表示6个爻位
  - 1 = 少阳（阳爻，静爻）
  - 2 = 少阴（阴爻，静爻）
  - 3 = 老阳（阳爻，动爻）
  - 4 = 老阴（阴爻，动爻）
- date (可选): 日期时间，格式 YYYY-MM-DD HH:MM，不传则使用当前时间
- gender (可选): 性别，"男" 或 "女"
- title (可选): 占事标题
- guaci (可选): 是否包含卦辞，默认 false

响应示例：
```json
{
  "params": [2, 2, 1, 2, 4, 2],
  "mark": "001000",
  "name": "地山谦",
  "gong": "兑",
  "shiy": [5, 2, 5],
  "qin6": ["父母", "官鬼", "兄弟", "父母", "子孙", "兄弟"],
  "qinx": ["丙辰土", "丙午火", "丙申金", "癸丑土", "癸亥水", "癸酉金"],
  "god6": ["朱雀", "勾陈", "螣蛇", "白虎", "玄武", "青龙"],
  "dong": [4],
  "solar": "2019-12-25T00:20:00+00:00",
  "lunar": {
    "xkong": "辰巳",
    "gz": {
      "year": "己亥",
      "month": "丙子",
      "day": "丙申",
      "hour": "戊子"
    }
  },
  "hexagram_type": "",
  "yue_zhi": "子",
  "ri_chen": "丙申",
  "yue_ling": ["休", "旺", "死", "相", "囚", "死"],
  "yue_po": [false, false, false, false, false, false],
  "xun_kong": [false, false, true, false, false, false],
  "liu_shen": ["朱雀", "勾陈", "螣蛇", "白虎", "玄武", "青龙"],
  "bian": {...},
  "hide": {...}
}
```

### 3. 批量排盘

```http
POST /api/v1/paipan/batch
Content-Type: application/json

{
  "params_list": [
    [2, 2, 1, 2, 4, 2],
    [1, 1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2, 2]
  ],
  "dates": ["2023-01-01", "2023-02-01", "2023-03-01"],
  "max_workers": 4
}
```

### 4. 文本渲染

```http
POST /api/v1/paipan/text
Content-Type: application/json

{
  "params": [2, 2, 1, 2, 4, 2],
  "date": "2019-12-25 00:20"
}
```

### 5. 获取64卦列表

```http
GET /api/v1/gua/64
```

## 爻位参数说明

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

## 时间维度字段（新增）

排盘结果新增以下时间维度字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| yue_zhi | string | 月建地支（如"寅"） |
| ri_chen | string | 日辰干支（如"戊午"） |
| yue_ling | list[string] | 月令旺衰列表（6个爻位） |
| yue_po | list[bool] | 月破列表（6个爻位） |
| xun_kong | list[bool] | 旬空列表（6个爻位） |
| liu_shen | list[string] | 六神列表（6个爻位） |

月令旺衰规则：
- 旺：同我为旺
- 相：生我为相
- 休：我生为休
- 囚：克我为囚
- 死：我克为死

## 测试示例

```bash
# 测试单个排盘
curl -X POST http://localhost:8000/api/v1/paipan \
  -H "Content-Type: application/json" \
  -d '{"params": [2,2,1,2,4,2], "date": "2023-01-01 12:00"}'

# 测试批量排盘
curl -X POST http://localhost:8000/api/v1/paipan/batch \
  -H "Content-Type: application/json" \
  -d '{"params_list": [[2,2,1,2,4,2], [1,1,1,1,1,1]]}'

# 测试文本渲染
curl -X POST http://localhost:8000/api/v1/paipan/text \
  -H "Content-Type: application/json" \
  -d '{"params": [2,2,1,2,4,2]}'

# 获取64卦列表
curl http://localhost:8000/api/v1/gua/64
```

## 核心库使用

```python
from najia import Najia

# 创建实例
najia = Najia(verbose=0)

# 排盘
najia.compile(
    params=[2, 2, 1, 2, 4, 2],
    date='2019-12-25 00:20',
    gender='男',
    title='问事业'
)

# 导出字典结果
result = najia.export()
print(result['name'])  # 地山谦

# 渲染文本
text = najia.render()
print(text)
```

### 使用子模块

```python
# 时间分析
from najia import calc_yue_ling, is_yue_po, get_xun_kong, calc_liu_shen
print(calc_yue_ling("木", "寅"))  # 旺
print(is_yue_po("申", "寅"))      # True
print(get_xun_kong("戊午"))        # ['子', '丑']
print(calc_liu_shen(0, "戊午"))   # 勾陈

# 农历工具
from najia import date_to_yue_ri_chen
print(date_to_yue_ri_chen("2026-02-13"))  # ('寅', '戊午')
```

## 项目结构

```
naijia-liubo/
├── api.py                  # FastAPI 完整实现
├── api_simple.py           # 简化版 API (标准库)
├── requirements-api.txt    # API 依赖配置
├── start_api.sh           # Linux/Mac 启动脚本
├── start_api.bat          # Windows 启动脚本
├── README_API.md          # 本文件
├── README.md              # 项目说明
└── najia/                 # 六爻排盘核心库
    └── najia/
        ├── __init__.py        # 主入口，导出 Najia 和子模块
        ├── najia.py           # Najia 主类
        ├── utils.py           # 核心函数
        ├── const.py           # 常量定义
        ├── result.py          # 数据模型
        ├── batch.py           # 批量处理
        ├── config.py          # 配置管理
        ├── log.py             # 日志配置
        ├── lunar_utils.py     # 农历工具
        └── time_analysis.py   # 时间分析
```

## 性能

- 单个排盘: < 10ms
- 批量排盘: 100个卦象约 0.1-0.2 秒 (取决于并发数)
- 优化算法：世应查表、六亲矩阵、位运算

## 许可证

MIT License
