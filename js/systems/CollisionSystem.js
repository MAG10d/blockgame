import XPOrb from '../XPOrb.js';

export class CollisionSystem {
    /**
     * Check circular collision between two objects
     * @param {Object} obj1 - First object with x, y, width, height
     * @param {Object} obj2 - Second object with x, y, width, height
     * @param {number} buffer - Additional buffer distance (optional)
     * @returns {boolean} - True if objects are colliding
     */
    checkCircularCollision(obj1, obj2, buffer = 0) {
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
    getDistance(obj1, obj2) {
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
    applyKnockback(target, source, force) {
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
     * @param {Array} enemies - Array of enemy objects
     */
    separateEnemies(enemies) {
        const separationForce = 2;
        const minDistance = 30; // Minimum distance between enemies
        
        for (let i = 0; i < enemies.length; i++) {
            for (let j = i + 1; j < enemies.length; j++) {
                const enemy1 = enemies[i];
                const enemy2 = enemies[j];
                
                if (this.checkCircularCollision(enemy1, enemy2, minDistance)) {
                    const distance = this.getDistance(enemy1, enemy2);
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

    /**
     * Check all collisions in the game
     * @param {Player} player - Player object
     * @param {Array} enemies - Array of enemies
     * @param {Array} projectiles - Array of projectiles
     * @param {Array} xpOrbs - Array of XP orbs
     * @param {Object} gameStats - Game statistics object
     * @param {Object} cameraSystem - Camera system for screen shake
     * @param {Object} worldContainer - World container for creating objects
     * @param {Function} updateUI - UI update function
     * @returns {Object} - Object with arrays to be cleaned up
     */
    checkAllCollisions(player, enemies, projectiles, xpOrbs, gameStats, cameraSystem, worldContainer, updateUI) {
        const toCleanup = {
            projectiles: [],
            enemies: [],
            xpOrbs: [],
            newXpOrbs: []
        };

        // Projectile vs Enemy collision
        projectiles.forEach(proj => {
            enemies.forEach(enemy => {
                if (this.checkCircularCollision(proj, enemy)) {
                    proj.markedForDeletion = true;
                    
                    // Apply knockback to enemy
                    this.applyKnockback(enemy, proj, 8);
                    
                    // Deal damage to enemy
                    const damage = proj.damage;
                    gameStats.damageDealt += damage;
                    const enemyDied = enemy.takeDamage(damage);
                    
                    if (enemyDied) {
                        gameStats.enemiesKilled++;
                        toCleanup.newXpOrbs.push(new XPOrb(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, worldContainer));
                    }
                }
            });
        });

        // Player vs Enemy collision (direct contact damage)
        if (!player.isDead) {
            enemies.forEach(enemy => {
                if (this.checkCircularCollision(player, enemy, 5)) {
                    // Deal damage to player
                    if (player.takeDamage(enemy.damage)) {
                        gameStats.damageTaken += enemy.damage;
                        
                        // Apply knockback to player
                        this.applyKnockback(player, enemy, 15);
                        
                        // Apply slight knockback to enemy as well
                        this.applyKnockback(enemy, player, 5);
                        
                        // Camera shake effect
                        if (cameraSystem) {
                            cameraSystem.shake(8, 150);
                        }
                    }
                }
            });
        }

        // Player vs XPOrb collision
        xpOrbs.forEach(orb => {
            if (this.checkCircularCollision(player, orb)) {
                gameStats.xpGained += orb.value;
                player.gainXP(orb.value);
                orb.markedForDeletion = true;
                updateUI(); // Update UI immediately for a responsive feel
            }
        });

        // Separate overlapping enemies
        if (enemies.length > 1) {
            this.separateEnemies(enemies);
        }

        return toCleanup;
    }
} 