// ===== 灵宠系统(名称与稀有度来自 vue-idle-xiuxian Gacha.vue, 捕捉玩法来自 vue-XiuXianGame) =====

export const RARITIES = {
    divine:    { name: '神品', color: '#FF4D4F', probability: 0.02, essence: 50, base: 6 },
    celestial: { name: '仙品', color: '#FFD700', probability: 0.08, essence: 30, base: 4.5 },
    mystic:    { name: '玄品', color: '#9932CC', probability: 0.15, essence: 20, base: 3.5 },
    spiritual: { name: '灵品', color: '#1E90FF', probability: 0.25, essence: 10, base: 2.5 },
    mortal:    { name: '凡品', color: '#32CD32', probability: 0.5,  essence: 5,  base: 1.6 }
};

// 灵宠池(vue-idle-xiuxian)
export const PET_POOL = {
    divine: [
        { name: '玄武', description: '北方守护神兽' },
        { name: '白虎', description: '西方守护神兽' },
        { name: '朱雀', description: '南方守护神兽' },
        { name: '青龙', description: '东方守护神兽' },
        { name: '应龙', description: '上古神龙，掌控风雨' },
        { name: '麒麟', description: '祥瑞之兽，通晓万物' },
        { name: '饕餮', description: '贪婪之兽，吞噬万物' },
        { name: '穷奇', description: '邪恶之兽，象征混乱' },
        { name: '梼杌', description: '凶暴之兽，顽固不化' },
        { name: '混沌', description: '无序之兽，无形无相' }
    ],
    celestial: [
        { name: '囚牛', description: '龙之长子，喜好音乐' },
        { name: '睚眦', description: '龙之次子，嗜杀好斗' },
        { name: '嘲风', description: '龙之三子，喜好冒险' },
        { name: '蒲牢', description: '龙之四子，性好鸣' },
        { name: '狻犴', description: '龙之五子，喜静好坐' },
        { name: '霸下', description: '龙之六子，力大无穷' },
        { name: '狴犴', description: '龙之七子，明辨是非' },
        { name: '负屃', description: '龙之八子，雅好诗文' },
        { name: '螭吻', description: '龙之九子，能吞火' }
    ],
    mystic: [
        { name: '火凤凰', description: '浴火重生的永恒之鸟' },
        { name: '雷鹰', description: '雷电的猛禽' },
        { name: '冰狼', description: '冰原霸主' },
        { name: '岩龟', description: '坚不可摧的守护者' }
    ],
    spiritual: [
        { name: '玄龟', description: '擅长防御的水系灵宠' },
        { name: '风隼', description: '速度极快的飞行灵宠' },
        { name: '地甲', description: '坚固的大地守护者' },
        { name: '云豹', description: '敏捷的猎手' }
    ],
    mortal: [
        { name: '灵猫', description: '敏捷的小型灵宠' },
        { name: '幻蝶', description: '美丽的蝴蝶灵宠' },
        { name: '火鼠', description: '活泼的啮齿类灵宠' },
        { name: '草兔', description: '温顺的兔类灵宠' }
    ]
};

// 生成灵宠
export const genPet = (rarity = null, level = 1) => {
    if (!rarity) {
        const roll = Math.random();
        let acc = 0;
        for (const [r, cfg] of Object.entries(RARITIES)) {
            acc += cfg.probability;
            if (roll <= acc) { rarity = r; break; }
        }
        rarity = rarity || 'mortal';
    }
    // 70% 从本稀有度池取名, 30% 借用其他池的名字(惊喜)
    const ownPool = PET_POOL[rarity] || [];
    const pool = (ownPool.length && Math.random() < 0.7) ? ownPool : Object.values(PET_POOL).flat();
    const base = pool[Math.floor(Math.random() * pool.length)];
    const cfg = RARITIES[rarity];
    const scale = cfg.base * (1 + level * 0.04);
    const critBase = rarity === 'divine' ? 0.08 : rarity === 'celestial' ? 0.05 : 0.03;
    return {
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
        type: 'pet',
        name: base.name,
        description: base.description,
        rarity,
        star: 1,
        level: 1,
        // 加成属性
        bonus: {
            attack: Math.floor(scale * 10),
            health: Math.floor(scale * 60),
            defense: Math.floor(scale * 5),
            speed: Math.floor(scale * 2),
            critRate: Math.round(critBase * 1000) / 1000,
            combatBoost: Math.round((0.02 * (cfg.base / 1.6)) * 1000) / 1000
        }
    };
};

// 升级消耗精华
export const petUpgradeCost = pet => 5 + pet.level * 2;

// 放出战宠加成(升星放大)
export const petBonuses = pet => {
    if (!pet) return null;
    const mult = 1 + (pet.star - 1) * 0.3 + (pet.level - 1) * 0.05;
    const out = {};
    Object.entries(pet.bonus).forEach(([k, v]) => { out[k] = Math.round(v * mult * 1000) / 1000; });
    return out;
};
