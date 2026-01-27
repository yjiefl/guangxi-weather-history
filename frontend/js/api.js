/**
 * API调用封装
 * 提供与后端API交互的所有方法
 */

const API_BASE_URL = window.location.origin + '/api';

/**
 * API客户端类
 */
class APIClient {
    /**
     * 发送HTTP请求
     * @param {string} endpoint - API端点
     * @param {object} options - 请求选项
     * @returns {Promise} 响应数据
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '请求失败');
            }

            return data;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    /**
     * GET请求
     * @param {string} endpoint - API端点
     * @returns {Promise} 响应数据
     */
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
        });
    }

    /**
     * POST请求
     * @param {string} endpoint - API端点
     * @param {object} data - 请求数据
     * @returns {Promise} 响应数据
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * 获取城市列表
     * @returns {Promise} 城市列表
     */
    async getCities() {
        return this.get('/cities');
    }

    /**
     * 获取可用字段
     * @returns {Promise} 字段列表
     */
    async getFields() {
        return this.get('/fields');
    }

    /**
     * 查询天气数据
     * @param {object} params - 查询参数
     * @returns {Promise} 天气数据
     */
    async queryWeather(params) {
        return this.post('/weather/query', params);
    }

    /**
     * 导出天气数据
     * @param {object} params - 导出参数
     * @param {string} format - 导出格式 (excel/csv)
     */
    async exportWeather(params, format = 'excel') {
        const url = `${API_BASE_URL}/weather/export`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...params, format }),
            });

            if (!response.ok) {
                throw new Error('导出失败');
            }

            // 获取文件名
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `天气数据.${format === 'csv' ? 'csv' : 'xlsx'}`;

            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // 下载文件
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            return true;
        } catch (error) {
            console.error('导出错误:', error);
            throw error;
        }
    }

    /**
     * 对比多个城市
     * @param {object} params - 对比参数
     * @returns {Promise} 对比结果
     */
    async compareCities(params) {
        return this.post('/weather/compare', params);
    }

    /**
     * 获取统计信息
     * @returns {Promise} 统计信息
     */
    async getStats() {
        return this.get('/stats');
    }

    /**
     * 健康检查
     * @returns {Promise} 健康状态
     */
    /**
     * 健康检查ping
     * @returns {Promise<boolean>} 是否在线
     */
    async ping() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                cache: 'no-cache'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 停止并关闭后台服务
     */
    async shutdown() {
        try {
            return await this.post('/shutdown', {});
        } catch (error) {
            console.error('停机请求失败:', error);
            throw error;
        }
    }
}

// 创建全局API客户端实例
const api = new APIClient();
