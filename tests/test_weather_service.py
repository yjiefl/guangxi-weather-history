"""
天气服务单元测试
测试WeatherService类的核心功能
"""
import unittest
import sys
import os
from datetime import datetime, timedelta

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import DatabaseManager
from backend.models.city import CityManager
from backend.services.cache_manager import CacheManager
from backend.services.weather_service import WeatherService


class TestWeatherService(unittest.TestCase):
    """天气服务测试类"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        # 使用测试数据库
        cls.test_db_path = 'data/test_weather.db'
        cls.db_manager = DatabaseManager(cls.test_db_path)
        
        # 初始化数据库表结构
        cls.db_manager.init_database()
        
        cls.city_manager = CityManager(cls.db_manager)
        cls.cache_manager = CacheManager(cls.db_manager, expire_hours=24)
        cls.weather_service = WeatherService(
            'https://archive-api.open-meteo.com/v1/archive',
            cls.cache_manager,
            cls.city_manager,
            cls.db_manager
        )
    
    @classmethod
    def tearDownClass(cls):
        """测试类清理"""
        # 删除测试数据库
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
    
    def test_get_historical_weather(self):
        """测试获取历史天气数据"""
        # 测试获取南宁2024年1月1日的数据
        result = self.weather_service.get_historical_weather(
            longitude=108.3661,
            latitude=22.8172,
            start_date='2024-01-01',
            end_date='2024-01-02',
            fields=['temperature_2m', 'relative_humidity_2m']
        )
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertIn('hourly_data', result)
        
        # 验证数据长度（2天应该有48小时的数据）
        self.assertEqual(len(result['hourly_data']), 48)
    
    def test_invalid_date_range(self):
        """测试无效的日期范围"""
        # 结束日期早于开始日期
        with self.assertRaises(Exception):
            self.weather_service.get_historical_weather(
                longitude=108.3661,
                latitude=22.8172,
                start_date='2024-01-10',
                end_date='2024-01-01',
                fields=['temperature_2m']
            )
    
    def test_cache_functionality(self):
        """测试缓存功能"""
        # 第一次请求（应该从API获取）
        result1 = self.weather_service.get_historical_weather(
            longitude=108.3661,
            latitude=22.8172,
            start_date='2024-01-01',
            end_date='2024-01-01',
            fields=['temperature_2m']
        )
        
        # 第二次请求（应该从缓存获取）
        result2 = self.weather_service.get_historical_weather(
            longitude=108.3661,
            latitude=22.8172,
            start_date='2024-01-01',
            end_date='2024-01-01',
            fields=['temperature_2m']
        )
        
        # 验证两次结果相同
        self.assertEqual(result1, result2)


if __name__ == '__main__':
    unittest.main()
