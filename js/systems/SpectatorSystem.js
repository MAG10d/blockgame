/**
 * 觀察者系統 - 處理玩家死亡後的觀察模式
 */

export class SpectatorSystem {
    constructor(cameraSystem, multiplayerRenderer) {
        this.cameraSystem = cameraSystem;
        this.multiplayerRenderer = multiplayerRenderer;
        
        this.isSpectating = false;
        this.currentTarget = null;
        this.availableTargets = []; // 存活的玩家列表
        this.currentTargetIndex = 0;
        
        this.spectatorUI = null;
        this.eventHandlers = new Map();
        
        this.setupSpectatorControls();
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
    
    // 進入觀察模式
    enterSpectatorMode(deadPlayerId, alivePlayers) {
        console.log(`玩家 ${deadPlayerId} 進入觀察模式`);
        
        this.isSpectating = true;
        this.availableTargets = alivePlayers.filter(player => !player.isDead);
        this.currentTargetIndex = 0;
        
        if (this.availableTargets.length > 0) {
            this.currentTarget = this.availableTargets[0];
            this.followTarget(this.currentTarget);
        }
        
        this.showSpectatorUI();
        this.emit('spectator_mode_entered', { playerId: deadPlayerId, targetCount: this.availableTargets.length });
    }
    
    // 離開觀察模式
    exitSpectatorMode() {
        console.log('離開觀察模式');
        
        this.isSpectating = false;
        this.currentTarget = null;
        this.availableTargets = [];
        this.currentTargetIndex = 0;
        
        this.hideSpectatorUI();
        this.emit('spectator_mode_exited');
    }
    
    // 更新存活玩家列表
    updateAlivePlayers(alivePlayers) {
        if (!this.isSpectating) return;
        
        const previousCount = this.availableTargets.length;
        this.availableTargets = alivePlayers.filter(player => !player.isDead);
        
        // 如果當前目標死亡，切換到下一個
        if (this.currentTarget && this.currentTarget.isDead) {
            this.switchToNextTarget();
        }
        
        // 如果沒有存活玩家了，結束觀察模式
        if (this.availableTargets.length === 0) {
            console.log('所有玩家都死亡，結束觀察模式');
            this.exitSpectatorMode();
            this.emit('all_players_dead');
            return;
        }
        
        // 更新UI顯示
        this.updateSpectatorUI();
        
        // 如果玩家數量發生變化，發出事件
        if (this.availableTargets.length !== previousCount) {
            this.emit('target_count_changed', { 
                count: this.availableTargets.length,
                previousCount 
            });
        }
    }
    
    // 切換到下一個觀察目標
    switchToNextTarget() {
        if (this.availableTargets.length === 0) return;
        
        this.currentTargetIndex = (this.currentTargetIndex + 1) % this.availableTargets.length;
        this.currentTarget = this.availableTargets[this.currentTargetIndex];
        
        this.followTarget(this.currentTarget);
        this.updateSpectatorUI();
        
        console.log(`切換觀察目標: ${this.currentTarget.id || 'Unknown'}`);
    }
    
    // 切換到上一個觀察目標
    switchToPreviousTarget() {
        if (this.availableTargets.length === 0) return;
        
        this.currentTargetIndex = (this.currentTargetIndex - 1 + this.availableTargets.length) % this.availableTargets.length;
        this.currentTarget = this.availableTargets[this.currentTargetIndex];
        
        this.followTarget(this.currentTarget);
        this.updateSpectatorUI();
        
        console.log(`切換觀察目標: ${this.currentTarget.id || 'Unknown'}`);
    }
    
    // 跟隨目標玩家
    followTarget(target) {
        if (!target || !this.cameraSystem) return;
        
        // 設置相機跟隨目標
        this.cameraSystem.follow(target);
    }
    
    // 設置觀察者控制
    setupSpectatorControls() {
        // 鍵盤控制
        document.addEventListener('keydown', (e) => {
            if (!this.isSpectating) return;
            
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.switchToPreviousTarget();
                    } else {
                        this.switchToNextTarget();
                    }
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    this.switchToPreviousTarget();
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    this.switchToNextTarget();
                    break;
            }
        });
    }
    
    // 顯示觀察者UI
    showSpectatorUI() {
        this.hideSpectatorUI(); // 先清理舊的UI
        
        this.spectatorUI = document.createElement('div');
        this.spectatorUI.id = 'spectator-ui';
        this.spectatorUI.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            z-index: 9998;
            border: 2px solid #e74c3c;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            text-align: center;
            min-width: 300px;
        `;
        
        this.updateSpectatorUI();
        document.body.appendChild(this.spectatorUI);
    }
    
    // 更新觀察者UI
    updateSpectatorUI() {
        if (!this.spectatorUI) return;
        
        const targetName = this.currentTarget ? 
            (this.currentTarget.id || 'Unknown').substring(0, 8) : 
            '無目標';
            
        const targetInfo = this.currentTarget ? 
            `生命值: ${Math.round(this.currentTarget.health)}/${this.currentTarget.maxHealth} | 等級: ${this.currentTarget.level}` : 
            '';
        
        this.spectatorUI.innerHTML = `
            <div style="margin-bottom: 10px;">
                <span style="color: #e74c3c; font-weight: bold; font-size: 18px;">☠️ 觀察模式</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #3498db;">正在觀察:</span> 
                <span style="color: #2ecc71; font-weight: bold;">${targetName}</span>
                <span style="color: #95a5a6; margin-left: 10px;">(${this.currentTargetIndex + 1}/${this.availableTargets.length})</span>
            </div>
            ${targetInfo ? `<div style="font-size: 14px; color: #f39c12; margin-bottom: 8px;">${targetInfo}</div>` : ''}
            <div style="font-size: 12px; color: #bdc3c7;">
                <div>🎮 Tab: 切換目標 | ← →: 上/下一個目標</div>
                <div style="margin-top: 5px;">等待其他玩家... 或遊戲結束</div>
            </div>
        `;
    }
    
    // 隱藏觀察者UI
    hideSpectatorUI() {
        if (this.spectatorUI) {
            document.body.removeChild(this.spectatorUI);
            this.spectatorUI = null;
        }
    }
    
    // 更新觀察模式
    update() {
        if (!this.isSpectating || !this.currentTarget) return;
        
        // 持續跟隨當前目標
        this.followTarget(this.currentTarget);
        
        // 檢查目標是否仍然存活
        if (this.currentTarget.isDead) {
            this.switchToNextTarget();
        }
    }
    
    // 檢查是否在觀察模式
    isInSpectatorMode() {
        return this.isSpectating;
    }
    
    // 獲取當前觀察目標
    getCurrentTarget() {
        return this.currentTarget;
    }
    
    // 獲取存活玩家數量
    getAlivePlayerCount() {
        return this.availableTargets.length;
    }
    
    // 清理系統
    cleanup() {
        this.exitSpectatorMode();
        this.eventHandlers.clear();
    }
} 