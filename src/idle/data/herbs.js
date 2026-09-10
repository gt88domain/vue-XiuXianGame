// ===== 灵草系统(完整移植 vue-idle-xiuxian herbs.js) =====

export const herbQualities = {
    common:    { name: '普通', value: 1, color: '#9e9e9e' },
    uncommon:  { name: '优质', value: 1.5, color: '#4caf50' },
    rare:      { name: '稀有', value: 2, color: '#2196f3' },
    epic:      { name: '极品', value: 3, color: '#9c27b0' },
    legendary: { name: '仙品', value: 5, color: '#ff9800' }
};

export const herbs = [
    { id: 'spirit_grass', name: '灵精草', description: '最常见的灵草，蕴含少量灵气', baseValue: 10, category: 'spirit', chance: 0.4 },
    { id: 'cloud_flower', name: '云雾花', description: '生长在云雾缭绕处的灵花，有助于修炼', baseValue: 15, category: 'cultivation', chance: 0.3 },
    { id: 'thunder_root', name: '雷击根', description: '经过雷霆淬炼的灵根，蕴含强大能量', baseValue: 25, category: 'attribute', chance: 0.15 },
    { id: 'dragon_breath_herb', name: '龙息草', description: '吸收龙气孕育的灵草，极为珍贵', baseValue: 40, category: 'special', chance: 0.1 },
    { id: 'immortal_jade_grass', name: '仙玉草', description: '传说中生长在仙境的灵草，可遇不可求', baseValue: 60, category: 'special', chance: 0.05 },
    { id: 'dark_yin_grass', name: '玄阴草', description: '生长在阴暗处的奇特灵草', baseValue: 30, category: 'spirit', chance: 0.2 },
    { id: 'nine_leaf_lingzhi', name: '九叶灵芝', description: '传说中的灵芝，蕴含强大的生命力', baseValue: 45, category: 'cultivation', chance: 0.12 },
    { id: 'purple_ginseng', name: '紫金参', description: '千年紫参，大补元气', baseValue: 50, category: 'attribute', chance: 0.08 },
    { id: 'frost_lotus', name: '寒霜莲', description: '生长在极寒之地的莲花', baseValue: 55, category: 'spirit', chance: 0.07 },
    { id: 'fire_heart_flower', name: '火心花', description: '生长在火山口的奇花', baseValue: 35, category: 'attribute', chance: 0.15 },
    { id: 'moonlight_orchid', name: '月华兰', description: '只在月圆之夜绽放的神秘兰花', baseValue: 70, category: 'spirit', chance: 0.04 },
    { id: 'sun_essence_flower', name: '日精花', description: '吸收太阳精华的奇花，蕴含纯阳之力', baseValue: 75, category: 'cultivation', chance: 0.03 },
    { id: 'five_elements_grass', name: '五行草', description: '一株草同时具备五行属性的奇珍', baseValue: 80, category: 'attribute', chance: 0.02 },
    { id: 'phoenix_feather_herb', name: '凤羽草', description: '传说生长在不死火凤栖息地的神草', baseValue: 85, category: 'special', chance: 0.015 },
    { id: 'celestial_dew_grass', name: '天露草', description: '凝聚天地精华的仙草，千年一遇', baseValue: 90, category: 'special', chance: 0.01 }
];

export const herbById = id => herbs.find(h => h.id === id);

export const getHerbValue = (herb, quality) => Math.floor(herb.baseValue * herbQualities[quality].value);

// 随机获取一株灵草(含品质)
export const getRandomHerb = luck => {
    const rand = Math.random() / Math.max(luck, 0.5);
    let cumulative = 0;
    let herb = null;
    for (const h of herbs) {
        cumulative += h.chance;
        if (rand <= cumulative) { herb = h; break; }
    }
    herb = herb || herbs[0];
    const qrand = Math.random();
    let quality;
    if (qrand < 0.5) quality = 'common';
    else if (qrand < 0.8) quality = 'uncommon';
    else if (qrand < 0.95) quality = 'rare';
    else if (qrand < 0.99) quality = 'epic';
    else quality = 'legendary';
    return { id: herb.id, name: herb.name, quality, value: getHerbValue(herb, quality), category: herb.category };
};
