import { CONFIG } from './config.js';
import { state } from './state.js';
import { getStage } from './stages.js';

const stars = Array.from({ length: 170 }, () => ({
    x: Math.random() * CONFIG.width,
    y: Math.random() * CONFIG.height,
    z: Math.random() * 3 + 1,
    r: Math.random() * 1.8 + 0.25,
}));

const parallaxObjects = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * CONFIG.width,
    y: 80 + Math.random() * (CONFIG.height - 160),
    size: 30 + Math.random() * 90,
    speed: 18 + Math.random() * 42,
    layer: i % 3,
}));

// --- Offscreen-Canvas Cache fuer statische Hintergruende ---
let bgCacheCanvas = null;
let bgCacheCtx = null;
let bgCacheStageIndex = -1;

function ensureBgCache() {
    if (!bgCacheCanvas) {
        bgCacheCanvas = document.createElement('canvas');
        bgCacheCanvas.width = CONFIG.width;
        bgCacheCanvas.height = CONFIG.height;
        bgCacheCtx = bgCacheCanvas.getContext('2d');
    }
}

function renderBgCache(stage) {
    ensureBgCache();
    bgCacheStageIndex = state.stageIndex;

    const ctx = bgCacheCtx;
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, CONFIG.width, CONFIG.height);
    gradient.addColorStop(0, stage.colors.top);
    gradient.addColorStop(0.5, stage.colors.mid);
    gradient.addColorStop(1, stage.colors.bottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Stage Decoration (statisch)
    drawStageDecoration(ctx, stage);
}

export function updateBackground(dt) {
    for (const star of stars) {
        star.x -= star.z * 70 * dt;

        if (star.x < -10) {
            star.x = CONFIG.width + Math.random() * 80;
            star.y = Math.random() * CONFIG.height;
        }
    }

    for (const obj of parallaxObjects) {
        obj.x -= obj.speed * dt;

        if (obj.x < -obj.size - 80) {
            obj.x = CONFIG.width + Math.random() * 300;
            obj.y = 80 + Math.random() * (CONFIG.height - 160);
            obj.size = 30 + Math.random() * 90;
        }
    }
}

export function drawBackground(ctx) {
    const stage = getStage(state.stageIndex);

    // Cache invalidieren wenn Stage sich aendert
    if (bgCacheStageIndex !== state.stageIndex) {
        renderBgCache(stage);
    }

    // Statischen Hintergrund aus Cache zeichnen
    ensureBgCache();
    ctx.drawImage(bgCacheCanvas, 0, 0);

    // Dynamische Elemente: Sterne
    drawStars(ctx, stage);

    // Dynamische Elemente: Parallax Objekte
    drawParallaxObjects(ctx, stage);
}

function drawStars(ctx, stage) {
    for (const star of stars) {
        ctx.globalAlpha = 0.25 + star.z * 0.18;
        ctx.fillStyle = stage.colors.accent || '#bae6fd';
        ctx.fillRect(star.x, star.y, star.r * star.z, star.r);
    }

    ctx.globalAlpha = 1;
}

function drawStageDecoration(ctx, stage) {
    if (stage.id === 1) drawPlanet(ctx, '#38bdf8');
    if (stage.id === 2) drawAsteroids(ctx);
    if (stage.id === 3) drawCyberGrid(ctx);
    if (stage.id === 4) drawStationRuins(ctx);
    if (stage.id === 5) drawNebula(ctx, '#818cf8');
    if (stage.id === 6) drawNebula(ctx, '#22c55e');
    if (stage.id === 7) drawMachineLines(ctx);
    if (stage.id === 8) drawSolarGlow(ctx);
    if (stage.id === 9) drawVoid(ctx);
    if (stage.id === 10) drawCitadel(ctx);
}

function drawPlanet(ctx, color) {
    const x = CONFIG.width * 0.86;
    const y = CONFIG.height * 0.46;

    const glow = ctx.createRadialGradient(x, y, 20, x, y, 280);
    glow.addColorStop(0, color + '55');
    glow.addColorStop(0.45, color + '22');
    glow.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 280, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color + '33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 215, Math.PI * 0.58, Math.PI * 1.42);
    ctx.stroke();
}

function drawAsteroids(ctx) {
    ctx.fillStyle = 'rgba(148, 163, 184, .35)';
    for (let i = 0; i < 14; i++) {
        const x = (i * 137 + 80) % CONFIG.width;
        const y = (i * 83 + 60) % CONFIG.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 18 + (i % 4) * 8, 11 + (i % 3) * 6, i, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCyberGrid(ctx) {
    ctx.strokeStyle = 'rgba(56, 189, 248, .12)';
    ctx.lineWidth = 1;

    for (let x = 0; x < CONFIG.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 260, CONFIG.height);
        ctx.stroke();
    }

    for (let y = 0; y < CONFIG.height; y += 70) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.width, y);
        ctx.stroke();
    }
}

function drawStationRuins(ctx) {
    ctx.fillStyle = 'rgba(148, 163, 184, .18)';
    for (let i = 0; i < 8; i++) {
        const x = CONFIG.width - i * 145;
        const y = 80 + (i % 4) * 120;
        ctx.fillRect(x, y, 90, 22);
        ctx.fillRect(x + 30, y - 36, 22, 90);
    }
}

function drawNebula(ctx, color) {
    const g = ctx.createRadialGradient(380, 360, 40, 380, 360, 520);
    g.addColorStop(0, color + '33');
    g.addColorStop(0.45, color + '18');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

function drawMachineLines(ctx) {
    ctx.strokeStyle = 'rgba(203, 213, 225, .14)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 18; i++) {
        const y = i * 42;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.width, y + Math.sin(i) * 80);
        ctx.stroke();
    }
}

function drawSolarGlow(ctx) {
    const g = ctx.createRadialGradient(CONFIG.width + 40, CONFIG.height / 2, 20, CONFIG.width + 40, CONFIG.height / 2, 620);
    g.addColorStop(0, 'rgba(251, 191, 36, .65)');
    g.addColorStop(0.35, 'rgba(249, 115, 22, .22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

function drawVoid(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.strokeStyle = 'rgba(129, 140, 248, .18)';
    ctx.beginPath();
    ctx.arc(CONFIG.width * 0.72, CONFIG.height * 0.5, 190, 0, Math.PI * 2);
    ctx.stroke();
}

function drawCitadel(ctx) {
    ctx.fillStyle = 'rgba(168, 85, 247, .18)';

    for (let i = 0; i < 9; i++) {
        const h = 80 + i * 18;
        ctx.fillRect(CONFIG.width - 170 - i * 55, CONFIG.height - h, 34, h);
    }
}


function drawParallaxObjects(ctx, stage) {
    for (const obj of parallaxObjects) {
        ctx.save();
        ctx.globalAlpha = obj.layer === 0 ? 0.12 : obj.layer === 1 ? 0.2 : 0.32;

        if (stage.id === 2) {
            drawAsteroidObject(ctx, obj);
        } else if (stage.id === 4) {
            drawDebrisObject(ctx, obj);
        } else if (stage.id === 7 || stage.id === 10) {
            drawTechObject(ctx, obj);
        } else {
            drawSpaceDustObject(ctx, obj, stage);
        }

        ctx.restore();
    }

    ctx.globalAlpha = 1;
}

function drawAsteroidObject(ctx, obj) {
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(
        obj.x,
        obj.y,
        obj.size * 0.8,
        obj.size * 0.45,
        obj.x * 0.01,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = 'rgba(15,23,42,.35)';
    ctx.beginPath();
    ctx.arc(obj.x - obj.size * 0.2, obj.y - obj.size * 0.08, obj.size * 0.14, 0, Math.PI * 2);
    ctx.fill();
}

function drawDebrisObject(ctx, obj) {
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.x * 0.005);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-obj.size / 2, -8, obj.size, 16);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-obj.size / 4, -4, obj.size / 3, 8);
}

function drawTechObject(ctx, obj) {
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.x * 0.003);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.strokeRect(-obj.size / 2, -obj.size / 3, obj.size, obj.size / 1.5);

    ctx.beginPath();
    ctx.moveTo(-obj.size / 2, 0);
    ctx.lineTo(obj.size / 2, 0);
    ctx.moveTo(0, -obj.size / 3);
    ctx.lineTo(0, obj.size / 3);
    ctx.stroke();
}

function drawSpaceDustObject(ctx, obj, stage) {
    ctx.fillStyle = stage.colors.accent || '#38bdf8';
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.size * 0.18, 0, Math.PI * 2);
    ctx.fill();
}
