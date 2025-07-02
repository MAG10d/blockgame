export default class XPOrb {
    constructor(x, y, container) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.color = 'yellow';
        this.value = 5; // NEW: Each orb is worth 5 XP
        this.markedForDeletion = false;
        
        // Animation properties
        this.pulseTimer = 0;
        this.baseScale = 1;
        
        // Store reference to container
        this.container = container;

        // Create PixiJS Graphics object with 2.5D enhancements
        this.sprite = new PIXI.Graphics();
        
        // Draw a glowing orb effect
        // Outer glow
        this.sprite.beginFill(0xFFD700, 0.4); // gold with transparency
        this.sprite.drawCircle(this.width/2, this.height/2, this.width);
        this.sprite.endFill();
        
        // Main orb body
        this.sprite.beginFill(0xFFD700); // gold
        this.sprite.drawCircle(this.width/2, this.height/2, this.width/2);
        this.sprite.endFill();
        
        // Bright highlight
        this.sprite.beginFill(0xFFFACD, 0.8); // light yellow
        this.sprite.drawCircle(this.width/2 - 1, this.height/2 - 1, this.width/4);
        this.sprite.endFill();
        
        // Set initial position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        
        // Add to container
        this.container.addChild(this.sprite);
    }

    update() {
        // Pulsing animation
        this.pulseTimer += 0.1;
        const scale = this.baseScale + Math.sin(this.pulseTimer) * 0.2;
        this.sprite.scale.set(scale);
        
        // Gentle floating effect
        this.sprite.y = this.y + Math.sin(this.pulseTimer * 2) * 2;
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