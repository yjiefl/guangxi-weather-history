#!/bin/bash

# QNAP NAS 同步脚本
# 用于通过 rsync 将本地项目同步到 NAS 共享文件夹

# ================= 配置区 =================
NAS_USER="yjiefl"
NAS_IP="192.168.3.10"
NAS_PORT="22222"
# 注意：QNAP 的共享文件夹路径通常在 /share/ 目录下。
# 如果您的共享文件夹名为 "WebApps"，则路径通常为 /share/WebApps/weather-history
NAS_DEST_PATH="/share/WebApps/weather-history"
# ==========================================

# 获取脚本所在目录作为本地根目录
LOCAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "------------------------------------------------"
echo "🚀 开始同步 [weather-history] 到 NAS..."
echo "📍 目标: ${NAS_USER}@${NAS_IP}:${NAS_DEST_PATH}"
echo "------------------------------------------------"

# 1. 检查网络
if ! ping -c 1 -W 2 $NAS_IP > /dev/null; then
    echo "❌ 错误: 无法 ping 通 NAS ($NAS_IP)，请确保您与 NAS 在同一局域网。"
    exit 1
fi

# 2. 检查 rsync 是否安装
if ! command -v rsync &> /dev/null; then
    echo "❌ 错误: 本地未安装 rsync，请先运行 'brew install rsync'。"
    exit 1
fi

# 3. 执行同步
# 使用 -a (归档), -v (详细), -z (压缩), -e 指定端口
# 排除掉不需要在服务器上运行的环境文件夹、数据库文件和日志
rsync -avz --progress -e "ssh -p $NAS_PORT" \
    --exclude="venv/" \
    --exclude=".venv/" \
    --exclude="__pycache__/" \
    --exclude=".pytest_cache/" \
    --exclude=".git/" \
    --exclude=".agent/" \
    --exclude=".DS_Store" \
    --exclude="data/*.db" \
    --exclude="data/*.db-journal" \
    --exclude="logs/*.log" \
    --exclude="skill-creator/" \
    --exclude="skill_manager/" \
    "$LOCAL_DIR/" "$NAS_USER@$NAS_IP:$NAS_DEST_PATH/"

# 4. 结果反馈
if [ $? -eq 0 ]; then
    echo "------------------------------------------------"
    echo "✅ 同步完成！"
    echo "提示: 如果这是第一次同步，请登录 NAS 的 Container Station："
    echo "1. 确保已创建目录: ${NAS_DEST_PATH}"
    echo "2. 在该目录下运行: docker-compose up -d --build"
    echo "------------------------------------------------"
else
    echo "------------------------------------------------"
    echo "❌ 同步失败。"
    echo "可能原因:"
    echo "1. NAS 上的 SSH 服务未启动 (请在 QNAP 控制面板 -> 网络 & 文件服务 -> Telnet/SSH 中开启)。"
    echo "2. 目标路径 ${NAS_DEST_PATH} 不存在或权限不足。"
    echo "3. 密码错误或 SSH 密钥未配置。"
    echo "------------------------------------------------"
fi
