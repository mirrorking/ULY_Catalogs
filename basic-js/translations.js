// 多语言支持模块

// 多语言文本定义
const translations = {
    'zh-CN': {
        'pageTitle': '基础配件目录 - 选购系统',
        'pageSubtitle': '选择商品并添加到购物车，生成采购清单',
        'navHome': '返回首页',
        'navMachine': '整机目录',
        'navCart': '购物车',
        'navRefresh': '刷新数据',
        'sidebarTitle': '工作表列表',
        'searchPlaceholder': '在所有商品中搜索...',
        'loadingData': '正在加载数据...',
        'dataReady': '数据已就绪',
        'allSheets': '所有工作表',
        'dataDirectory': 'JSON数据目录系统',
        'dataDescription': '基于XLSM转换的配件信息管理系统',
        'sheetsCount': '工作表',
        'partsCount': '基础配件',
        'cartTitle': '购物车',
        'emptyCartTitle': '购物车为空',
        'emptyCartMessage': '请添加商品到购物车',
        'cartTotal': '总计:',
        'cartItemsUnit': '件商品',
        'clearCart': '清空',
        'exportCart': '导出Excel',
        'addToCart': '添加到购物车',
        'removeFromCart': '从购物车移除',
        'cartNotification': '商品已添加到购物车',
        'cartRemoved': '商品已从购物车移除',
        'cartCleared': '购物车已清空',
        'selectQuantity': '选择数量和品牌',
        'cancel': '取消',
        'confirm': '确认',
        'enterQuantity': '请输入有效的数量',
        'productDetails': '商品详情',
        'productCode': '商品编码:',
        'originalCode': '原始编码:',
        'backToList': '返回列表',
        'basicInfo': '基本信息',
        'productName': '商品名称',
        'sheetName': '所属工作表',
        'detailedInfo': '详细信息',
        'searchResults': '搜索结果',
        'foundItems': '共找到',
        'itemsFor': '个商品',
        'noResults': '未找到相关商品',
        'tryOtherKeywords': '请尝试其他搜索关键词',
        'showItems': '显示第',
        'to': '到',
        'of': '条，共',
        'items': '条',
        'goToPage': '跳至',
        'page': '页',
        'jump': '跳转',
        'noProducts': '暂无商品',
        'noProductsInSheet': '该工作表中暂无商品数据',
        'noImage': '无图片',
        'clickToZoom': '点击图片放大查看',
        'imageNotFound': '图片未找到',
        'saveImageAs': '请将图片保存为:',
        'confirmRemove': '确定要从购物车中移除这个商品吗？',
        'confirmClearCart': '确定要清空购物车吗？',
        'cartEmpty': '购物车为空，无法导出',
        'exportSuccess': '订购清单已导出为Excel文件',
        'footerText': '© 2026 配件目录管理系统 | 基础配件目录',
        'noBrand': '无品牌',
        'kelon': '科龙',
        'lixiong': '力雄',
        'loadingFailed': '加载失败',
        'retry': '重试',
        'loading': '加载中...',
        'checkingImages': '检查图片...',
        'imageLoadError': '图片加载错误',
        'checkingImage': '检查图片路径...',
        'thumbnail': '缩略图'
    },
    'en-US': {
        'pageTitle': 'Basic Parts Directory - Selection System',
        'pageSubtitle': 'Select products and add to cart to generate purchase list',
        'navHome': 'Back to Home',
        'navMachine': 'Machine Directory',
        'navCart': 'Shopping Cart',
        'navRefresh': 'Refresh Data',
        'sidebarTitle': 'Worksheet List',
        'searchPlaceholder': 'Search in all products...',
        'loadingData': 'Loading data...',
        'dataReady': 'Data ready',
        'allSheets': 'All Worksheets',
        'dataDirectory': 'JSON Data Directory System',
        'dataDescription': 'Parts information management system converted from XLSM',
        'sheetsCount': 'Worksheets',
        'partsCount': 'Basic Parts',
        'cartTitle': 'Shopping Cart',
        'emptyCartTitle': 'Cart is empty',
        'emptyCartMessage': 'Please add products to cart',
        'cartTotal': 'Total:',
        'cartItemsUnit': 'items',
        'clearCart': 'Clear',
        'exportCart': 'Export Excel',
        'addToCart': 'Add to Cart',
        'removeFromCart': 'Remove from Cart',
        'cartNotification': 'Product added to cart',
        'cartRemoved': 'Product removed from cart',
        'cartCleared': 'Cart cleared',
        'selectQuantity': 'Select quantity and brand',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'enterQuantity': 'Please enter a valid quantity',
        'productDetails': 'Product Details',
        'productCode': 'Product Code:',
        'originalCode': 'Original Code:',
        'backToList': 'Back to List',
        'basicInfo': 'Basic Information',
        'productName': 'Product Name',
        'sheetName': 'Worksheet',
        'detailedInfo': 'Detailed Information',
        'searchResults': 'Search Results',
        'foundItems': 'Found',
        'itemsFor': 'items for',
        'noResults': 'No relevant products found',
        'tryOtherKeywords': 'Please try other keywords',
        'showItems': 'Showing',
        'to': 'to',
        'of': 'of',
        'items': 'items',
        'goToPage': 'Go to',
        'page': 'page',
        'jump': 'Go',
        'noProducts': 'No products',
        'noProductsInSheet': 'No product data in this worksheet',
        'noImage': 'No image',
        'clickToZoom': 'Click image to zoom',
        'imageNotFound': 'Image not found',
        'saveImageAs': 'Please save image as:',
        'confirmRemove': 'Are you sure you want to remove this item from cart?',
        'confirmClearCart': 'Are you sure you want to clear the cart?',
        'cartEmpty': 'Cart is empty, cannot export',
        'exportSuccess': 'Order list exported to Excel file',
        'footerText': '© 2026 Parts Directory Management System | Basic Parts Directory',
        'noBrand': 'No Brand',
        'kelon': 'Kelon',
        'lixiong': 'Lixiong',
        'loadingFailed': 'Loading failed',
        'retry': 'Retry',
        'loading': 'Loading...',
        'checkingImages': 'Checking images...',
        'imageLoadError': 'Image load error',
        'checkingImage': 'Checking image path...',
        'thumbnail': 'thumbnail'
    }
};

// 品牌映射
const brandMappings = {
    'zh-CN': {
        'no_brand': '无品牌',
        'kelon': '科龙',
        'lixiong': '力雄'
    },
    'en-US': {
        'no_brand': 'No Brand',
        'kelon': 'Kelon',
        'lixiong': 'Lixiong'
    }
};

// 翻译函数
function translate(key) {
    return translations[window.utils.state.currentLanguage][key] || key;
}

// 切换语言
function switchLanguage(lang) {
    if (window.utils.state.currentLanguage === lang) return;
    
    window.utils.state.currentLanguage = lang;
    localStorage.setItem('product_language', lang);
    updatePageText();
    updateFlagIcon();
    updateBrandSelect();
    if (window.app) window.app.refreshCurrentView();
}

// 更新页面文本
function updatePageText() {
    document.getElementById('page-title').textContent = translate('pageTitle');
    document.getElementById('page-subtitle').textContent = translate('pageSubtitle');
    document.getElementById('nav-home').textContent = translate('navHome');
    document.getElementById('nav-machine').textContent = translate('navMachine');
    document.getElementById('nav-cart').textContent = translate('navCart');
    document.getElementById('nav-refresh').textContent = translate('navRefresh');
    document.getElementById('current-language').textContent = window.utils.state.currentLanguage === 'zh-CN' ? '中文' : 'English';
    document.getElementById('sidebar-title').textContent = translate('sidebarTitle');
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) searchInput.placeholder = translate('searchPlaceholder');
    document.getElementById('data-status-text').textContent = translate('loadingData');
    document.getElementById('cart-title').textContent = translate('cartTitle');
    document.getElementById('empty-cart-title').textContent = translate('emptyCartTitle');
    document.getElementById('empty-cart-message').textContent = translate('emptyCartMessage');
    document.getElementById('cart-total-label').textContent = translate('cartTotal');
    document.getElementById('cart-total-unit').textContent = translate('cartItemsUnit');
    document.getElementById('clear-cart-text').textContent = translate('clearCart');
    document.getElementById('export-cart-text').textContent = translate('exportCart');
    document.getElementById('quantity-modal-title').textContent = translate('selectQuantity');
    document.getElementById('cancel-quantity-text').textContent = translate('cancel');
    document.getElementById('confirm-quantity-text').textContent = translate('confirm');
    document.getElementById('footer-text').textContent = translate('footerText');
}

// 更新国旗图标
function updateFlagIcon() {
    const languageBtn = document.getElementById('language-btn');
    const flagElement = languageBtn.querySelector('.language-flag');
    
    if (window.utils.state.currentLanguage === 'zh-CN') {
        flagElement.className = 'language-flag flag-cn';
        flagElement.textContent = '中';
    } else {
        flagElement.className = 'language-flag flag-us';
        flagElement.textContent = 'US';
    }
}

// 更新品牌选择下拉框
function updateBrandSelect() {
    const brandSelect = document.getElementById('brand-select');
    if (!brandSelect) return;
    
    const currentValue = brandSelect.value;
    brandSelect.innerHTML = '';
    
    const brandOptions = [
        { key: 'no_brand', label: translate('noBrand') },
        { key: 'kelon', label: translate('kelon') },
        { key: 'lixiong', label: translate('lixiong') }
    ];
    
    brandOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.key;
        optionElement.textContent = option.label;
        brandSelect.appendChild(optionElement);
    });
    
    brandSelect.value = currentValue || 'no_brand';
}

// 导出翻译模块
window.translations = {
    translate,
    switchLanguage,
    updatePageText,
    updateFlagIcon,
    updateBrandSelect,
    brandMappings
};