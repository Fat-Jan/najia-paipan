#!/usr/bin/env python3
"""
批量处理示例
"""

from typing import List
from najia.batch import BatchProcessor
from najia.najia import Najia

def main():
    """批量处理示例"""
    # 示例数据 - 64个卦象的爻位参数
    sample_params = [
        [2, 2, 1, 2, 4, 2],  # 地山谦
        [1, 1, 1, 2, 2, 2],  # 乾为天
        [2, 2, 2, 1, 1, 1],  # 坤为地
        [1, 2, 1, 2, 1, 2],  # 天地否
        [2, 1, 2, 1, 2, 1],  # 地天泰
    ]

    # 创建批量处理器
    processor = BatchProcessor(max_workers=3, timeout=10)

    # 方法1: 并行批量处理
    print("=== 并行批量处理 ===")
    result = processor.process_batch(
        params_list=sample_params,
        dates=['2023-01-01', '2023-02-01', '2023-03-01', '2023-04-01', '2023-05-01'],
        genders=['男', '女', '男', '女', '男'],
        titles=['测试1', '测试2', '测试3', '测试4', '测试5']
    )

    print(f"成功: {result.success_count}")
    print(f"失败: {result.error_count}")
    print(f"处理时间: {result.processing_time:.3f}秒")
    print(f"结果数量: {len(result.results)}")

    if result.results:
        print(f"\n第一个结果: {result.results[0].name} - {result.results[0].mark}")

    # 方法2: 顺序批量处理
    print("\n=== 顺序批量处理 ===")
    sequential_result = processor.process_batch_sequential(
        params_list=sample_params[:3],  # 只处理前3个
        dates=['2023-06-01', '2023-07-01', '2023-08-01']
    )

    print(f"成功: {sequential_result.success_count}")
    print(f"失败: {sequential_result.error_count}")
    print(f"处理时间: {sequential_result.processing_time:.3f}秒")

    # 方法3: 性能测试
    print("\n=== 性能测试 ===")
    import time

    # 生成大量测试数据
    large_params = [sample_params[0] for _ in range(100)]  # 100个相同的参数

    start_time = time.time()
    perf_result = processor.process_batch_sequential(large_params)
    end_time = time.time()

    print(f"100个卦象处理时间: {end_time - start_time:.3f}秒")
    print(f"平均每个卦象: {(end_time - start_time) / 100:.3f}秒")

if __name__ == "__main__":
    main()