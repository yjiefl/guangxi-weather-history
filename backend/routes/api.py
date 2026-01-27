"""
API路由
定义所有RESTful API接口
"""
import logging
from flask import Blueprint, request, jsonify, send_file
from typing import Dict, Any
from io import BytesIO
from backend.services.weather_service import WeatherService
from backend.services.data_exporter import DataExporter
from backend.services.data_analyzer import DataAnalyzer
from backend.models.city import CityManager
from backend.config import AVAILABLE_FIELDS, DEFAULT_FIELDS

logger = logging.getLogger(__name__)

# 创建蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 全局变量（将在app.py中初始化）
weather_service: WeatherService = None
data_exporter: DataExporter = None
data_analyzer: DataAnalyzer = None
city_manager: CityManager = None
data_manager = None  # 数据管理器


def init_api_services(
    ws: WeatherService,
    de: DataExporter,
    da: DataAnalyzer,
    cm: CityManager,
    dm=None  # 数据管理器
):
    """
    初始化API服务
    
    Args:
        ws: 天气服务实例
        de: 数据导出器实例
        da: 数据分析器实例
        cm: 城市管理器实例
        dm: 数据管理器实例
    """
    global weather_service, data_exporter, data_analyzer, city_manager, data_manager
    weather_service = ws
    data_exporter = de
    data_analyzer = da
    city_manager = cm
    data_manager = dm
    logger.info("API服务初始化完成")


@api_bp.route('/cities', methods=['GET'])
def get_cities():
    """
    获取所有城市列表
    
    Returns:
        JSON响应
    """
    try:
        cities = city_manager.get_all_cities()
        
        # 格式化响应
        city_list = [
            {
                'id': city['id'],
                'name': city['city_name'],
                'longitude': city['longitude'],
                'latitude': city['latitude'],
                'region': city['region']
            }
            for city in cities
        ]
        
        return jsonify({
            'code': 200,
            'message': '获取城市列表成功',
            'data': city_list
        })
        
    except Exception as e:
        logger.error(f"获取城市列表失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取城市列表失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/cities/search', methods=['GET'])
def search_cities():
    """搜索城市"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'code': 200, 'message': '请输入搜索关键词', 'data': []})
    try:
        results = weather_service.search_city(query)
        return jsonify({'code': 200, 'message': '搜索成功', 'data': results})
    except Exception as e:
        logger.error(f"搜索城市失败: {e}")
        return jsonify({'code': 500, 'message': str(e), 'data': []})

@api_bp.route('/cities/add', methods=['POST'])
def add_city():
    """添加城市到默认列表"""
    try:
        data = request.get_json()
        name = data.get('name')
        lng = data.get('longitude')
        lat = data.get('latitude')
        reg = data.get('region', '广西')
        
        if not all([name, lng, lat]):
            return jsonify({'code': 400, 'message': '缺少必要参数', 'data': None})
            
        # 如果城市已存在但被禁用，则启用它
        existing = city_manager.get_city_by_name(name)
        if existing:
            city_manager.update_city_status(existing['id'], True)
            return jsonify({'code': 200, 'message': '城市已恢复', 'data': {'id': existing['id']}})
            
        city_id = city_manager.add_city(name, lng, lat, reg)
        return jsonify({'code': 200, 'message': '添加城市成功', 'data': {'id': city_id}})
    except Exception as e:
        logger.error(f"添加城市失败: {e}")
        return jsonify({'code': 500, 'message': str(e), 'data': None})

@api_bp.route('/cities/remove/<int:city_id>', methods=['DELETE'])
def remove_city(city_id):
    """从列表移除城市 (设置为不启用)"""
    try:
        success = city_manager.update_city_status(city_id, False)
        if success:
            return jsonify({'code': 200, 'message': '移除城市成功', 'data': None})
        return jsonify({'code': 404, 'message': '城市未找到', 'data': None})
    except Exception as e:
        logger.error(f"移除城市失败: {e}")
        return jsonify({'code': 500, 'message': str(e), 'data': None})

@api_bp.route('/cities/clear', methods=['DELETE'])
def clear_cities():
    """移除所有城市 (设置为不启用)"""
    try:
        cities = city_manager.get_all_cities()
        for city in cities:
            city_manager.update_city_status(city['id'], False)
        return jsonify({'code': 200, 'message': '清空城市列表成功', 'data': None})
    except Exception as e:
        logger.error(f"清空城市列表失败: {e}")
        return jsonify({'code': 500, 'message': str(e), 'data': None})


@api_bp.route('/fields', methods=['GET'])
def get_fields():
    """
    获取可用的数据字段
    
    Returns:
        JSON响应
    """
    try:
        return jsonify({
            'code': 200,
            'message': '获取字段列表成功',
            'data': {
                'available_fields': AVAILABLE_FIELDS,
                'default_fields': DEFAULT_FIELDS
            }
        })
        
    except Exception as e:
        logger.error(f"获取字段列表失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取字段列表失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/shutdown', methods=['POST'])
def shutdown():
    """
    停止并关闭后台服务
    """
    try:
        logger.info("收到关机请求，正在关闭服务...")
        
        def kill_server():
            import time
            import os
            import signal
            time.sleep(0.5)  # 等待响应发送
            logger.info("进程自毁中...")
            
            try:
                # 获取进程组ID并杀掉整个组 (macOS/Unix 适用)
                # 这样可以确保 Flask 的 Reload 进程及其子进程一并关闭
                pgid = os.getpgrp()
                os.killpg(pgid, signal.SIGTERM)
            except Exception as e:
                logger.error(f"杀掉进程组失败: {e}")
                # 兜底：仅杀掉当前进程
                os._exit(0)
            
        import threading
        threading.Thread(target=kill_server).start()
        
        return jsonify({
            'code': 200,
            'message': '服务正在关闭...',
            'data': None
        })
    except Exception as e:
        logger.error(f"关闭服务失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'关闭失败: {str(e)}',
            'data': None
        }), 500

@api_bp.route('/weather/query', methods=['POST'])
def query_weather():
    """
    查询历史天气数据
    
    Request Body:
        {
            "city_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "fields": ["temperature_2m", "wind_speed_10m"]
        }
    
    Returns:
        JSON响应
    """
    try:
        # 获取请求参数
        data = request.get_json()
        
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        fields = data.get('fields', DEFAULT_FIELDS)
        
        # 参数验证
        if not all([city_id, start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id, start_date, end_date',
                'data': None
            }), 400
        
        # 获取城市信息
        city_info = city_manager.get_city_by_id(city_id)
        if not city_info:
            return jsonify({
                'code': 404,
                'message': f'城市ID {city_id} 不存在',
                'data': None
            }), 404
        
        # 获取天气数据
        weather_data = weather_service.get_historical_weather(
            longitude=city_info['longitude'],
            latitude=city_info['latitude'],
            start_date=start_date,
            end_date=end_date,
            fields=fields,
            city_id=city_id
        )
        
        # 计算统计摘要
        summary = data_analyzer.calculate_summary(weather_data['hourly_data'])
        
        # 构建响应
        response_data = {
            'city_id': city_id,
            'city_name': city_info['city_name'],
            'longitude': weather_data['longitude'],
            'latitude': weather_data['latitude'],
            'timezone': weather_data['timezone'],
            'start_date': start_date,
            'end_date': end_date,
            'total_records': len(weather_data['hourly_data']),
            'records': weather_data['hourly_data'],
            'summary': summary
        }
        
        return jsonify({
            'code': 200,
            'message': '查询成功',
            'data': response_data
        })
        
    except Exception as e:
        logger.error(f"查询天气数据失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'查询失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/weather/export', methods=['POST'])
def export_weather():
    """
    导出天气数据
    
    Request Body:
        {
            "city_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "format": "excel",  // or "csv"
            "fields": ["temperature_2m", "wind_speed_10m"]
        }
    
    Returns:
        文件流
    """
    try:
        # 获取请求参数
        data = request.get_json()
        
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        export_format = data.get('format', 'excel')
        fields = data.get('fields', DEFAULT_FIELDS)
        
        # 参数验证
        if not all([city_id, start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id, start_date, end_date',
                'data': None
            }), 400
        
        # 获取城市信息
        city_info = city_manager.get_city_by_id(city_id)
        if not city_info:
            return jsonify({
                'code': 404,
                'message': f'城市ID {city_id} 不存在',
                'data': None
            }), 404
        
        # 获取天气数据
        weather_data = weather_service.get_historical_weather(
            longitude=city_info['longitude'],
            latitude=city_info['latitude'],
            start_date=start_date,
            end_date=end_date,
            fields=fields,
            city_id=city_id
        )
        
        # 生成文件名
        filename = f"{city_info['city_name']}_天气数据_{start_date}_{end_date}"
        
        # 导出数据
        if export_format == 'csv':
            file_bytes = data_exporter.export_to_csv(
                weather_data['hourly_data'],
                filename,
                fields,
                city_name=city_info['city_name']
            )
            mimetype = 'text/csv'
            filename += '.csv'
        else:
            file_bytes = data_exporter.export_to_excel(
                weather_data['hourly_data'],
                filename,
                fields,
                city_name=city_info['city_name'],
                include_summary=True
            )
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename += '.xlsx'
        
        # 返回文件
        return send_file(
            BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"导出数据失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'导出失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/weather/compare', methods=['POST'])
def compare_cities():
    """
    对比多个城市的天气数据
    
    Request Body:
        {
            "city_ids": [1, 2, 3],
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "fields": ["temperature_2m", "wind_speed_10m"]
        }
    
    Returns:
        JSON响应
    """
    try:
        # 获取请求参数
        data = request.get_json()
        
        city_ids = data.get('city_ids', [])
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        fields = data.get('fields', DEFAULT_FIELDS)
        
        # 参数验证
        if not all([city_ids, start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_ids, start_date, end_date',
                'data': None
            }), 400
        
        # 批量查询城市数据
        cities_data = weather_service.batch_query_cities(
            city_ids, start_date, end_date, fields
        )
        
        # 准备对比数据
        comparison_data = [
            {
                'city_name': city_data['city_name'],
                'data': city_data['hourly_data']
            }
            for city_data in cities_data
        ]
        
        # 计算对比结果
        comparison = data_analyzer.compare_cities(comparison_data)
        
        return jsonify({
            'code': 200,
            'message': '对比成功',
            'data': {
                'cities': [cd['city_name'] for cd in cities_data],
                'comparison': comparison,
                'details': cities_data
            }
        })
        
    except Exception as e:
        logger.error(f"对比城市数据失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'对比失败: {str(e)}',
            'data': None
        }), 500

@api_bp.route('/data/export-bulk', methods=['POST'])
def export_bulk_data():
    """
    导出多个城市的完整天气数据
    """
    try:
        data = request.get_json()
        city_ids = data.get('city_ids', [])
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        export_format = data.get('format', 'excel')
        
        if not all([city_ids, start_date, end_date]):
             return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_ids, start_date, end_date',
                'data': None
            }), 400
            
        all_data = []
        for city_id in city_ids:
            city_info = city_manager.get_city_by_id(city_id)
            if not city_info: continue
            
            filters = {
                'city_id': city_id,
                'start_date': start_date,
                'end_date': end_date + 'T23:59:59'
            }
            records = weather_service.db_manager.get_weather_data(filters)
            
            # 为每条记录添加城市名称
            for r in records:
                r['city'] = city_info['city_name']
            
            all_data.extend(records)
            
        if not all_data:
            return jsonify({'code': 404, 'message': '选定范围内暂无数据，请先点击下载到数据库', 'data': None}), 404
            
        # 导出所有可能的字段（排除ID等内部字段）
        all_fields = []
        for cat in AVAILABLE_FIELDS.values():
            all_fields.extend(cat.keys())
            
        filename = f"广西天气数据_批量_{start_date}_{end_date}"
        
        if export_format == 'csv':
            file_bytes = data_exporter.export_to_csv(all_data, filename, all_fields)
            mimetype = 'text/csv'
            filename += '.csv'
        else:
            file_bytes = data_exporter.export_to_excel(all_data, filename, all_fields, include_summary=True)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename += '.xlsx'
            
        return send_file(
            BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        logger.error(f"批量导出数据失败: {e}")
        return jsonify({'code': 500, 'message': f'导出失败: {str(e)}', 'data': None}), 500


@api_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    获取系统统计信息
    
    Returns:
        JSON响应
    """
    try:
        # 获取缓存统计
        cache_stats = weather_service.cache.get_cache_stats()
        
        # 获取城市数量
        cities = city_manager.get_all_cities()
        
        stats = {
            'total_cities': len(cities),
            'cache_stats': cache_stats
        }
        
        return jsonify({
            'code': 200,
            'message': '获取统计信息成功',
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取统计信息失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    健康检查接口
    
    Returns:
        JSON响应
    """
    return jsonify({
        'code': 200,
        'message': 'API服务运行正常',
        'data': {
            'status': 'healthy',
            'service': 'Guangxi Weather History API'
        }
    })


# ========== 数据管理API ==========

@api_bp.route('/data/batch-download', methods=['POST'])
def batch_download():
    """
    批量下载数据到数据库
    
    Request Body:
        {
            "city_id": 1,
            "start_date": "2022-01-01",
            "end_date": "2022-12-31",
            "fields": ["temperature_2m", "wind_speed_10m", "shortwave_radiation"]
        }
    
    Returns:
        JSON响应
    """
    try:
        data = request.get_json()
        
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        fields = data.get('fields', DEFAULT_FIELDS)
        
        if not all([city_id, start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id, start_date, end_date',
                'data': None
            }), 400
        
        result = data_manager.batch_download(city_id, start_date, end_date, fields)
        
        return jsonify({
            'code': 200 if result['success'] else 500,
            'message': result['message'],
            'data': result
        })
        
    except Exception as e:
        logger.error(f"批量下载失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'批量下载失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/data/batch-download-all', methods=['POST'])
def batch_download_all():
    """
    批量下载所有城市的数据
    
    Request Body:
        {
            "start_date": "2022-01-01",
            "end_date": "2022-12-31",
            "fields": ["temperature_2m", "wind_speed_10m"]
        }
    
    Returns:
        JSON响应
    """
    try:
        data = request.get_json()
        
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        fields = data.get('fields', DEFAULT_FIELDS)
        
        if not all([start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：start_date, end_date',
                'data': None
            }), 400
        
        result = data_manager.batch_download_all_cities(start_date, end_date, fields)
        
        return jsonify({
            'code': 200,
            'message': result['message'],
            'data': result
        })
        
    except Exception as e:
        logger.error(f"批量下载所有城市失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'批量下载失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/data/check-completeness', methods=['POST'])
def check_completeness():
    """
    检查数据完整性
    
    Request Body:
        {
            "city_id": 1,
            "start_date": "2022-01-01",
            "end_date": "2022-12-31"
        }
    
    Returns:
        JSON响应
    """
    try:
        data = request.get_json()
        
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not all([city_id, start_date, end_date]):
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id, start_date, end_date',
                'data': None
            }), 400
        
        result = data_manager.check_data_completeness(city_id, start_date, end_date)
        
        return jsonify({
            'code': 200,
            'message': '检查完成',
            'data': result
        })
        
    except Exception as e:
        logger.error(f"检查数据完整性失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'检查失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/data/auto-update', methods=['POST'])
def auto_update():
    """
    自动更新最近的数据
    
    Request Body:
        {
            "city_id": 1,
            "days_back": 7,
            "fields": ["temperature_2m", "wind_speed_10m"]
        }
    
    Returns:
        JSON响应
    """
    try:
        data = request.get_json()
        
        city_id = data.get('city_id')
        days_back = data.get('days_back', 7)
        fields = data.get('fields', DEFAULT_FIELDS)
        
        if not city_id:
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id',
                'data': None
            }), 400
        
        result = data_manager.auto_update_latest_data(city_id, fields, days_back)
        
        return jsonify({
            'code': 200 if result['success'] else 500,
            'message': result['message'],
            'data': result
        })
        
    except Exception as e:
        logger.error(f"自动更新失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'自动更新失败: {str(e)}',
            'data': None
        }), 500


@api_bp.route('/data/delete/preview', methods=['POST'])
def preview_delete_data():
    """
    预览删除数据的影响范围
    """
    try:
        data = request.get_json()
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not city_id:
             return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id',
                'data': None
            }), 400
            
        result = data_manager.preview_delete_data(city_id, start_date, end_date)
        
        return jsonify({
            'code': 200,
            'message': '预览成功',
            'data': result
        })
    except Exception as e:
        logger.error(f"预览删除数据失败: {e}")
        return jsonify({
            'code': 500,
            'message': f"预览失败: {str(e)}",
            'data': None
        }), 500


@api_bp.route('/data/delete', methods=['DELETE'])
def delete_data():
    """
    删除指定范围的数据
    """
    try:
        data = request.get_json()
        city_id = data.get('city_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not city_id:
            return jsonify({
                'code': 400,
                'message': '缺少必要参数：city_id',
                'data': None
            }), 400
            
        result = data_manager.delete_data(city_id, start_date, end_date)
        
        return jsonify({
            'code': 200,
            'message': result['message'],
            'data': result
        })
    except Exception as e:
        logger.error(f"删除数据失败: {e}")
        return jsonify({
            'code': 500,
            'message': f"删除失败: {str(e)}",
            'data': None
        }), 500


@api_bp.route('/data/statistics', methods=['GET'])
def get_data_statistics():
    """
    获取数据库统计信息
    
    Returns:
        JSON响应
    """
    try:
        result = data_manager.get_data_statistics()
        
        return jsonify({
            'code': 200,
            'message': '获取统计信息成功',
            'data': result
        })
        
    except Exception as e:
        logger.error(f"获取数据统计失败: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取统计失败: {str(e)}',
            'data': None
        }), 500
