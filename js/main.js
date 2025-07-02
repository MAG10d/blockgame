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
        
        // Handle window resize
        function handleResize() {
            app.renderer.resize(window.innerWidth, window.innerHeight);
            cameraSystem.resize(window.innerWidth, window.innerHeight);
        }
        window.addEventListener('resize', handleResize);

    } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
        throw error;
    }

    // Create world container for camera effects
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Initialize all systems
    const weaponSystem = new WeaponSystem();
    const collisionSystem = new CollisionSystem();
    const inputSystem = new InputSystem(app.canvas || app.view);
    const uiSystem = new UISystem();
    const upgradeSystem = new UpgradeSystem(app);
    const cameraSystem = new CameraSystem(worldContainer, app.screen.width, app.screen.height);

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
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        multiplayerBtn.onclick = () => multiplayerUI.show();
        document.body.appendChild(multiplayerBtn);
        
        console.log('Multiplayer system initialized!');
    }).catch(error => {
        console.warn('Failed to load multiplayer UI:', error);
    });
    
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