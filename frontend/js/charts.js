/**
 * 图表配置和渲染
 * 使用Chart.js创建各种数据可视化图表
 */

/**
 * 图表管理器类
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#1e293b',
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: '600'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 亮色背景更高级
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 8,
                    displayColors: true,
                    usePointStyle: true,
                    boxPadding: 6,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function (context) {
                            return context[0].label; // 显示完整的日期时间
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            return ' ' + label; // 增加间距
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#64748b', // 更深的灰色
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)' // 浅色背景对应的深色网格
                    }
                },
                y: {
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        };
    }

    /**
     * 销毁所有图表
     */
    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    /**
     * 创建温度趋势图
     * @param {string} canvasId - Canvas元素ID
     * @param {array} data - 数据数组
     * @param {string} cityName - 城市名称
     */
    createTemperatureChart(canvasId, data, cityName = '') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // 销毁旧图表
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // 提取数据
        const labels = data.map(d => new Date(d.datetime).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit'
        }));
        const temperatures = data.map(d => d.temperature_2m);

        // 创建图表
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '温度 (°C)',
                    data: temperatures,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: !!cityName,
                        text: `温度趋势 - ${cityName}`,
                        color: '#1d1d1f', // 纯黑/深灰
                        font: { size: 15, weight: '700' } // 调大加粗
                    }
                }
            }
        });
    }

    /**
     * 创建辐照度分布图
     * @param {string} canvasId - Canvas元素ID
     * @param {array} data - 数据数组
     * @param {string} cityName - 城市名称
     */
    createRadiationChart(canvasId, data, cityName = '') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = data.map(d => new Date(d.datetime).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit'
        }));

        const datasets = [];

        if (data[0]?.shortwave_radiation !== undefined) {
            datasets.push({
                label: '短波辐射 (W/m²)',
                data: data.map(d => d.shortwave_radiation),
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            });
        }

        if (data[0]?.direct_radiation !== undefined) {
            datasets.push({
                label: '直接辐射 (W/m²)',
                data: data.map(d => d.direct_radiation),
                borderColor: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            });
        }

        if (data[0]?.diffuse_radiation !== undefined) {
            datasets.push({
                label: '散射辐射 (W/m²)',
                data: data.map(d => d.diffuse_radiation),
                borderColor: '#fb923c',
                backgroundColor: 'rgba(251, 146, 60, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            });
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: !!cityName,
                        text: `辐照度分布 - ${cityName}`,
                        color: '#1d1d1f',
                        font: { size: 15, weight: '700' }
                    }
                }
            }
        });
    }

    /**
     * 创建风速变化图
     * @param {string} canvasId - Canvas元素ID
     * @param {array} data - 数据数组
     * @param {string} cityName - 城市名称
     */
    createWindSpeedChart(canvasId, data, cityName = '') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = data.map(d => new Date(d.datetime).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit'
        }));

        const datasets = [];

        if (data[0]?.wind_speed_10m !== undefined) {
            datasets.push({
                label: '10米风速 (m/s)',
                data: data.map(d => (d.wind_speed_10m / 3.6).toFixed(2)),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            });
        }

        if (data[0]?.wind_speed_100m !== undefined) {
            datasets.push({
                label: '100米风速 (km/h)',
                data: data.map(d => d.wind_speed_100m),
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            });
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: !!cityName,
                        text: `风速变化 - ${cityName}`,
                        color: '#1d1d1f',
                        font: { size: 15, weight: '700' }
                    }
                }
            }
        });
    }

    /**
     * 创建降水量图
     * @param {string} canvasId - Canvas元素ID
     * @param {array} data - 数据数组
     * @param {string} cityName - 城市名称
     */
    createPrecipitationChart(canvasId, data, cityName = '') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = data.map(d => new Date(d.datetime).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit'
        }));

        const precipitation = data.map(d => d.precipitation || 0);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '降水量 (mm)',
                    data: precipitation,
                    backgroundColor: 'rgba(14, 165, 233, 0.6)',
                    borderColor: '#0ea5e9',
                    borderWidth: 1
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: !!cityName,
                        text: `降水量 - ${cityName}`,
                        color: '#1d1d1f',
                        font: { size: 15, weight: '700' }
                    }
                }
            }
        });
    }

    /**
     * 创建多个城市的对比图表
     * @param {string} canvasId - Canvas元素ID
     * @param {array} citiesData - 城市数据数组 [{name: '城市名', data: [...]}, ...]
     * @param {string} fieldKey - 要对比的数据字段名
     * @param {string} label - 图表标签
     */
    createComparisonChart(canvasId, citiesData, fieldKey, label) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        if (citiesData.length === 0) return;

        // 使用第一个城市的数据生成 X 轴标签
        const labels = citiesData[0].data.map(d => new Date(d.datetime).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit'
        }));

        // 定义一组对比颜色
        const colors = [
            '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
        ];

        const datasets = citiesData.map((city, index) => ({
            label: `${city.name} - ${label}`,
            data: city.data.map(d => d[fieldKey]),
            borderColor: colors[index % colors.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3
        }));

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: `多城市对比: ${label}`,
                        color: '#1d1d1f',
                        font: { size: 16, weight: '700' }
                    }
                }
            }
        });
    }
}

// 创建全局图表管理器实例
const chartManager = new ChartManager();
