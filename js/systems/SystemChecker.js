/**
 * 多人遊戲系統檢查工具
 * 幫助診斷和驗證多人連線系統是否正確設置
 */

export class SystemChecker {
    constructor() {
        this.checks = [];
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }
    
    /**
     * 執行所有系統檢查
     * @returns {Promise<Object>} 檢查結果
     */
    async runAllChecks() {
        console.log('🔍 開始多人遊戲系統檢查...');
        
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        
        // 執行各項檢查
        await this.checkBasicSetup();
        await this.checkConfiguration();
        await this.checkNetworkConnectivity();
        await this.checkBrowserCompatibility();
        await this.checkGameSystems();
        
        // 輸出結果摘要
        this.logResults();
        
        return this.results;
    }
    
    /**
     * 檢查基本設置
     */
    async checkBasicSetup() {
        this.addCheck('基本設置檢查', '正在檢查必要文件和依賴...', 'info');
        
        // 檢查 PIXI.js
        if (typeof PIXI !== 'undefined') {
            this.addCheck('✅ PIXI.js', 'PIXI.js 已正確載入', 'success');
        } else {
            this.addCheck('❌ PIXI.js', 'PIXI.js 未載入，請檢查 HTML 中的腳本引用', 'error');
        }
        
        // 檢查多人系統文件
        try {
            const { MultiplayerSystem } = await import('./MultiplayerSystem.js');
            this.addCheck('✅ 多人系統', 'MultiplayerSystem 模組已載入', 'success');
        } catch (error) {
            this.addCheck('❌ 多人系統', `無法載入 MultiplayerSystem: ${error.message}`, 'error');
        }
        
        try {
            const { GameModeManager } = await import('./GameModeManager.js');
            this.addCheck('✅ 遊戲模式管理器', 'GameModeManager 模組已載入', 'success');
        } catch (error) {
            this.addCheck('❌ 遊戲模式管理器', `無法載入 GameModeManager: ${error.message}`, 'error');
        }
        
        try {
            const { MultiplayerRenderer } = await import('./MultiplayerRenderer.js');
            this.addCheck('✅ 多人渲染器', 'MultiplayerRenderer 模組已載入', 'success');
        } catch (error) {
            this.addCheck('❌ 多人渲染器', `無法載入 MultiplayerRenderer: ${error.message}`, 'error');
        }
    }
    
    /**
     * 檢查配置
     */
    async checkConfiguration() {
        this.addCheck('配置檢查', '正在檢查遊戲配置...', 'info');
        
        try {
            const { config } = await import('../config/config.js');
            
            if (config.SERVER_URL) {
                if (config.SERVER_URL.includes('localhost') || config.SERVER_URL.includes('127.0.0.1')) {
                    this.addCheck('⚠️ 伺服器 URL', `使用本地伺服器: ${config.SERVER_URL}`, 'warning');
                } else if (config.SERVER_URL.includes('.workers.dev')) {
                    this.addCheck('✅ 伺服器 URL', `使用 Cloudflare Workers: ${config.SERVER_URL}`, 'success');
                } else {
                    this.addCheck('⚠️ 伺服器 URL', `自定義伺服器: ${config.SERVER_URL}`, 'warning');
                }
            } else {
                this.addCheck('❌ 伺服器 URL', '未設置伺服器 URL', 'error');
            }
            
            // 檢查其他配置
            if (config.MAX_PLAYERS >= 2 && config.MAX_PLAYERS <= 8) {
                this.addCheck('✅ 最大玩家數', `設置為 ${config.MAX_PLAYERS} 玩家`, 'success');
            } else {
                this.addCheck('⚠️ 最大玩家數', `玩家數設置可能不當: ${config.MAX_PLAYERS}`, 'warning');
            }
            
        } catch (error) {
            this.addCheck('❌ 配置載入', `無法載入配置文件: ${error.message}`, 'error');
        }
    }
    
    /**
     * 檢查網路連接
     */
    async checkNetworkConnectivity() {
        this.addCheck('網路連接檢查', '正在測試伺服器連接...', 'info');
        
        try {
            const { config } = await import('../config/config.js');
            const httpUrl = config.SERVER_URL
                .replace('wss://', 'https://')
                .replace('ws://', 'http://');
            
            // 測試 HTTP 連接
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch(`${httpUrl}/`, {
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    this.addCheck('✅ HTTP 連接', '伺服器 HTTP 連接正常', 'success');
                } else {
                    this.addCheck('⚠️ HTTP 連接', `伺服器回應狀態: ${response.status}`, 'warning');
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    this.addCheck('❌ HTTP 連接', '連接逾時（5秒）', 'error');
                } else {
                    this.addCheck('❌ HTTP 連接', `連接失敗: ${fetchError.message}`, 'error');
                }
            }
            
            // 測試 WebSocket 連接
            try {
                const testWs = new WebSocket(`${config.SERVER_URL}?roomId=test&playerId=test`);
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        testWs.close();
                        reject(new Error('WebSocket 連接逾時'));
                    }, 5000);
                    
                    testWs.onopen = () => {
                        clearTimeout(timeout);
                        testWs.close();
                        resolve();
                    };
                    
                    testWs.onerror = (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    };
                });
                
                this.addCheck('✅ WebSocket 連接', 'WebSocket 連接測試成功', 'success');
            } catch (wsError) {
                this.addCheck('❌ WebSocket 連接', `WebSocket 連接失敗: ${wsError.message}`, 'error');
            }
            
        } catch (error) {
            this.addCheck('❌ 網路測試', `網路測試失敗: ${error.message}`, 'error');
        }
    }
    
    /**
     * 檢查瀏覽器兼容性
     */
    async checkBrowserCompatibility() {
        this.addCheck('瀏覽器兼容性檢查', '正在檢查瀏覽器功能支援...', 'info');
        
        // 檢查 WebSocket 支援
        if (typeof WebSocket !== 'undefined') {
            this.addCheck('✅ WebSocket', '瀏覽器支援 WebSocket', 'success');
        } else {
            this.addCheck('❌ WebSocket', '瀏覽器不支援 WebSocket', 'error');
        }
        
        // 檢查 ES6 模組支援（通過檢查是否支持動態 import）
        try {
            // 測試動態 import 是否可用
            if (typeof window.import === 'function' || 'import' in window) {
                this.addCheck('✅ ES6 模組', '瀏覽器支援 ES6 模組', 'success');
            } else {
                this.addCheck('✅ ES6 模組', '瀏覽器支援 ES6 模組（靜態檢測）', 'success');
            }
        } catch (e) {
            this.addCheck('✅ ES6 模組', '瀏覽器支援 ES6 模組（當前已在使用）', 'success');
        }
        
        // 檢查 Canvas 支援
        const canvas = document.createElement('canvas');
        if (canvas.getContext && canvas.getContext('2d')) {
            this.addCheck('✅ Canvas 2D', '瀏覽器支援 Canvas 2D', 'success');
        } else {
            this.addCheck('❌ Canvas 2D', '瀏覽器不支援 Canvas 2D', 'error');
        }
        
        // 檢查 WebGL 支援
        try {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                this.addCheck('✅ WebGL', '瀏覽器支援 WebGL', 'success');
            } else {
                this.addCheck('⚠️ WebGL', '瀏覽器不支援 WebGL，可能影響遊戲性能', 'warning');
            }
        } catch (e) {
            this.addCheck('⚠️ WebGL', 'WebGL 檢測失敗', 'warning');
        }
    }
    
    /**
     * 檢查遊戲系統
     */
    async checkGameSystems() {
        this.addCheck('遊戲系統檢查', '正在檢查遊戲系統完整性...', 'info');
        
        // 檢查遊戲容器
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this.addCheck('✅ 遊戲容器', '遊戲容器元素存在', 'success');
        } else {
            this.addCheck('❌ 遊戲容器', '找不到 #game-container 元素', 'error');
        }
        
        // 檢查多人遊戲按鈕（如果已創建）
        const multiplayerButtons = document.querySelectorAll('button[onclick*="多人遊戲"], button:contains("多人遊戲")');
        if (multiplayerButtons.length > 0) {
            this.addCheck('✅ 多人遊戲 UI', '多人遊戲按鈕已創建', 'success');
        } else {
            this.addCheck('⚠️ 多人遊戲 UI', '多人遊戲按鈕尚未創建（遊戲初始化時會創建）', 'warning');
        }
    }
    
    /**
     * 添加檢查結果
     */
    addCheck(title, message, type) {
        const result = {
            title,
            message,
            type,
            timestamp: new Date().toISOString()
        };
        
        this.results.details.push(result);
        
        switch (type) {
            case 'success':
                this.results.passed++;
                break;
            case 'error':
                this.results.failed++;
                break;
            case 'warning':
                this.results.warnings++;
                break;
        }
        
        // 根據類型選擇控制台輸出方法
        const logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
        console[logMethod](`${title}: ${message}`);
    }
    
    /**
     * 輸出檢查結果摘要
     */
    logResults() {
        console.log('\n🎯 多人遊戲系統檢查完成！');
        console.log('=====================================');
        console.log(`✅ 通過: ${this.results.passed}`);
        console.log(`⚠️ 警告: ${this.results.warnings}`);
        console.log(`❌ 失敗: ${this.results.failed}`);
        console.log('=====================================');
        
        if (this.results.failed === 0) {
            if (this.results.warnings === 0) {
                console.log('🎉 完美！多人遊戲系統已準備就緒！');
            } else {
                console.log('✅ 良好！多人遊戲系統基本就緒，建議檢查警告項目。');
            }
        } else {
            console.log('⚠️ 發現問題！請檢查失敗項目後再測試多人遊戲。');
        }
    }
    
    /**
     * 獲取檢查結果的 HTML 報告
     */
    getHTMLReport() {
        const html = `
            <div style="font-family: monospace; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 10px;">
                <h3>🔍 多人遊戲系統檢查報告</h3>
                <div style="margin: 10px 0;">
                    <span style="color: green;">✅ 通過: ${this.results.passed}</span> | 
                    <span style="color: orange;">⚠️ 警告: ${this.results.warnings}</span> | 
                    <span style="color: red;">❌ 失敗: ${this.results.failed}</span>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${this.results.details.map(detail => `
                        <div style="margin: 5px 0; padding: 5px; background: white; border-radius: 4px;">
                            <strong>${detail.title}</strong><br>
                            <span style="color: ${this.getColorForType(detail.type)};">${detail.message}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        return html;
    }
    
    getColorForType(type) {
        switch (type) {
            case 'success': return 'green';
            case 'warning': return 'orange';
            case 'error': return 'red';
            default: return 'blue';
        }
    }
}

// 全域快速檢查函數
window.checkMultiplayerSystem = async () => {
    const checker = new SystemChecker();
    const results = await checker.runAllChecks();
    
    // 在頁面上顯示結果（如果可能）
    try {
        const reportDiv = document.createElement('div');
        reportDiv.innerHTML = checker.getHTMLReport();
        reportDiv.style.position = 'fixed';
        reportDiv.style.top = '10px';
        reportDiv.style.right = '10px';
        reportDiv.style.width = '400px';
        reportDiv.style.zIndex = '10000';
        reportDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '5px';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'red';
        closeBtn.style.color = 'white';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.width = '25px';
        closeBtn.style.height = '25px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => reportDiv.remove();
        
        reportDiv.appendChild(closeBtn);
        document.body.appendChild(reportDiv);
    } catch (e) {
        console.warn('無法在頁面上顯示檢查報告，請查看控制台輸出');
    }
    
    return results;
};

console.log('🔧 多人遊戲系統檢查工具已載入');
console.log('💡 使用 checkMultiplayerSystem() 執行完整檢查'); 