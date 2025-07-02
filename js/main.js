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
const xpBarFill = document.getElementById('xp-bar-fill'); // Get the XP bar element

// DATA
const characterData = {
    'warrior': { name: 'Warrior', width: 30, height: 30, color: 'deepskyblue', speed: 4 }
};
const weaponData = {
    'magicMissile': { name: 'Magic Missile', cooldown: 120, projectileSize: 10, projectileSpeed: 5, projectileColor: 'fuchsia' }
};

// GAME STATE
// Player now also needs weaponData to initialize its weapon
const player = new Player(canvas.width / 2, canvas.height / 2, characterData.warrior, weaponData);
const projectiles = [], enemies = [], xpOrbs = [];
let weaponCooldownTimer = 0, enemySpawnTimer = 0;
const keysPressed = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

// INPUT HANDLING (no changes)
window.addEventListener('keydown', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = false;
});

// HELPER FUNCTIONS
function fireWeapon() {
    // We now use the player's personal weapon stats
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
    // Projectile vs Enemy collision
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

    // NEW: Player vs XPOrb collision
    xpOrbs.forEach(orb => {
        if (player.x < orb.x + orb.width && player.x + player.width > orb.x &&
            player.y < orb.y + orb.height && player.y + player.height > orb.y) {
            
            player.gainXP(orb.value); // Player gains XP
            orb.markedForDeletion = true; // Mark the orb to be removed
            updateUI(); // Update UI immediately for a responsive feel
        }
    });
}

function updateUI() {
    // Update text displays
    characterDisplay.innerHTML = `<b>Character:</b><br>${player.name} (Lvl ${player.level})`;
    weaponDisplay.innerHTML = `<b>Weapon:</b><br>${player.weapon.name}`;

    // Update XP bar
    const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
    xpBarFill.style.width = `${xpPercentage}%`;
}

// GAME LOOP FUNCTIONS
function update() {
    player.update(keysPressed, canvas);
    enemies.forEach(enemy => enemy.update(player));
    projectiles.forEach(proj => proj.update());
    xpOrbs.forEach(orb => orb.update());

    if (--weaponCooldownTimer <= 0) {
        fireWeapon();
        // The cooldown is now read from the player's personal weapon stats
        weaponCooldownTimer = player.weapon.cooldown;
    }
    if (--enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = 90;
    }

    checkCollisions();

    // Clean up all marked items
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
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// START GAME
updateUI(); // Initial UI setup
requestAnimationFrame(gameLoop);