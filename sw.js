// Service Worker 版本
const VERSION = '2.1.0';
const CACHE_NAME = `parts-catalog-v${VERSION}`;

// 需要预缓存的资源
const PRECACHE_RESOURCES = [
    './',
    './style.css',
    './index.html',
    './auth.html',
    './basic-directory.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
];

// 安装事件
self.addEventListener('install', event => {
    console.log('[Service Worker] 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] 预缓存核心资源');
                // 只缓存成功的资源
                return Promise.all(
                    PRECACHE_RESOURCES.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                                return Promise.resolve();
                            })
                            .catch(error => {
                                console.log(`[Service Worker] 预缓存失败: ${url}`, error);
                                return Promise.resolve();
                            });
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] 安装完成');
                // 立即激活新Service Worker
                return self.skipWaiting();
            })
            .catch(error => {
                console.log('[Service Worker] 安装失败:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    console.log('[Service Worker] 激活中...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 删除不是当前版本的缓存
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[Service Worker] 删除旧缓存: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[Service Worker] 激活完成');
            // 立即控制所有客户端
            return self.clients.claim();
        })
        .catch(error => {
            console.log('[Service Worker] 激活失败:', error);
        })
    );
});

// 拦截网络请求 - 简化版本
self.addEventListener('fetch', event => {
    // 只处理GET请求
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // 图片请求特殊处理
    if (url.pathname.includes('/images/') || url.pathname.includes('/Info/')) {
        event.respondWith(handleImageRequest(event.request));
        return;
    }
    
    // JSON数据请求特殊处理
    if (url.pathname.includes('.json')) {
        event.respondWith(handleJsonRequest(event.request));
        return;
    }
    
    // 其他请求使用网络优先策略
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 如果请求成功，缓存响应
                if (response.ok && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 网络失败，尝试从缓存获取
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // 如果缓存也没有，返回离线页面
                        if (event.request.mode === 'navigate') {
                            return caches.match('./');
                        }
                        return new Response('网络连接失败', { 
                            status: 408, 
                            headers: { 'Content-Type': 'text/plain' } 
                        });
                    });
            })
    );
});

// 处理图片请求 - 简化版本
async function handleImageRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // 先检查缓存
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        // 后台更新缓存
        fetch(request)
            .then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => {}); // 静默处理错误
        return cachedResponse;
    }
    
    // 尝试从网络获取
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存成功的图片响应
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error('图片请求失败');
    } catch (error) {
        console.log('[Service Worker] 图片加载失败:', request.url);
        // 返回占位图
        return generatePlaceholderImage(request.url);
    }
}

// 处理JSON请求
async function handleJsonRequest(request) {
    try {
        // 尝试从网络获取最新数据
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存数据
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error('JSON请求失败');
    } catch (error) {
        // 网络失败，尝试从缓存获取
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // 如果缓存也没有，返回错误
        return new Response(JSON.stringify({ 
            error: '网络连接失败，无法加载数据' 
        }), {
            status: 408,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 生成占位图片
function generatePlaceholderImage(url) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
            <rect width="400" height="300" fill="#f0f0f0"/>
            <circle cx="200" cy="120" r="40" fill="#ccc"/>
            <rect x="120" y="180" width="160" height="20" rx="10" fill="#ddd"/>
            <rect x="140" y="210" width="120" height="15" rx="7.5" fill="#ddd"/>
            <text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">
                图片加载失败
            </text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'max-age=3600'
        }
    });
}

// 监听消息
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log(`[Service Worker] 清理缓存: ${cacheName}`);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
});