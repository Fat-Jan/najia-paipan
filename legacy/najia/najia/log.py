"""
日志配置模块 - 统一项目的日志格式
"""
import logging
import sys


def setup_logger(
    name: str = __name__,
    level: int = logging.INFO,
    format_str: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream: any = sys.stdout
) -> logging.Logger:
    """
    配置并返回日志记录器

    :param name: 日志记录器名称
    :param level: 日志级别（如 logging.INFO）
    :param format_str: 日志格式字符串
    :param stream: 日志输出流（默认为 stdout）
    :return: 配置好的日志记录器
    """
    logger = logging.getLogger(name)

    # 避免重复添加处理器
    if logger.hasHandlers():
        return logger

    logger.setLevel(level)

    # 创建格式化器
    formatter = logging.Formatter(format_str)

    # 创建控制台处理器
    console_handler = logging.StreamHandler(stream)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    return logger