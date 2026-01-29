# 使用国内加速源，解决 NAS 拉取超时问题
FROM docker.m.daocloud.io/library/python:3.10-slim

WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目代码
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# 创建日志和数据目录
RUN mkdir -p logs data

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["python", "backend/app.py"]
