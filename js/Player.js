export default class Player {
    constructor(x, y, characterData) {
        this.x = x;
        this.y = y;

        // Copy properties from the character data object
        this.name = characterData.name;
        this.width = characterData.width;
        this.height = characterData.height;
        this.color = characterData.color;
        this.speed = characterData.speed;
        this.currentWeapon = 'magicMissile';
    }

    update(keysPressed, canvas) {
        // Handle player movement
        if (keysPressed.w || keysPressed.ArrowUp) this.y -= this.speed;
        if (keysPressed.s || keysPressed.ArrowDown) this.y += this.speed;
        if (keysPressed.a || keysPressed.ArrowLeft) this.x -= this.speed;
        if (keysPressed.d || keysPressed.ArrowRight) this.x += this.speed;

        // Boundary detection
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}