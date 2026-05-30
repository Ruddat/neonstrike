import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';
import { audio } from './audio.js';
import { maybeDropPowerup } from './powerups.js';
import { assets } from './assets.js';
import { spawnExplosion } from './effects.js';

export function startBossWarning() {
    if (state.bossActive || state.bossWarning) return;
    audio.playSfx('bossWarning');
    state.bossWarning = true;
    state.bossWarningTimer = 3.2;
    state.screenFlash = 1;
    state.screenShake = 18;
    audio.playBoss();
}

export function updateBoss(dt) {
    if (state.bossWarning) {
        state.bossWarningTimer -= dt;

        if (state.bossWarningTimer <= 0) {
            spawnBoss();
        }

        return;
    }

    if (!state.boss) return;

    const boss = state.boss;

    boss.t += dt;

    if (boss.x > boss.targetX) {
        boss.x -= 130 * dt;
    }

    boss.y = CONFIG.height / 2 + Math.sin(boss.t * 1.5) * 165;

    if (boss.hp < boss.maxHp * 0.66) boss.phase = 2;
    if (boss.hp < boss.maxHp * 0.33) boss.phase = 3;

    boss.fireTimer -= dt;

    if (boss.fireTimer <= 0) {
        fireBossPattern(boss);
    }
}

function spawnBoss() {
    const stage = getStage(state.stageIndex);

    state.bossWarning = false;
    state.bossActive = true;

    state.boss = {
        name: stage.bossName || 'Dread Cruiser',
        x: CONFIG.width + 230,
        y: CONFIG.height / 2,
        targetX: CONFIG.width - 220,
        w: 260,
        h: 170,
        hp: 180 + state.stageIndex * 55,
        maxHp: 180 + state.stageIndex * 55,
        phase: 1,
        fireTimer: 1,
        t: 0,
    };

    state.screenFlash = 0.7;
    state.screenShake = 14;
}

function fireBossPattern(boss) {
    // Zufaellige Mustervariation fuer mehr Abwechslung
    const patternVariant = Math.floor(boss.t * 3) % 3;

    if (boss.phase === 1) {
        if (patternVariant === 0) {
            // Standard: Facher-Schuss
            for (let i = -2; i <= 2; i++) {
                state.enemyBullets.push({
                    x: boss.x - 120,
                    y: boss.y + i * 24,
                    vx: -340,
                    vy: i * 32,
                    r: 7,
                });
            }
            boss.fireTimer = 1.15;
        } else if (patternVariant === 1) {
            // Gezielter Schuss Richtung Spieler
            const dx = state.player.x - (boss.x - 120);
            const dy = state.player.y - boss.y;
            const len = Math.hypot(dx, dy) || 1;
            for (let i = -1; i <= 1; i++) {
                state.enemyBullets.push({
                    x: boss.x - 120,
                    y: boss.y + i * 30,
                    vx: (dx / len) * 360,
                    vy: (dy / len) * 360 + i * 45,
                    r: 6,
                });
            }
            boss.fireTimer = 1.3;
        } else {
            // Doppelreihe
            for (let i = -3; i <= 3; i++) {
                state.enemyBullets.push({
                    x: boss.x - 120 + (i % 2 === 0 ? 0 : 40),
                    y: boss.y + i * 20,
                    vx: -300,
                    vy: i * 25,
                    r: 5,
                });
            }
            boss.fireTimer = 1.0;
        }
        return;
    }

    if (boss.phase === 2) {
        if (patternVariant === 0) {
            // Ring-Schuss (original)
            for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 / 14) * i;
                state.enemyBullets.push({
                    x: boss.x - 110,
                    y: boss.y,
                    vx: Math.cos(angle) * 230 - 160,
                    vy: Math.sin(angle) * 230,
                    r: 7,
                });
            }
            state.screenFlash = 0.35;
            state.screenShake = 8;
            boss.fireTimer = 1.65;
        } else {
            // Spirale
            const baseAngle = boss.t * 3;
            for (let i = 0; i < 8; i++) {
                const angle = baseAngle + (Math.PI * 2 / 8) * i;
                state.enemyBullets.push({
                    x: boss.x - 110,
                    y: boss.y,
                    vx: Math.cos(angle) * 260,
                    vy: Math.sin(angle) * 260,
                    r: 6,
                });
            }
            state.screenFlash = 0.25;
            boss.fireTimer = 0.7;
        }
        return;
    }

    if (boss.phase === 3) {
        if (patternVariant === 0) {
            // Breite Salve (original)
            for (let i = -6; i <= 6; i++) {
                state.enemyBullets.push({
                    x: boss.x - 120,
                    y: boss.y,
                    vx: -430,
                    vy: i * 42,
                    r: 8,
                });
            }
            state.screenFlash = 0.5;
            state.screenShake = 14;
            boss.fireTimer = 0.85;
        } else if (patternVariant === 1) {
            // Zielverfolgende Geschosse + Facher
            const dx = state.player.x - (boss.x - 120);
            const dy = state.player.y - boss.y;
            const len = Math.hypot(dx, dy) || 1;
            // 3 zielsuchende
            for (let i = -1; i <= 1; i++) {
                state.enemyBullets.push({
                    x: boss.x - 120,
                    y: boss.y + i * 40,
                    vx: (dx / len) * 380,
                    vy: (dy / len) * 380 + i * 30,
                    r: 9,
                    homing: true,
                    homingTimer: 0.8,
                });
            }
            // + Facher
            for (let i = -3; i <= 3; i++) {
                state.enemyBullets.push({
                    x: boss.x - 100,
                    y: boss.y + i * 30,
                    vx: -360,
                    vy: i * 55,
                    r: 6,
                });
            }
            state.screenFlash = 0.4;
            state.screenShake = 12;
            boss.fireTimer = 1.1;
        } else {
            // Doppel-Ring rotiert
            for (let ring = 0; ring < 2; ring++) {
                const offset = ring * (Math.PI / 10);
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI * 2 / 10) * i + offset + boss.t;
                    state.enemyBullets.push({
                        x: boss.x - 110,
                        y: boss.y,
                        vx: Math.cos(angle) * (250 + ring * 50),
                        vy: Math.sin(angle) * (250 + ring * 50),
                        r: 6,
                    });
                }
            }
            state.screenFlash = 0.3;
            state.screenShake = 10;
            boss.fireTimer = 1.3;
        }
    }
}

export function damageBoss(amount) {
    if (!state.boss) return false;

    state.boss.hp -= amount;
    state.screenShake = Math.max(state.screenShake, 4);

    if (state.boss.hp <= 0) {
        killBoss();
        audio.stopBoss();
        return true;
    }

    return false;
}

function killBoss() {
    state.score += 5000 + state.stageIndex * 1000;

    spawnExplosion(state.boss.x, state.boss.y, 3.2);
    state.boss = null;
    state.bossActive = false;
    state.bossWarning = false;
    state.bossWarningTimer = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.killsThisStage = 0;

    state.stageIndex++;

    state.screenFlash = 1;
    state.screenShake = 30;
    audio.stopBoss();
    for (let i = 0; i < 3; i++) {
        maybeDropPowerup(
            CONFIG.width / 2 + i * 60,
            CONFIG.height / 2 + (i - 1) * 40
        );
    }
    audio.playIngame();
}

export function drawBoss(ctx) {
    if (!state.boss) return;

    const boss = state.boss;

    const frames = [
        assets.get('boss01'),
        assets.get('boss02'),
        assets.get('boss03'),
        assets.get('boss04'),
    ].filter(Boolean);

    ctx.save();
    ctx.translate(boss.x, boss.y);

    const frameIndex = frames.length
        ? Math.floor(boss.t * 8) % frames.length
        : 0;

    const sprite = frames[frameIndex];

    if (sprite) {
        const width = boss.phase === 3 ? 540 : 512;
        const height = boss.phase === 3 ? 202 : 192;

        ctx.shadowBlur = boss.phase === 3 ? 34 : 24;
        ctx.shadowColor = boss.phase === 3 ? '#ef4444' : '#f97316';

        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

        ctx.restore();
        return;
    }

    // Fallback, falls Sprites fehlen
    const pulse = Math.sin(boss.t * 6) * 0.5 + 0.5;

    ctx.shadowBlur = 22 + pulse * 24;
    ctx.shadowColor = boss.phase === 3 ? '#ef4444' : '#f97316';

    ctx.fillStyle = boss.phase === 3 ? '#7f1d1d' : '#475569';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(-130, -78);
    ctx.lineTo(120, -45);
    ctx.lineTo(92, 0);
    ctx.lineTo(120, 45);
    ctx.lineTo(-130, 78);
    ctx.lineTo(-72, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.fillRect(-70, -16, 120, 32);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-124, -44, 24, 88);

    ctx.restore();
}

export function drawBossHud(ctx) {
    if (state.bossWarning) {
        ctx.save();

        ctx.textAlign = 'center';
        ctx.font = '900 46px Arial';
        ctx.fillStyle = Math.floor(performance.now() / 180) % 2 === 0 ? '#ef4444' : '#facc15';
        ctx.fillText('WARNING', CONFIG.width / 2, 120);

        ctx.font = '800 24px Arial';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('BOSS INCOMING', CONFIG.width / 2, 158);

        ctx.restore();
        return;
    }

    if (!state.boss) return;

    const boss = state.boss;
    const barWidth = 560;
    const barHeight = 24;
    const x = CONFIG.width / 2 - barWidth / 2;
    const y = 26;

    ctx.save();

    ctx.fillStyle = 'rgba(15,23,42,.82)';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#f97316';
    ctx.fillRect(x + 3, y + 3, (barWidth - 6) * (boss.hp / boss.maxHp), barHeight - 6);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.textAlign = 'center';
    ctx.font = '800 18px Arial';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(boss.name.toUpperCase() + ' · PHASE ' + boss.phase, CONFIG.width / 2, y + 48);

    ctx.restore();
}