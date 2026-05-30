import { CONFIG } from './config.js';
import { state } from './state.js';
import { keys, mouse } from './input.js';
import { clamp } from './utils.js';
import { assets } from './assets.js';
import { updatePlayerPowerTimers } from './powerups.js';
import { audio } from './audio.js';

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
    updatePlayerPowerTimers(dt);
    player.bombCooldown -= dt;

    if ((mouse.left || keys.has('Space') || keys.has('KeyJ')) && player.cooldown <= 0) {
        fireBullet();
        player.cooldown = player.rapidTimer > 0 ? 0.065 : 0.13;
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

    const base = {
        x: player.x + 48,
        y: player.y,
        vx: player.weaponType === 'plasma' ? 620 : 780,
        vy: 0,
        r: player.weaponType === 'plasma' ? 8 : 5,
        damage: player.weaponType === 'plasma' ? 2 : 1,
        color: player.weaponType === 'plasma' ? '#a855f7' : '#facc15',
    };

    if (player.weaponType === 'railgun') {
        state.bullets.push({
            ...base,
            vx: 1200,
            r: 9,
            damage: 5,
            color: '#e0f2fe',
            pierce: 5,
            rail: true,
        });

        state.screenShake = Math.max(state.screenShake, 10);
        state.screenFlash = Math.max(state.screenFlash, 0.18);
        return;
    }


    if (player.weaponType === 'spread') {
        state.bullets.push({ ...base, vy: 0, color: '#38bdf8' });
        state.bullets.push({ ...base, vy: -130, color: '#38bdf8', damage: 0.85 });
        state.bullets.push({ ...base, vy: 130, color: '#38bdf8', damage: 0.85 });
        return;
    }

    if (player.weaponType === 'plasma') {
        state.bullets.push({ ...base, damage: 2.2 });
        return;
    }

    state.bullets.push(base);
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

        if (bullet.x > CONFIG.width + 40) {
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

        if (player.shieldTimer > 0) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.stroke();
        }


        ctx.restore();
        return;
    }




    // Fallback, falls Sprite fehlt
    ctx.save();
    ctx.translate(player.x, player.y);

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



        if (laser) {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = bullet.color || '#facc15';
            ctx.drawImage(laser, bullet.x - 16, bullet.y - 8, 48, 16);
            ctx.restore();
            continue;
        }

        ctx.shadowBlur = 18;
        ctx.shadowColor = bullet.color || '#facc15';
        ctx.fillStyle = bullet.color || '#facc15';
        ctx.fillRect(bullet.x - 4, bullet.y - 3, 34, 6);
        ctx.shadowBlur = 0;
    }
}