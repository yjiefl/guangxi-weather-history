"""
缓存管理器
负责API响应的缓存管理
遵循单一职责原则和开闭原则
"""
import logging
import json
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from backend.models.database import DatabaseManager

logger = logging.getLogger(__name__)


class CacheManager:
    """
    缓存管理器类
    负责API响应的缓存存储和检索
    """
    
    def __init__(self, db_manager: DatabaseManager, expire_hours: int = 720):
        """
        初始化缓存管理器
        
        Args:
            db_manager: 数据库管理器实例（依赖注入）
            expire_hours: 缓存过期时间（小时），默认720小时（30天）
        """
        self.db_manager = db_manager
        self.expire_hours = expire_hours
        logger.info(f"缓存管理器初始化完成，过期时间: {expire_hours}小时")
    
    def generate_cache_key(self, params: Dict[str, Any]) -> str:
        """
        生成缓存键
        使用参数的MD5哈希值作为缓存键
        
        Args:
            params: 参数字典
            
        Returns:
            缓存键字符串
        """
        # 将参数字典转换为排序后的JSON字符串
        param_str = json.dumps(params, sort_keys=True)
        # 计算MD5哈希
        cache_key = hashlib.md5(param_str.encode()).hexdigest()
        logger.debug(f"生成缓存键: {cache_key}")
        return cache_key
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        从缓存中获取数据
        
        Args:
            key: 缓存键
            
        Returns:
            缓存的数据字典，如果不存在或已过期返回None
        """
        sql = "SELECT response_data, expired_at FROM api_cache WHERE cache_key = ?"
        
        try:
            result = self.db_manager.execute_query(sql, (key,))
            
            if not result:
                logger.debug(f"缓存未命中: {key}")
                return None
            
            cache_data = result[0]
            expired_at = datetime.fromisoformat(cache_data['expired_at'])
            
            # 检查是否过期
            if datetime.now() > expired_at:
                logger.debug(f"缓存已过期: {key}")
                # 删除过期缓存
                self._delete_cache(key)
                return None
            
            # 解析JSON数据
            data = json.loads(cache_data['response_data'])
            logger.debug(f"缓存命中: {key}")
            return data
            
        except Exception as e:
            logger.error(f"获取缓存失败: {e}")
            return None
    
    def set(self, key: str, value: Dict[str, Any], expire_hours: Optional[int] = None) -> bool:
        """
        设置缓存数据
        
        Args:
            key: 缓存键
            value: 要缓存的数据字典
            expire_hours: 过期时间（小时），如果为None则使用默认值
            
        Returns:
            是否设置成功
        """
        if expire_hours is None:
            expire_hours = self.expire_hours
        
        # 计算过期时间
        expired_at = datetime.now() + timedelta(hours=expire_hours)
        
        # 序列化数据
        response_data = json.dumps(value, ensure_ascii=False)
        
        # 准备插入数据
        cache_data = {
            'cache_key': key,
            'response_data': response_data,
            'expired_at': expired_at.isoformat()
        }
        
        try:
            self.db_manager.bulk_insert('api_cache', [cache_data])
            logger.debug(f"缓存设置成功: {key}, 过期时间: {expired_at}")
            return True
        except Exception as e:
            logger.error(f"设置缓存失败: {e}")
            return False
    
    def is_expired(self, key: str) -> bool:
        """
        检查缓存是否过期
        
        Args:
            key: 缓存键
            
        Returns:
            是否过期（不存在也返回True）
        """
        sql = "SELECT expired_at FROM api_cache WHERE cache_key = ?"
        
        try:
            result = self.db_manager.execute_query(sql, (key,))
            
            if not result:
                return True
            
            expired_at = datetime.fromisoformat(result[0]['expired_at'])
            return datetime.now() > expired_at
            
        except Exception as e:
            logger.error(f"检查缓存过期失败: {e}")
            return True
    
    def _delete_cache(self, key: str) -> bool:
        """
        删除指定缓存
        
        Args:
            key: 缓存键
            
        Returns:
            是否删除成功
        """
        sql = "DELETE FROM api_cache WHERE cache_key = ?"
        
        try:
            affected = self.db_manager.execute_update(sql, (key,))
            if affected > 0:
                logger.debug(f"删除缓存成功: {key}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除缓存失败: {e}")
            return False
    
    def clear_expired(self) -> int:
        """
        清理所有过期的缓存
        
        Returns:
            清理的缓存数量
        """
        sql = "DELETE FROM api_cache WHERE expired_at < ?"
        
        try:
            affected = self.db_manager.execute_update(sql, (datetime.now().isoformat(),))
            logger.info(f"清理过期缓存成功，删除 {affected} 条记录")
            return affected
        except Exception as e:
            logger.error(f"清理过期缓存失败: {e}")
            return 0
    
    def clear_all(self) -> int:
        """
        清空所有缓存
        
        Returns:
            清理的缓存数量
        """
        sql = "DELETE FROM api_cache"
        
        try:
            affected = self.db_manager.execute_update(sql)
            logger.info(f"清空所有缓存成功，删除 {affected} 条记录")
            return affected
        except Exception as e:
            logger.error(f"清空缓存失败: {e}")
            return 0
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        
        Returns:
            缓存统计字典
        """
        try:
            # 总缓存数
            total_sql = "SELECT COUNT(*) as total FROM api_cache"
            total_result = self.db_manager.execute_query(total_sql)
            total = total_result[0]['total'] if total_result else 0
            
            # 有效缓存数
            valid_sql = "SELECT COUNT(*) as valid FROM api_cache WHERE expired_at > ?"
            valid_result = self.db_manager.execute_query(valid_sql, (datetime.now().isoformat(),))
            valid = valid_result[0]['valid'] if valid_result else 0
            
            # 过期缓存数
            expired = total - valid
            
            stats = {
                'total': total,
                'valid': valid,
                'expired': expired,
                'expire_hours': self.expire_hours
            }
            
            logger.debug(f"缓存统计: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"获取缓存统计失败: {e}")
            return {
                'total': 0,
                'valid': 0,
                'expired': 0,
                'expire_hours': self.expire_hours
            }
