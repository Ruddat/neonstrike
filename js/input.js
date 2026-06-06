export const keys = new Set();

export const mouse = {
    x: 120,
    y: 360,
    left: false,
    right: false,
    inside: false,
};

// ===================== TOUCH CONTROLS =====================
export const touch = {
    active: false,         // Touch-Modus aktiv (Handy)
    joyX: 0,              // Joystick X (-1 bis 1)
    joyY: 0,              // Joystick Y (-1 bis 1)
    fire: false,           // Feuer-Button gedrueckt
    bomb: false,           // Bomben-Button gedrueckt
    shieldBash: false,     // Shield-Bash-Button gedrueckt
    joystickTouchId: null, // Touch-ID des Joystick-Fingers
    fireTouchId: null,     // Touch-ID des Feuer-Fingers
    bombTouchId: null,     // Touch-ID des Bomben-Fingers
    shieldBashTouchId: null, // Touch-ID des Shield-Bash-Fingers
    joyOriginX: 0,        // Joystick-Ursprung X (Canvas-Koordinaten)
    joyOriginY: 0,        // Joystick-Ursprung Y
    joyKnobX: 0,          // Joystick-Knopf X
    joyKnobY: 0,          // Joystick-Knopf Y
    joyActive: false,      // Joystick wird gerade bedient
};

// Button-Positionen (wird in initInput berechnet)
let fireBtn = { x: 0, y: 0, r: 0 };
let bombBtn = { x: 0, y: 0, r: 0 };
let shieldBashBtn = { x: 0, y: 0, r: 0 };
let pauseBtn = { x: 0, y: 0, r: 0 };

// Mobile-Detection
// Verwendet (hover: none) um echte Mobilgeräte (Handy/Tablet) von
// Touchscreen-Laptops zu unterscheiden. Touchscreen-Laptops haben eine
// Maus und können hover, daher liefert (hover: none) dort false.
export function isMobile() {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasNoHover = window.matchMedia('(hover: none)').matches;
    return hasTouch && hasNoHover;
}

let pausePressed = false;
let fullscreenPressed = false;

export function consumePause() {
    if (pausePressed) {
        pausePressed = false;
        return true;
    }
    return false;
}

export function consumeFullscreen() {
    if (fullscreenPressed) {
        fullscreenPressed = false;
        return true;
    }
    return false;
}

function updateButtonPositions(canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Feuer-Button: Unten rechts, gross
    fireBtn = { x: w - 120, y: h - 100, r: 60 };

    // Bomben-Button: Ueber dem Feuer-Button
    bombBtn = { x: w - 120, y: h - 230, r: 44 };

    // Shield-Bash Button: Links neben dem Feuer-Button
    shieldBashBtn = { x: w - 240, y: h - 100, r: 38 };

    // Pause-Button: Oben rechts klein
    pauseBtn = { x: w - 44, y: 44, r: 22 };
}

// Export fuer Zeichnen der Touch-Controls
export function getTouchButtons() {
    return { fireBtn, bombBtn, shieldBashBtn, pauseBtn };
}

export function initInput(canvas) {
    // Touch-Modus erkennen
    touch.active = isMobile();

    // Button-Positionen berechnen
    updateButtonPositions(canvas);

    // ===================== KEYBOARD =====================
    window.addEventListener('keydown', (event) => {
        keys.add(event.code);

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
            event.preventDefault();
        }

        if (event.code === 'KeyP') {
            pausePressed = true;
            event.preventDefault();
        }

        if (event.code === 'KeyF') {
            fullscreenPressed = true;
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        keys.delete(event.code);
    });

    // ===================== MOUSE =====================
    canvas.addEventListener('mousemove', (event) => {
        // Wenn eine echte Maus bewegt wird, Touch-Modus deaktivieren
        // (falls z.B. ein Touchscreen-Laptop versehentlich als Mobil erkannt wurde)
        if (touch.active) {
            touch.active = false;
            touch.joyActive = false;
            touch.fire = false;
            touch.bomb = false;
            touch.joystickTouchId = null;
            touch.fireTouchId = null;
            touch.bombTouchId = null;
        }
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
        mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
        mouse.inside = true;
    });

    canvas.addEventListener('mousedown', (event) => {
        if (touch.active) return;
        if (event.button === 0) mouse.left = true;
        if (event.button === 2) mouse.right = true;
        mouse.inside = true;
    });

    canvas.addEventListener('mouseup', (event) => {
        if (touch.active) return;
        if (event.button === 0) mouse.left = false;
        if (event.button === 2) mouse.right = false;
    });

    canvas.addEventListener('mouseleave', () => {
        if (touch.active) return;
        mouse.inside = false;
        mouse.left = false;
        mouse.right = false;
    });

    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // ===================== TOUCH =====================
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        // Touch-Modus nur auf echten Mobilgeräten aktivieren,
        // nicht auf Touchscreen-Laptops (die isMobile() korrekt als false erkennt)
        if (isMobile()) {
            touch.active = true;
        }

        for (const t of event.changedTouches) {
            const rect = canvas.getBoundingClientRect();
            const cx = ((t.clientX - rect.left) / rect.width) * canvas.width;
            const cy = ((t.clientY - rect.top) / rect.height) * canvas.height;

            // Pause-Button checken (oberste Prioritaet)
            if (dist(cx, cy, pauseBtn.x, pauseBtn.y) < pauseBtn.r + 12) {
                pausePressed = true;
                continue;
            }

            // Feuer-Button checken
            if (touch.fireTouchId === null && dist(cx, cy, fireBtn.x, fireBtn.y) < fireBtn.r + 12) {
                touch.fireTouchId = t.identifier;
                touch.fire = true;
                continue;
            }

            // Bomben-Button checken
            if (touch.bombTouchId === null && dist(cx, cy, bombBtn.x, bombBtn.y) < bombBtn.r + 12) {
                touch.bombTouchId = t.identifier;
                touch.bomb = true;
                continue;
            }

            // Shield-Bash-Button checken
            if (touch.shieldBashTouchId === null && dist(cx, cy, shieldBashBtn.x, shieldBashBtn.y) < shieldBashBtn.r + 12) {
                touch.shieldBashTouchId = t.identifier;
                touch.shieldBash = true;
                continue;
            }

            // Joystick: Linke Haelfte des Bildschirms
            if (touch.joystickTouchId === null && cx < canvas.width * 0.45) {
                touch.joystickTouchId = t.identifier;
                touch.joyActive = true;
                touch.joyOriginX = cx;
                touch.joyOriginY = cy;
                touch.joyKnobX = cx;
                touch.joyKnobY = cy;
                touch.joyX = 0;
                touch.joyY = 0;
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();

        for (const t of event.changedTouches) {
            if (t.identifier === touch.joystickTouchId) {
                const rect = canvas.getBoundingClientRect();
                const cx = ((t.clientX - rect.left) / rect.width) * canvas.width;
                const cy = ((t.clientY - rect.top) / rect.height) * canvas.height;

                touch.joyKnobX = cx;
                touch.joyKnobY = cy;

                // Delta berechnen und normalisieren
                const dx = cx - touch.joyOriginX;
                const dy = cy - touch.joyOriginY;
                const maxDist = 90; // Maximaler Joystick-Radius
                const d = Math.hypot(dx, dy);

                if (d > maxDist) {
                    touch.joyX = (dx / d);
                    touch.joyY = (dy / d);
                } else {
                    touch.joyX = dx / maxDist;
                    touch.joyY = dy / maxDist;
                }
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (event) => {
        event.preventDefault();

        for (const t of event.changedTouches) {
            if (t.identifier === touch.joystickTouchId) {
                touch.joystickTouchId = null;
                touch.joyActive = false;
                touch.joyX = 0;
                touch.joyY = 0;
                touch.joyKnobX = touch.joyOriginX;
                touch.joyKnobY = touch.joyOriginY;
            }

            if (t.identifier === touch.fireTouchId) {
                touch.fireTouchId = null;
                touch.fire = false;
            }

            if (t.identifier === touch.bombTouchId) {
                touch.bombTouchId = null;
                touch.bomb = false;
            }

            if (t.identifier === touch.shieldBashTouchId) {
                touch.shieldBashTouchId = null;
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (event) => {
        event.preventDefault();

        for (const t of event.changedTouches) {
            if (t.identifier === touch.joystickTouchId) {
                touch.joystickTouchId = null;
                touch.joyActive = false;
                touch.joyX = 0;
                touch.joyY = 0;
            }

            if (t.identifier === touch.fireTouchId) {
                touch.fireTouchId = null;
                touch.fire = false;
            }

            if (t.identifier === touch.bombTouchId) {
                touch.bombTouchId = null;
                touch.bomb = false;
            }

            if (t.identifier === touch.shieldBashTouchId) {
                touch.shieldBashTouchId = null;
            }
        }
    }, { passive: false });
}

function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}