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

from backend.config import AVAILABLE_FIELDS, OPEN_METEO_FORECAST_URL

logger = logging.getLogger(__name__)


class WeatherService:
    """
    天气服务类
    负责从Open-Meteo API获取历史天气数据
    """
    
    def search_city(self, query: str) -> List[Dict[str, Any]]:
        """
        搜索城市 (支持本地库优先)
        """
        results = []
        try:
            # 1. 先尝试从本地数据库匹配 (Item: 提升搜索体验)
            local_sql = "SELECT city_name as name, latitude, longitude, region FROM city_config WHERE city_name LIKE ?"
            local_matches = self.db_manager.execute_query(local_sql, (f"%{query}%",))
            
            for match in local_matches:
                results.append({
                    'name': match['name'],
                    'latitude': match['latitude'],
                    'longitude': match['longitude'],
                    'region': match['region'],
                    'country': '中国',
                    'admin1': match['region'],
                    'admin2': '',
                    'admin3': ''
                })
            
            # 2. 如果本地结果较少，再调用外部 API
            if len(results) < 5:
                url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&language=zh&count=10"
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                for item in data.get('results', []):
                    name = item.get('name')
                    # 避免与本地结果重复
                    if any(r['name'] == name for r in results):
                        continue
                        
                    admin1 = item.get('admin1', '')
                    admin2 = item.get('admin2', '')
                    admin3 = item.get('admin3', '')
                    country = item.get('country', '')
                    region_parts = [r for r in [country, admin1, admin2, admin3] if r]
                    region = " > ".join(region_parts)
                    
                    results.append({
                        'name': name,
                        'latitude': item.get('latitude'),
                        'longitude': item.get('longitude'),
                        'region': region,
                        'country': country,
                        'admin1': admin1,
                        'admin2': admin2,
                        'admin3': admin3
                    })
            return results
        except Exception as e:
            logger.error(f"查询城市失败: {e}")
            return results # 返回已有的本地结果

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
        self.forecast_url = OPEN_METEO_FORECAST_URL
        self.cache = cache_manager
        self.city_manager = city_manager
        self.db_manager = db_manager
        self.weather_code_map = {
            0: '晴朗', 1: '晴到多云', 2: '多云', 3: '阴天', 45: '雾', 
            48: '沉积雾', 51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨', 
            61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 
            73: '中雪', 75: '大雪', 80: '阵雨', 81: '中阵雨', 
            82: '大阵雨', 95: '雷阵雨'
        }
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
        # 如果提供了city_id，为了保证数据库的完整性，我们总是获取所有可用字段 (Item 2)
        request_fields = fields
        if city_id:
            # 策略：本地数据库优先
            try:
                # 1. 尝试从本地持久化表 weather_data 获取数据
                db_data = self.db_manager.get_weather_data({
                    'city_id': city_id,
                    'start_date': f"{start_date}T00:00",
                    'end_date': f"{end_date}T23:59"
                })
                
                # 2. 检查本地数据是否完整
                # 计算期望的小时数
                d1 = datetime.strptime(start_date, '%Y-%m-%d')
                d2 = datetime.strptime(end_date, '%Y-%m-%d')
                expected_hours = (d2 - d1).days * 24 + 24
                
                if len(db_data) >= expected_hours:
                    # 3. 检查请求的字段在本地数据中是否均有数值 (Item 3 & 44 改进)
                    # 只要有一个用户请求的字段在所有记录中都为 None，就认为该字段可能未曾下载，需要触发 API 请求
                    is_complete = True
                    if fields:
                        for f in fields:
                            if f in ['city', 'date', 'time', 'datetime']:
                                continue
                            # 如果该字段在本地数据中全部为 None，说明需要“增肥”
                            if all(rec.get(f) is None for rec in db_data):
                                logger.info(f"本地数据库虽然小时数足够({len(db_data)})，但缺失关键字段: {f}")
                                is_complete = False
                                break
                    
                    if is_complete:
                        logger.info(f"本地数据库命中: 找到 {len(db_data)} 条记录，字段完整，满足期望")
                        # 格式化输出，保持与 API 响应一致
                        return {
                            'latitude': latitude,
                            'longitude': longitude,
                            'timezone': timezone,
                            'hourly_data': db_data
                        }
                    else:
                        logger.info("本地数据库字段不全，将触发 API 请求以补全（增肥）缺失字段")
            except Exception as e:
                logger.warning(f"本地数据库预查失败: {e}")

            # 如果本地不完整，准备向 API 请求所有字段以填补本地库
            all_fields = []
            for cat in AVAILABLE_FIELDS.values():
                all_fields.extend(cat.keys())
            request_fields = list(set(fields + all_fields))
            
        # 生成缓存键 (包含请求的所有字段)
        cache_params = {
            'lon': longitude,
            'lat': latitude,
            'start': start_date,
            'end': end_date,
            'fields': sorted(request_fields),
            'tz': timezone
        }
        cache_key = self.cache.generate_cache_key(cache_params)
        
        # 检查缓存 (快照缓存)
        cached_data = self.cache.get(cache_key)
        if cached_data:
            logger.info(f"从快照缓存获取数据: {start_date} 至 {end_date}")
            # 如果请求的字段被缓存，则提取原本请求的部分返回
            if request_fields != fields:
                filtered_hourly = []
                for rec in cached_data.get('hourly_data', []):
                    filtered_rec = {k: v for k, v in rec.items() if k in fields or k == 'datetime'}
                    filtered_hourly.append(filtered_rec)
                
                return {**cached_data, 'hourly_data': filtered_hourly}
            return cached_data
        
        # 构建API URL
        api_url = self._build_api_url(
            longitude, latitude, start_date, end_date, request_fields, timezone
        )
        
        try:
            # 调用API
            logger.info(f"调用Open-Meteo API: {start_date} 至 {end_date}, 字段数: {len(request_fields)}")
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            
            # 解析响应 (使用实际请求的字段)
            data = response.json()
            parsed_data = self._parse_response(data, request_fields)
            
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
            
            # 如果实际请求的字段多于用户请求，只向用户返回用户请求的部分
            if request_fields != fields:
                filtered_hourly = []
                for rec in parsed_data.get('hourly_data', []):
                    filtered_rec = {k: v for k, v in rec.items() if k in fields or k == 'datetime'}
                    filtered_hourly.append(filtered_rec)
                
                return {**parsed_data, 'hourly_data': filtered_hourly}
                
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
        # 将字段列表转换为逗号分隔的字符串，考虑 API 参数映射 (Item 2)
        api_fields_list = []
        for f in fields:
            # 查找字段对应的 API 参数名
            found = False
            for group in AVAILABLE_FIELDS.values():
                if f in group:
                    api_fields_list.append(group[f].get('api_param', f))
                    found = True
                    break
            if not found:
                api_fields_list.append(f)
        
        hourly_params = ','.join(api_fields_list)
        
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
                    # 查找字段对应的 API 参数名 (Item 2)
                    api_key = field
                    for group in AVAILABLE_FIELDS.values():
                        if field in group:
                            api_key = group[field].get('api_param', field)
                            break
                            
                    if api_key in hourly:
                        record[field] = hourly[api_key][i]
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

    def get_current_weather(self, city_id: int) -> Dict[str, Any]:
        """
        获取实时天气 (包含辐照度)
        """
        coords = self.city_manager.get_coordinates(city_id)
        if not coords:
            raise ValueError("City not found")
        
        lon, lat = coords
        city_info = self.city_manager.get_city_by_id(city_id)
        
        # 使用新的 API 参数格式以获取更多数据 (如辐射)
        # current=temperature_2m,wind_speed_10m,weather_code,shortwave_radiation
        url = f"{self.forecast_url}?latitude={lat}&longitude={lon}&current=temperature_2m,wind_speed_10m,weather_code,shortwave_radiation&timezone=Asia/Shanghai"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # 解析 new format 'current' object
            current = data.get('current', {})
            code = int(current.get('weather_code', 0))
            
            return {
                'city_name': city_info['city_name'],
                'temperature': current.get('temperature_2m'),
                'wind_speed': current.get('wind_speed_10m'),
                'radiation': current.get('shortwave_radiation', 0), # 新增辐照度
                'weather_code': code,
                'weather_name': self.weather_code_map.get(code, f"未知({code})"),
                'update_time': current.get('time', '').replace('T', ' ')
            }
        except Exception as e:
            logger.error(f"获取实时天气失败: {e}")
            raise

    def get_forecast(self, city_id: int, days: int = 7) -> Dict[str, Any]:
        """
        获取天气预报 (含7天预报与48小时详情)
        """
        coords = self.city_manager.get_coordinates(city_id)
        if not coords:
            raise ValueError("City not found")
        
        lon, lat = coords
        city_info = self.city_manager.get_city_by_id(city_id)
        
        # 请求每日、每小时以及15分钟高精度数据
        # hourly=...
        # minutely_15=temperature_2m,precipitation_probability,wind_speed_10m,shortwave_radiation
        url = f"{self.forecast_url}?latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,shortwave_radiation&minutely_15=temperature_2m,precipitation_probability,wind_speed_10m,shortwave_radiation&forecast_days={days}&timezone=Asia/Shanghai"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            daily = data.get('daily', {})
            hourly = data.get('hourly', {})
            minutely = data.get('minutely_15', {})
            
            # --- 处理每日预报 (7天) ---
            forecast_list = []
            dates = daily.get('time', [])
            codes = daily.get('weather_code', [])
            max_temps = daily.get('temperature_2m_max', [])
            min_temps = daily.get('temperature_2m_min', [])
            
            for i in range(len(dates)):
                code = int(codes[i])
                forecast_list.append({
                    'date': dates[i],
                    'weather_code': code,
                    'weather_name': self.weather_code_map.get(code, f"未知({code})"),
                    'temp_max': max_temps[i],
                    'temp_min': min_temps[i]
                })

            # --- 处理每小时预报 (全部) ---
            hourly_list = []
            h_times = hourly.get('time', [])
            h_temps = hourly.get('temperature_2m', [])
            h_humidity = hourly.get('relative_humidity_2m', [])
            h_precip = hourly.get('precipitation_probability', [])
            h_wind = hourly.get('wind_speed_10m', [])
            h_rad = hourly.get('shortwave_radiation', [])
            
            for i in range(len(h_times)):
                hourly_list.append({
                    'time': h_times[i],
                    'temp': h_temps[i],
                    'humidity': h_humidity[i],
                    'pop': h_precip[i],
                    'wind': h_wind[i],
                    'radiation': h_rad[i]
                })

            # --- 处理15分钟预报 (高精度数据) ---
            minutely_list = []
            m_times = minutely.get('time', [])
            m_temps = minutely.get('temperature_2m', [])
            m_precip = minutely.get('precipitation_probability', [])
            m_wind = minutely.get('wind_speed_10m', [])
            m_rad = minutely.get('shortwave_radiation', [])

            for i in range(len(m_times)):
                minutely_list.append({
                    'time': m_times[i],
                    'temp': m_temps[i],
                    'pop': m_precip[i],
                    'wind': m_wind[i],
                    'radiation': m_rad[i]
                })

            return {
                'city_name': city_info['city_name'],
                'daily_forecast': forecast_list,
                'hourly_forecast': hourly_list,
                'minutely_15_forecast': minutely_list
            }
        except Exception as e:
            logger.error(f"获取天气预报失败: {e}")
            raise
