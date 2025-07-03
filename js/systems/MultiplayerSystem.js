import { config } from '../config/config.js';

export class MultiplayerSystem {
    constructor() {
        this.websocket = null;
        this.connected = false;
        this.playerId = null;
        this.roomId = null;
        // 從配置載入伺服器 URL (GitHub Actions 會自動注入到 CONFIG)
        this.serverUrl = window.CONFIG?.MULTIPLAYER_SERVER_URL || config.SERVER_URL || 'ws://localhost:8787';
        
        // 為 HTTP API 請求創建對應的 HTTP URL
        this.httpUrl = this.serverUrl
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');
        
        console.log('WebSocket URL:', this.serverUrl);
        console.log('HTTP API URL:', this.httpUrl);
        
        // 本地玩家狀態
        this.localPlayer = null;
        this.remoteePlayers = new Map();
        
        // 遊戲狀態同步
        this.lastSequence = 0;
        this.inputSequence = 0;
        
        // 網路統計
        this.ping = 0;
        this.lastPingTime = 0;
        
        // 狀態插值
        this.interpolationDelay = 100; // ms
        this.stateBuffer = [];
        
        // 事件監聽器
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
    
    // 創建房間
    async createRoom() {
        try {
            console.log('正在創建房間，API URL:', `${this.httpUrl}/api/create-room`);
            
            const response = await fetch(`${this.httpUrl}/api/create-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 添加超時處理
                signal: AbortSignal.timeout(10000) // 10秒超時
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.roomId) {
                this.roomId = data.roomId;
                console.log('房間創建成功:', data.roomId);
                this.emit('room_created', { roomId: data.roomId });
                return data.roomId;
            } else {
                throw new Error('伺服器未返回房間ID');
            }
        } catch (error) {
            console.error('創建房間失敗:', error);
            this.emit('error', { message: `創建房間失敗: ${error.message}` });
        }
        return null;
    }
    
    // 加入房間
    async joinRoom(roomId) {
        try {
            console.log('正在加入房間，API URL:', `${this.httpUrl}/api/join-room`);
            
            const response = await fetch(`${this.httpUrl}/api/join-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId }),
                // 添加超時處理
                signal: AbortSignal.timeout(10000) // 10秒超時
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.error('加入房間失敗:', data.error);
                this.emit('error', { message: data.error });
                return false;
            }
            
            this.roomId = roomId;
            console.log('準備加入房間:', roomId);
            this.emit('room_joined', { roomId, playerCount: data.playerCount });
            return true;
        } catch (error) {
            console.error('加入房間失敗:', error);
            this.emit('error', { message: `加入房間失敗: ${error.message}` });
        }
        return false;
    }
    
    // 連接 WebSocket
    connect(roomId = null) {
        if (this.connected) {
            console.log('已經連接');
            return;
        }
        
        if (roomId) this.roomId = roomId;
        if (!this.roomId) {
            console.error('需要房間 ID');
            return;
        }
        
        this.playerId = this.generatePlayerId();
        const wsUrl = `${this.serverUrl}?roomId=${this.roomId}&playerId=${this.playerId}`;
        
        console.log('正在連接伺服器:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            this.connected = true;
            console.log('✅ 連接成功!');
            this.emit('connected', { playerId: this.playerId });
            
            // 開始 ping 測試
            this.startPingTest();
        };
        
        this.websocket.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };
        
        this.websocket.onclose = () => {
            this.connected = false;
            console.log('❌ 連接斷開');
            this.emit('disconnected');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket 錯誤:', error);
            this.emit('error', { message: 'WebSocket 錯誤' });
        };
    }
    
    // 處理伺服器消息
    handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                console.log('歡迎消息:', message);
                this.playerId = message.playerId;
                this.handleGameState(message.gameState);
                this.emit('welcome', message);
                break;
                
            case 'game_state':
                this.handleGameState(message.state);
                this.lastSequence = message.sequence;
                break;
                
            case 'player_joined':
                console.log('玩家加入:', message.playerId);
                this.remoteePlayers.set(message.playerId, message.playerState);
                this.emit('player_joined', message);
                break;
                
            case 'player_left':
                console.log('玩家離開:', message.playerId);
                this.remoteePlayers.delete(message.playerId);
                this.emit('player_left', message);
                break;
                
            case 'pong':
                this.ping = Date.now() - message.timestamp;
                break;
                
            case 'error':
                console.error('伺服器錯誤:', message.message);
                this.emit('error', message);
                break;
                
            case 'game_restarted':
                console.log('遊戲已重新開始:', message.message);
                this.emit('game_restarted', message);
                break;
        }
    }
    
    // 處理遊戲狀態更新
    handleGameState(gameState) {
        // 更新本地玩家
        if (gameState.players[this.playerId]) {
            this.localPlayer = gameState.players[this.playerId];
        }
        
        // 更新遠程玩家
        this.remoteePlayers.clear();
        for (const [playerId, playerState] of Object.entries(gameState.players)) {
            if (playerId !== this.playerId) {
                this.remoteePlayers.set(playerId, playerState);
            }
        }
        
        // 將狀態添加到插值緩衝區
        this.stateBuffer.push({
            timestamp: Date.now(),
            state: gameState
        });
        
        // 保持緩衝區大小
        if (this.stateBuffer.length > 10) {
            this.stateBuffer.shift();
        }
        
        this.emit('state_update', gameState);
    }
    
    // 發送玩家輸入
    sendInput(input) {
        if (!this.connected || !this.websocket) return;
        
        this.inputSequence++;
        
        this.websocket.send(JSON.stringify({
            type: 'input',
            input: input,
            sequence: this.inputSequence
        }));
    }
    
    // 獲取插值後的遊戲狀態
    getInterpolatedState() {
        const now = Date.now();
        const targetTime = now - this.interpolationDelay;
        
        if (this.stateBuffer.length < 2) {
            return this.stateBuffer[this.stateBuffer.length - 1]?.state || null;
        }
        
        // 找到目標時間前後的狀態
        let before = null;
        let after = null;
        
        for (let i = 0; i < this.stateBuffer.length - 1; i++) {
            if (this.stateBuffer[i].timestamp <= targetTime && 
                this.stateBuffer[i + 1].timestamp >= targetTime) {
                before = this.stateBuffer[i];
                after = this.stateBuffer[i + 1];
                break;
            }
        }
        
        if (!before || !after) {
            return this.stateBuffer[this.stateBuffer.length - 1].state;
        }
        
        // 線性插值
        const t = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
        return this.interpolateStates(before.state, after.state, t);
    }
    
    // 狀態插值
    interpolateStates(stateA, stateB, t) {
        const interpolated = {
            players: {},
            enemies: {},
            projectiles: {},
            xpOrbs: {},
            sequence: stateB.sequence
        };
        
        // 插值玩家位置
        for (const playerId in stateB.players) {
            if (stateA.players[playerId]) {
                interpolated.players[playerId] = {
                    ...stateB.players[playerId],
                    x: this.lerp(stateA.players[playerId].x, stateB.players[playerId].x, t),
                    y: this.lerp(stateA.players[playerId].y, stateB.players[playerId].y, t)
                };
            } else {
                interpolated.players[playerId] = stateB.players[playerId];
            }
        }
        
        // 插值敵人位置
        for (const enemyId in stateB.enemies) {
            if (stateA.enemies[enemyId]) {
                interpolated.enemies[enemyId] = {
                    ...stateB.enemies[enemyId],
                    x: this.lerp(stateA.enemies[enemyId].x, stateB.enemies[enemyId].x, t),
                    y: this.lerp(stateA.enemies[enemyId].y, stateB.enemies[enemyId].y, t)
                };
            } else {
                interpolated.enemies[enemyId] = stateB.enemies[enemyId];
            }
        }
        
        // 射彈和 XP orbs 不需要插值（移動太快）
        interpolated.projectiles = stateB.projectiles;
        interpolated.xpOrbs = stateB.xpOrbs;
        
        return interpolated;
    }
    
    // 線性插值輔助函數
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Ping 測試
    startPingTest() {
        setInterval(() => {
            if (this.connected) {
                this.lastPingTime = Date.now();
                this.websocket.send(JSON.stringify({
                    type: 'ping',
                    timestamp: this.lastPingTime
                }));
            }
        }, 5000); // 每 5 秒測試一次
    }
    
    // 斷開連接
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.connected = false;
        this.playerId = null;
        this.roomId = null;
        this.remoteePlayers.clear();
        this.stateBuffer = [];
    }
    
    // 生成玩家 ID
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substring(2, 10);
    }
    
    // 獲取狀態
    isConnected() {
        return this.connected;
    }
    
    getPlayerId() {
        return this.playerId;
    }
    
    getRoomId() {
        return this.roomId;
    }
    
    getLocalPlayer() {
        return this.localPlayer;
    }
    
    getRemotePlayers() {
        return Array.from(this.remoteePlayers.values());
    }
    
    getPing() {
        return this.ping;
    }
    
    getPlayerCount() {
        return this.remoteePlayers.size + (this.localPlayer ? 1 : 0);
    }
    
    // 獲取所有玩家
    getAllPlayers() {
        const state = this.getInterpolatedState();
        return state ? Object.values(state.players || {}) : [];
    }
    
    // 獲取存活玩家
    getAlivePlayers() {
        return this.getAllPlayers().filter(player => !player.isDead);
    }
    
    // 獲取死亡玩家
    getDeadPlayers() {
        return this.getAllPlayers().filter(player => player.isDead);
    }
    
    // 檢查遊戲是否結束
    isGameEnded() {
        const alivePlayers = this.getAlivePlayers();
        return alivePlayers.length <= 1;
    }
    
    // 重新開始遊戲
    restartGame() {
        if (this.connected && this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'restart_game',
                timestamp: Date.now()
            }));
        }
    }
} 