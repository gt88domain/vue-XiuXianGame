// ===== 成就系统(框架来自 vue-XiuXianGame achievement.js, 指标维度参考 vue-idle-xiuxian achievements.js) =====
// 条件类型: counter 计数类 / stat 属性类
// 每个成就: id, name, desc, type, target(数值), reward(灵石), title(称号,可选), titleBonus(佩戴加成)

export const achievements = [
    // ---- 修炼成就 ----
    { id: 'cult_1', name: '初入道途', desc: '突破境界 3 次', cat: '修炼', cond: { counter: 'breakthroughCount', target: 3 }, reward: 200 },
    { id: 'cult_2', name: '小有所成', desc: '突破境界 15 次', cat: '修炼', cond: { counter: 'breakthroughCount', target: 15 }, reward: 1500 },
    { id: 'cult_3', name: '道心坚定', desc: '突破境界 40 次', cat: '修炼', cond: { counter: 'breakthroughCount', target: 40 }, reward: 8000 },
    { id: 'cult_4', name: '金丹大道', desc: '达到金丹期(28级)', cat: '修炼', cond: { counter: 'level', target: 28 }, reward: 3000, title: '金丹真人', titleBonus: { attack: 0.05 } },
    { id: 'cult_5', name: '渡劫飞升', desc: '达到渡劫期(118级)', cat: '修炼', cond: { counter: 'level', target: 118 }, reward: 100000, title: '渡劫天尊', titleBonus: { attack: 0.1, health: 0.1 } },
    { id: 'cult_6', name: '九天玄仙', desc: '达到最高境界(189级)', cat: '修炼', cond: { counter: 'level', target: 189 }, reward: 10000000, title: '玄仙至尊', titleBonus: { attack: 0.2, health: 0.2, defense: 0.2 } },
    // ---- 探索成就 ----
    { id: 'explore_1', name: '初窥秘境', desc: '探索 10 次', cat: '探索', cond: { counter: 'explorationCount', target: 10 }, reward: 300 },
    { id: 'explore_2', name: '游历四方', desc: '探索 100 次', cat: '探索', cond: { counter: 'explorationCount', target: 100 }, reward: 4000 },
    { id: 'explore_3', name: '行万里路', desc: '探索 500 次', cat: '探索', cond: { counter: 'explorationCount', target: 500 }, reward: 30000, title: '云游客', titleBonus: { spiritRate: 0.1 } },
    { id: 'event_1', name: '奇缘天降', desc: '触发奇遇 20 次', cat: '探索', cond: { counter: 'eventTriggered', target: 20 }, reward: 2000 },
    // ---- 战斗成就 ----
    { id: 'battle_1', name: '初试锋芒', desc: '击败 10 只妖怪', cat: '战斗', cond: { counter: 'killCount', target: 10 }, reward: 300 },
    { id: 'battle_2', name: '斩妖除魔', desc: '击败 100 只妖怪', cat: '战斗', cond: { counter: 'killCount', target: 100 }, reward: 5000 },
    { id: 'battle_3', name: '妖魔克星', desc: '击败 500 只妖怪', cat: '战斗', cond: { counter: 'killCount', target: 500 }, reward: 50000, title: '伏魔者', titleBonus: { critRate: 0.05 } },
    { id: 'boss_1', name: '挑战者', desc: '击败世界BOSS 1 次', cat: '战斗', cond: { counter: 'bossKills', target: 1 }, reward: 20000, title: '弑神者', titleBonus: { finalDamageBoost: 0.05 } },
    { id: 'boss_2', name: '弑神如麻', desc: '击败世界BOSS 10 次', cat: '战斗', cond: { counter: 'bossKills', target: 10 }, reward: 200000, title: '屠神者', titleBonus: { finalDamageBoost: 0.12 } },
    // ---- 炼丹成就 ----
    { id: 'alchemy_1', name: '初学炼丹', desc: '炼制 10 枚丹药', cat: '炼丹', cond: { counter: 'pillsCrafted', target: 10 }, reward: 500 },
    { id: 'alchemy_2', name: '丹道小成', desc: '炼制 100 枚丹药', cat: '炼丹', cond: { counter: 'pillsCrafted', target: 100 }, reward: 8000, title: '炼丹师', titleBonus: { spiritRate: 0.05 } },
    { id: 'alchemy_3', name: '丹成九转', desc: '解锁全部 13 张丹方', cat: '炼丹', cond: { counter: 'unlockedPillRecipes', target: 13 }, reward: 50000, title: '丹尊', titleBonus: { combatBoost: 0.1 } },
    // ---- 装备成就 ----
    { id: 'equip_1', name: '神兵在手', desc: '获得 50 件装备', cat: '装备', cond: { counter: 'equipmentFound', target: 50 }, reward: 1000 },
    { id: 'equip_2', name: '收藏大家', desc: '获得 300 件装备', cat: '装备', cond: { counter: 'equipmentFound', target: 300 }, reward: 10000 },
    { id: 'equip_3', name: '仙器之主', desc: '获得一件仙阶装备', cat: '装备', cond: { counter: 'pinkFound', target: 1 }, reward: 100000, title: '仙器宗师', titleBonus: { attack: 0.08 } },
    { id: 'enhance_1', name: '炼器入门', desc: '累计强化 50 次', cat: '装备', cond: { counter: 'enhanceCount', target: 50 }, reward: 3000 },
    { id: 'enhance_2', name: '强化大师', desc: '累计强化 500 次', cat: '装备', cond: { counter: 'enhanceCount', target: 500 }, reward: 40000, title: '强化宗师', titleBonus: { defense: 0.08 } },
    // ---- 灵宠成就 ----
    { id: 'pet_1', name: '灵兽为伴', desc: '获得 5 只灵宠', cat: '灵宠', cond: { counter: 'petFound', target: 5 }, reward: 1000 },
    { id: 'pet_2', name: '万兽朝宗', desc: '获得 30 只灵宠', cat: '灵宠', cond: { counter: 'petFound', target: 30 }, reward: 15000, title: '御兽仙尊', titleBonus: { health: 0.08 } },
    { id: 'pet_3', name: '神兽认主', desc: '获得一只神品灵宠', cat: '灵宠', cond: { counter: 'divinePetFound', target: 1 }, reward: 100000, title: '神兽之主', titleBonus: { attack: 0.1, critRate: 0.03 } },
    // ---- 抽奖/副本成就 ----
    { id: 'gacha_1', name: '小赌怡情', desc: '抽奖 50 次', cat: '历练', cond: { counter: 'gachaCount', target: 50 }, reward: 3000 },
    { id: 'gacha_2', name: '欧皇附体', desc: '抽奖 300 次', cat: '历练', cond: { counter: 'gachaCount', target: 300 }, reward: 20000 },
    { id: 'dungeon_1', name: '秘境探险家', desc: '通关秘境 10 层', cat: '历练', cond: { counter: 'dungeonClear', target: 10 }, reward: 5000 },
    { id: 'dungeon_2', name: '炼狱行者', desc: '炼狱难度通关秘境', cat: '历练', cond: { counter: 'dungeonHellClear', target: 1 }, reward: 100000, title: '炼狱归人', titleBonus: { finalDamageBoost: 0.08, finalDamageReduce: 0.05 } },
    // ---- 签到成就 ----
    { id: 'checkin_1', name: '持之以恒', desc: '累计签到 7 天', cat: '历练', cond: { counter: 'checkinTotal', target: 7 }, reward: 5000 },
    { id: 'checkin_2', name: '仙缘深厚', desc: '累计签到 30 天', cat: '历练', cond: { counter: 'checkinTotal', target: 30 }, reward: 30000, title: '勤修道人', titleBonus: { spiritRate: 0.08 } }
];

export const ACH_CATS = ['修炼', '探索', '战斗', '炼丹', '装备', '灵宠', '历练'];
