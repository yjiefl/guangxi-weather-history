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

    // 按钮事件绑定
    const bindings = {
        'batchDownloadBtn': handleBatchDownload,
        'downloadAllCitiesBtn': handleDownloadAllCities,
        'checkCompletenessBtn': handleCheckCompleteness,
        'refreshStatsBtn': loadDataStatistics,
        'exportBulkDataBtn': handleExportBulk
    };

    Object.entries(bindings).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handler);
    });

    // 城市管理相关绑定
    const citySearchBtn = document.getElementById('citySearchBtn');
    if (citySearchBtn) citySearchBtn.addEventListener('click', handleCitySearch);

    const citySearchInput = document.getElementById('citySearchInput');
    if (citySearchInput) {
        citySearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCitySearch();
        });
    }

    // 取消下载按钮
    document.getElementById('cancelDownloadBtn').addEventListener('click', () => {
        downloadState.cancelRequested = true;
        showResultMessage('downloadResult', '由于用户请求，下载即将中止...', 'error');
    });

    // 填充完成、加载统计
    populateManagementCities();
    loadDataStatistics();
    loadManagedCities();

    // 设置默认日期 (Item 18/19: 默认昨天)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    ['downloadStartDate', 'downloadEndDate', 'checkStartDate', 'checkEndDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = dateStr;
    });
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

function populateManagementCities() {
    // 使用 CommonUtils 渲染多选列表
    CommonUtils.renderCityCheckboxes('downloadCitySelect', 'dl-city-checkbox', 'dlCity');
    CommonUtils.renderCityCheckboxes('checkCitySelect', 'check-city-checkbox', 'checkCity');
}

async function handleBatchDownload() {
    const cityIds = CommonUtils.getSelectedCityIds('dl-city-checkbox');
    const startDateStr = document.getElementById('downloadStartDate').value;
    const endDateStr = document.getElementById('downloadEndDate').value;

    const validation = CommonUtils.validateDateRange(startDateStr, endDateStr);
    if (cityIds.length === 0 || !validation.valid) {
        showResultMessage('downloadResult', cityIds.length === 0 ? '请选择至少一个城市' : validation.message, 'error');
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
        const chunks = segmentDatesByMonth(startDateStr, endDateStr);
        downloadState.totalChunks = cityIds.length * chunks.length;
        downloadState.completedChunks = 0;

        // 获取所有可用字段以确保数据完整性 (Item 2)
        const fields = CommonUtils.getAllFieldKeys();

        for (const cityId of cityIds) {
            const city = appState.cities.find(c => c.id === cityId);

            for (const chunk of chunks) {
                if (downloadState.cancelRequested) {
                    throw new Error('下载已由用户取消');
                }

                updateDownloadProgress(
                    `正在下载 ${city.name}: ${chunk.start} 至 ${chunk.end}`,
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
        }

        updateDownloadProgress('下载完成！', 100);
        showResultMessage('downloadResult', `✓ 成功下载并保存了 ${cityIds.length} 个城市的历史数据`, 'success');
        loadDataStatistics();

    } catch (error) {
        showResultMessage('downloadResult', error.message, 'error');
    } finally {
        downloadState.isDownloading = false;
        btn.disabled = false;
        setTimeout(() => {
            if (!downloadState.isDownloading) {
                progressContainer.style.display = 'none';
            }
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

        // 获取所有可用字段以确保数据完整性
        const fields = CommonUtils.getAllFieldKeys();

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
    const cityIds = CommonUtils.getSelectedCityIds('check-city-checkbox');
    const startDate = document.getElementById('checkStartDate').value;
    const endDate = document.getElementById('checkEndDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (cityIds.length === 0 || !validation.valid) {
        showResultMessage('checkResult', cityIds.length === 0 ? '请选择至少一个城市' : validation.message, 'error');
        return;
    }

    const btn = document.getElementById('checkCompletenessBtn');
    btn.disabled = true;
    btn.textContent = '检查中...';

    const resultContainer = document.getElementById('checkResult');
    resultContainer.innerHTML = '<p style="text-align: center;">正在检查，请稍候...</p>';
    resultContainer.style.display = 'block';

    try {
        let allResultsHtml = '';
        for (const cityId of cityIds) {
            const response = await api.post('/data/check-completeness', {
                city_id: cityId,
                start_date: startDate,
                end_date: endDate
            });

            if (response.code === 200) {
                allResultsHtml += generateCompletenessHtml(response.data);
            } else {
                allResultsHtml += `<div class="result-message error">城市ID ${cityId}: ${response.message}</div>`;
            }
        }
        resultContainer.innerHTML = allResultsHtml;
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
 * 生成完整性检查结果HTML
 */
function generateCompletenessHtml(data) {
    const rateColor = data.completeness_rate >= 90 ? 'var(--color-success)' :
        data.completeness_rate >= 70 ? 'var(--color-warning)' :
            'var(--color-danger)';

    let html = `
        <div class="completeness-card" style="margin-bottom: 20px;">
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
    return html;
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
 * 处理批量导出完整数据到本地
 */
async function handleExportBulk() {
    const cityIds = CommonUtils.getSelectedCityIds('dl-city-checkbox');
    const startDate = document.getElementById('downloadStartDate').value;
    const endDate = document.getElementById('downloadEndDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (cityIds.length === 0 || !validation.valid) {
        showResultMessage('downloadResult', cityIds.length === 0 ? '请选择至少一个城市' : validation.message, 'error');
        return;
    }

    const btn = document.getElementById('exportBulkDataBtn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.textContent = '正在导出...';

    try {
        await api.bulkExport({
            city_ids: cityIds,
            start_date: startDate,
            end_date: endDate
        }, 'excel');

        appendResultToDownload('✓ 导出成功，请在浏览器下载管理中查看', 'success');
    } catch (error) {
        showResultMessage('downloadResult', '导出失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function appendResultToDownload(message, type) {
    showResultMessage('downloadResult', message, type);
}

/**
 * 搜索城市
 */
async function handleCitySearch() {
    const input = document.getElementById('citySearchInput');
    const query = input.value.trim();
    if (!query) return;

    const btn = document.getElementById('citySearchBtn');
    const resultsContainer = document.getElementById('citySearchResults');

    btn.disabled = true;
    btn.textContent = '搜索中...';
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<p style="text-align: center; padding: 10px;">正在搜索...</p>';

    try {
        const response = await api.searchCities(query);
        if (response.code === 200 && response.data.length > 0) {
            renderSearchResults(response.data);
        } else {
            resultsContainer.innerHTML = '<p style="text-align: center; padding: 10px;">未找到匹配的城市</p>';
        }
    } catch (error) {
        resultsContainer.innerHTML = `<p style="text-align: center; padding: 10px; color: var(--color-danger);">搜索出错: ${error.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '搜索';
    }
}

/**
 * 渲染搜索结果
 */
function renderSearchResults(results) {
    const container = document.getElementById('citySearchResults');
    container.innerHTML = results.map(city => `
        <div class="search-result-item">
            <div class="result-info">
                <div class="result-name">${city.name}</div>
                <div class="result-region">${city.region}</div>
                <div class="result-coords">${city.longitude.toFixed(2)}, ${city.latitude.toFixed(2)}</div>
            </div>
            <button class="btn btn-tiny btn-primary" onclick="handleAddCity('${city.name}', ${city.longitude}, ${city.latitude}, '${city.region}')">添加</button>
        </div>
    `).join('');
}

/**
 * 添加城市
 */
async function handleAddCity(name, lng, lat, region) {
    try {
        const response = await api.addCity({ name, longitude: lng, latitude: lat, region });
        if (response.code === 200) {
            // 刷新列表
            await loadManagedCities();
            // 刷新主应用的城市列表
            if (typeof loadCities === 'function') await loadCities();
            // 重新填充管理面板的复选框
            populateManagementCities();

            // 清空搜索框
            document.getElementById('citySearchInput').value = '';
            document.getElementById('citySearchResults').style.display = 'none';
        }
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}

/**
 * 加载已管理城市
 */
async function loadManagedCities() {
    const container = document.getElementById('managedCityList');
    if (!container) return;

    try {
        const response = await api.getCities();
        if (response.code === 200) {
            renderManagedCities(response.data);
        }
    } catch (error) {
        console.error('加载城市列表失败:', error);
    }
}

/**
 * 渲染已管理城市
 */
function renderManagedCities(cities) {
    const container = document.getElementById('managedCityList');
    if (cities.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">列表为空，请搜索并添加城市</p>';
        return;
    }

    container.innerHTML = cities.map(city => `
        <div class="managed-city-item">
            <div class="city-info">
                <div class="city-name">${city.name}</div>
                <div class="city-region">${city.region}</div>
            </div>
            <button class="btn btn-tiny btn-danger" onclick="handleRemoveCity(${city.id})">移除</button>
        </div>
    `).join('');
}

/**
 * 移除城市
 */
async function handleRemoveCity(cityId) {
    if (!confirm('确定要从默认列表中移除该城市吗？')) return;

    try {
        const response = await api.removeCity(cityId);
        if (response.code === 200) {
            await loadManagedCities();
            if (typeof loadCities === 'function') await loadCities();
            populateManagementCities();
        }
    } catch (error) {
        alert('移除失败: ' + error.message);
    }
}

// 暴露出这些函数供 onclick 使用
window.handleAddCity = handleAddCity;
window.handleRemoveCity = handleRemoveCity;

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 等待主应用初始化完成后再初始化数据管理
    setTimeout(initDataManagement, 1000);
});
