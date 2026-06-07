import { CONFIG } from './config.js';
import { state } from './state.js';
import { clamp } from './utils.js';
import { audio } from './audio.js';
import { isVertical, isPowerupOutOfBounds } from './direction.js';
import { getStage } from './stages.js';
import { getStageModifiers } from './stage-modifiers.js';

const TYPES = ['spread', 'plasma', 'rapid', 'shield', 'life', 'railgun', 'weaponUp', 'bomb', 'ionCannon', 'voidBeam'];

export function maybeDropPowerup(x, y) {
    const stage = getStage(state.stageIndex);
    const mods = getStageModifiers(stage);
    const dropChance = mods.powerupChance;

    // Kein Drop? Dann direkt raus.
    if (Math.random() > dropChance) return;

    // Gewichtete Drop-Tabelle
    const weights = {
        weaponUp: state.player.weaponLevel < state.player.maxWeaponLevel ? 3 : 0,
        spread: 2,
        plasma: 2,
        railgun: 1,
        rapid: 2,
        shield: 2,
        life: 1,
        bomb: 2,
        ionCannon: 0.5,
        voidBeam: 0.3,
    };

    const pool = [];

    for (const type of TYPES) {
        const weight = weights[type] || 1;

        for (let i = 0; i < weight; i++) {
            pool.push(type);
        }
    }

    if (pool.length === 0) return;

    const type = pool[Math.floor(Math.random() * pool.length)];

    state.powerups.push({
        x,
        y,
        type,
        speed: 100,
        r: 18,
        t: 0,
    });
}

export function updatePowerups(dt) {
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const p = state.powerups[i];

        p.t += dt;
        // Richtungabhaengige Drift
        if (isVertical()) {
            p.y += p.speed * dt;
            p.x += Math.sin(p.t * 5) * 0.55;
        } else {
            p.x -= p.speed * dt;
            p.y += Math.sin(p.t * 5) * 0.55;
        }

        if (isPowerupOutOfBounds(p)) {
            state.powerups.splice(i, 1);
            continue;
        }

        const player = state.player;
        const dx = p.x - player.x;
        const dy = p.y - player.y;

        // Magnet-Effekt: Powerups werden angezogen wenn nah
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
            const pull = (1 - dist / 120) * 320;
            p.x -= (dx / dist) * pull * dt;
            p.y -= (dy / dist) * pull * dt;
        }

        if (dist < p.r + 34) {
            applyPowerup(p.type);
            state.powerups.splice(i, 1);
        }
    }
}

export function applyPowerup(type) {
    const player = state.player;
    audio.playSfx('powerup');

    // Waffen-Upgrades: Weapon Level erhoehen
    if (type === 'weaponUp') {
        if (player.weaponLevel < player.maxWeaponLevel) {
            player.weaponLevel++;
            state.screenFlash = Math.max(state.screenFlash, 0.25);
        }
        return;
    }

    // Waffen-Pickups: Wechsel + Level beibehalten oder +1
    if (type === 'spread') {
        player.weaponType = 'spread';
        player.weaponTimer = 16;
        if (player.weaponLevel < 2) player.weaponLevel = 2;
    }

    if (type === 'plasma') {
        player.weaponType = 'plasma';
        player.weaponTimer = 12;
        if (player.weaponLevel < 2) player.weaponLevel = 2;
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
        player.weaponTimer = 8;
        if (player.weaponLevel < 2) player.weaponLevel = 2;
    }

    // === SECRET WEAPONS ===
    if (type === 'ionCannon') {
        player.weaponType = 'ionCannon';
        player.weaponTimer = 6; // Kurz aber verheerend
        if (player.weaponLevel < 3) player.weaponLevel = 3;
        state.screenFlash = 0.5;
        state.screenShake = 12;
    }

    if (type === 'voidBeam') {
        player.weaponType = 'voidBeam';
        player.weaponTimer = 5; // Sehr kurz aber extrem stark
        if (player.weaponLevel < 3) player.weaponLevel = 3;
        state.screenFlash = 0.6;
        state.screenShake = 16;
    }

    // Bomb Fragment: Sammle 3 = 1 neue Bombe
    if (type === 'bomb') {
        player.bombFragments++;
        if (player.bombFragments >= player.maxBombFragments) {
            player.bombFragments = 0;
            player.bombs = Math.min(player.bombs + 1, player.maxBombs);
            state.screenFlash = Math.max(state.screenFlash, 0.25);
        }
    }

    // Powerup-Sammel-Feedback
    state.screenFlash = Math.max(state.screenFlash, 0.12);
}

export function updatePlayerPowerTimers(dt) {
    const player = state.player;

    player.weaponTimer -= dt;
    player.rapidTimer -= dt;
    player.shieldTimer -= dt;

    if (player.weaponTimer <= 0) {
        player.weaponType = 'laser';
        // Level NICHT zuruecksetzen bei Waffenwechsel - Katakis behaelt Upgrades!
    }

    player.weaponTimer = clamp(player.weaponTimer, 0, 99);
    player.rapidTimer = clamp(player.rapidTimer, 0, 99);
    player.shieldTimer = clamp(player.shieldTimer, 0, 99);
}

export function drawPowerups(ctx) {
    for (const p of state.powerups) {
        const color = getPowerupColor(p.type);
        const label = getPowerupLabel(p.type);

        ctx.save();
        ctx.translate(p.x, p.y);

        // Aeussere Pulsation
        const pulse = Math.sin(p.t * 5) * 0.15 + 1;
        ctx.scale(pulse, pulse);

        ctx.rotate(p.t * 2.4);

        // Glow via semi-transparente Kreise statt shadowBlur
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        // Aussenring
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();

        // Inneres Diamond
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(13, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-13, 0);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = '#020617';
        ctx.font = '900 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 1);

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
    if (type === 'weaponUp') return '#f97316';
    if (type === 'bomb') return '#fb923c';
    if (type === 'ionCannon') return '#06b6d4';   // Cyan-Blau
    if (type === 'voidBeam') return '#7c3aed';    // Dunkles Lila
    return '#ffffff';
}

function getPowerupLabel(type) {
    if (type === 'spread') return 'S';
    if (type === 'plasma') return 'P';
    if (type === 'rapid') return 'R';
    if (type === 'shield') return 'D';
    if (type === 'life') return '+';
    if (type === 'railgun') return 'G';
    if (type === 'weaponUp') return 'UP';
    if (type === 'bomb') return 'B';
    if (type === 'ionCannon') return 'ION';
    if (type === 'voidBeam') return 'VD';
    return '?';
}
