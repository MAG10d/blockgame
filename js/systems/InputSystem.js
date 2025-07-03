export class InputSystem {
    constructor(gameCanvas) {
        // Unified input state for both keyboard and touch
        this.inputState = {
            keys: {
                w: false, a: false, s: false, d: false,
                ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
                r: false, // R key for respawn
                ' ': false // Space key for firing
            },
            mouse: {
                isPressed: false,
                x: 0,
                y: 0
            },
            touch: {
                isDragging: false,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0
            }
        };

        this.setupEventListeners(gameCanvas);
    }

    /**
     * Set up all input event listeners
     * @param {HTMLElement} gameCanvas - The game canvas element
     */
    setupEventListeners(gameCanvas) {
        // Keyboard Handlers
        window.addEventListener('keydown', (e) => {
            if (this.inputState.keys.hasOwnProperty(e.key)) {
                this.inputState.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.inputState.keys.hasOwnProperty(e.key)) {
                this.inputState.keys[e.key] = false;
            }
        });

        // Mouse Handlers
        gameCanvas.addEventListener('mousedown', (e) => {
            this.inputState.mouse.isPressed = true;
            this.inputState.mouse.x = e.clientX;
            this.inputState.mouse.y = e.clientY;
        });

        gameCanvas.addEventListener('mouseup', (e) => {
            this.inputState.mouse.isPressed = false;
        });

        gameCanvas.addEventListener('mousemove', (e) => {
            this.inputState.mouse.x = e.clientX;
            this.inputState.mouse.y = e.clientY;
        });

        // Prevent context menu on right click
        gameCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Touch Handlers for mobile
        gameCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent screen scrolling
            this.inputState.touch.isDragging = true;
            const touch = e.touches[0];
            this.inputState.touch.startX = touch.clientX;
            this.inputState.touch.startY = touch.clientY;
            this.inputState.touch.currentX = touch.clientX;
            this.inputState.touch.currentY = touch.clientY;
        }, { passive: false });

        gameCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent screen scrolling
            if (this.inputState.touch.isDragging) {
                const touch = e.touches[0];
                this.inputState.touch.currentX = touch.clientX;
                this.inputState.touch.currentY = touch.clientY;
            }
        }, { passive: false });

        gameCanvas.addEventListener('touchend', (e) => {
            this.inputState.touch.isDragging = false;
        });

        gameCanvas.addEventListener('touchcancel', (e) => {
            this.inputState.touch.isDragging = false;
        });
    }

    /**
     * Get movement vector from current input state
     * @returns {Object} - Movement vector { x, y }
     */
    getMovementVector() {
        const move = { x: 0, y: 0 };

        if (this.inputState.touch.isDragging) {
            // Touch input has priority
            const dx = this.inputState.touch.currentX - this.inputState.touch.startX;
            const dy = this.inputState.touch.currentY - this.inputState.touch.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) { // Use a deadzone of 10 pixels
                move.x = dx / distance;
                move.y = dy / distance;
            }
        } else {
            // Fallback to keyboard input
            const keys = this.inputState.keys;
            if (keys.w || keys.ArrowUp) move.y -= 1;
            if (keys.s || keys.ArrowDown) move.y += 1;
            if (keys.a || keys.ArrowLeft) move.x -= 1;
            if (keys.d || keys.ArrowRight) move.x += 1;
        }

        return move;
    }

    /**
     * Check if respawn key is pressed
     * @returns {boolean} - True if respawn key is pressed
     */
    isRespawnPressed() {
        return this.inputState.keys.r;
    }

    /**
     * Check if mouse is pressed (for firing weapons)
     * @returns {boolean} - True if mouse is pressed
     */
    get isMousePressed() {
        return this.inputState.mouse.isPressed;
    }

    /**
     * Check if space key is pressed (for firing weapons)
     * @returns {boolean} - True if space key is pressed
     */
    get isSpacePressed() {
        return this.inputState.keys[' '];
    }

    /**
     * Get mouse position
     * @returns {Object} - Mouse position { x, y }
     */
    getMousePosition() {
        return {
            x: this.inputState.mouse.x,
            y: this.inputState.mouse.y
        };
    }
} 