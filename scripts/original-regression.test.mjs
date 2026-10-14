import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem(key,value) { storage.set(key,String(value)); }, removeItem(key) { storage.delete(key); } };
const { createPinia, setActivePinia } = await import('pinia');
const { useIdleStore } = await import('../src/idle/store.js');
const { genEquipment, QUALITY_ORDER } = await import('../src/idle/data/equipment.js');
const { freshProgression, equipmentQualityCeiling } = await import('../src/idle/progression.js');
const { BUFF_OPTIONS } = await import('../src/idle/data/dungeon.js');

function freshPlayer() {
    storage.clear();
    setActivePinia(createPinia());
    return useIdleStore();
}

for (const [mode, count] of [['one', 1], ['ten', 10], ['hundred', 50]]) {
    test(`手动修炼 ${mode} 在当前瓶颈内结算 ${count} 次`, () => {
        const store = freshPlayer();
        const cost = store.cultivateCost;
        const gain = store.cultivateGain;
        store.player.spirit = cost * 150;
        const originalRandom = Math.random;
        Math.random = () => 0.9;
        try {
            assert.equal(store.cultivate(mode), count);
            assert.ok(Math.abs(store.player.spirit - cost * (150 - count)) < 1e-8);
            assert.equal(store.player.cultivation, gain * count);
            assert.equal(store.player.level, 1);
        } finally {
            Math.random = originalRandom;
        }
    });
}

test('自动修炼到瓶颈停止，突破给点数但不返灵力', () => {
    const store = freshPlayer();
    store.player.spirit = store.spiritCap;
    const originalRandom = Math.random;
    Math.random = () => 0.9;
    try {
        assert.equal(store.cultivate('auto'), 50);
        assert.equal(store.player.cultivation, store.realm.maxCultivation);
        assert.equal(store.cultivate('auto'), 0);
        const spirit = store.player.spirit;
        assert.equal(store.breakthrough(), true);
        assert.equal(store.player.spirit, spirit);
        assert.equal(store.player.level, 2);
        assert.equal(store.player.points, 3);
    } finally {
        Math.random = originalRandom;
    }
});

test('离线收益按剩余容量结算，连续初始化不会重复领取', () => {
    const store = freshPlayer();
    store.player.spirit = store.spiritCap - 10;
    store.player.lastOnline = Date.now() - 3600_000;
    store.init();
    assert.equal(store.player.spirit, store.spiritCap);
    assert.equal(store.offlineReport.spirit, 10);
    store.init();
    assert.equal(store.player.spirit, store.spiritCap);
});

test('系统时钟回拨不会增加冷却或减少恢复灵力', () => {
    const store = freshPlayer();
    store.player.spirit = 10;
    store.exploreCd = 3;
    store._lastTick = Date.now() + 60_000;
    store.tick();
    assert.equal(store.player.spirit, 10);
    assert.equal(store.exploreCd, 3);
});

test('损坏或不支持的导入不替换现有角色', () => {
    const store = freshPlayer();
    store.player.name = '保留角色';
    const original = JSON.stringify(store.player);
    for (const json of ['{', '{"version":1,"player":{}}', '{"version":2,"player":{}}']) {
        assert.equal(store.importSave(json), false);
        assert.equal(JSON.stringify(store.player), original);
    }
    const broken = JSON.parse(store.exportSave());
    broken.player.settings = [];
    assert.equal(store.importSave(JSON.stringify(broken)), false);
    assert.equal(JSON.stringify(store.player), original);
});

test('有效存档往返保持装备和进度，导入不会重复计入旧离线时长', () => {
    const store = freshPlayer();
    store.player.name = '存档往返';
    store.isGM = true;
    store.gm('equip');
    assert.equal(store.player.inventory.length, 1);
    store.player.lastOnline = Date.now() - 3600_000;
    const saved = store.exportSave();
    const inventory = JSON.stringify(store.player.inventory);
    store.resetGame();
    assert.equal(store.importSave(saved), true);
    assert.equal(store.player.name, '存档往返');
    assert.equal(JSON.stringify(store.player.inventory), inventory);
    assert.ok(Date.now() - store.player.lastOnline < 1000);
    store.init();
    assert.equal(store.offlineReport, null);
});

test('集合中的损坏装备不会污染当前存档', () => {
    const store = freshPlayer();
    const before = JSON.stringify(store.player);
    for (const item of [null, {}, {name:'无效装备', quality:'missing'}]) {
        const save = JSON.parse(store.exportSave());
        save.player.inventory = [item];
        assert.equal(store.importSave(JSON.stringify(save)), false);
        assert.equal(JSON.stringify(store.player), before);
    }
});


test('备份恢复保留进度，恢复前也备份被替换的角色', () => {
    const store = freshPlayer();
    store.player.name = '备份前';
    assert.equal(store.backupSave(), true);
    store.player.name = '恢复前';
    assert.equal(store.restoreBackup(), true);
    assert.equal(store.player.name, '备份前');
    const backup = JSON.parse(localStorage.getItem('idle-xiuxian-fusion-backup-v1'));
    assert.equal(backup.player.name, '恢复前');
});

test('无法备份时，导入和重开都保留当前角色', () => {
    const store = freshPlayer();
    store.player.name = '保留当前';
    const save = JSON.parse(store.exportSave()); save.player.name = '不要替换';
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('quota'); };
    try {
        assert.equal(store.importSave(JSON.stringify(save)), false);
        assert.equal(store.resetGame(), false);
        assert.equal(store.player.name, '保留当前');
    } finally { localStorage.setItem = originalSetItem; }
});

test('自动探索缺灵力时等待，背包满时停止并解释原因', () => {
    const store = freshPlayer();
    store.player.settings.autoExplore = true;
    store.tick();
    assert.equal(store.player.settings.autoExplore, true);
    assert.match(store.autoExploreMessage, /等待灵力/);
    store.player.inventory = Array.from({length:200}, (_,i) => ({id:i}));
    store.tick();
    assert.equal(store.player.settings.autoExplore, false);
    assert.match(store.autoExploreMessage, /背包已满/);
});

test('探索冷却期间重复调用不会再次扣费或结算', () => {
    const store = freshPlayer();
    store.player.spirit = store.spiritCap;
    store.explore('newbie_village');
    const spirit = store.player.spirit;
    assert.equal(store.player.counters.explorationCount, 1);
    store.explore('newbie_village');
    assert.equal(store.player.spirit, spirit);
    assert.equal(store.player.counters.explorationCount, 1);
});

test('满背包卸装不会溢出容量或丢失穿戴装备', () => {
    const store = freshPlayer();
    const item = {id:1};
    store.player.equipment.weapon = item;
    store.player.inventory = Array.from({length:200}, (_,i) => ({id:i}));
    store.unequipSlot('weapon');
    assert.equal(store.player.inventory.length, 200);
    assert.equal(store.player.equipment.weapon.id, 1);
});

test('即使每次顿悟，五分钟纯修炼也不能直达筑基', () => {
    const store = freshPlayer();
    const originalNow = Date.now, originalRandom = Math.random;
    let now = originalNow();
    Date.now = () => now; Math.random = () => 0;
    try {
        store.init(); store.player.settings.autoCultivate = true;
        for (let i=0; i<300; i++) {
            now += 1000; store.tick();
            if (store.canBreakthrough) store.breakthrough();
        }
        assert.ok(store.player.level > 1 && store.player.level < 10);
    } finally { Date.now = originalNow; Math.random = originalRandom; }
});

test('历练每次最多2.5%、每重最多25%，突破后重新计量', () => {
    const store = freshPlayer(), max = store.realm.maxCultivation;
    assert.equal(store.gainAdventureCultivation(max), max * .025);
    for (let i=0; i<30; i++) store.gainAdventureCultivation(max);
    assert.ok(Math.abs(store.player.cultivation - max * .25) < 1e-8);
    assert.equal(store.gainAdventureCultivation(max), 0);
    store.player.cultivation = max;
    store.breakthrough();
    assert.equal(store.player.progression.adventureCultivation, 0);
    assert.ok(store.gainAdventureCultivation(max) > 0);
});

test('筑基需要探索、三件装备和初试通关，满足后只突破一次', () => {
    const store = freshPlayer();
    store.player.level = 9;
    store.player.cultivation = store.realm.maxCultivation * 100;
    assert.equal(store.breakthrough(), false);
    assert.equal(store.breakthroughBlockers.length, 3);
    store.player.counters.explorationCount = 12;
    for (const slot of ['weapon','head','body']) store.player.equipment[slot] = genEquipment(9, { slot });
    store.player.progression.trials = [1];
    const spirit = store.player.spirit;
    assert.equal(store.breakthrough(), true);
    assert.equal(store.player.level, 10);
    assert.equal(store.player.spirit, spirit);
    assert.equal(store.player.cultivation, 0);
    assert.equal(store.breakthrough(), false);
});

test('新装备品质随境界解锁，强化达到上限不再扣材料', () => {
    const store = freshPlayer();
    for (const level of [1,9,10,28,55,100]) {
        assert.equal(QUALITY_ORDER.indexOf(genEquipment(level, { quality:'pink' }).quality), equipmentQualityCeiling(level));
    }
    const item = genEquipment(1, { slot:'weapon' });
    item.enhanceLevel = store.enhancementLimit;
    store.player.inventory.push(item);
    const before = JSON.stringify(store.player);
    store.enhanceItem(item.id);
    assert.equal(JSON.stringify(store.player), before);
});

test('初试需要三级与灵力，重复进入活动秘境不扣费或重置生命', () => {
    const store = freshPlayer();
    store.player.spirit = store.spiritCap;
    store.dungeonStart(1); assert.equal(store.dungeon, null);
    store.player.level = 3; store.player.spirit = 0;
    store.dungeonStart(1); assert.equal(store.dungeon, null);
    store.player.spirit = store.spiritCap;
    // Capture entry independently of random battle outcome.
    store.dungeonEncounter = () => {};
    const spirit = store.player.spirit, cost = store.dungeonEntryCost(1);
    store.dungeonStart(1);
    assert.equal(store.player.spirit, spirit - cost);
    assert.equal(store.dungeon.floorMax, 5);
    assert.equal(store.dungeon.runStats.defense, store.stats.defense);
    store.dungeon.runHealth = 1;
    store.dungeonStart(1);
    assert.equal(store.dungeon.runHealth, 1);
    assert.equal(store.player.spirit, spirit - cost);
    const defense = store.dungeon.runStats.defense;
    store.dungeon.phase = 'choose';
    store.dungeon.options = [BUFF_OPTIONS.find(b => b.id === 'defense_boost')];
    store.dungeonChooseBuff('defense_boost');
    assert.equal(store.dungeon.runStats.defense, Math.floor(defense * 1.2));
});

test('五层成功才记录初试，末层失败不会误报通关或重复领奖', () => {
    const store = freshPlayer();
    store.player.level = 9;
    store.player.alloc.attack = 10000; store.player.alloc.health = 10000;
    store.player.spirit = store.spiritCap;
    const originalRandom = Math.random; Math.random = () => .9;
    try {
        store.dungeonStart(1);
        for (let guard=0; !store.dungeon.finished && guard<5; guard++) {
            store.dungeonChooseBuff(store.dungeon.options[0].id);
        }
        assert.equal(store.dungeon.floor, 5);
        assert.equal(store.dungeon.cleared, true);
        assert.deepEqual([...store.player.progression.trials], [1]);
        assert.equal(store.player.counters.dungeonClear, 5);
        const inventory = store.player.inventory.length;
        store.dungeonEncounter();
        assert.equal(store.player.inventory.length, inventory);
        assert.equal(store.player.counters.dungeonClear, 5);
        const loser = freshPlayer();
        loser.player.level = 3;
        loser.dungeon = { difficulty:1, entryLevel:3, floor:5, floorMax:5, runHealth:1, maxHealth:1, runStats:{attack:0, health:1, defense:0, speed:0}, finished:false, cleared:false };
        loser.dungeonEncounter();
        assert.equal(loser.dungeon.finished, true);
        assert.equal(loser.dungeon.cleared, false);
        assert.equal(loser.player.counters.dungeonClear, 0);
        assert.deepEqual([...loser.player.progression.trials], []);
        assert.ok(loser.battle.frames.length > 1);
        assert.equal(loser.battle.frames.at(-1).playerHealth, loser.battle.playerHealth);
    } finally { Math.random = originalRandom; }
});

test('旧版导入不清空境界装备，旧存档多余修为先备份再收敛', () => {
    const store = freshPlayer();
    store.player.level = 10;
    store.player.inventory.push(genEquipment(10));
    const legacy = JSON.parse(store.exportSave());
    delete legacy.player.progression;
    assert.equal(store.importSave(JSON.stringify(legacy)), true);
    assert.equal(store.player.level, 10);
    assert.equal(store.player.inventory.length, 1);
    assert.equal(store.player.progression.version, 2);
    legacy.player.cultivation = store.realm.maxCultivation * 30;
    store.player.cultivation = legacy.player.cultivation;
    localStorage.setItem('idle-xiuxian-fusion', JSON.stringify({player:legacy.player}));
    store.init();
    assert.equal(store.player.level, 10);
    assert.equal(store.player.cultivation, store.realm.maxCultivation);
    const backup = JSON.parse(localStorage.getItem('idle-xiuxian-fusion-backup-v1'));
    assert.equal(backup.player.cultivation, legacy.player.cultivation);
    assert.equal(store.player.progression.version, freshProgression(10).version);
});

test('新角色默认保留低阶掉落，得到装备后能立刻查看穿戴', () => {
    const store = freshPlayer();
    assert.deepEqual([...store.player.settings.autoSellQualities], []);
    const item = genEquipment(1, {quality:'info'});
    store.gainEquipment(item);
    assert.equal(store.player.inventory.length, 1);
    store.equipItem(item.id);
    assert.equal(store.player.equipment[item.slot].id, item.id);
});
