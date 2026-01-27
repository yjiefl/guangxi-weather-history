/**
 * 主应用逻辑
 * 处理用户交互和数据展示
 */

// 全局状态
const appState = {
    cities: [],
    fields: {},
    currentData: null,
    selectedCities: [],  // 改为数组支持多选
    selectedFields: [],
    multiCityMode: false  // 多城市模式标志
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

        const citySelect = document.getElementById('citySelect');
        citySelect.innerHTML = '';

        // 添加"全选"选项
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'city-checkbox';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="selectAllCities" />
            <label for="selectAllCities"><strong>全选所有城市</strong></label>
        `;
        citySelect.appendChild(selectAllDiv);

        // 添加分隔线
        const separator = document.createElement('div');
        separator.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        separator.style.margin = '8px 0';
        citySelect.appendChild(separator);

        // 添加城市复选框
        appState.cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'city-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `city_${city.id}`;
            checkbox.value = city.id;
            checkbox.className = 'city-checkbox-input';

            const label = document.createElement('label');
            label.htmlFor = `city_${city.id}`;
            label.textContent = `${city.name} (${city.region})`;

            div.appendChild(checkbox);
            div.appendChild(label);
            citySelect.appendChild(div);
        });

        // 绑定全选事件
        document.getElementById('selectAllCities').addEventListener('change', function (e) {
            const checkboxes = document.querySelectorAll('.city-checkbox-input');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateSelectedCities();
        });

        // 绑定城市选择事件
        document.querySelectorAll('.city-checkbox-input').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCities);
        });

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
    const checkboxes = document.querySelectorAll('.city-checkbox-input:checked');
    appState.selectedCities = Array.from(checkboxes).map(cb => parseInt(cb.value));
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

    // 导航栏点击效果
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function () {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 停止服务按钮
    const shutdownBtn = document.getElementById('shutdownBtn');
    if (shutdownBtn) {
        shutdownBtn.addEventListener('click', async () => {
            if (confirm('确定要停止并关闭后台服务吗？关闭后网页将无法操作。')) {
                try {
                    await api.shutdown();
                    alert('关机命令已发送。');
                } catch (e) {
                    alert('关机失败: ' + e.message);
                }
            }
        });
    }
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

    setInterval(async () => {
        const isOnline = await api.ping();
        if (isOnline) {
            statusDot.className = 'status-dot online';
            statusText.textContent = '后端连接正常';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = '连接已断开';
            // 可以选择在这里显示更显眼的错误提示
        }
    }, 5000);
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

    // 验证输入
    if (appState.selectedCities.length === 0) {
        showError('请至少选择一个城市');
        return;
    }

    if (!startDate || !endDate) {
        showError('请选择日期范围');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showError('开始日期不能晚于结束日期');
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

            // 显示数据
            displayData(response.data);
        }

        // 启用导出按钮
        document.getElementById('exportExcelBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;

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
function displayData(data) {
    // 显示统计卡片
    displayStatsCards(data.summary);

    // 显示图表
    displayCharts(data.records);

    // 显示数据表格
    displayDataTable(data.records);

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
            `总计: ${summary.solar_radiation.total_kwh.toFixed(2)} kWh/m²`,
            'radiation'
        ));
    }

    // 风速统计
    if (summary.wind_speed) {
        statsCards.appendChild(createStatCard(
            '风速',
            summary.wind_speed.avg,
            'km/h',
            `最大: ${summary.wind_speed.max} km/h`,
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
}

/**
 * 创建统计卡片
 */
function createStatCard(label, value, unit, details, iconType) {
    const card = document.createElement('div');
    card.className = 'stat-card';

    card.innerHTML = `
        <div class="stat-card-header">
            <div class="stat-icon ${iconType}">
                ${getIconSVG(iconType)}
            </div>
            <div class="stat-label">${label}</div>
        </div>
        <div class="stat-value">
            ${value.toFixed(2)}
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
function displayCharts(records) {
    // 限制数据点数量以提升性能
    const maxPoints = 500;
    const step = Math.ceil(records.length / maxPoints);
    const sampledData = records.filter((_, index) => index % step === 0);

    chartManager.createTemperatureChart('temperatureChart', sampledData);
    chartManager.createRadiationChart('radiationChart', sampledData);
    chartManager.createWindSpeedChart('windSpeedChart', sampledData);
    chartManager.createPrecipitationChart('precipitationChart', sampledData);
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
            const value = record[key];

            if (value === null || value === undefined) {
                td.textContent = '-';
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

/**
 * 显示多城市对比数据
 */
function displayComparisonData(data) {
    console.log('显示对比数据:', data);

    // 显示对比统计卡片
    displayComparisonStats(data.comparison);

    // 显示对比图表
    displayComparisonCharts(data.details);

    // 显示对比表格
    displayComparisonTable(data.details);

    // 显示数据展示区
    showDataDisplay();
}

/**
 * 显示对比统计卡片
 */
function displayComparisonStats(comparison) {
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = '';

    // 添加对比说明
    const headerCard = document.createElement('div');
    headerCard.className = 'stat-card';
    headerCard.style.gridColumn = '1 / -1';
    headerCard.innerHTML = `
        <div class="stat-card-header">
            <div class="stat-label"><strong>多城市对比分析</strong></div>
        </div>
        <div class="stat-details">正在对比 ${comparison.city_count} 个城市的天气数据</div>
    `;
    statsCards.appendChild(headerCard);

    // 显示各城市的平均温度对比
    if (comparison.temperature) {
        Object.entries(comparison.temperature).forEach(([cityName, temp]) => {
            statsCards.appendChild(createStatCard(
                `${cityName} - 平均温度`,
                temp.avg,
                '°C',
                `最高: ${temp.max}°C, 最低: ${temp.min}°C`,
                'temperature'
            ));
        });
    }
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
