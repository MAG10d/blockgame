'use strict';

// Import all our classes
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

// DATA
const characterData = {
    'warrior': { name: 'Warrior', width: 30, height: 30, color: 'deepskyblue', speed: 4 }
};
const weaponData = {
    'magicMissile': { name: 'Magic Missile', cooldown: 120, projectileSize: 10, projectileSpeed: 5, projectileColor: 'fuchsia' }
};

// GAME STATE
const player = new Player(canvas.width / 2, canvas.height / 2, characterData.warrior);
const projectiles = [];
const enemies = [];
const xpOrbs = []; // NEW: Array for XP orbs

let weaponCooldownTimer = 0;
let enemySpawnTimer = 0;

const keysPressed = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

// INPUT HANDLING
window.addEventListener('keydown', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = false;
});

// HELPER FUNCTIONS
function fireWeapon() {
    const weapon = weaponData[player.currentWeapon];
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
                
                // NEW: When an enemy is hit, spawn an XP orb at its location
                xpOrbs.push(new XPOrb(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
            }
        });
    });
}

function updateUI() {
    characterDisplay.innerHTML = `<b>Character:</b><br>${player.name}`;
    weaponDisplay.innerHTML = `<b>Weapon:</b><br>${weaponData[player.currentWeapon].name}`;
}

// GAME LOOP FUNCTIONS
function update() {
    // 1. Update all game objects
    player.update(keysPressed, canvas);
    enemies.forEach(enemy => enemy.update(player));
    projectiles.forEach(proj => proj.update());
    xpOrbs.forEach(orb => orb.update());

    // 2. Handle timers and spawning
    if (--weaponCooldownTimer <= 0) {
        fireWeapon();
        weaponCooldownTimer = weaponData[player.currentWeapon].cooldown;
    }
    if (--enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = 90;
    }

    // 3. Handle collisions
    checkCollisions();

    // 4. Clean up marked items from all arrays
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (proj.markedForDeletion || proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
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
    player.draw(ctx);
    enemies.forEach(enemy => enemy.draw(ctx));
    projectiles.forEach(proj => proj.draw(ctx));
    xpOrbs.forEach(orb => orb.draw(ctx)); // Draw the XP orbs
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// START GAME
updateUI();
requestAnimationFrame(gameLoop);