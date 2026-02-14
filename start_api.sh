#!/bin/bash
# 六爻排盘 API 启动脚本

echo "========================================"
echo "  六爻排盘 FastAPI API 服务"
echo "========================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3.9+"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "安装依赖..."
pip install -q -r requirements-api.txt

# 启动服务
echo ""
echo "========================================"
echo "  API 服务启动中..."
echo "========================================"
echo "  访问地址:"
echo "    - API:     http://localhost:8000"
echo "    - 文档:    http://localhost:8000/api/v1/docs"
echo "    - ReDoc:   http://localhost:8000/api/v1/redoc"
echo "========================================"
echo ""

python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
