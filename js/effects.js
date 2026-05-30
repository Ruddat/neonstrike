import { state } from './state.js';
import { assets } from './assets.js';
import { audio } from './audio.js';

export function spawnExplosion(x, y, size = 1) {
    audio.playSfx('explosion');
    state.particles.push({
        type: 'explosion',
        x,
        y,
        size,
        t: 0,
        duration: 0.42,
    });

    state.screenFlash = Math.max(state.screenFlash, 0.18);
    state.screenShake = Math.max(state.screenShake, 8 * size);
}

export function updateEffects(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const fx = state.particles[i];

        if (fx.type !== 'explosion') continue;

        fx.t += dt;

        if (fx.t >= fx.duration) {
            state.particles.splice(i, 1);
        }
    }
}

export function drawEffects(ctx) {
    const frames = [
        assets.get('explosion01'),
        assets.get('explosion02'),
        assets.get('explosion03'),
        assets.get('explosion04'),
        assets.get('explosion05'),
        assets.get('explosion06'),
    ].filter(Boolean);

    for (const fx of state.particles) {
        if (fx.type !== 'explosion') continue;

        const progress = fx.t / fx.duration;
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
            ctx.globalAlpha = 1 - progress;
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(0, 0, 48 * fx.size * (1 + progress), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}