import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any, Sequence

import arrow
from jinja2 import Template

from .batch import BatchProcessor, BatchResult

from .const import GANS
from . import const
from .const import GUA5
from .const import GUA64
from .const import GUAS
from .const import SYMBOL
from .const import XING5
from .const import YAOS
from .const import ZHI5
from .const import ZHIS
from .utils import get_god6
from .utils import get_guaci
from .utils import get_najia
from .utils import get_qin6
from .utils import get_type
from .utils import GZ5X
from .utils import palace
from .utils import set_shi_yao
from .result import HexagramResult, HiddenHexagram, TransformedHexagram
from .log import setup_logger
from .lunar_utils import date_to_yue_ri_chen
from .time_analysis import calc_yue_ling, is_yue_po, is_xun_kong, calc_liu_shen

logger = setup_logger(__name__)


class Najia(object):

    def __init__(self, verbose: int = 0):
        """
        初始化纳甲类实例
        :param verbose: 详细程度（0-2）
        """
        self.verbose = 2 if verbose and verbose > 2 else verbose or 0
        self.bian = None  # 变卦
        self.hide = None  # 伏神
        self.result: Optional[HexagramResult] = None

    @staticmethod
    def _gz(cal: Any) -> str:
        """
        获取干支
        :param cal: 日历对象
        :return: 干支字符串
        """
        return GANS[cal.tg] + ZHIS[cal.dz]

    @staticmethod
    def _cn(cal: Any) -> str:
        """
        转换中文干支
        :param cal: 日历对象
        :return: 中文干支字符串
        """
        return GANS[cal.tg] + ZHIS[cal.dz]

    @staticmethod
    def _daily(date: arrow.Arrow) -> Dict[str, Any]:
        """
        计算日期
        :param date: Arrow 日期对象
        :return: 包含农历信息的字典
        """
        # lunar = sxtwl.Lunar()
        # daily = lunar.getDayBySolar(date.year, date.month, date.day)
        # hour = lunar.getShiGz(daily.Lday2.tg, date.hour)

        from lunar_python import Solar

        solar = Solar.fromYmdHms(date.year, date.month, date.day, date.hour, 0, 0)
        lunar = solar.getLunar()

        ganzi = lunar.getBaZi()

        result = {
            # 'xkong': xkong(''.join([GANS[daily.Lday2.tg], ZHIS[daily.Lday2.dz]])),
            'xkong': lunar.getDayXunKong(),
            # 'month': daily.Lmonth2,
            # 'year' : daily.Lyear2,
            # 'day'  : daily.Lday2,
            # 'hour' : hour,
            # 'cn'   : {
            #     'month': self._gz(daily.Lmonth2),
            #     'year' : self._gz(daily.Lyear2),
            #     'day'  : self._gz(daily.Lday2),
            #     'hour' : self._gz(hour),
            # },
            'gz': {
                'month': ganzi[1],
                'year': ganzi[0],
                'day': ganzi[2],
                'hour': ganzi[3],
            }
        }
        # pprint(result)
        return result

    @staticmethod
    def _hidden(gong_idx: int, qins: List[str]) -> Optional[HiddenHexagram]:
        """
        计算伏神卦
        :param gong_idx: 卦宫索引
        :param qins: 六亲列表
        :return: 伏神卦信息或None
        """
        if gong_idx is None:
            raise ValueError('gong_idx parameter is required for calculating hidden hexagram')

        if qins is None:
            raise ValueError('qins parameter is required for calculating hidden hexagram')

        if len(set(qins)) < 5:
            mark = YAOS[gong_idx] * 2

            logger.debug(mark)

            # 六亲
            palace_element_idx = const.XING5_DICT[const.XING5[int(const.GUA5[gong_idx])]]
            qin6 = [(get_qin6(palace_element_idx, const.ZHI5[const.ZHIS_DICT[x[1]]])) for x in get_najia(mark)]

            # 干支五行
            qinx = [GZ5X(x) for x in get_najia(mark)]
            seat = [qin6.index(x) for x in list(set(qin6).difference(set(qins)))]

            return HiddenHexagram(
                name=GUA64.get(mark),
                mark=mark,
                qin6=qin6,
                qinx=qinx,
                seat=seat
            )

        return None

    @staticmethod
    def _transform(params: List[int], gong_idx: int) -> Optional[TransformedHexagram]:
        """
        计算变卦
        :param params: 爻位参数列表
        :param gong_idx: 卦宫索引
        :return: 变卦信息或None
        """
        if params is None:
            raise ValueError('params parameter is required for calculating transformed hexagram')

        if isinstance(params, str):
            params = [x for x in params]

        if len(params) < 6:
            raise ValueError('params must have at least 6 elements')

        if 3 in params or 4 in params:
            mark = ''.join(['1' if v in [1, 4] else '0' for v in params])
            palace_element_idx = const.XING5_DICT[const.XING5[int(const.GUA5[gong_idx])]]
            qin6 = [(get_qin6(palace_element_idx, const.ZHI5[const.ZHIS_DICT[x[1]]])) for x in get_najia(mark)]
            qinx = [GZ5X(x) for x in get_najia(mark)]

            return TransformedHexagram(
                name=GUA64.get(mark),
                mark=mark,
                qin6=qin6,
                qinx=qinx,
                gong=GUAS[gong_idx],  # Use original palace for correct six relatives calculation
                hexagram_type=get_type(mark)
            )

        return None

    def compile(self, params: Optional[List[int]] = None, gender: Optional[str] = None,
                date: Optional[str] = None, title: Optional[str] = None, guaci: bool = False,
                yue_zhi: Optional[str] = None, ri_chen: Optional[str] = None, **kwargs) -> 'Najia':
        """
        根据参数编译卦
        :param params: 爻位参数列表
        :param gender: 性别
        :param date: 日期
        :param title: 标题
        :param guaci: 是否包含卦象文本
        :param yue_zhi: 月建地支（如'寅'），优先级低于date
        :param ri_chen: 日辰干支（如'甲子'），优先级低于date
        :return: Najia实例
        """
        title = title if title else ''
        solar = arrow.now() if date is None else arrow.get(date)
        lunar = self._daily(solar)
        gender = gender if bool(gender) else ''

        # 时间参数处理：date > yue_zhi/ri_chen > 默认不处理
        actual_yue_zhi = yue_zhi
        actual_ri_chen = ri_chen
        if date is not None:
            actual_yue_zhi, actual_ri_chen = date_to_yue_ri_chen(date)
        elif yue_zhi is None and ri_chen is None:
            # 使用当前日期的农历信息
            try:
                actual_yue_zhi = lunar.get('month_zhi') or lunar.get('gz', {}).get('month', ['',''])[0][-1] if hasattr(lunar, 'get') else None
                actual_ri_chen = lunar.get('gz', {}).get('day', '')
            except:
                pass

        if params is None:
            raise ValueError('params parameter is required for compiling hexagram')
            
        # 卦码
        mark = ''.join([str(int(p) % 2) for p in params])

        # 世应爻
        shiy = set_shi_yao(mark)  # 获取世应位置

        # 卦宫
        gong_idx = palace(mark, shiy[0])  # 计算卦宫

        # 卦名
        name = GUA64[mark]

        # 纳甲干支
        najia_list = get_najia(mark)

        # 六亲计算
        # 使用快速字典查找替代 .index() 调用
        palace_element_idx = const.XING5_DICT[const.XING5[int(const.GUA5[gong_idx])]]
        qin6 = [(get_qin6(palace_element_idx, const.ZHI5[const.ZHIS_DICT[x[1]]])) for x in najia_list]
        qinx = [GZ5X(x) for x in najia_list]

        # 六神
        god6 = get_god6(lunar['gz']['day'])

        # 动爻位置
        dong = [i for i, x in enumerate(params) if x > 2]

        # 伏神
        hide = self._hidden(gong_idx, qin6)

        # 变卦
        bian = self._transform(params=params, gong_idx=gong_idx)

        # 时间维度断卦属性计算
        yue_ling_list = None
        yue_po_list = None
        xun_kong_list = None
        
        if actual_yue_zhi is not None or actual_ri_chen is not None:
            # 提取每个爻的地支（从纳甲干支中获取）
            yao_dizhi_list = [najia_list[i][1] if len(najia_list[i]) > 1 else '' for i in range(6)]
            
            if actual_yue_zhi is not None:
                # 计算月令旺衰和月破
                # 使用 ZHIS_DICT 获取地支索引，然后用 ZHI5 获取五行索引
                yao_wuxing_idx_list = []
                for d in yao_dizhi_list:
                    if d and d in const.ZHIS_DICT:
                        zhi_idx = const.ZHIS_DICT[d]
                        wuxing_idx = const.ZHI5[zhi_idx] if zhi_idx < len(const.ZHI5) else 0
                        yao_wuxing_idx_list.append(wuxing_idx)
                    else:
                        yao_wuxing_idx_list.append(None)
                
                wuxing_str_list = [const.XING5[w] if w is not None and 0 <= w < len(const.XING5) else '' for w in yao_wuxing_idx_list]
                
                valid_dizhi = {'子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'}
                if actual_yue_zhi and actual_yue_zhi in valid_dizhi:
                    yue_ling_list = [calc_yue_ling(w, actual_yue_zhi) if w else '' for w in wuxing_str_list]
                    yue_po_list = [is_yue_po(d, actual_yue_zhi) if d else False for d in yao_dizhi_list]
                else:
                    yue_ling_list = None
                    yue_po_list = None
            
            if actual_ri_chen is not None:
                # 计算旬空和六神
                xun_kong_list = [is_xun_kong(d, actual_ri_chen) if d else False for d in yao_dizhi_list]
                liu_shen_list = [calc_liu_shen(i, actual_ri_chen) if i is not None else None for i in range(6)]

        # 创建数据类
        self.result = HexagramResult(
            params=params,
            mark=mark,
            name=name,
            gong=GUAS[gong_idx],  # Convert index to palace name
            shiy=shiy,
            qin6=qin6,
            qinx=qinx,
            god6=god6,
            dong=dong,
            solar=solar.isoformat(),
            lunar=lunar,
            hexagram_type=get_type(mark),
            guaci=get_guaci(name) if guaci else None,
            bian=bian,
            hide=hide,
            yue_ling=yue_ling_list,
            yue_po=yue_po_list,
            xun_kong=xun_kong_list,
            liu_shen=liu_shen_list if actual_ri_chen else None,
            yue_zhi=actual_yue_zhi,
            ri_chen=actual_ri_chen
        )

        return self

    def gua_type(self, i: int) -> None:
        return

    def render(self) -> str:
        """
        渲染卦象为字符串
        :return: 渲染后的字符串
        """
        if self.result is None:
            raise ValueError("No result to render. Call compile() first.")

        tpl = Path(__file__).parent / 'data' / 'standard.tpl'
        tpl = tpl.read_text(encoding='utf-8')

        symbal = SYMBOL[self.verbose]

        # 世应爻
        shiy = []
        for x in range(0, 6):
            if x == self.result.shiy[0] - 1:
                shiy.append('世')
            elif x == self.result.shiy[1] - 1:
                shiy.append('应')
            else:
                shiy.append('  ')

        empty = '\u3000' * 6
        rows = {
            'solar': self.result.solar,
            'lunar': self.result.lunar,
            'guaci': self.result.guaci,
            'gender': getattr(self.result, 'gender', ''),
            'title': getattr(self.result, 'title', ''),
            'name': self.result.name,
            'qin6': self.result.qin6,
            'qinx': self.result.qinx,
            'god6': self.result.god6,
            'shiy': shiy,
            'dyao': [symbal[x] if x in (3, 4) else '' for x in self.result.dong],
        }

        # 主卦
        rows['main'] = {
            'mark': [symbal[int(x)] for x in self.result.mark],
            'type': self.result.hexagram_type,
            'gong_idx': self.result.gong,
            'name': self.result.name,
            'indent': '\u3000' * 2,
            'dyao': [symbal[x] if x in (3, 4) else '' for x in self.result.dong]
        }

        # 伏神
        if self.result.hide:
            rows['hide'] = {
                'qin6': [' %s%s ' % (self.result.hide.qin6[x], self.result.hide.qinx[x]) if x in self.result.hide.seat else empty for x in range(0, 6)]
            }
            rows['main']['indent'] += empty
        else:
            rows['main']['indent'] += '\u3000' * 1
            rows['hide'] = {'qin6': ['  ' for _ in range(0, 6)]}

        rows['main']['display'] = '{indent}{name} ({gong_idx}-{type})'.format(**rows['main'])

        # 变卦
        if self.result.bian:
            hide_width = 8 if self.result.hide else 0
            rows['bian'] = {
                'type': get_type(self.result.bian.mark),
                'indent': (hide_width - len(rows['main']['display'])) * '\u3000',
                'qin6': [f'{self.result.bian.qin6[x]}{self.result.bian.qinx[x]}' if x in self.result.dong else f'  {self.result.bian.qin6[x]}{self.result.bian.qinx[x]}' for x in range(0, 6)],
                'mark': [symbal[int(x)] for x in self.result.bian.mark] if self.result.bian.mark else [' ' for _ in range(0, 6)]
            }
        else:
            rows['bian'] = {'qin6': [' ' for _ in range(0, 6)], 'mark': [' ' for _ in range(0, 6)]}

        # 世应
        shiy = []
        for x in range(0, 6):
            if x == self.result.shiy[0] - 1:
                shiy.append('世')
            elif x == self.result.shiy[1] - 1:
                shiy.append('应')
            else:
                shiy.append('  ')

        rows['shiy'] = shiy

        # 卦象文本
        if self.result.guaci:
            rows['guaci'] = get_guaci(self.result.name)

        template = Template(tpl)
        return template.render(**rows)

    def export(self) -> Dict[str, Any]:
        """导出为字典"""
        if self.result is None:
            raise ValueError("No result to export. Call compile() first.")
        return self.result.to_dict()

    def predict(self) -> None:
        """占卦预测（预留接口）"""
        return

    def batch_process(self,
                      params_list: List[List[int]],
                      dates: List[str] = None,
                      genders: List[str] = None,
                      titles: List[str] = None,
                      guaci: bool = False,
                      max_workers: int = 4) -> BatchResult:
        """
        批量处理卦象
        :param params_list: 爻位参数列表的列表
        :param dates: 日期列表
        :param genders: 性别列表
        :param titles: 标题列表
        :param guaci: 是否包含卦象文本
        :param max_workers: 最大并发工作线程数
        :return: 批量处理结果
        """
        processor = BatchProcessor(max_workers=max_workers)
        return processor.process_batch(
            params_list=params_list,
            dates=dates,
            genders=genders,
            titles=titles,
            guaci=guaci
        )
