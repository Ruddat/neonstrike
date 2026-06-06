import { CONFIG } from './config.js';

const scrollText =
    '*** WELCOME TO NEON STRIKE *** PRESENTED BY THE FOX *** FOUNDER OF CROSSBONES *** INTRO MAKER OF FUZION CREW FRANCE *** RESPECT TO ALL CODERS, PIXEL ARTISTS, TRACKER MUSICIANS, INTRO MAKERS AND OLD SCHOOL DREAMERS *** AMIGA *** C64 *** ATARI ST *** DOS *** FINAL CREDIT: INGO RUDDAT ***';

let offset = CONFIG.width;
let stars = [];
let plasmaOrbs = [];

export function initIntro() {
    offset = CONFIG.width;
    stars = [];
    plasmaOrbs = [];

    for (let i = 0; i < 240; i++) {
        stars.push({
            x: Math.random() * CONFIG.width,
            y: Math.random() * CONFIG.height,
            z: Math.random() * 3 + 0.4,
            r: Math.random() * 2 + 0.4,
        });
    }

    for (let i = 0; i < 7; i++) {
        plasmaOrbs.push({
            x: Math.random() * CONFIG.width,
            y: Math.random() * CONFIG.height,
            r: 120 + Math.random() * 180,
            speed: 0.2 + Math.random() * 0.6,
        });
    }
}

export function updateIntro(dt) {
    offset -= 250 * dt;

    const textWidth = scrollText.length * 15;

    if (offset < -textWidth) {
        offset = CONFIG.width;
    }

    for (const star of stars) {
        star.x -= star.z * 120 * dt;

        if (star.x < -10) {
            star.x = CONFIG.width + Math.random() * 80;
            star.y = Math.random() * CONFIG.height;
        }
    }
}

export function drawIntro(ctx, time) {
    drawBackground(ctx, time);
    drawGrid(ctx, time);
    drawLogoWave(ctx, time);
    drawCredits(ctx, time);
    drawScrollBar(ctx);
    drawScrollText(ctx, time);
    drawScanlines(ctx);
}

function drawBackground(ctx, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(0.55, '#090020');
    gradient.addColorStop(1, '#020617');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    for (let i = 0; i < plasmaOrbs.length; i++) {
        const orb = plasmaOrbs[i];
        const x = orb.x + Math.sin(time * 0.0004 * orb.speed + i) * 120;
        const y = orb.y + Math.cos(time * 0.0005 * orb.speed + i * 2) * 90;

        const g = ctx.createRadialGradient(x, y, 20, x, y, orb.r);
        g.addColorStop(0, i % 2 === 0 ? 'rgba(56,189,248,.18)' : 'rgba(168,85,247,.16)');
        g.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    for (const star of stars) {
        ctx.globalAlpha = Math.min(1, 0.18 + star.z * 0.22);
        ctx.fillStyle = star.z > 2.4 ? '#ffffff' : '#bae6fd';
        ctx.fillRect(star.x, star.y, star.r * star.z, star.r);
    }

    ctx.globalAlpha = 1;
}

function drawGrid(ctx, time) {
    const baseY = 500;
    const horizon = 350;
    const scroll = (time * 0.08) % 48;

    ctx.save();

    ctx.strokeStyle = 'rgba(56,189,248,.18)';
    ctx.lineWidth = 1;

    for (let y = horizon; y < CONFIG.height; y += 24) {
        const p = (y - horizon) / (CONFIG.height - horizon);
        const yy = y + scroll * p;

        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(CONFIG.width, yy);
        ctx.stroke();
    }

    for (let x = -CONFIG.width; x <= CONFIG.width * 2; x += 90) {
        ctx.beginPath();
        ctx.moveTo(CONFIG.width / 2, horizon);
        ctx.lineTo(x, CONFIG.height);
        ctx.stroke();
    }

    const fog = ctx.createLinearGradient(0, horizon, 0, CONFIG.height);
    fog.addColorStop(0, 'rgba(2,6,23,.95)');
    fog.addColorStop(0.45, 'rgba(2,6,23,.25)');
    fog.addColorStop(1, 'rgba(2,6,23,0)');

    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon - 20, CONFIG.width, CONFIG.height - horizon + 20);

    ctx.restore();
}

function drawLogoWave(ctx, time) {
    const title = 'NEON STRIKE';
    const centerX = CONFIG.width / 2;
    const baseY = 210;
    const spacing = 58;
    const startX = centerX - ((title.length - 1) * spacing) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 82px Arial';

    for (let i = 0; i < title.length; i++) {
        const ch = title[i];
        const wave = Math.sin(time * 0.004 + i * 0.55);
        const y = baseY + wave * 24;
        const x = startX + i * spacing;

        ctx.shadowBlur = 36;
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = '#0ea5e9';
        ctx.fillText(ch, x + 3, y + 3);

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f97316';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(ch, x, y);
    }

    ctx.shadowBlur = 18;
    ctx.shadowColor = '#a855f7';
    ctx.font = '800 24px Courier New';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('AN OLD SCHOOL HTML5 SHOOTER', centerX, 292);

    ctx.restore();
}

function drawCredits(ctx, time) {
    const blink = Math.floor(time / 420) % 2 === 0;
    const pulse = Math.sin(time * 0.004) * 0.5 + 0.5;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.shadowBlur = 18 + pulse * 18;
    ctx.shadowColor = '#facc15';

    ctx.fillStyle = '#facc15';
    ctx.font = '900 34px Arial';
    ctx.fillText('THE FOX', CONFIG.width / 2, 390);

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';

    ctx.font = '700 19px Courier New';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('FOUNDER OF CROSSBONES', CONFIG.width / 2, 432);
    ctx.fillText('INTRO MAKER OF FUZION CREW FRANCE', CONFIG.width / 2, 462);

    ctx.font = '900 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;
    ctx.fillText('FINAL CREDIT: INGO RUDDAT', CONFIG.width / 2, 560);

    if (blink) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 18px Courier New';
        ctx.fillText('PRESS SPACE OR CLICK TO START', CONFIG.width / 2, 600);
    }

    ctx.restore();
}

function drawScrollBar(ctx) {
    ctx.save();

    ctx.fillStyle = 'rgba(2,6,23,.86)';
    ctx.fillRect(0, CONFIG.height - 78, CONFIG.width, 54);

    ctx.strokeStyle = 'rgba(56,189,248,.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, CONFIG.height - 78, CONFIG.width, 54);

    ctx.restore();
}

function drawScrollText(ctx, time) {
    ctx.save();

    ctx.font = '900 24px Courier New';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < scrollText.length; i++) {
        const ch = scrollText[i];
        const x = offset + i * 15;
        const y = CONFIG.height - 51 + Math.sin(time * 0.008 + i * 0.35) * 8;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';

        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#facc15';
        ctx.fillText(ch, x, y);
    }

    ctx.restore();
}

function drawScanlines(ctx) {
    ctx.save();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000000';

    for (let y = 0; y < CONFIG.height; y += 4) {
        ctx.fillRect(0, y, CONFIG.width, 1);
    }

    ctx.globalAlpha = 1;

    const vignette = ctx.createRadialGradient(
        CONFIG.width / 2,
        CONFIG.height / 2,
        120,
        CONFIG.width / 2,
        CONFIG.height / 2,
        CONFIG.width * 0.7
    );

    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.42)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.restore();
}