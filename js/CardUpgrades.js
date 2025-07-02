// CardUpgrades.js
// List of possible upgrades for the level-up card choice UI

const CARD_UPGRADES = [
    {
        title: 'Faster Weapon',
        desc: 'Weapon cooldown -20% (min 5)',
        icon: '⚡',
        apply: (player) => {
            player.weapon.cooldown = Math.max(5, Math.floor(player.weapon.cooldown * 0.8));
        }
    },
    {
        title: 'Bigger Projectiles',
        desc: '+50% projectile size',
        icon: '⬛',
        apply: (player) => {
            player.weapon.projectileSize = Math.floor(player.weapon.projectileSize * 1.5);
        }
    },
    {
        title: 'Move Speed Up',
        desc: '+1 player speed',
        icon: '🏃',
        apply: (player) => {
            player.speed += 1;
        }
    },
    {
        title: 'More XP',
        desc: '+50% XP from orbs',
        icon: '⭐',
        apply: (player) => {
            player.xpBonus = (player.xpBonus || 1) * 1.5;
        }
    },
    {
        title: 'Max Health Up',
        desc: '+25 max health and heal full',
        icon: '❤️',
        apply: (player) => {
            player.maxHealth += 25;
            player.health = player.maxHealth; // Full heal
            player.updateSprite();
        }
    },
    {
        title: 'Regeneration',
        desc: 'Restore 30 health',
        icon: '💚',
        apply: (player) => {
            player.heal(30);
        }
    },
    {
        title: 'Iron Skin',
        desc: 'Longer invulnerability time',
        icon: '🛡️',
        apply: (player) => {
            player.maxInvulnerabilityTime = Math.floor(player.maxInvulnerabilityTime * 1.5);
        }
    },
    {
        title: 'Stronger Bullets',
        desc: 'Projectiles deal more damage',
        icon: '💥',
        apply: (player) => {
            // This will be used in collision detection
            player.weapon.damage = (player.weapon.damage || 20) + 10;
        }
    }
];

export default CARD_UPGRADES;
