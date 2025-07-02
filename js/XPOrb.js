export default class XPOrb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.color = 'yellow';
        this.markedForDeletion = false;
    }

    // Orbs don't move on their own (yet)
    update() {}

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}