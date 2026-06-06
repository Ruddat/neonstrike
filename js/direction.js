/**
 * Direction Helper Module
 * 
 * Bietet richtungsabhaengige Konstanten und Hilfsfunktionen,
 * um horizontalen und vertikalen Scroll-Modus zu unterstützen.
 * 
 * Horizontal: Spieler links, Gegner von rechts, Bullets horizontal
 * Vertical (1945-Style): Spieler unten, Gegner von oben, Bullets vertikal
 */
import { CONFIG } from './config.js';
import { state } from './state.js';

// Aktuelle Scroll-Richtung aus dem State lesen
export function isVertical() {
    return state.scrollDirection === 'vertical';
}

export function isHorizontal() {
    return !isVertical();
}

// ===================== PLAYER =====================

/** Start-Position des Spielers */
export function playerStartX() {
    return isVertical() ? CONFIG.width / 2 : 120;
}

export function playerStartY() {
    return isVertical() ? CONFIG.height - 80 : CONFIG.height / 2;
}

/** Bewegungs-Bereich des Spielers */
export function playerMinX() {
    return isVertical() ? 44 : 34;
}

export function playerMaxX() {
    return isVertical() ? CONFIG.width - 44 : CONFIG.width * 0.52;
}

export function playerMinY() {
    return isVertical() ? CONFIG.height * 0.45 : 44;
}

export function playerMaxY() {
    return isVertical() ? CONFIG.height - 44 : CONFIG.height - 44;
}

// ===================== SPAWN =====================

/** Spawn-Position fuer Gegner (ausserhalb des Bildschirms) */
export function spawnX() {
    return isVertical() ? Math.random() * (CONFIG.width - 160) + 80 : CONFIG.width + 80;
}

export function spawnY() {
    return isVertical() ? -80 : 70 + Math.random() * (CONFIG.height - 140);
}

/** Formation-Spawn-Position X mit Offset */
export function formationSpawnX(offset) {
    return isVertical() ? 80 + offset * 60 : CONFIG.width + 80 + offset * 65;
}

/** Formation-Spawn-Position Y mit Offset */
export function formationSpawnY(baseY, offset) {
    return isVertical() ? -80 - offset * 50 : baseY + offset;
}

// ===================== MOVEMENT =====================

/** Haupt-Bewegungsrichtung fuer Standard-Gegner (negative = gegen den Spieler) */
export function moveX(enemy, dt) {
    if (isVertical()) {
        enemy.y += enemy.speed * dt;
    } else {
        enemy.x -= enemy.speed * dt;
    }
}

/** Gegner ausserhalb des Bildschirms? (zum Entfernen) */
export function isOutOfBounds(enemy) {
    if (isVertical()) {
        return enemy.y > CONFIG.height + 120;
    }
    return enemy.x < -120 || enemy.x > CONFIG.width + 120;
}

// ===================== BULLETS =====================

/** Spieler-Geschoss Grundgeschwindigkeit */
export function bulletVx(isRear) {
    if (isVertical()) return 0;
    return isRear ? -780 : 780;
}

export function bulletVy(spread) {
    if (isVertical()) return spread || -780;
    return spread || 0;
}

/** Gegner-Geschoss Grundrichtung (Richtung Spieler) */
export function enemyBulletBaseVx(speedMul) {
    return isVertical() ? 0 : -310 * speedMul;
}

export function enemyBulletBaseVy(speedMul) {
    return isVertical() ? 310 * speedMul : 0;
}

/** Geschoss-Start-Offset vom Spieler (Mündung) */
export function bulletOffsetX() {
    return isVertical() ? 0 : 48;
}

export function bulletOffsetY() {
    return isVertical() ? -48 : 0;
}

/** Feuerrichtungs-Winkel fuer Spread-Waffen */
export function spreadAngle() {
    // Bei vertikal: Schuesse nach oben mit horizontalem Spread
    // Bei horizontal: Schuesse nach rechts mit vertikalem Spread
    return isVertical() ? -Math.PI / 2 : 0;
}

/** Haupt-Flugrichtung als Vektor (normalisiert) */
export function mainDirectionX() {
    return isVertical() ? 0 : 1;
}

export function mainDirectionY() {
    return isVertical() ? -1 : 0;
}

// ===================== BOSS =====================

/** Boss Spawn-Position */
export function bossSpawnX() {
    return isVertical() ? CONFIG.width / 2 : CONFIG.width + 230;
}

export function bossSpawnY() {
    return isVertical() ? -200 : CONFIG.height / 2;
}

/** Boss Ziel-Position (wo er sich positioniert) */
export function bossTargetX() {
    return isVertical() ? CONFIG.width / 2 : CONFIG.width - 220;
}

export function bossTargetY() {
    return isVertical() ? 160 : CONFIG.height / 2;
}

/** Boss Einflieg-Richtung */
export function bossFlyInX(boss, dt) {
    if (isVertical()) return; // X ist schon korrekt
    if (boss.x > boss.targetX) {
        boss.x -= 130 * dt;
    }
}

export function bossFlyInY(boss, dt) {
    if (!isVertical()) return; // Y ist schon korrekt
    if (boss.y < boss.targetY) {
        boss.y += 130 * dt;
    }
}

/** Boss Bewegungsgrenzen */
export function bossMinX() {
    return isVertical() ? 200 : CONFIG.width * 0.55;
}

export function bossMaxX() {
    return isVertical() ? CONFIG.width - 200 : CONFIG.width - 140;
}

export function bossMinY() {
    return isVertical() ? 80 : 100;
}

export function bossMaxY() {
    return isVertical() ? CONFIG.height * 0.35 : CONFIG.height - 100;
}

/** Boss Schuss-Startposition */
export function bossBulletX(boss) {
    return isVertical() ? boss.x : boss.x - 120;
}

export function bossBulletY(boss) {
    return isVertical() ? boss.y + 100 : boss.y;
}

// ===================== BACKGROUND =====================

/** Parallax-Scroll-Richtung */
export function bgScrollX(speed, dt) {
    return isVertical() ? 0 : -speed * dt;
}

export function bgScrollY(speed, dt) {
    return isVertical() ? speed * dt : 0;
}

/** Wrap-Position wenn Element aus dem Bild scrollt */
export function bgWrapX(element) {
    if (isVertical()) return; // Kein horizontales Wrap bei vertikal
    if (element.x < -element.size - 80) {
        element.x = CONFIG.width + Math.random() * 300;
        element.y = 80 + Math.random() * (CONFIG.height - 160);
        return true;
    }
    return false;
}

export function bgWrapY(element) {
    if (!isVertical()) return; // Kein vertikales Wrap bei horizontal
    if (element.y > CONFIG.height + 80) {
        element.y = -80 - Math.random() * 100;
        element.x = Math.random() * CONFIG.width;
        return true;
    }
    return false;
}

export function bgWrapXSimple(element, extra) {
    if (isVertical()) return false;
    if (element.x < -(extra || 5)) {
        element.x = CONFIG.width + Math.random() * 40;
        element.y = Math.random() * CONFIG.height;
        return true;
    }
    return false;
}

export function bgWrapYSimple(element, extra) {
    if (!isVertical()) return false;
    if (element.y > CONFIG.height + (extra || 5)) {
        element.y = -(extra || 5) - Math.random() * 40;
        element.x = Math.random() * CONFIG.width;
        return true;
    }
    return false;
}

// ===================== POWERUPS =====================

/** Powerup Drift-Richtung */
export function powerupDriftX(speed, dt) {
    return isVertical() ? Math.sin(0) * speed * dt : -speed * dt;
}

export function powerupDriftY(t) {
    return Math.sin(t * 5) * 0.55;
}

export function isPowerupOutOfBounds(p) {
    if (isVertical()) {
        return p.y > CONFIG.height + 40;
    }
    return p.x < -40;
}

// ===================== TOUCH =====================

/** Joystick-Bereich (linke Haelfte horizontal, untere Haelfte vertikal) */
export function joystickZone(cx) {
    if (isVertical()) {
        return cx < CONFIG.width; // Ganze Breite ist Joystick-Zone im vertikalen Modus
    }
    return cx < CONFIG.width * 0.45;
}

// ===================== THRUST =====================

/** Thrust-Partikel Offset (hinter dem Schiff) */
export function thrustOffsetX(playerX) {
    return isVertical() ? playerX : playerX - 40;
}

export function thrustOffsetY(playerY) {
    return isVertical() ? playerY + 40 : playerY;
}
