// 主应用入口模块

let searchDebounceTimer = null;
let scrollTimer = null;

// ========== 数据加载和显示函数 ==========
async function loadJSONData() {
    try {
        const response = await fetch('products_data.json?v=' + Date.now());
        if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
        
        const jsonData = await response.json();
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('无效的JSON数据格式');
        }
        
        window.utils.state.jsonData = jsonData;
        window.utils.state.sheetNames = Object.keys(window.utils.state.jsonData);
        
        processJSONData();
        updateDataStatus(true, window.translations.translate('dataReady'));
        
        initializeTreeView();
        
    } catch (error) {
        console.error('加载JSON数据失败:', error);
        updateDataStatus(false, '加载失败: ' + error.message);
        
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                <h3>数据加载失败</h3>
                <p>${error.message}</p>
                <p>请确保 products_data.json 文件存在且格式正确</p>
                <button class="action-button" id="retry-load" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> ${window.translations.translate('navRefresh')}
                </button>
            </div>
        `;
        
        document.getElementById('retry-load')?.addEventListener('click', async () => {
            await loadJSONData();
            initializeTreeView();
            showSheetsList();
        });
    }
}

function processJSONData() {
    window.utils.state.productsBySheet = {};
    window.utils.state.allProducts = [];
    
    window.utils.state.sheetNames.forEach(sheetName => {
        const sheetData = window.utils.state.jsonData[sheetName];
        
        if (Array.isArray(sheetData)) {
            const validProducts = sheetData.filter(item => item && typeof item === 'object');
            
            validProducts.forEach(product => {
                product.sheetName = sheetName;
                product.originalCode = window.utils.safeGetValue(product, ['Original CODE', 'originalCode'], '');
                product.searchCode = window.utils.safeToLower(product.CODE || product.code || '');
                product.searchModel = window.utils.safeToLower(product.MODEL || product.model || '');
                product.searchName = window.utils.safeToLower(product.NAME || product.name || '');
                product.searchFitsMachine = window.utils.safeToLower(product['FITS MACHINE'] || product['fits machine'] || '');
                product.searchSpecs = window.utils.safeToLower(product.SPECS || product.specs || '');
                product.searchBrand = window.utils.safeToLower(product.BRAND || product.brand || '');
                product.searchType = window.utils.safeToLower(product.TYPE || product.type || '');
                product.searchDescription = window.utils.safeToLower(product.DESCRIPTION || product.description || '');
                product.searchOriginalCode = window.utils.safeToLower(product.originalCode);
            });
            
            window.utils.state.productsBySheet[sheetName] = validProducts;
            window.utils.state.allProducts = window.utils.state.allProducts.concat(validProducts);
        } else {
            window.utils.state.productsBySheet[sheetName] = [];
        }
    });
}

function updateDataStatus(success, message) {
    const statusElement = document.getElementById('data-status');
    if (statusElement) {
        const icon = statusElement.querySelector('i');
        const text = statusElement.querySelector('span');
        
        if (success) {
            icon.style.color = '#2ecc71';
            icon.className = 'fas fa-check-circle';
            text.textContent = message;
        } else {
            icon.style.color = '#e74c3c';
            icon.className = 'fas fa-exclamation-circle';
            text.textContent = message;
        }
    }
}

// 初始化树形视图
function initializeTreeView() {
    const treeList = document.getElementById('category-tree');
    treeList.innerHTML = '';
    
    window.utils.state.sheetNames.forEach(sheetName => {
        const productCount = window.utils.state.productsBySheet[sheetName] ? 
            window.utils.state.productsBySheet[sheetName].length : 0;
        
        if (productCount === 0) return;
        
        const treeItem = document.createElement('li');
        treeItem.className = 'tree-item';
        treeItem.dataset.sheet = sheetName;
        
        let icon = window.utils.defaultIcon;
        const matches = sheetName.match(/\d+/);
        if (matches && window.utils.sheetIcons[matches[0]]) {
            icon = window.utils.sheetIcons[matches[0]];
        }
        
        treeItem.innerHTML = `
            <div class="tree-header ${window.utils.state.selectedSheet === sheetName && 
                window.utils.state.currentView === 'products' && !window.utils.state.isSearchMode ? 'active' : ''}">
                <div class="tree-toggle">
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="tree-icon">
                    <i class="${icon}"></i>
                </div>
                <span>${sheetName}</span>
                <div class="part-count">${productCount}</div>
            </div>
        `;
        
        const treeHeader = treeItem.querySelector('.tree-header');
        
        treeHeader.addEventListener('click', function(e) {
            e.stopPropagation();
            exitSearchMode();
            
            document.querySelectorAll('.tree-header').forEach(header => {
                header.classList.remove('active');
            });
            treeHeader.classList.add('active');
            
            window.utils.state.selectedSheet = sheetName;
            resetPagination();
            showProductsBySheet(sheetName);
        });
        
        treeList.appendChild(treeItem);
    });
}

// 退出搜索模式
function exitSearchMode() {
    window.utils.state.isSearchMode = false;
    window.utils.state.searchTerm = '';
    window.utils.state.filteredProducts = [];
    
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
}

// 清空搜索
function clearSearch() {
    exitSearchMode();
    
    if (window.utils.state.selectedSheet) {
        resetPagination();
        showProductsBySheet(window.utils.state.selectedSheet);
    } else {
        showSheetsList();
    }
}

// 重置分页状态
function resetPagination() {
    window.utils.state.pagination.currentPage = 1;
    window.utils.state.pagination.loadedItems = 0;
    window.utils.state.pagination.isLoading = false;
}

// 更新分页信息
function updatePaginationInfo(totalItems) {
    window.utils.state.pagination.totalItems = totalItems;
    window.utils.state.pagination.totalPages = Math.ceil(totalItems / window.utils.state.pagination.itemsPerPage);
    window.utils.state.pagination.currentPage = Math.min(window.utils.state.pagination.currentPage, window.utils.state.pagination.totalPages);
}

// 显示工作表列表页面
function showSheetsList() {
    const mainContent = document.getElementById('main-content');
    const totalProducts = window.utils.state.allProducts.length;
    
    mainContent.innerHTML = `
        <div class="content-header">
            <div class="content-title">${window.translations.translate('allSheets')}</div>
            <div class="content-subtitle">${window.translations.translate('dataDescription')}</div>
        </div>
        <div class="empty-state">
            <i class="fas fa-database" style="color: #3498db;"></i>
            <h3>${window.translations.translate('dataDirectory')}</h3>
            <p>${window.translations.translate('dataDescription')}</p>
            <div style="margin-top: 20px; text-align: center;">
                <div style="display: inline-flex; justify-content: center; gap: 30px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #3498db;">${window.utils.state.sheetNames.length}</div>
                        <div style="font-size: 12px; color: #6c757d;">${window.translations.translate('sheetsCount')}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #3498db;">${totalProducts}</div>
                        <div style="font-size: 12px; color: #6c757d;">${window.translations.translate('partsCount')}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    window.utils.state.currentView = 'sheets';
    window.utils.state.selectedSheet = null;
    window.utils.state.selectedProduct = null;
    
    document.querySelectorAll('.tree-header').forEach(header => {
        header.classList.remove('active');
    });
}

// 在所有商品中搜索
function searchAllProducts(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 1) {
        return [];
    }
    
    const term = searchTerm.toLowerCase().trim();
    const searchWords = term.split(/\s+/).filter(word => word.length > 0);
    
    return window.utils.state.allProducts.filter(product => {
        if (searchWords.length === 1) {
            const singleWord = searchWords[0];
            return (
                (product.searchCode && product.searchCode.includes(singleWord)) ||
                (product.searchOriginalCode && product.searchOriginalCode.includes(singleWord)) ||
                (product.searchModel && product.searchModel.includes(singleWord)) ||
                (product.searchName && product.searchName.includes(singleWord)) ||
                (product.searchFitsMachine && product.searchFitsMachine.includes(singleWord)) ||
                (product.searchSpecs && product.searchSpecs.includes(singleWord)) ||
                (product.searchBrand && product.searchBrand.includes(singleWord)) ||
                (product.searchType && product.searchType.includes(singleWord)) ||
                (product.searchDescription && product.searchDescription.includes(singleWord)) ||
                (product.sheetName && window.utils.safeToLower(product.sheetName).includes(singleWord))
            );
        }
        
        return searchWords.every(word => {
            return (
                (product.searchCode && product.searchCode.includes(word)) ||
                (product.searchOriginalCode && product.searchOriginalCode.includes(word)) ||
                (product.searchModel && product.searchModel.includes(word)) ||
                (product.searchName && product.searchName.includes(word)) ||
                (product.searchFitsMachine && product.searchFitsMachine.includes(word)) ||
                (product.searchSpecs && product.searchSpecs.includes(word)) ||
                (product.searchBrand && product.searchBrand.includes(word)) ||
                (product.searchType && product.searchType.includes(word)) ||
                (product.searchDescription && product.searchDescription.includes(word)) ||
                (product.sheetName && window.utils.safeToLower(product.sheetName).includes(word))
            );
        });
    });
}

// 按工作表显示商品
function showProductsBySheet(sheetName) {
    if (window.utils.state.isSearchMode) {
        showSearchResults();
        return;
    }
    
    window.imageLoader.cleanupImageLoadingStates();
    
    const products = window.utils.state.productsBySheet[sheetName] || [];
    updatePaginationInfo(products.length);
    
    const startIndex = (window.utils.state.pagination.currentPage - 1) * window.utils.state.pagination.itemsPerPage;
    const endIndex = startIndex + window.utils.state.pagination.itemsPerPage;
    const currentPageProducts = products.slice(startIndex, endIndex);
    
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="content-header">
            <div>
                <div class="content-title">${sheetName}</div>
                <div class="content-subtitle">${window.translations.translate('foundItems')} ${products.length} ${window.translations.translate('items')}</div>
            </div>
        </div>
        <div class="products-grid" id="products-grid">
            ${currentPageProducts.length > 0 ? 
                currentPageProducts.map((product, index) => createProductCard(product, index)).join('') 
                : 
                `<div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-box-open"></i>
                    <h3>${window.translations.translate('noProducts')}</h3>
                    <p>${window.translations.translate('noProductsInSheet')}</p>
                </div>`
            }
        </div>
        
        ${products.length > window.utils.state.pagination.itemsPerPage ? createPaginationControls() : ''}
    `;
    
    document.querySelectorAll('.product-card').forEach((card, index) => {
        const product = currentPageProducts[index];
        
        if (product) {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.cart-button')) {
                    showProductDetail(product, sheetName);
                }
            });
            
            const cartBtn = card.querySelector('.cart-button');
            if (cartBtn) {
                cartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.cart.addToCart(product);
                });
            }
        }
    });
    
    updateCartButtonStates();
    setupPaginationEvents(sheetName);
    
    window.utils.state.currentView = 'products';
    window.utils.state.selectedSheet = sheetName;
    
    setTimeout(() => {
        window.imageLoader.setupProductCardLazyLoading();
    }, 100);
}

// 更新购物车按钮状态
function updateCartButtonStates() {
    document.querySelectorAll('.product-card').forEach(card => {
        const productCode = card.dataset.code;
        const cartBtn = card.querySelector('.cart-button');
        if (!cartBtn) return;

        const inCart = window.cart.state.items.some(item => item.code === productCode);
        if (inCart) {
            cartBtn.classList.add('added');
            cartBtn.innerHTML = '<i class="fas fa-check"></i>';
            cartBtn.title = window.translations.translate('removeFromCart');
        } else {
            cartBtn.classList.remove('added');
            cartBtn.innerHTML = '<i class="fas fa-cart-plus"></i>';
            cartBtn.title = window.translations.translate('addToCart');
        }
    });
}

// 创建商品卡片HTML
function createProductCard(product, index) {
    const productCode = window.utils.safeGetValue(product, ['CODE', 'code'], `ITEM_${index}`);
    const productName = window.utils.safeGetValue(product, ['MODEL', 'model', 'NAME', 'name'], window.translations.translate('noProducts'));
    const productSpecs = window.utils.safeGetValue(product, ['FITS MACHINE', 'fits machine', 'SPECS', 'specs'], '');
    const sheetName = product.sheetName || '';
    const originalCode = window.utils.safeGetValue(product, ['Original CODE', 'originalCode'], '');
    const inCart = window.cart.state.items.find(item => item.code === productCode);
    
    return `
        <div class="product-card fade-in" data-code="${productCode}">
            <button class="cart-button ${inCart ? 'added' : ''}" title="${inCart ? window.translations.translate('removeFromCart') : window.translations.translate('addToCart')}" data-code="${productCode}">
                <i class="fas ${inCart ? 'fa-check' : 'fa-cart-plus'}"></i>
            </button>
            <div class="product-image" data-code="${productCode}">
                <div class="lazy-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${window.translations.translate('loading')}</span>
                </div>
            </div>
            <div class="product-info">
                <div class="product-name" title="${productName}">${productName}</div>
                ${productSpecs ? `<div class="product-specs" title="${productSpecs}">${productSpecs}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; border-top: 1px solid #eee;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #3498db; font-weight: 600; font-family: 'Courier New', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${productCode}">${productCode}</div>
                    </div>
                    ${originalCode ? `
                        <div style="flex: 1; text-align: right;">
                            <div style="font-size: 11px; color: #3498db; font-family: 'Courier New', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${originalCode}">${originalCode}</div>
                        </div>
                    ` : ''}
                </div>
                ${sheetName ? `<div style="font-size: 10px; color: #95a5a6; margin-top: 5px;">${sheetName}</div>` : ''}
            </div>
        </div>
    `;
}

// 显示搜索结果
function showSearchResults() {
    const results = window.utils.state.filteredProducts;
    updatePaginationInfo(results.length);
    
    const startIndex = (window.utils.state.pagination.currentPage - 1) * window.utils.state.pagination.itemsPerPage;
    const endIndex = startIndex + window.utils.state.pagination.itemsPerPage;
    const currentPageProducts = results.slice(startIndex, endIndex);
    
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="content-header">
            <div>
                <div class="content-title">${window.translations.translate('searchResults')}</div>
                <div class="content-subtitle">${window.translations.translate('foundItems')} ${results.length} ${window.translations.translate('itemsFor')} "${window.utils.state.searchTerm}"</div>
            </div>
        </div>
        <div class="products-grid" id="products-grid">
            ${currentPageProducts.length > 0 ? 
                currentPageProducts.map((product, index) => createProductCard(product, index)).join('') 
                : 
                `<div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-search"></i>
                    <h3>${window.translations.translate('noResults')}</h3>
                    <p>${window.translations.translate('tryOtherKeywords')}</p>
                </div>`
            }
        </div>
        
        ${results.length > window.utils.state.pagination.itemsPerPage ? createPaginationControls() : ''}
    `;
    
    document.querySelectorAll('.product-card').forEach((card, index) => {
        const product = currentPageProducts[index];
        
        if (product) {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.cart-button')) {
                    showProductDetail(product, product.sheetName);
                }
            });
            
            const cartBtn = card.querySelector('.cart-button');
            if (cartBtn) {
                cartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.cart.addToCart(product);
                });
            }
        }
    });
    
    updateCartButtonStates();
    setupSearchPaginationEvents();
    
    window.utils.state.currentView = 'products';
    
    setTimeout(() => {
        window.imageLoader.setupProductCardLazyLoading();
    }, 100);
}

// 创建分页控件
function createPaginationControls() {
    const pagination = window.utils.state.pagination;
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    let pageButtons = '';
    for (let i = startPage; i <= endPage; i++) {
        pageButtons += `
            <button class="pagination-button ${i === pagination.currentPage ? 'active' : ''}" 
                    data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    return `
        <div class="pagination-container">
            <div class="pagination-info">
                ${window.translations.translate('showItems')} ${Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)} 
                ${window.translations.translate('to')} ${Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 
                ${window.translations.translate('of')} ${pagination.totalItems} ${window.translations.translate('items')}
            </div>
            <div class="pagination-controls">
                <button class="pagination-button" id="first-page" ${pagination.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-button" id="prev-page" ${pagination.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-left"></i>
                </button>
                
                <div class="page-numbers">
                    ${pageButtons}
                </div>
                
                <button class="pagination-button" id="next-page" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-button" id="last-page" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-right"></i>
                </button>
                
                <div class="pagination-input-group">
                    <span>${window.translations.translate('goToPage')}</span>
                    <input type="number" class="pagination-input" id="page-input" 
                        min="1" max="${pagination.totalPages}" 
                        value="${pagination.currentPage}">
                    <span>${window.translations.translate('page')}</span>
                    <button class="pagination-button" id="go-to-page">${window.translations.translate('jump')}</button>
                </div>
            </div>
        </div>
    `;
}

// 设置分页事件
function setupPaginationEvents(sheetName) {
    document.getElementById('first-page')?.addEventListener('click', () => {
        goToPage(1, sheetName);
    });
    
    document.getElementById('prev-page')?.addEventListener('click', () => {
        goToPage(window.utils.state.pagination.currentPage - 1, sheetName);
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
        goToPage(window.utils.state.pagination.currentPage + 1, sheetName);
    });
    
    document.getElementById('last-page')?.addEventListener('click', () => {
        goToPage(window.utils.state.pagination.totalPages, sheetName);
    });
    
    document.querySelectorAll('.pagination-button[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            goToPage(page, sheetName);
        });
    });
    
    document.getElementById('go-to-page')?.addEventListener('click', () => {
        const input = document.getElementById('page-input');
        const page = parseInt(input.value);
        if (page >= 1 && page <= window.utils.state.pagination.totalPages) {
            goToPage(page, sheetName);
        } else {
            alert(`请输入有效的页码 (1-${window.utils.state.pagination.totalPages})`);
            input.value = window.utils.state.pagination.currentPage;
        }
    });
    
    document.getElementById('page-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('go-to-page').click();
        }
    });
}

// 跳转到指定页
function goToPage(page, sheetName) {
    if (page < 1 || page > window.utils.state.pagination.totalPages || page === window.utils.state.pagination.currentPage) {
        return;
    }
    
    window.utils.state.pagination.currentPage = page;
    showProductsBySheet(sheetName);
    document.querySelector('.products-grid').scrollTop = 0;
}

// 设置搜索分页事件
function setupSearchPaginationEvents() {
    document.getElementById('first-page')?.addEventListener('click', () => {
        goToPageSearch(1);
    });
    
    document.getElementById('prev-page')?.addEventListener('click', () => {
        goToPageSearch(window.utils.state.pagination.currentPage - 1);
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
        goToPageSearch(window.utils.state.pagination.currentPage + 1);
    });
    
    document.getElementById('last-page')?.addEventListener('click', () => {
        goToPageSearch(window.utils.state.pagination.totalPages);
    });
    
    document.querySelectorAll('.pagination-button[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            goToPageSearch(page);
        });
    });
    
    document.getElementById('go-to-page')?.addEventListener('click', () => {
        const input = document.getElementById('page-input');
        const page = parseInt(input.value);
        if (page >= 1 && page <= window.utils.state.pagination.totalPages) {
            goToPageSearch(page);
        } else {
            alert(`请输入有效的页码 (1-${window.utils.state.pagination.totalPages})`);
            input.value = window.utils.state.pagination.currentPage;
        }
    });
    
    document.getElementById('page-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('go-to-page').click();
        }
    });
}

// 跳转到搜索结果的指定页
function goToPageSearch(page) {
    if (page < 1 || page > window.utils.state.pagination.totalPages || page === window.utils.state.pagination.currentPage) {
        return;
    }
    
    window.utils.state.pagination.currentPage = page;
    showSearchResults();
    document.querySelector('.products-grid').scrollTop = 0;
}

// 显示商品详情页面
function showProductDetail(product, sheetName) {
    window.imageLoader.currentCarouselLoadId = 0;
    
    const productCode = window.utils.safeGetValue(product, ['CODE', 'code'], '未知编码');
    const productName = window.utils.safeGetValue(product, ['MODEL', 'model', 'NAME', 'name'], window.translations.translate('noProducts'));
    const originalCode = window.utils.safeGetValue(product, ['Original CODE', 'originalCode'], '');
    
    const mainContent = document.getElementById('main-content');
    
    let detailsHtml = '';
    for (const [key, value] of Object.entries(product)) {
        if (key.startsWith('_') || key.startsWith('search')) continue;
        if (key === 'IMAGE' || key === 'image') continue;
        if (key === 'CODE' || key === 'code') continue;
        if (key === 'MODEL' || key === 'model' || key === 'NAME' || key === 'name') continue;
        if (key === 'sheetName') continue;
        if (key === 'originalCode') continue;
        if (key === 'Original CODE') continue;
        
        if (value !== null && value !== undefined && value !== '') {
            const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
            detailsHtml += `
                <tr>
                    <td class="info-label">${key}</td>
                    <td class="info-value">${displayValue}</td>
                </tr>
            `;
        }
    }
    
    mainContent.innerHTML = `
        <div class="content-header">
            <div>
                <div class="content-title">${window.translations.translate('productDetails')}</div>
                <div class="detail-code">${window.translations.translate('productCode')} ${productCode}</div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="action-button" id="back-to-list">
                    <i class="fas fa-arrow-left"></i> ${window.translations.translate('backToList')}
                </button>
                <button class="action-button" id="add-to-cart-detail">
                    <i class="fas fa-cart-plus"></i> ${window.translations.translate('addToCart')}
                </button>
            </div>
        </div>
        <div class="product-detail">
            <div class="detail-content slide-in">
                <div class="detail-image-section" id="detail-image-section">
                    <div class="image-carousel">
                        <div class="carousel-main-image" id="carousel-main-image">
                        </div>
                        
                        <div class="thumbnail-container" id="thumbnail-container"></div>
                        
                        <div class="carousel-indicators" id="carousel-indicators"></div>
                        
                        <div class="carousel-info" id="carousel-info" style="display: none;">
                            1 / 1
                        </div>
                    </div>
                </div>
                
                <div class="detail-info-section">
                    <div class="info-card">
                        <h3>${window.translations.translate('basicInfo')}</h3>
                        <table class="info-table">
                            <tr>
                                <td class="info-label">${window.translations.translate('productCode')}</td>
                                <td class="info-value"><span style="font-family: 'Courier New', monospace; font-weight: 600; color: #3498db;">${productCode}</span></td>
                            </tr>
                            ${originalCode ? `<tr>
                                <td class="info-label">${window.translations.translate('originalCode')}</td>
                                <td class="info-value"><span style="font-family: 'Courier New', monospace; font-weight: 600; color: #27ae60;">${originalCode}</span></td>
                            </tr>` : ''}
                            <tr>
                                <td class="info-label">${window.translations.translate('productName')}</td>
                                <td class="info-value">${productName}</td>
                            </tr>
                            <tr>
                                <td class="info-label">${window.translations.translate('sheetName')}</td>
                                <td class="info-value">${sheetName}</td>
                            </tr>
                        </table>
                    </div>
                    
                    ${detailsHtml ? `
                        <div class="info-card">
                            <h3>${window.translations.translate('detailedInfo')}</h3>
                            <table class="info-table">
                                ${detailsHtml}
                            </table>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        window.imageLoader.loadProductCarousel(productCode);
    }, 50);
    
    document.getElementById('back-to-list').addEventListener('click', () => {
        if (window.utils.state.isSearchMode) {
            showSearchResults();
        } else if (window.utils.state.selectedSheet) {
            showProductsBySheet(window.utils.state.selectedSheet);
        } else {
            showSheetsList();
        }
    });
    
    document.getElementById('add-to-cart-detail').addEventListener('click', () => {
        window.cart.addToCart(product);
    });
    
    window.utils.state.currentView = 'detail';
    window.utils.state.selectedProduct = product;
}

// 执行搜索功能
function performSearch() {
    const searchTerm = window.utils.state.searchTerm.trim();
    
    if (searchTerm.length < 1) {
        exitSearchMode();
        
        if (window.utils.state.selectedSheet) {
            showProductsBySheet(window.utils.state.selectedSheet);
        } else {
            showSheetsList();
        }
        return;
    }
    
    window.utils.state.filteredProducts = searchAllProducts(searchTerm);
    window.utils.state.isSearchMode = true;
    resetPagination();
    showSearchResults();
    
    document.querySelectorAll('.tree-header').forEach(header => {
        header.classList.remove('active');
    });
}

// 刷新当前视图
function refreshCurrentView() {
    if (window.utils.state.currentView === 'sheets') {
        showSheetsList();
    } else if (window.utils.state.currentView === 'products') {
        if (window.utils.state.isSearchMode) {
            showSearchResults();
        } else if (window.utils.state.selectedSheet) {
            showProductsBySheet(window.utils.state.selectedSheet);
        }
    } else if (window.utils.state.currentView === 'detail') {
        showProductDetail(window.utils.state.selectedProduct, window.utils.state.selectedSheet);
    }
}

function activateSheetInTree(sheetName) {
    document.querySelectorAll('.tree-header').forEach(header => {
        header.classList.remove('active');
    });
    
    const sheetHeader = document.querySelector(`.tree-item[data-sheet="${sheetName}"] .tree-header`);
    if (sheetHeader) {
        sheetHeader.classList.add('active');
    }
}

// ========== 事件监听器 ==========
function setupEventListeners() {
    // 语言切换
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    languageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        languageDropdown.classList.toggle('active');
    });
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.dataset.lang;
            window.translations.switchLanguage(lang);
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            languageDropdown.classList.remove('active');
        });
    });
    
    document.addEventListener('click', function() {
        languageDropdown.classList.remove('active');
    });
    
    // 商品搜索框事件
    const searchInput = document.getElementById('product-search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value;
        window.utils.state.searchTerm = searchTerm;
        
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        if (!searchTerm.trim()) {
            clearSearch();
            return;
        }
        
        searchDebounceTimer = setTimeout(() => {
            performSearch();
        }, 300);
    });
    
    clearSearchBtn.addEventListener('click', function() {
        clearSearch();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            performSearch();
        }
    });
    
    // 图片模态框事件
    document.getElementById('modal-close').addEventListener('click', window.imageLoader.closeImageModal);
    
    document.getElementById('image-modal').addEventListener('click', function(e) {
        if (e.target === this || e.target.classList.contains('modal-image')) {
            window.imageLoader.closeImageModal();
        }
    });
    
    // 购物车相关事件
    document.getElementById('view-cart').addEventListener('click', function(e) {
        e.stopPropagation();
        window.cart.toggleCartSidebar();
    });
    
    document.getElementById('cart-close').addEventListener('click', function() {
        window.cart.closeCartSidebar();
    });
    
    document.getElementById('cart-overlay').addEventListener('click', function() {
        window.cart.closeCartSidebar();
    });
    
    document.getElementById('cart-sidebar').addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    document.getElementById('clear-cart').addEventListener('click', function() {
        if (confirm(window.translations.translate('confirmClearCart'))) {
            window.cart.state.clear();
        }
    });
    
    document.getElementById('export-cart').addEventListener('click', function() {
        window.cart.state.exportToExcel();
    });
    
    // 数量选择模态框事件
    document.getElementById('cancel-quantity').addEventListener('click', function() {
        document.getElementById('quantity-modal').classList.remove('active');
        window.utils.state.selectedProductForCart = null;
    });
    
    document.getElementById('confirm-quantity').addEventListener('click', window.cart.confirmAddToCart);
    
    document.getElementById('quantity-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            window.cart.confirmAddToCart();
        }
    });
    
    document.getElementById('brand-select').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            window.cart.confirmAddToCart();
        }
    });
    
    // 刷新数据按钮
    document.getElementById('refresh-data').addEventListener('click', async () => {
        // 清理图片缓存
        try {
            window.imageLoader.cleanupImageLoadingStates();
            if (window.imageLoader.lazyImageObserver) {
                window.imageLoader.lazyImageObserver.disconnect();
                window.imageLoader.lazyImageObserver = null;
            }
        } catch (e) {
            console.warn('刷新时清理图片缓存失败', e);
        }

        await loadJSONData();
        initializeTreeView();
        if (window.utils.state.sheetNames.length > 0) {
            const firstSheet = window.utils.state.sheetNames[0];
            window.utils.state.selectedSheet = firstSheet;
            resetPagination();
            clearSearch();
            showProductsBySheet(firstSheet);
            activateSheetInTree(firstSheet);
        } else {
            showSheetsList();
        }
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.imageLoader.closeImageModal();
            document.getElementById('quantity-modal').classList.remove('active');
            window.cart.closeCartSidebar();
            
            if (window.utils.state.currentView === 'detail') {
                if (window.utils.state.isSearchMode) {
                    showSearchResults();
                } else if (window.utils.state.selectedSheet) {
                    showProductsBySheet(window.utils.state.selectedSheet);
                } else {
                    showSheetsList();
                }
            }
        }
    });
}

// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', async function() {
    window.translations.updatePageText();
    window.translations.updateFlagIcon();
    window.translations.updateBrandSelect();
    window.cart.state.load();
    
    await loadJSONData();
    setupEventListeners();
    
    if (window.utils.state.sheetNames.length > 0) {
        const firstSheet = window.utils.state.sheetNames[0];
        window.utils.state.selectedSheet = firstSheet;
        resetPagination();
        showProductsBySheet(firstSheet);
        setTimeout(() => {
            activateSheetInTree(firstSheet);
        }, 100);
    } else {
        showSheetsList();
    }
    
    window.imageLoader.initializeLazyLoading();
    
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            window.imageLoader.preloadVisibleImages();
        }, 100);
    });
    
    setTimeout(() => {
        window.imageLoader.preloadVisibleImages();
    }, 500);
});

// 导出应用模块
window.app = {
    loadJSONData,
    processJSONData,
    updateDataStatus,
    initializeTreeView,
    exitSearchMode,
    clearSearch,
    resetPagination,
    updatePaginationInfo,
    showSheetsList,
    searchAllProducts,
    showProductsBySheet,
    updateCartButtonStates,
    createProductCard,
    showSearchResults,
    createPaginationControls,
    setupPaginationEvents,
    goToPage,
    setupSearchPaginationEvents,
    goToPageSearch,
    showProductDetail,
    performSearch,
    refreshCurrentView,
    activateSheetInTree,
    setupEventListeners
};