// 购物车功能模块

// 购物车状态管理
const cartState = {
    items: [],
    load() {
        const saved = localStorage.getItem('product_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        this.updateUI();
    },
    save() {
        localStorage.setItem('product_cart', JSON.stringify(this.items));
        this.updateUI();
    },
    add(product, quantity = 1, brandKey = 'no_brand') {
        const productCode = window.utils.safeGetValue(product, ['CODE', 'code'], '');
        const brandDisplay = window.translations.brandMappings[window.utils.state.currentLanguage][brandKey] || brandKey;
        const existingItem = this.items.find(item => 
            item.code === productCode && item.selectedBrandKey === brandKey
        );
        
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.selectedBrand = brandDisplay;
        } else {
            this.items.push({
                code: productCode,
                originalCode: window.utils.safeGetValue(product, 'originalCode', productCode),
                name: product.MODEL || product.NAME || product.model || product.name || window.translations.translate('noProducts'),
                sheetName: product.sheetName,
                specs: product.SPECS || product.specs || product['FITS MACHINE'] || product['fits machine'] || '',
                quantity: quantity,
                brand: product.BRAND || product.brand || '',
                selectedBrandKey: brandKey,
                selectedBrand: brandDisplay,
                price: product.PRICE || product.price || 0,
                image: window.utils.state.loadedImages[productCode] || null
            });
        }
        this.save();
        
        // 异步加载图片
        (async () => {
            try {
                const imgUrl = await window.imageLoader.findMainImage(productCode);
                if (imgUrl) {
                    const it = this.items.find(item => item.code === productCode && item.selectedBrandKey === brandKey);
                    if (it && !it.image) {
                        it.image = imgUrl.url;
                        window.utils.state.loadedImages[productCode] = imgUrl.url;
                        this.save();
                        this.updateUI();
                    }
                }
            } catch (e) {
                // 忽略查找错误
            }
        })();
        
        this.showNotification(window.translations.translate('cartNotification'));
    },
    update(code, quantity) {
        const item = this.items.find(item => item.code === code);
        if (item) {
            if (quantity <= 0) {
                this.remove(code);
            } else {
                item.quantity = quantity;
                this.save();
            }
        }
    },
    remove(code) {
        this.items = this.items.filter(item => item.code !== code);
        this.save();
        this.showNotification(window.translations.translate('cartRemoved'));
    },
    clear() {
        this.items = [];
        this.save();
        this.showNotification(window.translations.translate('cartCleared'));
    },
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    },
    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    updateUI() {
        document.getElementById('cart-count').textContent = this.getTotalItems();
        this.renderCart();
        if (window.app) window.app.updateCartButtonStates();
    },
    renderCart() {
        const cartContent = document.getElementById('cart-content');
        
        if (this.items.length === 0) {
            cartContent.innerHTML = `
                <div class="empty-state" id="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3 id="empty-cart-title">${window.translations.translate('emptyCartTitle')}</h3>
                    <p id="empty-cart-message">${window.translations.translate('emptyCartMessage')}</p>
                </div>
            `;
            document.getElementById('cart-total-items').textContent = '0';
            return;
        }
        
        let cartHTML = '';
        
        this.items.forEach((item, index) => {
            cartHTML += `
                <div class="cart-item" data-index="${index}" data-code="${item.code}">
                    ${item.image ? `<img src="${item.image}" alt="${item.code}" class="cart-item-image">` : 
                    `<div class="cart-item-image" style="display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
                        <i class="fas fa-box" style="color: #95a5a6;"></i>
                    </div>`}
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-code">${item.code}</div>
                        <div class="cart-item-original-code">${item.originalCode}</div>
                        ${item.selectedBrand ? `<div class="cart-item-brand" style="font-size: 12px; color: #27ae60; margin-bottom: 5px;">品牌: ${item.selectedBrand}</div>` : ''}
                        <div class="cart-item-sheet">${item.sheetName}</div>
                        <div class="cart-item-controls">
                            <div class="quantity-control">
                                <button type="button" class="quantity-btn decrease-quantity" data-code="${item.code}">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-code="${item.code}">
                                <button type="button" class="quantity-btn increase-quantity" data-code="${item.code}">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button type="button" class="remove-item" data-code="${item.code}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartContent.innerHTML = cartHTML;
        document.getElementById('cart-total-items').textContent = this.getTotalItems();
        this.bindCartEvents();
    },
    bindCartEvents() {
        const cartContent = document.getElementById('cart-content');
        
        this.items.forEach(item => {
            const code = item.code;
            
            const decreaseBtn = cartContent.querySelector(`.decrease-quantity[data-code="${code}"]`);
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (item.quantity > 1) {
                        this.update(code, item.quantity - 1);
                    } else {
                        if (confirm(window.translations.translate('confirmRemove'))) {
                            this.remove(code);
                        }
                    }
                });
            }
            
            const increaseBtn = cartContent.querySelector(`.increase-quantity[data-code="${code}"]`);
            if (increaseBtn) {
                increaseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.update(code, item.quantity + 1);
                });
            }
            
            const removeBtn = cartContent.querySelector(`.remove-item[data-code="${code}"]`);
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(window.translations.translate('confirmRemove'))) {
                        this.remove(code);
                    }
                });
            }
            
            const quantityInput = cartContent.querySelector(`.quantity-input[data-code="${code}"]`);
            if (quantityInput) {
                quantityInput.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const newQuantity = parseInt(e.target.value);
                    if (!isNaN(newQuantity) && newQuantity > 0) {
                        this.update(code, newQuantity);
                    } else {
                        e.target.value = item.quantity;
                    }
                });
            }
        });
    },
    showNotification(message) {
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i> ${message}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 1000);
    },
    async loadImageToBuffer(productCode) {
        const mainImageUrl = await window.imageLoader.findMainImage(productCode);
        if (!mainImageUrl) return null;
        
        try {
            const response = await fetch(mainImageUrl.url);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }
            
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = function() {
                    resolve(this.result);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });
        } catch (error) {
            console.warn(`无法加载图片: ${productCode}`, error);
            return null;
        }
    },
    
    async exportToExcel() {
        if (this.items.length === 0) {
            alert(window.translations.translate('cartEmpty'));
            return;
        }
        
        const exportBtn = document.getElementById('export-cart');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在生成Excel...';
        exportBtn.disabled = true;
        
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = '配件选购系统';
            workbook.lastModifiedBy = '配件选购系统';
            workbook.created = new Date();
            workbook.modified = new Date();
            
            const worksheet = workbook.addWorksheet(
                window.utils.state.currentLanguage === 'zh-CN' ? '订购清单' : 'Order List'
            );
            
            worksheet.columns = [
                { header: '序号', key: 'serial', width: 8 },
                { header: '图片', key: 'image', width: 40 },
                { header: '商品编码', key: 'code', width: 20 },
                { header: '原始编码', key: 'originalCode', width: 20 },
                { header: '商品名称', key: 'name', width: 30 },
                { header: '规格说明', key: 'specs', width: 40 },
                { header: '品牌', key: 'brand', width: 15 },
                { header: '数量', key: 'quantity', width: 10 }
            ];
            
            worksheet.getColumn(2).height = 120;
            
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '3498DB' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 25;
            
            headerRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } }
                };
            });
            
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                const rowNumber = i + 2;
                
                const row = worksheet.addRow({
                    serial: i + 1,
                    image: '',
                    code: item.code || '',
                    originalCode: item.originalCode || '',
                    name: item.name || '',
                    specs: item.specs || '',
                    brand: item.selectedBrand || window.translations.translate('noBrand'),
                    quantity: item.quantity || 0
                });
                
                row.height = 75;
                
                for (let col = 1; col <= 8; col++) {
                    const cell = row.getCell(col);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'DDDDDD' } },
                        left: { style: 'thin', color: { argb: 'DDDDDD' } },
                        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
                        right: { style: 'thin', color: { argb: 'DDDDDD' } }
                    };
                    
                    if (col === 1 || col === 8) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else if (col === 2) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    }
                }
            }
            
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                const rowNumber = i + 2;
                const row = worksheet.getRow(rowNumber);
                
                try {
                    const imageBuffer = await this.loadImageToBuffer(item.code);
                    if (imageBuffer) {
                        const imageId = workbook.addImage({
                            buffer: imageBuffer,
                            extension: 'png'
                        });
                        
                        const colIndex = 1;
                        const rowIndex = rowNumber - 1;
                        
                        worksheet.addImage(imageId, {
                            tl: { 
                                col: colIndex, 
                                row: rowIndex,
                                offset: 0
                            },
                            br: { 
                                col: colIndex + 1,
                                row: rowIndex + 1,
                                offset: 0
                            },
                            editAs: 'oneCell'
                        });
                        
                        worksheet.getColumn(colIndex + 1).width = 12;
                        
                    } else {
                        row.getCell(2).value = window.translations.translate('noImage');
                        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                } catch (error) {
                    console.warn(`无法加载图片: ${item.code}`, error);
                    row.getCell(2).value = window.translations.translate('imageNotFound');
                    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
                }
            }
            
            const summaryStartRow = this.items.length + 3;
            
            const summaryTitleCell = worksheet.getCell(`A${summaryStartRow}`);
            summaryTitleCell.value = '汇总信息';
            summaryTitleCell.font = { bold: true, color: { argb: '3498DB' }, size: 12 };
            summaryTitleCell.border = {
                top: { style: 'thin', color: { argb: '3498DB' } },
                left: { style: 'thin', color: { argb: '3498DB' } },
                bottom: { style: 'thin', color: { argb: '3498DB' } },
                right: { style: 'thin', color: { argb: '3498DB' } }
            };
            
            worksheet.getCell(`A${summaryStartRow + 1}`).value = '商品种类';
            worksheet.getCell(`B${summaryStartRow + 1}`).value = this.items.length;
            
            worksheet.getCell(`A${summaryStartRow + 2}`).value = '总数量';
            worksheet.getCell(`B${summaryStartRow + 2}`).value = this.getTotalItems();
            
            const currentDate = new Date();
            const dateFormatter = window.utils.state.currentLanguage === 'zh-CN' ? 
                currentDate.toLocaleDateString('zh-CN') : 
                currentDate.toLocaleDateString('en-US');
            const timeFormatter = window.utils.state.currentLanguage === 'zh-CN' ?
                currentDate.toLocaleTimeString('zh-CN') :
                currentDate.toLocaleTimeString('en-US');
            
            worksheet.getCell(`A${summaryStartRow + 3}`).value = '导出日期';
            worksheet.getCell(`B${summaryStartRow + 3}`).value = dateFormatter;
            
            worksheet.getCell(`A${summaryStartRow + 4}`).value = '导出时间';
            worksheet.getCell(`B${summaryStartRow + 4}`).value = timeFormatter;
            
            for (let i = summaryStartRow; i <= summaryStartRow + 4; i++) {
                const row = worksheet.getRow(i);
                row.height = 20;
                
                const cellA = row.getCell(1);
                cellA.font = { bold: true };
                cellA.border = {
                    top: { style: 'thin', color: { argb: 'DDDDDD' } },
                    left: { style: 'thin', color: { argb: 'DDDDDD' } },
                    bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
                    right: { style: 'thin', color: { argb: 'DDDDDD' } }
                };
                
                for (let col = 2; col <= 8; col++) {
                    const cell = row.getCell(col);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'DDDDDD' } },
                        left: { style: 'thin', color: { argb: 'DDDDDD' } },
                        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
                        right: { style: 'thin', color: { argb: 'DDDDDD' } }
                    };
                }
            }
            
            const fileName = window.utils.state.currentLanguage === 'zh-CN' ? 
                `订购清单_${new Date().toISOString().slice(0,10)}.xlsx` :
                `Order_List_${new Date().toISOString().slice(0,10)}.xlsx`;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
            
            this.showNotification(window.translations.translate('exportSuccess'));
            
        } catch (error) {
            console.error('导出Excel失败:', error);
            alert('导出失败: ' + error.message);
        } finally {
            exportBtn.innerHTML = originalText || `<i class="fas fa-file-excel"></i> <span id="export-cart-text">${window.translations.translate('exportCart')}</span>`;
            exportBtn.disabled = false;
        }
    }
};

// 购物车相关UI函数
function toggleCartSidebar() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (cartSidebar.classList.contains('active')) {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    } else {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
    }
}

function closeCartSidebar() {
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
}

// 添加商品到购物车
function addToCart(product) {
    window.utils.state.selectedProductForCart = product;
    
    const modal = document.getElementById('quantity-modal');
    const title = document.getElementById('quantity-modal-title');
    const quantityInput = document.getElementById('quantity-input');
    const brandSelect = document.getElementById('brand-select');
    
    const productName = window.utils.safeGetValue(product, ['MODEL', 'model', 'NAME', 'name'], window.translations.translate('noProducts'));
    
    title.textContent = `${window.translations.translate('selectQuantity')} "${productName}"`;
    quantityInput.value = 1;
    quantityInput.focus();
    quantityInput.select();
    
    modal.classList.add('active');
}

// 确认添加到购物车
function confirmAddToCart() {
    const quantityInput = document.getElementById('quantity-input');
    const brandSelect = document.getElementById('brand-select');
    const quantity = parseInt(quantityInput.value);
    const brandKey = brandSelect.value;
    
    if (isNaN(quantity) || quantity < 1) {
        alert(window.translations.translate('enterQuantity'));
        return;
    }
    
    if (window.utils.state.selectedProductForCart) {
        cartState.add(window.utils.state.selectedProductForCart, quantity, brandKey);
        document.getElementById('quantity-modal').classList.remove('active');
        window.utils.state.selectedProductForCart = null;
    }
}

// 导出购物车模块
window.cart = {
    state: cartState,
    toggleCartSidebar,
    closeCartSidebar,
    addToCart,
    confirmAddToCart
};