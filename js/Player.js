export default class Player {
    constructor(x, y, characterData, weaponData, container) {
        this.x = x;
        this.y = y;
        
        // Store reference to container
        this.container = container;

        // Character Stats from data files
        this.name = characterData.name;
        this.width = characterData.width;
        this.height = characterData.height;
        this.color = characterData.color;
        this.speed = characterData.speed;

        // Health System
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isDead = false;
        this.invulnerabilityTime = 0; // Frames of invulnerability after taking damage
        this.maxInvulnerabilityTime = 60; // 1 second at 60fps

        // XP and Leveling Stats
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;

        // Player holds a copy of its weapon's data.
        this.weapon = { ...weaponData.magicMissile };

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
        this.sprite.drawEllipse(this.width/2, this.height + 5, this.width * 0.6, this.height * 0.2);
        this.sprite.endFill();
        
        // Determine color based on health and invulnerability
        let playerColor = this.color;
        let alpha = 1;
        
        if (this.invulnerabilityTime > 0) {
            // Flashing effect when invulnerable
            alpha = Math.sin(this.invulnerabilityTime * 0.5) > 0 ? 0.5 : 1;
        }
        
        if (this.health <= 25) {
            // Red tint when low health
            playerColor = 0xFF4444;
        } else if (this.health <= 50) {
            // Orange tint when medium health
            playerColor = 0xFF8844;
        }
        
        // Draw main character
        this.sprite.beginFill(playerColor, alpha);
        this.sprite.drawRect(0, 0, this.width, this.height);
        this.sprite.endFill();
        
        // Add a subtle highlight for 3D effect
        this.sprite.beginFill(0xFFFFFF, 0.3 * alpha);
        this.sprite.drawRect(2, 2, this.width - 4, 6);
        this.sprite.endFill();
    }

    /**
     * Moves the player based on a directional vector.
     * @param {number} dx - The movement direction on the x-axis (-1 for left, 1 for right).
     * @param {number} dy - The movement direction on the y-axis (-1 for up, 1 for down).
     * @param {Object} bounds - The bounds object with width and height properties.
     */
    move(dx, dy, bounds) {
        if (this.isDead) return; // Can't move if dead
        
        // Normalize the movement vector if moving diagonally to prevent faster diagonal speed.
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        // Apply movement
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Boundary detection to keep the player within the canvas.
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > bounds.width) this.x = bounds.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > bounds.height) this.y = bounds.height - this.height;

        // Update sprite position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    /**
     * Update method for per-frame updates
     */
    update() {
        // Update invulnerability timer
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
            this.updateSprite(); // Update visual flashing
        }
    }

    /**
     * Take damage and handle death
     * @param {number} damage - Amount of damage to take
     */
    takeDamage(damage) {
        if (this.isDead || this.invulnerabilityTime > 0) return false;
        
        this.health -= damage;
        this.invulnerabilityTime = this.maxInvulnerabilityTime;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }
        
        this.updateSprite();
        return true; // Damage was applied
    }

    /**
     * Heal the player
     * @param {number} amount - Amount of health to restore
     */
    heal(amount) {
        if (this.isDead) return;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateSprite();
    }

    /**
     * Revive the player (for respawn mechanic)
     */
    revive() {
        this.health = this.maxHealth;
        this.isDead = false;
        this.invulnerabilityTime = this.maxInvulnerabilityTime * 2; // Extra invulnerability on revive
        this.updateSprite();
    }

    /**
     * Adds experience points to the player and checks for level up.
     * @param {number} amount - The amount of XP to gain.
     */
    gainXP(amount) {
        this.xp += amount;
        // Check for level up
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    /**
     * Handles the logic for leveling up the player.
     * @param {function} onLevelUp - Optional callback to trigger on level up (for UI, etc).
     */
    levelUp(onLevelUp) {
        this.level++;
        this.xp -= this.xpToNextLevel; // Subtract the cost, carry over any extra XP
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5); // Increase cost for the next level

        // Heal on level up
        this.heal(20);

        // Instead of applying a reward here, call the callback for UI
        if (typeof onLevelUp === 'function') {
            onLevelUp(this);
        }
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