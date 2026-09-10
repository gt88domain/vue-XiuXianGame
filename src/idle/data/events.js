// ===== 奇遇事件(前八个来自 vue-idle-xiuxian events.js, 后四个为融合新增) =====

export const events = [
    { id: 'ancient_tablet', name: '古老石碑', description: '发现一块刻有上古功法的石碑。', chance: 0.08, good: true },
    { id: 'spirit_spring', name: '灵泉', description: '偶遇一处天然灵泉。', chance: 0.12, good: true },
    { id: 'ancient_master', name: '古修遗府', description: '意外发现一位上古大能的洞府。', chance: 0.03, good: true },
    { id: 'monster_attack', name: '妖兽袭击', description: '遭遇一只实力强大的妖兽。', chance: 0.1, good: false },
    { id: 'cultivation_deviation', name: '走火入魔', description: '修炼出现偏差，走火入魔。', chance: 0.08, good: false },
    { id: 'treasure_trove', name: '秘境宝藏', description: '发现一处上古修士遗留的宝藏。', chance: 0.05, good: true },
    { id: 'enlightenment', name: '顿悟', description: '修炼中突然顿悟。', chance: 0.08, good: true },
    { id: 'qi_deviation', name: '心魔侵扰', description: '遭受心魔侵扰，修为受损。', chance: 0.08, good: false },
    // ---- 融合新增 ----
    { id: 'fortune_teller', name: '算命先生', description: '一位仙风道骨的算命先生为你卜上一卦。(XiuXianGame 算命玩法)', chance: 0.06, good: true },
    { id: 'equip_ruins', name: '炼器遗迹', description: '发现上古炼器师的遗迹，藏着一件法宝。(XiuXianGame 装备玩法)', chance: 0.06, good: true },
    { id: 'spirit_beast', name: '灵兽出没', description: '一只通灵的兽崽在林间玩耍，似乎可以收服。(XiuXianGame 捕宠玩法)', chance: 0.07, good: true },
    { id: 'immortal_checkin', name: '仙缘签到碑', description: '机缘巧合触碰到仙缘碑，领取一份仙缘礼。(XiuXianGame 签到玩法)', chance: 0.05, good: true }
];

// 事件结算: 返回 {type: 'spirit'|'cultivation'|'stones'|'buff'|'battle'|'equip'|'pet'|'checkin', ...}
export const resolveEvent = (evt, playerLevel) => {
    const lv = playerLevel;
    switch (evt.id) {
        case 'ancient_tablet':
            return { type: 'cultivation', amount: Math.floor(30 * (lv / 5 + 1)), text: `领悟石碑功法，获得修为` };
        case 'spirit_spring':
            return { type: 'spirit', amount: Math.floor(60 * (lv / 3 + 1)), text: `饮用灵泉，灵力大增` };
        case 'ancient_master':
            return { type: 'both', spirit: Math.floor(180 * (lv / 2 + 1)), cultivation: Math.floor(120 * (lv / 2 + 1)), text: `获得上古传承！` };
        case 'monster_attack':
            return { type: 'battle', monsterType: 'elite', text: `妖兽袭来，被迫迎战！` };
        case 'cultivation_deviation':
            return { type: 'lose_cultivation', amount: Math.floor(50 * (lv / 3 + 1)), text: `走火入魔，修为倒退` };
        case 'treasure_trove':
            return { type: 'stones', amount: Math.floor(30 * (lv / 2 + 1)), text: `开启宝藏，灵石入袋` };
        case 'enlightenment':
            return { type: 'buff', buff: { type: 'spiritRate', value: 0.05, duration: 300, name: '顿悟' }, cultivation: Math.floor(50 * (lv / 4 + 1)), text: `顿悟！灵力获取速率永久+5%(持续5分钟)` };
        case 'qi_deviation':
            return { type: 'lose_both', amount: Math.floor(60 * (lv / 3 + 1)), text: `心魔侵扰，损失灵力与修为` };
        case 'fortune_teller':
            return { type: 'buff', buff: { type: 'luck', value: 0.5, duration: 120, name: '上上签' }, text: `算得一卦上上签，幸运大增(2分钟)` };
        case 'equip_ruins':
            return { type: 'equip', text: `在遗迹中发现一件装备！` };
        case 'spirit_beast':
            return { type: 'pet', text: `成功收服一只灵兽！` };
        case 'immortal_checkin':
            return { type: 'checkin', text: `仙缘碑赐福！` };
        default:
            return { type: 'spirit', amount: 10, text: '平平无奇的一天' };
    }
};

// 随机抽取事件
export const rollEvent = () => {
    const total = events.reduce((a, e) => a + e.chance, 0);
    let roll = Math.random() * total;
    for (const e of events) {
        roll -= e.chance;
        if (roll <= 0) return e;
    }
    return null;
};
