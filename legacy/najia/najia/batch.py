from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import logging
import time

from .result import HexagramResult
from .log import setup_logger

logger = setup_logger(__name__)


@dataclass
class BatchResult:
    """批量处理结果数据类"""
    results: List[HexagramResult]
    success_count: int
    error_count: int
    errors: List[str]
    processing_time: float

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'results': [result.to_dict() for result in self.results],
            'success_count': self.success_count,
            'error_count': self.error_count,
            'errors': self.errors,
            'processing_time': self.processing_time
        }

    def to_json(self) -> str:
        """转换为JSON字符串"""
        import json
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


class BatchProcessor:
    """批量处理工具类"""

    def __init__(self, max_workers: int = 4, timeout: int = 30):
        """
        初始化批量处理器
        :param max_workers: 最大并发工作线程数
        :param timeout: 超时时间(秒)
        """
        self.max_workers = max_workers
        self.timeout = timeout

    def process_batch(self,
                     params_list: List[List[int]],
                     dates: Optional[List[str]] = None,
                     genders: Optional[List[str]] = None,
                     titles: Optional[List[str]] = None,
                     guaci: bool = False) -> BatchResult:
        """
        批量处理爻位参数
        :param params_list: 爻位参数列表的列表
        :param dates: 日期列表
        :param genders: 性别列表
        :param titles: 标题列表
        :param guaci: 是否包含卦象文本
        :return: 批量处理结果
        """
        if not params_list:
            return BatchResult(
                results=[],
                success_count=0,
                error_count=0,
                errors=["Empty params list"],
                processing_time=0.0
            )

        start_time = time.time()
        results = []
        errors = []
        success_count = 0

        # 确保列表长度匹配
        n = len(params_list)
        dates = dates or [None] * n
        genders = genders or [None] * n
        titles = titles or [None] * n

        def process_single(params: List[int], date: str = None, gender: str = None, title: str = None) -> Optional[HexagramResult]:
            """处理单个卦象"""
            try:
                from .najia import Najia
                najia = Najia()
                najia.compile(
                    params=params,
                    date=date,
                    gender=gender,
                    title=title,
                    guaci=guaci
                )
                return najia.result
            except Exception as e:
                logger.error(f"Error processing params {params}: {str(e)}")
                return None

        # 使用线程池并行处理
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            for i, params in enumerate(params_list):
                future = executor.submit(
                    process_single,
                    params=params,
                    date=dates[i] if i < len(dates) else None,
                    gender=genders[i] if i < len(genders) else None,
                    title=titles[i] if i < len(titles) else None
                )
                futures.append(future)

            # 收集结果
            for i, future in enumerate(futures):
                try:
                    result = future.result(timeout=self.timeout)
                    if result:
                        results.append(result)
                        success_count += 1
                    else:
                        errors.append(f"Failed to process params {params_list[i]}")
                except Exception as e:
                    errors.append(f"Error processing params {params_list[i]}: {str(e)}")

        processing_time = time.time() - start_time

        return BatchResult(
            results=results,
            success_count=success_count,
            error_count=len(params_list) - success_count,
            errors=errors,
            processing_time=processing_time
        )

    def process_batch_sequential(self,
                               params_list: List[List[int]],
                               dates: Optional[List[str]] = None,
                               genders: Optional[List[str]] = None,
                               titles: Optional[List[str]] = None,
                               guaci: bool = False) -> BatchResult:
        """
        顺序批量处理(无并发)
        :param params_list: 爻位参数列表的列表
        :param dates: 日期列表
        :param genders: 性别列表
        :param titles: 标题列表
        :param guaci: 是否包含卦象文本
        :return: 批量处理结果
        """
        if not params_list:
            return BatchResult(
                results=[],
                success_count=0,
                error_count=0,
                errors=["Empty params list"],
                processing_time=0.0
            )

        start_time = time.time()
        results = []
        errors = []
        success_count = 0

        # 确保列表长度匹配
        n = len(params_list)
        dates = dates or [None] * n
        genders = genders or [None] * n
        titles = titles or [None] * n

        for i, params in enumerate(params_list):
            try:
                from .najia import Najia
                najia = Najia()
                najia.compile(
                    params=params,
                    date=dates[i] if i < len(dates) else None,
                    gender=genders[i] if i < len(genders) else None,
                    title=titles[i] if i < len(titles) else None,
                    guaci=guaci
                )
                results.append(najia.result)
                success_count += 1
            except Exception as e:
                error_msg = f"Error processing params {params}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

        processing_time = time.time() - start_time

        return BatchResult(
            results=results,
            success_count=success_count,
            error_count=len(params_list) - success_count,
            errors=errors,
            processing_time=processing_time
        )