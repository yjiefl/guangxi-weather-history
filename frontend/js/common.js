/**
 * 通用工具和共享逻辑
 */

const CommonUtils = {
    /**
     * 渲染城市多选框
     */
    renderCityCheckboxes(containerId, checkboxClass, prefix) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (appState.cities.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.5);">加载中...</p>';
            return;
        }

        appState.cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'field-checkbox';
            div.innerHTML = `
                <input type="checkbox" id="${prefix}_${city.id}" value="${city.id}" class="${checkboxClass}">
                <label for="${prefix}_${city.id}">${city.name}</label>
            `;
            container.appendChild(div);
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
