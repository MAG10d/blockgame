'use strict';

// 1. SETUP
// Get a reference to the canvas and its 2D drawing context.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set the canvas dimensions.
canvas.width = 800;
canvas.height = 600;

// 2. GAME STATE
// The player is an object with properties for position, size, and speed.
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 30,
    height: 30,
    color: 'deepskyblue',
    speed: 4
};

// This object will track which keys are currently being pressed.
const keysPressed = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

// 3. INPUT HANDLING
// Add event listeners to track key presses.
window.addEventListener('keydown', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) {
        keysPressed[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) {
        keysPressed[e.key] = false;
    }
});


// 4. GAME LOGIC FUNCTIONS
function update() {
    // Check which keys are pressed and move the player accordingly.
    if (keysPressed.w || keysPressed.ArrowUp) {
        player.y -= player.speed;
    }
    if (keysPressed.s || keysPressed.ArrowDown) {
        player.y += player.speed;
    }
    if (keysPressed.a || keysPressed.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keysPressed.d || keysPressed.ArrowRight) {
        player.x += player.speed;
    }

    // Boundary detection: prevent the player from leaving the canvas.
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
    if (player.y < 0) {
        player.y = 0;
    }
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}

function draw() {
    // Clear the entire canvas on each frame.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the player.
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// 5. THE GAME LOOP
// This function runs repeatedly, creating the animation.
function gameLoop() {
    update(); // Update the game state (e.g., player position).
    draw();   // Redraw everything on the canvas.

    // Ask the browser to call gameLoop again on the next frame.
    requestAnimationFrame(gameLoop);
}

// 6. START THE GAME
// Kick off the game loop for the first time.
requestAnimationFrame(gameLoop);