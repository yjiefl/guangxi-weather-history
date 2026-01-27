"""
Pytest配置文件
提供测试fixture和配置
"""
import pytest
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import DatabaseManager


@pytest.fixture(scope='session')
def test_db_path():
    """测试数据库路径fixture"""
    return 'data/test_weather.db'


@pytest.fixture(scope='session')
def db_manager(test_db_path):
    """数据库管理器fixture"""
    # 创建测试数据库
    db = DatabaseManager(test_db_path)
    
    # 初始化数据库表结构
    db.init_database()
    
    yield db
    
    # 测试结束后清理
    if os.path.exists(test_db_path):
        os.remove(test_db_path)


@pytest.fixture(scope='function')
def clean_db(db_manager):
    """每个测试前清理数据库"""
    # 清理所有表的数据
    db_manager.execute_query("DELETE FROM weather_data", ())
    db_manager.execute_query("DELETE FROM api_cache", ())
    yield
    # 测试后再次清理
    db_manager.execute_query("DELETE FROM weather_data", ())
    db_manager.execute_query("DELETE FROM api_cache", ())
