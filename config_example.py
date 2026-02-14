#!/usr/bin/env python3
"""
配置文件使用示例
"""

from najia.config import get_config, update_config, reset_config, UserConfig
from najia.najia import Najia

def main():
    """配置使用示例"""

    print("=== 配置文件使用示例 ===")

    # 1. 获取当前配置
    print("\n1. 获取当前配置:")
    config = get_config()
    print(f"当前配置: {config.to_dict()}")

    # 2. 更新配置
    print("\n2. 更新配置:")
    config = update_config(
        default_date="2023-12-25",
        verbose_level=3,
        guaci_enabled=True,
        max_workers=2
    )
    print(f"更新后配置: {config.to_dict()}")

    # 3. 使用配置创建Najia实例
    print("\n3. 使用配置创建Najia实例:")
    najia = Najia(verbose=config.verbose_level)

    # 编译卦象，使用配置中的默认值
    result = najia.compile(
        params=[2, 2, 1, 2, 4, 2],
        date=config.default_date,
        guaci=config.guaci_enabled
    )

    print(f"编译结果: {result.result.name}")

    # 4. 批量处理使用配置
    print("\n4. 批量处理使用配置:")
    from najia.batch import BatchProcessor

    processor = BatchProcessor(max_workers=config.max_workers)

    params_list = [
        [2, 2, 1, 2, 4, 2],
        [1, 1, 1, 2, 2, 2],
        [2, 2, 2, 1, 1, 1]
    ]

    batch_result = processor.process_batch(
        params_list=params_list,
        dates=[config.default_date] * len(params_list),
        guaci=config.guaci_enabled
    )

    print(f"批量处理完成: {batch_result.success_count}/{len(params_list)} 成功")

    # 5. 重置配置
    print("\n5. 重置配置:")
    reset_config()
    new_config = get_config()
    print(f"重置后配置: {new_config.to_dict()}")

    # 6. 创建自定义配置
    print("\n6. 创建自定义配置:")
    custom_config = UserConfig(
        default_date="2024-01-01",
        verbose_level=1,
        guaci_enabled=False,
        output_format="json",
        language="zh_CN"
    )
    print(f"自定义配置: {custom_config.to_dict()}")

if __name__ == "__main__":
    main()