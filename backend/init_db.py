"""
数据库初始化脚本
创建数据库表并初始化广西城市数据
"""
import logging
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import DatabaseManager
from backend.models.city import CityManager
from backend.config import DATABASE_PATH, GUANGXI_CITIES, LOG_DIR, LOG_FILE

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


def init_database():
    """
    初始化数据库
    """
    logger.info("=" * 60)
    logger.info("开始初始化数据库...")
    logger.info("=" * 60)
    
    try:
        # 创建数据库管理器
        db_manager = DatabaseManager(DATABASE_PATH)
        
        # 初始化数据库表
        logger.info("创建数据库表...")
        db_manager.init_database()
        logger.info("✓ 数据库表创建成功")
        
        # 创建城市管理器
        city_manager = CityManager(db_manager)
        
        # 初始化城市数据
        logger.info("初始化广西城市数据...")
        city_manager.init_cities(GUANGXI_CITIES)
        logger.info(f"✓ 成功初始化 {len(GUANGXI_CITIES)} 个城市")
        
        # 验证数据
        cities = city_manager.get_all_cities()
        logger.info("\n已初始化的城市列表:")
        logger.info("-" * 60)
        for city in cities:
            logger.info(
                f"  {city['id']:2d}. {city['city_name']:6s} "
                f"(经度: {city['longitude']:.4f}, 纬度: {city['latitude']:.4f})"
            )
        logger.info("-" * 60)
        
        logger.info("\n" + "=" * 60)
        logger.info("数据库初始化完成！")
        logger.info(f"数据库路径: {DATABASE_PATH}")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"\n数据库初始化失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)
