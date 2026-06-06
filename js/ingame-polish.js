import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';
import { isVertical } from './direction.js';

const canvas = document.getElementById('game');
const ctx = canvas?.getContext('2d');

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
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

function drawPanel(x, y, w, h, alpha = 0.62) {
    ctx.save();

    roundRectPath(ctx, x, y, w, h, 14);
    ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(x + 1, y + 1, w - 2, 18);

    ctx.restore();
}

function label(text, x, y, align = 'left', size = 15, color = '#38bdf8') {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px Arial`;
    ctx.fillText(text, x, y);
}

function value(text, x, y, align = 'left', size = 22, color = '#f8fafc') {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px Arial`;
    ctx.fillText(text, x, y);
}

function segmentBar(x, y, count, active, w, h, gap, activeColor, inactiveColor = 'rgba(148,163,184,.24)') {
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = i < active ? activeColor : inactiveColor;
        ctx.fillRect(x + i * (w + gap), y, w, h);
    }
}

function dotRow(x, y, count, active, activeColor, inactiveColor = 'rgba(148,163,184,.25)') {
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = i < active ? activeColor : inactiveColor;
        ctx.beginPath();
        ctx.arc(x + i * 25, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = i < active ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.arc(x + i * 25 - 2, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function tagEnemyBullets() {
    for (const bullet of state.enemyBullets) {
        if (bullet._polished) continue;

        // Heavy Triple-Shots haben r >= 6 und keine eigene Farbe.
        // Dadurch werden sie klar rot statt wie normale grüne Kugeln.
        if (!bullet.color && bullet.r >= 6) {
            bullet.color = '#fca5a5';
        }

        bullet._polished = true;
    }
}

function drawPlayerReadabilityRing(time) {
    const player = state.player;
    const pulse = 0.5 + Math.sin(time * 0.008) * 0.5;
    const alpha = player.invulnerable > 0 ? 0.45 + pulse * 0.25 : 0.22;

    ctx.save();
    ctx.translate(player.x, player.y);

    if (isVertical()) {
        ctx.rotate(-Math.PI / 2);
    }

    ctx.fillStyle = `rgba(56, 189, 248, ${0.06 + pulse * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, player.w * 0.95, player.h * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, player.w * 0.78, player.h * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (player.shieldTimer > 0) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, player.w * 1.08, player.h * 1.25, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawCleanHud() {
    const player = state.player;
    const stage = getStage(state.stageIndex);
    const wavePct = state.waveKillsNeeded > 0
        ? clamp01(state.waveKills / state.waveKillsNeeded)
        : 0;

    ctx.save();

    // Altes linkes HUD optisch überdecken und sauber neu zeichnen
    drawPanel(22, 18, 236, 180, 0.70);

    label('SCORE', 42, 34);
    value(String(state.score).padStart(7, '0'), 42, 56);

    label('LIVES', 42, 90);
    segmentBar(112, 94, 5, player.lives, 22, 10, 6, '#22c55e');

    label('BOMBS', 42, 124);
    dotRow(117, 132, player.maxBombs || 5, player.bombs, '#f97316');

    label('NEXT', 42, 158, 'left', 12, '#94a3b8');
    segmentBar(
        92,
        160,
        player.maxBombFragments || 3,
        player.bombFragments || 0,
        18,
        10,
        5,
        '#facc15'
    );

    // Weapon Block unten links
    drawPanel(22, CONFIG.height - 116, 300, 82, 0.64);

    const weaponLabel = String(player.weaponType || 'laser').toUpperCase();
    label(`WPN: ${weaponLabel}  LV.${player.weaponLevel}`, 42, CONFIG.height - 98, 'left', 16);

    const wpnColor = player.weaponLevel >= 4
        ? '#ef4444'
        : player.weaponLevel >= 3
            ? '#f97316'
            : '#22c55e';

    segmentBar(
        42,
        CONFIG.height - 66,
        player.maxWeaponLevel || 5,
        player.weaponLevel || 1,
        34,
        16,
        8,
        wpnColor
    );

    // Wave mittig oben größer und lesbarer
    if (!state.bossActive && !state.bossWarning) {
        drawPanel(CONFIG.width / 2 - 98, 16, 196, 48, 0.56);

        const waveColor = state.overdrive ? '#f97316' : '#38bdf8';

        label(
            `WAVE ${state.currentWave} / ${state.totalWaves}`,
            CONFIG.width / 2,
            24,
            'center',
            15,
            waveColor
        );

        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.fillRect(CONFIG.width / 2 - 70, 48, 140, 6);

        ctx.fillStyle = waveColor;
        ctx.fillRect(CONFIG.width / 2 - 70, 48, 140 * wavePct, 6);
    }

    // Highscore rechts oben dezenter
    drawPanel(CONFIG.width - 250, 18, 206, 68, 0.50);

    label('HI-SCORE', CONFIG.width - 62, 34, 'right', 15);
    value(
        String(state.highscore || 0).padStart(7, '0'),
        CONFIG.width - 62,
        56,
        'right',
        20,
        'rgba(248,250,252,.9)'
    );

    // Level rechts unten
    drawPanel(CONFIG.width - 278, CONFIG.height - 118, 234, 82, 0.54);

    label(`LEVEL ${stage.level}/99`, CONFIG.width - 62, CONFIG.height - 98, 'right', 20);
    value(stage.name.toUpperCase(), CONFIG.width - 62, CONFIG.height - 66, 'right', 14, 'rgba(248,250,252,.82)');

    if (isVertical()) {
        label('VERTICAL SCROLL', CONFIG.width - 62, CONFIG.height - 42, 'right', 12, '#ef4444');
    }

    ctx.restore();
}

function polishLoop(time) {
    requestAnimationFrame(polishLoop);

    if (!ctx) return;
    if (!state.running) return;
    if (state.nameEntry || state.gameOver || state.victory) return;

    tagEnemyBullets();
    drawPlayerReadabilityRing(time);
    drawCleanHud();
}

if (ctx) {
    requestAnimationFrame(polishLoop);
}