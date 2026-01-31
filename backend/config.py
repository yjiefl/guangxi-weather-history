"""
配置文件
包含应用程序的所有配置参数
"""
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 数据库配置
DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'weather.db')

# Open-Meteo API配置
OPEN_METEO_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'
OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

# 缓存配置
CACHE_EXPIRE_HOURS = 720  # 30天（历史数据不会改变）

# 日志配置
LOG_DIR = os.path.join(BASE_DIR, 'logs')
LOG_FILE = os.path.join(LOG_DIR, 'debug.log')

# Flask配置
FLASK_HOST = '0.0.0.0'
FLASK_PORT = 5001
FLASK_DEBUG = True

# 时区配置
TIMEZONE = 'Asia/Shanghai'

# 广西主要城市配置
GUANGXI_CITIES = [
    {'id': 1, 'city_name': '南宁', 'longitude': 108.3661, 'latitude': 22.8172, 'region': '广西'},
    {'id': 2, 'city_name': '柳州', 'longitude': 109.4281, 'latitude': 24.3264, 'region': '广西'},
    {'id': 3, 'city_name': '桂林', 'longitude': 110.2993, 'latitude': 25.2736, 'region': '广西'},
    {'id': 4, 'city_name': '梧州', 'longitude': 111.2742, 'latitude': 23.4769, 'region': '广西'},
    {'id': 5, 'city_name': '北海', 'longitude': 109.1195, 'latitude': 21.4733, 'region': '广西'},
    {'id': 6, 'city_name': '防城港', 'longitude': 108.3548, 'latitude': 21.6146, 'region': '广西'},
    {'id': 7, 'city_name': '钦州', 'longitude': 108.6544, 'latitude': 21.9797, 'region': '广西'},
    {'id': 8, 'city_name': '贵港', 'longitude': 109.5986, 'latitude': 23.1115, 'region': '广西'},
    {'id': 9, 'city_name': '玉林', 'longitude': 110.1810, 'latitude': 22.6542, 'region': '广西'},
    {'id': 10, 'city_name': '百色', 'longitude': 106.6183, 'latitude': 23.9015, 'region': '广西'},
    {'id': 11, 'city_name': '贺州', 'longitude': 111.5669, 'latitude': 24.4038, 'region': '广西'},
    {'id': 12, 'city_name': '河池', 'longitude': 108.0854, 'latitude': 24.6928, 'region': '广西'},
    {'id': 13, 'city_name': '来宾', 'longitude': 109.2211, 'latitude': 23.7509, 'region': '广西'},
    {'id': 14, 'city_name': '崇左', 'longitude': 107.3645, 'latitude': 22.3769, 'region': '广西'},
    {'id': 15, 'city_name': '宁明', 'longitude': 107.07, 'latitude': 22.14, 'region': '广西'},
    {'id': 16, 'city_name': '扶绥', 'longitude': 107.90, 'latitude': 22.63, 'region': '广西'},
    {'id': 17, 'city_name': '大新', 'longitude': 107.20, 'latitude': 22.83, 'region': '广西'},
    {'id': 18, 'city_name': '天等', 'longitude': 107.13, 'latitude': 23.08, 'region': '广西'},
    {'id': 19, 'city_name': '龙州', 'longitude': 106.85, 'latitude': 22.34, 'region': '广西'},
    {'id': 20, 'city_name': '凭祥', 'longitude': 106.75, 'latitude': 22.10, 'region': '广西'},
    # 增加更多主流城市
    {'id': 101, 'city_name': '北京', 'longitude': 116.4074, 'latitude': 39.9042, 'region': '北京'},
    {'id': 102, 'city_name': '上海', 'longitude': 121.4737, 'latitude': 31.2304, 'region': '上海'},
    {'id': 103, 'city_name': '广州', 'longitude': 113.2644, 'latitude': 23.1291, 'region': '广东'},
    {'id': 104, 'city_name': '深圳', 'longitude': 114.0579, 'latitude': 22.5431, 'region': '广东'},
    {'id': 105, 'city_name': '成都', 'longitude': 104.0665, 'latitude': 30.5723, 'region': '四川'},
    {'id': 106, 'city_name': '杭州', 'longitude': 120.1551, 'latitude': 30.2741, 'region': '浙江'},
    {'id': 107, 'city_name': '武汉', 'longitude': 114.3055, 'latitude': 30.5928, 'region': '湖北'},
    {'id': 108, 'city_name': '西安', 'longitude': 108.9402, 'latitude': 34.3416, 'region': '陕西'},
    {'id': 109, 'city_name': '重庆', 'longitude': 106.5507, 'latitude': 29.5630, 'region': '重庆'},
    {'id': 110, 'city_name': '南京', 'longitude': 118.7968, 'latitude': 32.0603, 'region': '江苏'},
]

# 可用的天气数据字段
AVAILABLE_FIELDS = {
    'basic': {
        'temperature_2m': {'name': '温度', 'unit': '°C', 'description': '2米高度气温'},
        'relative_humidity_2m': {'name': '相对湿度', 'unit': '%', 'description': '2米高度相对湿度'},
        'dew_point_2m': {'name': '露点温度', 'unit': '°C', 'description': '2米高度露点温度'},
        'precipitation': {'name': '降水量', 'unit': 'mm', 'description': '小时降水量'},
        'rain': {'name': '降雨量', 'unit': 'mm', 'description': '小时降雨量'},
        'snowfall': {'name': '降雪量', 'unit': 'cm', 'description': '小时降雪量'},
        'surface_pressure': {'name': '地面气压', 'unit': 'hPa', 'description': '地面气压'},
        'cloud_cover': {'name': '云量', 'unit': '%', 'description': '总云量'},
        'weather_code': {'name': '天气情况', 'unit': '代码', 'description': 'WMO天气代码'},
    },
    'wind': {
        'wind_speed_10m': {'name': '10米风速', 'unit': 'km/h', 'description': '10米高度风速'},
        'wind_direction_10m': {'name': '10米风向', 'unit': '°', 'description': '10米高度风向'},
        'wind_gusts_10m': {'name': '10米阵风', 'unit': 'km/h', 'description': '10米高度阵风'},
        'wind_speed_100m': {'name': '100米风速', 'unit': 'km/h', 'description': '100米高度风速'},
        'wind_direction_100m': {'name': '100米风向', 'unit': '°', 'description': '100米高度风向'},
    },
    'radiation': {
        'shortwave_radiation': {'name': '短波辐射', 'unit': 'W/m²', 'description': '短波太阳辐射'},
        'direct_radiation': {'name': '直接辐射', 'unit': 'W/m²', 'description': '直接太阳辐射'},
        'diffuse_radiation': {'name': '散射辐射', 'unit': 'W/m²', 'description': '散射太阳辐射'},
        'direct_normal_irradiance': {'name': '直接法向辐照度', 'unit': 'W/m²', 'description': 'DNI'},
    },
    'other': {
        'evapotranspiration': {
            'name': '蒸发蒸腾量', 
            'unit': 'mm', 
            'description': 'ET0参考蒸散发', 
            'api_param': 'et0_fao_evapotranspiration'
        },
        'soil_temperature_0_to_7cm': {'name': '土壤温度', 'unit': '°C', 'description': '0-7cm土壤温度'},
        'soil_moisture_0_to_7cm': {'name': '土壤湿度', 'unit': 'm³/m³', 'description': '0-7cm土壤湿度'},
    }
}

# 默认查询字段
DEFAULT_FIELDS = [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'wind_speed_10m',
    'wind_direction_10m',
    'shortwave_radiation',
    'weather_code',
]
