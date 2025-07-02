export default class Player {
    constructor(x, y, characterData, weaponData) {
        this.x = x;
        this.y = y;

        // Character Stats from data files
        this.name = characterData.name;
        this.width = characterData.width;
        this.height = characterData.height;
        this.color = characterData.color;
        this.speed = characterData.speed;

        // XP and Leveling Stats
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;

        // Player holds a copy of its weapon's data.
        // This is crucial for individual upgrades.
        this.weapon = { ...weaponData.magicMissile };
    }

    /**
     * Moves the player based on a directional vector.
     * @param {number} dx - The movement direction on the x-axis (-1 for left, 1 for right).
     * @param {number} dy - The movement direction on the y-axis (-1 for up, 1 for down).
     */
    move(dx, dy) {
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
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
    }

    /**
     * Draws the player on the canvas.
     * @param {CanvasRenderingContext2D} ctx - The drawing context of the canvas.
     */
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
     */
    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel; // Subtract the cost, carry over any extra XP
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5); // Increase cost for the next level

        // Apply a level-up reward!
        console.log(`Leveled up to ${this.level}! Weapon cooldown improved.`);
        
        // Make the weapon fire 10% faster, with a minimum cooldown of 10 frames.
        this.weapon.cooldown = Math.max(10, this.weapon.cooldown * 0.9);
    }
}