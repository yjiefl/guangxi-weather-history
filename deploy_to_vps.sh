#!/bin/zsh

# VPS 自动化部署脚本 (Weather History)
# 修改人: Antigravity (AI)
# 日期: 2026-01-31

# --- 配置区 ---
SSH_ALIAS="racknerd"
VPS_PATH="/root/apps/weather-history"
# --- --- --- ---

echo "📡 准备同步代码到 VPS ($SSH_ALIAS)..."

# 确保远程目录存在
ssh $SSH_ALIAS "mkdir -p $VPS_PATH"

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
    ./ $SSH_ALIAS:$VPS_PATH

if [ $? -eq 0 ]; then
    echo "✅ 同步成功！"
    echo "🛠  正在远程触发 Docker 重建与启动..."
    
    ssh $SSH_ALIAS "cd $VPS_PATH && docker-compose up -d --build"
    
    if [ $? -eq 0 ]; then
        echo "🚀 部署完成！"
    else
        echo "❌ 远程 Docker 构建失败。"
    fi
else
    echo "❌ 代码同步失败。"
fi
