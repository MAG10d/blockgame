'use strict';

import Player from './Player.js';
import Projectile from './Projectile.js';
import Enemy from './Enemy.js';
import XPOrb from './XPOrb.js';

// SETUP
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const characterDisplay = document.getElementById('character-display');
const weaponDisplay = document.getElementById('weapon-display');
const xpBarFill = document.getElementById('xp-bar-fill');

// DATA (no changes)
const characterData = {
    'warrior': { name: 'Warrior', width: 30, height: 30, color: 'deepskyblue', speed: 4 }
};
const weaponData = {
    'magicMissile': { name: 'Magic Missile', cooldown: 120, projectileSize: 10, projectileSpeed: 5, projectileColor: 'fuchsia' }
};

// GAME STATE
const player = new Player(canvas.width / 2, canvas.height / 2, characterData.warrior, weaponData);
const projectiles = [], enemies = [], xpOrbs = [];
let weaponCooldownTimer = 0, enemySpawnTimer = 0;

// MODIFIED: Unified input state
const inputState = {
    keys: {
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
    },
    touch: {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    }
};

// --- INPUT HANDLING ---

// Keyboard Handlers
window.addEventListener('keydown', (e) => {
    if (inputState.keys.hasOwnProperty(e.key)) inputState.keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (inputState.keys.hasOwnProperty(e.key)) inputState.keys[e.key] = false;
});

// NEW: Touch Handlers
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent screen scrolling
    inputState.touch.isDragging = true;
    const touch = e.touches[0];
    inputState.touch.startX = touch.clientX;
    inputState.touch.startY = touch.clientY;
    inputState.touch.currentX = touch.clientX;
    inputState.touch.currentY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent screen scrolling
    if (inputState.touch.isDragging) {
        const touch = e.touches[0];
        inputState.touch.currentX = touch.clientX;
        inputState.touch.currentY = touch.clientY;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    inputState.touch.isDragging = false;
});
canvas.addEventListener('touchcancel', (e) => {
    inputState.touch.isDragging = false;
});


// HELPER FUNCTIONS (fireWeapon, spawnEnemy, checkCollisions, updateUI - no changes)
function fireWeapon() {
    const weapon = player.weapon;
    const angle = Math.random() * 2 * Math.PI;
    const vx = Math.cos(angle) * weapon.projectileSpeed;
    const vy = Math.sin(angle) * weapon.projectileSpeed;
    const projX = player.x + player.width / 2 - weapon.projectileSize / 2;
    const projY = player.y + player.height / 2 - weapon.projectileSize / 2;
    projectiles.push(new Projectile(projX, projY, vx, vy, weapon));
}

function spawnEnemy() {
    const size = 25;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - size : canvas.width;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - size : canvas.height;
    }
    enemies.push(new Enemy(x, y));
}

function checkCollisions() {
    projectiles.forEach(proj => {
        enemies.forEach(enemy => {
            if (proj.x < enemy.x + enemy.width && proj.x + proj.width > enemy.x &&
                proj.y < enemy.y + enemy.height && proj.y + proj.height > enemy.y) {
                proj.markedForDeletion = true;
                enemy.markedForDeletion = true;
                xpOrbs.push(new XPOrb(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
            }
        });
    });
    xpOrbs.forEach(orb => {
        if (player.x < orb.x + orb.width && player.x + player.width > orb.x &&
            player.y < orb.y + orb.height && player.y + player.height > orb.y) {
            player.gainXP(orb.value);
            orb.markedForDeletion = true;
            updateUI();
        }
    });
}

function updateUI() {
    characterDisplay.innerHTML = `<b>Character:</b><br>${player.name} (Lvl ${player.level})`;
    weaponDisplay.innerHTML = `<b>Weapon:</b><br>${player.weapon.name}`;
    const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
    xpBarFill.style.width = `${xpPercentage}%`;
}


// --- GAME LOOP FUNCTIONS ---

function update() {
    // MODIFIED: Unified movement logic
    const move = { x: 0, y: 0 };
    if (inputState.touch.isDragging) {
        // Touch input has priority
        const dx = inputState.touch.currentX - inputState.touch.startX;
        const dy = inputState.touch.currentY - inputState.touch.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use a deadzone of 10 pixels
        if (distance > 10) {
            move.x = dx / distance;
            move.y = dy / distance;
        }
    } else {
        // Fallback to keyboard input
        const keys = inputState.keys;
        if (keys.w || keys.ArrowUp) move.y -= 1;
        if (keys.s || keys.ArrowDown) move.y += 1;
        if (keys.a || keys.ArrowLeft) move.x -= 1;
        if (keys.d || keys.ArrowRight) move.x += 1;
    }
    // Apply movement to the player
    player.move(move.x, move.y);

    // Update other game objects
    enemies.forEach(enemy => enemy.update(player));
    projectiles.forEach(proj => proj.update());
    xpOrbs.forEach(orb => orb.update());

    // Timers and Spawning
    if (--weaponCooldownTimer <= 0) {
        fireWeapon();
        weaponCooldownTimer = player.weapon.cooldown;
    }
    if (--enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = 90;
    }

    // Collisions
    checkCollisions();

    // Cleanup
    projectiles.splice(0, projectiles.length, ...projectiles.filter(p => !p.markedForDeletion && p.x > -10 && p.x < canvas.width + 10 && p.y > -10 && p.y < canvas.height + 10));
    enemies.splice(0, enemies.length, ...enemies.filter(e => !e.markedForDeletion));
    xpOrbs.splice(0, xpOrbs.length, ...xpOrbs.filter(o => !o.markedForDeletion));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw(ctx);
    enemies.forEach(enemy => enemy.draw(ctx));
    projectiles.forEach(proj => proj.draw(ctx));
    xpOrbs.forEach(orb => orb.draw(ctx));

    // NEW: Draw the virtual joystick if dragging
    if (inputState.touch.isDragging) {
        ctx.save(); // Save current context state
        // Base of the joystick
        ctx.beginPath();
        ctx.arc(inputState.touch.startX, inputState.touch.startY, 40, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(128, 128, 128, 0.3)";
        ctx.fill();
        
        // The stick of the joystick
        ctx.beginPath();
        ctx.arc(inputState.touch.currentX, inputState.touch.currentY, 25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
        ctx.fill();
        ctx.restore(); // Restore context state
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// START GAME
updateUI();
requestAnimationFrame(gameLoop);