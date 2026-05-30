import { CONFIG } from './config.js';
import { state } from './state.js';
import { keys, mouse } from './input.js';
import { clamp } from './utils.js';
import { assets } from './assets.js';
import { updatePlayerPowerTimers } from './powerups.js';
import { audio } from './audio.js';
import { spawnThrustParticle, spawnHitSpark } from './effects.js';

export function resetPlayer() {
    state.player.x = 120;
    state.player.y = CONFIG.height / 2;
    state.player.lives = 3;
    state.player.bombs = 3;
    state.player.cooldown = 0;
    state.player.bombCooldown = 0;
    state.player.invulnerable = 1.2;
    state.player.weaponType = 'laser';
    state.player.weaponTimer = 0;
    state.player.rapidTimer = 0;
    state.player.shieldTimer = 0;
    state.player.weaponLevel = 1;
    state.player.thrustTimer = 0;
}

export function updatePlayer(dt) {
    const player = state.player;

    let dx = 0;
    let dy = 0;

    if (mouse.inside) {
        const followSpeed = 12;
        player.x += (mouse.x - player.x) * Math.min(1, followSpeed * dt);
        player.y += (mouse.y - player.y) * Math.min(1, followSpeed * dt);
    } else {
        if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
        if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
        if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;

        if (dx || dy) {
            const length = Math.hypot(dx, dy);
            dx /= length;
            dy /= length;
        }

        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    }

    player.x = clamp(player.x, 34, CONFIG.width * 0.52);
    player.y = clamp(player.y, 44, CONFIG.height - 44);

    player.cooldown -= dt;
    player.invulnerable -= dt;
    player.bombCooldown -= dt;
    player.thrustTimer -= dt;
    updatePlayerPowerTimers(dt);

    // Engine Thrust Particles
    if (player.thrustTimer <= 0) {
        spawnThrustParticle(player.x - 40, player.y);
        player.thrustTimer = 0.03;
    }

    if ((mouse.left || keys.has('Space') || keys.has('KeyJ')) && player.cooldown <= 0) {
        fireBullet();
        player.cooldown = player.rapidTimer > 0 ? 0.055 : 0.12;
    }

    if (
        (mouse.right || keys.has('KeyK')) &&
        player.bombs > 0 &&
        player.bombCooldown <= 0
    ) {
        triggerBomb();
    }
}

function fireBullet() {
    const player = state.player;
    audio.playSfx('shoot');

    const lv = player.weaponLevel;

    if (player.weaponType === 'railgun') {
        // Railgun: Level steigert Pierce + Damage
        state.bullets.push({
            x: player.x + 48,
            y: player.y,
            vx: 1200,
            vy: 0,
            r: 9 + lv,
            damage: 3 + lv * 2,
            color: '#e0f2fe',
            pierce: 3 + lv * 2,
            rail: true,
        });

        // Level 3+: Side railgun beams
        if (lv >= 3) {
            state.bullets.push({
                x: player.x + 30,
                y: player.y - 18,
                vx: 1100,
                vy: -60,
                r: 6,
                damage: 2 + lv,
                color: '#7dd3fc',
                pierce: 2 + lv,
                rail: true,
            });
            state.bullets.push({
                x: player.x + 30,
                y: player.y + 18,
                vx: 1100,
                vy: 60,
                r: 6,
                damage: 2 + lv,
                color: '#7dd3fc',
                pierce: 2 + lv,
                rail: true,
            });
        }

        state.screenShake = Math.max(state.screenShake, 10 + lv * 2);
        state.screenFlash = Math.max(state.screenFlash, 0.18);
        return;
    }

    if (player.weaponType === 'spread') {
        // Spread: Level steigert Anzahl + Schaden
        const count = lv >= 5 ? 7 : lv >= 4 ? 5 : lv >= 3 ? 5 : lv >= 2 ? 3 : 3;
        const spreadAngle = 0.18 + lv * 0.04;
        const baseDamage = 0.7 + lv * 0.3;

        for (let i = 0; i < count; i++) {
            const angle = -spreadAngle * (count - 1) / 2 + spreadAngle * i;
            state.bullets.push({
                x: player.x + 48,
                y: player.y,
                vx: 680 * Math.cos(angle),
                vy: 680 * Math.sin(angle),
                r: 4 + Math.floor(lv / 2),
                damage: baseDamage,
                color: '#38bdf8',
            });
        }
        return;
    }

    if (player.weaponType === 'plasma') {
        // Plasma: Level steigert Damage + Groesse + Sekundaer-Orbs
        const baseDmg = 1.5 + lv * 0.8;
        state.bullets.push({
            x: player.x + 48,
            y: player.y,
            vx: 580,
            vy: 0,
            r: 7 + lv * 2,
            damage: baseDmg,
            color: '#a855f7',
            plasma: true,
        });

        // Level 3+: Tracking plasma orbs
        if (lv >= 3) {
            state.bullets.push({
                x: player.x + 30,
                y: player.y - 22,
                vx: 500,
                vy: -80,
                r: 5 + lv,
                damage: baseDmg * 0.5,
                color: '#c084fc',
                plasma: true,
            });
            state.bullets.push({
                x: player.x + 30,
                y: player.y + 22,
                vx: 500,
                vy: 80,
                r: 5 + lv,
                damage: baseDmg * 0.5,
                color: '#c084fc',
                plasma: true,
            });
        }
        return;
    }

    // LASER (Standard): Level steigert Schuesse + Damage
    const laserDamage = 1 + Math.floor(lv / 2);
    const base = {
        x: player.x + 48,
        y: player.y,
        vx: 780,
        vy: 0,
        r: 5,
        damage: laserDamage,
        color: '#facc15',
    };

    state.bullets.push(base);

    // Level 2+: Zweiter Schuss leicht versetzt
    if (lv >= 2) {
        state.bullets.push({
            ...base,
            y: player.y - 10,
            damage: laserDamage,
        });
    }

    // Level 3+: Dritter Schuss
    if (lv >= 3) {
        state.bullets.push({
            ...base,
            y: player.y + 10,
            damage: laserDamage * 0.8,
        });
    }

    // Level 4+: Diagonale Schuesse
    if (lv >= 4) {
        state.bullets.push({
            ...base,
            y: player.y - 8,
            vx: 720,
            vy: -90,
            damage: laserDamage * 0.7,
        });
        state.bullets.push({
            ...base,
            y: player.y + 8,
            vx: 720,
            vy: 90,
            damage: laserDamage * 0.7,
        });
    }

    // Level 5: Rear shot
    if (lv >= 5) {
        state.bullets.push({
            ...base,
            x: player.x - 20,
            vx: -500,
            damage: laserDamage * 0.5,
            color: '#fb923c',
        });
    }
}

function triggerBomb() {
    const player = state.player;
    audio.playSfx('bomb');
    player.bombs--;
    player.bombCooldown = 2.5;

    state.screenFlash = 1;
    state.screenShake = 28;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        state.score += enemy.points;
        state.enemies.splice(i, 1);
    }

    state.enemyBullets.length = 0;
}


export function updateBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (bullet.x > CONFIG.width + 40 || bullet.x < -40 ||
            bullet.y < -40 || bullet.y > CONFIG.height + 40) {
            state.bullets.splice(i, 1);
        }
    }
}

export function drawPlayer(ctx) {
    const player = state.player;
    const sprite = assets.get('player');

    if (sprite) {
        ctx.save();
        ctx.translate(player.x, player.y);

        if (player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
            ctx.globalAlpha = 0.45;
        }

        ctx.drawImage(sprite, -64, -32, 128, 64);

        // Shield visual
        if (player.shieldTimer > 0) {
            const shieldPulse = Math.sin(performance.now() * 0.006) * 0.3 + 0.7;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2 + shieldPulse;
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#22c55e';
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Weapon Level Glow
        if (player.weaponLevel >= 3) {
            const glowColor = player.weaponLevel >= 5 ? '#ef4444' : '#f97316';
            ctx.shadowBlur = 12;
            ctx.shadowColor = glowColor;
            ctx.fillStyle = glowColor + '33';
            ctx.beginPath();
            ctx.arc(24, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
        return;
    }

    // Fallback, falls Sprite fehlt
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
        ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, 0);
    ctx.lineTo(-24, -24);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-46, -7);
    ctx.lineTo(-46, 7);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-24, 24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

export function drawBullets(ctx) {
    const laser = assets.get('laserYellow');

    for (const bullet of state.bullets) {

        if (bullet.rail) {
            ctx.save();
            ctx.shadowBlur = 28;
            ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(bullet.x - 12, bullet.y - 5, 80, 10);

            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(bullet.x - 24, bullet.y - 2, 110, 4);
            ctx.restore();
            continue;
        }

        if (bullet.plasma) {
            ctx.save();
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#a855f7';
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow
            ctx.fillStyle = '#e9d5ff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
        }

        if (laser) {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = bullet.color || '#facc15';
            ctx.drawImage(laser, bullet.x - 16, bullet.y - 8, 48, 16);
            ctx.restore();
            continue;
        }

        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = bullet.color || '#facc15';
        ctx.fillStyle = bullet.color || '#facc15';
        ctx.fillRect(bullet.x - 4, bullet.y - 3, 34, 6);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
