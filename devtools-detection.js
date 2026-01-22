// devtools-detection-v2.js - 优化版的开发者工具检测
(function() {
    'use strict';
    
    // 检查是否已经存在错误页面，避免循环重定向
    if (window.location.pathname.indexOf('error.html') !== -1) {
        return;
    }
    
    let isDevToolsOpen = false;
    
    // 跳转到错误页面
    function redirectToError() {
        if (!isDevToolsOpen && window.location.pathname.indexOf('error.html') === -1) {
            isDevToolsOpen = true;
            console.log('安全检测触发，跳转到错误页面');
            try {
                window.location.replace('error.html');
            } catch (error) {
                console.error('跳转失败:', error);
            }
        }
    }
    
    // 禁用右键菜单
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        redirectToError();
        return false;
    });
    
    // 禁用快捷键
    document.addEventListener('keydown', function(e) {
        // 阻止F12等开发工具快捷键
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            redirectToError();
            return false;
        }
    });
    
    // 优化的开发者工具检测
    function detectDevTools() {
        if (isDevToolsOpen) return true;
        
        const threshold = 160;
        
        // 检测窗口大小差异
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        
        if (widthDiff > threshold || heightDiff > threshold) {
            redirectToError();
            return true;
        }
        
        // 检测debugger（不触发onbeforeunload）
        try {
            const startTime = Date.now();
            // 创建一个不可见的debugger
            const element = document.createElement('div');
            element.style.display = 'none';
            document.body.appendChild(element);
            
            // 使用getter进行检测
            Object.defineProperty(element, 'offsetHeight', {
                get: function() {
                    if (Date.now() - startTime > 100) {
                        redirectToError();
                    }
                    return 0;
                }
            });
            
            // 触发getter
            const height = element.offsetHeight;
            document.body.removeChild(element);
            
        } catch (error) {
            // 忽略错误
        }
        
        return false;
    }
    
    // 防止拖拽和选择
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // 防止复制
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    
    // 初始化检测
    function initDetection() {
        console.log('开发者工具检测已启动（优化版）');
        
        // 定期检测（减少频率以降低性能影响）
        setInterval(detectDevTools, 3000);
        
        // 窗口大小变化时检测
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(detectDevTools, 500);
        });
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDetection);
    } else {
        initDetection();
    }
    
})();