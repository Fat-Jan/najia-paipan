from najia.utils import get_guaci


def test_guaci():
    assert (get_guaci('乾为天'))


def test_gui_hun_shi_yao():
    # 使用 Najia.compile 对应 paipan([7,8,9,7,8,9]) 的参数
    from najia.najia import Najia

    gua = Najia().compile(params=[7, 8, 9, 7, 8, 9])

    # 期望 世 在 0-based 索引 5（shiy[0] 为 1-based）
    assert gua.result.shiy[0] - 1 == 5

    # 期望 应 在 0-based 索引 2（shiy[1] 为 1-based）
    assert gua.result.shiy[1] - 1 == 2
