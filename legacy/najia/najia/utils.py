import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any, Union

from . import const
from .log import setup_logger

logger = setup_logger(__name__)


def GZ5X(gz: str = '') -> str:
    """
    干支五行
    :param gz: 干支字符串
    :return: 干支 + 五行
    """
    _, z = [i for i in gz]
    zm = const.ZHIS.index(z)

    return gz + const.XING5[const.ZHI5[zm]]


def mark(symbol: str = None) -> List[str]:
    """
    单拆重交 转 二进制卦码
    :param symbol: 符号
    :return: 二进制列表
    """
    res = [str(int(x) % 2) for x in symbol]
    logger.debug(res)

    return res


def xkong(gz: Union[str, Tuple[int, int]] = '甲子') -> str:
    """
    计算旬空
    :param gz: 甲子 or (3,11)
    :return: 旬空字符串
    """
    # 处理字符串形式
    if isinstance(gz, str):
        gm, zm = gz[0], gz[1]
        gm = const.GANS.index(gm)
        zm = const.ZHIS.index(zm)
    else:
        # 处理数值形式 (gm, zm)
        gm, zm = gz

    if gm == zm or zm < gm:
        zm += 12

    xk = int((zm - gm) / 2) - 1

    return const.KONG[xk]


def get_god6(gz: str) -> List[str]:
    """
    六神, 根据日干五行配对六神五行
    :param gz: 日干支
    :return: 六神列表
    """

    gm, _ = [i for i in gz]

    if isinstance(gm, str):
        gm = const.GANS.index(gm)

    num = math.ceil((gm + 1) / 2) - 7

    if gm == 4:
        num = -4

    if gm == 5:
        num = -3

    if gm > 5:
        num += 1

    return list(const.SHEN6[num:] + const.SHEN6[:num])


'''
寻世诀：
天同二世天变五，地同四世地变初。
本宫六世三世异，人同游魂人变归。

1. 天同人地不同世在二，天不同人地同在五
2. 三才不同世在三
3. 人同其他不同世在四，人不同其他同在三'''


# 世爻初爻是1，二爻是2
# 寻世诀： 天同二世天变五  地同四世地变初  本宫六世三世异  人同游魂人变归
# int('111', 2) => 7
# 世爻 >= 3, 应爻 = 世爻 - 3， index = 5 - 世爻 + 1
# 世爻 <= 3, 应爻 = 世爻 + 3，
# life oneself
@lru_cache(maxsize=64)
def set_shi_yao(symbol: str) -> Tuple[int, int, int]:
    """
    获取世爻（优化版 - 使用预计算查表）
    :param symbol: 卦的二进制码
    :return: 世爻，应爻，所在卦宫位置
    """
    try:
        # 尝试使用预计算的查表
        from . import const
        return const.SHIYING_PRECOMPUTED[symbol]
    except (ImportError, AttributeError, KeyError):
        # 预计算尚未完成或失败，使用原始逻辑
        wai = symbol[3:]  # 外卦
        nei = symbol[:3]  # 内卦

        def shiy(shi: int, index: int = None) -> Tuple[int, int, int]:
            ying = shi - 3 if shi > 3 else shi + 3
            index = shi if index is None else index
            return shi, ying, index

        # 天同二世天变五
        if wai[2] == nei[2]:
            if wai[1] != nei[1] and wai[0] != nei[0]:
                return shiy(2)
        else:
            if wai[1] == nei[1] and wai[0] == nei[0]:
                return shiy(5)

        # 人同游魂人变归
        if wai[1] == nei[1]:
            if wai[0] != nei[0] and wai[2] != nei[2]:
                return shiy(4, 6)  # , Hun
        else:
            # fix 归魂问题
            if wai[0] == nei[0] and wai[2] == nei[2]:
                return shiy(3, 6)  # , Hun

        # 地同四世地变初
        if wai[0] == nei[0]:
            if wai[1] != nei[1] and wai[2] != nei[2]:
                return shiy(4)
        else:
            if wai[1] == nei[1] and wai[2] == nei[2]:
                return shiy(1)

        # 本宫六世
        if wai == nei:
            return shiy(6)

        # 三世异
        return shiy(3)


def get_type(symbol: str = None) -> str:
    if res := soul(symbol):
        return res

    if attack(symbol):
        return '六冲'

    if res := unite(symbol):
        return res

    return ''


def unite(symbol: str = None) -> Optional[str]:
    name = const.GUA64[symbol]

    for x in const.LIUHE:
        if x in name:
            return '六合'

    return None


def soul(symbol: str = None) -> Optional[str]:
    wai = symbol[3:]  # 外卦
    nei = symbol[:3]  # 内卦
    hun = ''

    if wai[1] == nei[1]:
        if wai[0] != nei[0] and wai[2] != nei[2]:
            hun = '游魂'
    else:
        if wai[0] == nei[0] and wai[2] == nei[2]:
            hun = '归魂'

    return hun


def palace(symbol: str, index: int) -> int:  # inStr -> '111000'  # intNum -> 世爻
    """
    六爻卦的卦宫名
    认宫诀：
    一二三六外卦宫，四五游魂内变更。
    若问归魂何所取，归魂内卦是本宫。
    :param symbol: 卦的二进制码
    :param index: 世爻
    :return: 卦宫索引
    """

    wai = symbol[3:]  # 外卦
    nei = symbol[:3]  # 内卦
    hun = ''

    if wai[1] == nei[1]:
        if wai[0] != nei[0] and wai[2] != nei[2]:
            hun = '游魂'
    else:
        if wai[0] == nei[0] and wai[2] == nei[2]:
            hun = '归魂'

    # 归魂内卦是本宫
    if hun == '归魂':
        return const.YAOS_DICT[nei]

    # 一二三六外卦宫
    # WORLD_LINE_POSITIONS: 世爻在初、二、三、六爻时，外卦即为卦宫
    WORLD_LINE_POSITIONS = (1, 2, 3, 6)
    if index in WORLD_LINE_POSITIONS:
        return const.YAOS_DICT[wai]

    # 四五游魂内变更
    # 世爻在四、五爻或游魂卦时，内卦变爻后即为卦宫
    WANDERING_SOUL_POSITIONS = (4, 5)
    if index in WANDERING_SOUL_POSITIONS or hun == '游魂':
        # 使用位运算优化内卦变爻
        nei_int = int(nei, 2)
        transformed_nei = nei_int ^ 0b111  # 快速计算卦的反卦
        transformed_symbol = format(transformed_nei, '03b')
        return const.YAOS_DICT[transformed_symbol]


def attack(symbol: str = None) -> bool:
    wai = symbol[3:]  # 外卦
    nei = symbol[:3]  # 内卦

    # 内外卦相同
    if wai == nei:
        return True

    # 天雷无妄 和 雷天大壮
    gua = [nei, wai]

    try:
        if len(set(gua).difference(('100', '111'))) == 0:
            return True
    except TypeError:
        pass

    return False


# 纳甲配干支（优化版 - 预计算查表）
def get_najia(symbol: str = None) -> List[str]:
    """
    纳甲配干支（优化版 - 使用预计算查表）

    :param symbol: 卦的二进制码 (e.g., '111000')
    :return: 6个干支列表
    """
    # 使用预计算的64卦象纳甲查表 - O(1) 查找
    return const.NAJIA_PRECOMPUTED[symbol]


@lru_cache(maxsize=25)
def get_qin6(w1: str | int, w2: str | int) -> str:
    """
    两个五行判断六亲（优化版 - 矩阵查找）
    水1 # 木2 # 金3 # 火4 # 土5
    :param w1: 第一个五行（支持字符串或整数）
    :param w2: 第二个五行（支持字符串或整数）
    :return: 六亲字符串
    """
    # 使用快速查找字典替代 O(n) 索引查找
    w1_idx = const.XING5_DICT.get(w1, w1) if isinstance(w1, str) else w1
    w2_idx = const.XING5_DICT.get(w2, w2) if isinstance(w2, str) else w2

    # 直接使用预计算矩阵（更高效）
    # 五行生克关系：水生木，木生火，火生土，土生金，金生水
    ws = (w2_idx - w1_idx) % 5  # 计算生克差值
    q6 = const.QIN6_MATRIX[w1_idx][w2_idx]

    logger.debug(ws)
    logger.debug(q6)

    return q6


def get_guaci(name: str) -> Optional[Dict[str, Any]]:
    import json

    try:
        result = Path(__file__).parent / 'data' / 'guaci.json'
        with open(result, encoding='utf-8') as f:
            data = json.load(f)
        result = data.get(name)

        return result
    except Exception as ex:
        logger.exception(ex)
        return None
