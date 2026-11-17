// 图片加载和优化模块

// ========== 图片优化系统 ==========
const ImageOptimizer = {
    // 检查WebP支持
    supportsWebP: (() => {
        const elem = document.createElement('canvas');
        if (!!(elem.getContext && elem.getContext('2d'))) {
            try {
                return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            } catch (e) {
                return false;
            }
        }
        return false;
    })(),
    
    // 检查网络状况
    getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return {
            effectiveType: connection ? connection.effectiveType : '4g',
            saveData: connection ? connection.saveData : false,
            rtt: connection ? connection.rtt : 50,
            downlink: connection ? connection.downlink : 10
        };
    },
    
    // 根据网络状况调整图片质量
    getQualityForNetwork() {
        const network = this.getNetworkInfo();
        
        if (network.effectiveType === 'slow-2g' || network.saveData) {
            return {
                quality: 0.5,
                maxWidth: 400,
                format: 'jpeg' // 慢速网络用jpeg
            };
        } else if (network.effectiveType === '2g') {
            return {
                quality: 0.6,
                maxWidth: 600,
                format: this.supportsWebP ? 'webp' : 'jpeg'
            };
        } else {
            return {
                quality: 0.8,
                maxWidth: 1200,
                format: this.supportsWebP ? 'webp' : 'jpeg'
            };
        }
    },
    
    // 压缩图片
    async compressImage(image, options = {}) {
        const defaultOptions = {
            maxWidth: 1200,
            quality: 0.8,
            format: 'auto'
        };
        
        const opts = { ...defaultOptions, ...options };
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算新尺寸
            let width = image.naturalWidth || image.width;
            let height = image.naturalHeight || image.height;
            
            if (width > opts.maxWidth) {
                const ratio = opts.maxWidth / width;
                width = opts.maxWidth;
                height = height * ratio;
            }
            
            // 设置画布尺寸
            canvas.width = width;
            canvas.height = height;
            
            // 绘制图片
            ctx.drawImage(image, 0, 0, width, height);
            
            // 选择格式
            let mimeType = 'image/jpeg';
            let quality = opts.quality;
            
            if (opts.format === 'webp' && this.supportsWebP) {
                mimeType = 'image/webp';
            } else if (opts.format === 'auto') {
                mimeType = this.supportsWebP ? 'image/webp' : 'image/jpeg';
            }
            
            // 获取数据URL
            try {
                const dataUrl = canvas.toDataURL(mimeType, quality);
                resolve({
                    success: true,
                    dataUrl: dataUrl,
                    format: mimeType.split('/')[1],
                    width: width,
                    height: height,
                    size: Math.round(dataUrl.length * 0.75)
                });
            } catch (error) {
                // 如果WebP失败，回退到JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve({
                    success: true,
                    dataUrl: dataUrl,
                    format: 'jpeg',
                    width: width,
                    height: height,
                    size: Math.round(dataUrl.length * 0.75),
                    fallback: true
                });
            }
        });
    }
};

// ========== 优化的图片加载系统 ==========
const imageCache = new Map();
const imageLoadingPromises = new Map();
let lazyImageObserver = null;

// 检查图片是否存在
function checkImageExists(url, timeout = 3000) {
    return new Promise((resolve) => {
        const img = new Image();
        let timer;
        
        img.onload = () => {
            clearTimeout(timer);
            resolve({ success: true, image: img });
        };
        
        img.onerror = () => {
            clearTimeout(timer);
            resolve({ success: false });
        };
        
        timer = setTimeout(() => {
            img.onload = img.onerror = null;
            img.src = '';
            resolve({ success: false });
        }, timeout);
        
        img.src = url;
    });
}

// 检查图片是否已缓存
function checkIfImageIsCached(url) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            resolve({ cached: true, width: img.naturalWidth, height: img.naturalHeight, image: img });
        };
        
        img.onerror = () => {
            resolve({ cached: false });
        };
        
        img.src = url;
        
        setTimeout(() => {
            if (img.complete && img.naturalWidth > 0) {
                resolve({ cached: true, width: img.naturalWidth, height: img.naturalHeight, image: img });
            }
        }, 50);
    });
}

// 显示已缓存的图片
function displayCachedImage(imageContainer, imageUrl, productCode, loadId, controller) {
    if (controller.signal.aborted || imageContainer.dataset.loadId !== loadId) {
        return;
    }
    
    const img = new Image();
    img.src = imageUrl;
    img.alt = productCode;
    img.className = 'lazy-image';
    img.decoding = 'async';
    
    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
    
    requestAnimationFrame(() => {
        img.classList.add('loaded', 'quick-load');
        imageContainer.dataset.loaded = 'true';
        imageContainer.dataset.loading = 'false';
        
        delete imageContainer.abortController;
    });
    
    if (!window.utils.state.loadedImages[productCode]) {
        window.utils.state.loadedImages[productCode] = imageUrl;
    }
}

// 查找主图片
async function findMainImage(productCode) {
    const cacheKey = `main_${productCode}`;
    
    // 快速缓存检查
    if (imageCache.has(cacheKey)) {
        const cached = imageCache.get(cacheKey);
        if (cached.url === null) return null;
        if (cached.image && cached.image.complete && cached.image.naturalWidth > 0) {
            return cached;
        }
        if (Date.now() - cached.timestamp < 10000) {
            return cached;
        }
    }
    
    // 防止重复检查
    if (imageLoadingPromises.has(cacheKey)) {
        return imageLoadingPromises.get(cacheKey);
    }
    
    const checkPromise = (async () => {
        try {
            const mainImageUrl = `images/${productCode}.png`;
            const checkResult = await checkImageExists(mainImageUrl);
            
            if (checkResult.success) {
                const result = { 
                    url: mainImageUrl, 
                    image: checkResult.image,
                    timestamp: Date.now(),
                    loaded: true
                };
                imageCache.set(cacheKey, result);
                return result;
            }
            
            // 未找到主图片
            imageCache.set(cacheKey, { 
                url: null, 
                timestamp: Date.now(),
                loaded: false
            });
            return null;
            
        } catch (error) {
            console.warn(`检查主图失败: ${productCode}`, error);
            imageCache.set(cacheKey, { 
                url: null, 
                timestamp: Date.now(),
                loaded: false
            });
            return null;
        } finally {
            imageLoadingPromises.delete(cacheKey);
        }
    })();
    
    imageLoadingPromises.set(cacheKey, checkPromise);
    return checkPromise;
}

// 查找附加图片
async function findAdditionalImages(productCode, onImageFound = null) {
    const cacheKey = `additional_${productCode}`;
    
    // 检查缓存
    if (imageCache.has(cacheKey)) {
        const cached = imageCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30000) {
            if (onImageFound && cached.images.length > 0) {
                cached.images.forEach((url, index) => {
                    onImageFound(url, cached.imageObjects[index].image, index);
                });
            }
            return cached;
        }
    }
    
    // 防止重复检查
    if (imageLoadingPromises.has(cacheKey)) {
        return imageLoadingPromises.get(cacheKey);
    }
    
    const checkPromise = (async () => {
        try {
            const images = [];
            const imageObjects = [];
            
            const formats = ['.jpg', '.png', '.jpeg'];
            const maxVariants = 8;
            
            for (let i = 1; i <= maxVariants; i++) {
                let variantFound = false;
                let foundImage = null;
                
                for (const format of formats) {
                    const url = `Moreimages/${productCode}(${i})${format}`;
                    try {
                        const checkResult = await checkImageExists(url);
                        
                        if (checkResult.success) {
                            variantFound = true;
                            foundImage = { 
                                url: url, 
                                image: checkResult.image,
                                loaded: true
                            };
                            
                            if (onImageFound) {
                                onImageFound(url, checkResult.image, images.length);
                            }
                            
                            break;
                        }
                    } catch (error) {
                        console.warn(`检查图片失败: ${url}`, error);
                    }
                }
                
                if (variantFound && foundImage) {
                    images.push(foundImage.url);
                    imageObjects.push(foundImage);
                } else {
                    break;
                }
            }
            
            const result = { 
                images: images, 
                imageObjects: imageObjects,
                timestamp: Date.now() 
            };
            imageCache.set(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.warn(`检查附加图片失败: ${productCode}`, error);
            const result = { 
                images: [], 
                imageObjects: [],
                timestamp: Date.now() 
            };
            imageCache.set(cacheKey, result);
            return result;
        } finally {
            imageLoadingPromises.delete(cacheKey);
        }
    })();
    
    imageLoadingPromises.set(cacheKey, checkPromise);
    return checkPromise;
}

// 加载商品卡片图片
async function loadProductCardImage(imageContainer, productCode) {
    const loadId = `card_${productCode}_${Date.now()}`;
    imageContainer.dataset.loadId = loadId;
    imageContainer.dataset.cardCode = productCode;
    
    if (imageContainer.dataset.loading === 'true') {
        return;
    }
    
    if (imageContainer.dataset.loaded === 'true') {
        const existingImg = imageContainer.querySelector('img.lazy-image');
        if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
            existingImg.classList.add('loaded');
            return;
        }
        imageContainer.dataset.loaded = 'false';
    }
    
    imageContainer.dataset.loading = 'true';
    imageContainer.dataset.code = productCode;
    
    imageContainer.innerHTML = '<div class="skeleton-placeholder"></div>';
    
    const controller = new AbortController();
    imageContainer.abortController = controller;
    
    let timeoutId = null;
    
    try {
        const mainImageResult = await findMainImage(productCode);
        
        if (controller.signal.aborted) {
            return;
        }
        
        if (mainImageResult && mainImageResult.url) {
            // 优先检查图片是否已缓存
            const cachedCheck = await checkIfImageIsCached(mainImageResult.url);
            if (cachedCheck.cached) {
                displayCachedImage(imageContainer, mainImageResult.url, productCode, loadId, controller);
                return;
            }
            
            // 使用已开始加载的Image对象
            const img = mainImageResult.image || new Image();
            img.alt = productCode;
            img.decoding = 'async';
            img.loading = 'lazy';
            img.className = 'lazy-image';
            
            // 立即设置样式确保可见
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            
            // 检查图片是否已加载完成
            const checkImageState = () => {
                if (img.complete && img.naturalWidth > 0) {
                    clearTimeout(timeoutId);
                    
                    if (controller.signal.aborted || imageContainer.dataset.loadId !== loadId) {
                        return;
                    }
                    
                    imageContainer.innerHTML = '';
                    imageContainer.appendChild(img);
                    
                    requestAnimationFrame(() => {
                        img.classList.add('loaded', 'quick-load');
                        img.style.opacity = '1';
                        imageContainer.dataset.loaded = 'true';
                        imageContainer.dataset.loading = 'false';
                        delete imageContainer.abortController;
                    });
                    return true;
                }
                return false;
            };
            
            // 立即检查一次
            if (checkImageState()) {
                return;
            }
            
            // 图片加载完成时立即显示
            img.onload = () => {
                clearTimeout(timeoutId);
                
                if (controller.signal.aborted || imageContainer.dataset.loadId !== loadId) {
                    return;
                }
                
                if (!img.complete || img.naturalWidth === 0) {
                    return;
                }
                
                requestAnimationFrame(() => {
                    if (!imageContainer || !imageContainer.parentNode) {
                        return;
                    }
                    
                    imageContainer.innerHTML = '';
                    imageContainer.appendChild(img);
                    
                    void imageContainer.offsetWidth;
                    
                    img.classList.add('loaded', 'quick-load');
                    img.style.opacity = '1';
                    
                    imageContainer.dataset.loaded = 'true';
                    imageContainer.dataset.loading = 'false';
                    
                    delete imageContainer.abortController;
                });
                
                if (!window.utils.state.loadedImages[productCode]) {
                    window.utils.state.loadedImages[productCode] = mainImageResult.url;
                }
                
                const cartItem = window.cart.state.items.find(it => it.code === productCode);
                if (cartItem && !cartItem.image) {
                    cartItem.image = mainImageResult.url;
                    window.cart.state.save();
                    window.cart.state.updateUI();
                }
            };
            
            img.onerror = (error) => {
                clearTimeout(timeoutId);
                
                if (controller.signal.aborted || imageContainer.dataset.loadId !== loadId) {
                    return;
                }
                
                showNoImagePlaceholder(imageContainer);
                imageContainer.dataset.loading = 'false';
                delete imageContainer.abortController;
            };
            
            // 如果Image对象还没有src，设置src
            if (!img.src) {
                img.src = mainImageResult.url;
            }
            
            // 设置一个定时检查
            setTimeout(() => {
                if (imageContainer.dataset.loading === 'true' && !controller.signal.aborted) {
                    if (checkImageState()) {
                        // 图片已就绪
                    }
                }
            }, 100);
            
            // 10秒超时
            timeoutId = setTimeout(() => {
                if (imageContainer.dataset.loading === 'true' && !controller.signal.aborted) {
                    checkImageState();
                }
            }, 10000);
            
        } else {
            if (controller.signal.aborted) return;
            if (timeoutId) clearTimeout(timeoutId);
            
            showNoImagePlaceholder(imageContainer);
            imageContainer.dataset.loading = 'false';
            delete imageContainer.abortController;
        }
    } catch (error) {
        console.error(`加载商品图片失败: ${productCode}`, error);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        if (controller.signal.aborted) return;
        
        showNoImagePlaceholder(imageContainer);
        imageContainer.dataset.loading = 'false';
        delete imageContainer.abortController;
    }
}

// 显示无图片占位符
function showNoImagePlaceholder(container) {
    if (container.dataset.loaded === 'true') return;
    
    container.innerHTML = `
        <div class="image-placeholder">
            <i class="fas fa-image"></i>
            <p>${window.translations.translate('noImage')}</p>
        </div>
    `;
    container.dataset.loaded = 'true';
    container.dataset.loading = 'false';
}

// 清理图片加载状态
function cleanupImageLoadingStates() {
    document.querySelectorAll('.product-image[data-loading="true"]').forEach(container => {
        if (container.abortController) {
            container.abortController.abort();
            delete container.abortController;
        }
        
        container.dataset.loading = 'false';
        container.dataset.loaded = 'false';
        delete container.dataset.loadId;
        delete container.dataset.cardCode;
    });
}

// 初始化懒加载
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        lazyImageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const imageContainer = entry.target;
                    const productCode = imageContainer.dataset.code;

                    if (productCode && imageContainer.dataset.loading !== 'true' && imageContainer.dataset.loaded !== 'true') {
                        loadProductCardImage(imageContainer, productCode);
                        lazyImageObserver.unobserve(imageContainer);
                    }
                }
            });
        }, {
            rootMargin: '200px 0px',
            threshold: 0.01
        });
    }
}

// 批量图片预加载
function preloadVisibleImages() {
    const viewportHeight = window.innerHeight;
    const scrollPosition = window.scrollY;
    
    const imageContainers = document.querySelectorAll('.product-image:not([data-loaded]):not([data-loading])');
    
    imageContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        const productCode = container.dataset.code;
        
        if (rect.top < viewportHeight + 200 && rect.bottom > -200) {
            loadProductCardImage(container, productCode);
        }
    });
}

// 设置商品卡片图片懒加载
function setupProductCardLazyLoading() {
    cleanupImageLoadingStates();
    
    if (lazyImageObserver) {
        lazyImageObserver.disconnect();
    }
    
    initializeLazyLoading();
    
    const imageContainers = document.querySelectorAll('.product-image:not([data-loaded])');
    imageContainers.forEach(container => {
        const productCode = container.dataset.code;
        if (!productCode) {
            const productCard = container.closest('.product-card');
            if (productCard && productCard.dataset.code) {
                container.dataset.code = productCard.dataset.code;
            }
        }
        
        if (lazyImageObserver) {
            lazyImageObserver.observe(container);
        } else {
            const productCode = container.dataset.code;
            if (productCode) {
                loadProductCardImage(container, productCode);
            }
        }
    });
}

// 图片模态框
function openImageModal(partCode, imageUrl, imageIndex = 0) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalImageInfo = document.getElementById('modal-image-info');
    
    modalImage.style.opacity = '0';
    modalImage.src = imageUrl;
    modalImage.alt = partCode;
    modalImageInfo.textContent = `${partCode} - ${window.translations.translate('image')} ${imageIndex + 1}`;
    
    modalImage.onload = function() {
        modalImage.style.opacity = '1';
    };
    
    modalImage.onerror = function() {
        modalImageInfo.textContent = `${window.translations.translate('imageNotFound')}: ${partCode}`;
        modalImage.src = '';
    };
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 快速加载商品详情主图
function quickLoadDetailMainImage(productCode, container, loadId) {
    if (window.utils.state.loadedImages[productCode]) {
        const cachedUrl = window.utils.state.loadedImages[productCode];
        
        const img = new Image();
        img.src = cachedUrl;
        img.alt = productCode;
        img.className = 'detail-image';
        img.decoding = 'async';
        
        container.innerHTML = '';
        container.appendChild(img);
        
        requestAnimationFrame(() => {
            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
            img.classList.add('loaded', 'quick-load');
        });
        
        img.addEventListener('click', function() {
            openImageModal(productCode, cachedUrl, 0);
        });
        
        return { success: true, url: cachedUrl };
    }
    
    return { success: false };
}

// 流式加载详情页图片
async function asyncLoadDetailImages(productCode, loadId) {
    try {
        const mainContainer = document.getElementById('carousel-main-image');
        const quickLoadResult = quickLoadDetailMainImage(productCode, mainContainer, loadId);
        
        // 清空并初始化缩略图容器
        const thumbnailContainer = document.getElementById('thumbnail-container');
        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = '';
        }
        
        // 初始化图片数组
        window.utils.state.currentCarouselImages = [];
        window.utils.state.currentProductCode = productCode;
        
        // ========== 1. 先处理主图 ==========
        findMainImage(productCode).then(mainImageResult => {
            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
            
            if (mainImageResult && mainImageResult.url) {
                // 添加主图到列表
                window.utils.state.currentCarouselImages.push(mainImageResult.url);
                
                // 显示主图
                if (!quickLoadResult.success) {
                    const img = mainImageResult.image || new Image();
                    img.className = 'detail-image';
                    img.alt = productCode;
                    img.decoding = 'async';
                    img.loading = 'eager';
                    
                    if (img.complete && img.naturalWidth > 0) {
                        img.classList.add('loaded', 'quick-load');
                    } else {
                        img.onload = () => {
                            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
                            img.classList.add('loaded', 'quick-load');
                        };
                        
                        if (!img.src) {
                            img.src = mainImageResult.url;
                        }
                    }
                    
                    mainContainer.innerHTML = '';
                    mainContainer.appendChild(img);
                    
                    img.addEventListener('click', function() {
                        openImageModal(productCode, mainImageResult.url, 0);
                    });
                }
                
                // 创建主图缩略图
                setTimeout(() => {
                    if (loadId !== window.imageLoader.currentCarouselLoadId) return;
                    createAndLoadThumbnail(
                        mainImageResult.url,
                        mainImageResult,
                        0,
                        productCode,
                        loadId,
                        thumbnailContainer
                    );
                }, 10);
            }
        });
        
        // ========== 2. 流式加载附加图片 ==========
        const foundAdditionalImages = [];
        
        const onImageFound = (url, imageObject, foundIndex) => {
            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
            
            const displayIndex = foundAdditionalImages.length + 1;
            foundAdditionalImages.push({url, imageObject});
            window.utils.state.currentCarouselImages.push(url);
            
            setTimeout(() => {
                if (loadId !== window.imageLoader.currentCarouselLoadId) return;
                createAndLoadThumbnail(
                    url,
                    { image: imageObject },
                    displayIndex,
                    productCode,
                    loadId,
                    thumbnailContainer
                );
            }, 10);
        };
        
        findAdditionalImages(productCode, onImageFound);
        
    } catch (error) {
        console.error('加载商品轮播图失败:', error);
        if (loadId !== window.imageLoader.currentCarouselLoadId) return;
        showCarouselError(document.getElementById('carousel-main-image'), productCode);
    }
}

// 创建并加载缩略图
function createAndLoadThumbnail(url, imageObject, index, productCode, loadId, container) {
    if (!container) {
        container = document.getElementById('thumbnail-container');
        if (!container) return null;
    }
    
    // 创建缩略图元素
    const thumbnail = document.createElement('div');
    thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
    thumbnail.dataset.index = index;
    thumbnail.dataset.url = url;
    
    // 显示骨架屏
    thumbnail.innerHTML = '<div class="skeleton-placeholder" style="width: 100%; height: 100%;"></div>';
    
    container.appendChild(thumbnail);
    
    setTimeout(() => {
        if (loadId !== window.imageLoader.currentCarouselLoadId) return;
        loadSingleThumbnailAsync(thumbnail, url, imageObject, index, productCode, loadId);
    }, index * 30);
    
    return thumbnail;
}

// 单个缩略图立即显示版本
function loadSingleThumbnailAsync(thumbnail, url, imageObject, index, productCode, loadId) {
    const loadStartTime = Date.now();
    thumbnail.dataset.loadStart = loadStartTime;
    
    const thumbnailNumber = index + 1;
    
    if (loadId !== window.imageLoader.currentCarouselLoadId) {
        return;
    }
    
    const img = imageObject && imageObject.image ? imageObject.image : new Image();
    img.alt = `${window.translations.translate('thumbnail')} ${thumbnailNumber}`;
    img.decoding = 'async';
    img.loading = 'eager';
    
    // 如果图片已经加载完成
    if (img.complete && img.naturalWidth > 0) {
        const loadEndTime = Date.now();
        
        const placeholder = thumbnail.querySelector('.skeleton-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        thumbnail.appendChild(img);
        
        requestAnimationFrame(() => {
            img.classList.add('loaded', 'quick-load');
            thumbnail.dataset.loading = 'false';
            thumbnail.dataset.displayed = 'true';
        });
        
        thumbnail.addEventListener('click', function onThumbnailClick() {
            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
            switchToImage(index, window.utils.state.currentCarouselImages, productCode);
        });
        
        return;
    }
    
    // 图片需要加载
    img.onload = function onImageLoad() {
        const loadEndTime = Date.now();
        thumbnail.dataset.loading = 'false';
        
        if (loadId !== window.imageLoader.currentCarouselLoadId) {
            return;
        }
        
        const placeholder = thumbnail.querySelector('.skeleton-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        thumbnail.appendChild(img);
        
        requestAnimationFrame(() => {
            img.classList.add('loaded', 'quick-load');
            thumbnail.dataset.displayed = 'true';
        });
        
        thumbnail.addEventListener('click', function onThumbnailClick() {
            if (loadId !== window.imageLoader.currentCarouselLoadId) return;
            switchToImage(index, window.utils.state.currentCarouselImages, productCode);
        });
        
        img.removeEventListener('load', onImageLoad);
    };
    
    img.onerror = function onImageError() {
        thumbnail.dataset.loading = 'false';
        thumbnail.dataset.error = 'true';
        
        if (loadId !== window.imageLoader.currentCarouselLoadId) {
            return;
        }
        
        const placeholder = thumbnail.querySelector('.skeleton-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        thumbnail.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
                <div style="text-align: center; padding: 5px;">
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 16px;"></i>
                    <div style="font-size: 9px; color: #e74c3c; margin-top: 2px;">加载失败</div>
                </div>
            </div>
        `;
        
        img.removeEventListener('error', onImageError);
    };
    
    // 开始加载图片
    if (!img.src) {
        img.src = url;
    }
    
    // 快速检查是否已加载完成
    setTimeout(() => {
        if (img.complete) {
            if (img.naturalWidth > 0) {
                img.dispatchEvent(new Event('load'));
            } else {
                img.dispatchEvent(new Event('error'));
            }
        }
    }, 50);
}

// 商品详情页图片加载函数
async function loadProductCarousel(productCode) {
    const loadId = ++window.imageLoader.currentCarouselLoadId;
    
    const mainImageContainer = document.getElementById('carousel-main-image');
    
    if (mainImageContainer) {
        mainImageContainer.innerHTML = '<div class="skeleton-placeholder"></div>';
    }
    
    asyncLoadDetailImages(productCode, loadId);
}

function showCarouselError(container, productCode) {
    container.innerHTML = `
        <div class="image-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${window.translations.translate('loadingFailed')}</p>
            <button class="retry-btn" onclick="window.imageLoader.retryLoadCarousel('${productCode}')">
                <i class="fas fa-redo"></i> ${window.translations.translate('retry')}
            </button>
        </div>
    `;
}

async function retryLoadCarousel(productCode) {
    imageCache.delete(`detail_${productCode}`);
    imageCache.delete(`additional_${productCode}`);
    imageCache.delete(`main_${productCode}`);
    
    loadProductCarousel(productCode);
}

// 切换图片函数
function switchToImage(index, images, productCode) {
    const mainContainer = document.getElementById('carousel-main-image');
    const url = images[index];
    
    if (url) {
        const newImg = new Image();
        newImg.alt = productCode;
        newImg.className = 'detail-image';
        newImg.decoding = 'async';
        
        newImg.onload = function() {
            newImg.classList.add('loaded', 'quick-load');
            mainContainer.innerHTML = '';
            mainContainer.appendChild(newImg);
            
            newImg.addEventListener('click', function() {
                openImageModal(productCode, url, index);
            });
            
            // 更新所有缩略图激活状态
            document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
                const thumbIndex = parseInt(thumb.dataset.index || i);
                thumb.classList.toggle('active', thumbIndex === index);
            });
        };
        
        newImg.onerror = function() {
            mainContainer.innerHTML = `
                <div class="image-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${window.translations.translate('imageLoadError')}</p>
                    <button class="retry-btn" onclick="switchToImage(${index}, ${JSON.stringify(images)}, '${productCode}')">
                        <i class="fas fa-redo"></i> ${window.translations.translate('retry')}
                    </button>
                </div>
            `;
        };
        
        newImg.src = url;
        
        if (newImg.complete) {
            newImg.onload();
        }
    }
}

// 导出图片加载模块
window.imageLoader = {
    ImageOptimizer,
    checkImageExists,
    checkIfImageIsCached,
    displayCachedImage,
    findMainImage,
    findAdditionalImages,
    loadProductCardImage,
    showNoImagePlaceholder,
    cleanupImageLoadingStates,
    initializeLazyLoading,
    preloadVisibleImages,
    setupProductCardLazyLoading,
    openImageModal,
    closeImageModal,
    quickLoadDetailMainImage,
    asyncLoadDetailImages,
    createAndLoadThumbnail,
    loadSingleThumbnailAsync,
    loadProductCarousel,
    showCarouselError,
    retryLoadCarousel,
    switchToImage,
    currentCarouselLoadId: 0
};