// 工具函数模块

// 安全获取对象属性值
function safeGetValue(obj, keys, defaultValue = '') {
    if (!obj) return defaultValue;
    
    for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (obj[key] !== null && obj[key] !== undefined) {
            return String(obj[key]);
        }
    }
    return defaultValue;
}

// 安全转换为小写
function safeToLower(value) {
    if (value === null || value === undefined) return '';
    return String(value).toLowerCase();
}

// 图标映射
const sheetIcons = {
    '01': 'fas fa-gas-pump',
    '02': 'fas fa-oil-can',
    '03': 'fas fa-database',
    '04': 'fas fa-coil',
    '05': 'fas fa-cog',
    '06': 'fas fa-oil-can',
    '07': 'fas fa-gas-pump',
    '08': 'fas fa-link',
    '09': 'fas fa-gas-pump',
    '10': 'fas fa-engine',
    '11': 'fas fa-cut',
    '12': 'fas fa-cogs',
    '13': 'fas fa-tire',
    '14': 'fas fa-layer-group',
    '15': 'fas fa-volume-mute',
    '16': 'fas fa-bolt',
    '17': 'fas fa-snowflake',
    '18': 'fas fa-tools',
    '19': 'fas fa-bolt',
    '20': 'fas fa-sliders-h',
    '21': 'fas fa-wind',
    '22': 'fas fa-cut',
    '23': 'fas fa-spray-can',
    '24': 'fas fa-toolbox',
    '25': 'fas fa-wind',
    '26': 'fas fa-filter',
    '27': 'fas fa-hard-hat',
    '28': 'fas fa-cut',
    '29': 'fas fa-gas-pump',
    '30': 'fas fa-tint',
    '31': 'fas fa-question-circle',
    '32': 'fas fa-history',
    '33': 'fas fa-cable-car'
};

const defaultIcon = 'fas fa-table';

// 页面状态管理
const state = {
    currentLanguage: localStorage.getItem('product_language') || 'en-US',
    jsonData: null,
    sheetNames: [],
    productsBySheet: {},
    allProducts: [],
    selectedSheet: null,
    selectedProduct: null,
    currentView: 'sheets',
    searchTerm: '',
    filteredProducts: [],
    isSearchMode: false,
    loadedImages: {},
    pagination: {
        currentPage: 1,
        itemsPerPage: 12,
        totalItems: 0,
        totalPages: 1,
        loadedItems: 0,
        isLoading: false
    },
    selectedProductForCart: null,
    currentCarouselImages: [],
    currentProductCode: ''
};

// 导出工具函数和状态
window.utils = {
    safeGetValue,
    safeToLower,
    sheetIcons,
    defaultIcon,
    state
};