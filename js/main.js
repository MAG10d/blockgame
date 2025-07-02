'use strict';

// Import all our classes
import Player from './Player.js';
import Projectile from './Projectile.js';
import Enemy from './Enemy.js';
import XPOrb from './XPOrb.js';
import CARD_UPGRADES from './CardUpgrades.js';

// PIXI.JS SETUP
const app = new PIXI.Application();

// Initialize PIXI app asynchronously
async function initializeGame() {
    try {
        // Try WebGL first, fallback to Canvas if needed
        await app.init({
            width: 800,
            height: 600,
            backgroundColor: 0x000000,
            antialias: true,
            preference: 'webgl2' // Try WebGL2 first
        });
    } catch (webglError) {
        console.warn('WebGL failed, falling back to Canvas 2D:', webglError);
        try {
            await app.init({
                width: 800,
                height: 600,
                backgroundColor: 0x000000,
                antialias: true,
                forceCanvas: true // Force Canvas 2D fallback
            });
        } catch (canvasError) {
            console.error('Both WebGL and Canvas failed:', canvasError);
            return;
        }
    }

    // Add the canvas to the HTML document
    document.getElementById('game-container').appendChild(app.canvas);

    // Create 2.5D world container
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Apply 2.5D perspective transformation
    // Use different approach for better compatibility
    try {
        // Method 1: Direct transform setting (PixiJS v7+)
        if (worldContainer.transform && worldContainer.transform.setFromMatrix) {
            worldContainer.transform.setFromMatrix(
                new PIXI.Matrix(1, 0.3, 0, 0.8, 0, 100)
            );
        } else {
            // Method 2: Manual transform properties (PixiJS v6 compatibility)
            worldContainer.skew.set(0.3, 0);
            worldContainer.scale.set(1, 0.8);
            worldContainer.position.set(0, 100);
        }
    } catch (transformError) {
        console.warn('Transform failed, using basic scaling:', transformError);
        // Fallback: simple scaling
        worldContainer.scale.set(1, 0.8);
        worldContainer.position.set(0, 100);
    }

    // Center the world view
    worldContainer.x = app.screen.width * 0.1;
    worldContainer.y = app.screen.height * 0.1;

    // Add WebGL context loss handler
    if (app.renderer.gl) {
        const canvas = app.view || app.canvas;
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost, attempting recovery...');
            
            // Stop the game loop temporarily
            app.ticker.stop();
            
            setTimeout(() => {
                // Attempt to restart
                console.log('Attempting to restart with Canvas fallback...');
                location.reload(); // Simple restart for now
            }, 1000);
        });

        canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            app.ticker.start();
        });
    }

    // UI Elements
    const characterDisplay = document.getElementById('character-display');
    const weaponDisplay = document.getElementById('weapon-display');
    const xpBarFill = document.getElementById('xp-bar-fill');

    // DATA
    const characterData = {
        'warrior': { name: 'Warrior', width: 30, height: 30, color: 0x00BFFF, speed: 4 }
    };
    const weaponData = {
        'magicMissile': { name: 'Magic Missile', cooldown: 120, projectileSize: 10, projectileSpeed: 5, projectileColor: 0xFF00FF }
    };

    // GAME STATE
    const player = new Player(app.screen.width / 2, app.screen.height / 2, characterData.warrior, weaponData, worldContainer);
    const projectiles = [], enemies = [], xpOrbs = [];
    let weaponCooldownTimer = 0, enemySpawnTimer = 0;
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

    // Unified input state for both keyboard and touch
    const inputState = {
        keys: {
            w: false, a: false, s: false, d: false,
            ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
            r: false // R key for respawn
        },
        touch: {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        }
    };

    // --- COLLISION HELPER FUNCTIONS ---

    /**
     * Check circular collision between two objects
     * @param {Object} obj1 - First object with x, y, width, height
     * @param {Object} obj2 - Second object with x, y, width, height
     * @param {number} buffer - Additional buffer distance (optional)
     * @returns {boolean} - True if objects are colliding
     */
    function checkCircularCollision(obj1, obj2, buffer = 0) {
        const centerX1 = obj1.x + obj1.width / 2;
        const centerY1 = obj1.y + obj1.height / 2;
        const centerX2 = obj2.x + obj2.width / 2;
        const centerY2 = obj2.y + obj2.height / 2;
        
        const radius1 = Math.min(obj1.width, obj1.height) / 2;
        const radius2 = Math.min(obj2.width, obj2.height) / 2;
        
        const distance = Math.sqrt(
            Math.pow(centerX2 - centerX1, 2) + 
            Math.pow(centerY2 - centerY1, 2)
        );
        
        return distance < (radius1 + radius2 + buffer);
    }

    /**
     * Get distance between two objects
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {number} - Distance between centers
     */
    function getDistance(obj1, obj2) {
        const centerX1 = obj1.x + obj1.width / 2;
        const centerY1 = obj1.y + obj1.height / 2;
        const centerX2 = obj2.x + obj2.width / 2;
        const centerY2 = obj2.y + obj2.height / 2;
        
        return Math.sqrt(
            Math.pow(centerX2 - centerX1, 2) + 
            Math.pow(centerY2 - centerY1, 2)
        );
    }

    /**
     * Apply knockback effect to an object
     * @param {Object} target - Object to be knocked back
     * @param {Object} source - Source of the knockback
     * @param {number} force - Knockback force
     */
    function applyKnockback(target, source, force) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const knockbackX = Math.cos(angle) * force;
        const knockbackY = Math.sin(angle) * force;
        
        // Apply knockback with boundary checking
        target.x += knockbackX;
        target.y += knockbackY;
        
        // Update sprite position
        if (target.sprite) {
            target.sprite.x = target.x;
            target.sprite.y = target.y;
        }
    }

    /**
     * Separate overlapping enemies
     */
    function separateEnemies() {
        const separationForce = 2;
        const minDistance = 30; // Minimum distance between enemies
        
        for (let i = 0; i < enemies.length; i++) {
            for (let j = i + 1; j < enemies.length; j++) {
                const enemy1 = enemies[i];
                const enemy2 = enemies[j];
                
                if (checkCircularCollision(enemy1, enemy2, minDistance)) {
                    const distance = getDistance(enemy1, enemy2);
                    if (distance < minDistance && distance > 0) {
                        const overlap = minDistance - distance;
                        const angle = Math.atan2(enemy2.y - enemy1.y, enemy2.x - enemy1.x);
                        
                        const separationX = Math.cos(angle) * overlap * 0.5;
                        const separationY = Math.sin(angle) * overlap * 0.5;
                        
                        // Move enemies apart
                        enemy1.x -= separationX;
                        enemy1.y -= separationY;
                        enemy2.x += separationX;
                        enemy2.y += separationY;
                        
                        // Update sprite positions
                        enemy1.sprite.x = enemy1.x;
                        enemy1.sprite.y = enemy1.y;
                        enemy2.sprite.x = enemy2.x;
                        enemy2.sprite.y = enemy2.y;
                    }
                }
            }
        }
    }

    // --- INPUT HANDLING ---

    // Keyboard Handlers
    window.addEventListener('keydown', (e) => {
        if (inputState.keys.hasOwnProperty(e.key)) inputState.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
        if (inputState.keys.hasOwnProperty(e.key)) inputState.keys[e.key] = false;
    });

    // Touch Handlers for mobile - use correct canvas reference
    const gameCanvas = app.canvas || app.view;
    gameCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent screen scrolling
        inputState.touch.isDragging = true;
        const touch = e.touches[0];
        inputState.touch.startX = touch.clientX;
        inputState.touch.startY = touch.clientY;
        inputState.touch.currentX = touch.clientX;
        inputState.touch.currentY = touch.clientY;
    }, { passive: false });

    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent screen scrolling
        if (inputState.touch.isDragging) {
            const touch = e.touches[0];
            inputState.touch.currentX = touch.clientX;
            inputState.touch.currentY = touch.clientY;
        }
    }, { passive: false });

    gameCanvas.addEventListener('touchend', (e) => {
        inputState.touch.isDragging = false;
    });
    gameCanvas.addEventListener('touchcancel', (e) => {
        inputState.touch.isDragging = false;
    });

    // --- HELPER FUNCTIONS ---

    function fireWeapon() {
        if (player.isDead) return;
        
        const weapon = player.weapon;
        const angle = Math.random() * 2 * Math.PI;
        const vx = Math.cos(angle) * weapon.projectileSpeed;
        const vy = Math.sin(angle) * weapon.projectileSpeed;
        const projX = player.x + player.width / 2 - weapon.projectileSize / 2;
        const projY = player.y + player.height / 2 - weapon.projectileSize / 2;
        projectiles.push(new Projectile(projX, projY, vx, vy, weapon, worldContainer));
    }

    function spawnEnemy() {
        if (gameOver) return;
        
        const size = 25;
        let x, y;
        // Adjust spawn boundaries for the transformed world
        const worldWidth = app.screen.width * 1.2;
        const worldHeight = app.screen.height * 1.2;
        
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - size : worldWidth;
            y = Math.random() * worldHeight;
        } else {
            x = Math.random() * worldWidth;
            y = Math.random() < 0.5 ? 0 - size : worldHeight;
        }
        enemies.push(new Enemy(x, y, worldContainer));
    }

    function checkCollisions() {
        // Projectile vs Enemy collision (using circular collision)
        projectiles.forEach(proj => {
            enemies.forEach(enemy => {
                if (checkCircularCollision(proj, enemy)) {
                    proj.markedForDeletion = true;
                    
                    // Apply knockback to enemy
                    applyKnockback(enemy, proj, 8);
                    
                    // Deal damage to enemy
                    const damage = player.weapon.damage || 20;
                    gameStats.damageDealt += damage;
                    const enemyDied = enemy.takeDamage(damage);
                    
                    if (enemyDied) {
                        gameStats.enemiesKilled++;
                        xpOrbs.push(new XPOrb(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, worldContainer));
                    }
                }
            });
        });

        // Player vs Enemy collision (direct contact damage)
        if (!player.isDead) {
            enemies.forEach(enemy => {
                if (checkCircularCollision(player, enemy, 5)) {
                    // Deal damage to player
                    if (player.takeDamage(enemy.damage)) {
                        gameStats.damageTaken += enemy.damage;
                        
                        // Apply knockback to player
                        applyKnockback(player, enemy, 15);
                        
                        // Apply slight knockback to enemy as well
                        applyKnockback(enemy, player, 5);
                        
                        // Screen shake effect (simple implementation)
                        if (worldContainer) {
                            const originalX = worldContainer.x;
                            const originalY = worldContainer.y;
                            const shakeIntensity = 5;
                            
                            worldContainer.x += (Math.random() - 0.5) * shakeIntensity;
                            worldContainer.y += (Math.random() - 0.5) * shakeIntensity;
                            
                            // Reset after a short delay
                            setTimeout(() => {
                                worldContainer.x = originalX;
                                worldContainer.y = originalY;
                            }, 100);
                        }
                    }
                }
            });
        }

        // Player vs XPOrb collision (using circular collision)
        xpOrbs.forEach(orb => {
            if (checkCircularCollision(player, orb)) {
                gameStats.xpGained += orb.value;
                player.gainXP(orb.value);
                orb.markedForDeletion = true;
                updateUI(); // Update UI immediately for a responsive feel
            }
        });

        // Separate overlapping enemies
        if (enemies.length > 1) {
            separateEnemies();
        }

        // Check if player died
        if (player.isDead && !gameOver) {
            gameOver = true;
            updateGameStats();
            showGameOverScreen();
        }
    }

    function updateGameStats() {
        gameStats.survivalTime = Math.floor((Date.now() - gameStats.startTime) / 1000);
        gameStats.maxLevel = Math.max(gameStats.maxLevel, player.level);
    }

    function showGameOverScreen() {
        const modal = document.getElementById('game-over-modal');
        const statsContainer = document.getElementById('game-stats');
        
        // Format survival time
        const minutes = Math.floor(gameStats.survivalTime / 60);
        const seconds = gameStats.survivalTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Calculate some derived stats
        const averageDPS = gameStats.survivalTime > 0 ? (gameStats.damageDealt / gameStats.survivalTime).toFixed(1) : 0;
        const killRate = gameStats.survivalTime > 0 ? (gameStats.enemiesKilled / gameStats.survivalTime * 60).toFixed(1) : 0;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">⏱️ 存活時間</span>
                <span class="stat-value">${timeString}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">📈 最高等級</span>
                <span class="stat-value">Level ${gameStats.maxLevel}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">💀 敵人擊殺</span>
                <span class="stat-value">${gameStats.enemiesKilled}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">⭐ 經驗獲得</span>
                <span class="stat-value">${gameStats.xpGained}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">⚔️ 造成傷害</span>
                <span class="stat-value">${gameStats.damageDealt}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">🩸 受到傷害</span>
                <span class="stat-value">${gameStats.damageTaken}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">📊 平均 DPS</span>
                <span class="stat-value">${averageDPS}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">🎯 擊殺/分鐘</span>
                <span class="stat-value">${killRate}</span>
            </div>
        `;
        
        modal.style.display = 'flex';
        app.ticker.stop(); // Pause game
    }

    function respawnPlayer() {
        player.revive();
        gameOver = false;
        // Clear some enemies for easier restart
        const enemiesToRemove = enemies.slice(0, Math.floor(enemies.length * 0.7));
        enemiesToRemove.forEach(enemy => enemy.destroy());
        enemies.splice(0, enemiesToRemove.length);
        
        document.getElementById('game-over-modal').style.display = 'none';
        app.ticker.start();
        updateUI();
    }

    function restartGame() {
        // Reset player
        player.health = player.maxHealth;
        player.isDead = false;
        player.level = 1;
        player.xp = 0;
        player.xpToNextLevel = 10;
        player.x = app.screen.width / 2;
        player.y = app.screen.height / 2;
        player.sprite.x = player.x;
        player.sprite.y = player.y;
        player.updateSprite();
        
        // Clear all enemies and projectiles
        [...enemies, ...projectiles, ...xpOrbs].forEach(obj => obj.destroy());
        enemies.length = 0;
        projectiles.length = 0;
        xpOrbs.length = 0;
        
        // Reset game state
        gameOver = false;
        weaponCooldownTimer = 0;
        enemySpawnTimer = 0;
        
        // Reset stats
        gameStats.startTime = Date.now();
        gameStats.enemiesKilled = 0;
        gameStats.damageDealt = 0;
        gameStats.damageTaken = 0;
        gameStats.xpGained = 0;
        gameStats.maxLevel = 1;
        gameStats.survivalTime = 0;
        
        document.getElementById('game-over-modal').style.display = 'none';
        app.ticker.start();
        updateUI();
    }

    // Game Over Modal Event Listeners
    document.getElementById('respawn-btn').addEventListener('click', respawnPlayer);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    function updateUI() {
        const healthPercentage = (player.health / player.maxHealth) * 100;
        let healthColor = '#00ff00'; // Green
        if (healthPercentage <= 25) {
            healthColor = '#ff0000'; // Red
        } else if (healthPercentage <= 50) {
            healthColor = '#ff8800'; // Orange
        }

        characterDisplay.innerHTML = `
            <b>Character:</b><br>
            ${player.name} (Lvl ${player.level})<br>
            <div style="background: #333; border: 1px solid #fff; height: 8px; margin-top: 4px;">
                <div style="background: ${healthColor}; height: 100%; width: ${healthPercentage}%; transition: width 0.3s;"></div>
            </div>
            <small>HP: ${player.health}/${player.maxHealth}</small>
        `;
        
        weaponDisplay.innerHTML = `<b>Weapon:</b><br>${player.weapon.name}`;
        
        const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
        xpBarFill.style.width = `${xpPercentage}%`;
    }

    // --- GAME LOOP FUNCTIONS ---

    function update() {
        // Update player
        player.update();

        // Update survival time
        if (!gameOver) {
            gameStats.survivalTime = Math.floor((Date.now() - gameStats.startTime) / 1000);
        }

        // Only handle movement and combat if alive
        if (!player.isDead) {
            // Determine movement direction from input
            const move = { x: 0, y: 0 };
            if (inputState.touch.isDragging) {
                // Touch input has priority
                const dx = inputState.touch.currentX - inputState.touch.startX;
                const dy = inputState.touch.currentY - inputState.touch.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 10) { // Use a deadzone of 10 pixels
                    move.x = dx / distance;
                    move.y = dy / distance;
                }
            } else {
                // Fallback to keyboard input
                const keys = inputState.keys;
                if (keys.w || keys.ArrowUp) move.y -= 1;
                if (keys.s || keys.ArrowDown) move.y += 1;
                if (keys.a || keys.ArrowLeft) move.x -= 1;
                if (keys.d || keys.ArrowRight) move.x += 1;
            }
            
            // Apply movement to the player (use larger world bounds)
            const worldBounds = {
                width: app.screen.width * 1.2,
                height: app.screen.height * 1.2
            };
            player.move(move.x, move.y, worldBounds);

            // Handle weapon firing
            if (--weaponCooldownTimer <= 0) {
                fireWeapon();
                weaponCooldownTimer = player.weapon.cooldown;
            }
        }

        // Update other game objects
        enemies.forEach(enemy => enemy.update(player));
        projectiles.forEach(proj => proj.update());
        xpOrbs.forEach(orb => orb.update());

        // Handle enemy spawning (slower when player is dead)
        const spawnRate = player.isDead ? 300 : 90; // Slower spawn when dead
        if (--enemySpawnTimer <= 0) {
            spawnEnemy();
            enemySpawnTimer = spawnRate;
        }

        // Handle collisions
        checkCollisions();

        // Sort children by Y position for proper depth sorting in 2.5D
        // Only if worldContainer has children
        if (worldContainer.children.length > 0) {
            try {
                const allObjects = [...enemies, ...projectiles, ...xpOrbs, player];
                allObjects.sort((a, b) => a.y - b.y);
                
                // Update z-index based on Y position
                allObjects.forEach((obj, index) => {
                    if (obj.sprite && obj.sprite.zIndex !== undefined) {
                        obj.sprite.zIndex = index;
                    }
                });
                
                // Safe sort children
                if (worldContainer.sortChildren) {
                    worldContainer.sortChildren();
                }
            } catch (sortError) {
                console.warn('Sorting failed:', sortError);
            }
        }

        // Clean up marked items from all arrays
        const worldWidth = app.screen.width * 1.2;
        const worldHeight = app.screen.height * 1.2;
        
        // Clean up projectiles
        const projToRemove = projectiles.filter(p => p.markedForDeletion || p.x < -50 || p.x > worldWidth + 50 || p.y < -50 || p.y > worldHeight + 50);
        projToRemove.forEach(proj => {
            try {
                proj.destroy();
            } catch (e) {
                console.warn('Failed to destroy projectile:', e);
            }
        });
        projectiles.splice(0, projectiles.length, ...projectiles.filter(p => !p.markedForDeletion && p.x > -50 && p.x < worldWidth + 50 && p.y > -50 && p.y < worldHeight + 50));
        
        // Clean up enemies
        const enemyToRemove = enemies.filter(e => e.markedForDeletion);
        enemyToRemove.forEach(enemy => {
            try {
                enemy.destroy();
            } catch (e) {
                console.warn('Failed to destroy enemy:', e);
            }
        });
        enemies.splice(0, enemies.length, ...enemies.filter(e => !e.markedForDeletion));
        
        // Clean up XP orbs
        const orbToRemove = xpOrbs.filter(o => o.markedForDeletion);
        orbToRemove.forEach(orb => {
            try {
                orb.destroy();
            } catch (e) {
                console.warn('Failed to destroy orb:', e);
            }
        });
        xpOrbs.splice(0, xpOrbs.length, ...xpOrbs.filter(o => !o.markedForDeletion));
    }

    // --- CARD CHOICE SYSTEM ---

    function showCardChoice(player) {
        const modal = document.getElementById('card-choice-modal');
        const container = document.getElementById('card-choice-container');
        
        // Clear previous cards
        container.innerHTML = '';
        
        // Pick 3 random upgrades
        const availableUpgrades = [...CARD_UPGRADES];
        const chosenUpgrades = [];
        for (let i = 0; i < 3 && availableUpgrades.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
            chosenUpgrades.push(availableUpgrades.splice(randomIndex, 1)[0]);
        }
        
        // Create card elements
        chosenUpgrades.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = 'card-choice';
            card.innerHTML = `
                <div class="card-icon">${upgrade.icon}</div>
                <div class="card-title">${upgrade.title}</div>
                <div class="card-desc">${upgrade.desc}</div>
            `;
            
            card.addEventListener('click', () => {
                upgrade.apply(player);
                modal.style.display = 'none';
                updateUI(); // Refresh the UI after applying upgrade
                
                // Resume the game
                app.ticker.start();
            });
            
            container.appendChild(card);
        });
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Pause the game
        app.ticker.stop();
    }

    // Set up level up callback
    player.levelUp = function(onLevelUp) {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        
        // Heal on level up
        this.heal(20);
        
        // Show card choice instead of calling callback
        showCardChoice(this);
    };

    // --- MAIN GAME LOOP ---

    // Use PixiJS ticker instead of requestAnimationFrame
    app.ticker.add(() => {
        try {
            update();
        } catch (updateError) {
            console.error('Update loop error:', updateError);
        }
        // No need for explicit draw() calls - PixiJS handles rendering automatically
    });

    // Initialize UI
    updateUI();
    
    console.log('Game initialized successfully!');
}

// Start the game with comprehensive error handling
initializeGame().catch((error) => {
    console.error('Failed to initialize game:', error);
    
    // Show user-friendly error message
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