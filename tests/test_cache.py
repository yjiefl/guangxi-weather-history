"""
缓存管理器单元测试
测试CacheManager类的缓存功能
"""
import unittest
import sys
import os
from datetime import datetime, timedelta

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import DatabaseManager
from backend.services.cache_manager import CacheManager


class TestCacheManager(unittest.TestCase):
    """缓存管理器测试类"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        # 使用测试数据库
        cls.test_db_path = 'data/test_cache.db'
        cls.db_manager = DatabaseManager(cls.test_db_path)
        
        # 初始化数据库表结构
        cls.db_manager.init_database()
        
        cls.cache_manager = CacheManager(cls.db_manager, expire_hours=1)
    
    @classmethod
    def tearDownClass(cls):
        """测试类清理"""
        # 删除测试数据库
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
    
    def test_set_and_get_cache(self):
        """测试设置和获取缓存"""
        # 设置缓存
        cache_key = 'test_key_1'
        cache_value = {'data': 'test_value', 'timestamp': '2024-01-01'}
        
        self.cache_manager.set(cache_key, cache_value)
        
        # 获取缓存
        result = self.cache_manager.get(cache_key)
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertEqual(result['data'], 'test_value')
        self.assertEqual(result['timestamp'], '2024-01-01')
    
    def test_cache_expiration(self):
        """测试缓存过期"""
        # 设置一个很短的过期时间
        cache_manager_short = CacheManager(self.db_manager, expire_hours=0.0001)
        
        cache_key = 'test_key_expire'
        cache_value = {'data': 'will_expire'}
        
        cache_manager_short.set(cache_key, cache_value)
        
        # 等待缓存过期
        import time
        time.sleep(1)
        
        # 获取缓存（应该返回None）
        result = cache_manager_short.get(cache_key)
        self.assertIsNone(result)
    
    def test_generate_cache_key(self):
        """测试生成缓存键"""
        params = {
            'city': '南宁',
            'start_date': '2024-01-01',
            'end_date': '2024-01-31'
        }
        
        # 生成缓存键
        cache_key = self.cache_manager.generate_cache_key(params)
        
        # 验证缓存键不为空
        self.assertIsNotNone(cache_key)
        self.assertIsInstance(cache_key, str)
        self.assertGreater(len(cache_key), 0)
    
    def test_clear_expired_cache(self):
        """测试清理过期缓存"""
        # 设置一些缓存
        self.cache_manager.set('key1', {'data': 'value1'})
        self.cache_manager.set('key2', {'data': 'value2'})
        
        # 清理过期缓存
        self.cache_manager.clear_expired()
        
        # 验证未过期的缓存仍然存在
        result1 = self.cache_manager.get('key1')
        result2 = self.cache_manager.get('key2')
        
        self.assertIsNotNone(result1)
        self.assertIsNotNone(result2)


if __name__ == '__main__':
    unittest.main()
