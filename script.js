'use strict';

// 1. SETUP
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// NEW: UI Elements
const characterDisplay = document.getElementById('character-display');
const weaponDisplay = document.getElementById('weapon-display');

// 2. DATA STRUCTURES FOR CHARACTERS AND WEAPONS
// NEW: This allows us to easily define and add more characters later.
const characterData = {
    'warrior': {
        name: 'Warrior',
        width: 30,
        height: 30,
        color: 'deepskyblue',
        speed: 4,
    }
};

// NEW: This allows us to easily define and add more weapons later.
const weaponData = {
    'magicMissile': {
        name: 'Magic Missile',
        cooldown: 120, // Fire every 120 frames (2 seconds at 60fps)
        projectileSize: 10,
        projectileSpeed: 5,
        projectileColor: 'fuchsia'
    }
};

// 3. GAME STATE
// NEW: The player is now created based on the characterData.
const player = {
    ...characterData.warrior, // Copy properties from the warrior
    x: canvas.width / 2,
    y: canvas.height / 2,
    currentWeapon: 'magicMissile' // The player's equipped weapon
};

// NEW: Arrays to hold all active projectiles and enemies.
const projectiles = [];
const enemies = [];

// NEW: Timers for game events.
let weaponCooldownTimer = 0;
let enemySpawnTimer = 0;

const keysPressed = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};


// 4. INPUT HANDLING
window.addEventListener('keydown', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = false;
});


// 5. GAME LOGIC FUNCTIONS

// NEW: Function to handle weapon firing.
function fireWeapon() {
    const weapon = weaponData[player.currentWeapon];
    
    // Create a projectile that fires in a random direction.
    const angle = Math.random() * 2 * Math.PI; // Random angle in radians
    const projectile = {
        x: player.x + player.width / 2 - weapon.projectileSize / 2,
        y: player.y + player.height / 2 - weapon.projectileSize / 2,
        vx: Math.cos(angle) * weapon.projectileSpeed, // Velocity x
        vy: Math.sin(angle) * weapon.projectileSpeed, // Velocity y
        width: weapon.projectileSize,
        height: weapon.projectileSize,
        color: weapon.projectileColor,
        markedForDeletion: false
    };
    projectiles.push(projectile);
}

// NEW: Function to spawn an enemy.
function spawnEnemy() {
    const size = 25;
    let x, y;

    // Spawn randomly from one of the four edges of the screen.
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - size : canvas.width;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - size : canvas.height;
    }

    const enemy = {
        x: x,
        y: y,
        width: size,
        height: size,
        speed: 1.5,
        color: 'limegreen',
        markedForDeletion: false
    };
    enemies.push(enemy);
}

// NEW: Function to check for collisions between all projectiles and enemies.
function checkCollisions() {
    // Loop through all projectiles
    projectiles.forEach(proj => {
        // Loop through all enemies
        enemies.forEach(enemy => {
            // Simple AABB (Axis-Aligned Bounding Box) collision check
            if (
                proj.x < enemy.x + enemy.width &&
                proj.x + proj.width > enemy.x &&
                proj.y < enemy.y + enemy.height &&
                proj.y + proj.height > enemy.y
            ) {
                // If they collide, mark both for deletion.
                proj.markedForDeletion = true;
                enemy.markedForDeletion = true;
            }
        });
    });
}

// NEW: Function to update the UI display boxes.
function updateUI() {
    characterDisplay.innerHTML = `<b>Character:</b><br>${player.name}`;
    weaponDisplay.innerHTML = `<b>Weapon:</b><br>${weaponData[player.currentWeapon].name}`;
}


function update() {
    // 1. Handle player movement
    if (keysPressed.w || keysPressed.ArrowUp) player.y -= player.speed;
    if (keysPressed.s || keysPressed.ArrowDown) player.y += player.speed;
    if (keysPressed.a || keysPressed.ArrowLeft) player.x -= player.speed;
    if (keysPressed.d || keysPressed.ArrowRight) player.x += player.speed;

    // Boundary detection
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // 2. Handle weapon firing
    weaponCooldownTimer--;
    if (weaponCooldownTimer <= 0) {
        fireWeapon();
        // Reset timer based on current weapon's cooldown
        weaponCooldownTimer = weaponData[player.currentWeapon].cooldown;
    }

    // 3. Handle enemy spawning
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = 90; // Spawn a new enemy every 1.5 seconds
    }

    // 4. Update projectile positions and remove off-screen ones.
    projectiles.forEach(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            proj.markedForDeletion = true;
        }
    });

    // 5. Update enemy positions (AI: move towards player)
    enemies.forEach(enemy => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
    });

    // 6. Check for collisions
    checkCollisions();

    // 7. NEW: Clean up arrays by removing marked items.
    // We do this in a separate step to avoid issues while iterating.
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i].markedForDeletion) {
            projectiles.splice(i, 1);
        }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].markedForDeletion) {
            enemies.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    // Draw projectiles
    projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
    });
}


// 6. THE GAME LOOP
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 7. START THE GAME
// NEW: Update the UI once at the start.
updateUI();
requestAnimationFrame(gameLoop);