import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';
import { getStageModifiers } from './stage-modifiers.js';
import { isVertical } from './direction.js';
import { spawnExplosion, spawnHitSpark } from './effects.js';

const asteroids = [];
let spawnTimer = 0;
let lastTime = 0;
let lastStageIndex = -1;

function resetHazardsForStage() {
    asteroids.length = 0;
    spawnTimer = 0.4;
    lastTime = 0;
    lastStageIndex = state.stageIndex;
}

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function makeRockShape(points) {
    const shape = [];
    for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        shape.push({
            angle,
            radius: rand(0.68, 1.14),
        });
    }
    return shape;
}

function spawnAsteroid(mods) {
    const vertical = isVertical();
    const sizeRoll = Math.random();
    const r = sizeRoll > 0.82 ? rand(34, 48) : sizeRoll > 0.45 ? rand(24, 34) : rand(16, 24);
    const speed = rand(70, 145) * (1 + (mods.asteroidDensity || 0) * 0.35);

    const asteroid = {
        x: vertical ? rand(60, CONFIG.width - 60) : CONFIG.width + r + rand(0, 120),
        y: vertical ? -r - rand(0, 120) : rand(70, CONFIG.height - 70),
        vx: vertical ? rand(-35, 35) : -speed,
        vy: vertical ? speed : rand(-45, 45),
        r,
        hp: Math.max(2, Math.round(r / 12)),
        maxHp: Math.max(2, Math.round(r / 12)),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-1.6, 1.6),
        shape: makeRockShape(10 + Math.floor(Math.random() * 5)),
        t: 0,
    };

    asteroids.push(asteroid);
}

function isOutOfBounds(asteroid) {
    return asteroid.x < -120 || asteroid.x > CONFIG.width + 160 ||
        asteroid.y < -140 || asteroid.y > CONFIG.height + 160;
}

function circleHit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const rr = ar + br;
    return dx * dx + dy * dy < rr * rr;
}

function damagePlayerFromHazard() {
    state.comboCount = 0;
    state.comboMultiplier = 1;
    state.comboTimer = 0;

    if (state.player.shieldTimer > 0) {
        state.player.shieldTimer = 0;
        state.player.invulnerable = 1.2;
        state.screenFlash = Math.max(state.screenFlash, 0.35);
        state.screenShake = Math.max(state.screenShake, 10);
        return;
    }

    state.player.lives--;
    state.player.invulnerable = 1.5;
    state.screenFlash = Math.max(state.screenFlash, 0.45);
    state.screenShake = Math.max(state.screenShake, 14);

    if (state.player.weaponLevel > 1) {
        state.player.weaponLevel--;
    }

    if (state.player.lives <= 0) {
        state.player.lives = 0;
        state.gameOver = true;
        state.running = false;
    }
}

function splitAsteroid(asteroid) {
    if (asteroid.r < 30) return;

    for (let i = 0; i < 2; i++) {
        const childR = asteroid.r * rand(0.45, 0.58);
        asteroids.push({
            x: asteroid.x + rand(-8, 8),
            y: asteroid.y + rand(-8, 8),
            vx: asteroid.vx * rand(0.75, 1.15) + rand(-80, 80),
            vy: asteroid.vy * rand(0.75, 1.15) + rand(-80, 80),
            r: childR,
            hp: Math.max(1, Math.round(childR / 14)),
            maxHp: Math.max(1, Math.round(childR / 14)),
            rot: rand(0, Math.PI * 2),
            rotSpeed: rand(-2.2, 2.2),
            shape: makeRockShape(9 + Math.floor(Math.random() * 4)),
            t: 0,
        });
    }
}

function updateAsteroids(dt, mods) {
    const density = Math.max(0, mods.asteroidDensity || 0);
    if (density > 0) {
        spawnTimer -= dt;
        const interval = Math.max(0.32, 1.75 - density * 1.35);
        if (spawnTimer <= 0) {
            spawnAsteroid(mods);
            spawnTimer = interval + rand(0, interval * 0.55);
        }
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.t += dt;
        asteroid.x += asteroid.vx * dt;
        asteroid.y += asteroid.vy * dt;
        asteroid.rot += asteroid.rotSpeed * dt;

        if (isOutOfBounds(asteroid)) {
            asteroids.splice(i, 1);
            continue;
        }

        // Player bullets vs asteroid
        for (let j = state.bullets.length - 1; j >= 0; j--) {
            const bullet = state.bullets[j];
            if (!circleHit(bullet.x, bullet.y, bullet.r, asteroid.x, asteroid.y, asteroid.r * 0.82)) continue;

            spawnHitSpark(bullet.x, bullet.y);
            asteroid.hp -= bullet.damage || 1;

            if (bullet.pierce && bullet.pierce > 0) {
                bullet.pierce--;
            } else {
                state.bullets.splice(j, 1);
            }

            if (asteroid.hp <= 0) {
                spawnExplosion(asteroid.x, asteroid.y, Math.max(0.65, asteroid.r / 32));
                state.score += Math.round(30 + asteroid.r * 2);
                splitAsteroid(asteroid);
                asteroids.splice(i, 1);
            }

            break;
        }
    }
}

function checkPlayerAsteroidCollision() {
    if (state.player.invulnerable > 0) return;

    const player = state.player;
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        if (!circleHit(player.x, player.y, 26, asteroid.x, asteroid.y, asteroid.r * 0.78)) continue;

        spawnExplosion(asteroid.x, asteroid.y, Math.max(0.8, asteroid.r / 30));
        asteroids.splice(i, 1);
        damagePlayerFromHazard();
        break;
    }
}

function drawAsteroid(ctx, asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rot);

    const hpPct = asteroid.hp / asteroid.maxHp;

    ctx.fillStyle = 'rgba(249, 115, 22, 0.10)';
    ctx.beginPath();
    ctx.arc(0, 0, asteroid.r * 1.28, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(-asteroid.r * 0.35, -asteroid.r * 0.35, 0, 0, 0, asteroid.r * 1.2);
    gradient.addColorStop(0, '#a8a29e');
    gradient.addColorStop(0.48, '#57534e');
    gradient.addColorStop(1, '#1c1917');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = hpPct < 0.45 ? '#fb923c' : '#292524';
    ctx.lineWidth = 3;

    ctx.beginPath();
    for (let i = 0; i < asteroid.shape.length; i++) {
        const point = asteroid.shape[i];
        const px = Math.cos(point.angle) * asteroid.r * point.radius;
        const py = Math.sin(point.angle) * asteroid.r * point.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
    for (let i = 0; i < 3; i++) {
        const angle = asteroid.rot + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * asteroid.r * 0.35, Math.sin(angle) * asteroid.r * 0.3, asteroid.r * 0.11, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function updateAndDrawHazards(ctx, time = performance.now()) {
    const stage = getStage(state.stageIndex);
    const mods = getStageModifiers(stage);
    const enabled = Boolean(mods.asteroidDrift) && (mods.asteroidDensity || 0) > 0;

    if (state.stageIndex !== lastStageIndex || !enabled) {
        resetHazardsForStage();
        if (!enabled) return;
    }

    const dt = lastTime > 0 ? Math.min((time - lastTime) / 1000, 0.033) : 0.016;
    lastTime = time;

    if (!state.hyperspaceJump && !state.stageTransition && state.running && !state.paused) {
        updateAsteroids(dt, mods);
        checkPlayerAsteroidCollision();
    }

    for (const asteroid of asteroids) {
        drawAsteroid(ctx, asteroid);
    }
}
