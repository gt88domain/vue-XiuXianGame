// ===== 探索地点(前五处来自 vue-idle-xiuxian locations.js, 其后按融合境界扩展) =====

export const locations = [
    { id: 'newbie_village', name: '新手村', description: '灵气稀薄的凡人聚集地，适合初入修仙之道的修士。', minLevel: 1, spiritCost: 20,
        rewards: [
            { type: 'spirit_stone', chance: 0.3, amount: [2, 5] },
            { type: 'herb', chance: 0.3, amount: [1, 2] },
            { type: 'cultivation', chance: 0.2, amount: [3, 8] },
            { type: 'pill_fragment', chance: 0.2, amount: [1, 2] }
        ] },
    { id: 'celestial_mountain', name: '天阙峰', description: '云雾缭绕的仙山，传说是远古仙人讲道之地。', minLevel: 10, spiritCost: 120,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [12, 24] },
            { type: 'herb', chance: 0.3, amount: [3, 6] },
            { type: 'cultivation', chance: 0.25, amount: [30, 60] },
            { type: 'pill_fragment', chance: 0.2, amount: [2, 4] }
        ] },
    { id: 'phoenix_valley', name: '凤凰谷', description: '常年被火焰环绕的神秘山谷，据说有凤凰遗留的道韵。', minLevel: 19, spiritCost: 600,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [40, 80] },
            { type: 'herb', chance: 0.3, amount: [8, 14] },
            { type: 'cultivation', chance: 0.25, amount: [100, 200] },
            { type: 'pill_fragment', chance: 0.2, amount: [5, 8] }
        ] },
    { id: 'dragon_abyss', name: '龙渊', description: '深不见底的神秘深渊，蕴含远古真龙的气息。', minLevel: 28, spiritCost: 2400,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [120, 240] },
            { type: 'herb', chance: 0.3, amount: [18, 30] },
            { type: 'cultivation', chance: 0.25, amount: [320, 640] },
            { type: 'pill_fragment', chance: 0.2, amount: [10, 16] }
        ] },
    { id: 'immortal_realm', name: '仙界入口', description: '传说中通往仙界的神秘之地，充满无尽机缘。', minLevel: 37, spiritCost: 9000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [400, 800] },
            { type: 'herb', chance: 0.3, amount: [50, 90] },
            { type: 'cultivation', chance: 0.25, amount: [1200, 2400] },
            { type: 'pill_fragment', chance: 0.2, amount: [16, 24] }
        ] },
    { id: 'taiyi_palace', name: '太乙紫府', description: '太乙金仙开辟的洞天，紫气东来三万里。', minLevel: 55, spiritCost: 60000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [2200, 4400] },
            { type: 'herb', chance: 0.3, amount: [260, 520] },
            { type: 'cultivation', chance: 0.25, amount: [9000, 18000] },
            { type: 'pill_fragment', chance: 0.2, amount: [40, 70] }
        ] },
    { id: 'daluo_heaven', name: '大罗天', description: '三十三天之上的大罗天境，道音缭绕。', minLevel: 73, spiritCost: 400000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [15000, 30000] },
            { type: 'herb', chance: 0.3, amount: [1800, 3600] },
            { type: 'cultivation', chance: 0.25, amount: [70000, 140000] },
            { type: 'pill_fragment', chance: 0.2, amount: [120, 200] }
        ] },
    { id: 'chaos_sea', name: '混沌海', description: '天地未分之气的海洋，危机与机缘并存。', minLevel: 91, spiritCost: 2600000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [100000, 200000] },
            { type: 'herb', chance: 0.3, amount: [12000, 24000] },
            { type: 'cultivation', chance: 0.25, amount: [500000, 1000000] },
            { type: 'pill_fragment', chance: 0.2, amount: [800, 1400] }
        ] },
    { id: 'primordial_peak', name: '鸿蒙之巅', description: '传说中盘古开天之地，鸿蒙紫气弥漫。', minLevel: 109, spiritCost: 16000000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [650000, 1300000] },
            { type: 'herb', chance: 0.3, amount: [80000, 160000] },
            { type: 'cultivation', chance: 0.25, amount: [3400000, 6800000] },
            { type: 'pill_fragment', chance: 0.2, amount: [5000, 9000] }
        ] },
    { id: 'dao_ancestor_realm', name: '道祖秘境', description: '九天玄仙才能踏足的终极秘境，大道显化。', minLevel: 127, spiritCost: 100000000,
        rewards: [
            { type: 'spirit_stone', chance: 0.25, amount: [4200000, 8400000] },
            { type: 'herb', chance: 0.3, amount: [520000, 1040000] },
            { type: 'cultivation', chance: 0.25, amount: [23000000, 46000000] },
            { type: 'pill_fragment', chance: 0.2, amount: [32000, 60000] }
        ] }
];

export const calcRewardChance = (baseChance, luck = 1) => Math.min(baseChance * luck, 1);
