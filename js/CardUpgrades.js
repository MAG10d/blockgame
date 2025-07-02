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
        title: 'Heal',
        desc: 'Restore to full health (future use)',
        icon: '❤️',
        apply: (player) => {
            // Placeholder for future health system
        }
    }
];

export default CARD_UPGRADES;
