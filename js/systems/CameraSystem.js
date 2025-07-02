export class CameraSystem {
    constructor(worldContainer, screenWidth, screenHeight) {
        this.worldContainer = worldContainer;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        
        // Camera properties
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.smoothness = 0.1; // 攝影機跟隨的平滑度 (0.1 = 較平滑, 1.0 = 立即跟隨)
        
        // World bounds - 讓世界比屏幕大很多 (擴大到10倍)
        this.worldWidth = screenWidth * 10;
        this.worldHeight = screenHeight * 10;
    }

    /**
     * Update camera to follow the target (usually the player)
     * @param {Object} target - Target object to follow (player)
     */
    follow(target) {
        // Calculate where camera should be to center the target
        this.targetX = -(target.x + target.width / 2 - this.screenWidth / 2);
        this.targetY = -(target.y + target.height / 2 - this.screenHeight / 2);
        
        // Apply world bounds to prevent camera from showing outside the world
        const maxCameraX = 0;
        const minCameraX = -(this.worldWidth - this.screenWidth);
        const maxCameraY = 0;
        const minCameraY = -(this.worldHeight - this.screenHeight);
        
        this.targetX = Math.max(minCameraX, Math.min(maxCameraX, this.targetX));
        this.targetY = Math.max(minCameraY, Math.min(maxCameraY, this.targetY));
    }

    /**
     * Update camera position with smooth interpolation
     */
    update() {
        // Smooth camera movement
        this.currentX += (this.targetX - this.currentX) * this.smoothness;
        this.currentY += (this.targetY - this.currentY) * this.smoothness;
        
        // Apply the camera position to the world container
        this.worldContainer.x = this.currentX;
        this.worldContainer.y = this.currentY;
    }

    /**
     * Get world bounds for spawning and movement
     * @returns {Object} - World bounds
     */
    getWorldBounds() {
        return {
            width: this.worldWidth,
            height: this.worldHeight
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - World coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX - this.currentX,
            y: screenY - this.currentY
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - Screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX + this.currentX,
            y: worldY + this.currentY
        };
    }

    /**
     * Shake the camera for impact effects
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in milliseconds
     */
    shake(intensity = 10, duration = 200) {
        const originalSmoothness = this.smoothness;
        const startTime = Date.now();
        
        const shakeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(shakeInterval);
                this.smoothness = originalSmoothness;
                return;
            }
            
            // Apply diminishing shake
            const currentIntensity = intensity * (1 - progress);
            const shakeX = (Math.random() - 0.5) * currentIntensity;
            const shakeY = (Math.random() - 0.5) * currentIntensity;
            
            this.worldContainer.x = this.currentX + shakeX;
            this.worldContainer.y = this.currentY + shakeY;
        }, 16); // ~60fps
    }

    /**
     * Resize camera when window size changes
     * @param {number} newWidth - New screen width
     * @param {number} newHeight - New screen height
     */
    resize(newWidth, newHeight) {
        this.screenWidth = newWidth;
        this.screenHeight = newHeight;
        
        // Update world size proportionally
        this.worldWidth = newWidth * 3;
        this.worldHeight = newHeight * 3;
    }
} 