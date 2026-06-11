@echo off
chcp 65001 >nul
REM 六爻排盘 API 启动脚本 (Windows)

echo ========================================
echo   六爻排盘 FastAPI API 服务
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 python，请先安装 Python 3.9+
    exit /b 1
)

REM 检查虚拟环境
if not exist venv (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装依赖...
pip install -q -r requirements-api.txt

REM 启动服务
echo.
echo ========================================
echo   API 服务启动中...
echo ========================================
echo   访问地址:
echo     - API:     http://localhost:8000
echo     - 文档:    http://localhost:8000/api/v1/docs
echo     - ReDoc:   http://localhost:8000/api/v1/redoc
echo ========================================
echo.

python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
