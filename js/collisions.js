import { state } from './state.js';
import { clamp } from './utils.js';
import { maybeDropPowerup } from './powerups.js';
import { damageBoss, startBossWarning } from './boss.js';
import { spawnExplosion, spawnHitSpark, spawnComboText } from './effects.js';

export function updateCollisions() {
    handlePlayerBulletsVsEnemies();
    handleEnemiesVsPlayer();
    handleEnemyBulletsVsPlayer();
}

function handlePlayerBulletsVsEnemies() {
    handlePlayerBulletsVsBoss();

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        for (let j = state.bullets.length - 1; j >= 0; j--) {
            const bullet = state.bullets[j];

            if (
                circleRect(
                    bullet.x,
                    bullet.y,
                    bullet.r,
                    enemy.x - enemy.w / 2,
                    enemy.y - enemy.h / 2,
                    enemy.w,
                    enemy.h
                )
            ) {
                // Hit Spark
                spawnHitSpark(bullet.x, bullet.y);

                if (bullet.pierce && bullet.pierce > 0) {
                    bullet.pierce--;
                } else {
                    state.bullets.splice(j, 1);
                }

                enemy.hp -= bullet.damage;

                if (enemy.hp <= 0) {
                    // Combo System
                    state.comboCount++;
                    state.comboTimer = 2.0; // 2 Sekunden Window

                    // Multiplier berechnen
                    if (state.comboCount >= 20) {
                        state.comboMultiplier = 5;
                    } else if (state.comboCount >= 15) {
                        state.comboMultiplier = 4;
                    } else if (state.comboCount >= 10) {
                        state.comboMultiplier = 3;
                    } else if (state.comboCount >= 5) {
                        state.comboMultiplier = 2;
                    } else {
                        state.comboMultiplier = 1;
                    }

                    // Max Combo tracken
                    if (state.comboCount > state.maxCombo) {
                        state.maxCombo = state.comboCount;
                    }

                    // Score mit Multiplier
                    const points = enemy.points * state.comboMultiplier;
                    state.score += points;
                    state.killsThisStage++;

                    // Combo Text anzeigen
                    if (state.comboCount >= 3) {
                        spawnComboText(enemy.x, enemy.y - 30, state.comboCount, state.comboMultiplier);
                    }

                    maybeDropPowerup(enemy.x, enemy.y);
                    spawnExplosion(enemy.x, enemy.y, enemy.type === 'heavy' ? 1.4 : 1);

                    if (state.killsThisStage >= state.killsForBoss && !state.bossActive) {
                        startBossWarning();
                    }

                    state.enemies.splice(i, 1);
                }

                break;
            }
        }
    }
}

function handleEnemiesVsPlayer() {
    if (state.player.invulnerable > 0) return;

    const player = state.player;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        if (
            rectsOverlap(
                player.x - 30,
                player.y - 18,
                60,
                36,
                enemy.x - enemy.w / 2,
                enemy.y - enemy.h / 2,
                enemy.w,
                enemy.h
            )
        ) {
            // Kamikaze explodiert beim Kontakt
            if (enemy.type === 'kamikaze') {
                spawnExplosion(enemy.x, enemy.y, 1.6);
            } else {
                spawnExplosion(enemy.x, enemy.y, 0.8);
            }
            state.enemies.splice(i, 1);
            damagePlayer();
            break;
        }
    }
}

function handleEnemyBulletsVsPlayer() {
    if (state.player.invulnerable > 0) return;

    const player = state.player;

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = state.enemyBullets[i];

        if (
            circleRect(
                bullet.x,
                bullet.y,
                bullet.r,
                player.x - 30,
                player.y - 18,
                60,
                36
            )
        ) {
            state.enemyBullets.splice(i, 1);
            damagePlayer();
            break;
        }
    }
}

function handlePlayerBulletsVsBoss() {
    if (!state.boss) return;

    const boss = state.boss;

    for (let j = state.bullets.length - 1; j >= 0; j--) {
        const bullet = state.bullets[j];

        if (
            circleRect(
                bullet.x,
                bullet.y,
                bullet.r,
                boss.x - boss.w / 2,
                boss.y - boss.h / 2,
                boss.w,
                boss.h
            )
        ) {
            if (bullet.pierce && bullet.pierce > 0) {
                bullet.pierce--;
            } else {
                state.bullets.splice(j, 1);
            }
            damageBoss(bullet.damage);
        }
    }
}


function damagePlayer() {
    // Combo wird bei Treffer zurueckgesetzt
    state.comboCount = 0;
    state.comboMultiplier = 1;
    state.comboTimer = 0;

    if (state.player.shieldTimer > 0) {
        state.player.shieldTimer = 0;
        state.player.invulnerable = 1.2;
        state.screenFlash = 0.35;
        state.screenShake = 10;
        return;
    }

    // Waffen-Level verliert 1 Stufe bei Tod (Katakis-Style)
    state.player.lives--;
    state.player.invulnerable = 1.5;

    // Weapon Downgrade bei Tod
    if (state.player.weaponLevel > 1) {
        state.player.weaponLevel--;
    }

    if (state.player.lives <= 0) {
        state.player.lives = 0;
        state.gameOver = true;
        state.running = false;
    }
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;

    return dx * dx + dy * dy < cr * cr;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
