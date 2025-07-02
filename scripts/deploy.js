/**
 * 部署腳本
 * 用於在部署時替換配置檔案中的變數
 */

const fs = require('fs');
const path = require('path');

// 從環境變數或預設值獲取配置
const SERVER_URL = process.env.VITE_MULTIPLAYER_SERVER_URL || 'wss://survivor-game-server.laukwantingabc123.workers.dev';
const GAME_VERSION = process.env.VITE_GAME_VERSION || '1.0.0';
const DEBUG_MODE = process.env.VITE_DEBUG_MODE === 'true';

// 生成配置檔案內容
const configContent = `/**
 * 自動生成的配置檔案
 * 請勿手動修改此檔案
 */

export const config = {
    SERVER_URL: '${SERVER_URL}',
    GAME_VERSION: '${GAME_VERSION}',
    DEBUG_MODE: ${DEBUG_MODE},
    MAX_PLAYERS: 4,
    GAME_TITLE: 'Project Survivor - 多人生存遊戲',
    BUILD_TIME: '${new Date().toISOString()}'
};

console.log('🚀 部署配置載入:', config);

export default config;
`;

// 寫入配置檔案
const configPath = path.join(__dirname, '../js/config/config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✅ 配置檔案已生成:', configPath);
console.log('📡 伺服器 URL:', SERVER_URL); 