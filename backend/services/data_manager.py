"""
数据管理服务
负责批量下载、自动更新和数据完整性检查
"""
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
from backend.services.weather_service import WeatherService
from backend.models.database import DatabaseManager
from backend.models.city import CityManager

logger = logging.getLogger(__name__)


class DataManager:
    """
    数据管理器类
    负责批量数据下载、自动更新和完整性检查
    """
    
    def __init__(
        self,
        weather_service: WeatherService,
        db_manager: DatabaseManager,
        city_manager: CityManager
    ):
        """
        初始化数据管理器
        
        Args:
            weather_service: 天气服务实例
            db_manager: 数据库管理器实例
            city_manager: 城市管理器实例
        """
        self.weather_service = weather_service
        self.db_manager = db_manager
        self.city_manager = city_manager
        logger.info("数据管理器初始化完成")
    
    def batch_download(
        self,
        city_id: int,
        start_date: str,
        end_date: str,
        fields: List[str]
    ) -> Dict[str, Any]:
        """
        批量下载指定时间段的数据并保存到数据库
        
        Args:
            city_id: 城市ID
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            fields: 数据字段列表
            
        Returns:
            下载结果字典
        """
        try:
            logger.info(f"开始批量下载数据: 城市ID={city_id}, {start_date} 至 {end_date}")
            
            # 获取城市信息
            city_info = self.city_manager.get_city_by_id(city_id)
            if not city_info:
                raise ValueError(f"城市ID {city_id} 不存在")
            
            # 获取天气数据
            weather_data = self.weather_service.get_historical_weather(
                longitude=city_info['longitude'],
                latitude=city_info['latitude'],
                start_date=start_date,
                end_date=end_date,
                fields=fields
            )
            
            # 保存到数据库
            saved_count = self.weather_service.save_to_database(
                city_id,
                weather_data
            )
            
            result = {
                'success': True,
                'city_name': city_info['city_name'],
                'start_date': start_date,
                'end_date': end_date,
                'total_records': len(weather_data['hourly_data']),
                'saved_records': saved_count,
                'message': f"成功下载并保存 {saved_count} 条记录"
            }
            
            logger.info(f"批量下载完成: {result['message']}")
            return result
            
        except Exception as e:
            logger.error(f"批量下载失败: {e}")
            return {
                'success': False,
                'message': f"下载失败: {str(e)}"
            }
    
    def batch_download_all_cities(
        self,
        start_date: str,
        end_date: str,
        fields: List[str]
    ) -> Dict[str, Any]:
        """
        批量下载所有城市的数据
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            fields: 数据字段列表
            
        Returns:
            下载结果字典
        """
        try:
            cities = self.city_manager.get_all_cities()
            results = []
            total_saved = 0
            
            for city in cities:
                result = self.batch_download(
                    city['id'],
                    start_date,
                    end_date,
                    fields
                )
                results.append(result)
                if result['success']:
                    total_saved += result['saved_records']
            
            success_count = sum(1 for r in results if r['success'])
            
            return {
                'success': True,
                'total_cities': len(cities),
                'success_cities': success_count,
                'total_saved_records': total_saved,
                'details': results,
                'message': f"完成 {success_count}/{len(cities)} 个城市的数据下载"
            }
            
        except Exception as e:
            logger.error(f"批量下载所有城市失败: {e}")
            return {
                'success': False,
                'message': f"下载失败: {str(e)}"
            }
    
    def check_data_completeness(
        self,
        city_id: int,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """
        检查数据完整性，找出缺失的日期
        
        Args:
            city_id: 城市ID
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            完整性检查结果
        """
        try:
            logger.info(f"检查数据完整性: 城市ID={city_id}, {start_date} 至 {end_date}")
            
            # 获取城市信息
            city_info = self.city_manager.get_city_by_id(city_id)
            if not city_info:
                raise ValueError(f"城市ID {city_id} 不存在")
            
            # 查询数据库中已有的数据
            filters = {
                'city_id': city_id,
                'start_date': start_date,
                'end_date': end_date + ' 23:59:59'
            }
            existing_data = self.db_manager.get_weather_data(filters)
            
            # 提取已有的日期
            existing_dates = set()
            for record in existing_data:
                date_str = record['datetime'][:10]  # 提取日期部分 YYYY-MM-DD
                existing_dates.add(date_str)
            
            # 生成期望的日期范围
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            expected_dates = set()
            current = start
            while current <= end:
                expected_dates.add(current.strftime('%Y-%m-%d'))
                current += timedelta(days=1)
            
            # 计算总期望小时数
            total_hours = len(expected_dates) * 24
            
            # 找出缺失的日期
            missing_dates = sorted(expected_dates - existing_dates)
            existing_dates_list = sorted(existing_dates)
            
            # 计算缺失的小时数 (估算)
            # 实际缺失的小时数 = 总期望小时数 - 数据库中实际的小时记录数
            actual_records_count = len(existing_data)
            missing_count = max(0, total_hours - actual_records_count)
            
            # 按连续性分组缺失日期
            missing_ranges = self._group_consecutive_dates(missing_dates)
            
            result = {
                'city_name': city_info['city_name'],
                'start_date': start_date,
                'end_date': end_date,
                'total_days': len(expected_dates),
                'total_hours': total_hours,
                'existing_days': len(existing_dates),
                'missing_days': len(missing_dates),
                'missing_count': missing_count,
                'completeness_rate': round(actual_records_count / total_hours * 100, 2) if total_hours > 0 else 0,
                'existing_dates': existing_dates_list,
                'missing_dates': missing_dates,
                'missing_ranges': missing_ranges,
                'total_records': actual_records_count
            }
            
            logger.info(f"完整性检查完成: {result['completeness_rate']}% 完整 (缺失 {missing_count} 小时)")
            return result
            
        except Exception as e:
            logger.error(f"检查数据完整性失败: {e}")
            raise
    
    def _group_consecutive_dates(self, dates: List[str]) -> List[Dict[str, str]]:
        """
        将连续的日期分组为范围
        
        Args:
            dates: 日期列表（已排序）
            
        Returns:
            日期范围列表
        """
        if not dates:
            return []
        
        ranges = []
        start = dates[0]
        prev = datetime.strptime(dates[0], '%Y-%m-%d')
        
        for i in range(1, len(dates)):
            current = datetime.strptime(dates[i], '%Y-%m-%d')
            if (current - prev).days > 1:
                # 不连续，保存当前范围
                ranges.append({
                    'start': start,
                    'end': dates[i-1],
                    'days': (datetime.strptime(dates[i-1], '%Y-%m-%d') - datetime.strptime(start, '%Y-%m-%d')).days + 1
                })
                start = dates[i]
            prev = current
        
        # 添加最后一个范围
        ranges.append({
            'start': start,
            'end': dates[-1],
            'days': (datetime.strptime(dates[-1], '%Y-%m-%d') - datetime.strptime(start, '%Y-%m-%d')).days + 1
        })
        
        return ranges
    
    def auto_update_latest_data(
        self,
        city_id: int,
        fields: List[str],
        days_back: int = 7
    ) -> Dict[str, Any]:
        """
        自动更新最近几天的数据
        
        Args:
            city_id: 城市ID
            fields: 数据字段列表
            days_back: 向前追溯的天数
            
        Returns:
            更新结果
        """
        try:
            # 计算日期范围（考虑Open-Meteo有5天延迟）
            end_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=days_back + 5)).strftime('%Y-%m-%d')
            
            logger.info(f"自动更新数据: 城市ID={city_id}, {start_date} 至 {end_date}")
            
            # 下载数据
            result = self.batch_download(city_id, start_date, end_date, fields)
            
            return result
            
        except Exception as e:
            logger.error(f"自动更新失败: {e}")
            return {
                'success': False,
                'message': f"更新失败: {str(e)}"
            }
    
    def get_data_statistics(self) -> Dict[str, Any]:
        """
        获取数据库统计信息
        
        Returns:
            统计信息字典
        """
        try:
            # 获取所有城市
            cities = self.city_manager.get_all_cities()
            
            city_stats = []
            total_records = 0
            
            for city in cities:
                # 查询该城市的数据
                sql = "SELECT COUNT(*) as count, MIN(datetime) as earliest, MAX(datetime) as latest FROM weather_data WHERE city_id = ?"
                result = self.db_manager.execute_query(sql, (city['id'],))
                
                if result and result[0]['count'] > 0:
                    row = result[0]
                    city_stats.append({
                        'city_name': city['city_name'],
                        'record_count': row['count'],
                        'earliest_date': row['earliest'],
                        'latest_date': row['latest']
                    })
                    total_records += row['count']
                else:
                    city_stats.append({
                        'city_name': city['city_name'],
                        'record_count': 0,
                        'earliest_date': None,
                        'latest_date': None
                    })
            
            return {
                'total_cities': len(cities),
                'total_records': total_records,
                'city_statistics': city_stats
            }
            
        except Exception as e:
            logger.error(f"获取数据统计失败: {e}")
            raise

    def delete_data(self, city_id: int, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        删除指定范围的数据
        """
        try:
            filters = {'city_id': city_id}
            if start_date:
                filters['start_date'] = start_date
            if end_date:
                filters['end_date'] = end_date
                
            deleted_count = self.db_manager.delete_weather_data(filters)
            
            logger.info(f"删除数据成功: 城市ID={city_id}, 删除 {deleted_count} 条")
            
            return {
                'success': True,
                'deleted_count': deleted_count,
                'message': f"成功删除 {deleted_count} 条记录"
            }
        except Exception as e:
            logger.error(f"删除数据失败: {e}")
            raise

    def preview_delete_data(self, city_id: int, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        预览删除数据的范围和大小
        """
        try:
            filters = {'city_id': city_id}
            if start_date:
                filters['start_date'] = start_date
            if end_date:
                filters['end_date'] = end_date
                
            stats = self.db_manager.get_weather_data_stats(filters)
            city_info = self.city_manager.get_city_by_id(city_id)
            
            # 估算大小时，假设每条记录约占用 300 字节 (text + reals)
            estimated_size_bytes = stats['count'] * 300
            estimated_size_mb = round(estimated_size_bytes / (1024 * 1024), 2)
            
            return {
                'success': True,
                'city_name': city_info['city_name'] if city_info else f"ID {city_id}",
                'count': stats['count'],
                'start_date': stats['start_date'],
                'end_date': stats['end_date'],
                'estimated_size_mb': estimated_size_mb,
                'message': f"将删除 {stats['count']} 条记录"
            }
        except Exception as e:
            logger.error(f"预览删除数据失败: {e}")
            raise
