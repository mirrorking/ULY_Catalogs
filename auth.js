// auth.js - 验证码管理系统（Gist同步版）
class AuthManager {
    constructor() {
        this.config = {
            defaultCode: "ULY2024",
            storageCodeKey: 'uly_verification_code',
            storageKey: 'uly_access_token',
            attemptsKey: 'uly_login_attempts',
            lockKey: 'uly_locked_until',
            maxAttempts: 3,
            lockTime: 5 * 60 * 1000, // 5分钟
            
            // Gist 配置（从admin.html配置）
            gistId: '', // 将由admin页面设置
            cacheTime: 2 * 60 * 1000, // 缓存2分钟
        };
        
        // 加载本地存储的Gist配置
        this.loadGistConfig();
        
        console.log('AuthManager 初始化完成');
    }
    
    // 加载Gist配置
    loadGistConfig() {
        try {
            const config = localStorage.getItem('uly_gist_config');
            if (config) {
                const { gistId } = JSON.parse(config);
                if (gistId) {
                    this.config.gistId = gistId;
                }
            }
        } catch (error) {
            console.warn('加载Gist配置失败:', error);
        }
    }
    
    // 获取验证码（优先从Gist）
    async getCode() {
        // 1. 尝试从Gist获取（有缓存）
        if (this.config.gistId) {
            try {
                const gistCode = await this.getCodeFromGist();
                if (gistCode) {
                    return gistCode;
                }
            } catch (error) {
                console.warn('从Gist获取失败，使用本地:', error);
            }
        }
        
        // 2. 从本地存储获取
        const localCode = this.getCodeFromLocalStorage();
        if (localCode) {
            return localCode;
        }
        
        // 3. 使用默认值
        return this.config.defaultCode;
    }
    
    // 从Gist获取验证码（带缓存）
    async getCodeFromGist() {
        if (!this.config.gistId) return null;
        
        // 检查缓存
        const cacheKey = 'uly_gist_cache';
        const cacheTimeKey = 'uly_gist_cache_time';
        
        const cachedTime = localStorage.getItem(cacheTimeKey);
        const cachedCode = localStorage.getItem(cacheKey);
        
        // 如果缓存有效（2分钟内），使用缓存
        if (cachedTime && cachedCode) {
            const cacheAge = Date.now() - parseInt(cachedTime);
            if (cacheAge < this.config.cacheTime) {
                return cachedCode;
            }
        }
        
        // 从Gist获取最新
        try {
            const gistUrl = `https://gist.githubusercontent.com/raw/${this.config.gistId}/uly_config.json`;
            
            const response = await fetch(gistUrl, {
                cache: 'no-cache',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.code) {
                const cleanCode = this.sanitizeInput(data.code);
                
                // 缓存结果
                localStorage.setItem(cacheKey, cleanCode);
                localStorage.setItem(cacheTimeKey, Date.now().toString());
                localStorage.setItem(this.config.storageCodeKey, cleanCode);
                
                return cleanCode;
            }
        } catch (error) {
            console.warn('从Gist获取验证码失败:', error);
            // 如果获取失败但有旧缓存，使用旧缓存
            if (cachedCode) {
                return cachedCode;
            }
        }
        
        return null;
    }
    
    // 从本地存储获取
    getCodeFromLocalStorage() {
        try {
            return localStorage.getItem(this.config.storageCodeKey);
        } catch {
            return null;
        }
    }
    
    // 保存到本地存储
    saveCodeToLocalStorage(code) {
        try {
            localStorage.setItem(this.config.storageCodeKey, code);
            return true;
        } catch {
            return false;
        }
    }
    
    // 更新验证码（本地）
    updateCode(newCode) {
        const cleanCode = this.sanitizeInput(newCode);
        
        if (cleanCode && cleanCode.length >= 4) {
            this.saveCodeToLocalStorage(cleanCode);
            
            return {
                success: true,
                message: '验证码更新成功',
                code: cleanCode
            };
        }
        
        return {
            success: false,
            message: '验证码更新失败，请检查输入'
        };
    }
    
    // 验证输入
    validate(inputCode) {
        // 先获取当前有效验证码
        const currentCode = this.getCurrentCodeSync();
        
        if (this.isLocked()) {
            return {
                success: false,
                message: `账号已被锁定，请 ${this.getRemainingLockTime()} 后再试`,
                locked: true
            };
        }
        
        const cleanCode = this.sanitizeInput(inputCode);
        
        if (cleanCode === currentCode) {
            this.clearFailedAttempts();
            
            // 创建访问令牌
            const tokenData = {
                authenticated: true,
                expires: Date.now() + (24 * 60 * 60 * 1000), // 24小时
                timestamp: Date.now()
            };
            
            try {
                const token = btoa(JSON.stringify(tokenData));
                localStorage.setItem(this.config.storageKey, token);
                
                return {
                    success: true,
                    message: "验证成功！正在跳转..."
                };
            } catch (error) {
                return {
                    success: false,
                    message: "系统错误，请刷新页面后重试"
                };
            }
        } else {
            const result = this.recordFailedAttempt();
            
            return {
                success: false,
                message: result.locked ? 
                    `验证码错误，账号已被锁定，请 ${this.getRemainingLockTime()} 后再试` : 
                    `验证码错误，还剩 ${result.remainingAttempts} 次尝试机会`,
                locked: result.locked,
                remainingAttempts: result.remainingAttempts
            };
        }
    }
    
    // 同步获取当前验证码（用于验证）
    getCurrentCodeSync() {
        // 优先使用缓存
        const cachedCode = localStorage.getItem('uly_gist_cache');
        if (cachedCode) return cachedCode;
        
        // 使用本地存储
        const localCode = this.getCodeFromLocalStorage();
        if (localCode) return localCode;
        
        // 默认值
        return this.config.defaultCode;
    }
    
    // 检查是否已认证
    isAuthenticated() {
        try {
            const token = localStorage.getItem(this.config.storageKey);
            if (!token) return false;
            
            const data = JSON.parse(atob(token));
            return Date.now() < data.expires;
        } catch {
            return false;
        }
    }
    
    isLocked() {
        try {
            const lockUntil = localStorage.getItem(this.config.lockKey);
            if (!lockUntil) return false;
            
            const lockTime = parseInt(lockUntil);
            const isLocked = Date.now() < lockTime;
            
            if (!isLocked) this.clearFailedAttempts();
            
            return isLocked;
        } catch {
            return false;
        }
    }
    
    recordFailedAttempt() {
        let attempts = 0;
        try {
            attempts = parseInt(localStorage.getItem(this.config.attemptsKey) || '0') + 1;
            localStorage.setItem(this.config.attemptsKey, attempts.toString());
        } catch {
            attempts = 1;
        }
        
        if (attempts >= this.config.maxAttempts) {
            const lockUntil = Date.now() + this.config.lockTime;
            try {
                localStorage.setItem(this.config.lockKey, lockUntil.toString());
                return { locked: true, remainingAttempts: 0, attempts };
            } catch {
                return { locked: false, remainingAttempts: this.config.maxAttempts - attempts, attempts };
            }
        }
        
        return { locked: false, remainingAttempts: this.config.maxAttempts - attempts, attempts };
    }
    
    getRemainingLockTime() {
        try {
            const lockUntil = localStorage.getItem(this.config.lockKey);
            if (!lockUntil) return "0分钟";
            
            const remaining = parseInt(lockUntil) - Date.now();
            if (remaining <= 0) return "0分钟";
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            if (minutes > 0) {
                return `${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`;
            }
            return `${seconds}秒`;
        } catch {
            return "未知时间";
        }
    }
    
    clearFailedAttempts() {
        try {
            localStorage.removeItem(this.config.attemptsKey);
            localStorage.removeItem(this.config.lockKey);
        } catch {}
    }
    
    checkLockStatus() {
        try {
            const lockUntil = localStorage.getItem(this.config.lockKey);
            if (lockUntil && Date.now() > parseInt(lockUntil)) {
                this.clearFailedAttempts();
            }
        } catch {}
    }
    
    logout() {
        try {
            localStorage.removeItem(this.config.storageKey);
            this.clearFailedAttempts();
            return true;
        } catch {
            return false;
        }
    }
    
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        let clean = input.replace(/<[^>]*>/g, '');
        clean = clean.replace(/[<>"'`]/g, '');
        clean = clean.replace(/on\w+=/gi, '');
        clean = clean.replace(/javascript:/gi, '');
        clean = clean.trim();
        clean = clean.substring(0, 100);
        
        return clean;
    }
    
    // 重定向到验证页面的工具方法 - 改进版
    static redirectToAuth(returnTo) {
        console.log('重定向到验证页面，返回目标:', returnTo);
        
        // 保存当前页面作为来源
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage !== 'auth.html') {
            sessionStorage.setItem('uly_previous_page', currentPage);
            console.log('记录当前页面:', currentPage);
        }
        
        // 如果有指定的返回页面，保存它（优先级最高）
        if (returnTo && returnTo !== 'auth.html') {
            sessionStorage.setItem('uly_return_page', returnTo);
            console.log('设置返回页面:', returnTo);
            
            // 构建验证页面的URL，包含返回参数
            const authUrl = 'auth.html' + `?return=${encodeURIComponent(returnTo)}`;
            window.location.href = authUrl;
        } else {
            // 没有指定返回页面，直接跳转到验证页面
            window.location.href = 'auth.html';
        }
    }
    
    // 检查并重定向到验证页面的便捷方法
    static requireAuth(returnTo) {
        const authManager = window.authManager || new AuthManager();
        
        if (!authManager.isAuthenticated()) {
            console.log('用户未认证，重定向到验证页面');
            
            // 如果没有指定返回页面，使用当前页面
            const targetPage = returnTo || window.location.pathname.split('/').pop() || 'index.html';
            
            // 重定向到验证页面
            AuthManager.redirectToAuth(targetPage);
            
            return false;
        }
        
        return true;
    }
}

// 创建全局实例
const authManager = new AuthManager();

// 确保在全局作用域可访问
if (typeof window !== 'undefined') {
    window.authManager = authManager;
    window.AuthManager = AuthManager;
    console.log('AuthManager 已全局注册');
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, authManager };
}