"""
API接口单元测试
测试Flask API端点的功能
"""
import unittest
import sys
import os
import json

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app


class TestAPI(unittest.TestCase):
    """API接口测试类"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        # 确保数据库已初始化（API使用config中的DATABASE_PATH）
        from backend.models.database import DatabaseManager
        from backend.config import DATABASE_PATH
        db_manager = DatabaseManager(DATABASE_PATH)
        db_manager.init_database()
        
        # 创建测试应用
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.app.config['TESTING'] = True
    
    def test_index_route(self):
        """测试首页路由"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
    
    def test_get_cities(self):
        """测试获取城市列表API"""
        response = self.client.get('/api/cities')
        
        # 验证响应状态码
        self.assertEqual(response.status_code, 200)
        
        # 验证响应数据
        data = json.loads(response.data)
        self.assertEqual(data['code'], 200)
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)
        
        # 验证城市数据结构
        if len(data['data']) > 0:
            city = data['data'][0]
            self.assertIn('id', city)
            self.assertIn('name', city)
            self.assertIn('longitude', city)
            self.assertIn('latitude', city)
    
    def test_get_fields(self):
        """测试获取数据字段API"""
        response = self.client.get('/api/fields')
        
        # 验证响应状态码
        self.assertEqual(response.status_code, 200)
        
        # 验证响应数据
        data = json.loads(response.data)
        self.assertEqual(data['code'], 200)
        self.assertIn('data', data)
        
        # 验证字段分类
        fields = data['data']['available_fields']
        self.assertIn('basic', fields)
        self.assertIn('wind', fields)
        self.assertIn('radiation', fields)
    
    def test_query_weather_missing_params(self):
        """测试查询天气API缺少参数的情况"""
        response = self.client.post(
            '/api/weather/query',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        # 应该返回错误
        self.assertIn(response.status_code, [400, 500])
    
    def test_query_weather_valid_params(self):
        """测试查询天气API有效参数"""
        request_data = {
            'city_id': 1,
            'start_date': '2024-01-01',
            'end_date': '2024-01-02',
            'fields': ['temperature_2m', 'relative_humidity_2m']
        }
        
        response = self.client.post(
            '/api/weather/query',
            data=json.dumps(request_data),
            content_type='application/json'
        )
        
        # 验证响应（可能成功或失败，取决于网络）
        self.assertIn(response.status_code, [200, 500])
        
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertEqual(data['code'], 200)
            self.assertIn('data', data)


if __name__ == '__main__':
    unittest.main()
