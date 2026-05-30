export const stages = [
    {
        id: 1,
        name: 'Orbital Frontier',
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
        colors: {
            top: '#190019',
            mid: '#3b0764',
            bottom: '#020617',
        },
        enemySpeed: 1.95,
        enemyTypes: ['drone', 'heavy'],
        bossName: 'Omega Prime',
    },
];

export function getStage(index) {
    return stages[index % stages.length];
}