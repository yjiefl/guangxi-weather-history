"""
天气服务
负责与Open-Meteo API交互，获取和处理天气数据
遵循单一职责原则
"""
import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.services.cache_manager import CacheManager
from backend.models.city import CityManager
from backend.models.database import DatabaseManager

logger = logging.getLogger(__name__)


class WeatherService:
    """
    天气服务类
    负责从Open-Meteo API获取历史天气数据
    """
    
    def __init__(
        self, 
        base_url: str,
        cache_manager: CacheManager,
        city_manager: CityManager,
        db_manager: DatabaseManager
    ):
        """
        初始化天气服务
        
        Args:
            base_url: Open-Meteo API基础URL
            cache_manager: 缓存管理器实例（依赖注入）
            city_manager: 城市管理器实例（依赖注入）
            db_manager: 数据库管理器实例（依赖注入）
        """
        self.base_url = base_url
        self.cache = cache_manager
        self.city_manager = city_manager
        self.db_manager = db_manager
        logger.info("天气服务初始化完成")
    
    def get_historical_weather(
        self,
        longitude: float,
        latitude: float,
        start_date: str,
        end_date: str,
        fields: List[str],
        timezone: str = 'Asia/Shanghai',
        city_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        获取历史天气数据
        
        Args:
            longitude: 经度
            latitude: 纬度
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            fields: 需要获取的数据字段列表
            timezone: 时区
            
        Returns:
            天气数据字典
        """
        # 生成缓存键
        cache_params = {
            'lon': longitude,
            'lat': latitude,
            'start': start_date,
            'end': end_date,
            'fields': sorted(fields),
            'tz': timezone
        }
        cache_key = self.cache.generate_cache_key(cache_params)
        
        # 检查缓存
        cached_data = self.cache.get(cache_key)
        if cached_data:
            logger.info(f"从缓存获取数据: {start_date} 至 {end_date}")
            return cached_data
        
        # 构建API URL
        api_url = self._build_api_url(
            longitude, latitude, start_date, end_date, fields, timezone
        )
        
        try:
            # 调用API
            logger.info(f"调用Open-Meteo API: {start_date} 至 {end_date}")
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            
            # 解析响应
            data = response.json()
            parsed_data = self._parse_response(data, fields)
            
            # 存入缓存
            self.cache.set(cache_key, parsed_data)
            
            # 如果提供了city_id，同时存入永久数据库
            if city_id:
                try:
                    self.save_to_database(city_id, parsed_data)
                    logger.info(f"同时将数据保存到永久数据库: 城市ID={city_id}")
                except Exception as e:
                    logger.warning(f"保存到永久数据库失败(非致命): {e}")
            
            logger.info(f"获取天气数据成功，共 {len(parsed_data.get('hourly_data', []))} 条记录")
            return parsed_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API请求失败: {e}")
            self._handle_api_error(e)
            raise
        except Exception as e:
            logger.error(f"处理天气数据失败: {e}")
            raise
    
    def batch_query_cities(
        self,
        city_ids: List[int],
        start_date: str,
        end_date: str,
        fields: List[str]
    ) -> List[Dict[str, Any]]:
        """
        批量查询多个城市的天气数据
        
        Args:
            city_ids: 城市ID列表
            start_date: 开始日期
            end_date: 结束日期
            fields: 数据字段列表
            
        Returns:
            城市天气数据列表
        """
        results = []
        
        for city_id in city_ids:
            try:
                # 获取城市坐标
                coordinates = self.city_manager.get_coordinates(city_id)
                if not coordinates:
                    logger.warning(f"城市ID {city_id} 不存在，跳过")
                    continue
                
                longitude, latitude = coordinates
                city_info = self.city_manager.get_city_by_id(city_id)
                
                # 获取天气数据
                weather_data = self.get_historical_weather(
                    longitude, latitude, start_date, end_date, fields
                )
                
                # 添加城市信息
                weather_data['city_id'] = city_id
                weather_data['city_name'] = city_info['city_name']
                
                results.append(weather_data)
                
            except Exception as e:
                logger.error(f"查询城市 {city_id} 天气数据失败: {e}")
                continue
        
        logger.info(f"批量查询完成，成功获取 {len(results)} 个城市的数据")
        return results
    
    def _build_api_url(
        self,
        longitude: float,
        latitude: float,
        start_date: str,
        end_date: str,
        fields: List[str],
        timezone: str
    ) -> str:
        """
        构建Open-Meteo API URL
        
        Args:
            longitude: 经度
            latitude: 纬度
            start_date: 开始日期
            end_date: 结束日期
            fields: 数据字段列表
            timezone: 时区
            
        Returns:
            完整的API URL
        """
        # 将字段列表转换为逗号分隔的字符串
        hourly_params = ','.join(fields)
        
        # 构建URL参数
        params = {
            'latitude': latitude,
            'longitude': longitude,
            'start_date': start_date,
            'end_date': end_date,
            'hourly': hourly_params,
            'timezone': timezone
        }
        
        # 构建查询字符串
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        api_url = f"{self.base_url}?{query_string}"
        
        logger.debug(f"API URL: {api_url}")
        return api_url
    
    def _parse_response(self, response: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
        """
        解析Open-Meteo API响应
        
        Args:
            response: API响应字典
            fields: 请求的字段列表
            
        Returns:
            解析后的数据字典
        """
        try:
            # 提取基本信息
            parsed_data = {
                'latitude': response.get('latitude'),
                'longitude': response.get('longitude'),
                'elevation': response.get('elevation'),
                'timezone': response.get('timezone'),
                'timezone_abbreviation': response.get('timezone_abbreviation'),
                'hourly_data': []
            }
            
            # 提取小时数据
            hourly = response.get('hourly', {})
            times = hourly.get('time', [])
            
            # 构建小时数据记录
            for i, time_str in enumerate(times):
                record = {'datetime': time_str}
                
                # 添加每个字段的值
                for field in fields:
                    if field in hourly:
                        record[field] = hourly[field][i]
                    else:
                        record[field] = None
                
                parsed_data['hourly_data'].append(record)
            
            logger.debug(f"解析响应成功，共 {len(parsed_data['hourly_data'])} 条记录")
            return parsed_data
            
        except Exception as e:
            logger.error(f"解析API响应失败: {e}")
            raise
    
    def _handle_api_error(self, error: Exception):
        """
        处理API错误
        
        Args:
            error: 异常对象
        """
        if isinstance(error, requests.exceptions.Timeout):
            logger.error("API请求超时")
        elif isinstance(error, requests.exceptions.ConnectionError):
            logger.error("API连接失败，请检查网络")
        elif isinstance(error, requests.exceptions.HTTPError):
            logger.error(f"API返回错误状态码: {error.response.status_code}")
        else:
            logger.error(f"未知API错误: {error}")
    
    def save_to_database(self, city_id: int, weather_data: Dict[str, Any]) -> int:
        """
        将天气数据保存到数据库
        
        Args:
            city_id: 城市ID
            weather_data: 天气数据字典
            
        Returns:
            保存的记录数
        """
        try:
            hourly_data = weather_data.get('hourly_data', [])
            
            # 准备批量插入的数据
            records = []
            for record in hourly_data:
                db_record = {
                    'city_id': city_id,
                    'datetime': record['datetime']
                }
                # 添加所有数据字段
                for key, value in record.items():
                    if key != 'datetime':
                        db_record[key] = value
                
                records.append(db_record)
            
            # 批量插入
            if records:
                inserted = self.db_manager.bulk_insert('weather_data', records)
                logger.info(f"保存天气数据到数据库成功，插入 {inserted} 条记录")
                return inserted
            
            return 0
            
        except Exception as e:
            logger.error(f"保存天气数据到数据库失败: {e}")
            raise
