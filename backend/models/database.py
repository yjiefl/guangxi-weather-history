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
        logger.info(f"数据库管理器初始化完成: {db_path}")
    
    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)
            logger.info(f"创建数据库目录: {db_dir}")
    
    def get_connection(self):
        """获取新的数据库连接"""
        try:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
            return conn
        except sqlite3.Error as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    def init_database(self):
        """
        初始化数据库，创建所有必要的表
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
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
                    weather_code REAL,
                    wind_speed_100m REAL,
                    wind_direction_100m REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (city_id) REFERENCES city_config(id),
                    UNIQUE(city_id, datetime)
                )
            ''')
            
            # 确保老数据库字段完整
            # 1. 检查 weather_data 字段
            for column in ['weather_code', 'wind_speed_100m', 'wind_direction_100m']:
                try:
                    cursor.execute(f'ALTER TABLE weather_data ADD COLUMN {column} REAL')
                    logger.info(f"添加 weather_data.{column} 列成功")
                except sqlite3.OperationalError:
                    pass
            
            # 2. 检查 city_config 字段
            try:
                cursor.execute('ALTER TABLE city_config ADD COLUMN region TEXT DEFAULT "广西"')
                logger.info("添加 city_config.region 列成功")
            except sqlite3.OperationalError:
                pass
                
            try:
                cursor.execute('ALTER TABLE city_config ADD COLUMN is_active INTEGER DEFAULT 1')
                logger.info("添加 city_config.is_active 列成功")
            except sqlite3.OperationalError:
                pass
            
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
            
            conn.commit()
            logger.info("数据库表创建成功")
            
        except sqlite3.Error as e:
            logger.error(f"数据库初始化失败: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def execute_query(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """
        执行查询SQL语句
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
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
            conn.close()
    
    def execute_update(self, sql: str, params: tuple = ()) -> int:
        """
        执行更新SQL语句（INSERT, UPDATE, DELETE）
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(sql, params)
            conn.commit()
            affected_rows = cursor.rowcount
            logger.debug(f"更新成功，影响 {affected_rows} 行")
            return affected_rows
        except sqlite3.Error as e:
            logger.error(f"更新执行失败: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def bulk_insert(self, table: str, data_list: List[Dict[str, Any]]) -> int:
        """
        批量插入数据
        """
        if not data_list:
            return 0
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取列名
            columns = list(data_list[0].keys())
            placeholders = ','.join(['?' for _ in columns])
            column_names = ','.join(columns)
            
            sql = f"INSERT OR REPLACE INTO {table} ({column_names}) VALUES ({placeholders})"
            
            # 准备数据
            values_list = [tuple(item[col] for col in columns) for item in data_list]
            
            cursor.executemany(sql, values_list)
            conn.commit()
            
            inserted_rows = cursor.rowcount
            logger.info(f"批量插入成功，插入 {inserted_rows} 行到表 {table}")
            return inserted_rows
            
        except sqlite3.Error as e:
            logger.error(f"批量插入失败: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def insert_weather_data(self, data: Dict[str, Any]) -> int:
        """
        插入单条天气数据
        """
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        values = tuple(data.values())
        
        sql = f"INSERT OR REPLACE INTO weather_data ({columns}) VALUES ({placeholders})"
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(sql, values)
            conn.commit()
            record_id = cursor.lastrowid
            logger.debug(f"插入天气数据成功，ID: {record_id}")
            return record_id
        except sqlite3.Error as e:
            logger.error(f"插入天气数据失败: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def get_weather_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        根据过滤条件获取天气数据
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

    def delete_weather_data(self, filters: Dict[str, Any]) -> int:
        """
        根据过滤条件删除天气数据
        
        Args:
            filters: 过滤条件
            
        Returns:
            删除的行数
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
            
        if not conditions:
            # 防止误删全表
            return 0
            
        where_clause = " AND ".join(conditions)
        sql = f"DELETE FROM weather_data WHERE {where_clause}"
        
        return self.execute_update(sql, tuple(params))

    def get_weather_data_stats(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        根据过滤条件获取数据统计（行数、时间范围等）
        
        Args:
            filters: 过滤条件
            
        Returns:
            统计信息字典
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
        
        # 查询总行数和日期范围
        sql = f'''
            SELECT 
                COUNT(*) as count,
                MIN(datetime) as start_date,
                MAX(datetime) as end_date
            FROM weather_data 
            WHERE {where_clause}
        '''
        
        result = self.execute_query(sql, tuple(params))
        if result:
            return dict(result[0])
        return {'count': 0, 'start_date': None, 'end_date': None}
