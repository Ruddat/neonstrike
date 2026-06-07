// js/stage-modifiers.js

export const DEFAULT_STAGE_MODIFIERS = {
    heavyChance: 0.12,
    sniperChance: 0.04,
    kamikazeChance: 0.03,
    derpChance: 0.04,
    drunkChance: 0.00,
    wobbleChance: 0.00,

    powerupChance: 0.22,

    enemyBulletSpeed: 1.0,
    droneSpeedBonus: 1.0,
    heavySpeedBonus: 1.0,

    asteroidDrift: false,
    asteroidDensity: 0,

    eliteWave: false,
    miniBoss: false,
};

export function getStageModifiers(stage = {}) {
    return {
        ...DEFAULT_STAGE_MODIFIERS,
        ...(stage.modifiers || {}),
    };
}

export function pickEnemyType(stage, stageIndex) {
    const mods = getStageModifiers(stage);
    const roll = Math.random();

    let cursor = 0;

    cursor += mods.kamikazeChance;
    if (roll < cursor) return 'kamikaze';

    cursor += mods.sniperChance;
    if (roll < cursor) return 'sniper';

    cursor += mods.heavyChance;
    if (roll < cursor) return 'heavy';

    cursor += mods.derpChance;
    if (stageIndex >= 3 && roll < cursor) return 'derp';

    cursor += mods.drunkChance;
    if (stageIndex >= 5 && roll < cursor) return 'drunk';

    cursor += mods.wobbleChance;
    if (stageIndex >= 7 && roll < cursor) return 'wobble';

    return 'drone';
}