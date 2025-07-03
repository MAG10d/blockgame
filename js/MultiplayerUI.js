export class MultiplayerUI {
    constructor(multiplayerSystem) {
        this.multiplayerSystem = multiplayerSystem;
        this.container = null;
        this.visible = false;
        this.currentScreen = 'menu'; // menu, create, join, lobby, connecting
        
        this.setupEventListeners();
        this.createUI();
    }
    
    setupEventListeners() {
        this.multiplayerSystem.on('room_created', (data) => {
            this.showLobby(data.roomId);
        });
        
        this.multiplayerSystem.on('room_joined', (data) => {
            this.showConnecting();
        });
        
        this.multiplayerSystem.on('connected', (data) => {
            this.showLobby(this.multiplayerSystem.getRoomId());
        });
        
        this.multiplayerSystem.on('welcome', (data) => {
            this.updateLobbyInfo();
        });
        
        this.multiplayerSystem.on('player_joined', (data) => {
            this.updateLobbyInfo();
        });
        
        this.multiplayerSystem.on('player_left', (data) => {
            this.updateLobbyInfo();
        });
        
        this.multiplayerSystem.on('error', (data) => {
            this.showError(data.message);
        });
        
        this.multiplayerSystem.on('disconnected', () => {
            this.showMenu();
        });
    }
    
    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'multiplayer-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        document.body.appendChild(this.container);
        this.showMenu();
    }
    
    show() {
        this.visible = true;
        this.container.style.display = 'flex';
    }
    
    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }
    
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    showMenu() {
        this.currentScreen = 'menu';
        this.container.innerHTML = `
            <div style="
                background: #2c3e50;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                color: white;
                min-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h2 style="margin-top: 0; color: #3498db;">🌐 多人遊戲</h2>
                
                <div style="margin: 20px 0;">
                    <button id="create-room-btn" style="
                        background: #27ae60;
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        width: 200px;
                    ">🏠 創建房間</button>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="join-room-btn" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        width: 200px;
                    ">🚪 加入房間</button>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="cancel-mp-btn" style="
                        background: #95a5a6;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        width: 100px;
                    ">取消</button>
                </div>
                
                <div id="error-message" style="
                    color: #e74c3c;
                    margin-top: 20px;
                    display: none;
                "></div>
            </div>
        `;
        
        document.getElementById('create-room-btn').onclick = () => this.showCreateRoom();
        document.getElementById('join-room-btn').onclick = () => this.showJoinRoom();
        document.getElementById('cancel-mp-btn').onclick = () => this.hide();
    }
    
    showCreateRoom() {
        this.multiplayerSystem.createRoom().then(roomId => {
            if (roomId) {
                this.multiplayerSystem.connect(roomId);
            }
        });
        this.showConnecting();
    }
    
    showJoinRoom() {
        this.currentScreen = 'join';
        this.container.innerHTML = `
            <div style="
                background: #2c3e50;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                color: white;
                min-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h2 style="margin-top: 0; color: #3498db;">🚪 加入房間</h2>
                
                <div style="margin: 20px 0;">
                    <label for="room-id-input" style="display: block; margin-bottom: 10px;">
                        請輸入房間 ID:
                    </label>
                    <input id="room-id-input" type="text" placeholder="例如: ABC123" style="
                        padding: 10px;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        width: 200px;
                        text-align: center;
                        text-transform: uppercase;
                    " maxlength="6">
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="confirm-join-btn" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        width: 200px;
                    ">加入房間</button>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="back-btn" style="
                        background: #95a5a6;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        width: 100px;
                    ">返回</button>
                </div>
            </div>
        `;
        
        document.getElementById('confirm-join-btn').onclick = async () => {
            const roomId = document.getElementById('room-id-input').value.trim();
            if (!roomId) {
                this.showError('請輸入房間 ID');
                return;
            }
            
            const success = await this.multiplayerSystem.joinRoom(roomId);
            if (success) {
                this.multiplayerSystem.connect(roomId);
                this.showConnecting();
            }
        };
        
        document.getElementById('back-btn').onclick = () => this.showMenu();
    }
    
    showConnecting() {
        this.currentScreen = 'connecting';
        this.container.innerHTML = `
            <div style="
                background: #2c3e50;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                color: white;
                min-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h2 style="margin-top: 0; color: #f39c12;">🔄 連接中</h2>
                
                <div style="margin: 20px 0;">
                    <p>正在連接伺服器...</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="cancel-connect-btn" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        width: 100px;
                    ">取消</button>
                </div>
            </div>
        `;
        
        document.getElementById('cancel-connect-btn').onclick = () => {
            this.multiplayerSystem.disconnect();
            this.showMenu();
        };
    }
    
    showLobby(roomId) {
        this.currentScreen = 'lobby';
        this.container.innerHTML = `
            <div style="
                background: #2c3e50;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                color: white;
                min-width: 500px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h2 style="margin-top: 0; color: #27ae60;">🎮 遊戲大廳</h2>
                
                <div style="margin: 20px 0; padding: 20px; background: #34495e; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0;">房間 ID: <span style="color: #3498db; font-family: monospace;">${roomId}</span></h3>
                    <p style="margin: 5px 0; font-size: 14px; color: #bdc3c7;">
                        分享此 ID 給朋友加入遊戲
                    </p>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="start-game-btn" style="
                        background: #27ae60;
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        width: 200px;
                    ">開始遊戲</button>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="leave-room-btn" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 10px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        width: 120px;
                    ">離開房間</button>
                </div>
            </div>
        `;
        
        document.getElementById('start-game-btn').onclick = () => {
            this.hide();
            window.dispatchEvent(new CustomEvent('start-multiplayer-game'));
        };
        
        document.getElementById('leave-room-btn').onclick = () => {
            this.multiplayerSystem.disconnect();
            this.showMenu();
        };
    }
    
    showError(message) {
        alert(message);
    }
    
    updateLobbyInfo() {
        // 更新大廳信息（玩家列表、房間狀態等）
        if (this.currentScreen !== 'lobby') return;
        
        // 獲取當前房間信息
        const roomId = this.multiplayerSystem.getRoomId();
        const playerCount = this.multiplayerSystem.getPlayerCount();
        
        // 如果大廳界面存在，更新玩家信息
        const lobbyContent = document.querySelector('#multiplayer-ui');
        if (lobbyContent && roomId) {
            // 重新渲染大廳界面以顯示最新的玩家信息
            this.showLobby(roomId);
        }
        
        console.log(`大廳信息更新 - 房間: ${roomId}, 玩家數: ${playerCount}`);
    }
}
