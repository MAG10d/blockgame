/**
 * 遊戲結束管理器 - 處理多人遊戲的結束條件和後續選項
 */

export class GameEndManager {
    constructor(gameModeManager, multiplayerSystem) {
        this.gameModeManager = gameModeManager;
        this.multiplayerSystem = multiplayerSystem;
        
        this.gameEndUI = null;
        this.gameEnded = false; // 添加遊戲結束標記
        this.lastGameState = ''; // 記錄上次的遊戲狀態，避免重複輸出
        this.gameEndConditions = {
            minPlayersAlive: 1, // 最少存活玩家數
            maxDeadPlayers: null, // 最大死亡玩家數（會根據總玩家數計算）
            timeLimit: null // 時間限制（可選）
        };
        
        this.gameStats = {
            startTime: null,
            endTime: null,
            duration: 0,
            playersCount: 0,
            deadPlayers: [],
            survivors: [],
            totalEnemiesKilled: 0,
            totalXPGained: 0
        };
        
        this.eventHandlers = new Map();
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
    
    // 開始遊戲統計
    startGame(playerCount) {
        this.gameEnded = false; // 重置遊戲結束標記
        this.lastGameState = ''; // 重置遊戲狀態記錄
        
        // 如果玩家數為 0，使用默認值（可能是剛開始遊戲）
        const actualPlayerCount = playerCount || 1;
        
        this.gameStats = {
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            playersCount: actualPlayerCount,
            deadPlayers: [],
            survivors: [],
            totalEnemiesKilled: 0,
            totalXPGained: 0
        };
        
        // 根據玩家數設置結束條件
        this.gameEndConditions.maxDeadPlayers = Math.max(1, Math.floor(actualPlayerCount * 0.75)); // 75%死亡時結束
        
        console.log(`遊戲開始 - 玩家數: ${actualPlayerCount}, 結束條件: ${this.gameEndConditions.maxDeadPlayers}人死亡`);
    }
    
    // 檢查遊戲結束條件
    checkGameEndConditions(alivePlayers, deadPlayers) {
        // 如果遊戲已經結束，不再重複檢查
        if (this.gameEnded) {
            return true;
        }
        
        const aliveCount = alivePlayers.length;
        const deadCount = deadPlayers.length;
        const totalPlayers = aliveCount + deadCount;
        
        // 更新統計
        this.gameStats.deadPlayers = deadPlayers;
        this.gameStats.survivors = alivePlayers;
        
        // 只在狀態變化時輸出日志，避免無限循環輸出
        const currentState = `${aliveCount}-${deadCount}-${totalPlayers}`;
        if (this.lastGameState !== currentState) {
            console.log(`遊戲狀態檢查 - 存活: ${aliveCount}, 死亡: ${deadCount}, 總計: ${totalPlayers}`);
            this.lastGameState = currentState;
        }
        
        // 如果總玩家數為 0 或 1，暫時不檢查結束條件（可能還在等待玩家加入）
        if (totalPlayers <= 1) {
            return false;
        }
        
        // 檢查結束條件
        let shouldEnd = false;
        let endReason = '';
        
        // 條件1: 只剩一個玩家存活
        if (aliveCount <= this.gameEndConditions.minPlayersAlive && totalPlayers > 1) {
            shouldEnd = true;
            endReason = aliveCount === 1 ? 'victory' : 'all_dead';
        }
        
        // 條件2: 達到最大死亡人數
        if (this.gameEndConditions.maxDeadPlayers && deadCount >= this.gameEndConditions.maxDeadPlayers) {
            shouldEnd = true;
            endReason = 'too_many_deaths';
        }
        
        // 條件3: 所有玩家死亡
        if (aliveCount === 0) {
            shouldEnd = true;
            endReason = 'all_dead';
        }
        
        if (shouldEnd) {
            this.endGame(endReason);
            return true;
        }
        
        return false;
    }
    
    // 結束遊戲
    endGame(reason) {
        if (this.gameEnded) {
            return; // 防止重複結束
        }
        
        this.gameEnded = true; // 設置遊戲結束標記
        this.gameStats.endTime = Date.now();
        this.gameStats.duration = this.gameStats.endTime - this.gameStats.startTime;
        
        console.log(`遊戲結束 - 原因: ${reason}`);
        
        // 發出遊戲結束事件
        this.emit('game_ended', {
            reason,
            stats: this.gameStats,
            survivors: this.gameStats.survivors,
            deadPlayers: this.gameStats.deadPlayers
        });
        
        // 顯示遊戲結束UI
        this.showGameEndUI(reason);
    }
    
    // 顯示遊戲結束UI
    showGameEndUI(reason) {
        this.hideGameEndUI(); // 先清理舊的UI
        
        this.gameEndUI = document.createElement('div');
        this.gameEndUI.id = 'game-end-ui';
        this.gameEndUI.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        const endReasonText = this.getEndReasonText(reason);
        const endReasonColor = this.getEndReasonColor(reason);
        const durationText = this.formatDuration(this.gameStats.duration);
        
        this.gameEndUI.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #2c3e50, #3498db);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                color: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                max-width: 600px;
                width: 90%;
                border: 3px solid ${endReasonColor};
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">${this.getEndReasonIcon(reason)}</div>
                <h1 style="font-size: 36px; margin-bottom: 20px; color: ${endReasonColor};">${endReasonText}</h1>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #f39c12; margin-bottom: 15px;">🏆 遊戲統計</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                        <div>⏱️ 遊戲時長: <span style="color: #2ecc71;">${durationText}</span></div>
                        <div>👥 玩家總數: <span style="color: #3498db;">${this.gameStats.playersCount}</span></div>
                        <div>💚 存活玩家: <span style="color: #2ecc71;">${this.gameStats.survivors.length}</span></div>
                        <div>💀 死亡玩家: <span style="color: #e74c3c;">${this.gameStats.deadPlayers.length}</span></div>
                    </div>
                </div>
                
                ${this.generatePlayerList()}
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #f39c12; margin-bottom: 20px;">🎮 下一步選擇</h3>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button id="restart-game-btn" style="
                            background: #27ae60;
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            border-radius: 10px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: background 0.3s;
                            min-width: 140px;
                        ">🔄 重新開始</button>
                        
                        <button id="back-to-lobby-btn" style="
                            background: #3498db;
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            border-radius: 10px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: background 0.3s;
                            min-width: 140px;
                        ">🏠 回到大廳</button>
                        
                        <button id="leave-room-btn" style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            border-radius: 10px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: background 0.3s;
                            min-width: 140px;
                        ">🚪 離開遊戲</button>
                    </div>
                    
                    <div style="margin-top: 15px; font-size: 12px; color: #bdc3c7;">
                        💡 提示: 重新開始會在相同房間再玩一局，回到大廳可以等待新玩家加入
                    </div>
                </div>
            </div>
        `;
        
        // 先添加到DOM，然後設置按鈕事件
        document.body.appendChild(this.gameEndUI);
        
        // 使用setTimeout確保DOM元素完全渲染後再設置事件
        setTimeout(() => {
            this.setupGameEndButtons();
        }, 100);
    }
    
    // 生成玩家列表
    generatePlayerList() {
        const survivors = this.gameStats.survivors;
        const deadPlayers = this.gameStats.deadPlayers;
        
        let html = '<div style="margin: 20px 0;">';
        
        if (survivors.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #2ecc71; margin-bottom: 10px;">🏆 存活者</h4>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        ${survivors.map(player => `
                            <div style="
                                background: rgba(46, 204, 113, 0.2);
                                border: 2px solid #2ecc71;
                                border-radius: 8px;
                                padding: 8px 12px;
                                font-size: 12px;
                            ">
                                <div style="font-weight: bold;">${(player.id || 'Unknown').substring(0, 8)}</div>
                                <div style="color: #f39c12;">Lv.${player.level} | ❤️${Math.round(player.health)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (deadPlayers.length > 0) {
            html += `
                <div>
                    <h4 style="color: #e74c3c; margin-bottom: 10px;">💀 已死亡</h4>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        ${deadPlayers.map(player => `
                            <div style="
                                background: rgba(231, 76, 60, 0.2);
                                border: 2px solid #e74c3c;
                                border-radius: 8px;
                                padding: 8px 12px;
                                font-size: 12px;
                            ">
                                <div style="font-weight: bold;">${(player.id || 'Unknown').substring(0, 8)}</div>
                                <div style="color: #95a5a6;">Lv.${player.level}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    // 設置遊戲結束按鈕事件
    setupGameEndButtons() {
        console.log('設置遊戲結束按鈕事件...');
        
        // 重新開始按鈕
        const restartBtn = document.getElementById('restart-game-btn');
        if (restartBtn) {
            console.log('✅ 找到重新開始按鈕');
            restartBtn.onclick = () => {
                console.log('🔄 重新開始按鈕被點擊');
                this.handleRestartGame();
            };
        } else {
            console.error('❌ 找不到重新開始按鈕');
        }
        
        // 回到大廳按鈕
        const lobbyBtn = document.getElementById('back-to-lobby-btn');
        if (lobbyBtn) {
            console.log('✅ 找到回到大廳按鈕');
            lobbyBtn.onclick = () => {
                console.log('🏠 回到大廳按鈕被點擊');
                this.handleBackToLobby();
            };
        } else {
            console.error('❌ 找不到回到大廳按鈕');
        }
        
        // 離開房間按鈕
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            console.log('✅ 找到離開房間按鈕');
            leaveBtn.onclick = () => {
                console.log('🚪 離開房間按鈕被點擊');
                this.handleLeaveRoom();
            };
        } else {
            console.error('❌ 找不到離開房間按鈕');
        }
        
        // 懸停效果
        const buttons = ['restart-game-btn', 'back-to-lobby-btn', 'leave-room-btn'];
        const hoverColors = ['#2ecc71', '#2980b9', '#c0392b'];
        const originalColors = ['#27ae60', '#3498db', '#e74c3c'];
        
        buttons.forEach((buttonId, index) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.onmouseenter = () => button.style.background = hoverColors[index];
                button.onmouseleave = () => {
                    button.style.background = originalColors[index];
                };
            }
        });
    }
    
    // 處理重新開始遊戲
    handleRestartGame() {
        console.log('重新開始遊戲');
        this.hideGameEndUI();
        
        this.emit('restart_requested');
        
        // 通知伺服器重新開始遊戲
        if (this.multiplayerSystem && this.multiplayerSystem.isConnected()) {
            this.multiplayerSystem.sendInput({
                type: 'restart_game',
                timestamp: Date.now()
            });
        }
    }
    
    // 處理回到大廳
    handleBackToLobby() {
        console.log('回到大廳');
        this.hideGameEndUI();
        
        this.emit('lobby_requested');
        
        // 顯示多人遊戲大廳UI
        import('../MultiplayerUI.js').then(({ MultiplayerUI }) => {
            if (this.multiplayerSystem) {
                const multiplayerUI = new MultiplayerUI(this.multiplayerSystem);
                multiplayerUI.showLobby(this.multiplayerSystem.getRoomId());
            }
        });
    }
    
    // 處理離開房間
    handleLeaveRoom() {
        console.log('離開房間');
        this.hideGameEndUI();
        
        this.emit('leave_requested');
        
        // 斷開多人連線，回到單人模式
        if (this.multiplayerSystem && this.multiplayerSystem.isConnected()) {
            this.multiplayerSystem.disconnect();
        }
        
        if (this.gameModeManager) {
            this.gameModeManager.switchToSingleplayer();
        }
        
        // 重新載入頁面以完全重置
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    // 隱藏遊戲結束UI
    hideGameEndUI() {
        if (this.gameEndUI && this.gameEndUI.parentNode) {
            this.gameEndUI.parentNode.removeChild(this.gameEndUI);
            this.gameEndUI = null;
        }
    }
    
    // 獲取結束原因文字
    getEndReasonText(reason) {
        const texts = {
            victory: '勝利！',
            all_dead: '全軍覆沒',
            too_many_deaths: '遊戲結束',
            time_limit: '時間到',
            disconnected: '連線中斷'
        };
        return texts[reason] || '遊戲結束';
    }
    
    // 獲取結束原因顏色
    getEndReasonColor(reason) {
        const colors = {
            victory: '#f39c12',
            all_dead: '#e74c3c',
            too_many_deaths: '#e67e22',
            time_limit: '#9b59b6',
            disconnected: '#95a5a6'
        };
        return colors[reason] || '#3498db';
    }
    
    // 獲取結束原因圖標
    getEndReasonIcon(reason) {
        const icons = {
            victory: '🏆',
            all_dead: '💀',
            too_many_deaths: '⚰️',
            time_limit: '⏰',
            disconnected: '🔌'
        };
        return icons[reason] || '🎮';
    }
    
    // 格式化時間
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / (1000 * 60)) % 60;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // 更新遊戲統計
    updateGameStats(stats) {
        if (stats.enemiesKilled) {
            this.gameStats.totalEnemiesKilled += stats.enemiesKilled;
        }
        if (stats.xpGained) {
            this.gameStats.totalXPGained += stats.xpGained;
        }
    }
    
    // 清理系統
    cleanup() {
        this.hideGameEndUI();
        this.eventHandlers.clear();
    }
} 