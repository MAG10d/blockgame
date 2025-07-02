export default class Projectile {
    constructor(x, y, vx, vy, weaponData) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = weaponData.projectileSize;
        this.height = weaponData.projectileSize;
        this.color = weaponData.projectileColor;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}