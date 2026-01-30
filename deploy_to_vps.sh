#!/bin/zsh

# VPS 自动化部署脚本 (Weather History)
# 修改人: Antigravity (AI)
# 日期: 2026-01-31

# --- 配置区 ---
VPS_USER="root"
VPS_IP="107.174.62.30"
VPS_PATH="/root/apps/weather-history"
# --- --- --- ---

echo "📡 准备同步代码到 VPS ($VPS_IP)..."

# 使用 rsync 进行增量同步
rsync -avz --delete \
    --exclude "venv" \
    --exclude ".venv" \
    --exclude "__pycache__" \
    --exclude ".pytest_cache" \
    --exclude ".git" \
    --exclude ".agent" \
    --exclude ".DS_Store" \
    --exclude "data/*.db" \
    --exclude "logs/*.log" \
    ./ $VPS_USER@$VPS_IP:$VPS_PATH

if [ $? -eq 0 ]; then
    echo "✅ 同步成功！"
    echo "🛠  正在远程触发 Docker 重建与启动..."
    
    ssh $VPS_USER@$VPS_IP "cd $VPS_PATH && docker compose up -d --build"
    
    if [ $? -eq 0 ]; then
        echo "🚀 部署完成！"
    else
        echo "❌ 远程 Docker 构建失败。"
    fi
else
    echo "❌ 代码同步失败。"
fi
