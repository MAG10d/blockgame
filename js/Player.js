export default class Player {
    constructor(x, y, characterData, weaponData) {
        this.x = x;
        this.y = y;

        // Character Stats
        this.name = characterData.name;
        this.width = characterData.width;
        this.height = characterData.height;
        this.color = characterData.color;
        this.speed = characterData.speed;

        // NEW: XP and Leveling Stats
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;

        // NEW: Player holds a copy of its weapon's data
        // This is crucial for individual upgrades.
        this.weapon = { ...weaponData.magicMissile };
    }

    update(keysPressed, canvas) {
        // Player movement (no changes here)
        if (keysPressed.w || keysPressed.ArrowUp) this.y -= this.speed;
        if (keysPressed.s || keysPressed.ArrowDown) this.y += this.speed;
        if (keysPressed.a || keysPressed.ArrowLeft) this.x -= this.speed;
        if (keysPressed.d || keysPressed.ArrowRight) this.x += this.speed;

        // Boundary detection (no changes here)
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // NEW: Method to gain experience
    gainXP(amount) {
        this.xp += amount;
        // Check for level up
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    // NEW: Method to handle leveling up
    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel; // Subtract the cost, carry over extra XP
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5); // Increase cost for next level

        // Apply a reward!
        console.log(`Leveled up to ${this.level}! Weapon cooldown improved.`);
        // Make the weapon fire 10% faster
        this.weapon.cooldown = Math.max(10, this.weapon.cooldown * 0.9); // max() prevents cooldown from getting too low
    }
}