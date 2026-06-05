import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';
import { audio } from './audio.js';
import { maybeDropPowerup } from './powerups.js';
import { assets } from './assets.js';
import { spawnExplosion, spawnDebris } from './effects.js';
import {
    isVertical,
    bossSpawnX, bossSpawnY,
    bossTargetX, bossTargetY,
    bossFlyInX, bossFlyInY,
    bossMinX, bossMaxX, bossMinY, bossMaxY,
    bossBulletX, bossBulletY,
} from './direction.js';

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

    // Einfliegen (richtungabhaengig)
    bossFlyInX(boss, dt);
    bossFlyInY(boss, dt);

    // Phase-basierte Bewegung
    if (boss.phase === 1) {
        // Sanftes Schwingen
        if (isVertical()) {
            boss.x = CONFIG.width / 2 + Math.sin(boss.t * 1.5) * 200;
        } else {
            boss.y = CONFIG.height / 2 + Math.sin(boss.t * 1.5) * 165;
        }
    } else if (boss.phase === 2) {
        // Aggressivere Bewegung + Target Tracking
        if (isVertical()) {
            const targetX = state.player.x;
            boss.x += (targetX - boss.x) * 0.8 * dt;
            boss.x += Math.sin(boss.t * 2.5) * 120 * dt;
            boss.x = Math.max(bossMinX(), Math.min(bossMaxX(), boss.x));
        } else {
            const targetY = state.player.y;
            boss.y += (targetY - boss.y) * 0.8 * dt;
            boss.y += Math.sin(boss.t * 2.5) * 120 * dt;
            boss.y = Math.max(bossMinY(), Math.min(bossMaxY(), boss.y));
        }
    } else if (boss.phase === 3) {
        // Rasante Bewegung + direkte Verfolgung
        if (isVertical()) {
            const targetX = state.player.x;
            boss.x += (targetX - boss.x) * 1.5 * dt;
            boss.x += Math.sin(boss.t * 4) * 80 * dt;
            boss.x = Math.max(bossMinX(), Math.min(bossMaxX(), boss.x));

            // Boss bewegt sich leicht nach oben/unten
            boss.y += Math.sin(boss.t * 1.8) * 60 * dt;
            boss.y = Math.max(bossMinY(), Math.min(bossMaxY(), boss.y));
        } else {
            const targetY = state.player.y;
            boss.y += (targetY - boss.y) * 1.5 * dt;
            boss.y += Math.sin(boss.t * 4) * 80 * dt;
            boss.y = Math.max(bossMinY(), Math.min(bossMaxY(), boss.y));

            // Boss bewegt sich leicht nach links/rechts
            boss.x += Math.sin(boss.t * 1.8) * 60 * dt;
            boss.x = Math.max(bossMinX(), Math.min(bossMaxX(), boss.x));
        }
    }

    // Phase Transitions
    if (boss.hp < boss.maxHp * 0.66 && boss.phase === 1) {
        boss.phase = 2;
        boss.fireTimer = 0.5;
        state.screenFlash = 0.6;
        state.screenShake = 16;
        spawnBossMinions(2);
    }
    if (boss.hp < boss.maxHp * 0.33 && boss.phase === 2) {
        boss.phase = 3;
        boss.fireTimer = 0.3;
        state.screenFlash = 0.8;
        state.screenShake = 22;
        spawnBossMinions(3);
    }

    // Minion-Respawn Timer
    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0 && boss.phase >= 2) {
        const activeMinions = state.enemies.filter(e => e.isMinion).length;
        if (activeMinions < 3 + boss.phase) {
            spawnBossMinions(1);
        }
        boss.minionTimer = 4;
    }

    // Firing
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
        fireBossPattern(boss);
    }

    // Damage Flash
    if (boss.damageFlash > 0) {
        boss.damageFlash -= dt * 4;
    }
}

function spawnBoss() {
    const stage = getStage(state.stageIndex);

    state.bossWarning = false;
    state.bossActive = true;

    const baseHp = 180 + state.stageIndex * 55 + (stage.bossHpBonus || 0);

    state.boss = {
        name: stage.bossName || 'Dread Cruiser',
        x: bossSpawnX(),
        y: bossSpawnY(),
        targetX: bossTargetX(),
        targetY: bossTargetY(),
        w: 260,
        h: 170,
        hp: baseHp,
        maxHp: baseHp,
        phase: 1,
        fireTimer: 1,
        t: 0,
        minionTimer: 5,
        damageFlash: 0,
    };

    state.screenFlash = 0.7;
    state.screenShake = 14;
}

function spawnBossMinions(count) {
    for (let i = 0; i < count; i++) {
        const boss = state.boss;
        const spawnRange = isVertical() ? 200 : 200;
        state.enemies.push({
            type: 'drone',
            x: boss.x + (isVertical() ? (Math.random() - 0.5) * spawnRange : -60 + Math.random() * 120),
            y: boss.y + (isVertical() ? -60 + Math.random() * 120 : (Math.random() - 0.5) * spawnRange),
            baseX: isVertical() ? boss.x + (Math.random() - 0.5) * spawnRange : undefined,
            baseY: isVertical() ? undefined : boss.y + (Math.random() - 0.5) * spawnRange,
            w: 44,
            h: 26,
            speed: 140 + Math.random() * 40,
            hp: 2,
            points: 100,
            wave: 30,
            t: Math.random() * 10,
            fireTimer: 1.5 + Math.random(),
            isMinion: true,
        });
    }
}

function fireBossPattern(boss) {
    const patternVariant = Math.floor(boss.t * 3) % 4;
    const bx = bossBulletX(boss);
    const by = bossBulletY(boss);
    const vert = isVertical();

    if (boss.phase === 1) {
        if (patternVariant === 0) {
            // Facher-Schuss
            for (let i = -2; i <= 2; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 24 : bx,
                    y: vert ? by : by + i * 24,
                    vx: vert ? i * 32 : -340,
                    vy: vert ? 340 : i * 32,
                    r: 7,
                });
            }
            boss.fireTimer = 1.15;
        } else if (patternVariant === 1) {
            // Gezielter Schuss Richtung Spieler
            const dx = state.player.x - bx;
            const dy = state.player.y - by;
            const len = Math.hypot(dx, dy) || 1;
            for (let i = -1; i <= 1; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 30 : bx,
                    y: vert ? by : by + i * 30,
                    vx: (dx / len) * 360 + (vert ? i * 45 : 0),
                    vy: (dy / len) * 360 + (vert ? 0 : i * 45),
                    r: 6,
                });
            }
            boss.fireTimer = 1.3;
        } else if (patternVariant === 2) {
            // Doppelreihe
            for (let i = -3; i <= 3; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 20 + (i % 2 === 0 ? 0 : 40) : bx + (i % 2 === 0 ? 0 : 40),
                    y: vert ? by : by + i * 20 + (i % 2 === 0 ? 0 : 40),
                    vx: vert ? i * 25 : -300,
                    vy: vert ? 300 : i * 25,
                    r: 5,
                });
            }
            boss.fireTimer = 1.0;
        } else {
            // Bogen-Schuss
            for (let i = 0; i < 8; i++) {
                const baseAngle = vert ? 0 : Math.PI * 0.6;
                const spread = vert ? Math.PI * 0.8 : Math.PI * 0.8;
                const angle = baseAngle + (spread / 7) * i;
                state.enemyBullets.push({
                    x: bx,
                    y: by,
                    vx: Math.cos(angle) * 280,
                    vy: Math.sin(angle) * 280 + (vert ? 100 : -100),
                    r: 5,
                });
            }
            boss.fireTimer = 1.2;
        }
        return;
    }

    if (boss.phase === 2) {
        if (patternVariant === 0) {
            // Ring-Schuss
            for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 / 14) * i;
                state.enemyBullets.push({
                    x: bx,
                    y: by,
                    vx: Math.cos(angle) * 230 + (vert ? 0 : -160),
                    vy: Math.sin(angle) * 230 + (vert ? 160 : 0),
                    r: 7,
                });
            }
            state.screenFlash = 0.35;
            state.screenShake = 8;
            boss.fireTimer = 1.65;
        } else if (patternVariant === 1) {
            // Spirale
            const baseAngle = boss.t * 3;
            for (let i = 0; i < 8; i++) {
                const angle = baseAngle + (Math.PI * 2 / 8) * i;
                state.enemyBullets.push({
                    x: bx,
                    y: by,
                    vx: Math.cos(angle) * 260,
                    vy: Math.sin(angle) * 260,
                    r: 6,
                });
            }
            state.screenFlash = 0.25;
            boss.fireTimer = 0.7;
        } else if (patternVariant === 2) {
            // Aimed Burst + Random
            const dx = state.player.x - bx;
            const dy = state.player.y - by;
            const len = Math.hypot(dx, dy) || 1;
            for (let i = 0; i < 6; i++) {
                const spread = (Math.random() - 0.5) * 80;
                state.enemyBullets.push({
                    x: vert ? bx + (Math.random() - 0.5) * 60 : bx,
                    y: vert ? by : by + (Math.random() - 0.5) * 60,
                    vx: (dx / len) * 350 + spread,
                    vy: (dy / len) * 350 + spread,
                    r: 5,
                });
            }
            boss.fireTimer = 0.9;
        } else {
            // Wall Pattern
            const wallPos = vert ? state.player.x : state.player.y;
            for (let i = -8; i <= 8; i++) {
                state.enemyBullets.push({
                    x: vert ? wallPos + i * 28 : bx + Math.abs(i) * 25,
                    y: vert ? by + Math.abs(i) * 25 : wallPos + i * 28,
                    vx: vert ? 0 : -260,
                    vy: vert ? 260 : 0,
                    r: 6,
                });
            }
            boss.fireTimer = 1.5;
        }
        return;
    }

    if (boss.phase === 3) {
        if (patternVariant === 0) {
            // Breite Salve
            for (let i = -6; i <= 6; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 42 : bx,
                    y: vert ? by : by + i * 42,
                    vx: vert ? i * 42 : -430,
                    vy: vert ? 430 : i * 42,
                    r: 8,
                });
            }
            state.screenFlash = 0.5;
            state.screenShake = 14;
            boss.fireTimer = 0.85;
        } else if (patternVariant === 1) {
            // Zielverfolgende Geschosse + Facher
            const dx = state.player.x - bx;
            const dy = state.player.y - by;
            const len = Math.hypot(dx, dy) || 1;
            for (let i = -1; i <= 1; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 40 : bx,
                    y: vert ? by : by + i * 40,
                    vx: (dx / len) * 380 + (vert ? i * 30 : 0),
                    vy: (dy / len) * 380 + (vert ? 0 : i * 30),
                    r: 9,
                    homing: true,
                    homingTimer: 1.0,
                });
            }
            for (let i = -3; i <= 3; i++) {
                state.enemyBullets.push({
                    x: vert ? bx + i * 30 : bx,
                    y: vert ? by : by + i * 30,
                    vx: vert ? i * 55 : -360,
                    vy: vert ? 360 : i * 55,
                    r: 6,
                });
            }
            state.screenFlash = 0.4;
            state.screenShake = 12;
            boss.fireTimer = 1.1;
        } else if (patternVariant === 2) {
            // Doppel-Ring rotiert
            for (let ring = 0; ring < 2; ring++) {
                const offset = ring * (Math.PI / 10);
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI * 2 / 10) * i + offset + boss.t;
                    state.enemyBullets.push({
                        x: bx,
                        y: by,
                        vx: Math.cos(angle) * (250 + ring * 50),
                        vy: Math.sin(angle) * (250 + ring * 50),
                        r: 6,
                    });
                }
            }
            state.screenFlash = 0.3;
            state.screenShake = 10;
            boss.fireTimer = 1.3;
        } else {
            // CROSS PATTERN - Kreuzfoermiger Angriff
            for (let i = 0; i < 5; i++) {
                // Hauptachse
                state.enemyBullets.push({
                    x: bx,
                    y: by,
                    vx: vert ? 0 : -420 - i * 30,
                    vy: vert ? 420 + i * 30 : 0,
                    r: 7,
                });
                // Querachse
                state.enemyBullets.push({
                    x: bx,
                    y: by,
                    vx: vert ? -200 : -200,
                    vy: vert ? (i - 2) * 120 : (i - 2) * 120,
                    r: 6,
                    homing: true,
                    homingTimer: 0.6,
                });
            }
            state.screenFlash = 0.45;
            state.screenShake = 16;
            boss.fireTimer = 1.0;
        }
    }
}

export function damageBoss(amount) {
    if (!state.boss) return false;

    state.boss.hp -= amount;
    state.boss.damageFlash = 1;
    state.screenShake = Math.max(state.screenShake, 4);

    // Debris bei Boss-Treffer
    spawnDebris(state.boss.x - 60 + Math.random() * 80, state.boss.y + (Math.random() - 0.5) * 100, 0.5);

    if (state.boss.hp <= 0) {
        killBoss();
        audio.stopBoss();
        return true;
    }

    return false;
}

function killBoss() {
    state.score += 5000 + state.stageIndex * 1000;

    // Epische Boss-Kill-Sequenz
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            spawnExplosion(
                state.boss ? state.boss.x + (Math.random() - 0.5) * 200 : CONFIG.width / 2,
                state.boss ? state.boss.y + (Math.random() - 0.5) * 150 : CONFIG.height / 2,
                2 + Math.random()
            );
        }, i * 200);
    }

    // Boss loeschen
    state.boss = null;
    state.bossActive = false;
    state.bossWarning = false;
    state.bossWarningTimer = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.killsThisStage = 0;

    // Check for victory at level 99
    if (state.stageIndex >= 98) {
        state.victory = true;
        state.running = false;
        state.screenFlash = 1;
        state.screenShake = 30;
        audio.stopBoss();
        return;
    }

    // Hyperspace Jump zum naechsten Level starten
    state.hyperspaceJump = true;
    state.hyperspaceTimer = 3.5;
    state.warpStars = [];

    state.screenFlash = 1;
    state.screenShake = 30;
    audio.stopBoss();

    // Grosse Powerup-Drops nach Boss-Kill
    for (let i = 0; i < 4; i++) {
        maybeDropPowerup(
            CONFIG.width / 2 + (i - 1.5) * 80,
            CONFIG.height / 2
        );
    }
    // Garantiertes Weapon-Up!
    state.powerups.push({
        x: CONFIG.width / 2,
        y: CONFIG.height / 2 + 60,
        type: 'weaponUp',
        speed: 80,
        r: 22,
        t: 0,
    });

    // Garantierte Bombe nach Boss-Kill!
    state.player.bombs = Math.min(state.player.bombs + 1, state.player.maxBombs);

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

    // Im vertikalen Modus: Boss um -90° drehen (nach unten zeigen)
    if (isVertical()) {
        ctx.rotate(-Math.PI / 2);
    }

    // Damage Flash Effect
    if (boss.damageFlash > 0) {
        ctx.globalAlpha = 0.6 + boss.damageFlash * 0.4;
    }

    const frameIndex = frames.length
        ? Math.floor(boss.t * 8) % frames.length
        : 0;

    const sprite = frames[frameIndex];

    if (sprite) {
        const width = boss.phase === 3 ? 540 : 512;
        const height = boss.phase === 3 ? 202 : 192;

        // Glow via semi-transparente Form statt shadowBlur
        const glowColor = boss.phase === 3 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.1)';
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, width * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

        // Damage Flash Overlay
        if (boss.damageFlash > 0.5) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = (boss.damageFlash - 0.5) * 0.5;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        return;
    }

    // Fallback, falls Sprites fehlen
    const pulse = Math.sin(boss.t * 6) * 0.5 + 0.5;

    // Glow statt shadowBlur
    const glowColor = boss.phase === 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.12)';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 160 + pulse * 20, 0, Math.PI * 2);
    ctx.fill();

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

    // Phase-spezifische Details
    ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#f97316';
    ctx.fillRect(-70, -16, 120, 32);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-124, -44, 24, 88);

    // Phase 3: Extra Kanonen
    if (boss.phase === 3) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-140, -60, 16, 24);
        ctx.fillRect(-140, 36, 16, 24);
    }

    // Damage Flash
    if (boss.damageFlash > 0.5) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = (boss.damageFlash - 0.5) * 0.4;
        ctx.fillRect(-150, -80, 280, 160);
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
}

export function drawBossHud(ctx) {
    if (state.bossWarning) {
        ctx.save();

        const flash = Math.floor(performance.now() / 180) % 2 === 0;
        ctx.textAlign = 'center';

        ctx.shadowBlur = 0;
        ctx.fillStyle = flash ? '#ef4444' : '#facc15';
        ctx.font = '900 46px Arial';
        ctx.fillText('WARNING', CONFIG.width / 2, 120);

        ctx.shadowBlur = 0;
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

    // HP Bar Background
    ctx.fillStyle = 'rgba(15,23,42,.82)';
    ctx.fillRect(x, y, barWidth, barHeight);

    // HP Bar Fill
    const hpPct = boss.hp / boss.maxHp;
    const barColor = boss.phase === 3 ? '#ef4444' : boss.phase === 2 ? '#f97316' : '#facc15';
    ctx.fillStyle = barColor;
    ctx.fillRect(x + 3, y + 3, (barWidth - 6) * hpPct, barHeight - 6);

    // Low HP Pulse
    if (hpPct < 0.25) {
        const pulse = Math.sin(performance.now() * 0.01) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.fillRect(x + 3, y + 3, (barWidth - 6) * hpPct, barHeight - 6);
    }

    // Border
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Boss Name + Phase
    ctx.textAlign = 'center';
    ctx.font = '800 18px Arial';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(boss.name.toUpperCase() + ' \u00B7 PHASE ' + boss.phase, CONFIG.width / 2, y + 48);

    ctx.restore();
}
