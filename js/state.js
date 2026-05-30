export const state = {
    running: false,
    paused: false,
    gameOver: false,
    gameOverShown: false,
    stageIndex: 0,
    wave: 1,

    killsThisStage: 0,
    killsForBoss: 15,
    boss: null,
    bossActive: false,
    bossWarning: false,
    bossWarningTimer: 0,

    lastTime: 0,
    score: 0,
    screenFlash: 0,
    screenShake: 0,
    highscore: Number(localStorage.getItem('neonStrikeHighscore') || 0),

    // Combo-System (Katakis-Style)
    comboCount: 0,
    comboTimer: 0,
    comboMultiplier: 1,
    maxCombo: 0,

    // Stage Transition
    stageTransition: false,
    stageTransitionTimer: 0,

    // Formation System
    formationTimer: 0,
    formationWave: 0,

    bullets: [],
    particles: [],
    enemies: [],
    enemyBullets: [],
    powerups: [],

    player: {
        x: 120,
        y: 360,
        w: 66,
        h: 34,
        speed: 440,
        cooldown: 0,
        lives: 3,
        bombs: 3,
        bombCooldown: 0,
        invulnerable: 0,
        weaponType: 'laser',
        weaponTimer: 0,
        rapidTimer: 0,
        shieldTimer: 0,

        // Katakis Weapon Level System
        weaponLevel: 1,       // 1-5, steigert Feuerkraft
        maxWeaponLevel: 5,
        thrustTimer: 0,       // fuer Engine-Flammen
    },
};
