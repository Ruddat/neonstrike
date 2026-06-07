import { CONFIG } from './config.js';
import { state } from './state.js';

let seenBoss = null;
let lastBossHp = 0;
let bossHitFlash = 0;
let bossHitPulse = 0;
let phaseBannerTimer = 0;
let lastPhase = 0;
let deathBurstTimer = 0;
let deathBurstX = CONFIG.width / 2;
let deathBurstY = CONFIG.height / 2;
let previousBossActive = false;

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function phaseColor(phase) {
    if (phase >= 3) return '#ef4444';
    if (phase === 2) return '#f97316';
    return '#facc15';
}

function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function syncBossState() {
    const boss = state.boss;

    if (!boss) {
        if (previousBossActive && !state.bossActive) {
            deathBurstTimer = 1.25;
        }
        seenBoss = null;
        previousBossActive = false;
        return null;
    }

    previousBossActive = true;

    if (seenBoss !== boss) {
        seenBoss = boss;
        lastBossHp = boss.hp;
        lastPhase = boss.phase;
        phaseBannerTimer = 1.1;
        bossHitFlash = 0;
        bossHitPulse = 0;
        deathBurstX = boss.x;
        deathBurstY = boss.y;
        return boss;
    }

    if (boss.phase !== lastPhase) {
        lastPhase = boss.phase;
        phaseBannerTimer = 1.3;
        bossHitFlash = 1.25;
        bossHitPulse = 1;
    }

    if (boss.hp < lastBossHp) {
        const damage = Math.max(1, lastBossHp - boss.hp);
        bossHitFlash = Math.min(1.4, 0.75 + damage * 0.025);
        bossHitPulse = 1;
        deathBurstX = boss.x;
        deathBurstY = boss.y;
    }

    lastBossHp = boss.hp;
    return boss;
}

function tickPolishTimers() {
    bossHitFlash = Math.max(0, bossHitFlash - 0.07);
    bossHitPulse = Math.max(0, bossHitPulse - 0.09);
    phaseBannerTimer = Math.max(0, phaseBannerTimer - 0.018);
    deathBurstTimer = Math.max(0, deathBurstTimer - 0.022);
}

function tagBossBullets() {
    if (!state.bossActive && !state.bossWarning) return;

    for (const bullet of state.enemyBullets) {
        if (bullet._bossPolished) continue;

        if (bullet.homing) {
            bullet.color = '#ff2bd6';
        } else if ((bullet.r || 0) >= 8) {
            bullet.color = '#ef4444';
        } else if ((bullet.r || 0) >= 6) {
            bullet.color = '#f97316';
        }

        bullet._bossPolished = true;
    }
}

function drawBossHitFlash(ctx, boss, time) {
    if (!boss || bossHitFlash <= 0) return;

    const pulse = 0.5 + Math.sin(time * 0.035) * 0.5;
    const alpha = Math.min(0.72, bossHitFlash * 0.55);
    const scale = 1 + bossHitPulse * 0.16;
    const color = phaseColor(boss.phase);

    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.w * 1.05 * scale, boss.h * 0.88 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = boss.phase >= 3
        ? `rgba(239, 68, 68, ${Math.min(0.95, bossHitFlash)})`
        : `rgba(249, 115, 22, ${Math.min(0.9, bossHitFlash)})`;
    ctx.lineWidth = 4 + pulse * 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.w * 1.12 * scale, boss.h * 0.94 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + time * 0.002;
        const inner = boss.w * 0.36;
        const outer = boss.w * 0.58 + pulse * 18;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.55);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.55);
        ctx.stroke();
    }

    ctx.restore();
}

function drawBossHudV2(ctx, boss, time) {
    if (!boss) return;

    const hpPct = clamp01(boss.hp / boss.maxHp);
    const barW = 700;
    const barH = 28;
    const x = CONFIG.width / 2 - barW / 2;
    const y = 18;
    const color = phaseColor(boss.phase);
    const pulse = 0.5 + Math.sin(time * 0.012) * 0.5;

    ctx.save();

    roundRectPath(ctx, x - 18, y - 10, barW + 36, 72, 18);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fill();
    ctx.strokeStyle = boss.phase >= 3 ? 'rgba(239, 68, 68, .75)' : 'rgba(249, 115, 22, .55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, .96)';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = 'rgba(148, 163, 184, .22)';
    ctx.fillRect(x + 4, y + 4, barW - 8, barH - 8);

    ctx.fillStyle = color;
    ctx.fillRect(x + 4, y + 4, (barW - 8) * hpPct, barH - 8);

    if (hpPct < 0.25 || boss.phase >= 3) {
        ctx.fillStyle = `rgba(255, 43, 214, ${0.16 + pulse * 0.2})`;
        ctx.fillRect(x + 4, y + 4, (barW - 8) * hpPct, barH - 8);
    }

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.fillRect(x + 4, y + 4, Math.max(0, (barW - 8) * hpPct), 5);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '900 17px Arial';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${boss.name.toUpperCase()}  //  PHASE ${boss.phase}`, CONFIG.width / 2, y + 36);

    ctx.font = '800 11px Arial';
    ctx.fillStyle = color;
    ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, CONFIG.width / 2, y + 56);

    if (phaseBannerTimer > 0) {
        const alpha = clamp01(phaseBannerTimer);
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 44px Arial';
        ctx.fillStyle = boss.phase >= 3 ? '#ef4444' : '#f97316';
        ctx.fillText(boss.phase >= 3 ? 'FINAL WARNING' : `PHASE ${boss.phase}`, CONFIG.width / 2, CONFIG.height * 0.28);
        ctx.font = '900 18px Arial';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('BOSS SYSTEM ESCALATION', CONFIG.width / 2, CONFIG.height * 0.28 + 38);
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawBossWarningV2(ctx, time) {
    if (!state.bossWarning) return;

    const timer = Math.max(0, state.bossWarningTimer || 0);
    const blink = Math.floor(time / 115) % 2 === 0;
    const pulse = 0.5 + Math.sin(time * 0.018) * 0.5;
    const warningAlpha = 0.20 + pulse * 0.16;

    ctx.save();

    ctx.fillStyle = `rgba(239, 68, 68, ${warningAlpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.strokeStyle = blink ? 'rgba(239, 68, 68, .88)' : 'rgba(250, 204, 21, .78)';
    ctx.lineWidth = 8;
    ctx.strokeRect(28, 28, CONFIG.width - 56, CONFIG.height - 56);

    ctx.strokeStyle = 'rgba(255,255,255,.20)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const y = 78 + i * 72;
        ctx.beginPath();
        ctx.moveTo(54, y);
        ctx.lineTo(CONFIG.width - 54, y);
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 78px Arial';
    ctx.fillStyle = blink ? '#ef4444' : '#facc15';
    ctx.fillText('WARNING', CONFIG.width / 2, CONFIG.height / 2 - 52);

    ctx.font = '900 34px Arial';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('BOSS INCOMING', CONFIG.width / 2, CONFIG.height / 2 + 10);

    ctx.font = '900 20px Arial';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText(`LOCKING TARGET  ${timer.toFixed(1)}s`, CONFIG.width / 2, CONFIG.height / 2 + 52);

    ctx.restore();
}

function drawDeathBurst(ctx, time) {
    if (deathBurstTimer <= 0) return;

    const alpha = clamp01(deathBurstTimer);
    const radius = (1.25 - deathBurstTimer) * 520;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(255, 43, 214, ${0.12 * alpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.strokeStyle = `rgba(249, 115, 22, ${0.8 * alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(deathBurstX, deathBurstY, Math.max(20, radius), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(248, 250, 252, ${0.55 * alpha})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14 + time * 0.002;
        ctx.beginPath();
        ctx.moveTo(deathBurstX, deathBurstY);
        ctx.lineTo(deathBurstX + Math.cos(angle) * radius * 0.75, deathBurstY + Math.sin(angle) * radius * 0.75);
        ctx.stroke();
    }

    ctx.restore();
}

export function applyBossPolish(ctx, time = performance.now()) {
    const boss = syncBossState();
    tickPolishTimers();
    tagBossBullets();

    drawBossWarningV2(ctx, time);
    drawDeathBurst(ctx, time);
    drawBossHitFlash(ctx, boss, time);
    drawBossHudV2(ctx, boss, time);
}
