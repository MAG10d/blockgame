export default class Enemy {
    constructor(x, y, container) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 0.8;
        this.color = 'limegreen';
        this.markedForDeletion = false;
        
        // Health and Combat System
        this.maxHealth = 30;
        this.health = this.maxHealth;
        this.damage = 15; // Damage dealt to player on contact
        
        // Store reference to container
        this.container = container;

        // Create PixiJS Graphics object with 2.5D enhancements
        this.sprite = new PIXI.Graphics();
        this.updateSprite();
        
        // Set initial position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        
        // Add to container
        this.container.addChild(this.sprite);
    }

    updateSprite() {
        // Clear previous drawing
        this.sprite.clear();
        
        // Draw shadow first (underneath)
        this.sprite.beginFill(0x000000, 0.3);
        this.sprite.drawEllipse(this.width/2, this.height + 3, this.width * 0.6, this.height * 0.2);
        this.sprite.endFill();
        
        // Color based on health
        let enemyColor = 0x32CD32; // limegreen
        if (this.health <= this.maxHealth * 0.3) {
            enemyColor = 0xFF4444; // Red when low health
        } else if (this.health <= this.maxHealth * 0.6) {
            enemyColor = 0xFF8844; // Orange when medium health
        }
        
        // Draw main enemy body
        this.sprite.beginFill(enemyColor);
        this.sprite.drawRect(0, 0, this.width, this.height);
        this.sprite.endFill();
        
        // Add a darker outline for better definition
        this.sprite.lineStyle(1, 0x228B22, 1);
        this.sprite.drawRect(0, 0, this.width, this.height);
        this.sprite.lineStyle(0);
        
        // Draw health bar above enemy
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 4;
            const barY = -8;
            
            // Background (red)
            this.sprite.beginFill(0xFF0000);
            this.sprite.drawRect(0, barY, barWidth, barHeight);
            this.sprite.endFill();
            
            // Health (green)
            const healthPercentage = this.health / this.maxHealth;
            this.sprite.beginFill(0x00FF00);
            this.sprite.drawRect(0, barY, barWidth * healthPercentage, barHeight);
            this.sprite.endFill();
        }
    }

    update(player) {
        // Simple AI: move towards the player
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        
        // Update sprite position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    /**
     * Take damage and handle death
     * @param {number} damage - Amount of damage to take
     */
    takeDamage(damage) {
        this.health -= damage;
        this.updateSprite();
        
        if (this.health <= 0) {
            this.markedForDeletion = true;
            return true; // Enemy died
        }
        return false; // Enemy survived
    }

    /**
     * Cleanup method for removing from stage
     */
    destroy() {
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
            this.sprite.destroy();
        }
    }
}