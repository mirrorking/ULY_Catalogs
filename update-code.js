// update-code.js - 自动更新验证码脚本
const fs = require('fs');
const path = require('path');

class CodeUpdater {
    constructor() {
        this.configFile = path.join(__dirname, 'auth-config.json');
        this.authFile = path.join(__dirname, 'auth.js');
        this.loadConfig();
    }
    
    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf8');
                this.config = JSON.parse(data);
            } else {
                // 默认配置
                this.config = {
                    updateInterval: 30, // 30天更新一次
                    lastUpdate: null,
                    nextUpdate: null,
                    history: []
                };
                this.saveConfig();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.config = {};
        }
    }
    
    saveConfig() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    generateCode() {
        // 生成6位随机验证码（包含字母和数字）
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    updateCode() {
        const newCode = this.generateCode();
        const updateTime = new Date().toISOString();
        
        try {
            // 更新auth.js文件中的验证码
            let authContent = fs.readFileSync(this.authFile, 'utf8');
            
            // 查找并替换验证码
            const regex = /code: "([^"]+)"/;
            authContent = authContent.replace(regex, `code: "${newCode}"`);
            
            fs.writeFileSync(this.authFile, authContent, 'utf8');
            
            // 更新配置
            this.config.lastUpdate = updateTime;
            this.config.nextUpdate = this.calculateNextUpdate();
            this.config.history.push({
                code: newCode,
                date: updateTime
            });
            
            // 保留最近10次更新记录
            if (this.config.history.length > 10) {
                this.config.history = this.config.history.slice(-10);
            }
            
            this.saveConfig();
            
            console.log(`验证码已更新为: ${newCode} (${updateTime})`);
            console.log(`下次更新: ${this.config.nextUpdate}`);
            
            return newCode;
        } catch (error) {
            console.error('更新验证码失败:', error);
            return null;
        }
    }
    
    calculateNextUpdate() {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + this.config.updateInterval);
        return nextDate.toISOString();
    }
    
    checkAndUpdate() {
        if (!this.config.nextUpdate) {
            // 首次运行，设置下次更新时间
            this.config.nextUpdate = this.calculateNextUpdate();
            this.saveConfig();
            console.log('首次运行，设置下次更新时间为:', this.config.nextUpdate);
            return false;
        }
        
        const now = new Date();
        const nextUpdate = new Date(this.config.nextUpdate);
        
        if (now >= nextUpdate) {
            console.log('检测到需要更新验证码...');
            return this.updateCode();
        } else {
            const daysLeft = Math.ceil((nextUpdate - now) / (1000 * 60 * 60 * 24));
            console.log(`验证码有效，距离下次更新还有 ${daysLeft} 天`);
            return false;
        }
    }
}

// 使用示例
const updater = new CodeUpdater();

// 手动更新
// updater.updateCode();

// 检查并自动更新
updater.checkAndUpdate();