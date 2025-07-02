import CARD_UPGRADES from '../CardUpgrades.js';

export class UpgradeSystem {
    constructor(app) {
        this.app = app;
    }

    /**
     * Show card choice modal for player upgrade
     * @param {Player} player - Player object
     * @param {Function} updateUI - UI update function
     */
    showCardChoice(player, updateUI) {
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
                this.app.ticker.start();
            });
            
            container.appendChild(card);
        });
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Pause the game
        this.app.ticker.stop();
    }

    /**
     * Set up player level up callback
     * @param {Player} player - Player object
     * @param {Function} updateUI - UI update function
     */
    setupLevelUpCallback(player, updateUI) {
        const upgradeSystem = this;
        player.levelUp = function(onLevelUp) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            
            // Heal on level up
            this.heal(20);
            
            // Show card choice instead of calling callback
            upgradeSystem.showCardChoice(this, updateUI);
        };
    }
} 