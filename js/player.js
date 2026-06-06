import { CONFIG } from './config.js';
import { state } from './state.js';
import { keys, mouse, touch } from './input.js';
import { clamp } from './utils.js';
import { assets } from './assets.js';
import { updatePlayerPowerTimers } from './powerups.js';
import { audio } from './audio.js';
import { spawnThrustParticle } from './effects.js';
import { spawnExplosion } from './effects.js';
import {
    isVertical,
    playerStartX, playerStartY,
    playerMinX, playerMaxX, playerMinY, playerMaxY,
    bulletOffsetX, bulletOffsetY,
    mainDirectionX, mainDirectionY,
    thrustOffsetX, thrustOffsetY,
} from './direction.js';

export function resetPlayer() {
    state.player.x = playerStartX();
    state.player.y = playerStartY();
    state.player.lives = 3;
    state.player.bombs = 3;
    state.player.bombFragments = 0;
    state.player.cooldown = 0;
    state.player.bombCooldown = 0;
    state.player.invulnerable = 1.2;
    state.player.weaponType = 'laser';
    state.player.weaponTimer = 0;
    state.player.rapidTimer = 0;
    state.player.shieldTimer = 0;
    state.player.weaponLevel = 1;
    state.player.thrustTimer = 0;
    state.player.shieldBashCooldown = 0;
    state.player.shieldBashActive = false;
    state.player.shieldBashTimer = 0;
}

export function updatePlayer(dt) {
    const player = state.player;

    let dx = 0;
    let dy = 0;

    if (touch.joyActive) {
        // Touch: Virtueller Joystick
        dx = touch.joyX;
        dy = touch.joyY;
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    } else if (mouse.inside) {
        const followSpeed = 12;
        player.x += (mouse.x - player.x) * Math.min(1, followSpeed * dt);
        player.y += (mouse.y - player.y) * Math.min(1, followSpeed * dt);
    } else {
        if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
        if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
        if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;

        if (dx || dy) {
            const length = Math.hypot(dx, dy);
            dx /= length;
            dy /= length;
        }

        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    }

    // Richtungabhaengige Begrenzung
    player.x = clamp(player.x, playerMinX(), playerMaxX());
    player.y = clamp(player.y, playerMinY(), playerMaxY());

    player.cooldown -= dt;
    player.invulnerable -= dt;
    player.bombCooldown -= dt;
    player.thrustTimer -= dt;
    if (player.shakeTimer > 0) player.shakeTimer -= dt;
    updatePlayerPowerTimers(dt);

    // Engine Thrust Particles (reduziert fuer Performance)
    if (player.thrustTimer <= 0) {
        spawnThrustParticle(thrustOffsetX(player.x), thrustOffsetY(player.y));
        player.thrustTimer = 0.06;
    }

    // Feuern: Touch-Button ODER Maus/Keyboard
    if ((touch.fire || mouse.left || keys.has('Space') || keys.has('KeyJ')) && player.cooldown <= 0) {
        fireBullet();
        // Overdrive: doppelte Feuerrate
        const overdriveBonus = state.overdrive ? 0.5 : 1;
        player.cooldown = player.rapidTimer > 0 ? 0.055 * overdriveBonus : 0.12 * overdriveBonus;
    }

    // Bombe: Touch-Button ODER Maus/Keyboard
    if (
        (touch.bomb || mouse.right || keys.has('KeyK')) &&
        player.bombs > 0 &&
        player.bombCooldown <= 0
    ) {
        triggerBomb();
    }

    // Shield-Bash: Taste E (nur wenn Schild aktiv und Cooldown bereit)
    if ((keys.has('KeyE') || touch.shieldBash) &&
        player.shieldTimer > 0 &&
        player.shieldBashCooldown <= 0 &&
        !player.shieldBashActive) {
        triggerShieldBash();
    }
    // Touch-Flag zuruecksetzen
    if (touch.shieldBash) touch.shieldBash = false;
}

function fireBullet() {
    const player = state.player;
    audio.playSfx('shoot');

    const lv = player.weaponLevel;
    const vx = mainDirectionX();
    const vy = mainDirectionY();
    const offX = bulletOffsetX();
    const offY = bulletOffsetY();
    const vert = isVertical();

    if (player.weaponType === 'railgun') {
        // Railgun: Level steigert Pierce + Damage
        state.bullets.push({
            x: player.x + offX,
            y: player.y + offY,
            vx: 1200 * vx,
            vy: 1200 * vy,
            r: 9 + lv,
            damage: 3 + lv * 2,
            color: '#e0f2fe',
            pierce: 3 + lv * 2,
            rail: true,
        });

        // Level 3+: Side railgun beams
        if (lv >= 3) {
            const sideVx = 1100 * vx + (vert ? -60 : 0);
            const sideVy = 1100 * vy + (vert ? 0 : -60);
            state.bullets.push({
                x: player.x + offX * 0.6,
                y: player.y + offY * 0.6 + (vert ? 0 : -18),
                vx: vert ? 1100 * vx : 1100,
                vy: vert ? 1100 * vy - 60 : 0,
                r: 6,
                damage: 2 + lv,
                color: '#7dd3fc',
                pierce: 2 + lv,
                rail: true,
            });
            state.bullets.push({
                x: player.x + offX * 0.6,
                y: player.y + offY * 0.6 + (vert ? 0 : 18),
                vx: vert ? 1100 * vx : 1100,
                vy: vert ? 1100 * vy + 60 : 0,
                r: 6,
                damage: 2 + lv,
                color: '#7dd3fc',
                pierce: 2 + lv,
                rail: true,
            });
        }

        state.screenShake = Math.max(state.screenShake, 10 + lv * 2);
        state.screenFlash = Math.max(state.screenFlash, 0.18);
        return;
    }

    if (player.weaponType === 'spread') {
        // Spread: Level steigert Anzahl + Schaden
        const count = lv >= 5 ? 7 : lv >= 4 ? 5 : lv >= 3 ? 5 : lv >= 2 ? 3 : 3;
        const spreadAngle = 0.18 + lv * 0.04;
        const baseDamage = 0.7 + lv * 0.3;
        const baseAngle = vert ? -Math.PI / 2 : 0; // Nach oben bei vertikal

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (-spreadAngle * (count - 1) / 2 + spreadAngle * i);
            state.bullets.push({
                x: player.x + offX,
                y: player.y + offY,
                vx: 680 * Math.cos(angle),
                vy: 680 * Math.sin(angle),
                r: 4 + Math.floor(lv / 2),
                damage: baseDamage,
                color: '#38bdf8',
            });
        }
        return;
    }

    if (player.weaponType === 'plasma') {
        // Plasma: Level steigert Damage + Groesse + Sekundaer-Orbs
        const baseDmg = 1.5 + lv * 0.8;
        state.bullets.push({
            x: player.x + offX,
            y: player.y + offY,
            vx: 580 * vx,
            vy: 580 * vy,
            r: 7 + lv * 2,
            damage: baseDmg,
            color: '#a855f7',
            plasma: true,
        });

        // Level 3+: Tracking plasma orbs
        if (lv >= 3) {
            state.bullets.push({
                x: player.x + offX * 0.6,
                y: player.y + offY * 0.6 + (vert ? -22 : 0),
                vx: 500 * vx + (vert ? -80 : 0),
                vy: 500 * vy + (vert ? 0 : -80),
                r: 5 + lv,
                damage: baseDmg * 0.5,
                color: '#c084fc',
                plasma: true,
            });
            state.bullets.push({
                x: player.x + offX * 0.6,
                y: player.y + offY * 0.6 + (vert ? 22 : 0),
                vx: 500 * vx + (vert ? 80 : 0),
                vy: 500 * vy + (vert ? 0 : 80),
                r: 5 + lv,
                damage: baseDmg * 0.5,
                color: '#c084fc',
                plasma: true,
            });
        }
        return;
    }

    // === ION CANNON (Secret Weapon) ===
    if (player.weaponType === 'ionCannon') {
        // Riesiger Energiestrahl: massiver Schaden, langsam
        state.bullets.push({
            x: player.x + offX,
            y: player.y + offY,
            vx: 600 * vx,
            vy: 600 * vy,
            r: 16 + lv * 3,
            damage: 8 + lv * 3,
            color: '#06b6d4',
            ionCannon: true,
            pierce: 10 + lv * 3,
        });
        // Zwei kleinere Ion-Bolts
        for (const side of [-1, 1]) {
            state.bullets.push({
                x: player.x + offX * 0.5,
                y: player.y + offY * 0.5 + (vert ? side * 20 : 0) + (vert ? 0 : side * 20),
                vx: 550 * vx + (vert ? side * 40 : 0),
                vy: 550 * vy + (vert ? 0 : side * 40),
                r: 8 + lv,
                damage: 4 + lv,
                color: '#22d3ee',
                ionCannon: true,
                pierce: 3 + lv,
            });
        }
        state.screenShake = Math.max(state.screenShake, 14);
        state.screenFlash = Math.max(state.screenFlash, 0.15);
        return;
    }

    // === VOID BEAM (Secret Weapon) ===
    if (player.weaponType === 'voidBeam') {
        // Dunkler Energiestrahl: durchdringt alles
        state.bullets.push({
            x: player.x + offX,
            y: player.y + offY,
            vx: 900 * vx,
            vy: 900 * vy,
            r: 10 + lv * 2,
            damage: 12 + lv * 4,
            color: '#7c3aed',
            voidBeam: true,
            pierce: 99, // Durchdringt alles!
        });
        // Void Ring
        state.bullets.push({
            x: player.x + offX,
            y: player.y + offY,
            vx: 700 * vx,
            vy: 700 * vy,
            r: 20 + lv * 3,
            damage: 3 + lv,
            color: '#a78bfa',
            voidBeam: true,
            pierce: 99,
            voidRing: true,
        });
        state.screenShake = Math.max(state.screenShake, 18);
        state.screenFlash = Math.max(state.screenFlash, 0.2);
        return;
    }

    // LASER (Standard): Level steigert Schuesse + Damage
    const laserDamage = 1 + Math.floor(lv / 2);
    const base = {
        x: player.x + offX,
        y: player.y + offY,
        vx: 780 * vx,
        vy: 780 * vy,
        r: 5,
        damage: laserDamage,
        color: '#facc15',
    };

    state.bullets.push(base);

    // Level 2+: Zweiter Schuss leicht versetzt
    if (lv >= 2) {
        state.bullets.push({
            ...base,
            y: player.y + offY + (vert ? -10 : 0),
            x: player.x + offX + (vert ? -10 : 0),
            damage: laserDamage,
        });
    }

    // Level 3+: Dritter Schuss
    if (lv >= 3) {
        state.bullets.push({
            ...base,
            y: player.y + offY + (vert ? 10 : 0),
            x: player.x + offX + (vert ? 10 : 0),
            damage: laserDamage * 0.8,
        });
    }

    // Level 4+: Diagonale Schuesse
    if (lv >= 4) {
        state.bullets.push({
            ...base,
            y: player.y + offY + (vert ? -8 : 0),
            x: player.x + offX + (vert ? -8 : 0),
            vx: 720 * vx + (vert ? -90 : 0),
            vy: 720 * vy + (vert ? 0 : -90),
            damage: laserDamage * 0.7,
        });
        state.bullets.push({
            ...base,
            y: player.y + offY + (vert ? 8 : 0),
            x: player.x + offX + (vert ? 8 : 0),
            vx: 720 * vx + (vert ? 90 : 0),
            vy: 720 * vy + (vert ? 0 : 90),
            damage: laserDamage * 0.7,
        });
    }

    // Level 5: Rear shot
    if (lv >= 5) {
        state.bullets.push({
            ...base,
            x: player.x - offX * 0.5,
            y: player.y - offY * 0.5,
            vx: -500 * vx,
            vy: -500 * vy,
            damage: laserDamage * 0.5,
            color: '#fb923c',
        });
    }
}

function triggerBomb() {
    const player = state.player;
    audio.playSfx('bomb');
    player.bombs--;
    player.bombCooldown = 2.5;

    state.screenFlash = 1;
    state.screenShake = 28;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        state.score += enemy.points;
        state.enemies.splice(i, 1);
    }

    state.enemyBullets.length = 0;
}

function triggerShieldBash() {
    const player = state.player;
    audio.playSfx('explosion');
    player.shieldBashActive = true;
    player.shieldBashTimer = 0.3;
    player.shieldBashCooldown = 3;
    state.screenFlash = 0.4;
    state.screenShake = 14;

    // Alle Gegner im Umkreis von 200px zerstoeren
    const bashRadius = 200;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bashRadius) {
            // Gegner zurueckstossen und zerstoeren
            spawnExplosion(enemy.x, enemy.y, 1.2);
            state.score += enemy.points;
            state.enemies.splice(i, 1);
        } else if (dist < bashRadius * 1.5) {
            // Gegner weiter weg nur zurueckstossen
            const pushForce = 400;
            enemy.x += (dx / dist) * pushForce * 0.02;
            enemy.y += (dy / dist) * pushForce * 0.02;
        }
    }

    // Gegnerische Geschosse im Umkreis loeschen
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = state.enemyBullets[i];
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        if (Math.hypot(dx, dy) < bashRadius) {
            state.enemyBullets.splice(i, 1);
        }
    }
}


export function updateBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (bullet.x > CONFIG.width + 40 || bullet.x < -40 ||
            bullet.y < -40 || bullet.y > CONFIG.height + 40) {
            state.bullets.splice(i, 1);
        }
    }
}

export function drawPlayer(ctx) {
    const player = state.player;
    const sprite = assets.get('player');

    // Shake-Effekt waehrend Hyperspace
    let shakeOffX = 0, shakeOffY = 0;
    if (player.shakeTimer > 0) {
        shakeOffX = (Math.random() - 0.5) * 8;
        shakeOffY = (Math.random() - 0.5) * 8;
    }

    if (sprite) {
        ctx.save();
        ctx.translate(player.x + shakeOffX, player.y + shakeOffY);

        // Im vertikalen Modus: Schiff um 90° gegen UZS drehen (nach oben)
        if (isVertical()) {
            ctx.rotate(-Math.PI / 2);
        }

        if (player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
            ctx.globalAlpha = 0.45;
        }

        ctx.drawImage(sprite, -64, -32, 128, 64);

        // Overdrive Glow auf dem Schiff
        if (state.overdrive) {
            ctx.fillStyle = `rgba(249, 115, 22, ${state.overdriveGlow * 0.15})`;
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shield visual (ohne shadowBlur)
        if (player.shieldTimer > 0) {
            const shieldPulse = Math.sin(performance.now() * 0.006) * 0.3 + 0.7;
            // Glow via halb-transparenter Kreis
            ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, 52, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2 + shieldPulse;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.stroke();

            // Shield-Bash aktiv: Expanding Ring
            if (player.shieldBashActive) {
                const bashProgress = 1 - (player.shieldBashTimer / 0.3);
                const bashR = 48 + bashProgress * 160;
                const bashAlpha = 1 - bashProgress;
                ctx.strokeStyle = `rgba(34, 197, 94, ${bashAlpha * 0.8})`;
                ctx.lineWidth = 4 + bashProgress * 8;
                ctx.beginPath();
                ctx.arc(0, 0, bashR, 0, Math.PI * 2);
                ctx.stroke();
                // Inner flash
                ctx.fillStyle = `rgba(34, 197, 94, ${bashAlpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(0, 0, bashR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Weapon Level Glow (ohne shadowBlur)
        if (player.weaponLevel >= 3) {
            const glowColor = player.weaponLevel >= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)';
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(24, 0, 26, 0, Math.PI * 2);
            ctx.fill();

            const coreColor = player.weaponLevel >= 5 ? '#ef4444' : '#f97316';
            ctx.fillStyle = coreColor + '33';
            ctx.beginPath();
            ctx.arc(24, 0, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        return;
    }

    // Fallback, falls Sprite fehlt
    ctx.save();
    ctx.translate(player.x + shakeOffX, player.y + shakeOffY);

    // Im vertikalen Modus: Schiff nach oben drehen
    if (isVertical()) {
        ctx.rotate(-Math.PI / 2);
    }

    if (player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
        ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, 0);
    ctx.lineTo(-24, -24);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-46, -7);
    ctx.lineTo(-46, 7);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-24, 24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

export function drawBullets(ctx) {
    const laser = assets.get('laserYellow');
    const vert = isVertical();

    for (const bullet of state.bullets) {

        if (bullet.rail) {
            // Railgun: Glow via breites semi-transparentes Rechteck
            const len = 110;
            const w = 18;
            if (vert) {
                // Vertikale Railgun
                ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
                ctx.fillRect(bullet.x - w / 2, bullet.y - len, w, len);
                ctx.fillStyle = '#e0f2fe';
                ctx.fillRect(bullet.x - 5, bullet.y - len + 10, 10, len - 20);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(bullet.x - 2, bullet.y - len, 4, len);
            } else {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
                ctx.fillRect(bullet.x - 24, bullet.y - 9, 110, 18);
                ctx.fillStyle = '#e0f2fe';
                ctx.fillRect(bullet.x - 12, bullet.y - 5, 80, 10);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(bullet.x - 24, bullet.y - 2, 110, 4);
            }
            continue;
        }

        if (bullet.plasma) {
            // Plasma: Glow via groesserer Kreis dahinter
            ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#e9d5ff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }

        // === ION CANNON ===
        if (bullet.ionCannon) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            // Glow
            ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, bullet.r * 2, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.r, 0, Math.PI * 2);
            ctx.fill();
            // Inner bright core
            ctx.fillStyle = '#ecfeff';
            ctx.beginPath();
            ctx.arc(0, 0, bullet.r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Electric ring
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.r * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            continue;
        }

        // === VOID BEAM ===
        if (bullet.voidBeam) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            if (bullet.voidRing) {
                // Void Ring: pulsierender Ring
                const pulse = Math.sin(performance.now() * 0.01) * 0.2 + 0.8;
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
                ctx.lineWidth = 3 * pulse;
                ctx.beginPath();
                ctx.arc(0, 0, bullet.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(124, 58, 237, 0.1)';
                ctx.beginPath();
                ctx.arc(0, 0, bullet.r * 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Void Beam Core: dunkler Strahl
                ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
                ctx.beginPath();
                ctx.arc(0, 0, bullet.r * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = bullet.color;
                ctx.beginPath();
                ctx.arc(0, 0, bullet.r, 0, Math.PI * 2);
                ctx.fill();
                // Dark core
                ctx.fillStyle = '#1e1b4b';
                ctx.beginPath();
                ctx.arc(0, 0, bullet.r * 0.35, 0, Math.PI * 2);
                ctx.fill();
                // Rotating void lines
                const angle = performance.now() * 0.008;
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 4; i++) {
                    const a = angle + (Math.PI / 2) * i;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * bullet.r * 0.5, Math.sin(a) * bullet.r * 0.5);
                    ctx.lineTo(Math.cos(a) * bullet.r * 1.5, Math.sin(a) * bullet.r * 1.5);
                    ctx.stroke();
                }
            }
            ctx.restore();
            continue;
        }

        if (laser) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);

            if (vert) {
                // Vertikal: Laser-Sprite 90° gegen UZS drehen (nach oben fliegend)
                ctx.rotate(-Math.PI / 2);
                // Glow
                ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
                ctx.fillRect(-26, -12, 52, 24);
                ctx.drawImage(laser, -24, -8, 48, 16);
            } else {
                // Horizontal: normal
                ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
                ctx.fillRect(-18, -12, 52, 24);
                ctx.drawImage(laser, -16, -8, 48, 16);
            }

            ctx.restore();
            continue;
        }

        // Fallback: einfaches Glow-Rechteck (richtungsabhaengig)
        if (vert) {
            ctx.fillStyle = bullet.color ? bullet.color.replace(')', ', 0.2)').replace('rgb(', 'rgba(') : 'rgba(250, 204, 21, 0.2)';
            ctx.fillRect(bullet.x - 7, bullet.y - 21, 14, 42);
            ctx.fillStyle = bullet.color || '#facc15';
            ctx.fillRect(bullet.x - 3, bullet.y - 17, 6, 34);
        } else {
            ctx.fillStyle = bullet.color ? bullet.color.replace(')', ', 0.2)').replace('rgb(', 'rgba(') : 'rgba(250, 204, 21, 0.2)';
            ctx.fillRect(bullet.x - 8, bullet.y - 7, 42, 14);
            ctx.fillStyle = bullet.color || '#facc15';
            ctx.fillRect(bullet.x - 4, bullet.y - 3, 34, 6);
        }
    }
}
