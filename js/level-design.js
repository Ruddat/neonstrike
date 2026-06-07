import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';
import { getStageModifiers } from './stage-modifiers.js';

const canvas = document.getElementById('game');
const ctx = canvas?.getContext('2d');

let lastStageIndex = -1;
let bannerTimer = 0;
let meteorModeActive = false;

function isMeteorField(stage, mods) {
    return Boolean(mods.meteorField) || /Meteor Belt/i.test(stage.name || '');
}

function resetStageMode(stage, mods) {
    meteorModeActive = isMeteorField(stage, mods);
    bannerTimer = meteorModeActive ? 3.2 : 0;
    lastStageIndex = state.stageIndex;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function trimEnemiesForMeteorField(mods) {
    if (state.bossActive || state.bossWarning || state.hyperspaceJump) return;

    const maxActiveEnemies = mods.meteorMaxEnemies ?? 2;
    const keepChance = mods.meteorEnemyKeepChance ?? 0.22;

    // Formations in MeteorField stark ausbremsen. Singles duerfen selten durchkommen.
    state.formationTimer = Math.max(state.formationTimer || 0, mods.meteorFormationDelay ?? 6.5);

    const enemies = state.enemies;
    let activeCombatEnemies = 0;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isMinion) continue;

        activeCombatEnemies++;

        const tooMany = activeCombatEnemies > maxActiveEnemies;
        const randomCull = Math.random() > keepChance && activeCombatEnemies > 1;

        // Nicht direkt am Bildschirmrand hart rauspoppen, sondern nur Gegner entfernen,
        // die gerade frisch gespawnt oder noch nicht wichtig sind.
        const freshHorizontal = enemy.x > CONFIG.width - 40;
        const freshVertical = enemy.y < 40;
        const fresh = freshHorizontal || freshVertical;

        if (tooMany || (fresh && randomCull)) {
            enemies.splice(i, 1);
        }
    }
}

function drawMeteorFieldBanner(stage, mods, time) {
    if (!ctx || bannerTimer <= 0) return;

    bannerTimer = Math.max(0, bannerTimer - 0.018);
    const alpha = clamp01(Math.min(1, bannerTimer));
    const pulse = 0.5 + Math.sin(time * 0.012) * 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
    ctx.fillRect(CONFIG.width / 2 - 250, 88, 500, 86);

    ctx.strokeStyle = `rgba(251, 146, 60, ${0.55 + pulse * 0.25})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(CONFIG.width / 2 - 250, 88, 500, 86);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 34px Arial';
    ctx.fillStyle = '#fb923c';
    ctx.fillText('METEOR FIELD', CONFIG.width / 2, 120);

    ctx.font = '800 14px Arial';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText('CLEAR ROCKS · AVOID IMPACT · SURVIVE THE BELT', CONFIG.width / 2, 150);

    ctx.restore();
}

function tickLevelDesign(time) {
    requestAnimationFrame(tickLevelDesign);

    const stage = getStage(state.stageIndex);
    const mods = getStageModifiers(stage);

    if (state.stageIndex !== lastStageIndex) {
        resetStageMode(stage, mods);
    }

    if (!state.running || state.paused || state.gameOver || state.victory || state.nameEntry) return;

    if (meteorModeActive) {
        trimEnemiesForMeteorField(mods);
        drawMeteorFieldBanner(stage, mods, time);
    }
}

requestAnimationFrame(tickLevelDesign);
