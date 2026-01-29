# QNAP NAS Docker 部署指南 - 广西历史天气查询系统

本指南将指导您如何将本项目部署到 QNAP NAS 的 Container Station 中。

## 方案一：使用 Docker Compose (推荐)

这是最简单且最易于维护的方式。

### 1. 准备工作
*   在 NAS 上创建一个共享文件夹（例如 `WebApps/weather-history`）。
*   将项目中的以下文件/文件夹上传到该目录：
    *   `backend/`
    *   `frontend/`
    *   `Dockerfile`
    *   `docker-compose.yml`
    *   `requirements.txt`
*   在该目录下手动创建一个 `data` 文件夹和一个 `logs` 文件夹，确保权限为可读写。

### 2. 在 QNAP 上启动
1.  打开 **Container Station (容器工作站)**。
2.  点击 **应用程序 (Applications)** -> **创建 (Create)**。
3.  在 YAML 区域粘贴项目中的 `docker-compose.yml` 内容。
4.  点击 **检查 (Validate)** 然后 **创建 (Create)**。

---

## 方案二：从本地推送到 NAS (进阶)

如果您不想在 NAS 上构建镜像（因为 NAS CPU 可能较慢），可以先在 Mac 上构建好镜像再导过去。

### 1. 在 Mac 上构建镜像
在项目根目录下运行：
```bash
docker build -t weather-history:latest .
```

### 2. 导出镜像
```bash
docker save weather-history:latest > weather-history.tar
```

### 3. 上传并导入 NAS
1.  将 `weather-history.tar` 上传到 NAS。
2.  在 **Container Station** -> **镜像 (Images)** -> **导入 (Import)** 处选择该文件。
3.  导入完成后，使用该镜像创建容器，手动配置：
    *   **端口转发**: 主机 `5001` -> 容器 `5001`。
    *   **挂载卷**:
        *   主机 `/share/WebApps/weather-history/data` -> 容器 `/app/data`
        *   主机 `/share/WebApps/weather-history/logs` -> 容器 `/app/logs`

---

## 常见问题与注意事项

### 1. 数据持久化
请务必挂载 `/app/data` 目录，否则容器更新时，保存在 SQLite 数据库中的历史天气数据会丢失。

### 2. 访问地址
部署完成后，通过 `http://[NAS_IP]:5001` 访问。

### 3. API 限制
Open-Meteo API 是免费的，但请避免并发过高的请求，NAS 部署后建议配合“批量下载”功能先将数据落库，以提高查询响应速度。

### 4. 权限问题
如果发现无法保存数据，请检查 NAS 共享文件夹的权限设置，确保 Docker 进程有权写入挂载的目录。
