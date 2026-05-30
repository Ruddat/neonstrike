import { CONFIG } from './config.js';
import { state } from './state.js';
import { initInput, pausePressed } from './input.js';
import {
    resetPlayer,
    updatePlayer,
    updateBullets,
    drawPlayer,
} from './player.js';

import {
    resetEnemies,
    updateEnemies,
    drawEnemies,
    drawEnemyBullets,
} from './enemies.js';

import { updateCollisions } from './collisions.js';
import { audio } from './audio.js';
import { getStage } from './stages.js';

import {
    updateBackground,
    drawBackground,
} from './background.js';

import { assets } from './assets.js';

import {
    updatePowerups,
    drawPowerups,
} from './powerups.js';


import {
    updateBoss,
    drawBoss,
    drawBossHud,
} from './boss.js';

import {
    initIntro,
    updateIntro,
    drawIntro,
} from './intro.js';

import {
    updateEffects,
    drawEffects,
} from './effects.js';

import {
    loadHighscore,
    saveHighscoreIfNeeded,
} from './highscore.js';


let introActive = true;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

function resetGame() {
    audio.playIngame();
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.powerups.length = 0;
    state.gameOver = false;
    state.gameOverShown = false;

    state.boss = null;
    state.bossActive = false;
    state.bossWarning = false;
    state.bossWarningTimer = 0;
    state.killsThisStage = 0;
    state.stageIndex = 0;
    state.stageTransition = false;
    state.stageTransitionTimer = 0;
    state.formationTimer = 0;
    state.formationWave = 0;

    // Combo Reset
    state.comboCount = 0;
    state.comboTimer = 0;
    state.comboMultiplier = 1;
    state.maxCombo = 0;

    resetPlayer();
    resetEnemies();

    // Background Cache invalidieren
    backgroundDirty = true;

    overlay.classList.add('is-hidden');
    state.lastTime = performance.now();

    requestAnimationFrame(loop);
}

function loop(time) {
    // Pause-Toggle pruefen
    if (pausePressed) {
        pausePressed = false;
        if (state.running && !state.gameOver) {
            state.paused = !state.paused;
            if (!state.paused) {
                state.lastTime = time;
                backgroundDirty = true;
            }
        }
    }

    const dt = Math.min((time - state.lastTime) / 1000, 0.033);
    state.lastTime = time;

    if (state.running && !state.paused) {
        update(dt);
    }

    render();

    // Pause-Overlay zeichnen
    if (state.paused) {
        drawPauseOverlay();
    }

    if (state.running || state.paused) {
        requestAnimationFrame(loop);
    }

    // Game-Over nur EINMAL anzeigen
    if (state.gameOver && !state.gameOverShown) {
        state.gameOverShown = true;
        showGameOver();
    }
}

function update(dt) {
    updateBackground(dt);
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updatePowerups(dt);
    updateEffects(dt);
    updateCollisions();

    // Combo Timer
    if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
            state.comboCount = 0;
            state.comboMultiplier = 1;
        }
    }

    // Stage Transition
    if (state.stageTransition) {
        state.stageTransitionTimer -= dt;
        if (state.stageTransitionTimer <= 0) {
            state.stageTransition = false;
        }
    }

    if (state.screenFlash > 0) {
        state.screenFlash -= dt * 1.8;
    }

    if (state.screenShake > 0) {
        state.screenShake -= dt * 28;
    }
}


function introLoop(time) {
    if (!introActive) return;

    const dt = 0.016;

    updateIntro(dt);

    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
    drawIntro(ctx, time);

    requestAnimationFrame(introLoop);
}

// --- Background Cache (Offscreen Canvas) ---
let bgCanvas = null;
let bgCtx = null;
let bgStageIndex = -1;
let backgroundDirty = true;

function ensureBgCanvas() {
    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
        bgCanvas.width = CONFIG.width;
        bgCanvas.height = CONFIG.height;
        bgCtx = bgCanvas.getContext('2d');
    }
}

function render() {
    ctx.save();

    const shakeX = (Math.random() - 0.5) * state.screenShake;
    const shakeY = (Math.random() - 0.5) * state.screenShake;

    ctx.translate(shakeX, shakeY);

    // Background: Cache statische Elemente, nur Sterne dynamisch
    drawBackground(ctx);

    // Stage Transition Overlay
    if (state.stageTransition) {
        const alpha = Math.min(1, state.stageTransitionTimer * 0.8);
        ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        if (state.stageTransitionTimer > 1.5) {
            const stage = getStage(state.stageIndex);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 36;
            ctx.shadowColor = '#f97316';
            ctx.fillStyle = '#f97316';
            ctx.font = '900 64px Arial';
            ctx.fillText('STAGE ' + stage.id, CONFIG.width / 2, CONFIG.height / 2 - 30);

            ctx.shadowBlur = 18;
            ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#bae6fd';
            ctx.font = '800 28px Arial';
            ctx.fillText(stage.name.toUpperCase(), CONFIG.width / 2, CONFIG.height / 2 + 30);
            ctx.restore();
        }
    }

    drawHud();
    drawBossHud(ctx);
    drawBullets(ctx);
    drawEnemyBullets(ctx);
    drawEnemies(ctx);
    drawBoss(ctx);
    drawEffects(ctx);
    drawPowerups(ctx);
    drawPlayer(ctx);
    drawFlash();
    ctx.restore();
}

function drawFlash() {
    if (state.screenFlash <= 0) return;

    ctx.save();

    ctx.globalAlpha = state.screenFlash * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.restore();
}


function drawHud() {
    const player = state.player;
    const stage = getStage(state.stageIndex);

    ctx.save();

    // SCORE
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('SCORE', 34, 44);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 24px Arial';
    ctx.fillText(String(state.score).padStart(7, '0'), 34, 76);

    // HI-SCORE
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('HI-SCORE', CONFIG.width - 210, 44);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(String(state.highscore || 0).padStart(7, '0'), CONFIG.width - 210, 76);

    // COMBO (Katakis-Style)
    if (state.comboCount >= 3) {
        ctx.save();
        const pulse = Math.sin(performance.now() * 0.008) * 0.3 + 0.7;
        ctx.shadowBlur = 22 * pulse;
        ctx.shadowColor = '#facc15';
        ctx.fillStyle = '#facc15';
        ctx.font = '900 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('x' + state.comboMultiplier + ' COMBO!', CONFIG.width / 2, 50);
        ctx.fillStyle = '#fef3c7';
        ctx.font = '800 18px Arial';
        ctx.fillText(state.comboCount + ' KILLS', CONFIG.width / 2, 76);
        ctx.restore();
    }

    // LIVES
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVES', 34, 118);

    for (let i = 0; i < player.lives; i++) {
        drawMiniShip(ctx, 48 + i * 34, 145);
    }

    // BOMBS
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('BOMBS', 34, 196);

    for (let i = 0; i < player.bombs; i++) {
        drawBombIcon(ctx, 48 + i * 30, 224);
    }

    // WEAPON LEVEL BAR (Katakis-Style)
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 18px Arial';
    const weaponLabel = String(player.weaponType || 'laser').toUpperCase();
    ctx.fillText('WPN: ' + weaponLabel + ' LV.' + player.weaponLevel, 34, CONFIG.height - 96);

    // Level-Balken
    const maxBars = player.maxWeaponLevel;
    const activeBars = player.weaponLevel;
    for (let i = 0; i < maxBars; i++) {
        const isActive = i < activeBars;
        if (isActive) {
            const levelColor = player.weaponLevel >= 4 ? '#ef4444'
                : player.weaponLevel >= 3 ? '#f97316'
                : '#22c55e';
            ctx.fillStyle = levelColor;
        } else {
            ctx.fillStyle = 'rgba(148,163,184,.28)';
        }
        ctx.fillRect(34 + i * 36, CONFIG.height - 72, 30, 18);
    }

    // Weapon Timer Balken
    if (player.weaponType !== 'laser' && player.weaponTimer > 0) {
        const maxDuration = player.weaponType === 'spread' ? 16
            : player.weaponType === 'plasma' ? 12
            : player.weaponType === 'railgun' ? 8
            : 14;
        const pct = player.weaponTimer / maxDuration;
        const barW = maxBars * 36 - 6;

        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(34, CONFIG.height - 48, barW, 8);

        ctx.fillStyle = pct < 0.25 ? '#ef4444' : '#facc15';
        ctx.fillRect(34, CONFIG.height - 48, barW * pct, 8);
    }

    // SHIELD TIMER
    if (player.shieldTimer > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '800 18px Arial';
        ctx.fillText('SHIELD: ' + player.shieldTimer.toFixed(1) + 's', 34, CONFIG.height - 28);
    }

    // RAPID FIRE TIMER
    if (player.rapidTimer > 0) {
        ctx.fillStyle = '#facc15';
        ctx.font = '800 18px Arial';
        const rapidX = player.shieldTimer > 0 ? 260 : 34;
        ctx.fillText('RAPID: ' + player.rapidTimer.toFixed(1) + 's', rapidX, CONFIG.height - 28);
    }

    // STAGE
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('STAGE ' + stage.id, CONFIG.width - 34, CONFIG.height - 68);

    ctx.fillStyle = 'rgba(248,250,252,.82)';
    ctx.font = '700 16px Arial';
    ctx.fillText(stage.name.toUpperCase(), CONFIG.width - 34, CONFIG.height - 40);

    ctx.restore();
}

function drawMiniShip(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.55, 0.55);

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-7, -5, 13, 10);

    ctx.fillStyle = '#f97316';
    ctx.fillRect(-20, -3, 8, 6);

    ctx.restore();
}

function drawBombIcon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f97316';

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(3, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawPauseOverlay() {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowBlur = 28;
    ctx.shadowColor = '#f97316';
    ctx.fillStyle = '#f97316';
    ctx.font = '900 64px Arial';
    ctx.fillText('PAUSE', CONFIG.width / 2, CONFIG.height / 2 - 30);

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 22px Arial';
    ctx.fillText('P druecken um fortzufahren', CONFIG.width / 2, CONFIG.height / 2 + 30);

    ctx.restore();
}

function showGameOver() {
    const newRecord = saveHighscoreIfNeeded();

    overlay.querySelector('.eyebrow').textContent = newRecord ? 'New Highscore!' : 'Game Over';
    overlay.querySelector('h1').textContent = String(state.score).padStart(7, '0');

    let subtitle = '';
    if (newRecord) {
        subtitle = 'NEUER REKORD! ';
    }
    subtitle += 'Max Combo: x' + state.maxCombo + ' · Druecke Restart';
    overlay.querySelector('.subtitle').textContent = subtitle;

    startButton.textContent = 'Restart';
    overlay.classList.remove('is-hidden');

    audio.stopIngame();
    audio.playMenu();
}


async function boot() {
    initInput(canvas);
    audio.init();
    loadHighscore();

    overlay.classList.add('is-hidden');

    try {
        await assets.loadAll();
    } catch (error) {
        console.error(error);
    }

    startButton.addEventListener('click', resetGame);

    document.addEventListener('click', () => {
        if (introActive) {
            introActive = false;
            overlay.classList.remove('is-hidden');
            render();
            return;
        }

        if (!state.running) {
            audio.playMenu();
        }
    }, { once: false });

    initIntro();
    requestAnimationFrame(introLoop);
}

boot();
