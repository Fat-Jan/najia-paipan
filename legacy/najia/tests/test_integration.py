# Integration tests for najia compile workflow

from najia.najia import Najia


def test_compile_workflow_with_bian_gua():
    """Test complete compile workflow with transformed hexagram"""
    params = [2, 2, 1, 2, 4, 2]  # Has dynamic lines
    gua = Najia(verbose=2).compile(params=params, date='2019-12-25 00:20')

    assert gua.result is not None
    assert gua.result.mark == '001000'
    assert gua.result.name == '地山谦'
    assert len(gua.result.shiy) == 3  # (世, 应, 索引)
    assert gua.result.gong in ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
    assert len(gua.result.qin6) == 6
    assert len(gua.result.god6) == 6

    # Verify transformed hexagram
    assert gua.result.bian is not None
    assert gua.result.bian.name is not None
    assert gua.result.bian.mark is not None
    assert gua.result.bian.qin6 is not None


def test_compile_workflow_without_bian_gua():
    """Test compile workflow without transformed hexagram (no dynamic lines)"""
    params = [1, 1, 1, 1, 1, 1]  # No dynamic lines (all 1s)
    gua = Najia(verbose=2).compile(params=params, date='2019-12-25 00:20')

    assert gua.result is not None
    assert gua.result.mark == '111111'
    assert gua.result.name == '乾为天'

    # Should not have transformed hexagram
    assert gua.result.bian is None


def test_render_workflow():
    """Test complete render workflow"""
    params = [2, 2, 1, 2, 4, 2]
    gua = Najia(verbose=2).compile(params=params, date='2019-12-25 00:20')
    output = gua.render()
    
    assert isinstance(output, str)
    assert len(output) > 0
    assert '地山谦' in output


def test_compile_with_guaci():
    """Test compile workflow with hexagram text"""
    params = [2, 2, 1, 2, 4, 2]
    gua = Najia(verbose=2).compile(params=params, date='2019-12-25 00:20', guaci=True)
    output = gua.render()
    
    # Should include hexagram text when guaci=True
    assert len(output) > 0


def test_compile_without_date():
    """Test compile workflow without date (should use current time)"""
    params = [2, 2, 1, 2, 4, 2]
    gua = Najia(verbose=2).compile(params=params)

    assert gua.result is not None
    assert gua.result.solar is not None
    assert gua.result.lunar is not None


def test_gui_hun_shi_yao():
    """Test 归魂卦 (火天大有) - 世应在第3爻 (0-based index 2)"""
    params = [1, 1, 1, 1, 2, 1]  # 火天大有 (归魂卦)
    gua = Najia(verbose=0).compile(params=params, date='2023-01-01 12:00')

    assert gua.result is not None
    assert gua.result.name == '火天大有'
    assert gua.result.gong == '乾'  # 归魂卦在乾宫

    # 归魂卦：世爻在三爻 (1-based: 3, 0-based: 2)
    assert gua.result.shiy[0] == 3  # 世爻位置 (1-based)
    assert gua.result.shiy[1] == 6  # 应爻位置 (1-based)

    # 验证世应相隔3位
    shi_index = gua.result.shiy[0] - 1  # 转换为 0-based
    ying_index = gua.result.shiy[1] - 1  # 转换为 0-based
    assert shi_index == 2  # 世爻在 index 2 (第三爻)
    assert ying_index == 5  # 应爻在 index 5 (第六爻)
    assert abs(ying_index - shi_index) == 3  # 应与世相隔3位


def test_you_hun_shi_yao():
    """Test 游魂卦 (火地晋) - 世应在第4爻 (0-based index 3)"""
    params = [2, 2, 2, 1, 2, 1]  # 火地晋 (游魂卦)
    gua = Najia(verbose=0).compile(params=params, date='2023-01-01 12:00')

    assert gua.result is not None
    assert gua.result.name == '火地晋'
    assert gua.result.gong == '乾'  # 游魂卦也在乾宫

    # 游魂卦：世爻在四爻 (1-based: 4, 0-based: 3)
    assert gua.result.shiy[0] == 4  # 世爻位置 (1-based)
    assert gua.result.shiy[1] == 1  # 应爻位置 (1-based)

    # 验证世应相隔3位
    shi_index = gua.result.shiy[0] - 1  # 转换为 0-based
    ying_index = gua.result.shiy[1] - 1  # 转换为 0-based
    assert shi_index == 3  # 世爻在 index 3 (第四爻)
    assert ying_index == 0  # 应爻在 index 0 (第一爻)
