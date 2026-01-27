/**
 * 通用工具和共享逻辑
 */

const CommonUtils = {
    /**
     * 渲染城市多选框
     */
    renderCityCheckboxes(containerId, checkboxClass, prefix, includeSelectAll = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (appState.cities.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">列表为空，请先在城市管理中添加</p>';
            return;
        }

        // 添加全选
        if (includeSelectAll) {
            const selectAllId = `selectAll_${prefix}_${containerId}`;
            const selectAllDiv = document.createElement('div');
            // selectAllDiv.id = 'selectAllContainer'; // Remove duplicate ID
            selectAllDiv.className = 'select-all-box'; // Ensure class helps with styling
            selectAllDiv.innerHTML = `
                <input type="checkbox" id="${selectAllId}">
                <label for="${selectAllId}"><strong>全选</strong></label>
            `;
            container.appendChild(selectAllDiv);

            const selectAllCb = selectAllDiv.querySelector('input');
            selectAllCb.addEventListener('change', (e) => {
                const cbs = container.querySelectorAll(`.${checkboxClass}`);
                cbs.forEach(cb => {
                    cb.checked = e.target.checked;
                });
                // 触发更新
                if (containerId === 'citySelect' && typeof updateSelectedCities === 'function') {
                    updateSelectedCities();
                }
            });
        }

        // 渲染城市
        appState.cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'field-checkbox city-checkbox';
            const cbId = `${prefix}_${city.id}_${containerId}`;
            div.innerHTML = `
                <input type="checkbox" id="${cbId}" value="${city.id}" class="${checkboxClass}">
                <label for="${cbId}">${city.name}</label>
            `;
            container.appendChild(div);

            const cb = div.querySelector('input');
            if (containerId === 'citySelect' && typeof updateSelectedCities === 'function') {
                cb.addEventListener('change', updateSelectedCities);
            }
        });
    },

    /**
     * 获取选中的城市ID列表
     */
    getSelectedCityIds(checkboxClass) {
        const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    },

    /**
     * 验证日期范围
     */
    validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return { valid: false, message: '请选择完整的日期范围' };
        }
        if (new Date(startDate) > new Date(endDate)) {
            return { valid: false, message: '开始日期不能晚于结束日期' };
        }
        return { valid: true };
    },

    /**
     * 获取所有可用字段的键值
     */
    getAllFieldKeys() {
        if (typeof appState === 'undefined' || !appState.fields) return [];
        const keys = [];
        for (const category of Object.values(appState.fields)) {
            keys.push(...Object.keys(category));
        }
        return keys;
    }
}

// 导出到全局
window.CommonUtils = CommonUtils;
