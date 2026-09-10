// 挂机修仙·融合版 逻辑模拟测试 (node 直接跑通 Pinia store)
globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { }
};

const { createPinia, setActivePinia } = await import('pinia');
setActivePinia(createPinia());

const { useIdleStore } = await import('../src/idle/store.js');
const { realmName, MAX_LEVEL, maxCultivationOf } = await import('../src/idle/data/realms.js');
const { genMonster } = await import('../src/idle/data/monsters.js');

const store = useIdleStore();
const assert = (cond, msg) => { if (!cond) { console.error('❌', msg); process.exitCode = 1; } else console.log('✅', msg); };

// 1. 初始状态
assert(store.player.level === 1 && store.realm.name === '练气一重', '初始境界 练气一重');
assert(store.spiritRegen > 0, `灵力回复 ${store.spiritRegen.toFixed(1)}/s`);

// 2. 修炼
store.player.spirit = store.spiritCap;
const before = store.player.cultivation;
store.cultivate('one');
assert(store.player.cultivation > before, `修炼成功 修为+${fmtN(store.player.cultivation - before)}`);

// 3. 突破
store.gm;
store.isGM = true;
store.gm('cultivation');
const lv = store.player.level;
store.breakthrough();
assert(store.player.level === lv + 1 && store.player.points >= 3, `突破到 ${realmName(store.player.level)}, 境界点${store.player.points}`);
store.allocate('attack', 3);
assert(store.player.alloc.attack === 3, '属性点分配');

// 4. 探索(含战斗/奇遇)
store.gm('spirit');
const stones0 = store.player.spiritStones;
for (let i = 0; i < 20; i++) { store.exploreCd = 0; store.explore('newbie_village', true); }
assert(store.player.counters.explorationCount === 20, '探索20次');
assert(store.player.spiritStones > stones0 || store.player.herbs.length || store.player.inventory.length, '探索有产出');
console.log(`   背包装备:${store.player.inventory.length} 灵草:${store.player.herbs.length} 击杀:${store.player.counters.killCount} 事件:${store.player.counters.eventTriggered}`);

// 5. 炼丹闭环
store.gm('herbs');
store.gm('fragments');
const recipes = (await import('../src/idle/data/pills.js')).pillRecipes;
store.craftPill(recipes[0].id);
assert(store.player.counters.pillsCrafted >= 1, '炼丹一次');
if (store.player.pills.length) store.usePill(store.player.pills[0].recipeId);
assert(store.player.activeEffects.length >= 1, '服药生效 buff=' + store.player.activeEffects[0]?.type);

// 6. 抽奖
store.gm('stones_max');
store.gacha('equipment', 10);
store.gacha('pet', 10);
assert(store.gachaResults.results.length === 10, '抽奖十连');
assert(store.player.counters.gachaCount === 20, '抽奖计数');

// 7. 秘境
store.dungeonStart(1);
let guard = 0;
while (store.dungeon && !store.dungeon.finished && guard++ < 20) {
    if (store.dungeon.phase === 'choose') {
        store.dungeonChooseBuff(store.dungeon.options[0].id);
    } else if (!store.dungeon.currentMonster) {
        break;
    } else {
        break; // encounter已自动战斗
    }
}
console.log(`   秘境到达第 ${store.dungeon?.floor} 层, finished=${store.dungeon?.finished}`);
store.dungeonExit();

// 8. 签到/成就/称号
store.checkin();
assert(store.player.counters.checkinTotal === 1, '签到');
store.checkAchievements();
console.log(`   成就:${store.player.achievements.length}/${(await import('../src/idle/data/achievements.js')).achievements.length} 称号:${store.player.unlockedTitles.join(',') || '无'}`);
if (store.player.unlockedTitles.length) {
    store.equipTitle(store.player.unlockedTitles[0]);
    assert(store.titleBonus && Object.keys(store.titleBonus).length >= 0, '称号佩戴');
}

// 9. 世界BOSS
store.fightBoss();
assert(store.player.nextBossTime > 0, 'BOSS进入冷却');

// 10. 各阶段战斗胜率与修炼节奏模拟
console.log('\n===== 数值节奏模拟 =====');
for (const targetLv of [1, 30, 60, 90, 120, 150, 188]) {
    // 快速升到目标等级
    while (store.player.level < Math.min(targetLv, MAX_LEVEL)) {
        store.player.cultivation = maxCultivationOf(store.player.level);
        store.breakthrough();
    }
    const regen = store.spiritRegen;
    const cost = store.cultivateCost;
    const gain = store.cultivateGain;
    const bar = maxCultivationOf(store.player.level);
    const actionPerBar = bar / gain;
    const secPerAction = cost / regen;
    const secPerBar = actionPerBar * secPerAction;
    // 战斗: 穿6件装备模拟
    store.player.inventory.length = 0;
    for (let i = 0; i < 6; i++) {
        const { genEquipment } = await import('../src/idle/data/equipment.js');
        const eq = genEquipment(store.player.level, { quality: 'primary' });
        store.player.equipment[eq.slot] = eq;
    }
    let wins = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
        const m = genMonster(store.player.level, 'normal');
        const player = { name: 't', stats: store.stats, health: store.stats.health, maxHealth: store.stats.health, autoHeal: 0 };
        const r = (await import('../src/idle/combat.js')).runBattle(player, m, { maxRounds: 30 });
        if (r.win) wins++;
    }
    console.log(`Lv.${String(store.player.level).padStart(3)} ${realmName(store.player.level).padEnd(6, '　')} | 突破耗时≈${fmtDur(secPerBar)} | 每回合行动≈${secPerAction.toFixed(1)}s | 同级怪胜率 ${(wins / N * 100).toFixed(0)}% | 攻击${fmtN(store.stats.attack)} 血${fmtN(store.stats.health)}`);
}

function fmtN(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
    return n.toFixed(0);
}
function fmtDur(s) {
    if (s > 86400 * 30) return (s / 86400 / 30).toFixed(1) + '月';
    if (s > 86400) return (s / 86400).toFixed(1) + '天';
    if (s > 3600) return (s / 3600).toFixed(1) + '时';
    if (s > 60) return (s / 60).toFixed(0) + '分';
    return s.toFixed(0) + 's';
}
console.log('\n模拟完成');
