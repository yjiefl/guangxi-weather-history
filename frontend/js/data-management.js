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
async function initDataManagement() {
    // 确保城市列表已加载
    if (!appState.cities || appState.cities.length === 0) {
        if (typeof loadCities === 'function') {
            try {
                await loadCities();
            } catch (e) {
                console.error("数据管理模块加载城市失败:", e);
            }
        }
    }

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
        'exportBulkDataBtn': handleExportBulk,
        'clearAllCitiesBtn': handleClearAllCities,
        'deleteDataBtn': handleDeleteData,
        'previewDeleteBtn': handlePreviewDeleteData
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
    const cancelBtn = document.getElementById('cancelDownloadBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            downloadState.cancelRequested = true;
            showResultMessage('downloadResult', '由于用户请求，下载即将中止...', 'error');
        });
    }

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
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

/**
 * 填充数据管理界面的城市选择器
 */
function populateManagementCities() {
    // 渲染三个地方的城市选择器
    CommonUtils.renderCityCheckboxes('downloadCitySelect', 'dl-city-checkbox', 'dl', true);
    CommonUtils.renderCityCheckboxes('checkCitySelect', 'chk-city-checkbox', 'chk', true);
    CommonUtils.renderCityCheckboxes('deleteCitySelect', 'del-city-checkbox', 'del', true);
}

/**
 * 处理批量下载
 */
async function handleBatchDownload() {
    if (downloadState.isDownloading) return;

    const cityIds = CommonUtils.getSelectedCityIds('dl-city-checkbox');
    const startDate = document.getElementById('downloadStartDate').value;
    const endDate = document.getElementById('downloadEndDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (!validation.valid) {
        showResultMessage('downloadResult', validation.message, 'error');
        return;
    }

    if (cityIds.length === 0) {
        showResultMessage('downloadResult', '请至少选择一个城市', 'error');
        return;
    }

    startBatchDownload(cityIds, startDate, endDate);
}

/**
 * 处理下载所有城市
 */
async function handleDownloadAllCities() {
    if (downloadState.isDownloading) return;

    const startDate = document.getElementById('downloadStartDate').value;
    const endDate = document.getElementById('downloadEndDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (!validation.valid) {
        showResultMessage('downloadResult', validation.message, 'error');
        return;
    }

    // 获取所有城市ID
    const allCityIds = appState.cities.map(c => c.id);
    startBatchDownload(allCityIds, startDate, endDate);
}

/**
 * 开始批量下载流程
 */
async function startBatchDownload(cityIds, startDate, endDate) {
    downloadState.isDownloading = true;
    downloadState.cancelRequested = false;
    downloadState.totalChunks = cityIds.length;
    downloadState.completedChunks = 0;

    // 更新UI状态
    document.getElementById('batchDownloadBtn').disabled = true;
    document.getElementById('downloadAllCitiesBtn').disabled = true;
    const progressContainer = document.getElementById('downloadProgressContainer');
    if (progressContainer) progressContainer.style.display = 'block';

    const cancelBtn = document.getElementById('cancelDownloadBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    showResultMessage('downloadResult', '准备开始下载...', 'info');

    // 执行下载循环
    for (const cityId of cityIds) {
        if (downloadState.cancelRequested) {
            showResultMessage('downloadResult', '下载已中止', 'warning');
            break;
        }

        const city = appState.cities.find(c => c.id === cityId);
        const cityName = city ? city.name : `ID:${cityId}`;

        updateProgress(cityName);

        try {
            const response = await api.batchDownload({
                city_id: cityId,
                start_date: startDate,
                end_date: endDate
            });

            if (response.code !== 200 && response.code !== 201) { // 201 is sometimes used for "created"
                console.warn(`城市 ${cityName} 下载可能有问题: ${response.message}`);
            }

        } catch (error) {
            console.error(`下载 ${cityName} 失败:`, error);
            showResultMessage('downloadResult', `下载 ${cityName} 失败: ${error.message}`, 'error');
            // 继续下一个
        }

        downloadState.completedChunks++;
    }

    // 完成后的清理
    downloadState.isDownloading = false;
    document.getElementById('batchDownloadBtn').disabled = false;
    document.getElementById('downloadAllCitiesBtn').disabled = false;

    // 延迟隐藏进度条
    setTimeout(() => {
        const progressContainer = document.getElementById('downloadProgressContainer');
        if (progressContainer) progressContainer.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';

        if (!downloadState.cancelRequested) {
            showResultMessage('downloadResult', '批量下载任务完成！', 'success');
        }

        // 刷新统计
        loadDataStatistics();
    }, 1000);
}

/**
 * 更新进度条
 */
function updateProgress(currentCityName) {
    const container = document.getElementById('downloadProgressContainer');
    if (!container) return;

    const progressBar = container.querySelector('.progress-bar-fill');
    const statusText = container.querySelector('.progress-status');
    const percentText = container.querySelector('.progress-percentage');

    const percent = Math.round((downloadState.completedChunks / downloadState.totalChunks) * 100);

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (statusText) statusText.textContent = `正在下载: ${currentCityName} (${downloadState.completedChunks + 1}/${downloadState.totalChunks})`;
}

/**
 * 处理完整性检查
 */
async function handleCheckCompleteness() {
    const cityIds = CommonUtils.getSelectedCityIds('chk-city-checkbox');
    const startDate = document.getElementById('checkStartDate').value;
    const endDate = document.getElementById('checkEndDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (!validation.valid) {
        showResultMessage('checkResult', validation.message, 'error');
        return;
    }

    if (cityIds.length === 0) {
        showResultMessage('checkResult', '请至少选择一个城市', 'error');
        return;
    }

    const resultDiv = document.getElementById('checkResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="text-align:center">正在检查数据完整性...</div>';
    document.getElementById('checkCompletenessBtn').disabled = true;

    try {
        let resultsHtml = '';

        // 串行检查
        for (const cityId of cityIds) {
            const city = appState.cities.find(c => c.id === cityId);
            const cityName = city ? city.name : cityId;

            try {
                const response = await api.checkCompleteness({
                    city_id: cityId,
                    start_date: startDate,
                    end_date: endDate
                });

                const data = response.data;
                const statusClass = data.missing_count === 0 ? 'status-complete' : 'status-missing';
                const statusText = data.missing_count === 0 ? '数据完整' : `缺失 ${data.missing_count} 小时`;

                resultsHtml += `
                    <div class="completeness-item">
                        <div class="city-name">${cityName}</div>
                        <div class="completeness-status ${statusClass}">
                            ${statusText} (总计: ${data.total_hours}小时)
                        </div>
                    </div>
                `;
            } catch (e) {
                resultsHtml += `
                    <div class="completeness-item">
                        <div class="city-name">${cityName}</div>
                        <div class="completeness-status status-missing">检查失败: ${e.message}</div>
                    </div>
                `;
            }
        }

        resultDiv.innerHTML = resultsHtml;

    } catch (error) {
        showResultMessage('checkResult', '检查失败: ' + error.message, 'error');
    } finally {
        document.getElementById('checkCompletenessBtn').disabled = false;
    }
}

/**
 * 加载数据统计
 */
async function loadDataStatistics() {
    const resultDiv = document.getElementById('statsResult');
    resultDiv.innerHTML = '加载统计中...';

    try {
        const response = await api.getStats();
        const stats = response.data;

        resultDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-label">管理城市</div>
                </div>
                <div class="stat-value">${stats.total_cities}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-label">API 响应缓存</div>
                </div>
                <div class="stat-value">${stats.cache_stats.total} <span class="stat-unit">条记录</span></div>
                <div class="stat-details">
                    <span>有效: ${stats.cache_stats.valid}</span>
                    <span>过期: ${stats.cache_stats.expired}</span>
                </div>
            </div>
        `;

    } catch (error) {
        resultDiv.innerHTML = `<div style="color:red">获取统计失败: ${error.message}</div>`;
    }
}

/**
 * 处理批量导出
 */
async function handleExportBulk() {
    const cityIds = CommonUtils.getSelectedCityIds('dl-city-checkbox'); // 复用下载的选择
    const startDate = document.getElementById('downloadStartDate').value;
    const endDate = document.getElementById('downloadEndDate').value;

    if (cityIds.length === 0) {
        showResultMessage('downloadResult', '请选择要导出的城市', 'error');
        return;
    }

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (!validation.valid) {
        showResultMessage('downloadResult', validation.message, 'error');
        return;
    }

    showResultMessage('downloadResult', '准备导出数据，请稍候...', 'info');

    try {
        await api.exportBulkData({
            city_ids: cityIds,
            start_date: startDate,
            end_date: endDate,
            format: 'excel'
        });
        showResultMessage('downloadResult', '导出文件已开始下载', 'success');
    } catch (error) {
        showResultMessage('downloadResult', '导出失败: ' + error.message, 'error');
    }
}

/**
 * 加载已管理城市列表（城市管理标签页）
 */
async function loadManagedCities() {
    const listContainer = document.getElementById('managedCityList');
    listContainer.innerHTML = '<p style="color: var(--text-muted);">正在加载...</p>';

    // 强制重新获取一次最新列表
    try {
        await loadCities();
    } catch (e) {
        console.error("刷新城市列表失败", e);
    }

    renderManagedCities();
}

/**
 * 渲染城市管理列表
 */
function renderManagedCities() {
    const listContainer = document.getElementById('managedCityList');
    listContainer.innerHTML = '';

    const cities = appState.cities;

    if (cities.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">列表为空，请搜索并添加城市</p>';
        return;
    }

    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'managed-city-item';
        item.innerHTML = `
            <div>
                <div class="city-name">${city.name}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${city.region}</div>
            </div>
            <button class="btn btn-tiny btn-danger" onclick="handleRemoveCity(${city.id})">删除</button>
        `;
        listContainer.appendChild(item);
    });
}

/**
 * 处理城市搜索
 */
async function handleCitySearch() {
    const input = document.getElementById('citySearchInput');
    const query = input.value.trim();
    const resultBox = document.getElementById('citySearchResults');

    if (!query) {
        alert('请输入搜索关键词');
        return;
    }

    input.disabled = true;
    resultBox.style.display = 'block';
    resultBox.innerHTML = '搜索中...';

    try {
        const res = await api.searchCities(query);
        renderSearchResults(res.data);
    } catch (error) {
        resultBox.innerHTML = `<div style="color:red">搜索失败: ${error.message}</div>`;
    } finally {
        input.disabled = false;
    }
}

/**
 * 渲染搜索结果
 */
function renderSearchResults(results) {
    const resultBox = document.getElementById('citySearchResults');
    resultBox.innerHTML = '';

    if (results.length === 0) {
        resultBox.innerHTML = '<div style="padding:10px; text-align:center">未找到匹配城市</div>';
        return;
    }

    results.forEach(city => {
        const div = document.createElement('div');
        div.className = 'search-result-item';

        // 检查是否已添加
        const isAdded = appState.cities.some(c => c.name === city.name);

        div.innerHTML = `
            <div>
                <div class="result-name">${city.name}</div>
                <div class="result-region">${city.region || city.country}</div>
            </div>
            <button class="btn btn-tiny ${isAdded ? 'btn-secondary' : 'btn-primary'}" 
                onclick="handleAddCity('${city.name}', ${city.longitude}, ${city.latitude}, '${city.region || '广西'}')"
                ${isAdded ? 'disabled' : ''}>
                ${isAdded ? '已添加' : '添加'}
            </button>
        `;
        resultBox.appendChild(div);
    });
}

/**
 * 处理添加城市
 */
async function handleAddCity(name, lng, lat, region) {
    try {
        await api.addCity({
            name: name,
            longitude: lng,
            latitude: lat,
            region: region
        });

        // 刷新列表
        await loadManagedCities();
        // 刷新其他界面的选择器
        populateManagementCities();

        // 清空搜索结果
        document.getElementById('citySearchResults').style.display = 'none';
        document.getElementById('citySearchInput').value = '';

    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}

/**
 * 处理移除城市
 */
async function handleRemoveCity(cityId) {
    if (!confirm('确定要移除这个城市吗？(历史数据不会被删除)')) return;

    try {
        await api.removeCity(cityId);
        await loadManagedCities();
        populateManagementCities();
    } catch (error) {
        alert('移除失败: ' + error.message);
    }
}

/**
 * 处理清空所有城市
 */
async function handleClearAllCities() {
    if (!confirm('确定要清空所有管理城市吗？这不会删除历史气象数据，只是清空列表。')) return;

    try {
        await api.clearCities();
        await loadManagedCities();
        populateManagementCities();
    } catch (error) {
        alert('清空失败: ' + error.message);
    }
}

/**
 * 显示结果消息
 */
function showResultMessage(elementId, message, type = 'info') {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    el.className = `result-message ${type}`; // assuming result-message class exists in CSS
    el.textContent = message;

    // 3秒后自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }
}

/**
 * 处理预览删除数据
 */
async function handlePreviewDeleteData() {
    const cityIds = CommonUtils.getSelectedCityIds('del-city-checkbox');
    const startDate = document.getElementById('deleteStartDate').value;
    const endDate = document.getElementById('deleteEndDate').value;
    const resultBox = document.getElementById('deletePreviewResult');

    const targetCityIds = cityIds.length > 0 ? cityIds : appState.cities.map(c => c.id);

    if (targetCityIds.length === 0) {
        showResultMessage('deleteResult', '没有可操作的城市', 'error');
        return;
    }

    const btn = document.getElementById('previewDeleteBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '扫描统计中...';
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center;">正在分析数据分布...</div>';

    try {
        let totalCount = 0;
        let totalSizeMB = 0;
        let detailsHtml = '';

        for (const cityId of targetCityIds) {
            try {
                const res = await api.previewDeleteData({
                    city_id: cityId,
                    start_date: startDate,
                    end_date: endDate
                });

                if (res.code === 200 && res.data.count > 0) {
                    totalCount += res.data.count;
                    totalSizeMB += res.data.estimated_size_mb;

                    detailsHtml += `
                        <div style="border-bottom: 1px solid rgba(0,0,0,0.05); padding: 8px 0; font-size: 0.9em;">
                            <strong>${res.data.city_name}</strong>: 
                            ${res.data.count} 条记录 
                            <span style="color: var(--text-secondary);">(${res.data.estimated_size_mb} MB)</span>
                            <br>
                            <span style="font-size: 0.85em; color: var(--text-muted);">
                                范围: ${res.data.start_date || '-'} 至 ${res.data.end_date || '-'}
                            </span>
                        </div>
                    `;
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (totalCount === 0) {
            resultBox.innerHTML = `
                <div style="padding: 10px; color: var(--text-secondary); text-align: center;">
                    在指定范围内未找到任何数据 (无需删除)
                </div>
            `;
        } else {
            resultBox.innerHTML = `
                <div style="margin-bottom: 12px; font-weight: 600; color: var(--text-primary);">
                    扫描结果汇总:
                </div>
                <div style="display: flex; gap: 20px; margin-bottom: 15px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
                     <div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">总记录数</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--color-danger);">${totalCount}</div>
                     </div>
                     <div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">预计释放空间</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--color-primary);">${totalSizeMB.toFixed(2)} MB</div>
                     </div>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${detailsHtml}
                </div>
            `;
        }

    } catch (error) {
        resultBox.innerHTML = `<div style="color: var(--color-danger);">扫描失败: ${error.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * 处理删除天气数据
 */
async function handleDeleteData() {
    const cityIds = CommonUtils.getSelectedCityIds('del-city-checkbox');
    const startDate = document.getElementById('deleteStartDate').value;
    const endDate = document.getElementById('deleteEndDate').value;

    // 如果没有选择城市，默认认为是对所有城市操作吗？前端应该强制用户选择或者明确全选
    // 这里为了安全，如果没选城市，提示选择
    if (cityIds.length === 0) {
        if (!confirm('您未选择特定城市，这将尝试删除所有已选定范围的数据（需配合日期）。是否继续？')) {
            return;
        }
    }

    if (!startDate && !endDate) {
        showResultMessage('deleteResult', '请至少指定开始日期或结束日期，以防止误删全部数据', 'error');
        return;
    }

    const confirmMsg = `确定要删除 ${cityIds.length > 0 ? cityIds.length + ' 个城市' : '所有城市'} 在 ${startDate || '起初'} 至 ${endDate || '至今'} 的数据吗？此操作不可恢复！`;
    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('deleteDataBtn');
    btn.disabled = true;
    btn.innerHTML = '删除中...';

    try {
        let successCount = 0;
        let failCount = 0;

        // 如果未选择城市但指定了日期，可能意图是删除所有城市的该日期段数据
        // 前端简单处理：如果没选城市，就获取所有城市
        const targetCityIds = cityIds.length > 0 ? cityIds : appState.cities.map(c => c.id);

        for (const cityId of targetCityIds) {
            try {
                const res = await api.deleteData({
                    city_id: cityId,
                    start_date: startDate,
                    end_date: endDate
                });
                if (res.code === 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                failCount++;
                console.error(e);
            }
        }

        showResultMessage('deleteResult', `删除完成: ${successCount} 个城市数据已清理` + (failCount > 0 ? `, ${failCount} 个失败` : ''), 'success');

        // 刷新统计
        loadDataStatistics();

    } catch (error) {
        showResultMessage('deleteResult', '删除过程出错: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
            </svg>
            确认删除
        `;
    }
}

// 暴露出这些函数供 onclick 使用
window.handleAddCity = handleAddCity;
window.handleRemoveCity = handleRemoveCity;
window.handleClearAllCities = handleClearAllCities;

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 数据管理模块依赖于 api.js 和 app.js (中的 appState, loadCities)
    // 直接初始化，因为 initDataManagement 内部已经做了 loadCities 的检查
    initDataManagement();
});
