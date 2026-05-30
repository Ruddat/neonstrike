import { CONFIG } from './config.js';
import { state } from './state.js';
import { assets } from './assets.js';
import { getStage } from './stages.js';

let spawnTimer = 0;

export function resetEnemies() {
    state.enemies = [];
    state.enemyBullets = [];
    spawnTimer = 0.8;
    state.formationTimer = 0;
    state.formationWave = 0;
}

export function updateEnemies(dt) {
    const stage = getStage(state.stageIndex);
    const speedMul = stage.enemySpeed || 1;

    // Formation Spawn Timer
    state.formationTimer -= dt;
    if (state.formationTimer <= 0) {
        spawnFormation(speedMul);
        // Schnellere Formationen in hoeheren Stages
        const baseInterval = Math.max(2.5, 4.5 - state.stageIndex * 0.25);
        state.formationTimer = baseInterval;
        state.formationWave++;
    }

    // Random single spawns zwischen Formationen
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnSingleEnemy(speedMul);
        spawnTimer = Math.max(0.6, 1.4 - state.score / 25000);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        enemy.t += dt;

        // Enemy-Typ-spezifische Bewegung
        updateEnemyMovement(enemy, dt, speedMul);

        // Enemy Shooting
        enemy.fireTimer -= dt;

        if (enemy.fireTimer <= 0 && enemy.x < CONFIG.width - 90 && enemy.type !== 'kamikaze') {
            fireEnemyBullet(enemy, speedMul);
        }

        // Kamikaze: Beschleunigung Richtung Spieler
        if (enemy.type === 'kamikaze') {
            const dx = state.player.x - enemy.x;
            const dy = state.player.y - enemy.y;
            const len = Math.hypot(dx, dy) || 1;
            enemy.vx += (dx / len) * 600 * dt;
            enemy.vy += (dy / len) * 600 * dt;
            // Max Speed
            const spd = Math.hypot(enemy.vx, enemy.vy);
            if (spd > 550 * speedMul) {
                enemy.vx = (enemy.vx / spd) * 550 * speedMul;
                enemy.vy = (enemy.vy / spd) * 550 * speedMul;
            }
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
        }

        // Flanker: Zyklische Bewegung
        if (enemy.type === 'flanker') {
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
            // Flanker kehrt um wenn ausserhalb
            if (enemy.y < 60 || enemy.y > CONFIG.height - 60) {
                enemy.vy *= -1;
            }
        }

        if (enemy.x < -120 || enemy.x > CONFIG.width + 120) {
            state.enemies.splice(i, 1);
        }
    }

    updateEnemyBullets(dt);
}

function updateEnemyMovement(enemy, dt, speedMul) {
    if (enemy.type === 'kamikaze') return; // Kamikaze hat eigene Bewegung
    if (enemy.type === 'flanker') return;  // Flanker hat eigene Bewegung

    // Standard-Bewegung: Links + Welle
    enemy.x -= enemy.speed * dt;
    enemy.y = enemy.baseY + Math.sin(enemy.t * 3.1) * enemy.wave;
}

function fireEnemyBullet(enemy, speedMul) {
    if (enemy.type === 'sniper') {
        // Sniper: Gezielter Schuss
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        state.enemyBullets.push({
            x: enemy.x - 32,
            y: enemy.y,
            vx: (dx / len) * 380 * speedMul,
            vy: (dy / len) * 380 * speedMul,
            r: 6,
            color: '#fca5a5',
        });
        enemy.fireTimer = 1.6;
    } else if (enemy.type === 'heavy') {
        // Heavy: Triple Shot
        for (let i = -1; i <= 1; i++) {
            state.enemyBullets.push({
                x: enemy.x - 32,
                y: enemy.y + i * 18,
                vx: -310 * speedMul,
                vy: i * 50 * speedMul,
                r: 6,
            });
        }
        enemy.fireTimer = 1.4;
    } else {
        // Drone: Standard
        state.enemyBullets.push({
            x: enemy.x - 32,
            y: enemy.y,
            vx: -310 * speedMul,
            vy: Math.sin(enemy.t * 2) * 70 * speedMul,
            r: 5,
        });
        enemy.fireTimer = 2.1;
    }
}

// --- Formation Spawning (Katakis-Style) ---

function spawnFormation(speedMul) {
    const formType = state.formationWave % 6;

    switch (formType) {
        case 0: spawnVFormation(speedMul); break;
        case 1: spawnLineFormation(speedMul); break;
        case 2: spawnCircleFormation(speedMul); break;
        case 3: spawnFlankerPair(speedMul); break;
        case 4: spawnKamikazeWave(speedMul); break;
        case 5: spawnSniperTeam(speedMul); break;
    }
}

function spawnVFormation(speedMul) {
    const baseY = 100 + Math.random() * (CONFIG.height - 200);
    const count = 5 + Math.floor(state.stageIndex * 0.5);

    for (let i = 0; i < count; i++) {
        const row = Math.abs(i - Math.floor(count / 2));
        state.enemies.push({
            type: 'drone',
            x: CONFIG.width + 80 + row * 50,
            y: baseY + (i - Math.floor(count / 2)) * 40,
            baseY: baseY + (i - Math.floor(count / 2)) * 40,
            w: 52,
            h: 30,
            speed: (170 + Math.random() * 40) * speedMul,
            hp: 2 + Math.floor(state.stageIndex * 0.4),
            points: 150 + state.stageIndex * 15,
            wave: 28,
            t: Math.random() * 10,
            fireTimer: 2.0 + Math.random() * 0.5,
        });
    }
}

function spawnLineFormation(speedMul) {
    const y = 70 + Math.random() * (CONFIG.height - 140);
    const count = 6 + Math.floor(state.stageIndex * 0.3);

    for (let i = 0; i < count; i++) {
        state.enemies.push({
            type: 'drone',
            x: CONFIG.width + 80 + i * 65,
            y: y,
            baseY: y,
            w: 52,
            h: 30,
            speed: (185 + Math.random() * 30) * speedMul,
            hp: 2 + Math.floor(state.stageIndex * 0.3),
            points: 150 + state.stageIndex * 12,
            wave: 12,
            t: Math.random() * 10,
            fireTimer: 1.8 + Math.random() * 0.6,
        });
    }
}

function spawnCircleFormation(speedMul) {
    const cx = CONFIG.width + 160;
    const cy = CONFIG.height / 2;
    const count = 8;
    const radius = 120;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;

        state.enemies.push({
            type: i % 3 === 0 ? 'heavy' : 'drone',
            x: ex,
            y: ey,
            baseY: ey,
            w: i % 3 === 0 ? 76 : 52,
            h: i % 3 === 0 ? 44 : 30,
            speed: (140 + Math.random() * 30) * speedMul,
            hp: i % 3 === 0 ? 5 + Math.floor(state.stageIndex * 0.8) : 2 + Math.floor(state.stageIndex * 0.4),
            points: i % 3 === 0 ? 360 + state.stageIndex * 40 : 150 + state.stageIndex * 15,
            wave: 20,
            t: angle,
            fireTimer: i % 3 === 0 ? 1.3 : 2.0,
        });
    }
}

function spawnFlankerPair(speedMul) {
    // Zwei Flanker kommen von oben und unten
    for (const dir of [-1, 1]) {
        state.enemies.push({
            type: 'flanker',
            x: CONFIG.width + 80,
            y: dir === -1 ? 80 : CONFIG.height - 80,
            baseY: dir === -1 ? 80 : CONFIG.height - 80,
            w: 48,
            h: 32,
            speed: 220 * speedMul,
            hp: 3 + Math.floor(state.stageIndex * 0.5),
            points: 250 + state.stageIndex * 20,
            wave: 0,
            t: 0,
            fireTimer: 0.8,
            vx: -200 * speedMul,
            vy: dir * 160 * speedMul,
        });
    }
}

function spawnKamikazeWave(speedMul) {
    const count = 2 + Math.floor(state.stageIndex * 0.3);

    for (let i = 0; i < count; i++) {
        const y = 100 + Math.random() * (CONFIG.height - 200);
        state.enemies.push({
            type: 'kamikaze',
            x: CONFIG.width + 80 + i * 120,
            y: y,
            baseY: y,
            w: 36,
            h: 36,
            speed: 0, // Wird durch vx/vy gesteuert
            hp: 1 + Math.floor(state.stageIndex * 0.2),
            points: 200 + state.stageIndex * 25,
            wave: 0,
            t: 0,
            fireTimer: 999, // Kein Schuss, nur Rammangriff
            vx: -180 * speedMul,
            vy: (Math.random() - 0.5) * 80,
        });
    }
}

function spawnSniperTeam(speedMul) {
    const count = 2 + Math.floor(state.stageIndex * 0.2);

    for (let i = 0; i < count; i++) {
        const y = 120 + (CONFIG.height - 240) * (i / Math.max(1, count - 1));
        state.enemies.push({
            type: 'sniper',
            x: CONFIG.width + 80,
            y: y,
            baseY: y,
            w: 56,
            h: 28,
            speed: (90 + Math.random() * 30) * speedMul,
            hp: 3 + Math.floor(state.stageIndex * 0.6),
            points: 300 + state.stageIndex * 30,
            wave: 15,
            t: Math.random() * 10,
            fireTimer: 1.0 + Math.random() * 0.5,
        });
    }
}

function spawnSingleEnemy(speedMul) {
    // Einzelne Feinde zwischen Formationen
    const type = Math.random() > 0.72 ? 'heavy' : 'drone';
    const y = 70 + Math.random() * (CONFIG.height - 140);

    state.enemies.push({
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
    });
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
            bullet.y > CONFIG.height + 40 ||
            bullet.x > CONFIG.width + 40
        ) {
            state.enemyBullets.splice(i, 1);
        }
    }
}

export function drawEnemies(ctx) {
    for (const enemy of state.enemies) {
        // Kamikaze: Spezielle rote Darstellung
        if (enemy.type === 'kamikaze') {
            drawKamikaze(ctx, enemy);
            continue;
        }

        // Flanker: Spezielle Darstellung
        if (enemy.type === 'flanker') {
            drawFlanker(ctx, enemy);
            continue;
        }

        // Sniper: Spezielle Darstellung
        if (enemy.type === 'sniper') {
            drawSniper(ctx, enemy);
            continue;
        }

        const sprite = enemy.type === 'heavy'
            ? assets.get('enemyHeavy')
            : assets.get('enemyDrone');

        if (sprite) {
            const width = enemy.type === 'heavy' ? 128 : 96;
            const height = enemy.type === 'heavy' ? 96 : 64;

            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            // Glow via semi-transparente Form (ohne shadowBlur)
            ctx.fillStyle = enemy.type === 'heavy' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(56, 189, 248, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, width * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

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

function drawKamikaze(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const angle = Math.atan2(enemy.vy || 0, enemy.vx || -1);
    ctx.rotate(angle);

    // Glow via semi-transparente Form
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // Dreieckige Form
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(24, 0);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawFlanker(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const angle = Math.atan2(enemy.vy || 0, enemy.vx || -1);
    ctx.rotate(angle);

    // Glow
    ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.moveTo(-20, -18);
    ctx.lineTo(22, 0);
    ctx.lineTo(-20, 18);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#c084fc';
    ctx.fillRect(-8, -3, 12, 6);

    ctx.restore();
}

function drawSniper(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Glow
    ctx.fillStyle = 'rgba(250, 204, 21, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.moveTo(-28, -12);
    ctx.lineTo(28, -6);
    ctx.lineTo(28, 6);
    ctx.lineTo(-28, 12);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, .3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-120, 0);
    ctx.stroke();

    ctx.restore();
}

export function drawEnemyBullets(ctx) {
    for (const bullet of state.enemyBullets) {
        // Glow via groesserer semi-transparenter Kreis statt shadowBlur
        if (bullet.homing) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5';
        } else if (bullet.color === '#fca5a5') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5';
        } else {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#86efac';
        }

        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
        ctx.fill();
    }
}
