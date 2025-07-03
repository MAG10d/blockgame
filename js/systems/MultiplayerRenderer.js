import Player from '../Player.js';
import Enemy from '../Enemy.js';
import XPOrb from '../XPOrb.js';
import Projectile from '../Projectile.js';

export class MultiplayerRenderer {
    constructor(worldContainer, characterData, weaponData) {
        this.worldContainer = worldContainer;
        this.characterData = characterData;
        this.weaponData = weaponData;
        
        // 渲染對象追蹤
        this.remotePlayerSprites = new Map(); // playerId -> Player instance
        this.enemySprites = new Map(); // enemyId -> Enemy instance
        this.xpOrbSprites = new Map(); // orbId -> XPOrb instance
        this.projectileSprites = new Map(); // projectileId -> Projectile instance
        
        // 插值相關
        this.lastUpdateTime = 0;
        this.interpolationDelay = 100; // ms
    }
    
    // 更新所有多人遊戲對象的渲染
    updateMultiplayerRender(gameState, localPlayerId) {
        if (!gameState) return;
        
        this.updateRemotePlayers(gameState.players || {}, localPlayerId);
        this.updateEnemies(gameState.enemies || {});
        this.updateXPOrbs(gameState.xpOrbs || {});
        this.updateProjectiles(gameState.projectiles || {});
        
        this.lastUpdateTime = Date.now();
    }
    
    // 更新遠程玩家渲染
    updateRemotePlayers(players, localPlayerId) {
        const currentRemotePlayers = new Set();
        
        // 更新或創建遠程玩家
        for (const [playerId, playerData] of Object.entries(players)) {
            if (playerId === localPlayerId) continue; // 跳過本地玩家
            
            currentRemotePlayers.add(playerId);
            
            if (!this.remotePlayerSprites.has(playerId)) {
                // 創建新的遠程玩家
                this.createRemotePlayer(playerId, playerData);
            } else {
                // 更新現有遠程玩家
                this.updateRemotePlayer(playerId, playerData);
            }
        }
        
        // 移除不存在的遠程玩家
        for (const [playerId, player] of this.remotePlayerSprites.entries()) {
            if (!currentRemotePlayers.has(playerId)) {
                this.removeRemotePlayer(playerId);
            }
        }
    }
    
    // 創建遠程玩家
    createRemotePlayer(playerId, playerData) {
        try {
            const player = new Player(
                playerData.x, 
                playerData.y, 
                this.characterData.warrior, 
                this.weaponData, 
                this.worldContainer
            );
            
            // 設置遠程玩家的外觀差異（例如不同顏色）
            if (player.sprite) {
                player.sprite.tint = this.getPlayerColor(playerId);
                
                // 添加玩家名稱標籤
                const nameText = new PIXI.Text(playerId.substring(0, 8), {
                    fontSize: 12,
                    fill: 0xFFFFFF,
                    stroke: 0x000000,
                    strokeThickness: 2
                });
                nameText.anchor.set(0.5);
                nameText.x = 0;
                nameText.y = -40;
                player.sprite.addChild(nameText);
            }
            
            this.remotePlayerSprites.set(playerId, player);
            console.log('創建遠程玩家:', playerId);
        } catch (error) {
            console.error('創建遠程玩家失敗:', error);
        }
    }
    
    // 更新遠程玩家
    updateRemotePlayer(playerId, playerData) {
        const player = this.remotePlayerSprites.get(playerId);
        if (!player) return;
        
        // 平滑移動到新位置
        player.x = playerData.x;
        player.y = playerData.y;
        player.health = playerData.health;
        player.maxHealth = playerData.maxHealth;
        player.level = playerData.level;
        player.isDead = playerData.isDead;
        
        // 更新精靈位置
        if (player.sprite) {
            player.sprite.x = playerData.x;
            player.sprite.y = playerData.y;
            player.sprite.visible = !playerData.isDead;
        }
        
        player.updateSprite();
    }
    
    // 移除遠程玩家
    removeRemotePlayer(playerId) {
        const player = this.remotePlayerSprites.get(playerId);
        if (player) {
            try {
                player.destroy();
            } catch (error) {
                console.warn('移除遠程玩家時出錯:', error);
            }
            this.remotePlayerSprites.delete(playerId);
            console.log('移除遠程玩家:', playerId);
        }
    }
    
    // 更新敵人渲染
    updateEnemies(enemies) {
        const currentEnemies = new Set();
        
        // 更新或創建敵人
        for (const [enemyId, enemyData] of Object.entries(enemies)) {
            currentEnemies.add(enemyId);
            
            if (!this.enemySprites.has(enemyId)) {
                this.createEnemy(enemyId, enemyData);
            } else {
                this.updateEnemy(enemyId, enemyData);
            }
        }
        
        // 移除不存在的敵人
        for (const [enemyId, enemy] of this.enemySprites.entries()) {
            if (!currentEnemies.has(enemyId)) {
                this.removeEnemy(enemyId);
            }
        }
    }
    
    // 創建敵人
    createEnemy(enemyId, enemyData) {
        try {
            const enemy = new Enemy(enemyData.x, enemyData.y, this.worldContainer);
            enemy.id = enemyId;
            enemy.health = enemyData.health;
            enemy.maxHealth = enemyData.maxHealth;
            
            this.enemySprites.set(enemyId, enemy);
        } catch (error) {
            console.error('創建敵人失敗:', error);
        }
    }
    
    // 更新敵人
    updateEnemy(enemyId, enemyData) {
        const enemy = this.enemySprites.get(enemyId);
        if (!enemy) return;
        
        enemy.x = enemyData.x;
        enemy.y = enemyData.y;
        enemy.health = enemyData.health;
        enemy.maxHealth = enemyData.maxHealth;
        
        if (enemy.sprite) {
            enemy.sprite.x = enemyData.x;
            enemy.sprite.y = enemyData.y;
        }
        
        enemy.updateSprite();
    }
    
    // 移除敵人
    removeEnemy(enemyId) {
        const enemy = this.enemySprites.get(enemyId);
        if (enemy) {
            try {
                enemy.destroy();
            } catch (error) {
                console.warn('移除敵人時出錯:', error);
            }
            this.enemySprites.delete(enemyId);
        }
    }
    
    // 更新XP orb渲染
    updateXPOrbs(xpOrbs) {
        const currentOrbs = new Set();
        
        // 更新或創建XP orb
        for (const [orbId, orbData] of Object.entries(xpOrbs)) {
            currentOrbs.add(orbId);
            
            if (!this.xpOrbSprites.has(orbId)) {
                this.createXPOrb(orbId, orbData);
            } else {
                this.updateXPOrb(orbId, orbData);
            }
        }
        
        // 移除不存在的XP orb
        for (const [orbId, orb] of this.xpOrbSprites.entries()) {
            if (!currentOrbs.has(orbId)) {
                this.removeXPOrb(orbId);
            }
        }
    }
    
    // 創建XP orb
    createXPOrb(orbId, orbData) {
        try {
            const orb = new XPOrb(orbData.x, orbData.y, this.worldContainer);
            orb.id = orbId;
            orb.value = orbData.xpValue || 5; // 設置XP值
            
            this.xpOrbSprites.set(orbId, orb);
        } catch (error) {
            console.error('創建XP orb失敗:', error);
        }
    }
    
    // 更新XP orb
    updateXPOrb(orbId, orbData) {
        const orb = this.xpOrbSprites.get(orbId);
        if (!orb) return;
        
        orb.x = orbData.x;
        orb.y = orbData.y;
        
        if (orb.sprite) {
            orb.sprite.x = orbData.x;
            orb.sprite.y = orbData.y;
        }
    }
    
    // 移除XP orb
    removeXPOrb(orbId) {
        const orb = this.xpOrbSprites.get(orbId);
        if (orb) {
            try {
                orb.destroy();
            } catch (error) {
                console.warn('移除XP orb時出錯:', error);
            }
            this.xpOrbSprites.delete(orbId);
        }
    }
    
    // 更新射彈渲染
    updateProjectiles(projectiles) {
        const currentProjectiles = new Set();
        
        // 更新或創建射彈
        for (const [projectileId, projectileData] of Object.entries(projectiles)) {
            currentProjectiles.add(projectileId);
            
            if (!this.projectileSprites.has(projectileId)) {
                this.createProjectile(projectileId, projectileData);
            } else {
                this.updateProjectile(projectileId, projectileData);
            }
        }
        
        // 移除不存在的射彈
        for (const [projectileId, projectile] of this.projectileSprites.entries()) {
            if (!currentProjectiles.has(projectileId)) {
                this.removeProjectile(projectileId);
            }
        }
    }
    
    // 創建射彈
    createProjectile(projectileId, projectileData) {
        try {
            // 創建射彈的武器數據
            const weaponData = {
                projectileSize: projectileData.size || 8,
                projectileColor: projectileData.color || 0x3498db,
                damage: projectileData.damage || 10
            };
            
            const projectile = new Projectile(
                projectileData.x,
                projectileData.y,
                projectileData.vx || 0,
                projectileData.vy || 0,
                weaponData,
                this.worldContainer
            );
            projectile.id = projectileId;
            projectile.ownerId = projectileData.ownerId || 'unknown';
            
            this.projectileSprites.set(projectileId, projectile);
        } catch (error) {
            console.error('創建射彈失敗:', error);
        }
    }
    
    // 更新射彈
    updateProjectile(projectileId, projectileData) {
        const projectile = this.projectileSprites.get(projectileId);
        if (!projectile) return;
        
        projectile.x = projectileData.x;
        projectile.y = projectileData.y;
        projectile.vx = projectileData.vx || 0;
        projectile.vy = projectileData.vy || 0;
        
        if (projectile.sprite) {
            projectile.sprite.x = projectileData.x;
            projectile.sprite.y = projectileData.y;
        }
    }
    
    // 移除射彈
    removeProjectile(projectileId) {
        const projectile = this.projectileSprites.get(projectileId);
        if (projectile) {
            try {
                projectile.destroy();
            } catch (error) {
                console.warn('移除射彈時出錯:', error);
            }
            this.projectileSprites.delete(projectileId);
        }
    }
    
    // 獲取玩家顏色（根據ID生成不同顏色）
    getPlayerColor(playerId) {
        const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
        const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }
    
    // 清理所有渲染對象
    cleanup() {
        // 清理遠程玩家
        this.remotePlayerSprites.forEach(player => {
            try {
                player.destroy();
            } catch (e) {
                console.warn('清理遠程玩家精靈失敗:', e);
            }
        });
        this.remotePlayerSprites.clear();
        
        // 清理敵人
        this.enemySprites.forEach(enemy => {
            try {
                enemy.destroy();
            } catch (e) {
                console.warn('清理敵人精靈失敗:', e);
            }
        });
        this.enemySprites.clear();
        
        // 清理XP orb
        this.xpOrbSprites.forEach(orb => {
            try {
                orb.destroy();
            } catch (e) {
                console.warn('清理XP orb精靈失敗:', e);
            }
        });
        this.xpOrbSprites.clear();
        
        // 清理射彈
        this.projectileSprites.forEach(projectile => {
            try {
                projectile.destroy();
            } catch (e) {
                console.warn('清理射彈精靈失敗:', e);
            }
        });
        this.projectileSprites.clear();
    }
    
    // 獲取所有遠程玩家精靈
    getRemotePlayerSprites() {
        return Array.from(this.remotePlayerSprites.values());
    }
    
    // 獲取所有敵人精靈  
    getEnemySprites() {
        return Array.from(this.enemySprites.values());
    }
    
    // 獲取所有XP orb精靈
    getXPOrbSprites() {
        return Array.from(this.xpOrbSprites.values());
    }
    
    // 獲取所有射彈精靈
    getProjectileSprites() {
        return Array.from(this.projectileSprites.values());
    }
} 