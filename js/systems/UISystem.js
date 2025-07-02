export class UISystem {
    constructor() {
        this.elements = {
            characterDisplay: document.getElementById('character-display'),
            weaponDisplay: document.getElementById('weapon-display'),
            xpBarFill: document.getElementById('xp-bar-fill')
        };
    }

    /**
     * Update the main game UI
     * @param {Player} player - Player object
     */
    updateUI(player) {
        if (!this.elements.characterDisplay || !this.elements.weaponDisplay || !this.elements.xpBarFill) {
            return; // Bail if elements not found
        }

        // Calculate health percentage and color
        const healthPercentage = (player.health / player.maxHealth) * 100;
        let healthColor = '#00ff00'; // Green
        if (healthPercentage <= 25) {
            healthColor = '#ff0000'; // Red
        } else if (healthPercentage <= 50) {
            healthColor = '#ff8800'; // Orange
        }

        this.elements.characterDisplay.innerHTML = `
            <b>Character:</b><br>
            ${player.name} (Lvl ${player.level})<br>
            <div style="background: #333; border: 1px solid #fff; height: 8px; margin-top: 4px;">
                <div style="background: ${healthColor}; height: 100%; width: ${healthPercentage}%; transition: width 0.3s;"></div>
            </div>
            <small>HP: ${player.health}/${player.maxHealth}</small><br>
            <small>XP: ${player.xp}/${player.xpToNextLevel}</small>
        `;
        
        // Display all weapons with their cooldown status
        const weaponInfo = player.weapons.map(weapon => {
            const cooldownPercent = weapon.currentCooldown > 0 ? 
                Math.ceil((weapon.currentCooldown / weapon.cooldown) * 100) : 0;
            const status = weapon.currentCooldown > 0 ? ` (${cooldownPercent}%)` : ' ✓';
            return `${weapon.name}${status}`;
        }).join('<br>');
        
        this.elements.weaponDisplay.innerHTML = `<b>Weapons:</b><br>${weaponInfo}`;
        
        const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
        this.elements.xpBarFill.style.width = `${xpPercentage}%`;
    }

    /**
     * Show game over screen with statistics
     * @param {Object} gameStats - Game statistics object
     * @param {Object} app - PixiJS app for stopping ticker
     */
    showGameOverScreen(gameStats, app) {
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

    /**
     * Hide game over screen
     */
    hideGameOverScreen() {
        const modal = document.getElementById('game-over-modal');
        modal.style.display = 'none';
    }

    /**
     * Update game statistics during gameplay
     * @param {Object} gameStats - Game statistics object
     * @param {Player} player - Player object
     */
    updateGameStats(gameStats, player) {
        gameStats.survivalTime = Math.floor((Date.now() - gameStats.startTime) / 1000);
        gameStats.maxLevel = Math.max(gameStats.maxLevel, player.level);
    }
} 