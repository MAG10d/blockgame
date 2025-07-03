export class GameModeManager {
    constructor() {
        this.currentMode = 'singleplayer'; // 'singleplayer' | 'multiplayer'
        this.multiplayerSystem = null;
        this.eventHandlers = new Map();
        
        // 多人遊戲專用的遊戲對象
        this.remotePlayers = new Map(); // playerId -> Player instance
        this.multiplayerEnemies = new Map(); // enemyId -> Enemy instance
        this.multiplayerXPOrbs = new Map(); // orbId -> XPOrb instance
        this.multiplayerProjectiles = new Map(); // projectileId -> Projectile instance
        
        this.isGameStarted = false;
    }
    
    // 事件系統
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => handler(data));
        }
    }
    
    // 設置多人遊戲系統
    setMultiplayerSystem(multiplayerSystem) {
        this.multiplayerSystem = multiplayerSystem;
        
        // 監聽多人遊戲事件
        this.multiplayerSystem.on('state_update', (gameState) => {
            this.handleMultiplayerStateUpdate(gameState);
        });
        
        this.multiplayerSystem.on('disconnected', () => {
            this.switchToSingleplayer();
        });
    }
    
    // 切換到單人模式
    switchToSingleplayer() {
        console.log('切換到單人模式');
        this.currentMode = 'singleplayer';
        this.isGameStarted = false;
        this.clearMultiplayerObjects();
        this.emit('mode_changed', { mode: 'singleplayer' });
    }
    
    // 切換到多人模式
    switchToMultiplayer() {
        console.log('切換到多人模式');
        this.currentMode = 'multiplayer';
        this.emit('mode_changed', { mode: 'multiplayer' });
    }
    
    // 開始多人遊戲
    startMultiplayerGame() {
        if (this.currentMode !== 'multiplayer') {
            console.warn('不在多人模式下，無法開始多人遊戲');
            return;
        }
        
        this.isGameStarted = true;
        this.emit('multiplayer_game_started');
        console.log('多人遊戲已開始');
    }
    
    // 處理多人遊戲狀態更新
    handleMultiplayerStateUpdate(gameState) {
        if (!this.isMultiplayerMode()) return;
        
        this.emit('multiplayer_state_update', {
            players: gameState.players,
            enemies: gameState.enemies,
            projectiles: gameState.projectiles,
            xpOrbs: gameState.xpOrbs
        });
    }
    
    // 發送玩家輸入到伺服器
    sendPlayerInput(input) {
        if (this.isMultiplayerMode() && this.multiplayerSystem) {
            this.multiplayerSystem.sendInput(input);
        }
    }
    
    // 檢查是否為多人模式
    isMultiplayerMode() {
        return this.currentMode === 'multiplayer' && this.multiplayerSystem?.isConnected();
    }
    
    // 檢查是否為單人模式
    isSingleplayerMode() {
        return this.currentMode === 'singleplayer';
    }
    
    // 檢查多人遊戲是否已開始
    isMultiplayerGameStarted() {
        return this.isMultiplayerMode() && this.isGameStarted;
    }
    
    // 獲取當前模式
    getCurrentMode() {
        return this.currentMode;
    }
    
    // 獲取多人遊戲系統
    getMultiplayerSystem() {
        return this.multiplayerSystem;
    }
    
    // 清理多人遊戲對象
    clearMultiplayerObjects() {
        // 清理遠程玩家
        this.remotePlayers.forEach(player => {
            try {
                if (player.destroy) player.destroy();
            } catch (e) {
                console.warn('清理遠程玩家失敗:', e);
            }
        });
        this.remotePlayers.clear();
        
        // 清理多人遊戲敵人
        this.multiplayerEnemies.forEach(enemy => {
            try {
                if (enemy.destroy) enemy.destroy();
            } catch (e) {
                console.warn('清理多人遊戲敵人失敗:', e);
            }
        });
        this.multiplayerEnemies.clear();
        
        // 清理多人遊戲XP orb
        this.multiplayerXPOrbs.forEach(orb => {
            try {
                if (orb.destroy) orb.destroy();
            } catch (e) {
                console.warn('清理多人遊戲XP orb失敗:', e);
            }
        });
        this.multiplayerXPOrbs.clear();
        
        // 清理多人遊戲射彈
        this.multiplayerProjectiles.forEach(projectile => {
            try {
                if (projectile.destroy) projectile.destroy();
            } catch (e) {
                console.warn('清理多人遊戲射彈失敗:', e);
            }
        });
        this.multiplayerProjectiles.clear();
    }
    
    // 獲取遠程玩家
    getRemotePlayers() {
        return Array.from(this.remotePlayers.values());
    }
    
    // 獲取多人遊戲敵人
    getMultiplayerEnemies() {
        return Array.from(this.multiplayerEnemies.values());
    }
    
    // 獲取多人遊戲XP orb
    getMultiplayerXPOrbs() {
        return Array.from(this.multiplayerXPOrbs.values());
    }
    
    // 獲取多人遊戲射彈
    getMultiplayerProjectiles() {
        return Array.from(this.multiplayerProjectiles.values());
    }
} 