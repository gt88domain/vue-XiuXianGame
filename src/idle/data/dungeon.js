// ===== 秘境副本(roguelike 玩法与选项池来自 vue-idle-xiuxian dungeon.js + dungeonBuffs.js) =====

export const DIFFICULTIES = {
    1: { name: '初试', healthMod: 0.75, damageMod: 0.7, rewardMod: 0.8, minLevel: 3, floors: 5, entrySeconds: 45 },
    2: { name: '普通', healthMod: 1.0, damageMod: 1.0, rewardMod: 1.0, minLevel: 10, floors: 7, entrySeconds: 90 },
    3: { name: '困难', healthMod: 1.2, damageMod: 1.2, rewardMod: 1.5, minLevel: 28, floors: 9, entrySeconds: 150 },
    4: { name: '炼狱', healthMod: 1.5, damageMod: 1.5, rewardMod: 2.0, minLevel: 55, floors: 10, entrySeconds: 240 }
};

export const MAX_FLOOR = 10;

// roguelike 三选一强化池
export const BUFF_OPTIONS = [
    { id: 'heal', name: '回春', description: '恢复50%生命', rarity: 'common',
        apply: p => { p.runHealth = Math.min(p.maxHealth, p.runHealth + p.maxHealth * 0.5); } },
    { id: 'small_buff', name: '小幅强化', description: '伤害+10%', rarity: 'common',
        apply: p => { p.runStats.finalDamageBoost = (p.runStats.finalDamageBoost || 0) + 0.1; } },
    { id: 'defense_boost', name: '铁壁', description: '防御+20%', rarity: 'common',
        apply: p => { p.runStats.defense = Math.floor((p.runStats.defense || 5) * 1.2); } },
    { id: 'speed_boost', name: '疾风', description: '速度+15%', rarity: 'common',
        apply: p => { p.runStats.speed = Math.floor((p.runStats.speed || 10) * 1.15); } },
    { id: 'crit_boost', name: '会心', description: '暴击率+15%', rarity: 'rare',
        apply: p => { p.runStats.critRate = (p.runStats.critRate || 0) + 0.15; } },
    { id: 'vampire', name: '嗜血', description: '吸血率+10%', rarity: 'rare',
        apply: p => { p.runStats.vampireRate = (p.runStats.vampireRate || 0) + 0.1; } },
    { id: 'combo', name: '连斩', description: '连击率+12%', rarity: 'rare',
        apply: p => { p.runStats.comboRate = (p.runStats.comboRate || 0) + 0.12; } },
    { id: 'counter', name: '以牙还牙', description: '反击率+15%', rarity: 'rare',
        apply: p => { p.runStats.counterRate = (p.runStats.counterRate || 0) + 0.15; } },
    { id: 'max_health', name: '体魄', description: '生命上限+25%并回满', rarity: 'rare',
        apply: p => { p.maxHealth = Math.floor(p.maxHealth * 1.25); p.runHealth = p.maxHealth; } },
    { id: 'dodge', name: '凌波微步', description: '闪避率+12%', rarity: 'rare',
        apply: p => { p.runStats.dodgeRate = (p.runStats.dodgeRate || 0) + 0.12; } },
    { id: 'stun', name: '震山掌', description: '眩晕率+10%', rarity: 'rare',
        apply: p => { p.runStats.stunRate = (p.runStats.stunRate || 0) + 0.1; } },
    { id: 'final_damage', name: '大道无形', description: '最终增伤+20%', rarity: 'epic',
        apply: p => { p.runStats.finalDamageBoost = (p.runStats.finalDamageBoost || 0) + 0.2; } },
    { id: 'final_reduce', name: '金身不坏', description: '最终减伤+15%', rarity: 'epic',
        apply: p => { p.runStats.finalDamageReduce = Math.min(0.6, (p.runStats.finalDamageReduce || 0) + 0.15); } },
    { id: 'combat_all', name: '战意昂扬', description: '战斗属性全面提升+15%', rarity: 'epic',
        apply: p => { p.runStats.combatBoost = (p.runStats.combatBoost || 0) + 0.15; } },
    { id: 'lifesteal_battle', name: '血魔大法', description: '吸血+15%、攻击+15%', rarity: 'epic',
        apply: p => { p.runStats.vampireRate = (p.runStats.vampireRate || 0) + 0.15; p.runStats.attack = Math.floor(p.runStats.attack * 1.15); } },
    { id: 'resist_all', name: '百邪不侵', description: '抗性全面提升+20%', rarity: 'epic',
        apply: p => { p.runStats.resistanceBoost = (p.runStats.resistanceBoost || 0) + 0.2; } }
];

export const rollBuffOptions = count => {
    const pool = [...BUFF_OPTIONS];
    const out = [];
    for (let i = 0; i < count && pool.length; i++) {
        out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
};
