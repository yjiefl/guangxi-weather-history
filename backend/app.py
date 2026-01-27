"""
Flask应用主入口
初始化所有服务并启动Web服务器
"""
import logging
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory
from flask_cors import CORS

# 导入配置
from backend.config import (
    DATABASE_PATH, OPEN_METEO_BASE_URL, CACHE_EXPIRE_HOURS,
    FLASK_HOST, FLASK_PORT, FLASK_DEBUG, LOG_DIR, LOG_FILE
)

# 导入模型和服务
from backend.models.database import DatabaseManager
from backend.models.city import CityManager
from backend.services.cache_manager import CacheManager
from backend.services.weather_service import WeatherService
from backend.services.data_exporter import DataExporter
from backend.services.data_analyzer import DataAnalyzer
from backend.services.data_manager import DataManager

# 导入路由
from backend.routes.api import api_bp, init_api_services

# 配置日志
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def create_app():
    """
    创建并配置Flask应用
    
    Returns:
        Flask应用实例
    """
    # 创建Flask应用
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    
    # 启用CORS
    CORS(app)
    
    # 初始化数据库管理器
    db_manager = DatabaseManager(DATABASE_PATH)
    
    # 初始化城市管理器
    city_manager = CityManager(db_manager)
    
    # 初始化缓存管理器
    cache_manager = CacheManager(db_manager, CACHE_EXPIRE_HOURS)
    
    # 初始化天气服务
    weather_service = WeatherService(
        OPEN_METEO_BASE_URL,
        cache_manager,
        city_manager,
        db_manager
    )
    
    # 初始化数据导出器
    data_exporter = DataExporter()
    
    # 初始化数据分析器
    data_analyzer = DataAnalyzer()
    
    # 初始化数据管理器
    data_manager = DataManager(
        weather_service,
        db_manager,
        city_manager
    )
    
    # 初始化API服务
    init_api_services(
        weather_service,
        data_exporter,
        data_analyzer,
        city_manager,
        data_manager
    )
    
    # 注册蓝图
    app.register_blueprint(api_bp)
    
    # 首页路由
    @app.route('/')
    def index():
        """返回首页"""
        return send_from_directory(app.static_folder, 'index.html')
    
    # 静态文件路由
    @app.route('/<path:path>')
    def static_files(path):
        """返回静态文件"""
        return send_from_directory(app.static_folder, path)
    
    logger.info("Flask应用创建成功")
    return app


def main():
    """
    主函数
    """
    logger.info("=" * 60)
    logger.info("广西历史天气数据查询系统启动中...")
    logger.info("=" * 60)
    
    # 创建应用
    app = create_app()
    
    # 启动服务器
    logger.info(f"服务器启动在 http://{FLASK_HOST}:{FLASK_PORT}")
    logger.info("按 Ctrl+C 停止服务器")
    
    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=FLASK_DEBUG
    )


if __name__ == '__main__':
    main()
