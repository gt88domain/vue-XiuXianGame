import { getRealm, MAX_LEVEL, economyFactor } from './data/realms';

export const BALANCE_VERSION = 2;
export const CULTIVATION_ACTIONS = 50;
export const ADVENTURE_SHARE = 0.25;
export const layerTrainingSeconds = level => {
    const r = getRealm(level);
    return Math.round((120 + (r.layer - 1) * 30) * Math.min(12, Math.pow(1.65, r.stageIndex)));
};
export const baseSpiritRegen = level => (4 + level * 1.2) * economyFactor(level);
export const freshProgression = level => ({ version: BALANCE_VERSION, adventureLevel: level, adventureCultivation: 0, trials: [] });
export function majorGoals(player, includeEarly = false) {
    const r = getRealm(player.level);
    if ((!includeEarly && r.layer !== 9) || player.level >= MAX_LEVEL) return [];
    const equipment = Object.values(player.equipment).filter(Boolean).length;
    const requiredEquipment = Math.min(8, 3 + Math.floor(r.stageIndex / 2));
    const trial = Math.min(4, 1 + Math.floor(r.stageIndex / 3));
    return [
        { label: `探索历练 ${Math.min(player.counters.explorationCount, 12 * (r.stageIndex + 1))}/${12 * (r.stageIndex + 1)}`, done:player.counters.explorationCount >= 12 * (r.stageIndex + 1), tab:'explore' },
        { label: `穿戴装备 ${Math.min(equipment,requiredEquipment)}/${requiredEquipment}`, done:equipment >= requiredEquipment, tab:'equipment' },
        { label: `通关${['','初试','普通','困难','炼狱'][trial]}秘境`, done:player.progression?.trials?.some(d => d >= trial) || false, tab:'dungeon' }
    ];
}
export const equipmentQualityCeiling = level => Math.min(6, 2 + Math.ceil(getRealm(level).stageIndex / 2));
export const enhancementCeiling = level => Math.min(20, 6 + Math.floor(getRealm(level).stageIndex * 1.5));
