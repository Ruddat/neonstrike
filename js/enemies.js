import { CONFIG } from './config.js';
import { state } from './state.js';
import { assets } from './assets.js';
import { getStage } from './stages.js';
import { getStageModifiers, pickEnemyType } from './stage-modifiers.js';

import {
    isVertical,
    spawnX, spawnY,
    formationSpawnX, formationSpawnY,
    moveX, isOutOfBounds,
    enemyBulletBaseVx, enemyBulletBaseVy,
    bossBulletX, bossBulletY,
} from './direction.js';

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
        const baseInterval = Math.max(1.8, 4.5 - state.stageIndex * 0.3);
        state.formationTimer = baseInterval;
        state.formationWave++;
    }

    // Random single spawns zwischen Formationen
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnSingleEnemy(speedMul);
        spawnTimer = Math.max(0.4, 1.4 - state.score / 25000);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        enemy.t += dt;

        // Enemy-Typ-spezifische Bewegung
        updateEnemyMovement(enemy, dt, speedMul);

        // Enemy Shooting
        enemy.fireTimer -= dt;

        const canFire = isVertical()
            ? enemy.y > -90 && enemy.type !== 'kamikaze' && enemy.type !== 'wobble'
            : enemy.x < CONFIG.width - 90 && enemy.type !== 'kamikaze' && enemy.type !== 'wobble';

        if (enemy.fireTimer <= 0 && canFire) {

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
            if (enemy.x < 60 || enemy.x > CONFIG.width - 60) {
                enemy.vx *= -1;
            }
        }

        // Drunk: Zigzag movement
        if (enemy.type === 'drunk') {
            enemy.drinkDirTimer -= dt;
            if (enemy.drinkDirTimer <= 0) {
                enemy.drinkDir *= -1;
                enemy.drinkDirTimer = 0.4 + Math.random() * 0.6;
            }
            if (isVertical()) {
                enemy.y += enemy.speed * dt;
                enemy.x += enemy.drinkDir * 180 * dt;
                enemy.x = Math.max(40, Math.min(CONFIG.width - 40, enemy.x));
            } else {
                enemy.x -= enemy.speed * dt;
                enemy.y += enemy.drinkDir * 180 * dt;
                enemy.y = Math.max(40, Math.min(CONFIG.height - 40, enemy.y));
            }
        }

        // Wobble: Slow drifting movement
        if (enemy.type === 'wobble') {
            if (isVertical()) {
                enemy.y += enemy.speed * dt;
                enemy.x = enemy.baseX + Math.sin(enemy.t * 1.5) * enemy.wave;
            } else {
                enemy.x -= enemy.speed * dt;
                enemy.y = enemy.baseY + Math.sin(enemy.t * 1.5) * enemy.wave;
            }
        }

        if (isOutOfBounds(enemy)) {
            state.enemies.splice(i, 1);
        }
    }

    updateEnemyBullets(dt);
}

function updateEnemyMovement(enemy, dt, speedMul) {
    if (enemy.type === 'kamikaze') return; // Kamikaze hat eigene Bewegung
    if (enemy.type === 'flanker') return;  // Flanker hat eigene Bewegung
    if (enemy.type === 'drunk') return;    // Drunk hat eigene Bewegung
    if (enemy.type === 'wobble') return;   // Wobble hat eigene Bewegung

    // Derp: Wobble movement (high frequency sine)
    if (enemy.type === 'derp') {
        if (isVertical()) {
            enemy.y += enemy.speed * dt;
            enemy.x = enemy.baseX + Math.sin(enemy.t * 8) * 30;
        } else {
            enemy.x -= enemy.speed * dt;
            enemy.y = enemy.baseY + Math.sin(enemy.t * 8) * 30;
        }
        return;
    }

    // Standard-Bewegung: Hauptrichtung + Welle
    if (isVertical()) {
        enemy.y += enemy.speed * dt;
        enemy.x = enemy.baseX + Math.sin(enemy.t * 3.1) * enemy.wave;
    } else {
        enemy.x -= enemy.speed * dt;
        enemy.y = enemy.baseY + Math.sin(enemy.t * 3.1) * enemy.wave;
    }
}

function fireEnemyBullet(enemy, speedMul) {
    const stage = getStage(state.stageIndex);
    const mods = getStageModifiers(stage);
    const bulletSpeedMul = speedMul * mods.enemyBulletSpeed;

    if (enemy.type === 'sniper') {
        // Sniper: Gezielter Schuss
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;

        state.enemyBullets.push({
            x: isVertical() ? enemy.x : enemy.x - 32,
            y: isVertical() ? enemy.y + 32 : enemy.y,
            vx: (dx / len) * 380 * bulletSpeedMul,
            vy: (dy / len) * 380 * bulletSpeedMul,
            r: 6,
            color: '#fca5a5',
        });

        enemy.fireTimer = 1.6;
        return;
    }

    if (enemy.type === 'heavy') {
        // Heavy: Triple Shot
        for (let i = -1; i <= 1; i++) {
            state.enemyBullets.push({
                x: isVertical() ? enemy.x + i * 18 : enemy.x - 32,
                y: isVertical() ? enemy.y + 32 : enemy.y + i * 18,
                vx: enemyBulletBaseVx(bulletSpeedMul) + (isVertical() ? i * 50 * bulletSpeedMul : 0),
                vy: enemyBulletBaseVy(bulletSpeedMul) + (isVertical() ? 0 : i * 50 * bulletSpeedMul),
                r: 6,
                color: '#fca5a5',
            });
        }

        enemy.fireTimer = 1.4;
        return;
    }

    if (enemy.type === 'derp') {
        // Derp: ungenaue Streuschüsse
        const baseAngle = isVertical()
            ? Math.PI / 2 + (Math.random() - 0.5) * 1.2
            : Math.PI + (Math.random() - 0.5) * 1.2;

        for (let i = 0; i < 2; i++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const angle = baseAngle + spread;

            state.enemyBullets.push({
                x: isVertical() ? enemy.x : enemy.x - 20,
                y: isVertical() ? enemy.y + 20 : enemy.y,
                vx: Math.cos(angle) * 260 * bulletSpeedMul,
                vy: Math.sin(angle) * 260 * bulletSpeedMul,
                r: 4,
                color: '#86efac',
            });
        }

        enemy.fireTimer = 1.8 + Math.random() * 0.5;
        return;
    }

    if (enemy.type === 'drunk') {
        // Drunk: Zufallsschüsse, teils rückwärts
        const backwards = Math.random() < 0.3;
        const baseAngle = backwards
            ? (Math.random() - 0.5) * 1.5
            : isVertical()
                ? Math.PI / 2 + (Math.random() - 0.5) * 2.0
                : Math.PI + (Math.random() - 0.5) * 2.0;

        state.enemyBullets.push({
            x: isVertical()
                ? enemy.x
                : backwards ? enemy.x + 20 : enemy.x - 20,
            y: isVertical()
                ? backwards ? enemy.y - 20 : enemy.y + 20
                : enemy.y,
            vx: Math.cos(baseAngle) * 280 * bulletSpeedMul,
            vy: Math.sin(baseAngle) * 280 * bulletSpeedMul,
            r: 5,
            color: '#fde047',
        });

        enemy.fireTimer = 1.5 + Math.random() * 0.5;
        return;
    }

    // Drone: Standard
    state.enemyBullets.push({
        x: isVertical() ? enemy.x : enemy.x - 32,
        y: isVertical() ? enemy.y + 32 : enemy.y,
        vx: enemyBulletBaseVx(bulletSpeedMul),
        vy: enemyBulletBaseVy(bulletSpeedMul) + (isVertical() ? 0 : Math.sin(enemy.t * 2) * 70 * bulletSpeedMul),
        r: 5,
        color: '#fca5a5',
    });

    enemy.fireTimer = 2.1;
}

// --- Formation Spawning (Katakis-Style, direction-aware) ---

function spawnFormation(speedMul) {
    const formType = state.formationWave % 9;

    switch (formType) {
        case 0: spawnVFormation(speedMul); break;
        case 1: spawnLineFormation(speedMul); break;
        case 2: spawnCircleFormation(speedMul); break;
        case 3: spawnFlankerPair(speedMul); break;
        case 4: spawnKamikazeWave(speedMul); break;
        case 5: spawnSniperTeam(speedMul); break;
        case 6: spawnDerpWave(speedMul); break;
        case 7: spawnWobblePair(speedMul); break;
        case 8: spawnDrunkSquad(speedMul); break;
    }
}

function spawnVFormation(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 5 + Math.floor(state.stageIndex * 0.5);

    // Basisposition: horizontal = Y, vertical = X
    const base = vert
        ? 100 + Math.random() * (CONFIG.width - 200)
        : 100 + Math.random() * (CONFIG.height - 200);

    for (let i = 0; i < count; i++) {
        const row = Math.abs(i - Math.floor(count / 2));
        const offset = i - Math.floor(count / 2);
        state.enemies.push({
            type: 'drone',
            x: vert ? base + offset * 40 : formationSpawnX(row),
            y: vert ? formationSpawnY(0, row * 50) : base + offset * 40,
            baseX: vert ? base + offset * 40 : undefined,
            baseY: vert ? undefined : base + offset * 40,
            w: 52,
            h: 30,
            speed: (170 + Math.random() * 40) * speedMul,
            hp: 2 + Math.floor(state.stageIndex * 0.4) + hpBonus,
            points: 150 + state.stageIndex * 15,
            wave: 28,
            t: Math.random() * 10,
            fireTimer: 2.0 + Math.random() * 0.5,
        });
    }
}

function spawnLineFormation(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 6 + Math.floor(state.stageIndex * 0.3);

    // Bei vertikal: Linie entlang X, spawn oben
    // Bei horizontal: Linie entlang Y, spawn rechts
    const base = vert
        ? 100 + Math.random() * (CONFIG.width - 200)
        : 70 + Math.random() * (CONFIG.height - 140);

    for (let i = 0; i < count; i++) {
        state.enemies.push({
            type: 'drone',
            x: vert ? base : formationSpawnX(i),
            y: vert ? formationSpawnY(0, i * 50) : base,
            baseX: vert ? base : undefined,
            baseY: vert ? undefined : base,
            w: 52,
            h: 30,
            speed: (185 + Math.random() * 30) * speedMul,
            hp: 2 + Math.floor(state.stageIndex * 0.3) + hpBonus,
            points: 150 + state.stageIndex * 12,
            wave: 12,
            t: Math.random() * 10,
            fireTimer: 1.8 + Math.random() * 0.6,
        });
    }
}

function spawnCircleFormation(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const cx = vert ? CONFIG.width / 2 : CONFIG.width + 160;
    const cy = vert ? -160 : CONFIG.height / 2;
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
            baseX: vert ? ex : undefined,
            baseY: vert ? undefined : ey,
            w: i % 3 === 0 ? 76 : 52,
            h: i % 3 === 0 ? 44 : 30,
            speed: (140 + Math.random() * 30) * speedMul,
            hp: (i % 3 === 0 ? 5 + Math.floor(state.stageIndex * 0.8) : 2 + Math.floor(state.stageIndex * 0.4)) + hpBonus,
            points: i % 3 === 0 ? 360 + state.stageIndex * 40 : 150 + state.stageIndex * 15,
            wave: 20,
            t: angle,
            fireTimer: i % 3 === 0 ? 1.3 : 2.0,
        });
    }
}

function spawnFlankerPair(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    // Zwei Flanker kommen von links und rechts (vertikal) oder oben und unten (horizontal)
    for (const dir of [-1, 1]) {
        state.enemies.push({
            type: 'flanker',
            x: vert ? (dir === -1 ? 80 : CONFIG.width - 80) : CONFIG.width + 80,
            y: vert ? -80 : (dir === -1 ? 80 : CONFIG.height - 80),
            baseX: vert ? (dir === -1 ? 80 : CONFIG.width - 80) : undefined,
            baseY: vert ? undefined : (dir === -1 ? 80 : CONFIG.height - 80),
            w: 48,
            h: 32,
            speed: 220 * speedMul,
            hp: 3 + Math.floor(state.stageIndex * 0.5) + hpBonus,
            points: 250 + state.stageIndex * 20,
            wave: 0,
            t: 0,
            fireTimer: 0.8,
            vx: vert ? dir * 160 * speedMul : -200 * speedMul,
            vy: vert ? 200 * speedMul : dir * 160 * speedMul,
        });
    }
}

function spawnKamikazeWave(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 2 + Math.floor(state.stageIndex * 0.3);

    for (let i = 0; i < count; i++) {
        const pos = vert
            ? 100 + Math.random() * (CONFIG.width - 200)
            : 100 + Math.random() * (CONFIG.height - 200);
        state.enemies.push({
            type: 'kamikaze',
            x: vert ? pos : CONFIG.width + 80 + i * 120,
            y: vert ? -80 - i * 120 : pos,
            baseX: vert ? pos : undefined,
            baseY: vert ? undefined : pos,
            w: 36,
            h: 36,
            speed: 0, // Wird durch vx/vy gesteuert
            hp: 1 + Math.floor(state.stageIndex * 0.2) + hpBonus,
            points: 200 + state.stageIndex * 25,
            wave: 0,
            t: 0,
            fireTimer: 999, // Kein Schuss, nur Rammangriff
            vx: vert ? (Math.random() - 0.5) * 80 : -180 * speedMul,
            vy: vert ? 180 * speedMul : (Math.random() - 0.5) * 80, // vertikal: nach unten, werden per Kamikaze-Tracking gelenkt
        });
    }
}

function spawnSniperTeam(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 2 + Math.floor(state.stageIndex * 0.2);

    for (let i = 0; i < count; i++) {
        const pos = vert
            ? 120 + (CONFIG.width - 240) * (i / Math.max(1, count - 1))
            : 120 + (CONFIG.height - 240) * (i / Math.max(1, count - 1));
        state.enemies.push({
            type: 'sniper',
            x: vert ? pos : CONFIG.width + 80,
            y: vert ? -80 : pos,
            baseX: vert ? pos : undefined,
            baseY: vert ? undefined : pos,
            w: 56,
            h: 28,
            speed: (90 + Math.random() * 30) * speedMul,
            hp: 3 + Math.floor(state.stageIndex * 0.6) + hpBonus,
            points: 300 + state.stageIndex * 30,
            wave: 15,
            t: Math.random() * 10,
            fireTimer: 1.0 + Math.random() * 0.5,
        });
    }
}

// --- SILLY/DERPY ENEMY SPAWNERS ---

function spawnDerpWave(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 5 + Math.floor(state.stageIndex * 0.2);
    const base = vert
        ? 80 + Math.random() * (CONFIG.width - 160)
        : 80 + Math.random() * (CONFIG.height - 160);

    for (let i = 0; i < count; i++) {
        const offset = i - Math.floor(count / 2);
        state.enemies.push({
            type: 'derp',
            x: vert ? base + offset * 35 : formationSpawnX(i * 0.8),
            y: vert ? formationSpawnY(0, i * 50) : base + offset * 35,
            baseX: vert ? base + offset * 35 : undefined,
            baseY: vert ? undefined : base + offset * 35,
            w: 44,
            h: 44,
            speed: (120 + Math.random() * 40) * speedMul,
            hp: 1 + hpBonus,
            points: 80 + state.stageIndex * 8,
            wave: 30,
            t: Math.random() * 10,
            fireTimer: 1.5 + Math.random() * 1.0,
        });
    }
}

function spawnWobblePair(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();

    for (let i = 0; i < 2; i++) {
        const pos = vert
            ? 180 + i * (CONFIG.width - 360)
            : 180 + i * (CONFIG.height - 360);
        state.enemies.push({
            type: 'wobble',
            x: vert ? pos : CONFIG.width + 80 + i * 100,
            y: vert ? -80 - i * 100 : pos,
            baseX: vert ? pos : undefined,
            baseY: vert ? undefined : pos,
            w: 64,
            h: 64,
            speed: (70 + Math.random() * 20) * speedMul,
            hp: 4 + Math.floor(state.stageIndex * 0.3) + hpBonus,
            points: 180 + state.stageIndex * 15,
            wave: 40,
            t: Math.random() * 10,
            fireTimer: 999, // Doesn't shoot, contact damage
        });
    }
}

function spawnDrunkSquad(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;
    const vert = isVertical();
    const count = 3 + Math.floor(state.stageIndex * 0.2);
    const base = vert
        ? 120 + Math.random() * (CONFIG.width - 240)
        : 120 + Math.random() * (CONFIG.height - 240);

    for (let i = 0; i < count; i++) {
        const dir = (i % 2 === 0) ? 1 : -1;
        const offset = i - Math.floor(count / 2);
        state.enemies.push({
            type: 'drunk',
            x: vert ? base + offset * 50 : CONFIG.width + 80 + i * 70,
            y: vert ? -80 - i * 70 : base + offset * 50,
            baseX: vert ? base + offset * 50 : undefined,
            baseY: vert ? undefined : base + offset * 50,
            w: 52,
            h: 30,
            speed: (130 + Math.random() * 40) * speedMul,
            hp: 3 + Math.floor(state.stageIndex * 0.4) + hpBonus,
            points: 120 + state.stageIndex * 12,
            wave: 0,
            t: Math.random() * 10,
            fireTimer: 1.2 + Math.random() * 0.8,
            drinkDir: dir,
            drinkDirTimer: 0.4 + Math.random() * 0.6,
        });
    }
}

function spawnSingleEnemy(speedMul) {
    const stage = getStage(state.stageIndex);
    const hpBonus = stage.enemyHpBonus || 0;

    // At higher levels, also spawn derp/drunk/wobble as single enemies
    const mods = getStageModifiers(stage);
    const type = pickEnemyType(stage, state.stageIndex);

    const vert = isVertical();
    const pos = vert
        ? 70 + Math.random() * (CONFIG.width - 140)
        : 70 + Math.random() * (CONFIG.height - 140);

    const enemyData = {
        type,
        x: vert ? pos : CONFIG.width + 80,
        y: vert ? -80 : pos,
        baseX: vert ? pos : undefined,
        baseY: vert ? undefined : pos,
        w: type === 'heavy' ? 76 : type === 'wobble' ? 64 : type === 'derp' ? 44 : 52,
        h: type === 'heavy' ? 44 : type === 'wobble' ? 64 : type === 'derp' ? 44 : 30,

        speed: (
            type === 'heavy'
                ? 125 * mods.heavySpeedBonus
                : type === 'wobble'
                    ? 70
                    : type === 'derp'
                        ? 120
                        : type === 'drunk'
                            ? 130
                            : (190 + Math.random() * 55) * mods.droneSpeedBonus
        ) * speedMul,
        points: type === 'heavy' ? 360 + state.stageIndex * 40 : type === 'wobble' ? 180 + state.stageIndex * 15 : type === 'derp' ? 80 + state.stageIndex * 8 : type === 'drunk' ? 120 + state.stageIndex * 12 : 150 + state.stageIndex * 15,
        wave: type === 'heavy' ? 18 : type === 'wobble' ? 40 : 34,
        t: Math.random() * 10,
    };

    // HP based on type
    if (type === 'heavy') {
        enemyData.hp = 5 + Math.floor(state.stageIndex * 0.8) + hpBonus;
        enemyData.fireTimer = 1.3;
    } else if (type === 'wobble') {
        enemyData.hp = 4 + Math.floor(state.stageIndex * 0.3) + hpBonus;
        enemyData.fireTimer = 999; // Doesn't shoot
    } else if (type === 'derp') {
        enemyData.hp = 1 + hpBonus;
        enemyData.fireTimer = 1.5 + Math.random() * 1.0;
    } else if (type === 'drunk') {
        enemyData.hp = 3 + Math.floor(state.stageIndex * 0.4) + hpBonus;
        enemyData.fireTimer = 1.2 + Math.random() * 0.8;
        enemyData.drinkDir = Math.random() > 0.5 ? 1 : -1;
        enemyData.drinkDirTimer = 0.4 + Math.random() * 0.6;
    } else {
        enemyData.hp = 2 + Math.floor(state.stageIndex * 0.4) + hpBonus;
        enemyData.fireTimer = 2.0;
    }

    state.enemies.push(enemyData);
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

        // Derp: Derpy one-eyed enemy
        if (enemy.type === 'derp') {
            drawDerp(ctx, enemy);
            continue;
        }

        // Wobble: Trembling blob enemy
        if (enemy.type === 'wobble') {
            drawWobble(ctx, enemy);
            continue;
        }

        // Drunk: Drunken zigzag enemy
        if (enemy.type === 'drunk') {
            drawDrunk(ctx, enemy);
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

            // Im vertikalen Modus: Gegner um -90° drehen (nach unten zeigen)
            if (isVertical()) {
                ctx.rotate(-Math.PI / 2);
            }

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

        // Im vertikalen Modus: Gegner um -90° drehen (nach unten zeigen)
        if (isVertical()) {
            ctx.rotate(-Math.PI / 2);
        }

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

    // Ziel-Strahl Richtung Spieler
    ctx.strokeStyle = 'rgba(250, 204, 21, .3)';
    ctx.lineWidth = 1;
    const aimX = state.player.x - enemy.x;
    const aimY = state.player.y - enemy.y;
    const aimLen = Math.hypot(aimX, aimY) || 1;
    ctx.beginPath();
    ctx.moveTo(28 * (aimX / aimLen), 28 * (aimY / aimLen));
    ctx.lineTo(120 * (aimX / aimLen), 120 * (aimY / aimLen));
    ctx.stroke();

    ctx.restore();
}

// --- SILLY/DERPY ENEMY DRAW FUNCTIONS ---

function drawDerp(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Wobble rotation for derpy look
    const wobble = Math.sin(enemy.t * 6) * 0.15;
    ctx.rotate(wobble);

    // Glow
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Big round body
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Giant eye (left, bigger)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-4, -4, 9, 0, Math.PI * 2);
    ctx.fill();

    // Tiny eye (right, smaller)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(10, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils - looking towards player (roughly)
    const lookX = state.player.x > enemy.x ? 1 : -1;
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(-4 + lookX * 3, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(10 + lookX * 2, -2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Dopey mouth
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, 8, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
}

function drawWobble(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Glow
    ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    // Amorphous blob shape with wobbly edges
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI * 2 / segments) * i;
        // Wobbly radius with high-frequency vibration
        const wobbleR = 26 + Math.sin(angle * 3 + enemy.t * 12) * 6 + Math.sin(angle * 5 + enemy.t * 18) * 3;
        const px = Math.cos(angle) * wobbleR;
        const py = Math.sin(angle) * wobbleR;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();

    // Inner blob (lighter)
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI * 2 / segments) * i;
        const wobbleR = 14 + Math.sin(angle * 4 + enemy.t * 15) * 4;
        const px = Math.cos(angle) * wobbleR;
        const py = Math.sin(angle) * wobbleR;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();

    // Tiny dot eyes
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(-6, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Wobbly mouth
    ctx.strokeStyle = '#831843';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.quadraticCurveTo(0, 8 + Math.sin(enemy.t * 10) * 3, 5, 6);
    ctx.stroke();

    ctx.restore();
}

function drawDrunk(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Random tilt for drunk look
    const tilt = Math.sin(enemy.t * 2.5) * 0.3;
    ctx.rotate(tilt);

    // Glow
    ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Standard enemy body shape but yellow-ish
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, -14);
    ctx.lineTo(18, 0);
    ctx.lineTo(24, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Swirly eyes (drunk)
    ctx.fillStyle = '#854d0e';
    const swirl = enemy.t * 3;
    // Left eye
    ctx.beginPath();
    ctx.arc(-8 + Math.cos(swirl) * 2, -4 + Math.sin(swirl) * 2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(4 + Math.cos(swirl + Math.PI) * 2, -4 + Math.sin(swirl + Math.PI) * 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Dizzy mouth
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 5, 5, 0.3 + Math.sin(enemy.t * 4) * 0.3, Math.PI - 0.3 + Math.sin(enemy.t * 4) * 0.3);
    ctx.stroke();

    // Engine glow (sometimes on wrong side - drunk!)
    const wrongSide = Math.sin(enemy.t * 1.5) > 0;
    ctx.fillStyle = '#facc15';
    if (wrongSide) {
        ctx.fillRect(20, -2, 8, 4); // Wrong side
    } else {
        ctx.fillRect(-28, -2, 8, 4); // Right side
    }

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
        } else if (bullet.color === '#86efac') {
            // Derp bullets: green-ish
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#86efac';
        } else if (bullet.color === '#fde047') {
            // Drunk bullets: yellow-ish
            ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
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
