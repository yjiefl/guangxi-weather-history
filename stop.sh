#!/bin/bash
# 彻底关闭天气查询系统服务脚本

echo "🛑 正在准备关闭服务..."

# 1. 尝试通过 Docker 关闭 (如果是在 Docker 中运行)
if [ -f "docker-compose.yml" ]; then
    echo "🐳 检测到 Docker Compose，正在停止容器..."
    docker-compose down
fi

# 2. 尝试寻找并杀掉本地运行的 Flask 进程
# 搜索运行 backend/app.py 的 python 进程
PID=$(ps aux | grep 'backend/app.py' | grep -v 'grep' | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "🐍 发现正在运行的 Python 进程 (PID: $PID)，正在关闭..."
    kill $PID
    echo "✅ 本地后台服务已关闭。"
else
    echo "ℹ️  未发现正在运行的本地后台服务。"
fi

# 3. 针对 macOS 的额外处理 (杀掉可能的僵尸进程)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # 查找占用 5001 端口的进程
    PORT_PID=$(lsof -t -i:5001)
    if [ -n "$PORT_PID" ]; then
        echo "🍎 发现占用 5001 端口的进程 (PID: $PORT_PID)，正在强制关闭..."
        kill -9 $PORT_PID
    fi
fi

echo "🚀 服务关闭操作完成。"
