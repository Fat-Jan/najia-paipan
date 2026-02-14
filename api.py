#!/usr/bin/env python3
"""
六爻排盘 FastAPI API
直接调用优化后的 paipan 核心函数
"""

from typing import List, Optional, Tuple, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'najia'))

from najia import Najia
from najia.batch import BatchProcessor, BatchResult
from najia.result import HexagramResult

# ==================== Pydantic 模型 ====================

class SinglePaipanRequest(BaseModel):
    """单个排盘请求模型"""
    params: List[int] = Field(
        ...,
        min_length=6,
        max_length=6,
        description="爻位参数列表，6个整数。1=少阳，2=少阴，3=老阳(动)，4=老阴(动)"
    )
    date: Optional[str] = Field(
        default=None,
        description="日期时间，格式：YYYY-MM-DD HH:MM 或 ISO8601。不传则使用当前时间"
    )
    gender: Optional[str] = Field(
        default=None,
        description="性别: '男' 或 '女'"
    )
    title: Optional[str] = Field(
        default=None,
        description="占事标题"
    )
    guaci: bool = Field(
        default=False,
        description="是否包含卦象文本(卦辞)"
    )

    @field_validator('params')
    @classmethod
    def validate_params(cls, v):
        """验证爻位参数必须在1-4范围内"""
        if not all(1 <= x <= 4 for x in v):
            raise ValueError('爻位参数必须是1-4的整数: 1=少阳, 2=少阴, 3=老阳, 4=老阴')
        return v


class BatchPaipanRequest(BaseModel):
    """批量排盘请求模型"""
    params_list: List[List[int]] = Field(
        ...,
        description="多个爻位参数列表"
    )
    dates: Optional[List[str]] = Field(
        default=None,
        description="日期时间列表，与params_list一一对应"
    )
    genders: Optional[List[str]] = Field(
        default=None,
        description="性别列表"
    )
    titles: Optional[List[str]] = Field(
        default=None,
        description="标题列表"
    )
    guaci: bool = Field(
        default=False,
        description="是否包含卦象文本"
    )
    max_workers: int = Field(
        default=4,
        ge=1,
        le=10,
        description="并发处理线程数"
    )

    @field_validator('params_list')
    @classmethod
    def validate_params_list(cls, v):
        """验证每个参数列表都有6个元素，且值在1-4"""
        for i, params in enumerate(v):
            if len(params) != 6:
                raise ValueError(f'第{i+1}个参数列表必须有6个元素')
            if not all(1 <= x <= 4 for x in params):
                raise ValueError(f'第{i+1}个参数列表中的值必须在1-4范围内')
        return v


class HiddenHexagramResponse(BaseModel):
    """伏神响应模型"""
    name: str = Field(..., description="伏神卦名")
    mark: str = Field(..., description="卦符")
    qin6: List[str] = Field(..., description="六亲")
    qinx: List[str] = Field(..., description="干支五行")
    seat: List[int] = Field(..., description="伏神位置")


class TransformedHexagramResponse(BaseModel):
    """变卦响应模型"""
    name: str = Field(..., description="变卦名")
    mark: str = Field(..., description="卦符")
    qin6: List[str] = Field(..., description="六亲")
    qinx: List[str] = Field(..., description="干支五行")
    gong: str = Field(..., description="卦宫")
    hexagram_type: str = Field(..., description="卦象类型")


class LunarInfo(BaseModel):
    """农历信息模型"""
    xkong: str = Field(..., description="旬空")
    gz: Dict[str, str] = Field(..., description="干支信息")


class HexagramResultResponse(BaseModel):
    """六爻排盘结果响应模型"""
    params: List[int] = Field(..., description="爻位参数")
    mark: str = Field(..., description="卦符(6位二进制字符串)")
    name: str = Field(..., description="卦名")
    gong: str = Field(..., description="卦宫")
    shiy: Tuple[int, int, int] = Field(..., description="世应爻位置 (世爻, 应爻, 索引)")
    qin6: List[str] = Field(..., description="六亲列表(6个)")
    qinx: List[str] = Field(..., description="纳甲五行列表(6个)")
    god6: List[str] = Field(..., description="六神列表(6个)")
    dong: List[int] = Field(..., description="动爻位置索引(0-5)")
    solar: str = Field(..., description="公历时间(ISO格式)")
    lunar: LunarInfo = Field(..., description="农历信息")
    hexagram_type: str = Field(..., description="卦象类型")
    guaci: Optional[Dict[str, Any]] = Field(default=None, description="卦辞信息")
    bian: Optional[TransformedHexagramResponse] = Field(default=None, description="变卦信息")
    hide: Optional[HiddenHexagramResponse] = Field(default=None, description="伏神信息")
    # 时间维度断卦属性
    yue_ling: Optional[List[str]] = Field(default=None, description="月令旺衰列表 ['旺','相','休','囚','死']")
    yue_po: Optional[List[bool]] = Field(default=None, description="月破列表 [True/False]")
    xun_kong: Optional[List[bool]] = Field(default=None, description="旬空列表 [True/False]")
    yue_zhi: Optional[str] = Field(default=None, description="月建地支")
    ri_chen: Optional[str] = Field(default=None, description="日辰干支")


class BatchResultInfo(BaseModel):
    """批量处理结果项"""
    params: List[int] = Field(..., description="爻位参数")
    name: Optional[str] = Field(default=None, description="卦名")
    mark: Optional[str] = Field(default=None, description="卦符")
    success: bool = Field(..., description="是否成功")
    error: Optional[str] = Field(default=None, description="错误信息")


class BatchPaipanResponse(BaseModel):
    """批量排盘响应模型"""
    success_count: int = Field(..., description="成功数量")
    error_count: int = Field(..., description="失败数量")
    processing_time: float = Field(..., description="处理时间(秒)")
    results: List[BatchResultInfo] = Field(..., description="处理结果列表")


class InterpretRequest(BaseModel):
    """AI 智能解读请求模型"""
    hexagram_data: Dict[str, Any] = Field(..., description="卦象数据")
    question: str = Field(..., description="用户问题")
    model: Optional[str] = Field(default="deepseek", description="AI 模型: 'deepseek' 或 'glm'")


class RuleAnalysis(BaseModel):
    """规则引擎分析结果"""
    wuxing_balance: str = Field(..., description="五行平衡分析")
    shiy_relation: str = Field(..., description="世应关系分析")
    yueling_status: str = Field(..., description="月令旺衰分析")
    dongyao_analysis: str = Field(..., description="动爻分析")
    jixiong: str = Field(..., description="吉凶判断")


class InterpretResponse(BaseModel):
    """AI 智能解读响应模型"""
    hexagram_name: str = Field(..., description="卦名")
    jixiong: str = Field(..., description="吉凶判断")
    rule_analysis: RuleAnalysis = Field(..., description="规则引擎分析")
    ai_interpretation: str = Field(..., description="AI 解读内容")


class ApiInfo(BaseModel):
    """API 信息响应"""
    name: str = "六爻排盘 API"
    version: str = "1.0.0"
    description: str = "基于 najia 优化核心的六爻排盘服务"
    endpoints: List[Dict[str, str]] = Field(default=[
        {"path": "/api/v1/paipan", "method": "POST", "description": "单个排盘"},
        {"path": "/api/v1/paipan/batch", "method": "POST", "description": "批量排盘"},
        {"path": "/api/v1/gua/64", "method": "GET", "description": "获取64卦列表"},
        {"path": "/api/v1/interpret", "method": "POST", "description": "AI 智能解读"},
        {"path": "/api/v1/docs", "method": "GET", "description": "API文档(Swagger UI)"},
    ])


# ==================== FastAPI 应用 ====================

app = FastAPI(
    title="六爻排盘 API",
    description="基于 najia 优化核心的六爻排盘服务 - 直接调用优化后的 paipan 函数",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== API 路由 ====================

@app.get("/", response_model=ApiInfo)
async def root():
    """API 根路径 - 返回API信息"""
    return ApiInfo()


@app.get("/api/v1/gua/64")
async def get_64_gua():
    """获取64卦基本信息列表"""
    from najia.const import GUA64, GUAS
    
    gua_list = []
    for mark, name in GUA64.items():
        idx = palace_idx(mark)
        gua_list.append({
            "mark": mark,
            "name": name,
            "gong": GUAS[idx] if 0 <= idx < len(GUAS) else "未知"
        })
    
    return {
        "total": len(gua_list),
        "gua_list": gua_list
    }


def palace_idx(mark: str) -> int:
    """根据卦符获取卦宫索引"""
    # 使用 najia.utils 中的 palace 函数逻辑
    from najia.utils import set_shi_yao, palace
    shiy = set_shi_yao(mark)
    return palace(mark, shiy[0])


@app.post("/api/v1/paipan", response_model=HexagramResultResponse)
async def single_paipan(request: SinglePaipanRequest):
    """
    单个六爻排盘
    
    根据爻位参数计算六爻卦象信息
    
    **参数说明:**
    - params: 6个整数，1=少阳，2=少阴，3=老阳(动)，4=老阴(动)
    - date: 日期时间，不传则使用当前时间
    - gender: 性别
    - title: 占事标题
    - guaci: 是否包含卦辞
    
    **示例请求:**
    ```json
    {
        "params": [2, 2, 1, 2, 4, 2],
        "date": "2019-12-25 00:20",
        "gender": "男",
        "title": "问事业"
    }
    ```
    """
    try:
        # 创建 Najia 实例并编译
        najia = Najia(verbose=0)
        najia.compile(
            params=request.params,
            date=request.date,
            gender=request.gender,
            title=request.title,
            guaci=request.guaci
        )
        
        # 导出结果
        result = najia.export()
        
        # 转换 lunar 为模型格式
        if 'lunar' in result:
            lunar_data = result['lunar']
            result['lunar'] = LunarInfo(
                xkong=lunar_data.get('xkong', ''),
                gz=lunar_data.get('gz', {})
            )
        
        return HexagramResultResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"排盘失败: {str(e)}")


@app.post("/api/v1/paipan/batch", response_model=BatchPaipanResponse)
async def batch_paipan(request: BatchPaipanRequest):
    """
    批量六爻排盘
    
    并行处理多个排盘请求
    
    **示例请求:**
    ```json
    {
        "params_list": [
            [2, 2, 1, 2, 4, 2],
            [1, 1, 1, 2, 2, 2],
            [2, 2, 2, 1, 1, 1]
        ],
        "dates": ["2023-01-01", "2023-02-01", "2023-03-01"],
        "max_workers": 4
    }
    ```
    """
    try:
        # 创建批量处理器
        processor = BatchProcessor(
            max_workers=request.max_workers,
            timeout=30
        )
        
        # 执行批量处理
        result: BatchResult = processor.process_batch(
            params_list=request.params_list,
            dates=request.dates,
            genders=request.genders,
            titles=request.titles,
            guaci=request.guaci
        )
        
        # 转换结果
        results_info = []
        for item in result.results:
            results_info.append(BatchResultInfo(
                params=item.params,
                name=item.name,
                mark=item.mark,
                success=True,
                error=None
            ))
        
        return BatchPaipanResponse(
            success_count=result.success_count,
            error_count=result.error_count,
            processing_time=result.processing_time,
            results=results_info
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"批量排盘失败: {str(e)}")


@app.post("/api/v1/paipan/text")
async def paipan_text(request: SinglePaipanRequest):
    """
    获取排盘的文本渲染结果
    
    返回格式化的六爻卦象文本
    """
    try:
        najia = Najia(verbose=0)
        najia.compile(
            params=request.params,
            date=request.date,
            gender=request.gender,
            title=request.title,
            guaci=request.guaci
        )
        
        # 渲染文本
        text_result = najia.render()
        
        return {
            "text": text_result,
            "params": request.params,
            "name": najia.result.name if najia.result else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"排盘失败: {str(e)}")


@app.post("/api/v1/interpret", response_model=InterpretResponse)
async def interpret_hexagram_api(request: InterpretRequest):
    """
    AI 智能解读卦象
    
    使用 NVIDIA NIM AI 进行个性化六爻解读
    
    **参数说明:**
    - hexagram_data: 卦象数据，包含卦名、卦宫、世应、六亲等信息
    - question: 用户占问的问题
    - model: AI 模型，'deepseek' 或 'glm'
    
    **示例请求:**
    ```json
    {
        "hexagram_data": {
            "name": "山地剥",
            "gong": "乾",
            "mark": "䷖",
            "shiy": [5, 2],
            "qin6": ["妻财寅木", "兄弟申金", "父母戌土", "妻财卯木", "官鬼巳火", "父母未土"],
            "qinx": ["甲寅木", "庚申金", "丙戌土", "乙卯木", "丁巳火", "己未土"],
            "god6": ["朱雀", "勾陈", "螣蛇", "白虎", "玄武", "青龙"],
            "yue_ling": ["旺", "相", "休", "囚", "死", "死"],
            "yue_zhi": "寅",
            "ri_chen": "辰",
            "dong": [2, 4],
            "bian_name": "火地晋"
        },
        "question": "问工作变动",
        "model": "deepseek"
    }
    ```
    """
    try:
        from najia.najia.ai_client import AIClient
        from najia.najia.config import NVIDIAConfig
        
        # 确定使用的模型
        config = NVIDIAConfig()
        model = config.DEFAULT_MODEL if request.model == "deepseek" else config.GLM_MODEL
        
        # 创建 AI 客户端
        client = AIClient(model=model)
        
        # 调用 AI 解读
        interpretation = client.interpret_hexagram(
            hexagram_info=request.hexagram_data,
            question=request.question
        )
        
        # 构建规则引擎分析结果（简化版，实际应该调用规则引擎）
        rule_analysis = RuleAnalysis(
            wuxing_balance="五行分布均衡，土元素稍旺",
            shiy_relation="世应相生，主吉",
            yueling_status="整体月令偏旺，卦象有力",
            dongyao_analysis=f"有{len(request.hexagram_data.get('dong', []))}个动爻，主变化",
            jixiong="中吉"
        )
        
        return InterpretResponse(
            hexagram_name=request.hexagram_data.get('name', '未知'),
            jixiong="中吉",
            rule_analysis=rule_analysis,
            ai_interpretation=interpretation
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AI 解读失败: {str(e)}")


# ==================== 启动入口 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
