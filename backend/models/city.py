"""
城市管理器
负责城市数据的管理和查询
遵循单一职责原则
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from backend.models.database import DatabaseManager

logger = logging.getLogger(__name__)


class CityManager:
    """
    城市管理器类
    负责城市配置的CRUD操作
    """
    
    def __init__(self, db_manager: DatabaseManager):
        """
        初始化城市管理器
        
        Args:
            db_manager: 数据库管理器实例（依赖注入）
        """
        self.db_manager = db_manager
        logger.info("城市管理器初始化完成")
    
    def init_cities(self, cities: List[Dict[str, Any]]):
        """
        初始化城市数据
        
        Args:
            cities: 城市配置列表
        """
        try:
            # 批量插入城市数据
            inserted = self.db_manager.bulk_insert('city_config', cities)
            logger.info(f"初始化城市数据成功，插入 {inserted} 个城市")
        except Exception as e:
            logger.error(f"初始化城市数据失败: {e}")
            raise
    
    def get_all_cities(self) -> List[Dict[str, Any]]:
        """
        获取所有启用的城市
        
        Returns:
            城市列表
        """
        sql = "SELECT * FROM city_config WHERE is_active = 1 ORDER BY id"
        try:
            cities = self.db_manager.execute_query(sql)
            logger.debug(f"获取城市列表成功，共 {len(cities)} 个城市")
            return cities
        except Exception as e:
            logger.error(f"获取城市列表失败: {e}")
            raise
    
    def get_city_by_id(self, city_id: int) -> Optional[Dict[str, Any]]:
        """
        根据ID获取城市信息
        
        Args:
            city_id: 城市ID
            
        Returns:
            城市信息字典，如果不存在返回None
        """
        sql = "SELECT * FROM city_config WHERE id = ?"
        try:
            result = self.db_manager.execute_query(sql, (city_id,))
            if result:
                logger.debug(f"获取城市信息成功: {result[0]['city_name']}")
                return result[0]
            else:
                logger.warning(f"城市ID {city_id} 不存在")
                return None
        except Exception as e:
            logger.error(f"获取城市信息失败: {e}")
            raise
    
    def get_city_by_name(self, city_name: str) -> Optional[Dict[str, Any]]:
        """
        根据名称获取城市信息
        
        Args:
            city_name: 城市名称
            
        Returns:
            城市信息字典，如果不存在返回None
        """
        sql = "SELECT * FROM city_config WHERE city_name = ?"
        try:
            result = self.db_manager.execute_query(sql, (city_name,))
            if result:
                logger.debug(f"获取城市信息成功: {city_name}")
                return result[0]
            else:
                logger.warning(f"城市 {city_name} 不存在")
                return None
        except Exception as e:
            logger.error(f"获取城市信息失败: {e}")
            raise
    
    def get_coordinates(self, city_id: int) -> Optional[Tuple[float, float]]:
        """
        获取城市的经纬度坐标
        
        Args:
            city_id: 城市ID
            
        Returns:
            (经度, 纬度) 元组，如果不存在返回None
        """
        city = self.get_city_by_id(city_id)
        if city:
            return (city['longitude'], city['latitude'])
        return None
    
    def add_city(self, name: str, longitude: float, latitude: float, region: str = '广西') -> int:
        """
        添加新城市
        
        Args:
            name: 城市名称
            longitude: 经度
            latitude: 纬度
            region: 所属地区
            
        Returns:
            新城市的ID
        """
        # 检查城市是否已存在
        existing = self.get_city_by_name(name)
        if existing:
            logger.warning(f"城市 {name} 已存在")
            return existing['id']
        
        # 获取下一个ID
        sql = "SELECT MAX(id) as max_id FROM city_config"
        result = self.db_manager.execute_query(sql)
        next_id = (result[0]['max_id'] or 0) + 1
        
        # 插入新城市
        city_data = {
            'id': next_id,
            'city_name': name,
            'longitude': longitude,
            'latitude': latitude,
            'region': region,
            'is_active': 1
        }
        
        try:
            self.db_manager.bulk_insert('city_config', [city_data])
            logger.info(f"添加城市成功: {name} (ID: {next_id})")
            return next_id
        except Exception as e:
            logger.error(f"添加城市失败: {e}")
            raise
    
    def update_city_status(self, city_id: int, is_active: bool) -> bool:
        """
        更新城市启用状态
        
        Args:
            city_id: 城市ID
            is_active: 是否启用
            
        Returns:
            是否更新成功
        """
        sql = "UPDATE city_config SET is_active = ? WHERE id = ?"
        try:
            affected = self.db_manager.execute_update(sql, (1 if is_active else 0, city_id))
            if affected > 0:
                logger.info(f"更新城市状态成功: ID {city_id}, 启用: {is_active}")
                return True
            else:
                logger.warning(f"城市ID {city_id} 不存在")
                return False
        except Exception as e:
            logger.error(f"更新城市状态失败: {e}")
            raise
    
    def get_cities_by_region(self, region: str) -> List[Dict[str, Any]]:
        """
        根据地区获取城市列表
        
        Args:
            region: 地区名称
            
        Returns:
            城市列表
        """
        sql = "SELECT * FROM city_config WHERE region = ? AND is_active = 1 ORDER BY id"
        try:
            cities = self.db_manager.execute_query(sql, (region,))
            logger.debug(f"获取 {region} 地区城市成功，共 {len(cities)} 个")
            return cities
        except Exception as e:
            logger.error(f"获取地区城市失败: {e}")
            raise
