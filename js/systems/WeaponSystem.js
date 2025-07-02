import Projectile from '../Projectile.js';

export class WeaponSystem {
    constructor() {
        this.projectiles = [];
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
     * Update all weapon cooldowns
     * @param {Player} player - Player object
     */
    updateWeaponCooldowns(player) {
        player.weapons.forEach(weapon => {
            if (weapon.currentCooldown > 0) {
                weapon.currentCooldown--;
            }
        });
    }

    /**
     * Fire all ready weapons
     * @param {Player} player - Player object
     * @param {Array} enemies - Array of enemies
     * @param {Object} worldContainer - PixiJS container
     */
    fireWeapons(player, enemies, worldContainer) {
        if (player.isDead) return;
        
        // Fire each weapon that's off cooldown
        player.weapons.forEach(weapon => {
            if (weapon.currentCooldown <= 0) {
                let angle;
                
                // Find the nearest enemy for targeting
                if (enemies.length > 0) {
                    let nearestEnemy = enemies[0];
                    let shortestDistance = this.getDistance(player, nearestEnemy);
                    
                    for (let i = 1; i < enemies.length; i++) {
                        const distance = this.getDistance(player, enemies[i]);
                        if (distance < shortestDistance) {
                            shortestDistance = distance;
                            nearestEnemy = enemies[i];
                        }
                    }
                    
                    // Calculate angle to nearest enemy
                    const playerCenterX = player.x + player.width / 2;
                    const playerCenterY = player.y + player.height / 2;
                    const enemyCenterX = nearestEnemy.x + nearestEnemy.width / 2;
                    const enemyCenterY = nearestEnemy.y + nearestEnemy.height / 2;
                    
                    angle = Math.atan2(enemyCenterY - playerCenterY, enemyCenterX - playerCenterX);
                } else {
                    // Fallback to random direction if no enemies exist
                    angle = Math.random() * 2 * Math.PI;
                }
                
                const vx = Math.cos(angle) * weapon.projectileSpeed;
                const vy = Math.sin(angle) * weapon.projectileSpeed;
                const projX = player.x + player.width / 2 - weapon.projectileSize / 2;
                const projY = player.y + player.height / 2 - weapon.projectileSize / 2;
                this.projectiles.push(new Projectile(projX, projY, vx, vy, weapon, worldContainer));
                
                // Reset this weapon's cooldown
                weapon.currentCooldown = weapon.cooldown;
            }
        });
    }

    /**
     * Update all projectiles
     */
    updateProjectiles() {
        this.projectiles.forEach(proj => proj.update());
    }

    /**
     * Clean up projectiles that are out of bounds or marked for deletion
     * @param {number} worldWidth - World width
     * @param {number} worldHeight - World height
     */
    cleanupProjectiles(worldWidth, worldHeight) {
        const projToRemove = this.projectiles.filter(p => 
            p.markedForDeletion || 
            p.x < -50 || p.x > worldWidth + 50 || 
            p.y < -50 || p.y > worldHeight + 50
        );
        
        projToRemove.forEach(proj => {
            try {
                proj.destroy();
            } catch (e) {
                console.warn('Failed to destroy projectile:', e);
            }
        });
        
        this.projectiles = this.projectiles.filter(p => 
            !p.markedForDeletion && 
            p.x > -50 && p.x < worldWidth + 50 && 
            p.y > -50 && p.y < worldHeight + 50
        );
    }

    /**
     * Reset all weapon cooldowns
     * @param {Player} player - Player object
     */
    resetWeaponCooldowns(player) {
        player.weapons.forEach(weapon => {
            weapon.currentCooldown = 0;
        });
    }
} 