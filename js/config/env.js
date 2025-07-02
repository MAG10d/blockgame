/**
 * 環境變數配置
 * 用於管理遊戲的環境配置
 */

// 檢查是否在開發環境中（有 import.meta.env）
const isDev = typeof import !== 'undefined' && import.meta && import.meta.env;

// 從環境變數或預設值獲取配置
export const config = {
    // 多人遊戲伺服器 URL
    MULTIPLAYER_SERVER_URL: isDev 
        ? import.meta.env.VITE_MULTIPLAYER_SERVER_URL 
        : process.env.VITE_MULTIPLAYER_SERVER_URL || 'wss://your-worker.workers.dev',
    
    // 遊戲版本
    GAME_VERSION: isDev 
        ? import.meta.env.VITE_GAME_VERSION 
        : process.env.VITE_GAME_VERSION || '1.0.0',
    
    // 調試模式
    DEBUG_MODE: isDev 
        ? import.meta.env.VITE_DEBUG_MODE === 'true' 
        : process.env.VITE_DEBUG_MODE === 'true' || false,
    
    // 備用伺服器 URL（用於 GitHub Pages 等靜態託管）
    FALLBACK_SERVER_URL: 'wss://survivor-game-server.laukwantingabc123.workers.dev'
};

// 如果沒有配置伺服器 URL，使用備用 URL
if (!config.MULTIPLAYER_SERVER_URL || config.MULTIPLAYER_SERVER_URL === 'wss://your-worker.workers.dev') {
    config.MULTIPLAYER_SERVER_URL = config.FALLBACK_SERVER_URL;
}

// 在開發模式下輸出配置信息
if (config.DEBUG_MODE) {
    console.log('🔧 遊戲配置:', config);
}

export default config; 