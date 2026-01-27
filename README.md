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
- 🎨 **现代UI**: 采用玻璃态设计、深色主题、渐变色彩和流畅动画
- 🆓 **完全免费**: 基于Open-Meteo免费API，无需密钥，无调用限制
- 🔄 **数据管理与同步**:
  - **分段下载**: 批量下载支持按月分段，显示**实时进度条**并支持随时**取消**。
  - **自动更新**: 查询时若本地无数据，系统将**自动触发**下载并实时展示。
  - **完整性检查**: 快速定位缺失日期，一键补全。
  - **全国城市支持**: 已加入北京、上海、广州等更多主流城市。
- ⚡ **便捷操作**:
  - **快捷日期**: 一键选择最近 7/14/30/90/180/365 天。
  - **快速导航**: 顶部导航支持快速跳转到参数设置、图表、表格或管理面板。
  - **存活监控**: 实时监控后端连接状态，异常时自动提醒。
  - **自动部署**: 为 macOS 提供 `start.command` 脚本，双击即用。

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
- **10米风速/风向**: 标准气象观测高度
- **80米风速**: 适用于风力发电评估
- **120米风速**: 大型风力涡轮机高度
- **180米风速**: 超大型风力涡轮机高度
- **10米阵风**: 最大瞬时风速

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

- **深色主题**: 护眼的深色背景
- **玻璃态卡片**: 半透明毛玻璃效果
- **渐变色彩**: 蓝色主题配橙色（辐照度）和绿色（风速）点缀
- **流畅动画**: 悬停效果和过渡动画
- **响应式设计**: 适配各种屏幕尺寸

## 📝 开发日志

所有开发过程中的错误和调试信息都会记录在 `logs/debug.log` 文件中，便于问题追踪和解决。

## 🔮 后续计划

- [ ] 支持更多城市（全国范围）
- [ ] 添加天气预测功能
- [ ] 实现用户账户系统
- [ ] 数据分析功能增强（趋势分析、异常检测）
- [ ] 移动端App开发
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

---

<div align="center">
Made with ❤️ by yjiefl | Powered by Open-Meteo
</div>

## 功能改进

### 已完成

1. 下载的时候需要显示进度条，并可以打断（✅已完成）

2. 更容易的部署和打开使用（✅已完成打开）

3. 查询时如果没有数据则自动下载（✅已完成）

4. 排查太阳辐射总计是否错误（✅已完成）

5. 顶部增加按钮快速跳转到不同的位置（✅已完成）

6. 增加一个按钮，可以快速选择最近的7天，14天，30天，90天，180天，365天（✅已完成）

7. bug：点击导出excel报错：werkzeug - INFO - 127.0.0.1 - - [27/Jan/2026 06:22:44] "POST /api/weather/export HTTP/1.1" 400 -（✅已完成）

8. 如果后端退出，前端有提示（✅已完成）

### 未完成

1. 考虑程序部署到服务器上或者云端，让其他人可以快速的使用

2. 初始的默认时间是昨天

3. 如果显示的是多日的日期，可以人工选择具体某一天的数据进行查看

4. 下载的数据缺少城市、日期、时间等信息，汇总数据需要每一天，每个城市的汇总数据

5. 查询时日期现在只能选择前天，应该可以选择昨天才对

6. 增加一个按钮，可以点击打开/关闭后台服务

7. 如果查询时选择多个站，应该有按钮可以选择查看不同站点数据

2. 下载的时候可以一次性选择更多城市（检查发现未完成）

4. 改进前端 UI，让城市和日期的选择更加直观，城市排列有点松散，占地方（未修改）

5. 日期不能选择今天，可以选昨天及以前的日期（因为今天数据还没出来）
