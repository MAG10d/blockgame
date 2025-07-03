'use strict';

// Import all systems and data
import { characterData } from './data/Characters.js';
import { weaponData } from './data/Weapons.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { UISystem } from './systems/UISystem.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { MultiplayerSystem } from './systems/MultiplayerSystem.js';
import { GameModeManager } from './systems/GameModeManager.js';
import { MultiplayerRenderer } from './systems/MultiplayerRenderer.js';
import { SpectatorSystem } from './systems/SpectatorSystem.js';
import { GameEndManager } from './systems/GameEndManager.js';

// 載入系統檢查工具（開發和除錯用）
import('./systems/SystemChecker.js').catch(error => {
    console.warn('SystemChecker 載入失敗:', error);
});

// Import game entities
import Player from './Player.js';
import Enemy from './Enemy.js';
import XPOrb from './XPOrb.js';

/**
 * Main game initialization function
 */
async function initializeGame() {
    // Initialize PixiJS Application
    const app = new PIXI.Application();
    
    // Declare canvas dimensions at function scope with default values
    let canvasWidth = 800;  // Default fallback value
    let canvasHeight = 600; // Default fallback value
    
    try {
        await app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x2c3e50,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        
        // Add the canvas to the DOM
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            throw new Error('Game container not found');
        }
        gameContainer.appendChild(app.canvas);
        
        // 設置固定畫布大小，留出空間給 UI
        canvasWidth = Math.min(1200, window.innerWidth - 40);
        canvasHeight = Math.min(800, window.innerHeight - 120);
        app.renderer.resize(canvasWidth, canvasHeight);

    } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
        // Even if PixiJS fails, we should set reasonable default values
        canvasWidth = Math.min(1200, window.innerWidth - 40) || 800;
        canvasHeight = Math.min(800, window.innerHeight - 120) || 600;
        throw error;
    }

    // Create world container for camera effects
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Initialize all systems - now canvasWidth and canvasHeight are guaranteed to be defined
    const weaponSystem = new WeaponSystem();
    const collisionSystem = new CollisionSystem();
    const inputSystem = new InputSystem(app.canvas || app.view);
    const uiSystem = new UISystem();
    const upgradeSystem = new UpgradeSystem(app);
    const cameraSystem = new CameraSystem(worldContainer, canvasWidth, canvasHeight);
    
    // Initialize multiplayer systems
    const gameModeManager = new GameModeManager();
    const multiplayerRenderer = new MultiplayerRenderer(worldContainer, characterData, weaponData);
    
    // Initialize spectator and game end systems
    const spectatorSystem = new SpectatorSystem(cameraSystem, multiplayerRenderer);
    const gameEndManager = new GameEndManager(gameModeManager, null); // multiplayerSystem will be set later
    
    // 多人遊戲輸入狀態追蹤
    let lastSentMovement = { x: 0, y: 0 };
    let lastSentFire = false;
    let lastMovementSentTime = 0;
    const movementSendInterval = 100; // 每 100ms 發送一次移動更新
    let restartTimestamp = 0; // 記錄遊戲重啟的時間戳
    
    // 多人遊戲狀態追蹤
    let localPlayerDead = false;
    let allPlayers = [];
    let deadPlayers = [];
    let alivePlayers = [];

    // Handle window resize - define after cameraSystem is initialized
    function handleResize() {
        canvasWidth = Math.min(1200, window.innerWidth - 40);
        canvasHeight = Math.min(800, window.innerHeight - 120);
        app.renderer.resize(canvasWidth, canvasHeight);
        cameraSystem.resize(canvasWidth, canvasHeight);
    }
    window.addEventListener('resize', handleResize);

    // GAME STATE
    const worldBounds = cameraSystem.getWorldBounds();
    const player = new Player(worldBounds.width / 2, worldBounds.height / 2, characterData.warrior, weaponData, worldContainer);
    const enemies = [], xpOrbs = [];
    let enemySpawnTimer = 0;
    let gameOver = false;

    // GAME STATISTICS
    const gameStats = {
        startTime: Date.now(),
        enemiesKilled: 0,
        damageDealt: 0,
        damageTaken: 0,
        xpGained: 0,
        maxLevel: 1,
        survivalTime: 0
    };

// --- HELPER FUNCTIONS ---

    function spawnEnemy() {
        if (gameOver) return;
        
        const size = 25;
        const spawnDistance = Math.max(app.screen.width, app.screen.height) * 0.6; // Distance from camera center
        
        // Get player position as spawn center
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        
        // Random angle around the player
    const angle = Math.random() * 2 * Math.PI;
        
        // Spawn outside camera view
        let x = centerX + Math.cos(angle) * spawnDistance;
        let y = centerY + Math.sin(angle) * spawnDistance;
        
        // Keep within world bounds
        const worldBounds = cameraSystem.getWorldBounds();
        x = Math.max(0, Math.min(worldBounds.width - size, x));
        y = Math.max(0, Math.min(worldBounds.height - size, y));
        
        enemies.push(new Enemy(x, y, worldContainer));
    }

    function cleanupEnemies() {
        const enemiesToRemove = enemies.filter(e => e.markedForDeletion);
        enemiesToRemove.forEach(enemy => {
            try {
                enemy.destroy();
            } catch (e) {
                console.warn('Failed to destroy enemy:', e);
            }
        });
        enemies.splice(0, enemies.length, ...enemies.filter(e => !e.markedForDeletion));
    }

    function cleanupXPOrbs() {
        const orbsToRemove = xpOrbs.filter(o => o.markedForDeletion);
        orbsToRemove.forEach(orb => {
            try {
                orb.destroy();
            } catch (e) {
                console.warn('Failed to destroy orb:', e);
            }
        });
        xpOrbs.splice(0, xpOrbs.length, ...xpOrbs.filter(o => !o.markedForDeletion));
    }

    function respawnPlayer() {
        player.revive();
        gameOver = false;
        // Clear some enemies for easier restart
        const enemiesToRemove = enemies.slice(0, Math.floor(enemies.length * 0.7));
        enemiesToRemove.forEach(enemy => enemy.destroy());
        enemies.splice(0, enemiesToRemove.length);
        
        uiSystem.hideGameOverScreen();
        app.ticker.start();
        uiSystem.updateUI(player);
    }

    function restartGame() {
        // Reset player
        player.health = player.maxHealth;
        player.isDead = false;
        player.level = 1;
        player.xp = 0;
        player.xpToNextLevel = 10;
        const worldBounds = cameraSystem.getWorldBounds();
        player.x = worldBounds.width / 2;
        player.y = worldBounds.height / 2;
        player.sprite.x = player.x;
        player.sprite.y = player.y;
        player.updateSprite();
        
        // Clear all enemies, projectiles, and orbs
        [...enemies, ...weaponSystem.projectiles, ...xpOrbs].forEach(obj => obj.destroy());
        enemies.length = 0;
        weaponSystem.projectiles.length = 0;
        xpOrbs.length = 0;
        
        // Reset game state
        gameOver = false;
        weaponSystem.resetWeaponCooldowns(player);
        enemySpawnTimer = 0;
        
        // Reset game stats
        gameStats.startTime = Date.now();
        gameStats.enemiesKilled = 0;
        gameStats.damageDealt = 0;
        gameStats.damageTaken = 0;
        gameStats.xpGained = 0;
        gameStats.maxLevel = 1;
        gameStats.survivalTime = 0;
        
        uiSystem.hideGameOverScreen();
        app.ticker.start();
        uiSystem.updateUI(player);
    }

    // --- MAIN GAME LOOP ---

    function update() {
        // 檢查遊戲模式
        if (gameModeManager.isMultiplayerGameStarted()) {
            updateMultiplayerGame();
        } else {
            updateSingleplayerGame();
        }
    }
    
    function updateSingleplayerGame() {
        // Update player
        player.update();

        // Update survival time
        if (!gameOver) {
            uiSystem.updateGameStats(gameStats, player);
        }

        // Only handle movement and combat if alive
        if (!player.isDead) {
            // Get movement from input system
            const move = inputSystem.getMovementVector();
            
            // Apply movement to the player with world bounds
            const worldBounds = cameraSystem.getWorldBounds();
            player.move(move.x, move.y, worldBounds);

            // Handle weapon firing
            weaponSystem.updateWeaponCooldowns(player);
            weaponSystem.fireWeapons(player, enemies, worldContainer);
        }

        // Update camera to follow player
        cameraSystem.follow(player);
        cameraSystem.update();

    // Update other game objects
    enemies.forEach(enemy => enemy.update(player));
        weaponSystem.updateProjectiles();
    xpOrbs.forEach(orb => orb.update());

        // Handle enemy spawning
        const spawnRate = player.isDead ? 300 : 90;
    if (--enemySpawnTimer <= 0) {
        spawnEnemy();
            enemySpawnTimer = spawnRate;
    }

    // Handle collisions
        const newXpOrbs = collisionSystem.checkAllCollisions(
            player, enemies, weaponSystem.projectiles, xpOrbs, 
            gameStats, cameraSystem, worldContainer, () => uiSystem.updateUI(player)
        ).newXpOrbs;
        
        // Add new XP orbs from enemy deaths
        xpOrbs.push(...newXpOrbs);

        // Handle depth sorting for 2.5D effect
        if (worldContainer.children.length > 0) {
            try {
                const allObjects = [...enemies, ...weaponSystem.projectiles, ...xpOrbs, player];
                allObjects.sort((a, b) => a.y - b.y);
                
                allObjects.forEach((obj, index) => {
                    if (obj.sprite && obj.sprite.zIndex !== undefined) {
                        obj.sprite.zIndex = index;
                    }
                });
                
                if (worldContainer.sortChildren) {
                    worldContainer.sortChildren();
                }
            } catch (sortError) {
                console.warn('Sorting failed:', sortError);
            }
        }

        // Clean up all objects
        const worldBounds = cameraSystem.getWorldBounds();
        
        weaponSystem.cleanupProjectiles(worldBounds.width, worldBounds.height);
        cleanupEnemies();
        cleanupXPOrbs();

        // Check if player died
        if (player.isDead && !gameOver) {
            gameOver = true;
            uiSystem.updateGameStats(gameStats, player);
            uiSystem.showGameOverScreen(gameStats, app);
        }
    }
    
    function updateMultiplayerGame() {
        // 多人遊戲模式：主要依賴伺服器狀態
        
        const multiplayerSystem = gameModeManager.getMultiplayerSystem();
        if (!multiplayerSystem) return;
        
        // 獲取插值後的遊戲狀態
        const interpolatedState = multiplayerSystem.getInterpolatedState();
        if (interpolatedState) {
            // 更新所有玩家狀態
            allPlayers = Object.values(interpolatedState.players || {});
            alivePlayers = allPlayers.filter(p => !p.isDead);
            deadPlayers = allPlayers.filter(p => p.isDead);
            
            // 檢查本地玩家死亡狀態變化
            const localPlayerState = multiplayerSystem.getLocalPlayer();
            if (localPlayerState) {
                // 在重啟後的短時間內，忽略伺服器發來的死亡狀態，防止因競態條件導致的死亡循環
                const timeSinceRestart = Date.now() - restartTimestamp;
                if (timeSinceRestart < 2000 && localPlayerState.isDead) {
                    console.warn(`[防禦機制] 忽略了重啟後2秒內的死亡狀態，等待伺服器同步。`);
                    localPlayerState.isDead = false; // 強制設為存活
                }

                // 如果玩家是隱藏的，並且收到了存活狀態，這是第一次有效更新，設定位置並顯示
                if (!player.sprite.visible && !localPlayerState.isDead) {
                    console.log(`✅ 收到伺服器初始位置: x=${localPlayerState.x.toFixed(1)}, y=${localPlayerState.y.toFixed(1)}`);
                    player.x = localPlayerState.x;
                    player.y = localPlayerState.y;
                }

                const wasLocalPlayerDead = localPlayerDead;
                localPlayerDead = localPlayerState.isDead;
                
                // 如果本地玩家剛死亡，進入觀察模式
                if (!wasLocalPlayerDead && localPlayerDead) {
                    console.log('本地玩家死亡，進入觀察模式');
                    spectatorSystem.enterSpectatorMode(
                        multiplayerSystem.getPlayerId(), 
                        alivePlayers
                    );
                }
                
                // --- 全新的平滑同步邏輯 ---
                // 伺服器是位置的唯一權威
                const serverX = localPlayerState.x;
                const serverY = localPlayerState.y;

                // 客戶端的當前（預測）位置
                const clientX = player.x;
                const clientY = player.y;
                
                // 持續、平滑地將客戶端位置插值到伺服器權威位置
                // 這會創建一個溫和的 "引力"，將玩家拉向正確的位置，而不是生硬地跳轉
                const lerpFactor = 0.25; // 每一幀向伺服器位置靠近 25%
                player.x += (serverX - clientX) * lerpFactor;
                player.y += (serverY - clientY) * lerpFactor;
                
                // 更新其他非位置相關的狀態
                player.health = localPlayerState.health;
                player.maxHealth = localPlayerState.maxHealth;
                player.level = localPlayerState.level;
                player.xp = localPlayerState.xp;
                player.isDead = localPlayerState.isDead;
                
                if (player.sprite) {
                    player.sprite.visible = !localPlayerState.isDead;
                }
                
                player.updateSprite();
            }
            
            // 更新多人遊戲渲染
            multiplayerRenderer.updateMultiplayerRender(
                interpolatedState, 
                multiplayerSystem.getPlayerId()
            );
            
            // 更新觀察者系統
            spectatorSystem.updateAlivePlayers(alivePlayers);
            
            // 檢查遊戲結束條件
            gameEndManager.checkGameEndConditions(alivePlayers, deadPlayers);
        }
        
        // 處理本地玩家輸入（只有在存活且不在觀察模式時）
        if (!localPlayerDead && !spectatorSystem.isInSpectatorMode() && !player.isDead) {
            const move = inputSystem.getMovementVector();
            const now = Date.now();
            
            // 客戶端移動預測：立即進行本地移動
            if (move.x !== 0 || move.y !== 0) {
                const worldBounds = cameraSystem.getWorldBounds();
                player.move(move.x, move.y, worldBounds);
                // 偶爾輸出移動日志用於調試
                if (Math.random() < 0.005) { // 0.5% 機率輸出，進一步減少刷屏
                    console.log(`✅ 本地移動預測正常: x=${player.x.toFixed(1)}, y=${player.y.toFixed(1)}`);
                }
            }
            
            // 決定是否發送移動更新
            const movementChanged = move.x !== lastSentMovement.x || move.y !== lastSentMovement.y;
            const continuousMovement = (move.x !== 0 || move.y !== 0) && (now - lastMovementSentTime > movementSendInterval);

            if (movementChanged || continuousMovement) {
                gameModeManager.sendPlayerInput({
                    type: 'movement',
                    x: move.x,
                    y: move.y,
                    timestamp: now
                });
                lastSentMovement = { x: move.x, y: move.y };
                lastMovementSentTime = now;
            }
            
            // 檢查射擊輸入
            const isFiring = inputSystem.isMousePressed || inputSystem.isSpacePressed;
            
            // 只在射擊狀態改變時發送射擊輸入
            if (isFiring !== lastSentFire) {
                if (isFiring) {
                    gameModeManager.sendPlayerInput({
                        type: 'fire_weapons',
                        timestamp: now
                    });
                }
                lastSentFire = isFiring;
            }
        }
        
        // 更新本地玩家（無敵時間等狀態）
        player.update();
        
        // 更新相機（根據模式）
        if (spectatorSystem.isInSpectatorMode()) {
            // 在觀察模式下，相機由觀察系統控制
            spectatorSystem.update();
        } else {
            // 正常模式下跟隨本地玩家
            cameraSystem.follow(player);
            cameraSystem.update();
        }
        
        // 更新存活時間
        if (!gameOver && !localPlayerDead) {
            uiSystem.updateGameStats(gameStats, player);
        }
        
        // 不再在這裡處理單人遊戲的結束邏輯，交由GameEndManager處理
    }

    // Set up level up callback with upgrade system
    upgradeSystem.setupLevelUpCallback(player, () => uiSystem.updateUI(player));

    // Set up respawn and restart buttons
    document.getElementById('respawn-btn').addEventListener('click', respawnPlayer);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // Use PixiJS ticker for main game loop
    app.ticker.add(() => {
        try {
            update();
        } catch (updateError) {
            console.error('Update loop error:', updateError);
        }
    });

    // Initialize UI
    uiSystem.updateUI(player);
    
    // Initialize Multiplayer System
    const multiplayerSystem = new MultiplayerSystem();
    
    // Setup game mode manager
    gameModeManager.setMultiplayerSystem(multiplayerSystem);
    
    // Setup game end manager with multiplayer system
    gameEndManager.multiplayerSystem = multiplayerSystem;
    
    // 監聽遊戲模式改變
    gameModeManager.on('mode_changed', (data) => {
        console.log('遊戲模式改變:', data.mode);
        if (data.mode === 'singleplayer') {
            // 清理多人遊戲對象
            multiplayerRenderer.cleanup();
            // 重新啟動單人遊戲
            gameOver = false;
            app.ticker.start();
        }
    });
    
    // 監聽多人遊戲開始
    gameModeManager.on('multiplayer_game_started', () => {
        console.log('多人遊戲開始');
        gameOver = false;
        localPlayerDead = false;
        
        // 不要再由客戶端決定初始位置，等待伺服器的第一次狀態更新
        // 這可以防止客戶端和伺服器初始位置不同步導致的 "跳躍"
        player.sprite.visible = false;
        
        // 清理單人模式的敵人和orb
        [...enemies, ...xpOrbs].forEach(obj => obj.destroy());
        enemies.length = 0;
        xpOrbs.length = 0;
        weaponSystem.projectiles.forEach(proj => proj.destroy());
        weaponSystem.projectiles.length = 0;
        
        // 清理觀察者模式
        spectatorSystem.exitSpectatorMode();
        
        // 開始遊戲統計
        const playerCount = multiplayerSystem.getPlayerCount();
        gameEndManager.startGame(playerCount);
    });
    
    // 監聽觀察者系統事件
    spectatorSystem.on('all_players_dead', () => {
        console.log('所有玩家死亡，遊戲結束');
        gameEndManager.endGame('all_dead');
    });
    
    // 監聽遊戲結束管理器事件
    gameEndManager.on('restart_requested', () => {
        console.log('處理重新開始請求，等待伺服器確認...');
        showNotification('🔄 正在重新開始，請稍候...', 'info');
    });
    
    gameEndManager.on('lobby_requested', () => {
        console.log('處理回到大廳請求');
        // 清理觀察者模式
        spectatorSystem.exitSpectatorMode();
        gameOver = false;
        localPlayerDead = false;
        // 重置輸入狀態
        lastSentMovement = { x: 0, y: 0 };
        lastSentFire = false;
        
        // 重新開始遊戲統計
        const playerCount = multiplayerSystem.getPlayerCount();
        gameEndManager.startGame(playerCount);
    });
    
    gameEndManager.on('leave_requested', () => {
        console.log('處理離開房間請求');
        // 清理所有多人遊戲系統
        spectatorSystem.cleanup();
        gameEndManager.cleanup();
        multiplayerRenderer.cleanup();
    });
    
    multiplayerSystem.on('game_restarted', (message) => {
        console.log('✅ 收到伺服器遊戲重新開始通知:', message.message);
        
        // 這是唯一權威的重置點
        
        // 隱藏遊戲結束UI
        gameEndManager.hideGameEndUI();

        // 重置本地遊戲狀態
        gameOver = false;
        localPlayerDead = false;
        
        // 重置玩家狀態
        player.isDead = false;
        player.health = player.maxHealth;
        player.level = 1;
        player.xp = 0;
        player.sprite.visible = false; // 等待伺服器給定初始位置
        
        // 清理觀察者模式
        spectatorSystem.exitSpectatorMode();

        // 重置輸入狀態
        lastSentMovement = { x: 0, y: 0 };
        lastSentFire = false;
        lastMovementSentTime = 0;
        restartTimestamp = Date.now(); // 記錄重啟時間
        
        // 重新開始遊戲統計
        const playerCount = multiplayerSystem.getPlayerCount();
        gameEndManager.startGame(playerCount);

        showNotification('🎮 遊戲已重新開始！', 'success');
    });
    
    // Import and initialize Multiplayer UI
    import('./MultiplayerUI.js').then(({ MultiplayerUI }) => {
        const multiplayerUI = new MultiplayerUI(multiplayerSystem);
        
        // Add multiplayer button to UI
        const multiplayerBtn = document.createElement('button');
        multiplayerBtn.textContent = '🌐 多人遊戲';
        multiplayerBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3498db;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            border: 2px solid #2980b9;
        `;
        
        // 添加懸停效果
        multiplayerBtn.onmouseenter = () => {
            multiplayerBtn.style.background = '#2980b9';
            multiplayerBtn.style.transform = 'scale(1.05)';
        };
        
        multiplayerBtn.onmouseleave = () => {
            multiplayerBtn.style.background = '#3498db';
            multiplayerBtn.style.transform = 'scale(1)';
        };
        
        // 添加閃爍動畫以吸引注意
        let isGlowing = false;
        setInterval(() => {
            if (!isGlowing) {
                multiplayerBtn.style.boxShadow = '0 4px 20px rgba(52, 152, 219, 0.8)';
                isGlowing = true;
            } else {
                multiplayerBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
                isGlowing = false;
            }
        }, 2000);
        
        multiplayerBtn.onclick = () => {
            // 切換到多人模式
            gameModeManager.switchToMultiplayer();
            multiplayerUI.show();
        };
        document.body.appendChild(multiplayerBtn);
        
        // 監聽多人遊戲開始事件
        window.addEventListener('start-multiplayer-game', () => {
            gameModeManager.startMultiplayerGame();
        });
        
        console.log('Multiplayer system initialized!');
    }).catch(error => {
        console.warn('Failed to load multiplayer UI:', error);
    });
    
    // 通知系統
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // 根據類型設置顏色
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒後自動消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // 將通知函數掛載到全局
    window.showNotification = showNotification;
    
    console.log('Game initialized successfully with modular systems!');
}

// Start the game
initializeGame().catch((error) => {
    console.error('Failed to initialize game:', error);
    
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.innerHTML = `
            <div style="color: red; text-align: center; padding: 20px;">
                <h3>遊戲初始化失敗</h3>
                <p>請檢查瀏覽器是否支援 WebGL 或 Canvas 2D</p>
                <button onclick="location.reload()">重新嘗試</button>
            </div>
        `;
    }
});