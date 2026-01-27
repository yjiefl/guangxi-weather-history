#!/bin/bash

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================================"
echo "广西历史天气数据查询系统 - 启动脚本"
echo "============================================================"

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "正在创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
echo "正在检查依赖项..."
pip install -r requirements.txt | grep -v 'already satisfied'

# 初始化数据库 (如果不存在)
if [ ! -f "data/weather.db" ]; then
    echo "正在初始化数据库..."
    python backend/init_db.py
fi

# 启动服务
echo "------------------------------------------------------------"
echo "正在启动服务器..."
echo "访问地址: http://localhost:5001"
echo "------------------------------------------------------------"
echo "按 Ctrl+C 可以停止服务器并关闭此窗口。"
echo "------------------------------------------------------------"

python backend/app.py

# 脚本结束时保持窗口开启一段时间
echo "服务器已停止。"
sleep 2
