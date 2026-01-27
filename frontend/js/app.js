/**
 * 主应用逻辑
 * 处理用户交互和数据展示
 */

const appState = {
    cities: [],
    fields: {},
    currentData: null,
    selectedCities: [],
    selectedFields: [],
    multiCityMode: false,
    filterCity: 'all',
    filterDate: 'all'
};

// Export appState to global scope
window.appState = appState;
window.loadCities = loadCities; // Ensure loadCities is also global

// WMO 天气代码映射
const weatherCodeMap = {
    0: { name: '晴朗', icon: '☀️' },
    1: { name: '晴到多云', icon: '🌤️' },
    2: { name: '多云', icon: '⛅' },
    3: { name: '阴天', icon: '☁️' },
    45: { name: '雾', icon: '🌫️' },
    48: { name: '沉积雾', icon: '🌫️' },
    51: { name: '小毛毛雨', icon: '🌦️' },
    53: { name: '毛毛雨', icon: '🌦️' },
    55: { name: '大毛毛雨', icon: '🌦️' },
    61: { name: '小雨', icon: '🌧️' },
    63: { name: '中雨', icon: '🌧️' },
    65: { name: '大雨', icon: '🌧️' },
    71: { name: '小雪', icon: '🌨️' },
    73: { name: '中雪', icon: '🌨️' },
    75: { name: '大雪', icon: '🌨️' },
    80: { name: '阵雨', icon: '🌦️' },
    81: { name: '中阵雨', icon: '🌦️' },
    82: { name: '大阵雨', icon: '🌧️' },
    95: { name: '雷阵雨', icon: '⛈️' },
};

/**
 * 初始化应用
 */
async function initApp() {
    console.log('初始化应用...');

    try {
        // 加载城市列表
        await loadCities();

        // 加载字段列表
        await loadFields();

        // 绑定事件
        bindEvents();

        // 启动健康检查
        startHealthCheck();

        // 初始化日期限制
        initDateConstraints();

        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        showError('应用初始化失败，请刷新页面重试');
    }
}

/**
 * 加载城市列表
 */
async function loadCities() {
    try {
        const response = await api.getCities();
        appState.cities = response.data;

        // 统一渲染逻辑 (Item 4)
        CommonUtils.renderCityCheckboxes('citySelect', 'city-checkbox-input', 'city', true);

        console.log(`加载了 ${appState.cities.length} 个城市`);
    } catch (error) {
        console.error('加载城市列表失败:', error);
        throw error;
    }
}

/**
 * 更新选中的城市列表
 */
function updateSelectedCities() {
    appState.selectedCities = CommonUtils.getSelectedCityIds('city-checkbox-input');
    appState.multiCityMode = appState.selectedCities.length > 1;

    // 更新UI提示
    const cityCount = appState.selectedCities.length;
    const queryBtn = document.getElementById('queryBtn');
    if (cityCount > 0) {
        queryBtn.textContent = cityCount > 1 ? `查询并对比 ${cityCount} 个城市` : '查询数据';
    } else {
        queryBtn.textContent = '查询数据';
    }

    console.log(`已选择 ${cityCount} 个城市:`, appState.selectedCities);
}

/**
 * 加载字段列表
 */
async function loadFields() {
    try {
        const response = await api.getFields();
        appState.fields = response.data.available_fields;
        const defaultFields = response.data.default_fields;

        const fieldSelector = document.getElementById('fieldSelector');
        fieldSelector.innerHTML = '';

        // 按类别组织字段
        Object.entries(appState.fields).forEach(([category, fields]) => {
            Object.entries(fields).forEach(([fieldKey, fieldInfo]) => {
                const isDefault = defaultFields.includes(fieldKey);

                const div = document.createElement('div');
                div.className = 'field-checkbox';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `field_${fieldKey}`;
                checkbox.value = fieldKey;
                checkbox.checked = isDefault;

                const label = document.createElement('label');
                label.htmlFor = `field_${fieldKey}`;
                label.textContent = `${fieldInfo.name} (${fieldInfo.unit})`;

                div.appendChild(checkbox);
                div.appendChild(label);
                fieldSelector.appendChild(div);

                if (isDefault) {
                    appState.selectedFields.push(fieldKey);
                }
            });
        });

        console.log(`加载了字段列表，默认选中 ${appState.selectedFields.length} 个字段`);
    } catch (error) {
        console.error('加载字段列表失败:', error);
        throw error;
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 查询按钮
    document.getElementById('queryBtn').addEventListener('click', handleQuery);

    // 导出按钮
    document.getElementById('exportExcelBtn').addEventListener('click', () => handleExport('excel'));
    document.getElementById('exportCsvBtn').addEventListener('click', () => handleExport('csv'));

    // 字段选择
    document.querySelectorAll('#fieldSelector input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleFieldChange);
    });

    // 快捷日期按钮
    document.querySelectorAll('.quick-dates button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const days = parseInt(e.target.dataset.days);
            setQuickDate(days);
        });
    });

    // 导航栏主标签切换
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.dataset.mainTab;
            handleMainTabSwitch(tabName);
        });
    });

    // 导航栏点击效果
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function () {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 停止服务按钮 (采用两步式点击，避免弹窗拦截)
    const shutdownBtn = document.getElementById('shutdownBtn');
    let shutdownArmed = false;
    let armedTimer = null;

    if (shutdownBtn) {
        shutdownBtn.onclick = async () => {
            if (!shutdownArmed) {
                // 第一步：激活确认状态
                shutdownArmed = true;
                shutdownBtn.style.transform = 'scale(1.1)';
                shutdownBtn.style.color = '#ff2d55'; // 更亮的红色提示
                shutdownBtn.style.fontWeight = '700';
                shutdownBtn.textContent = '确认退出?';
                shutdownBtn.title = '再次点击确定关闭';

                // 提示文字
                const originalText = document.querySelector('.status-text').textContent;
                document.querySelector('.status-text').textContent = '⚠️ 再次点击确认关闭';
                document.querySelector('.status-text').style.color = '#ff4d4d';

                // 3秒后还原
                armedTimer = setTimeout(() => {
                    shutdownArmed = false;
                    shutdownBtn.style.transform = '';
                    shutdownBtn.style.color = '';
                    shutdownBtn.textContent = '退出';
                    shutdownBtn.title = '停止并关闭后台服务';
                    document.querySelector('.status-text').textContent = originalText;
                    document.querySelector('.status-text').style.color = '';
                }, 3000);
            } else {
                // 第二步：执行关闭
                clearTimeout(armedTimer);
                shutdownBtn.textContent = '正在退出...';
                document.querySelector('.status-dot').className = 'status-dot offline';
                document.querySelector('.status-text').textContent = '正在关机...';

                // 禁用交互
                document.body.style.opacity = '0.5';
                document.body.style.pointerEvents = 'none';

                try {
                    api.shutdown();
                    setTimeout(() => {
                        window.location.reload(); // 重载页面以显示断开连接状态
                    }, 1500);
                } catch (e) {
                    console.log('信号已发出');
                }
            }
        };
    }

    // 筛选器事件
    document.getElementById('cityFilter').addEventListener('change', handleFilterChange);
    document.getElementById('dateFilter').addEventListener('change', handleFilterChange);
    document.getElementById('resetFilterBtn').addEventListener('click', () => {
        document.getElementById('cityFilter').value = 'all';
        document.getElementById('dateFilter').value = 'all';
        handleFilterChange();
    });
}

/**
 * 处理主标签切换
 */
function handleMainTabSwitch(tabName) {
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.mainTab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 更新各面板显示
    document.querySelectorAll('.main-tab-content').forEach(content => {
        if (content.id === `main-tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    console.log(`切换到主标签: ${tabName}`);
}

/**
 * 设置快捷日期
 */
function setQuickDate(days) {
    const end = new Date();
    end.setDate(end.getDate() - 1); // 结束是昨天

    const start = new Date();
    start.setDate(start.getDate() - days);

    document.getElementById('endDate').value = end.toISOString().split('T')[0];
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
}

/**
 * 初始化日期限制 (默认日期为昨天，Item 13 & 16)
 */
function initDateConstraints() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const maxDate = yesterday.toISOString().split('T')[0];

    // 获取所有日期输入框
    const dateInputs = [
        'startDate', 'endDate',
        'downloadStartDate', 'downloadEndDate',
        'checkStartDate', 'checkEndDate'
    ];

    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('max', maxDate);
            // 默认值设为昨天 (Item 13)
            if (!el.value || el.value > maxDate) {
                el.value = maxDate;
            }
        }
    });
}

/**
 * 启动健康检查
 */
function startHealthCheck() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const queryBtn = document.getElementById('queryBtn');
    const exportBtns = [document.getElementById('exportExcelBtn'), document.getElementById('exportCsvBtn')];

    const check = async () => {
        const isOnline = await api.ping();
        if (isOnline) {
            statusDot.className = 'status-dot online';
            statusText.textContent = '后端连接正常';
            if (queryBtn) queryBtn.disabled = false;
            exportBtns.forEach(btn => { if (btn) btn.disabled = false; });
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = '连接已断开';
            if (queryBtn) queryBtn.disabled = true;
            exportBtns.forEach(btn => { if (btn) btn.disabled = true; });
        }
    };

    // 初始检查
    check();
    // 每3秒检查一次
    setInterval(check, 3000);
}

/**
 * 处理字段选择变化
 */
function handleFieldChange(event) {
    const fieldKey = event.target.value;

    if (event.target.checked) {
        if (!appState.selectedFields.includes(fieldKey)) {
            appState.selectedFields.push(fieldKey);
        }
    } else {
        appState.selectedFields = appState.selectedFields.filter(f => f !== fieldKey);
    }
}

/**
 * 处理查询
 */
async function handleQuery() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const validation = CommonUtils.validateDateRange(startDate, endDate);
    if (appState.selectedCities.length === 0) {
        showError('请至少选择一个城市');
        return;
    }

    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    if (appState.selectedFields.length === 0) {
        showError('请至少选择一个数据字段');
        return;
    }

    // 显示加载状态
    showLoading(true);
    hideDataDisplay();

    try {
        if (appState.multiCityMode) {
            // 多城市对比模式
            const response = await api.compareCities({
                city_ids: appState.selectedCities,
                start_date: startDate,
                end_date: endDate,
                fields: appState.selectedFields
            });

            appState.currentData = response.data;

            // 显示对比数据
            displayComparisonData(response.data);
        } else {
            // 单城市模式
            const cityId = appState.selectedCities[0];
            const response = await api.queryWeather({
                city_id: cityId,
                start_date: startDate,
                end_date: endDate,
                fields: appState.selectedFields
            });

            appState.currentData = response.data;

            const cityName = response.data.city_name || (appState.cities.find(c => c.id == cityId)?.name || '');
            displayData(response.data, cityName);
        }

        // 启用导出按钮
        document.getElementById('exportExcelBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;

        // 初始化筛选器
        populateFilters();

        console.log(`查询成功`);
    } catch (error) {
        console.error('查询失败:', error);
        showError('查询失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * 处理导出
 */
async function handleExport(format) {
    if (!appState.currentData) {
        showError('没有可导出的数据');
        return;
    }

    const cityId = appState.selectedCities[0]; // 修复：使用选中列表中的第一个
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!cityId) {
        showError('请先查询数据后再尝试导出');
        return;
    }

    try {
        await api.exportWeather({
            city_id: cityId,
            start_date: startDate,
            end_date: endDate,
            fields: appState.selectedFields
        }, format);

        console.log(`导出${format.toUpperCase()}成功`);
    } catch (error) {
        console.error('导出失败:', error);
        showError('导出失败: ' + error.message);
    }
}

/**
 * 显示数据
 */
function displayData(data, cityName = '') {
    // 如果没有传入 cityName，尝试从 data 对象中获取 (Item 30)
    if (!cityName && data && data.city_name) {
        cityName = data.city_name;
    }

    // 处理过滤后的数据
    const filteredRecords = applyLocalFilters(data.records);

    // 显示统计卡片
    displayStatsCards(data.summary);

    // 显示图表
    displayCharts(filteredRecords, cityName);

    // 显示数据表格
    displayDataTable(filteredRecords);

    // 显示数据展示区
    showDataDisplay();
}

/**
 * 显示统计卡片
 */
function displayStatsCards(summary) {
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = '';

    // 温度统计
    if (summary.temperature) {
        statsCards.appendChild(createStatCard(
            '温度',
            summary.temperature.avg,
            '°C',
            `最高: ${summary.temperature.max}°C, 最低: ${summary.temperature.min}°C`,
            'temperature'
        ));
    }

    // 辐照度统计
    if (summary.solar_radiation) {
        statsCards.appendChild(createStatCard(
            '太阳辐射',
            summary.solar_radiation.avg,
            'W/m²',
            `总计: ${summary.solar_radiation.total_mj.toFixed(2)} MJ/m²`,
            'radiation'
        ));
    }

    // 风速统计
    if (summary.wind_speed) {
        statsCards.appendChild(createStatCard(
            '风速',
            (summary.wind_speed.avg / 3.6).toFixed(2),
            'm/s',
            `最大: ${(summary.wind_speed.max / 3.6).toFixed(2)} m/s`,
            'wind'
        ));
    }

    // 降水统计
    if (summary.precipitation) {
        statsCards.appendChild(createStatCard(
            '降水量',
            summary.precipitation.total,
            'mm',
            `降雨时数: ${summary.precipitation.rainy_hours}小时`,
            'precipitation'
        ));
    }

    // 天气情况统计
    if (summary.weather) {
        const code = summary.weather.most_frequent;
        const weatherInfo = weatherCodeMap[code] || { name: `代码 ${code}`, icon: '❓' };
        statsCards.appendChild(createStatCard(
            '主要天气',
            weatherInfo.name,
            '',
            `最频繁出现的状态`,
            'weather',
            weatherInfo.icon
        ));
    }
}

/**
 * 创建统计卡片
 */
function createStatCard(label, value, unit, details, iconType, customIcon) {
    const card = document.createElement('div');
    card.className = 'stat-card';

    const displayValue = typeof value === 'number' ? value.toFixed(2) : value;

    card.innerHTML = `
        <div class="stat-card-header">
            <div class="stat-icon ${iconType}">
                ${customIcon || getIconSVG(iconType)}
            </div>
            <div class="stat-label">${label}</div>
        </div>
        <div class="stat-value">
            ${displayValue}
            <span class="stat-unit">${unit}</span>
        </div>
        <div class="stat-details">${details}</div>
    `;

    return card;
}

/**
 * 获取图标SVG
 */
function getIconSVG(type) {
    const icons = {
        temperature: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.34 2 9 3.34 9 5v6.17C7.83 11.69 7 13.23 7 15c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.77-.83-3.31-2-4.83V5c0-1.66-1.34-3-3-3zm0 16c-1.66 0-3-1.34-3-3 0-1.11.61-2.06 1.5-2.58V5c0-.55.45-1 1-1s1 .45 1 1v7.42c.89.52 1.5 1.47 1.5 2.58 0 1.66-1.34 3-3 3z" fill="currentColor"/></svg>',
        radiation: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" fill="currentColor"/></svg>',
        wind: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5zm-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5v2c1.93 0 3.5-1.57 3.5-3.5S20.43 11 18.5 11z" fill="currentColor"/></svg>',
        precipitation: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.69l5.66 5.66c3.12 3.12 3.12 8.19 0 11.31-1.56 1.56-3.61 2.34-5.66 2.34s-4.1-.78-5.66-2.34c-3.12-3.12-3.12-8.19 0-11.31L12 2.69m0-2.69L4.93 6.93c-3.91 3.91-3.91 10.24 0 14.14C6.88 22.95 9.44 24 12 24s5.12-1.05 7.07-3.03c3.91-3.91 3.91-10.24 0-14.14L12 0z" fill="currentColor"/></svg>'
    };
    return icons[type] || '';
}

/**
 * 显示图表
 */
function displayCharts(records, cityName = '') {
    // 限制数据点数量以提升性能
    const maxPoints = 500;
    const step = Math.ceil(records.length / maxPoints);
    const sampledData = records.filter((_, index) => index % step === 0);

    // 更新静态标题 (Item 30)
    updateChartTitles(cityName);

    chartManager.createTemperatureChart('temperatureChart', sampledData, cityName);
    chartManager.createRadiationChart('radiationChart', sampledData, cityName);
    chartManager.createWindSpeedChart('windSpeedChart', sampledData, cityName);
    chartManager.createPrecipitationChart('precipitationChart', sampledData, cityName);
}

/**
 * 更新图表区的静态标题
 */
function updateChartTitles(cityName) {
    const titles = {
        'temperatureChart': '温度趋势',
        'radiationChart': '辐照度分布',
        'windSpeedChart': '风速变化',
        'precipitationChart': '降水量'
    };

    Object.entries(titles).forEach(([id, baseTitle]) => {
        const chartCard = document.getElementById(id)?.closest('.chart-card');
        if (chartCard) {
            const titleElem = chartCard.querySelector('.chart-title');
            if (titleElem) {
                titleElem.textContent = cityName ? `${baseTitle} - ${cityName}` : baseTitle;
            }
        }
    });
}

/**
 * 显示数据表格
 */
function displayDataTable(records) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // 清空表格
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (records.length === 0) {
        return;
    }

    // 创建表头
    const headerRow = document.createElement('tr');
    const keys = Object.keys(records[0]);

    keys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = getFieldLabel(key);
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    // 创建表格行（限制显示前100条）
    const displayRecords = records.slice(0, 100);

    displayRecords.forEach(record => {
        const row = document.createElement('tr');

        keys.forEach(key => {
            const td = document.createElement('td');
            let value = record[key];

            if (value === null || value === undefined) {
                td.textContent = '-';
            } else if (key === 'weather_code') {
                const weatherInfo = weatherCodeMap[Math.floor(value)] || { name: `代码 ${value}`, icon: '' };
                td.textContent = `${weatherInfo.icon} ${weatherInfo.name}`;
            } else if (typeof value === 'number') {
                td.textContent = value.toFixed(2);
            } else {
                td.textContent = value;
            }

            row.appendChild(td);
        });

        tableBody.appendChild(row);
    });

    if (records.length > 100) {
        const noteRow = document.createElement('tr');
        const noteCell = document.createElement('td');
        noteCell.colSpan = keys.length;
        noteCell.style.textAlign = 'center';
        noteCell.style.fontStyle = 'italic';
        noteCell.textContent = `显示前100条记录，共${records.length}条记录。请导出查看完整数据。`;
        noteRow.appendChild(noteCell);
        tableBody.appendChild(noteRow);
    }
}


/**
 * 获取字段标签
 */
function getFieldLabel(fieldKey) {
    for (const category of Object.values(appState.fields)) {
        if (category[fieldKey]) {
            return `${category[fieldKey].name} (${category[fieldKey].unit})`;
        }
    }
    return fieldKey;
}

/**
 * 显示/隐藏加载状态
 */
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * 显示/隐藏数据展示区
 */
function showDataDisplay() {
    document.getElementById('dataDisplay').style.display = 'block';
}

function hideDataDisplay() {
    document.getElementById('dataDisplay').style.display = 'none';
}

/**
 * 显示错误消息
 */
function showError(message) {
    alert(message);
}

function displayComparisonData(data) {
    console.log('显示对比数据:', data);

    // 显示对比统计卡片
    displayComparisonStats(data.comparison);

    // 显示对比表格
    displayComparisonTable(data.details);

    // 处理过滤
    const filteredDetails = applyComparisonFilters(data.details);
    if (filteredDetails.length === 1) {
        // 如果只过滤出一个城市，则显示该城市的详细趋势
        displayCharts(filteredDetails[0].hourly_data, filteredDetails[0].city_name);
    } else {
        // 否则显示对比图表
        displayComparisonCharts(filteredDetails);
    }

    // 显示数据展示区
    showDataDisplay();
}

function displayComparisonStats(comparison) {
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = '';

    // 计算城市数量
    const cityCount = Object.keys(comparison).length;

    // 添加核心分析说明卡片
    const headerCard = document.createElement('div');
    headerCard.className = 'stat-card comparison-header-card';
    headerCard.style.gridColumn = '1 / -1';
    headerCard.innerHTML = `
        <div class="stat-card-header">
            <div class="stat-label"><strong>多城市对比分析</strong></div>
        </div>
        <div class="stat-details">正在对比 ${cityCount} 个城市的天气数据</div>
    `;
    statsCards.appendChild(headerCard);

    // 为每个城市创建一个独立的行（容器）
    Object.entries(comparison).forEach(([cityName, summary]) => {
        // 创建城市标题分隔符
        const cityTitle = document.createElement('div');
        cityTitle.className = 'city-stats-divider';
        cityTitle.style.gridColumn = '1 / -1';
        cityTitle.innerHTML = `<span>${cityName}</span>`;
        statsCards.appendChild(cityTitle);

        if (summary.temperature) {
            statsCards.appendChild(createStatCard(
                '平均温度',
                summary.temperature.avg,
                '°C',
                `最高: ${summary.temperature.max}°C, 最低: ${summary.temperature.min}°C`,
                'temperature'
            ));
        }

        if (summary.solar_radiation) {
            statsCards.appendChild(createStatCard(
                '太阳辐射',
                summary.solar_radiation.avg,
                'W/m²',
                `总计: ${summary.solar_radiation.total_mj.toFixed(2)} MJ/m²`,
                'radiation'
            ));
        }

        if (summary.wind_speed) {
            statsCards.appendChild(createStatCard(
                '风速',
                (summary.wind_speed.avg / 3.6).toFixed(2),
                'm/s',
                `最大: ${(summary.wind_speed.max / 3.6).toFixed(2)} m/s`,
                'wind'
            ));
        }

        if (summary.precipitation) {
            statsCards.appendChild(createStatCard(
                '降水量',
                summary.precipitation.total,
                'mm',
                `降雨时间: ${summary.precipitation.rainy_hours}小时`,
                'precipitation'
            ));
        }

        if (summary.weather) {
            const code = summary.weather.most_frequent;
            const weatherInfo = weatherCodeMap[code] || { name: `代码 ${code}`, icon: '❓' };
            statsCards.appendChild(createStatCard(
                '主要天气',
                weatherInfo.name,
                '',
                `总体天气状态`,
                'weather',
                weatherInfo.icon
            ));
        }
    });
}

/**
 * 显示对比图表
 */
function displayComparisonCharts(details) {
    // 准备对比数据
    const citiesData = details.map(city => ({
        name: city.city_name,
        data: city.hourly_data
    }));

    // 更新静态标题 (Item 30)
    updateChartTitles('多城市对比');

    // 创建对比图表
    chartManager.createComparisonChart('temperatureChart', citiesData, 'temperature_2m', '温度对比');
    chartManager.createComparisonChart('radiationChart', citiesData, 'shortwave_radiation', '辐照度对比');
    chartManager.createComparisonChart('windSpeedChart', citiesData, 'wind_speed_10m', '风速对比');
    chartManager.createComparisonChart('precipitationChart', citiesData, 'precipitation', '降水量对比');
}

/**
 * 显示对比表格
 */
function displayComparisonTable(details) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (details.length === 0) {
        return;
    }

    // 创建表头
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>城市</th><th>平均温度</th><th>平均辐照度</th><th>平均风速</th><th>总降水量</th>';
    tableHead.appendChild(headerRow);

    // 创建表格行
    details.forEach(city => {
        const row = document.createElement('tr');

        // 计算统计数据
        const summary = data_analyzer.calculateSummary(city.hourly_data);

        row.innerHTML = `
            <td><strong>${city.city_name}</strong></td>
            <td>${summary.temperature ? summary.temperature.avg.toFixed(2) : '-'} °C</td>
            <td>${summary.solar_radiation ? summary.solar_radiation.avg.toFixed(2) : '-'} W/m²</td>
            <td>${summary.wind_speed ? summary.wind_speed.avg.toFixed(2) : '-'} km/h</td>
            <td>${summary.precipitation ? summary.precipitation.total.toFixed(2) : '-'} mm</td>
        `;

        tableBody.appendChild(row);
    });
}

// 简单的数据分析器（用于对比表格）
const data_analyzer = {
    calculateSummary(records) {
        if (!records || records.length === 0) return {};

        const summary = {};

        // 温度统计
        const temps = records.map(r => r.temperature_2m).filter(v => v != null);
        if (temps.length > 0) {
            summary.temperature = {
                avg: temps.reduce((a, b) => a + b, 0) / temps.length,
                max: Math.max(...temps),
                min: Math.min(...temps)
            };
        }

        // 辐照度统计
        const radiation = records.map(r => r.shortwave_radiation).filter(v => v != null);
        if (radiation.length > 0) {
            summary.solar_radiation = {
                avg: radiation.reduce((a, b) => a + b, 0) / radiation.length,
                total: radiation.reduce((a, b) => a + b, 0)
            };
        }

        // 风速统计
        const windSpeed = records.map(r => r.wind_speed_10m).filter(v => v != null);
        if (windSpeed.length > 0) {
            summary.wind_speed = {
                avg: windSpeed.reduce((a, b) => a + b, 0) / windSpeed.length,
                max: Math.max(...windSpeed)
            };
        }

        // 降水统计
        const precip = records.map(r => r.precipitation).filter(v => v != null);
        if (precip.length > 0) {
            summary.precipitation = {
                total: precip.reduce((a, b) => a + b, 0),
                rainy_hours: precip.filter(p => p > 0).length
            };
        }

        return summary;
    }
};

/**
 * 初始化筛选器
 */
function populateFilters() {
    const cityFilter = document.getElementById('cityFilter');
    const dateFilter = document.getElementById('dateFilter');

    // 填充区域/城市
    cityFilter.innerHTML = '<option value="all">所有选定城市</option>';
    if (appState.multiCityMode) {
        appState.selectedCities.forEach(id => {
            const city = appState.cities.find(c => c.id === id);
            if (city) {
                const opt = document.createElement('option');
                opt.value = city.name;
                opt.textContent = city.name;
                cityFilter.appendChild(opt);
            }
        });
    }

    // 填充日期
    dateFilter.innerHTML = '<option value="all">所有日期范围</option>';
    const dates = new Set();
    if (appState.multiCityMode) {
        appState.currentData.details.forEach(city => {
            city.hourly_data.forEach(r => dates.add(r.datetime.split('T')[0]));
        });
    } else {
        appState.currentData.records.forEach(r => dates.add(r.datetime.split('T')[0]));
    }

    Array.from(dates).sort().forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        dateFilter.appendChild(opt);
    });
}

/**
 * 应用本地过滤逻辑
 */
function applyLocalFilters(records) {
    let filtered = [...records];
    if (appState.filterDate !== 'all') {
        filtered = filtered.filter(r => r.datetime.startsWith(appState.filterDate));
    }
    return filtered;
}

/**
 * 应用对比过滤逻辑
 */
function applyComparisonFilters(details) {
    let filtered = [...details];
    if (appState.filterCity !== 'all') {
        filtered = filtered.filter(c => c.city_name === appState.filterCity);
    }
    if (appState.filterDate !== 'all') {
        filtered = filtered.map(c => ({
            ...c,
            hourly_data: c.hourly_data.filter(r => r.datetime.startsWith(appState.filterDate))
        }));
    }
    return filtered;
}

/**
 * 处理过滤变化
 */
function handleFilterChange() {
    appState.filterCity = document.getElementById('cityFilter').value;
    appState.filterDate = document.getElementById('dateFilter').value;

    if (appState.multiCityMode) {
        displayComparisonData(appState.currentData);
    } else {
        displayData(appState.currentData);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
