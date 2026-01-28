# 广西历史天气数据查询系统

<div align="center">

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Open-Meteo](https://img.shields.io/badge/API-Open--Meteo-orange.svg)

一个优雅的历史天气数据查询系统，支持广西地区14个城市2022年至今的详细历史天气数据查询、可视化和导出功能。

**包含辐照度、多高度风速等专业气象数据**

</div>

## ✨ 功能特性

- 🌤️ **长期历史数据**: 支持查询2022年至今的历史天气数据（可扩展至1940年）
- 📊 **详细气象数据**: 
  - 基础数据：温度、湿度、降水、气压、云量
  - **辐照度数据**：短波辐射、直接辐射、散射辐射、DNI等
  - **风速数据**：10m、80m、120m、180m多高度风速和风向
  - 其他数据：能见度、蒸发蒸腾量、土壤温度/湿度
- 📈 **数据可视化**: 温度趋势图、辐照度分布图、风速风向图等多维度图表
- 📥 **数据导出**: 支持导出为Excel和CSV格式，可自定义导出字段
- 💾 **智能缓存**: 本地SQLite缓存，历史数据缓存30天，大幅提升查询速度
- 🎨 **现代UI**: 采用Apple风格浅色设计（Light Mode）、简洁配色、圆角卡片和流畅动画
- 🆓 **完全免费**: 基于Open-Meteo免费API，无需密钥，无调用限制
- 📊 **多维分析**:
  - **天气情况映射**: 自动将 WMO 代码转换为图标和中文描述（如 ☀️ 晴朗、🌧️ 小雨）。
  - **多城市对比**: 支持同时对比多个城市的平均温度、主要天气等概况。
  - **主要天气统计**: 自动分析查询周期内最频繁出现的天气状态。
- 📥 **完整数据导出**:
  - **单日/多日导出**: 导出详细的 Excel/CSV 报表。
  - **批量全字段导出**: 在数据管理面板支持导出选定城市的**全部气象字段**。
- 💾 **智能缓存与管理**:
  - **分段下载**: 批量下载支持按月分段，显示**实时进度条**并支持随时**取消**。
  - **公用逻辑重构**: 整理公共查询模块，提升系统稳定性和可维护性。
  - **自动同步**: 查询时自动按需补全本地数据库。
- 🎨 **现代UI与便捷操作**:
  - **存活监控**: 实时监控后端连接状态。
  - **高级感品牌**: 精致的**深蓝到靛蓝渐变**标题设计，强化品牌视觉。
  - **快捷日期**: 一键选择常用时间段。
  - **自动部署**: 下拉即用的 `start.command` 脚本。
- 🧠 **智能交互与性能**:
  - **全自动本地优先 (Local-First)**: 系统优先从本地持久化数据库读取已下载数据，支持**秒级查询**与**离线使用**。
  - **精准数据探测器**: 图表支持 `index` 悬浮模式，鼠标扫过即可同步查看所有城市的精确数值与时间。
  - **响应式排版**: 统计卡片按城市逻辑分组，支持多城市数据的整齐行列展示。

## 🏙️ 支持城市

南宁、柳州、桂林、梧州、北海、防城港、钦州、贵港、玉林、百色、贺州、河池、来宾、崇左

## 📊 数据字段说明

### 基础气象数据
- 温度（2m高度）、相对湿度、露点温度
- 降水量、降雨量、降雪量
- 地面气压、云量、能见度

### 辐照度数据 ☀️
- **短波辐射** (Shortwave Radiation): 总太阳辐射
- **直接辐射** (Direct Radiation): 直接太阳辐射
- **散射辐射** (Diffuse Radiation): 散射太阳辐射
- **直接法向辐照度** (DNI): 垂直于太阳光线的辐射强度

### 风速数据 💨
- **10米风速/风向**: m/s (米/秒)
- **80米风速**: m/s (米/秒)
- **120米风速**: m/s (米/秒)
- **180米风速**: m/s (米/秒)
- **10米阵风**: m/s (米/秒)

## 🚀 快速开始

### 环境要求

- Python 3.9+
- pip 包管理器
- 现代浏览器（Chrome、Firefox、Safari、Edge）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yjiefl/guangxi-weather-history.git
cd guangxi-weather-history
```

2. **创建虚拟环境**
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **初始化数据库**
```bash
python backend/init_db.py
```

5. **启动服务**
```bash
python backend/app.py
```

6. **访问应用**

打开浏览器访问: `http://localhost:5001` (注意：默认端口已调整为 5001)

### macOS 快速启动 (推荐)

在项目根目录下，直接双击运行 `start.command`。它会自动：
1. 检测并创建虚拟环境。
2. 安装所有依赖。
3. 初始化数据库。
4. 启动后端服务器并尝试打开浏览器。

## 📁 项目结构

```
guangxi-weather-history/
├── backend/                 # 后端代码
│   ├── app.py              # Flask应用主入口
│   ├── config.py           # 配置文件
│   ├── init_db.py          # 数据库初始化脚本
│   ├── models/             # 数据模型
│   │   ├── database.py     # 数据库管理器
│   │   └── city.py         # 城市模型
│   ├── services/           # 业务服务层
│   │   ├── weather_service.py   # 天气服务
│   │   ├── cache_manager.py     # 缓存管理
│   │   ├── data_exporter.py     # 数据导出
│   │   └── data_analyzer.py     # 数据分析
│   └── routes/             # API路由
│       └── api.py          # RESTful API接口
├── frontend/               # 前端代码
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       ├── app.js          # 主应用逻辑
│       ├── api.js          # API调用封装
│       └── charts.js       # 图表配置
├── data/                   # 数据目录
│   └── weather.db          # SQLite数据库
├── tests/                  # 测试代码
│   ├── test_weather_service.py
│   ├── test_cache.py
│   └── test_api.py
├── logs/                   # 日志目录
│   └── debug.log           # 调试日志
├── requirements.txt        # Python依赖
├── spec.md                 # 项目需求规格说明
└── README.md              # 项目说明文档
```

## 🔧 技术栈

### 后端
- **Flask**: 轻量级Web框架
- **SQLite**: 本地数据库和缓存
- **Pandas**: 数据处理和分析
- **Requests**: HTTP客户端
- **openpyxl**: Excel文件处理

### 前端
- **HTML5 + CSS3**: 页面结构和样式（玻璃态设计）
- **Vanilla JavaScript**: 业务逻辑
- **Chart.js**: 数据可视化
- **Google Fonts (Inter)**: 现代字体

### 外部API
- **Open-Meteo Historical Weather API**: 免费历史天气数据源
  - 数据范围: 1940年至今
  - 数据精度: 小时级
  - 空间分辨率: 约9-11km
  - 数据源: ERA5、ERA5-Land等权威再分析数据集

## 📖 API文档

### 获取城市列表
```http
GET /api/cities
```

**响应示例:**
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "南宁",
      "longitude": 108.3661,
      "latitude": 22.8172
    }
  ]
}
```

### 查询历史天气
```http
POST /api/weather/query
Content-Type: application/json

{
  "city_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "fields": ["temperature_2m", "wind_speed_10m", "shortwave_radiation"]
}
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "city": "南宁",
    "records": [...],
    "summary": {
      "avg_temperature": 16.8,
      "max_temperature": 22.3,
      "min_temperature": 12.1,
      "avg_wind_speed": 9.2,
      "total_solar_radiation": 12500.5
    }
  }
}
```

### 导出数据
```http
POST /api/weather/export
Content-Type: application/json

{
  "city_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "format": "excel",
  "fields": ["temperature_2m", "wind_speed_10m", "shortwave_radiation"]
}
```

### 获取可用数据字段
```http
GET /api/fields
```

## 🧪 测试

运行单元测试：
```bash
pytest tests/ -v
```

运行测试并生成覆盖率报告：
```bash
pytest tests/ --cov=backend --cov-report=html
```

## 📊 使用示例

### 查询南宁2024年1月的天气数据
1. 打开应用
2. 选择城市：南宁
3. 选择日期范围：2024-01-01 至 2024-01-31
4. 选择数据字段：温度、风速、辐照度
5. 点击"查询"按钮
6. 查看图表和数据表格
7. 点击"导出Excel"下载数据

### 对比多个城市的辐照度数据
1. 分别查询多个城市的数据
2. 使用对比功能查看辐照度差异
3. 导出对比报告

## 🎨 界面预览

- **浅色主题**: 干净清爽的苹果风格界面 (Light Mode)
- **精致卡片**: 柔和的阴影和圆角设计
- **和谐配色**: Apple官方配色体系 (Blue, Gray, White)
- **流畅动画**: 悬停效果和过渡动画
- **响应式设计**: 适配各种屏幕尺寸

## 📝 开发日志

所有开发过程中的错误和调试信息都会记录在 `logs/debug.log` 文件中，便于问题追踪和解决。

## 🔮 后续计划

- [x] 已完成多项 UI/UX 与核心功能优化 (2026-01-27)
- [ ] 取消导出数据汇总表，精简导出流程
- [ ] 每日汇总增加日辐照量 (MJ/m²) 和平均风速 (m/s)
- [ ] **坐标管理**: 支持手动输入经纬度坐标并自定义命名
- [ ] 支持更多城市（全国范围扩展）
- [ ] 添加天气预测功能
- [ ] 实现用户账户系统
- [ ] 数据分析功能增强（趋势分析、异常检测）
- [ ] 移动端适配优化
- [ ] 数据API开放
- [ ] PDF报告导出
- [ ] 实时预警功能

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**yjiefl**

## 🙏 致谢

- [Open-Meteo](https://open-meteo.com/) 提供免费天气数据API
- [Chart.js](https://www.chartjs.org/) 提供图表库
- [Flask](https://flask.palletsprojects.com/) 提供Web框架
- [ERA5](https://cds.climate.copernicus.eu/) 提供权威气象再分析数据

## 📮 数据说明

本系统使用的历史天气数据来自Open-Meteo API，基于ERA5等权威再分析数据集。数据空间分辨率约为9-11km，适用于区域气候研究、可再生能源评估等应用场景。

**注意**: 历史数据有5天延迟，如需最近几天的数据，请使用预报API的past_days功能。

