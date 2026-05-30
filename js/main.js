import { CONFIG } from './config.js';
import { state } from './state.js';
import { initInput } from './input.js';
import {
    resetPlayer,
    updatePlayer,
    updateBullets,
    drawPlayer,
    drawBullets,
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

const newRecord = saveHighscoreIfNeeded();
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

    state.boss = null;
    state.bossActive = false;
    state.bossWarning = false;
    state.bossWarningTimer = 0;
    state.killsThisStage = 0;
    state.stageIndex = 0;

    resetPlayer();
    resetEnemies();

    overlay.classList.add('is-hidden');
    state.lastTime = performance.now();

    requestAnimationFrame(loop);
}

function loop(time) {
    if (state.paused) return;

    const dt = Math.min((time - state.lastTime) / 1000, 0.033);
    state.lastTime = time;

    if (state.running) {
        update(dt);
    }

    render();

    if (state.running) {
        requestAnimationFrame(loop);
    }

    if (state.gameOver) {
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

function render() {

    ctx.save();

    const shakeX = (Math.random() - 0.5) * state.screenShake;
    const shakeY = (Math.random() - 0.5) * state.screenShake;

    ctx.translate(shakeX, shakeY);


    drawBackground(ctx);
    drawHud();
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

    // LIVES
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('LIVES', 34, 118);

    for (let i = 0; i < player.lives; i++) {
        drawMiniShip(ctx, 48 + i * 34, 145);
    }

    // BOMBS
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('BOMBS', 34, 196);

    for (let i = 0; i < player.bombs; i++) {
        drawBombIcon(ctx, 48 + i * 30, 224);
    }

    // POWER BAR
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('POWER', 34, CONFIG.height - 96);

    const maxBars = 10;
    const activeBars = player.weaponType === 'laser' ? 4 : 8;

    for (let i = 0; i < maxBars; i++) {
        ctx.fillStyle = i < activeBars ? '#22c55e' : 'rgba(148,163,184,.28)';
        ctx.fillRect(34 + i * 18, CONFIG.height - 72, 14, 18);
    }

    ctx.strokeStyle = 'rgba(186,230,253,.45)';
    ctx.strokeRect(34, CONFIG.height - 72, maxBars * 18 - 4, 18);

    // WEAPON
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 18px Arial';
    ctx.fillText('WEAPON: ' + String(player.weaponType || 'laser').toUpperCase(), 34, CONFIG.height - 28);

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

function showGameOver() {
const newRecord = saveHighscoreIfNeeded();

overlay.querySelector('.eyebrow').textContent = newRecord ? 'New Highscore' : 'Game Over';
overlay.querySelector('h1').textContent = String(state.score).padStart(7, '0');
overlay.querySelector('.subtitle').textContent = newRecord
    ? 'Neuer Rekord gespeichert. Drücke Start Game für einen neuen Versuch.'
    : 'Drücke Start Game für einen neuen Versuch.';
    const stage = getStage(state.stageIndex);
    overlay.querySelector('.subtitle').textContent = 'Drücke Start Game für einen neuen Versuch.';
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