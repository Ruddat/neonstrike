export const state = {
    running: false,
    paused: false,
    gameOver: false,
    gameOverShown: false,
    stageIndex: 0,
    maxLevel: 99,
    scrollDirection: 'horizontal', // 'horizontal' oder 'vertical' (1945-Style)
    wave: 1,

    killsThisStage: 0,
    killsForBoss: 25,
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

    // OVERDRIVE Mode (Combo x5+)
    overdrive: false,
    overdriveTimer: 0,
    overdriveGlow: 0,

    // Boss Finisher (Slow-Motion)
    slowMotion: false,
    slowMotionTimer: 0,
    slowMotionFactor: 1,

    // Wave System
    currentWave: 1,
    totalWaves: 5,
    waveKills: 0,
    waveKillsNeeded: 8,
    waveTransition: false,
    waveTransitionTimer: 0,

    // Stage Transition
    stageTransition: false,
    stageTransitionTimer: 0,

    // Direction Change Transition (horizontal ↔ vertical)
    directionChange: false,
    directionChangeTimer: 0,
    prevScrollDirection: 'horizontal',

    // Hyperspace Jump (nach Boss-Kill)
    hyperspaceJump: false,
    hyperspaceTimer: 0,
    warpStars: [],

    // Formation System
    formationTimer: 0,
    formationWave: 0,

    // Victory condition
    victory: false,

    // Highscore List
    highscores: [],

    // Name Entry
    nameEntry: false,
    nameChars: ['A', 'A', 'A'],
    nameCursor: 0,
    pendingHighscore: null,

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
        maxBombs: 5,
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

        // Bomb Fragment System: 3 Fragmente = 1 Bombe
        bombFragments: 0,
        maxBombFragments: 3,
        shakeTimer: 0,

        // Shield-Bash
        shieldBashCooldown: 0,
        shieldBashActive: false,
        shieldBashTimer: 0,
    },
};
