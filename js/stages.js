export const stages = [
    {
        id: 1,
        name: 'Orbital Frontier',
        scrollDirection: 'horizontal',
        colors: {
            top: '#020617',
            mid: '#061029',
            bottom: '#14071f',
        },
        enemySpeed: 1,
        enemyTypes: ['drone'],
        bossName: 'Dread Cruiser',
    },
    {
        id: 2,
        name: 'Asteroid Graveyard',
        scrollDirection: 'horizontal',
        colors: {
            top: '#1a0f07',
            mid: '#2a1208',
            bottom: '#120609',
        },
        enemySpeed: 1.12,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Titan Miner',
    },
    {
        id: 3,
        name: 'Cyber Grid',
        scrollDirection: 'horizontal',
        colors: {
            top: '#070b1c',
            mid: '#111827',
            bottom: '#240533',
        },
        enemySpeed: 1.2,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Neon Overlord',
    },
    {
        id: 4,
        name: 'Ruined Station',
        scrollDirection: 'horizontal',
        colors: {
            top: '#111827',
            mid: '#1f2937',
            bottom: '#020617',
        },
        enemySpeed: 1.28,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Station Warden',
    },
    {
        id: 5,
        name: 'Nebula Rift',
        scrollDirection: 'horizontal',
        colors: {
            top: '#160f29',
            mid: '#312e81',
            bottom: '#020617',
        },
        enemySpeed: 1.36,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Mist Serpent',
    },
    {
        id: 6,
        name: 'Alien Hive',
        scrollDirection: 'horizontal',
        colors: {
            top: '#052e16',
            mid: '#14532d',
            bottom: '#020617',
        },
        enemySpeed: 1.45,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Hive Queen',
    },
    {
        id: 7,
        name: 'Machine Core',
        scrollDirection: 'horizontal',
        colors: {
            top: '#0f172a',
            mid: '#334155',
            bottom: '#020617',
        },
        enemySpeed: 1.55,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Core Sentinel',
    },
    {
        id: 8,
        name: 'Solar Inferno',
        scrollDirection: 'horizontal',
        colors: {
            top: '#431407',
            mid: '#7c2d12',
            bottom: '#020617',
        },
        enemySpeed: 1.65,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Solar Reaper',
    },
    {
        id: 9,
        name: 'Void Sector',
        scrollDirection: 'horizontal',
        colors: {
            top: '#020617',
            mid: '#09090b',
            bottom: '#1e1b4b',
        },
        enemySpeed: 1.78,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Void Phantom',
    },
    {
        id: 10,
        name: 'Omega Citadel',
        scrollDirection: 'horizontal',
        colors: {
            top: '#190019',
            mid: '#3b0764',
            bottom: '#020617',
        },
        enemySpeed: 1.95,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Omega Prime',
    },
    // ===================== LEVEL 11-15 (Richtung dynamisch via getScrollDirection) =====================
    {
        id: 11,
        name: 'Pacific Storm',
        scrollDirection: 'horizontal', // Wird von getScrollDirection() überschrieben
        colors: {
            top: '#071a3e',
            mid: '#0c2d5e',
            bottom: '#051530',
        },
        enemySpeed: 1.0,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Yamato Core',
    },
    {
        id: 12,
        name: 'Island Fortress',
        scrollDirection: 'horizontal',
        colors: {
            top: '#0a2e1a',
            mid: '#14532d',
            bottom: '#051a0e',
        },
        enemySpeed: 1.12,
        enemyTypes: ['drone', 'heavy', 'sniper'],
        bossName: 'Bunker Kaiser',
    },
    {
        id: 13,
        name: 'Dogfight Alley',
        scrollDirection: 'horizontal',
        colors: {
            top: '#2a1208',
            mid: '#7c2d12',
            bottom: '#1a0a04',
        },
        enemySpeed: 1.25,
        enemyTypes: ['drone', 'heavy', 'kamikaze'],
        bossName: 'Ace Phantom',
    },
    {
        id: 14,
        name: 'Carrier Assault',
        scrollDirection: 'horizontal',
        colors: {
            top: '#1a0a2e',
            mid: '#3b0764',
            bottom: '#0a0418',
        },
        enemySpeed: 1.4,
        enemyTypes: ['drone', 'heavy', 'flanker'],
        bossName: 'Leviathan',
    },
    {
        id: 15,
        name: 'Final Intercept',
        scrollDirection: 'horizontal',
        colors: {
            top: '#2e0a0a',
            mid: '#7f1d1d',
            bottom: '#180404',
        },
        enemySpeed: 1.6,
        enemyTypes: ['drone', 'heavy', 'kamikaze', 'sniper'],
        bossName: 'Project 1945',
    },
];

/** Scroll-Richtung basierend auf Level-Nummer: alle 5 Level wechselnd */
export function getScrollDirection(level) {
    const blockIndex = Math.floor((level - 1) / 5);
    return blockIndex % 2 === 0 ? 'horizontal' : 'vertical';
}

export function getStage(index) {
    const base = stages[index % stages.length];
    const cycle = Math.floor(index / stages.length); // 0 for first 15, 1 for 16-30, etc.
    const level = index + 1;

    // Progressive difficulty: each cycle makes enemies faster and tougher
    const speedBonus = cycle * 0.3;
    const hpBonus = cycle * 2;

    // Scroll-Richtung alle 5 Level wechseln
    const scrollDirection = getScrollDirection(level);

    return {
        ...base,
        id: level,
        level: level,
        name: cycle > 0 ? base.name + ' +' + (cycle + 1) : base.name,
        scrollDirection,
        enemySpeed: base.enemySpeed + speedBonus,
        enemyHpBonus: hpBonus,
        bossHpBonus: cycle * 80,
    };
}
