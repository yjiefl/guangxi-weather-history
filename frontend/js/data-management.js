/**
 * 数据管理功能
 * 处理批量下载、完整性检查和数据统计
 */

// 数据管理状态
let downloadState = {
    isDownloading: false,
    cancelRequested: false,
    totalChunks: 0,
    completedChunks: 0
};

// 初始化数据管理功能
function initDataManagement() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // 批量下载按钮
    document.getElementById('batchDownloadBtn').addEventListener('click', handleBatchDownload);

    // 下载所有城市按钮
    document.getElementById('downloadAllCitiesBtn').addEventListener('click', handleDownloadAllCities);

    // 完整性检查按钮
    document.getElementById('checkCompletenessBtn').addEventListener('click', handleCheckCompleteness);

    // 刷新统计按钮
    document.getElementById('refreshStatsBtn').addEventListener('click', loadDataStatistics);

    // 取消下载按钮
    document.getElementById('cancelDownloadBtn').addEventListener('click', () => {
        downloadState.cancelRequested = true;
        showResultMessage('downloadResult', '由于用户请求，下载即将中止...', 'error');
    });

    // 填充城市下拉框
    populateManagementCities();

    // 加载初始统计数据
    loadDataStatistics();
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

/**
 * 填充管理面板的城市下拉框
 */
function populateManagementCities() {
    const downloadCity = document.getElementById('downloadCity');
    const checkCity = document.getElementById('checkCity');

    if (appState.cities.length > 0) {
        const options = appState.cities.map(city =>
            `<option value="${city.id}">${city.name} (${city.region})</option>`
        ).join('');

        downloadCity.innerHTML = '<option value="">请选择城市</option>' + options;
        checkCity.innerHTML = '<option value="">请选择城市</option>' + options;
    }
}

/**
 * 处理批量下载
 */
/**
 * 处理批量下载
 */
async function handleBatchDownload() {
    const cityId = parseInt(document.getElementById('downloadCity').value);
    const startDateStr = document.getElementById('downloadStartDate').value;
    const endDateStr = document.getElementById('downloadEndDate').value;

    if (!cityId || !startDateStr || !endDateStr) {
        showResultMessage('downloadResult', '请填写所有字段', 'error');
        return;
    }

    if (downloadState.isDownloading) return;

    // 重置状态
    downloadState.isDownloading = true;
    downloadState.cancelRequested = false;

    const btn = document.getElementById('batchDownloadBtn');
    btn.disabled = true;

    const progressContainer = document.getElementById('downloadProgressContainer');
    const resultMsg = document.getElementById('downloadResult');
    progressContainer.style.display = 'block';
    resultMsg.style.display = 'none';

    try {
        // 将时间范围分割成月份
        const chunks = segmentDatesByMonth(startDateStr, endDateStr);
        downloadState.totalChunks = chunks.length;
        downloadState.completedChunks = 0;

        const fields = appState.selectedFields.length > 0 ? appState.selectedFields : ["temperature_2m", "relative_humidity_2m", "shortwave_radiation", "wind_speed_10m"];

        for (const chunk of chunks) {
            if (downloadState.cancelRequested) {
                throw new Error('下载已由用户取消');
            }

            updateDownloadProgress(
                `正在下载: ${chunk.start} 至 ${chunk.end}`,
                (downloadState.completedChunks / downloadState.totalChunks) * 100
            );

            await api.post('/data/batch-download', {
                city_id: cityId,
                start_date: chunk.start,
                end_date: chunk.end,
                fields: fields
            });

            downloadState.completedChunks++;
        }

        updateDownloadProgress('下载完成！', 100);
        showResultMessage('downloadResult', `✓ 成功下载并保存了 ${downloadState.totalChunks} 个时间段的数据`, 'success');
        loadDataStatistics();

    } catch (error) {
        showResultMessage('downloadResult', error.message, 'error');
    } finally {
        downloadState.isDownloading = false;
        btn.disabled = false;
        btn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" fill="currentColor"/>
            </svg>
            下载并保存到数据库
        `;
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }
}

/**
 * 将日期范围按月份分割
 */
function segmentDatesByMonth(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const chunks = [];

    let current = new Date(start);
    while (current <= end) {
        const chunkStart = new Date(current);
        // 设置为下个月的第一天，然后减去一天
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        let chunkEnd = new Date(nextMonth.getTime() - 86400000);

        if (chunkEnd > end) {
            chunkEnd = new Date(end);
        }

        chunks.push({
            start: chunkStart.toISOString().split('T')[0],
            end: chunkEnd.toISOString().split('T')[0]
        });

        current = new Date(nextMonth);
    }
    return chunks;
}

/**
 * 更新下载进度UI
 */
function updateDownloadProgress(status, percentage) {
    const container = document.getElementById('downloadProgressContainer');
    const bar = container.querySelector('.progress-bar-fill');
    const percentText = container.querySelector('.progress-percentage');
    const statusText = container.querySelector('.progress-status');

    bar.style.width = `${percentage}%`;
    percentText.textContent = `${Math.round(percentage)}%`;
    statusText.textContent = status;
}

/**
 * 处理下载所有城市数据
 */
async function handleDownloadAllCities() {
    const startDateStr = document.getElementById('downloadStartDate').value;
    const endDateStr = document.getElementById('downloadEndDate').value;

    if (!startDateStr || !endDateStr) {
        showResultMessage('downloadResult', '请选择日期范围', 'error');
        return;
    }

    if (downloadState.isDownloading) return;

    // 重置状态
    downloadState.isDownloading = true;
    downloadState.cancelRequested = false;

    const btn = document.getElementById('downloadAllCitiesBtn');
    btn.disabled = true;

    const progressContainer = document.getElementById('downloadProgressContainer');
    const resultMsg = document.getElementById('downloadResult');
    progressContainer.style.display = 'block';
    resultMsg.style.display = 'none';

    try {
        const cities = appState.cities;
        downloadState.totalChunks = cities.length;
        downloadState.completedChunks = 0;

        const fields = appState.selectedFields.length > 0 ? appState.selectedFields : ["temperature_2m", "relative_humidity_2m", "shortwave_radiation", "wind_speed_10m"];

        for (const city of cities) {
            if (downloadState.cancelRequested) {
                throw new Error('下载已由用户取消');
            }

            updateDownloadProgress(
                `正在下载: ${city.name} (${downloadState.completedChunks + 1}/${cities.length})`,
                (downloadState.completedChunks / downloadState.totalChunks) * 100
            );

            await api.post('/data/batch-download', {
                city_id: city.id,
                start_date: startDateStr,
                end_date: endDateStr,
                fields: fields
            });

            downloadState.completedChunks++;
        }

        updateDownloadProgress('全城市下载完成！', 100);
        showResultMessage('downloadResult', `✓ 成功同步了 ${cities.length} 个城市在指定范围内的数据`, 'success');
        loadDataStatistics();

    } catch (error) {
        showResultMessage('downloadResult', error.message, 'error');
    } finally {
        downloadState.isDownloading = false;
        btn.disabled = false;
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }
}

/**
 * 处理完整性检查
 */
async function handleCheckCompleteness() {
    const cityId = parseInt(document.getElementById('checkCity').value);
    const startDate = document.getElementById('checkStartDate').value;
    const endDate = document.getElementById('checkEndDate').value;

    if (!cityId || !startDate || !endDate) {
        showResultMessage('checkResult', '请填写所有字段', 'error');
        return;
    }

    const btn = document.getElementById('checkCompletenessBtn');
    btn.disabled = true;
    btn.textContent = '检查中...';

    try {
        const response = await api.post('/data/check-completeness', {
            city_id: cityId,
            start_date: startDate,
            end_date: endDate
        });

        if (response.code === 200) {
            displayCompletenessResult(response.data);
        } else {
            showResultMessage('checkResult', response.message, 'error');
        }
    } catch (error) {
        showResultMessage('checkResult', '检查失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
            检查数据完整性
        `;
    }
}

/**
 * 显示完整性检查结果
 */
function displayCompletenessResult(data) {
    const container = document.getElementById('checkResult');
    container.style.display = 'block';

    const rateColor = data.completeness_rate >= 90 ? 'var(--color-success)' :
        data.completeness_rate >= 70 ? 'var(--color-warning)' :
            'var(--color-danger)';

    let html = `
        <div class="completeness-card">
            <div class="completeness-header">
                <h3>${data.city_name} - 数据完整性报告</h3>
                <div class="completeness-rate" style="color: ${rateColor}">
                    ${data.completeness_rate}%
                </div>
            </div>
            
            <div class="completeness-details">
                <div class="detail-item">
                    <div class="detail-label">总天数</div>
                    <div class="detail-value">${data.total_days}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">已有数据</div>
                    <div class="detail-value" style="color: var(--color-success)">${data.existing_days}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">缺失天数</div>
                    <div class="detail-value" style="color: var(--color-danger)">${data.missing_days}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">总记录数</div>
                    <div class="detail-value">${data.total_records}</div>
                </div>
            </div>
    `;

    if (data.missing_days > 0) {
        html += `
            <div class="missing-dates">
                <h4>缺失日期范围:</h4>
                ${data.missing_ranges.map(range =>
            `<span class="date-range">${range.start} 至 ${range.end} (${range.days}天)</span>`
        ).join('')}
            </div>
        `;
    } else {
        html += `
            <div style="text-align: center; padding: var(--spacing-md); color: var(--color-success);">
                ✓ 数据完整，无缺失日期
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * 加载数据统计
 */
async function loadDataStatistics() {
    const container = document.getElementById('statsResult');
    container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

    try {
        const response = await api.get('/data/statistics');

        if (response.code === 200) {
            displayDataStatistics(response.data);
        } else {
            container.innerHTML = `<div class="result-message error">${response.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="result-message error">加载失败: ${error.message}</div>`;
    }
}

/**
 * 显示数据统计
 */
function displayDataStatistics(data) {
    const container = document.getElementById('statsResult');

    if (!data.city_statistics || data.city_statistics.length === 0) {
        container.innerHTML = '<div class="result-message">暂无数据统计</div>';
        return;
    }

    const html = data.city_statistics.map(city => {
        const hasData = city.record_count > 0;

        return `
            <div class="city-stat-card">
                <div class="city-stat-header">${city.city_name}</div>
                <div class="city-stat-info">
                    ${hasData ? `
                        <div><strong>记录数:</strong> ${city.record_count.toLocaleString()} 条</div>
                        <div><strong>最早日期:</strong> ${city.earliest_date}</div>
                        <div><strong>最新日期:</strong> ${city.latest_date}</div>
                    ` : `
                        <div class="no-data">暂无数据</div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: var(--spacing-md); background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: var(--spacing-md);">
            <h3 style="margin-bottom: var(--spacing-sm);">总体统计</h3>
            <div style="display: flex; gap: var(--spacing-lg);">
                <div><strong>总城市数:</strong> ${data.total_cities}</div>
                <div><strong>总记录数:</strong> ${data.total_records.toLocaleString()} 条</div>
            </div>
        </div>
        ${html}
    `;
}

/**
 * 显示结果消息
 */
function showResultMessage(containerId, message, type = 'success') {
    const container = document.getElementById(containerId);
    container.style.display = 'block';
    container.className = `result-message ${type}`;
    container.textContent = message;
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 等待主应用初始化完成后再初始化数据管理
    setTimeout(initDataManagement, 1000);
});
