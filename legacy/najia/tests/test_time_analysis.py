import pytest
from najia.time_analysis import (
    calc_yue_ling, is_yue_po, get_xun_kong, is_xun_kong, calc_liu_shen
)


def test_calc_yue_ling():
    assert calc_yue_ling('金', '申') == '旺'
    assert calc_yue_ling('水', '申') == '相'
    assert calc_yue_ling('木', '申') == '死'
    assert calc_yue_ling('火', '申') == '囚'
    assert calc_yue_ling('土', '申') == '休'


def test_is_yue_po():
    assert is_yue_po('子', '午') is True
    assert is_yue_po('丑', '未') is True
    assert is_yue_po('寅', '申') is True
    assert is_yue_po('子', '未') is False


def test_get_xun_kong():
    kong = get_xun_kong('甲子')
    assert '戌' in kong and '亥' in kong
    kong2 = get_xun_kong('乙丑')
    assert '戌' in kong2 and '亥' in kong2
    kong3 = get_xun_kong('丙寅')
    assert '戌' in kong3 and '亥' in kong3
    kong4 = get_xun_kong('甲戌')
    assert '申' in kong4 and '酉' in kong4
    assert get_xun_kong('甲') == []


def test_is_xun_kong():
    assert is_xun_kong('戌', '甲子') is True
    assert is_xun_kong('亥', '甲子') is True
    assert is_xun_kong('子', '甲子') is False


def test_calc_liu_shen():
    assert calc_liu_shen(0, '甲子') == '青龙'
    assert calc_liu_shen(1, '甲子') == '朱雀'
    assert calc_liu_shen(5, '甲子') == '玄武'
    assert calc_liu_shen(0, '乙丑') == '青龙'
    assert calc_liu_shen(0, '丙寅') == '朱雀'
