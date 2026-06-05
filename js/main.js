import { CONFIG } from './config.js';
import { state } from './state.js';
import { initInput, consumePause, consumeFullscreen, touch, getTouchButtons, isMobile } from './input.js';
import { isVertical } from './direction.js';
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
import { getStage, getScrollDirection } from './stages.js';
import { isVertical as checkVertical } from './direction.js';

import {
    updateBackground,
    drawBackground,
    resetBgImageScroll,
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
    addHighscoreEntry,
} from './highscore.js';


let introActive = true;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const fsButton = document.getElementById('fullscreenBtn');
let highscoreButton = null; // Wird in boot() gesetzt

// ===================== FULLSCREEN =====================
export function toggleFullscreen() {
    const shell = document.querySelector('.game-shell');
    if (!document.fullscreenElement) {
        shell.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// Fullscreen-Change Styling
document.addEventListener('fullscreenchange', () => {
    const shell = document.querySelector('.game-shell');
    if (document.fullscreenElement) {
        shell.style.width = '100vw';
        shell.style.height = '100vh';
        shell.style.borderRadius = '0';
        shell.style.border = 'none';
    } else {
        shell.style.width = '';
        shell.style.height = '';
        shell.style.borderRadius = '';
        shell.style.border = '';
    }
});

if (fsButton) {
    fsButton.addEventListener('click', toggleFullscreen);
}

// ===================== BOMB FRAGMENT REWARD =====================
export function addBombFragment() {
    const player = state.player;
    player.bombFragments++;
    if (player.bombFragments >= player.maxBombFragments) {
        player.bombFragments = 0;
        player.bombs = Math.min(player.bombs + 1, player.maxBombs);
        // Feedback wenn neue Bombe fertig
        state.screenFlash = Math.max(state.screenFlash, 0.2);
    }
}

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
    state.victory = false;
    state.nameEntry = false;
    state.nameChars = ['A', 'A', 'A'];
    state.nameCursor = 0;
    state.pendingHighscore = null;

    state.boss = null;
    state.bossActive = false;
    state.bossWarning = false;
    state.bossWarningTimer = 0;
    state.killsThisStage = 0;
    state.killsForBoss = 25;
    state.stageIndex = 0;
    state.stageTransition = false;
    state.stageTransitionTimer = 0;
    state.directionChange = false;
    state.directionChangeTimer = 0;
    state.prevScrollDirection = 'horizontal';
    state.hyperspaceJump = false;
    state.hyperspaceTimer = 0;
    state.warpStars.length = 0;
    state.formationTimer = 0;
    state.formationWave = 0;

    // Scroll-Richtung aus Stage setzen
    const initialStage = getStage(0);
    state.scrollDirection = initialStage.scrollDirection || 'horizontal';

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
    // Fullscreen-Toggle pruefen
    if (consumeFullscreen()) {
        toggleFullscreen();
    }

    // Name entry input handling
    if (state.nameEntry) {
        handleNameEntryInput();
    }

    // Pause-Toggle pruefen
    if (consumePause()) {
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

    // Name entry overlay
    if (state.nameEntry) {
        drawNameEntryOverlay();
    }

    if (state.running || state.paused || state.nameEntry) {
        requestAnimationFrame(loop);
    }

    // Game-Over nur EINMAL anzeigen
    if (state.gameOver && !state.gameOverShown) {
        state.gameOverShown = true;
        showGameOver();
    }

    // Victory: show once
    if (state.victory && !state.gameOverShown) {
        state.gameOverShown = true;
        showVictory();
    }
}

function update(dt) {
    updateBackground(dt);
    updatePlayer(dt);
    updateBullets(dt);

    // Waehrend Hyperspace-Jump: keine Gegner/Boss/Kollisionen
    if (!state.hyperspaceJump) {
        updateEnemies(dt);
        updateBoss(dt);
        updateCollisions();
    }

    updatePowerups(dt);
    updateEffects(dt);

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

    // Hyperspace Jump
    if (state.hyperspaceJump) {
        state.hyperspaceTimer -= dt;
        updateWarpStars(dt);
        // Spieler wackelt beim Warp
        state.player.shakeTimer = 0.05;
        if (state.hyperspaceTimer <= 0) {
            state.hyperspaceJump = false;
            state.warpStars.length = 0;
            state.stageIndex++;
            // Scroll-Richtung aus neuer Stage setzen
            const nextStage = getStage(state.stageIndex);
            const newDirection = nextStage.scrollDirection || 'horizontal';
            const prevDirection = state.scrollDirection;

            // Richtungswechsel erkennen
            if (prevDirection !== newDirection) {
                state.directionChange = true;
                state.directionChangeTimer = 2.5;
                state.prevScrollDirection = prevDirection;
            }

            state.scrollDirection = newDirection;
            // Hintergrund-Bild-Scroll zuruecksetzen
            resetBgImageScroll();
            // Richtungsabhaengige Musik schalten
            audio.switchToLevelMusic(newDirection === 'vertical');
            // Spieler-Repositionierung bei Richtungswechsel
            if (newDirection === 'vertical') {
                state.player.x = CONFIG.width / 2;
                state.player.y = CONFIG.height - 80;
            } else {
                state.player.x = 120;
                state.player.y = CONFIG.height / 2;
            }
            // Boss braucht spaeter mehr Kills - more aggressive scaling at higher levels
            state.killsForBoss = Math.min(60, state.killsForBoss + 3 + Math.floor(state.stageIndex * 0.2));
            state.stageTransition = true;
            state.stageTransitionTimer = 3.0;
            backgroundDirty = true;
        }
    }

    // Direction Change Timer
    if (state.directionChange) {
        state.directionChangeTimer -= dt;
        if (state.directionChangeTimer <= 0) {
            state.directionChange = false;
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

    // Background: Multi-Layer Parallax
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
            // Glow via dickerer Text statt shadowBlur
            ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
            ctx.font = '900 68px Arial';
            ctx.fillText('LEVEL ' + stage.level + '/99', CONFIG.width / 2, CONFIG.height / 2 - 30);

            ctx.fillStyle = '#f97316';
            ctx.font = '900 64px Arial';
            ctx.fillText('LEVEL ' + stage.level + '/99', CONFIG.width / 2, CONFIG.height / 2 - 30);

            ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.font = '800 30px Arial';
            ctx.fillText(stage.name.toUpperCase(), CONFIG.width / 2, CONFIG.height / 2 + 30);

            ctx.fillStyle = '#bae6fd';
            ctx.font = '800 28px Arial';
            ctx.fillText(stage.name.toUpperCase(), CONFIG.width / 2, CONFIG.height / 2 + 30);

            // Scroll-Modus Anzeige bei vertikalen Levels
            if (stage.scrollDirection === 'vertical') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.font = '800 22px Arial';
                ctx.fillText('VERTICAL SCROLL — 1945 STYLE', CONFIG.width / 2, CONFIG.height / 2 + 65);

                ctx.fillStyle = '#ef4444';
                ctx.font = '800 20px Arial';
                ctx.fillText('VERTICAL SCROLL — 1945 STYLE', CONFIG.width / 2, CONFIG.height / 2 + 65);
            }
            ctx.restore();
        }
    }

    // Direction Change Transition Overlay
    if (state.directionChange) {
        drawDirectionChangeOverlay(ctx);
    }

    // Victory overlay on canvas
    if (state.victory && !state.nameEntry) {
        drawVictoryOverlay();
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

    // Hyperspace Warp Effect (ueber alles)
    if (state.hyperspaceJump) {
        drawHyperspaceEffect(ctx);
    }

    drawFlash();

    // Touch-Controls zeichnen (nur auf Touch-Geraeten)
    if (touch.active) {
        drawTouchControls(ctx);
    }

    ctx.restore();
}

// ===================== VICTORY OVERLAY =====================
function drawVictoryOverlay() {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // YOU WIN!
    ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
    ctx.font = '900 88px Arial';
    ctx.fillText('YOU WIN!', CONFIG.width / 2, CONFIG.height / 2 - 80);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 84px Arial';
    ctx.fillText('YOU WIN!', CONFIG.width / 2, CONFIG.height / 2 - 80);

    // Score
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 36px Arial';
    ctx.fillText('SCORE: ' + String(state.score).padStart(7, '0'), CONFIG.width / 2, CONFIG.height / 2 - 10);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 22px Arial';
    ctx.fillText('Level 99 erreicht! Max Combo: x' + state.maxCombo, CONFIG.width / 2, CONFIG.height / 2 + 30);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 18px Arial';
    ctx.fillText('Druecke ENTER fuer Highscore-Eintrag', CONFIG.width / 2, CONFIG.height / 2 + 70);

    ctx.restore();
}

// ===================== NAME ENTRY =====================
function handleNameEntryInput() {
    // Handled via keydown event listener below
}

// Name entry key handler - set up separately
let nameEntryKeyListener = null;

function startNameEntry() {
    state.nameEntry = true;
    state.nameChars = ['A', 'A', 'A'];
    state.nameCursor = 0;

    if (nameEntryKeyListener) {
        document.removeEventListener('keydown', nameEntryKeyListener);
    }

    nameEntryKeyListener = (e) => {
        if (!state.nameEntry) {
            document.removeEventListener('keydown', nameEntryKeyListener);
            nameEntryKeyListener = null;
            return;
        }

        e.preventDefault();

        if (e.key === 'ArrowUp') {
            // Increase current letter
            const code = state.nameChars[state.nameCursor].charCodeAt(0);
            const next = code >= 90 ? 65 : code + 1;
            state.nameChars[state.nameCursor] = String.fromCharCode(next);
        } else if (e.key === 'ArrowDown') {
            // Decrease current letter
            const code = state.nameChars[state.nameCursor].charCodeAt(0);
            const prev = code <= 65 ? 90 : code - 1;
            state.nameChars[state.nameCursor] = String.fromCharCode(prev);
        } else if (e.key === 'ArrowLeft') {
            state.nameCursor = Math.max(0, state.nameCursor - 1);
        } else if (e.key === 'ArrowRight') {
            state.nameCursor = Math.min(2, state.nameCursor + 1);
        } else if (e.key === 'Enter') {
            confirmNameEntry();
        }
    };

    document.addEventListener('keydown', nameEntryKeyListener);
}

function confirmNameEntry() {
    if (state.pendingHighscore) {
        state.pendingHighscore.name = state.nameChars.join('');
        addHighscoreEntry(state.pendingHighscore);
        state.pendingHighscore = null;
    }
    state.nameEntry = false;

    if (nameEntryKeyListener) {
        document.removeEventListener('keydown', nameEntryKeyListener);
        nameEntryKeyListener = null;
    }

    // Show highscore table
    showHighscoreTable();
}

function drawNameEntryOverlay() {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.fillStyle = '#facc15';
    ctx.font = '900 48px Arial';
    ctx.fillText('HIGHSCORE!', CONFIG.width / 2, CONFIG.height / 2 - 120);

    // Score
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 28px Arial';
    ctx.fillText('SCORE: ' + String(state.score).padStart(7, '0'), CONFIG.width / 2, CONFIG.height / 2 - 70);

    // Name entry boxes
    const boxWidth = 72;
    const boxHeight = 80;
    const gap = 20;
    const totalWidth = boxWidth * 3 + gap * 2;
    const startX = CONFIG.width / 2 - totalWidth / 2;
    const boxY = CONFIG.height / 2 - 20;

    for (let i = 0; i < 3; i++) {
        const bx = startX + i * (boxWidth + gap);
        const isActive = i === state.nameCursor;

        // Box background
        ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.8)';
        ctx.fillRect(bx, boxY, boxWidth, boxHeight);

        // Box border
        ctx.strokeStyle = isActive ? '#38bdf8' : '#475569';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(bx, boxY, boxWidth, boxHeight);

        // Letter
        ctx.fillStyle = isActive ? '#facc15' : '#f8fafc';
        ctx.font = '900 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.nameChars[i], bx + boxWidth / 2, boxY + boxHeight / 2);

        // Up/Down arrows
        if (isActive) {
            // Up arrow
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(bx + boxWidth / 2, boxY - 18);
            ctx.lineTo(bx + boxWidth / 2 - 12, boxY - 4);
            ctx.lineTo(bx + boxWidth / 2 + 12, boxY - 4);
            ctx.closePath();
            ctx.fill();

            // Down arrow
            ctx.beginPath();
            ctx.moveTo(bx + boxWidth / 2, boxY + boxHeight + 18);
            ctx.lineTo(bx + boxWidth / 2 - 12, boxY + boxHeight + 4);
            ctx.lineTo(bx + boxWidth / 2 + 12, boxY + boxHeight + 4);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Instructions
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pfeiltasten: Buchstabe waehlen · ENTER: Bestaetigen', CONFIG.width / 2, boxY + boxHeight + 60);

    ctx.restore();
}

// ===================== HIGHSCORE TABLE =====================
function showHighscoreTable() {
    const tableContainer = document.getElementById('highscoreTable');
    if (!tableContainer) return;

    // Build table content
    let html = '<h2 style="color: #facc15; font-size: 28px; margin: 0 0 16px; letter-spacing: 0.1em;">TOP 10 HIGHSCORES</h2>';
    html += '<table class="hs-table">';
    html += '<thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th><th>Combo</th><th>Datum</th></tr></thead>';
    html += '<tbody>';

    if (state.highscores.length === 0) {
        html += '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">Noch keine Eintraege</td></tr>';
    } else {
        for (let i = 0; i < state.highscores.length; i++) {
            const entry = state.highscores[i];
            const isTop = i === 0;
            const rowClass = isTop ? 'hs-row-top' : '';
            html += `<tr class="${rowClass}">`;
            html += `<td class="hs-rank">${i + 1}</td>`;
            html += `<td class="hs-name">${entry.name || '---'}</td>`;
            html += `<td class="hs-score">${String(entry.score).padStart(7, '0')}</td>`;
            html += `<td class="hs-level">${entry.level || '-'}</td>`;
            html += `<td class="hs-combo">x${entry.combo || 0}</td>`;
            html += `<td class="hs-date">${entry.date || '-'}</td>`;
            html += '</tr>';
        }
    }

    html += '</tbody></table>';

    tableContainer.innerHTML = html;
    tableContainer.classList.remove('is-hidden');

    // Hide after a few seconds or on key press
    const dismissHandler = () => {
        tableContainer.classList.add('is-hidden');
        document.removeEventListener('keydown', dismissHandler);
        document.removeEventListener('click', dismissHandler);

        // Show restart overlay
        overlay.querySelector('.eyebrow').textContent = state.victory ? 'Sieg!' : 'Game Over';
        overlay.querySelector('h1').textContent = String(state.score).padStart(7, '0');
        overlay.querySelector('.subtitle').textContent = 'Max Combo: x' + state.maxCombo + ' · Druecke Restart';
        startButton.textContent = 'Restart';
        overlay.classList.remove('is-hidden');

        audio.stopIngame();
        audio.stopVertical();
        audio.playMenu();
    };

    // Auto-dismiss after 8 seconds
    setTimeout(dismissHandler, 8000);
    document.addEventListener('keydown', dismissHandler, { once: true });
    document.addEventListener('click', dismissHandler, { once: true });
}

// ===================== HYPERSPACE WARP =====================
function initWarpStars() {
    state.warpStars = [];
    for (let i = 0; i < 150; i++) {
        state.warpStars.push({
            angle: Math.random() * Math.PI * 2,
            distance: Math.random() * 40,
            speed: 180 + Math.random() * 500,
            length: 0,
            brightness: 0.3 + Math.random() * 0.7,
            hue: Math.random() > 0.7 ? '#facc15' : Math.random() > 0.5 ? '#f97316' : '#38bdf8',
        });
    }
}

function updateWarpStars(dt) {
    // Warp-Stars beim ersten Aufruf initialisieren
    if (state.warpStars.length === 0) {
        initWarpStars();
    }

    const progress = 1 - (state.hyperspaceTimer / 3.5);
    const maxDist = Math.max(CONFIG.width, CONFIG.height) * 0.9;

    for (const star of state.warpStars) {
        star.distance += star.speed * dt * (1 + progress * 4);
        star.length = 8 + star.distance * (0.2 + progress * 1.2);

        if (star.distance > maxDist) {
            star.distance = Math.random() * 20;
            star.angle = Math.random() * Math.PI * 2;
            star.speed = 180 + Math.random() * 500;
        }
    }
}

function drawHyperspaceEffect(ctx) {
    const progress = 1 - (state.hyperspaceTimer / 3.5);
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;

    ctx.save();

    // Dunkles Overlay mit Blau-Stich
    const overlayAlpha = 0.3 + progress * 0.4;
    ctx.fillStyle = `rgba(2, 6, 23, ${overlayAlpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Warp-Streaks (Sternenstreifen vom Zentrum nach aussen)
    for (const star of state.warpStars) {
        const x1 = cx + Math.cos(star.angle) * star.distance;
        const y1 = cy + Math.sin(star.angle) * star.distance;
        const x2 = cx + Math.cos(star.angle) * (star.distance + star.length);
        const y2 = cy + Math.sin(star.angle) * (star.distance + star.length);

        const alpha = star.brightness * Math.min(1, progress * 2.5);

        ctx.strokeStyle = star.hue;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1 + progress * 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Zentraler Glow
    const glowR = 60 + progress * 250;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    gradient.addColorStop(0, `rgba(56, 189, 248, ${0.4 * progress})`);
    gradient.addColorStop(0.3, `rgba(56, 189, 248, ${0.15 * progress})`);
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Rand-Vignette (Tunnel-Effekt)
    const vignette = ctx.createRadialGradient(cx, cy, CONFIG.height * 0.2, cx, cy, CONFIG.height * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(2, 6, 23, ${0.5 + progress * 0.4})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // HYPERSPACE Text (ohne shadowBlur)
    if (progress > 0.2 && progress < 0.88) {
        const textIn = Math.min(1, (progress - 0.2) * 4);
        const textOut = progress > 0.75 ? 1 - (progress - 0.75) / 0.13 : 1;
        const textAlpha = Math.min(textIn, textOut);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow via breiterer Text dahinter
        ctx.fillStyle = `rgba(56, 189, 248, ${textAlpha * 0.3})`;
        ctx.font = '900 60px Arial';
        ctx.fillText('HYPERSPACE', cx, cy - 35);

        ctx.fillStyle = `rgba(56, 189, 248, ${textAlpha})`;
        ctx.font = '900 56px Arial';
        ctx.fillText('HYPERSPACE', cx, cy - 35);

        // Naechste Stage Info
        if (state.stageIndex + 1 < state.maxLevel) {
            const nextStage = getStage(state.stageIndex + 1);
            ctx.fillStyle = `rgba(249, 115, 22, ${textAlpha * 0.3})`;
            ctx.font = '800 28px Arial';
            ctx.fillText('NEXT: LEVEL ' + nextStage.level + '/99 — ' + nextStage.name.toUpperCase(), cx, cy + 25);

            ctx.fillStyle = `rgba(249, 115, 22, ${textAlpha * 0.9})`;
            ctx.font = '800 26px Arial';
            ctx.fillText('NEXT: LEVEL ' + nextStage.level + '/99 — ' + nextStage.name.toUpperCase(), cx, cy + 25);
        }
    }

    // Weisser Flash am Ende des Warps
    if (progress > 0.88) {
        const flashAlpha = ((progress - 0.88) / 0.12) * 0.85;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    ctx.restore();
}

// ===================== TOUCH CONTROLS =====================
function drawTouchControls(ctx) {
    const { fireBtn, bombBtn, pauseBtn } = getTouchButtons();

    ctx.save();

    // === Virtueller Joystick ===
    if (touch.joyActive) {
        // Aussenring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(touch.joyOriginX, touch.joyOriginY, 90, 0, Math.PI * 2);
        ctx.stroke();

        // Knopf
        const knobX = touch.joyOriginX + touch.joyX * 90;
        const knobY = touch.joyOriginY + touch.joyY * 90;

        const knobGradient = ctx.createRadialGradient(knobX, knobY, 0, knobX, knobY, 36);
        knobGradient.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        knobGradient.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
        ctx.fillStyle = knobGradient;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Inaktiver Joystick-Hinweis (links)
        const hintX = 110;
        const hintY = CONFIG.height - 110;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hintX, hintY, 70, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.arc(hintX, hintY, 70, 0, Math.PI * 2);
        ctx.fill();

        // Pfeil-Hinweis
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.font = '700 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', hintX, hintY);
    }

    // === Feuer-Button ===
    const fireGradient = ctx.createRadialGradient(fireBtn.x, fireBtn.y, 0, fireBtn.x, fireBtn.y, fireBtn.r);
    if (touch.fire) {
        fireGradient.addColorStop(0, 'rgba(249, 115, 22, 0.7)');
        fireGradient.addColorStop(1, 'rgba(249, 115, 22, 0.25)');
    } else {
        fireGradient.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
        fireGradient.addColorStop(1, 'rgba(249, 115, 22, 0.1)');
    }
    ctx.fillStyle = fireGradient;
    ctx.beginPath();
    ctx.arc(fireBtn.x, fireBtn.y, fireBtn.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = touch.fire ? 'rgba(249, 115, 22, 0.8)' : 'rgba(249, 115, 22, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fireBtn.x, fireBtn.y, fireBtn.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = touch.fire ? '#fff' : 'rgba(249, 115, 22, 0.9)';
    ctx.font = '900 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', fireBtn.x, fireBtn.y);

    // === Bomben-Button ===
    const bombGradient = ctx.createRadialGradient(bombBtn.x, bombBtn.y, 0, bombBtn.x, bombBtn.y, bombBtn.r);
    if (touch.bomb) {
        bombGradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        bombGradient.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
    } else {
        bombGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        bombGradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
    }
    ctx.fillStyle = bombGradient;
    ctx.beginPath();
    ctx.arc(bombBtn.x, bombBtn.y, bombBtn.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = touch.bomb ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bombBtn.x, bombBtn.y, bombBtn.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = touch.bomb ? '#fff' : 'rgba(239, 68, 68, 0.9)';
    ctx.font = '900 18px Arial';
    ctx.fillText('BOMB', bombBtn.x, bombBtn.y);

    // Bomben-Anzahl neben dem Button
    ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.font = '800 16px Arial';
    ctx.fillText('x' + state.player.bombs, bombBtn.x, bombBtn.y + bombBtn.r + 18);

    // === Pause-Button ===
    ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.arc(pauseBtn.x, pauseBtn.y, pauseBtn.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pauseBtn.x, pauseBtn.y, pauseBtn.r, 0, Math.PI * 2);
    ctx.stroke();

    // Pause-Icon (zwei Balken)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.fillRect(pauseBtn.x - 7, pauseBtn.y - 8, 5, 16);
    ctx.fillRect(pauseBtn.x + 2, pauseBtn.y - 8, 5, 16);

    ctx.restore();
}

// ===================== DIRECTION CHANGE OVERLAY =====================
function drawDirectionChangeOverlay(ctx) {
    const t = state.directionChangeTimer;
    const maxT = 2.5;
    const progress = 1 - (t / maxT); // 0→1

    ctx.save();

    // Dunkles Overlay
    const overlayAlpha = t > 2.0 ? (2.5 - t) / 0.5  // Fade in
        : t < 0.5 ? t / 0.5                            // Fade out
        : 1;
    ctx.fillStyle = `rgba(2, 6, 23, ${0.8 * overlayAlpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;

    // Rotierender Pfeil-Effekt
    const isNowVertical = state.scrollDirection === 'vertical';
    const arrowAngle = isNowVertical ? 0 : -Math.PI / 2; // Pfeil zeigt nach unten (vertical) oder nach rechts (horizontal)
    const rotProgress = Math.min(1, progress * 2.5); // Schnelle Rotation am Anfang
    const currentAngle = arrowAngle * rotProgress + (isNowVertical ? -Math.PI / 2 : 0) * (1 - rotProgress);

    // Glow-Kreis
    const glowR = 80 + Math.sin(progress * Math.PI * 4) * 20;
    const gradient = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy - 30, glowR);
    gradient.addColorStop(0, `rgba(56, 189, 248, ${0.3 * overlayAlpha})`);
    gradient.addColorStop(0.5, `rgba(56, 189, 248, ${0.1 * overlayAlpha})`);
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy - 30, glowR, 0, Math.PI * 2);
    ctx.fill();

    // DREHENDER PFEIL
    ctx.save();
    ctx.translate(cx, cy - 30);
    ctx.rotate(currentAngle + Math.sin(progress * Math.PI * 6) * 0.15 * (1 - rotProgress));
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.9 * overlayAlpha})`;
    ctx.lineWidth = 4;
    ctx.fillStyle = `rgba(56, 189, 248, ${0.8 * overlayAlpha})`;

    // Pfeil-Körper
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();

    // Pfeil-Spitze
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(18, -12);
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // DIRECTION CHANGE Text
    const titleAlpha = overlayAlpha;
    ctx.fillStyle = `rgba(249, 115, 22, ${0.3 * titleAlpha})`;
    ctx.font = '900 56px Arial';
    ctx.fillText('DIRECTION CHANGE', cx, cy + 55);

    ctx.fillStyle = `rgba(249, 115, 22, ${titleAlpha})`;
    ctx.font = '900 52px Arial';
    ctx.fillText('DIRECTION CHANGE', cx, cy + 55);

    // Neue Richtung anzeigen
    const dirLabel = isNowVertical ? 'VERTICAL SCROLL — 1945 STYLE' : 'HORIZONTAL SCROLL — SIDESCROLLER';
    const dirColor = isNowVertical ? '#ef4444' : '#38bdf8';

    ctx.fillStyle = `rgba(${isNowVertical ? '239, 68, 68' : '56, 189, 248'}, ${0.3 * titleAlpha})`;
    ctx.font = '800 28px Arial';
    ctx.fillText(dirLabel, cx, cy + 100);

    ctx.fillStyle = dirColor;
    ctx.globalAlpha = titleAlpha;
    ctx.font = '800 26px Arial';
    ctx.fillText(dirLabel, cx, cy + 100);
    ctx.globalAlpha = 1;

    // Scan-Linien Effekt
    if (progress < 0.6) {
        const scanAlpha = (1 - progress / 0.6) * 0.15;
        for (let y = 0; y < CONFIG.height; y += 4) {
            ctx.fillStyle = `rgba(56, 189, 248, ${scanAlpha})`;
            ctx.fillRect(0, y, CONFIG.width, 1);
        }
    }

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

    // COMBO (Katakis-Style) — ohne shadowBlur
    if (state.comboCount >= 3) {
        ctx.save();
        // Glow via breiterer Text dahinter
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.font = '900 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('x' + state.comboMultiplier + ' COMBO!', CONFIG.width / 2, 50);

        ctx.fillStyle = '#facc15';
        ctx.font = '900 32px Arial';
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

    // BOMBS + Fragment Bar
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('BOMBS', 34, 196);

    for (let i = 0; i < player.bombs; i++) {
        drawBombIcon(ctx, 48 + i * 30, 224);
    }

    // Bomb Fragment Fortschritt
    if (player.bombFragments > 0) {
        const fragX = 48 + player.bombs * 30 + 8;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 14px Arial';
        ctx.fillText('NEXT:', fragX, 218);

        // Fragment-Balken
        for (let i = 0; i < player.maxBombFragments; i++) {
            const filled = i < player.bombFragments;
            ctx.fillStyle = filled ? '#f97316' : 'rgba(148,163,184,.25)';
            ctx.fillRect(fragX + i * 16, 224, 12, 12);
        }
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

    // LEVEL X/99
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('LEVEL ' + stage.level + '/99', CONFIG.width - 34, CONFIG.height - 68);

    ctx.fillStyle = 'rgba(248,250,252,.82)';
    ctx.font = '700 16px Arial';
    ctx.fillText(stage.name.toUpperCase(), CONFIG.width - 34, CONFIG.height - 40);

    // Scroll-Modus Anzeige (vertikal)
    if (isVertical()) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '700 13px Arial';
        ctx.fillText('VERTICAL SCROLL', CONFIG.width - 34, CONFIG.height - 22);
    }

    // FULLSCREEN HINT (nur Desktop)
    if (!touch.active) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(148,163,184,.4)';
        ctx.font = '700 12px Arial';
        ctx.fillText('F = Fullscreen', CONFIG.width - 34, 20);
    }

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

    // Glow via semi-transparente Form statt shadowBlur
    ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(3, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPauseOverlay() {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow via dickerer Text statt shadowBlur
    ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
    ctx.font = '900 68px Arial';
    ctx.fillText('PAUSE', CONFIG.width / 2, CONFIG.height / 2 - 30);

    ctx.fillStyle = '#f97316';
    ctx.font = '900 64px Arial';
    ctx.fillText('PAUSE', CONFIG.width / 2, CONFIG.height / 2 - 30);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 22px Arial';
    ctx.fillText(touch.active ? 'Tap Pause um fortzufahren' : 'P druecken um fortzufahren', CONFIG.width / 2, CONFIG.height / 2 + 30);

    ctx.restore();
}

function showGameOver() {
    const entry = saveHighscoreIfNeeded();

    if (entry) {
        // Score qualifies for top 10 - show name entry
        state.pendingHighscore = entry;
        startNameEntry();
        requestAnimationFrame(loop);
    } else {
        // No highscore - show standard game over
        overlay.querySelector('.eyebrow').textContent = 'Game Over';
        overlay.querySelector('h1').textContent = String(state.score).padStart(7, '0');

        let subtitle = 'Max Combo: x' + state.maxCombo + ' · Druecke Restart';
        overlay.querySelector('.subtitle').textContent = subtitle;

        startButton.textContent = 'Restart';
        overlay.classList.remove('is-hidden');

        audio.stopIngame();
        audio.stopVertical();
        audio.playMenu();
    }
}

function showVictory() {
    const entry = saveHighscoreIfNeeded();

    if (entry) {
        // Score qualifies for top 10 - show name entry
        state.pendingHighscore = entry;
        startNameEntry();
        requestAnimationFrame(loop);
    } else {
        // No highscore - show victory overlay directly
        overlay.querySelector('.eyebrow').textContent = 'Sieg!';
        overlay.querySelector('h1').textContent = String(state.score).padStart(7, '0');

        let subtitle = 'Level 99 erreicht! Max Combo: x' + state.maxCombo + ' · Druecke Restart';
        overlay.querySelector('.subtitle').textContent = subtitle;

        startButton.textContent = 'Restart';
        overlay.classList.remove('is-hidden');

        audio.stopIngame();
        audio.stopVertical();
        audio.playMenu();
    }
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

    // Highscore button handler
    highscoreButton = document.getElementById('highscoreButton');
    if (highscoreButton) {
        highscoreButton.addEventListener('click', () => {
            showHighscoreTableFromMenu();
        });
    }

    // Victory name entry - listen for Enter key to start name entry
    document.addEventListener('keydown', (e) => {
        if (state.victory && !state.nameEntry && !state.gameOver && e.key === 'Enter') {
            const entry = saveHighscoreIfNeeded();
            if (entry) {
                state.pendingHighscore = entry;
                startNameEntry();
                requestAnimationFrame(loop);
            } else {
                // Just show highscore table
                showHighscoreTable();
            }
        }
    });

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

function showHighscoreTableFromMenu() {
    const tableContainer = document.getElementById('highscoreTable');
    if (!tableContainer) return;

    let html = '<h2 style="color: #facc15; font-size: 28px; margin: 0 0 16px; letter-spacing: 0.1em;">TOP 10 HIGHSCORES</h2>';
    html += '<table class="hs-table">';
    html += '<thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th><th>Combo</th><th>Datum</th></tr></thead>';
    html += '<tbody>';

    if (state.highscores.length === 0) {
        html += '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">Noch keine Eintraege</td></tr>';
    } else {
        for (let i = 0; i < state.highscores.length; i++) {
            const entry = state.highscores[i];
            const isTop = i === 0;
            const rowClass = isTop ? 'hs-row-top' : '';
            html += `<tr class="${rowClass}">`;
            html += `<td class="hs-rank">${i + 1}</td>`;
            html += `<td class="hs-name">${entry.name || '---'}</td>`;
            html += `<td class="hs-score">${String(entry.score).padStart(7, '0')}</td>`;
            html += `<td class="hs-level">${entry.level || '-'}</td>`;
            html += `<td class="hs-combo">x${entry.combo || 0}</td>`;
            html += `<td class="hs-date">${entry.date || '-'}</td>`;
            html += '</tr>';
        }
    }

    html += '</tbody></table>';
    html += '<p style="color: #94a3b8; margin-top: 12px; font-size: 14px;">Klicke zum Schliessen</p>';

    tableContainer.innerHTML = html;
    tableContainer.classList.remove('is-hidden');

    const dismissHandler = () => {
        tableContainer.classList.add('is-hidden');
        tableContainer.removeEventListener('click', dismissHandler);
    };

    tableContainer.addEventListener('click', dismissHandler);
}

boot();
