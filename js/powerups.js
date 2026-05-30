import { CONFIG } from './config.js';
import { state } from './state.js';
import { clamp } from './utils.js';
import { audio } from './audio.js';


const TYPES = ['spread', 'plasma', 'rapid', 'shield', 'life', 'railgun'];

export function maybeDropPowerup(x, y) {
    if (Math.random() > 0.22) return;

    const type = TYPES[Math.floor(Math.random() * TYPES.length)];

    state.powerups.push({
        x,
        y,
        type,
        speed: 120,
        r: 18,
        t: 0,
    });
}

export function updatePowerups(dt) {
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const p = state.powerups[i];

        p.t += dt;
        p.x -= p.speed * dt;
        p.y += Math.sin(p.t * 5) * 0.55;

        if (p.x < -40) {
            state.powerups.splice(i, 1);
            continue;
        }

        const player = state.player;
        const dx = p.x - player.x;
        const dy = p.y - player.y;

        if (Math.hypot(dx, dy) < p.r + 34) {
            applyPowerup(p.type);
            state.powerups.splice(i, 1);
        }
    }
}

export function applyPowerup(type) {
    const player = state.player;
    audio.playSfx('powerup');

    if (type === 'spread') {
        player.weaponType = 'spread';
        player.weaponTimer = 16; // Laenger da schwaecher
    }

    if (type === 'plasma') {
        player.weaponType = 'plasma';
        player.weaponTimer = 12; // Mittel
    }

    if (type === 'rapid') {
        player.rapidTimer = 10;
    }

    if (type === 'life') {
        player.lives = Math.min(player.lives + 1, 5);
    }

    if (type === 'shield') {
        player.shieldTimer = 8;
        player.invulnerable = Math.max(player.invulnerable, 1);
    }

    if (type === 'railgun') {
        player.weaponType = 'railgun';
        player.weaponTimer = 8; // Kuerzer da staerkste Waffe
    }
}

export function updatePlayerPowerTimers(dt) {
    const player = state.player;

    player.weaponTimer -= dt;
    player.rapidTimer -= dt;
    player.shieldTimer -= dt;

    if (player.weaponTimer <= 0) {
        player.weaponType = 'laser';
    }

    player.weaponTimer = clamp(player.weaponTimer, 0, 99);
    player.rapidTimer = clamp(player.rapidTimer, 0, 99);
    player.shieldTimer = clamp(player.shieldTimer, 0, 99);
}

export function drawPowerups(ctx) {
    for (const p of state.powerups) {
        const color = getPowerupColor(p.type);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * 2.4);

        ctx.shadowBlur = 18;
        ctx.shadowColor = color;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(-15, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.font = '900 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getPowerupLabel(p.type), 0, 1);

        ctx.restore();
    }
}

function getPowerupColor(type) {
    if (type === 'spread') return '#38bdf8';
    if (type === 'plasma') return '#a855f7';
    if (type === 'rapid') return '#facc15';
    if (type === 'shield') return '#22c55e';
    if (type === 'life') return '#ef4444';
    if (type === 'railgun') return '#f43f5e';
    return '#ffffff';
}

function getPowerupLabel(type) {
    if (type === 'spread') return 'S';
    if (type === 'plasma') return 'P';
    if (type === 'rapid') return 'R';
    if (type === 'shield') return 'D';
    if (type === 'life') return '+';
    if (type === 'railgun') return 'G';
    return '?';
}