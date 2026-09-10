globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { createPinia, setActivePinia } = await import('pinia');
setActivePinia(createPinia());
const { useIdleStore } = await import('../src/idle/store.js');
const { maxCultivationOf, MAX_LEVEL } = await import('../src/idle/data/realms.js');
const { genMonster } = await import('../src/idle/data/monsters.js');
const { runBattle } = await import('../src/idle/combat.js');
const { genEquipment } = await import('../src/idle/data/equipment.js');
const store = useIdleStore();
store.isGM = true;

const winrate = (mk, N = 40, rounds = 30) => {
    let w = 0;
    for (let i = 0; i < N; i++) {
        const m = mk();
        const p = { name: 't', stats: store.stats, health: store.stats.health, maxHealth: store.stats.health, autoHeal: 0 };
        if (runBattle(p, m, { maxRounds: rounds }).win) w++;
    }
    return (w / N * 100).toFixed(0) + '%';
};

for (const lv of [30, 90, 150]) {
    while (store.player.level < Math.min(lv, MAX_LEVEL)) { store.player.cultivation = maxCultivationOf(store.player.level); store.breakthrough(); }
    // 三种配装: 蓝装6件 / 紫装全13件 / 神阶全13件
    const gear = (quality, n) => {
        store.player.equipment = {};
        for (let i = 0; i < n; i++) { const eq = genEquipment(store.player.level, { quality }); store.player.equipment[eq.slot] = eq; }
    };
    for (const [q, n] of [['primary', 6], ['purple', 13], ['danger', 13]]) {
        gear(q, n);
        console.log(`Lv.${lv} [${q}×${n}] 普通:${winrate(() => genMonster(lv, 'normal'))} 精英:${winrate(() => genMonster(lv, 'elite'))} 首领:${winrate(() => genMonster(lv, 'boss'), 40, 40)} 世界BOSS:${winrate(() => genMonster(lv, 'world'), 40, 60)}`);
    }
}
