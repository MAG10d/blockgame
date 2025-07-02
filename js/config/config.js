/**
 * 遊戲配置檔案
 * GitHub Actions 會自動注入 window.CONFIG，本地開發使用預設值
 */

export const config = {
    // 🔧 伺服器 URL (GitHub Actions 會覆蓋此值)
    SERVER_URL: 'wss://survivor-game-server.laukwantingabc123.workers.dev',
    
    GAME_VERSION: '1.0.0',
    DEBUG_MODE: false,
    
    // 遊戲設定
    MAX_PLAYERS: 4,
    GAME_TITLE: 'Project Survivor - 多人生存遊戲',
    
    // 網路設定
    CONNECTION_TIMEOUT: 5000,
    RECONNECT_ATTEMPTS: 3,
    PING_INTERVAL: 1000
};

// 如果 GitHub Actions 注入了配置，使用注入的值
if (window.CONFIG) {
    console.log('🔄 使用 GitHub Actions 注入的配置');
    Object.assign(config, window.CONFIG);
} else {
    console.log('🏠 使用本地開發配置');
}

console.log('🎮 最終遊戲配置:', config);

export default config; 