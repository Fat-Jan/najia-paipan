"""
配置文件模块
支持用户偏好设置和默认值配置
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict, field


@dataclass
class UserConfig:
    """用户配置文件类"""
    default_date: str = ""
    default_gender: str = ""
    verbose_level: int = 2
    guaci_enabled: bool = False
    max_workers: int = 4
    timeout: int = 30
    output_format: str = "text"  # text, json, dict
    language: str = "zh_CN"

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)

    def to_json(self) -> str:
        """转换为JSON字符串"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserConfig':
        """从字典创建配置"""
        # 验证配置值的有效性
        if 'verbose_level' in data and (not isinstance(data['verbose_level'], int) or data['verbose_level'] < 0 or data['verbose_level'] > 2):
            data['verbose_level'] = 2

        if 'max_workers' in data and (not isinstance(data['max_workers'], int) or data['max_workers'] < 1 or data['max_workers'] > 32):
            data['max_workers'] = 4

        if 'timeout' in data and (not isinstance(data['timeout'], int) or data['timeout'] < 1 or data['timeout'] > 300):
            data['timeout'] = 30

        if 'output_format' in data and data['output_format'] not in ["text", "json", "dict"]:
            data['output_format'] = "text"

        if 'language' in data and data['language'] not in ["zh_CN", "zh_TW", "en"]:
            data['language'] = "zh_CN"

        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> 'UserConfig':
        """从JSON字符串创建配置"""
        data = json.loads(json_str)
        return cls.from_dict(data)


@dataclass
class NVIDIAConfig:
    """NVIDIA NIM AI 配置

    API_KEY 从环境变量 NVIDIA_API_KEY 读取，不再硬编码。
    """
    API_KEY: str = field(default_factory=lambda: os.getenv("NVIDIA_API_KEY", ""))
    BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DEFAULT_MODEL: str = "deepseek-ai/deepseek-v3.2"
    GLM_MODEL: str = "z-ai/glm-4.7"

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)

    def to_json(self) -> str:
        """转换为JSON字符串"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NVIDIAConfig':
        """从字典创建配置"""
        """从字典创建配置"""
        # 验证配置值的有效性
        if 'verbose_level' in data and (not isinstance(data['verbose_level'], int) or data['verbose_level'] < 0 or data['verbose_level'] > 2):
            data['verbose_level'] = 2

        if 'max_workers' in data and (not isinstance(data['max_workers'], int) or data['max_workers'] < 1 or data['max_workers'] > 32):
            data['max_workers'] = 4

        if 'timeout' in data and (not isinstance(data['timeout'], int) or data['timeout'] < 1 or data['timeout'] > 300):
            data['timeout'] = 30

        if 'output_format' in data and data['output_format'] not in ["text", "json", "dict"]:
            data['output_format'] = "text"

        if 'language' in data and data['language'] not in ["zh_CN", "zh_TW", "en"]:
            data['language'] = "zh_CN"

        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> 'NVIDIAConfig':
        """从JSON字符串创建配置"""
        data = json.loads(json_str)
        return cls.from_dict(data)


class ConfigManager:
    """配置管理器"""

    def __init__(self, config_dir: Optional[str] = None, config_file: Optional[str] = None):
        """
        初始化配置管理器
        :param config_dir: 配置目录路径
        :param config_file: 配置文件名
        """
        self.config_dir = Path(config_dir) if config_dir is not None else self._get_default_config_dir()
        self.config_file = Path(config_file) if config_file is not None else (self.config_dir / "najia_config.json")
        self._ensure_config_dir()

    @staticmethod
    def _get_default_config_dir() -> Path:
        """获取默认配置目录"""
        # 跨平台配置目录
        if os.name == 'nt':  # Windows
            base_dir = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
        else:  # Unix-like
            base_dir = Path.home() / '.config'

        return base_dir / 'najia'

    def _ensure_config_dir(self) -> None:
        """确保配置目录存在"""
        self.config_dir.mkdir(parents=True, exist_ok=True)

    def load_config(self) -> UserConfig:
        """
        加载配置文件
        :return: 用户配置实例
        """
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return UserConfig.from_dict(data)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"警告: 配置文件格式错误，使用默认配置: {e}")
                return UserConfig()
        else:
            # 创建默认配置
            default_config = UserConfig()
            self.save_config(default_config)
            return default_config

    def save_config(self, config: UserConfig) -> None:
        """
        保存配置文件
        :param config: 用户配置实例
        """
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                f.write(config.to_json())
            print(f"配置已保存到: {self.config_file}")
        except Exception as e:
            print(f"保存配置文件失败: {e}")

    def update_config(self, **kwargs) -> UserConfig:
        """
        更新配置
        :param kwargs: 要更新的配置项
        :return: 新的配置实例
        """
        config = self.load_config()
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
            else:
                print(f"警告: 未知配置项 '{key}'")
        self.save_config(config)
        return config

    def reset_config(self) -> UserConfig:
        """重置为默认配置"""
        default_config = UserConfig()
        self.save_config(default_config)
        return default_config


# 全局配置管理器实例
_default_config_manager = ConfigManager()


def get_config_manager() -> ConfigManager:
    """获取全局配置管理器实例"""
    return _default_config_manager


def get_config() -> UserConfig:
    """获取全局配置实例"""
    return _default_config_manager.load_config()


def update_config(**kwargs) -> UserConfig:
    """更新全局配置"""
    return _default_config_manager.update_config(**kwargs)


def reset_config() -> UserConfig:
    """重置全局配置"""
    return _default_config_manager.reset_config()