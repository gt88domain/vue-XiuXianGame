import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem(key,value) { storage.set(key,String(value)); }, removeItem(key) { storage.delete(key); } };
const { createPinia, setActivePinia } = await import('pinia');
const { useIdleStore } = await import('../src/idle/store.js');

function freshPlayer() {
    setActivePinia(createPinia());
    return useIdleStore();
}

for (const [mode, count] of [['one', 1], ['ten', 10], ['hundred', 100]]) {
    test(`手动修炼 ${mode} 按原数据结算 ${count} 次`, () => {
        const store = freshPlayer();
        const cost = store.cultivateCost;
        const gain = store.cultivateGain;
        store.player.spirit = cost * 150;
        const originalRandom = Math.random;
        Math.random = () => 0.9;
        try {
            assert.equal(store.cultivate(mode), count);
            assert.equal(store.player.spirit, cost * (150 - count));
            assert.equal(store.player.cultivation, gain * count);
            assert.equal(store.player.level, 1);
        } finally {
            Math.random = originalRandom;
        }
    });
}

test('自动修炼到瓶颈停止，突破按原规则给予境界点', () => {
    const store = freshPlayer();
    store.player.spirit = store.spiritCap;
    const originalRandom = Math.random;
    Math.random = () => 0.9;
    try {
        assert.equal(store.cultivate('auto'), 20);
        assert.equal(store.player.cultivation, store.realm.maxCultivation);
        assert.equal(store.cultivate('auto'), 0);
        assert.equal(store.breakthrough(), true);
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
