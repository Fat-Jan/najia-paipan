from typing import List
from .const import GANS, ZHIS, ZHI5, XING5

# Derive DIZHI_WUXING from const.ZHI5 + const.XING5
# ZHI5 values are indices into XING5: ZHI5[idx] gives the element index
DIZHI_WUXING = {zhi: XING5[ZHI5[idx]] for idx, zhi in enumerate(ZHIS)}

# 冲关系（月破判断）
CHONG_MAP = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉',
    '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
    '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳'
}

# 六神起始（按日干）
LIUSHEN_START = {
    '甲': '青龙', '乙': '青龙',
    '丙': '朱雀', '丁': '朱雀',
    '戊': '勾陈', '己': '勾陈',
    '庚': '白虎', '辛': '白虎',
    '壬': '玄武', '癸': '玄武',
}
LIUSHEN_ORDER = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']

# 五行生克关系
SHENG_CYCLE = {
    ('金', '水'), ('水', '木'), ('木', '火'), ('火', '土'), ('土', '金'),
}
KE_RELATIONS = {
    ('金', '木'), ('木', '土'), ('土', '水'), ('火', '金'), ('水', '火'),
}


def calc_yue_ling(yao_wuxing: str, yue_zhi: str) -> str:
    """计算月令旺衰：同我为旺，生我为相，我生为休，克我为囚，我克为死"""
    yue_wuxing = DIZHI_WUXING[yue_zhi]
    if yue_wuxing == yao_wuxing:
        return '旺'
    if (yue_wuxing, yao_wuxing) in SHENG_CYCLE:
        return '相'
    if (yao_wuxing, yue_wuxing) in SHENG_CYCLE:
        return '休'
    if (yue_wuxing, yao_wuxing) in KE_RELATIONS:
        return '死'
    if (yao_wuxing, yue_wuxing) in KE_RELATIONS:
        return '囚'
    return ''


def is_yue_po(yao_dizhi: str, yue_zhi: str) -> bool:
    """若爻的地支与月建地支相冲，返回 True"""
    return CHONG_MAP.get(yao_dizhi) == yue_zhi


def get_xun_kong(ri_chen_gan_zhi: str) -> List[str]:
    """
    根据日辰干支（如'戊午'），返回该旬空亡的两个地支（如['子','丑']）。
    """
    if len(ri_chen_gan_zhi) not in (2, 3):
        return []
    gan = ri_chen_gan_zhi[0]
    zhi = ri_chen_gan_zhi[1:]
    try:
        gan_index = GANS.index(gan)
        zhi_index = ZHIS.index(zhi)
        start_zhi_index = (zhi_index - gan_index) % 12
        kong1 = ZHIS[(start_zhi_index - 2) % 12]
        kong2 = ZHIS[(start_zhi_index - 1) % 12]
        return [kong1, kong2]
    except ValueError:
        return []


def is_xun_kong(yao_dizhi: str, ri_chen_gan_zhi: str) -> bool:
    """若爻的地支属于该日的旬空地支，返回 True"""
    return yao_dizhi in get_xun_kong(ri_chen_gan_zhi)


def calc_liu_shen(yao_position: int, ri_chen_gan_zhi: str) -> str:
    """
    根据爻位（0~5，初爻至上爻）和日辰干支，返回六神名称。
    """
    gan = ri_chen_gan_zhi[0]
    start = LIUSHEN_START.get(gan, '青龙')
    start_index = LIUSHEN_ORDER.index(start)
    liu_shen_index = (start_index + yao_position) % 6
    return LIUSHEN_ORDER[liu_shen_index]
