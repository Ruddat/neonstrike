import { state } from './state.js';
import { assets } from './assets.js';
import { audio } from './audio.js';

// Particle Types: explosion, debris, thrust, hitSpark, comboText

export function spawnExplosion(x, y, size = 1) {
    audio.playSfx('explosion');

    // Haupt-Explosion
    state.particles.push({
        type: 'explosion',
        x,
        y,
        size,
        t: 0,
        duration: 0.42,
    });

    // Debris-Partikel
    const debrisCount = Math.floor(4 + size * 4);
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 200 * size;
        state.particles.push({
            type: 'debris',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4 * size,
            t: 0,
            duration: 0.3 + Math.random() * 0.5,
            color: Math.random() > 0.5 ? '#f97316' : '#facc15',
        });
    }

    state.screenFlash = Math.max(state.screenFlash, 0.18);
    state.screenShake = Math.max(state.screenShake, 8 * size);
}

export function spawnDebris(x, y, size = 1) {
    const count = Math.floor(2 + size * 3);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 120 * size;
        state.particles.push({
            type: 'debris',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1 + Math.random() * 3,
            t: 0,
            duration: 0.2 + Math.random() * 0.3,
            color: Math.random() > 0.5 ? '#94a3b8' : '#f97316',
        });
    }
}

export function spawnThrustParticle(x, y) {
    state.particles.push({
        type: 'thrust',
        x,
        y: y + (Math.random() - 0.5) * 8,
        vx: -120 - Math.random() * 80,
        vy: (Math.random() - 0.5) * 30,
        size: 3 + Math.random() * 4,
        t: 0,
        duration: 0.12 + Math.random() * 0.08,
    });
}

export function spawnHitSpark(x, y) {
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 140;
        state.particles.push({
            type: 'hitSpark',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1 + Math.random() * 2,
            t: 0,
            duration: 0.08 + Math.random() * 0.12,
        });
    }
}

export function spawnComboText(x, y, combo, multiplier) {
    state.particles.push({
        type: 'comboText',
        x,
        y,
        t: 0,
        duration: 1.0,
        combo,
        multiplier,
    });
}

export function updateEffects(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const fx = state.particles[i];

        fx.t += dt;

        if (fx.t >= fx.duration) {
            state.particles.splice(i, 1);
            continue;
        }

        // Bewegung fuer bewegliche Partikel
        if (fx.type === 'debris' || fx.type === 'hitSpark') {
            fx.x += (fx.vx || 0) * dt;
            fx.y += (fx.vy || 0) * dt;
            // Reibung
            if (fx.vx) fx.vx *= 0.96;
            if (fx.vy) fx.vy *= 0.96;
        }

        if (fx.type === 'thrust') {
            fx.x += (fx.vx || 0) * dt;
            fx.y += (fx.vy || 0) * dt;
        }

        if (fx.type === 'comboText') {
            fx.y -= 40 * dt;
        }
    }
}

export function drawEffects(ctx) {
    // Explosion Sprites
    const frames = [
        assets.get('explosion01'),
        assets.get('explosion02'),
        assets.get('explosion03'),
        assets.get('explosion04'),
        assets.get('explosion05'),
        assets.get('explosion06'),
    ].filter(Boolean);

    for (const fx of state.particles) {
        const progress = fx.t / fx.duration;

        switch (fx.type) {
            case 'explosion':
                drawExplosion(ctx, fx, frames, progress);
                break;
            case 'debris':
                drawDebris(ctx, fx, progress);
                break;
            case 'thrust':
                drawThrust(ctx, fx, progress);
                break;
            case 'hitSpark':
                drawHitSpark(ctx, fx, progress);
                break;
            case 'comboText':
                drawComboText(ctx, fx, progress);
                break;
        }
    }
}

function drawExplosion(ctx, fx, frames, progress) {
    const frameIndex = Math.min(
        frames.length - 1,
        Math.floor(progress * frames.length)
    );

    const sprite = frames[frameIndex];

    ctx.save();
    ctx.translate(fx.x, fx.y);

    if (sprite) {
        const size = 128 * fx.size;
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    } else {
        // Fallback: Mehrstufige Explosion
        ctx.globalAlpha = 1 - progress;

        // Aeussere Explosion
        const outerR = 48 * fx.size * (1 + progress * 0.8);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f97316';
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Innerer Kern
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Weiss-Hot Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawDebris(ctx, fx, progress) {
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = fx.color || '#f97316';
    ctx.fillRect(
        fx.x - fx.size / 2,
        fx.y - fx.size / 2,
        fx.size,
        fx.size
    );
    ctx.restore();
}

function drawThrust(ctx, fx, progress) {
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.8;

    // Thrust: Orange-Gelber Farbverlauf
    const r = fx.size * (1 - progress * 0.5);
    const gradient = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
    gradient.addColorStop(0, 'rgba(251, 191, 36, .9)');
    gradient.addColorStop(0.5, 'rgba(249, 115, 22, .5)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawHitSpark(ctx, fx, progress) {
    ctx.save();
    ctx.globalAlpha = 1 - progress;

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#facc15';

    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.size * (1 - progress), 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawComboText(ctx, fx, progress) {
    ctx.save();

    ctx.globalAlpha = progress < 0.7 ? 1 : (1 - progress) / 0.3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scale = 1 + progress * 0.3;

    ctx.shadowBlur = 18;
    ctx.shadowColor = '#facc15';
    ctx.fillStyle = '#facc15';
    ctx.font = `900 ${Math.floor(22 * scale)}px Arial`;
    ctx.fillText('x' + fx.multiplier, fx.x, fx.y);

    ctx.fillStyle = '#fef3c7';
    ctx.font = `800 ${Math.floor(14 * scale)}px Arial`;
    ctx.fillText(fx.combo + ' COMBO', fx.x, fx.y + 20);

    ctx.shadowBlur = 0;
    ctx.restore();
}
