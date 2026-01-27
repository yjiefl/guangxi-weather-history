"""
数据库管理器
负责数据库连接、表创建和基本CRUD操作
遵循单一职责原则
"""
import sqlite3
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    数据库管理器类
    负责SQLite数据库的所有操作
    """
    
    def __init__(self, db_path: str):
        """
        初始化数据库管理器
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        self._ensure_db_directory()
        self.connection = None
        logger.info(f"数据库管理器初始化完成: {db_path}")
    
    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)
            logger.info(f"创建数据库目录: {db_dir}")
    
    def connect(self):
        """建立数据库连接"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row  # 使结果可以通过列名访问
            logger.info("数据库连接成功")
        except sqlite3.Error as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    def disconnect(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("数据库连接已关闭")
    
    def init_database(self):
        """
        初始化数据库，创建所有必要的表
        """
        self.connect()
        cursor = self.connection.cursor()
        
        try:
            # 创建城市配置表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS city_config (
                    id INTEGER PRIMARY KEY,
                    city_name TEXT NOT NULL UNIQUE,
                    longitude REAL NOT NULL,
                    latitude REAL NOT NULL,
                    region TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 创建天气数据表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS weather_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city_id INTEGER NOT NULL,
                    datetime TEXT NOT NULL,
                    temperature_2m REAL,
                    relative_humidity_2m REAL,
                    dew_point_2m REAL,
                    precipitation REAL,
                    rain REAL,
                    snowfall REAL,
                    surface_pressure REAL,
                    cloud_cover REAL,
                    wind_speed_10m REAL,
                    wind_direction_10m REAL,
                    wind_gusts_10m REAL,
                    wind_speed_80m REAL,
                    wind_speed_120m REAL,
                    wind_speed_180m REAL,
                    shortwave_radiation REAL,
                    direct_radiation REAL,
                    diffuse_radiation REAL,
                    direct_normal_irradiance REAL,
                    visibility REAL,
                    evapotranspiration REAL,
                    soil_temperature_0_to_7cm REAL,
                    soil_moisture_0_to_7cm REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (city_id) REFERENCES city_config(id),
                    UNIQUE(city_id, datetime)
                )
            ''')
            
            # 创建API缓存表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key TEXT NOT NULL UNIQUE,
                    response_data TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    expired_at TEXT NOT NULL
                )
            ''')
            
            # 创建索引以提升查询性能
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_weather_city_datetime 
                ON weather_data(city_id, datetime)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_cache_key 
                ON api_cache(cache_key)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_cache_expired 
                ON api_cache(expired_at)
            ''')
            
            self.connection.commit()
            logger.info("数据库表创建成功")
            
        except sqlite3.Error as e:
            logger.error(f"数据库初始化失败: {e}")
            self.connection.rollback()
            raise
        finally:
            self.disconnect()
    
    def execute_query(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """
        执行查询SQL语句
        
        Args:
            sql: SQL查询语句
            params: 查询参数
            
        Returns:
            查询结果列表
        """
        self.connect()
        cursor = self.connection.cursor()
        
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            # 转换为字典列表
            result = [dict(row) for row in rows]
            logger.debug(f"查询成功，返回 {len(result)} 条记录")
            return result
        except sqlite3.Error as e:
            logger.error(f"查询执行失败: {e}")
            raise
        finally:
            self.disconnect()
    
    def execute_update(self, sql: str, params: tuple = ()) -> int:
        """
        执行更新SQL语句（INSERT, UPDATE, DELETE）
        
        Args:
            sql: SQL更新语句
            params: 更新参数
            
        Returns:
            受影响的行数
        """
        self.connect()
        cursor = self.connection.cursor()
        
        try:
            cursor.execute(sql, params)
            self.connection.commit()
            affected_rows = cursor.rowcount
            logger.debug(f"更新成功，影响 {affected_rows} 行")
            return affected_rows
        except sqlite3.Error as e:
            logger.error(f"更新执行失败: {e}")
            self.connection.rollback()
            raise
        finally:
            self.disconnect()
    
    def bulk_insert(self, table: str, data_list: List[Dict[str, Any]]) -> int:
        """
        批量插入数据
        
        Args:
            table: 表名
            data_list: 数据字典列表
            
        Returns:
            插入的行数
        """
        if not data_list:
            return 0
        
        self.connect()
        cursor = self.connection.cursor()
        
        try:
            # 获取列名
            columns = list(data_list[0].keys())
            placeholders = ','.join(['?' for _ in columns])
            column_names = ','.join(columns)
            
            sql = f"INSERT OR REPLACE INTO {table} ({column_names}) VALUES ({placeholders})"
            
            # 准备数据
            values_list = [tuple(item[col] for col in columns) for item in data_list]
            
            cursor.executemany(sql, values_list)
            self.connection.commit()
            
            inserted_rows = cursor.rowcount
            logger.info(f"批量插入成功，插入 {inserted_rows} 行到表 {table}")
            return inserted_rows
            
        except sqlite3.Error as e:
            logger.error(f"批量插入失败: {e}")
            self.connection.rollback()
            raise
        finally:
            self.disconnect()
    
    def insert_weather_data(self, data: Dict[str, Any]) -> int:
        """
        插入单条天气数据
        
        Args:
            data: 天气数据字典
            
        Returns:
            插入的记录ID
        """
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        values = tuple(data.values())
        
        sql = f"INSERT OR REPLACE INTO weather_data ({columns}) VALUES ({placeholders})"
        
        self.connect()
        cursor = self.connection.cursor()
        
        try:
            cursor.execute(sql, values)
            self.connection.commit()
            record_id = cursor.lastrowid
            logger.debug(f"插入天气数据成功，ID: {record_id}")
            return record_id
        except sqlite3.Error as e:
            logger.error(f"插入天气数据失败: {e}")
            self.connection.rollback()
            raise
        finally:
            self.disconnect()
    
    def get_weather_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        根据过滤条件获取天气数据
        
        Args:
            filters: 过滤条件字典，如 {'city_id': 1, 'start_date': '2024-01-01'}
            
        Returns:
            天气数据列表
        """
        conditions = []
        params = []
        
        if 'city_id' in filters:
            conditions.append("city_id = ?")
            params.append(filters['city_id'])
        
        if 'start_date' in filters:
            conditions.append("datetime >= ?")
            params.append(filters['start_date'])
        
        if 'end_date' in filters:
            conditions.append("datetime <= ?")
            params.append(filters['end_date'])
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        sql = f"SELECT * FROM weather_data WHERE {where_clause} ORDER BY datetime"
        
        return self.execute_query(sql, tuple(params))
