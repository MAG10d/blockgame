export default class Projectile {
    constructor(x, y, vx, vy, weaponData, container) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = weaponData.projectileSize;
        this.height = weaponData.projectileSize;
        this.color = weaponData.projectileColor;
        this.markedForDeletion = false;
        
        // Store reference to container
        this.container = container;

        // Create PixiJS Graphics object with 2.5D enhancements
        this.sprite = new PIXI.Graphics();
        
        // Create a glowing projectile effect
        // Outer glow
        this.sprite.beginFill(this.color, 0.3);
        this.sprite.drawCircle(this.width/2, this.height/2, this.width);
        this.sprite.endFill();
        
        // Main projectile body
        this.sprite.beginFill(this.color);
        this.sprite.drawCircle(this.width/2, this.height/2, this.width/2);
        this.sprite.endFill();
        
        // Bright center
        this.sprite.beginFill(0xFFFFFF, 0.8);
        this.sprite.drawCircle(this.width/2, this.height/2, this.width/4);
        this.sprite.endFill();
        
        // Set initial position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        
        // Add to container
        this.container.addChild(this.sprite);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Update sprite position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        
        // Add slight rotation for visual effect
        this.sprite.rotation += 0.1;
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