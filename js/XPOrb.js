export default class XPOrb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.color = 'yellow';
        this.value = 5; // NEW: Each orb is worth 5 XP
        this.markedForDeletion = false;
    }

    update() {}

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}