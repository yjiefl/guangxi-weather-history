"""
数据分析服务
负责天气数据的统计分析
遵循单一职责原则
"""
import logging
from typing import List, Dict, Any
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def convert_to_python_types(obj):
    """
    将numpy/pandas类型转换为Python原生类型
    
    Args:
        obj: 要转换的对象
        
    Returns:
        转换后的Python原生类型对象
    """
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_python_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_python_types(item) for item in obj]
    return obj


class DataAnalyzer:
    """
    数据分析器类
    负责天气数据的统计和分析
    """
    
    def __init__(self):
        """初始化数据分析器"""
        logger.info("数据分析器初始化完成")
    
    def calculate_summary(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        计算数据统计摘要
        
        Args:
            data: 天气数据列表
            
        Returns:
            统计摘要字典
        """
        if not data:
            return {}
        
        try:
            df = pd.DataFrame(data)
            summary = {}
            
            # 温度统计
            if 'temperature_2m' in df.columns:
                temp_data = df['temperature_2m'].dropna()
                if len(temp_data) > 0:
                    summary['temperature'] = {
                        'avg': round(temp_data.mean(), 2),
                        'max': round(temp_data.max(), 2),
                        'min': round(temp_data.min(), 2),
                        'std': round(temp_data.std(), 2)
                    }
            
            # 降水统计
            if 'precipitation' in df.columns:
                precip_data = df['precipitation'].dropna()
                if len(precip_data) > 0:
                    summary['precipitation'] = {
                        'total': round(precip_data.sum(), 2),
                        'avg': round(precip_data.mean(), 2),
                        'max': round(precip_data.max(), 2),
                        'rainy_hours': int((precip_data > 0).sum())
                    }
            
            # 风速统计
            if 'wind_speed_10m' in df.columns:
                wind_data = df['wind_speed_10m'].dropna()
                if len(wind_data) > 0:
                    summary['wind_speed'] = {
                        'avg': round(wind_data.mean(), 2),
                        'max': round(wind_data.max(), 2),
                        'min': round(wind_data.min(), 2)
                    }
            
            # 辐照度统计
            if 'shortwave_radiation' in df.columns:
                radiation_data = df['shortwave_radiation'].dropna()
                if len(radiation_data) > 0:
                    total_sum = radiation_data.sum()
                    summary['solar_radiation'] = {
                        'total': round(total_sum, 2),
                        'total_kwh': round(total_sum / 1000, 2),  # 转换为kWh/m²
                        'avg': round(radiation_data.mean(), 2),
                        'max': round(radiation_data.max(), 2)
                    }
            
            # 湿度统计
            if 'relative_humidity_2m' in df.columns:
                humidity_data = df['relative_humidity_2m'].dropna()
                if len(humidity_data) > 0:
                    summary['humidity'] = {
                        'avg': round(humidity_data.mean(), 2),
                        'max': round(humidity_data.max(), 2),
                        'min': round(humidity_data.min(), 2)
                    }
            
            # 气压统计
            if 'surface_pressure' in df.columns:
                pressure_data = df['surface_pressure'].dropna()
                if len(pressure_data) > 0:
                    summary['pressure'] = {
                        'avg': round(pressure_data.mean(), 2),
                        'max': round(pressure_data.max(), 2),
                        'min': round(pressure_data.min(), 2)
                    }
            
            logger.debug(f"计算统计摘要成功: {len(data)} 条记录")
            return convert_to_python_types(summary)
            
        except Exception as e:
            logger.error(f"计算统计摘要失败: {e}")
            return {}
    
    def calculate_daily_avg(self, hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        计算每日平均值
        
        Args:
            hourly_data: 小时数据列表
            
        Returns:
            每日平均数据列表
        """
        if not hourly_data:
            return []
        
        try:
            df = pd.DataFrame(hourly_data)
            
            # 确保datetime列存在
            if 'datetime' not in df.columns:
                logger.error("数据中缺少datetime列")
                return []
            
            # 转换为datetime类型
            df['datetime'] = pd.to_datetime(df['datetime'])
            df['date'] = df['datetime'].dt.date
            
            # 数值列
            numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns
            
            # 按日期分组计算平均值
            daily_avg = df.groupby('date')[numeric_columns].mean().reset_index()
            
            # 转换回字典列表
            result = daily_avg.to_dict('records')
            
            # 将date转换为字符串
            for record in result:
                record['date'] = str(record['date'])
            
            logger.debug(f"计算每日平均值成功: {len(result)} 天")
            return result
            
        except Exception as e:
            logger.error(f"计算每日平均值失败: {e}")
            return []
    
    def detect_anomalies(
        self,
        data: List[Dict[str, Any]],
        field: str,
        threshold: float = 3.0
    ) -> List[Dict[str, Any]]:
        """
        检测异常值（使用标准差方法）
        
        Args:
            data: 数据列表
            field: 要检测的字段
            threshold: 异常阈值（标准差倍数）
            
        Returns:
            异常值列表
        """
        if not data:
            return []
        
        try:
            df = pd.DataFrame(data)
            
            if field not in df.columns:
                logger.warning(f"字段 {field} 不存在")
                return []
            
            # 计算均值和标准差
            field_data = df[field].dropna()
            if len(field_data) == 0:
                return []
            
            mean = field_data.mean()
            std = field_data.std()
            
            # 检测异常值
            df['z_score'] = (df[field] - mean) / std
            anomalies = df[abs(df['z_score']) > threshold]
            
            result = anomalies.to_dict('records')
            
            logger.debug(f"检测到 {len(result)} 个异常值")
            return result
            
        except Exception as e:
            logger.error(f"检测异常值失败: {e}")
            return []
    
    def compare_cities(
        self,
        city_data_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        对比多个城市的数据
        
        Args:
            city_data_list: 城市数据列表，每个元素包含city_name和data
            
        Returns:
            对比结果字典
        """
        if not city_data_list:
            return {}
        
        try:
            comparison = {}
            
            for city_data in city_data_list:
                city_name = city_data.get('city_name')
                data = city_data.get('data', [])
                
                if not city_name or not data:
                    continue
                
                # 计算该城市的统计摘要
                summary = self.calculate_summary(data)
                comparison[city_name] = summary
            
            logger.debug(f"对比 {len(comparison)} 个城市的数据")
            return comparison
            
        except Exception as e:
            logger.error(f"对比城市数据失败: {e}")
            return {}
    
    def calculate_trends(
        self,
        data: List[Dict[str, Any]],
        field: str,
        window: int = 24
    ) -> List[Dict[str, Any]]:
        """
        计算趋势（移动平均）
        
        Args:
            data: 数据列表
            field: 要计算趋势的字段
            window: 移动平均窗口大小（小时）
            
        Returns:
            包含趋势的数据列表
        """
        if not data:
            return []
        
        try:
            df = pd.DataFrame(data)
            
            if field not in df.columns:
                logger.warning(f"字段 {field} 不存在")
                return []
            
            # 计算移动平均
            df[f'{field}_trend'] = df[field].rolling(window=window, min_periods=1).mean()
            
            result = df.to_dict('records')
            
            logger.debug(f"计算趋势成功: {field}, 窗口: {window}")
            return result
            
        except Exception as e:
            logger.error(f"计算趋势失败: {e}")
            return []
