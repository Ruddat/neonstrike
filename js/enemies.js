import { CONFIG } from './config.js';
import { state } from './state.js';
import { assets } from './assets.js';
import { getStage } from './stages.js';

let spawnTimer = 0;

export function resetEnemies() {
    state.enemies = [];
    state.enemyBullets = [];
    spawnTimer = 0.8;
}

export function updateEnemies(dt) {
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = Math.max(0.45, 1.15 - state.score / 20000);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        enemy.t += dt;
        enemy.x -= enemy.speed * dt;
        enemy.y = enemy.baseY + Math.sin(enemy.t * 3.1) * enemy.wave;

        enemy.fireTimer -= dt;

        if (enemy.fireTimer <= 0 && enemy.x < CONFIG.width - 90) {
            const stage = getStage(state.stageIndex);
    const bulletSpeedMul = stage.enemySpeed || 1;

    state.enemyBullets.push({
                x: enemy.x - 32,
                y: enemy.y,
                vx: -310 * bulletSpeedMul,
                vy: Math.sin(enemy.t * 2) * 70 * bulletSpeedMul,
                r: 5,
            });

            enemy.fireTimer = enemy.type === 'heavy' ? 1.4 : 2.1;
        }

        if (enemy.x < -100) {
            state.enemies.splice(i, 1);
        }
    }

    updateEnemyBullets(dt);
}

function spawnEnemy() {
    const type = Math.random() > 0.72 ? 'heavy' : 'drone';
    const y = 70 + Math.random() * (CONFIG.height - 140);
    const stage = getStage(state.stageIndex);
    const speedMul = stage.enemySpeed || 1;

    const enemy = {
        type,
        x: CONFIG.width + 80,
        y,
        baseY: y,
        w: type === 'heavy' ? 76 : 52,
        h: type === 'heavy' ? 44 : 30,
        speed: (type === 'heavy' ? 125 : 190 + Math.random() * 55) * speedMul,
        hp: type === 'heavy' ? 5 + Math.floor(state.stageIndex * 0.8) : 2 + Math.floor(state.stageIndex * 0.4),
        points: type === 'heavy' ? 360 + state.stageIndex * 40 : 150 + state.stageIndex * 15,
        wave: type === 'heavy' ? 18 : 34,
        t: Math.random() * 10,
        fireTimer: type === 'heavy' ? 1.3 : 2.0,
    };

    state.enemies.push(enemy);
}

function updateEnemyBullets(dt) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = state.enemyBullets[i];

        // Homing-Verfolgung
        if (bullet.homing && bullet.homingTimer > 0) {
            bullet.homingTimer -= dt;
            const dx = state.player.x - bullet.x;
            const dy = state.player.y - bullet.y;
            const len = Math.hypot(dx, dy) || 1;
            const turnRate = 200;
            bullet.vx += (dx / len) * turnRate * dt;
            bullet.vy += (dy / len) * turnRate * dt;
            const speed = Math.hypot(bullet.vx, bullet.vy);
            const maxSpeed = 400;
            if (speed > maxSpeed) {
                bullet.vx = (bullet.vx / speed) * maxSpeed;
                bullet.vy = (bullet.vy / speed) * maxSpeed;
            }
        }

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (
            bullet.x < -40 ||
            bullet.y < -40 ||
            bullet.y > CONFIG.height + 40
        ) {
            state.enemyBullets.splice(i, 1);
        }
    }
}

export function drawEnemies(ctx) {
    for (const enemy of state.enemies) {
        const sprite = enemy.type === 'heavy'
            ? assets.get('enemyHeavy')
            : assets.get('enemyDrone');

        if (sprite) {
            const width = enemy.type === 'heavy' ? 128 : 96;
            const height = enemy.type === 'heavy' ? 96 : 64;

            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            ctx.shadowBlur = enemy.type === 'heavy' ? 18 : 12;
            ctx.shadowColor = enemy.type === 'heavy' ? '#f97316' : '#38bdf8';

            ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

            ctx.shadowBlur = 0;
            ctx.restore();

            continue;
        }

        // Fallback
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        ctx.fillStyle = enemy.type === 'heavy' ? '#475569' : '#334155';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(-enemy.w / 2, 0);
        ctx.lineTo(enemy.w / 2, -enemy.h / 2);
        ctx.lineTo(enemy.w / 2 - 12, 0);
        ctx.lineTo(enemy.w / 2, enemy.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-enemy.w / 2 + 8, -4, 18, 8);

        ctx.fillStyle = '#f97316';
        ctx.fillRect(enemy.w / 2 - 16, -3, 10, 6);

        ctx.restore();
    }
}

export function drawEnemyBullets(ctx) {
    for (const bullet of state.enemyBullets) {
        ctx.save();

        if (bullet.homing) {
            // Zielsuchende Geschosse: Rot mit Staerkere Glow
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#fca5a5';
        } else {
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#22c55e';
            ctx.fillStyle = '#86efac';
        }

        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}