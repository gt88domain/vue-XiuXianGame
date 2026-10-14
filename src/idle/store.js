// ===== 挂机修仙·融合版 核心状态仓库 =====
// 玩法来源:
//   vue-idle-xiuxian : 灵力/修炼/突破/探索/炼丹/装备强化洗练/roguelike秘境/抽奖/GM面板
//   vue-XiuXianGame  : 境界点分配/装备分解/世界BOSS/每日签到/称号/灵宠捕捉/自动出售

import { defineStore } from 'pinia';
import { BALANCE_VERSION, CULTIVATION_ACTIONS, ADVENTURE_SHARE, layerTrainingSeconds, baseSpiritRegen, freshProgression, majorGoals, enhancementCeiling } from './progression';
import { SAVE_KEY, saveStorage, createBackup, readBackup, readOfflineReport, rememberOfflineReport } from './save-storage';
import { realms, getRealm, realmName, MAX_LEVEL, maxCultivationOf, economyFactor, combatFactor } from './data/realms';
import { genEquipment, enhanceCost, enhanceSuccess, enhancedStats, reforge, salvageGain, QUALITIES, QUALITY_ORDER, equipScore, REFORGE_CFG } from './data/equipment';
import { genMonster } from './data/monsters';
import { genPet, petBonuses, petUpgradeCost, RARITIES } from './data/pets';
import { getRandomHerb, herbById } from './data/herbs';
import { pillRecipes, pillGrades, calculatePillEffect } from './data/pills';
import { locations } from './data/locations';
import { rollEvent, resolveEvent } from './data/events';
import { DIFFICULTIES, rollBuffOptions } from './data/dungeon';
import { genWorldBoss } from './data/boss';
import { achievements } from './data/achievements';
import { runBattle } from './combat';
import { rint, rfloat, pick, chance, uid, fmt, pct, fmtTime } from './utils';

const nowSec = () => Math.floor(Date.now() / 1000);
const today = () => new Date().toISOString().slice(0, 10);

// Validate the existing v1 format before replacing a live player.
function validateSave(value, template, path = 'player', depth = 0) {
    if (depth > 24) throw new Error('存档嵌套过深');
    if (value === undefined) throw new Error(`${path} 缺失`);
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${path} 数值无效`);
    if (template !== null && typeof template !== 'object' && typeof value !== typeof template) {
        throw new Error(`${path} 类型错误`);
    }
    if (Array.isArray(template) && !Array.isArray(value)) throw new Error(`${path} 应为列表`);
    if (template && typeof template === 'object' && !Array.isArray(template) &&
        (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error(`${path} 应为对象`);
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('存档字段无效');
            validateSave(value[key], template?.[key] ?? null, `${path}.${key}`, depth + 1);
        }
        if (template && !Array.isArray(template)) {
            for (const key of Object.keys(template)) {
                validateSave(value[key], template[key], `${path}.${key}`, depth + 1);
            }
        }
    }
}


const emptyCounters = () => ({
    breakthroughCount: 0, explorationCount: 0, killCount: 0, bossKills: 0,
    pillsCrafted: 0, pillsConsumed: 0, equipmentFound: 0, pinkFound: 0, enhanceCount: 0,
    petFound: 0, divinePetFound: 0, gachaCount: 0, dungeonClear: 0, dungeonHellClear: 0,
    eventTriggered: 0, unlockedPillRecipes: 0, checkinTotal: 0, level: 1
});

const createPlayer = () => ({
            progression: freshProgression(1),
            name: '无名修士',
            createdAt: nowSec(),
            lastOnline: Date.now(),
            level: 1,
            cultivation: 0,
            spirit: 0,
            spiritStones: 0,
            reinforceStones: 20,
            refinementStones: 10,
            petEssence: 0,
            luckBase: 1,
            spiritRateBase: 1,
            alchemyRate: 1,
            points: 0,
            alloc: { attack: 0, health: 0, defense: 0, speed: 0 },
            herbs: [],
            pills: [],
            pillFragments: {},
            pillRecipes: [],
            activeEffects: [],
            equipment: {},
            inventory: [],
            pets: [],
            activePetId: null,
            title: null,
            unlockedTitles: [],
            achievements: [],
            counters: emptyCounters(),
            checkin: { lastDate: null, streak: 0 },
            boss: null,
            nextBossTime: 0,
            settings: { autoSellQualities: [], autoExplore: false, autoCultivate: false, exploreLocation: 'newbie_village' }
        });

export const useIdleStore = defineStore('idleXiuxian', {
    state: () => ({
        player: createPlayer(),
        // 非持久化运行时状态
        logs: [],
        battle: null,
        exploreCd: 0,
        offlineReport: null,
        dungeon: null,
        gachaResults: null,
        autoExploreMessage: '',
        lastOfflineReport: null
    }),

    getters: {
        realm: s => getRealm(s.player.level),
        isMaxLevel: s => s.player.level >= MAX_LEVEL,
        majorGoals: s => majorGoals(s.player),
        stageGoals: s => majorGoals(s.player, true),
        breakthroughBlockers() { return this.majorGoals.filter(g => !g.done); },
        trainingSeconds: s => layerTrainingSeconds(s.player.level),
        enhancementLimit: s => enhancementCeiling(s.player.level),

        // 幸运值(基础 + 清心丹/算命等buff + 装备luck)
        luck(state) {
            let luck = state.player.luckBase;
            for (const e of state.player.activeEffects) if (e.type === 'luck') luck += e.value;
            const eq = this.equipStatSum('luck');
            return luck + eq;
        },

        // 灵力回复速率/秒
        spiritRegen(state) {
            const base = (4 + state.player.level * 1.2) * economyFactor(state.player.level);
            let rate = state.player.spiritRateBase;
            for (const e of state.player.activeEffects) if (e.type === 'spiritRate') rate += e.value;
            return base * rate * (1 + this.equipStatSum('spiritRate'));
        },

        // 灵力上限(10分钟存量 + 日月丹加成)
        spiritCap(state) {
            let cap = this.spiritRegen * 600;
            for (const e of state.player.activeEffects) if (e.type === 'spiritCap') cap *= 1 + e.value;
            return cap;
        },

        // 修炼速率倍率
        cultivationRateMult(state) {
            let mult = 1;
            for (const e of state.player.activeEffects) if (e.type === 'cultivationRate' || e.type === 'cultivationEfficiency') mult += e.value;
            return mult;
        },

        // 单次修炼获得的修为
        cultivateGain(state) {
            const gain = maxCultivationOf(state.player.level) / CULTIVATION_ACTIONS * this.cultivationRateMult;
            return gain;
        },
        // 单次修炼消耗的灵力
        cultivateCost(state) {
            return baseSpiritRegen(state.player.level) * layerTrainingSeconds(state.player.level) / CULTIVATION_ACTIONS;
        },

        // 称号加成
        titleBonus(state) {
            if (!state.player.title) return {};
            const ach = achievements.find(a => a.title === state.player.title);
            return ach?.titleBonus || {};
        },

        // 装备某个属性的合计(含强化)
        equipStatSum() {
            return (stat) => {
                let sum = 0;
                for (const item of Object.values(this.player.equipment)) {
                    if (!item) continue;
                    const st = enhancedStats(item);
                    if (st[stat]) sum += st[stat];
                }
                return sum;
            };
        },

        // 出战灵宠加成
        petBonus(state) {
            const pet = state.player.pets.find(p => p.id === state.player.activePetId);
            return petBonuses(pet);
        },

        // ===== 综合属性(idle-xiuxian 三层属性模型) =====
        stats(state) {
            const lv = state.player.level;
            const cf = combatFactor(lv);
            const alloc = state.player.alloc;
            const eqAttack = this.equipStatSum('attack');
            const eqHealth = this.equipStatSum('health');
            const eqDefense = this.equipStatSum('defense');
            // 全属性% (仙灵丹/五行丹/九转金丹)
            let allPct = 0;
            for (const e of state.player.activeEffects) if (e.type === 'allAttributes') allPct += e.value;
            // 称号加成
            const tb = this.titleBonus;
            const pet = this.petBonus;
            const petVal = k => (pet && pet[k]) || 0;

            const stats = {
                attack: Math.floor(((10 + 6 * lv) * cf + alloc.attack * 6 * cf + eqAttack + petVal('attack')) * (1 + allPct + (tb.attack || 0))),
                health: Math.floor(((100 + 60 * lv) * cf + alloc.health * 40 * cf + eqHealth + petVal('health')) * (1 + allPct + (tb.health || 0))),
                defense: Math.floor(((5 + 3 * lv) * cf + alloc.defense * 3 * cf + eqDefense + petVal('defense')) * (1 + allPct + (tb.defense || 0))),
                speed: Math.floor((10 + lv * 0.5 + alloc.speed + petVal('speed') + this.equipStatSum('speed'))),
                autoHeal: 0
            };
            // 战斗属性与抗性: 装备 + 灵宠 + buff
            const combatKeys = ['critRate', 'comboRate', 'counterRate', 'stunRate', 'dodgeRate', 'vampireRate',
                'critResist', 'comboResist', 'counterResist', 'stunResist', 'dodgeResist', 'vampireResist',
                'healBoost', 'critDamageBoost', 'critDamageReduce', 'finalDamageBoost', 'finalDamageReduce', 'combatBoost', 'resistanceBoost'];
            for (const k of combatKeys) {
                stats[k] = Math.round(((this.equipStatSum(k) || 0) + petVal(k)) * 1000) / 1000;
            }
            for (const e of state.player.activeEffects) if (e.type === 'combatBoost') stats.combatBoost += e.value;
            if (tb.critRate) stats.critRate += tb.critRate;
            if (tb.finalDamageBoost) stats.finalDamageBoost += tb.finalDamageBoost;
            if (tb.finalDamageReduce) stats.finalDamageReduce += tb.finalDamageReduce;
            if (tb.spiritRate) stats.spiritRate = (stats.spiritRate || 0) + tb.spiritRate;
            if (tb.defense) stats.defense = Math.floor(stats.defense * (1 + tb.defense));
            stats.critRate = Math.min(1, stats.critRate + 0.05); // 基础5%暴击
            stats.critDamageBoost = stats.critDamageBoost || 0.5;
            // 涅槃丹: 战斗中自动疗伤
            for (const e of state.player.activeEffects) if (e.type === 'autoHeal') stats.autoHeal += e.value;
            return stats;
        },

        // 战力评分
        power(state) {
            const st = this.stats;
            return Math.floor(st.attack * 1.5 + st.health + st.defense * 1.2 + st.speed * 5 + st.critRate * 800 + st.finalDamageBoost * 500);
        },

        // 背包装备(应用自动出售过滤后的展示)
        bagEquipments(state) {
            return state.player.inventory;
        },

        canBreakthrough(state) {
            return state.player.cultivation >= maxCultivationOf(state.player.level);
        },

        checkinAvailable(state) {
            return state.player.checkin.lastDate !== today();
        },

        nextBossIn(state) {
            return Math.max(0, state.player.nextBossTime - nowSec());
        }
    },

    actions: {
        // ---------- 日志 ----------
        log(text, type = 'info') {
            this.logs.unshift({ id: uid(), time: fmtTime(0) && new Date().toLocaleTimeString(), text, type });
            if (this.logs.length > 120) this.logs.length = 120;
        },

        // ---------- 初始化(离线收益) ----------
        init() {
            let oldBalance = false;
            try { const saved = JSON.parse(saveStorage.getItem(SAVE_KEY)); oldBalance = !!saved?.player && !saved.player.progression?.version; } catch { /* persistence plugin handles invalid JSON */ }
            if (oldBalance || !this.player.progression || this.player.progression.version !== BALANCE_VERSION) {
                if (createBackup(this.player)) this.player.cultivation = Math.min(this.player.cultivation, this.realm.maxCultivation);
                this.player.progression = freshProgression(this.player.level);
                this.log('修行节奏已更新：现有境界与装备保留，大境界突破需要完成历练。', 'info');
            }
            this.lastOfflineReport = readOfflineReport();
            const now = Date.now();
            const elapsed = Math.max(0, Math.min((now - this.player.lastOnline) / 1000, 8 * 3600));
            this.player.lastOnline = now;
            if (elapsed > 60) {
                const gain = Math.max(0, Math.min(this.spiritRegen * elapsed * 0.6, this.spiritCap - this.player.spirit));
                this.player.spirit += gain;
                this.offlineReport = { elapsed, spirit: gain };
                this.lastOfflineReport = { elapsed, spirit: gain };
                rememberOfflineReport(this.lastOfflineReport);
                this.log(`闭关修炼 ${fmtTime(elapsed)}，恢复灵力 +${fmt(gain)}`, 'success');
            }
            this._lastTick = Date.now();
            this.player.counters.level = Math.max(this.player.counters.level, this.player.level);
        },

        // ---------- 每秒 tick(按真实时间差结算) ----------
        tick() {
            const now = Date.now();
            const dt = Math.max(0, Math.min((now - (this._lastTick || now)) / 1000, 120));
            this._lastTick = now;
            // 灵力恢复
            if (this.player.spirit < this.spiritCap) {
                this.player.spirit = Math.min(this.spiritCap, this.player.spirit + this.spiritRegen * dt);
            }
            // buff倒计时
            if (this.player.activeEffects.length) {
                for (const e of this.player.activeEffects) e.remain -= dt;
                this.player.activeEffects = this.player.activeEffects.filter(e => e.remain > 0);
            }
            // 探索冷却
            if (this.exploreCd > 0) this.exploreCd = Math.max(0, this.exploreCd - dt);
            // 自动修炼
            if (this.player.settings.autoCultivate) this.cultivate('auto');
            // 自动探索
            if (this.player.settings.autoExplore && this.exploreCd <= 0) {
                const loc = locations.find(l => l.id === this.player.settings.exploreLocation);
                if (!loc || this.player.level < loc.minLevel) {
                    this.player.settings.autoExplore = false;
                    this.autoExploreMessage = '自动探索已停止：当前地点尚未解锁，请选择可探索的地点。';
                } else if (this.player.inventory.length >= 200) {
                    this.player.settings.autoExplore = false;
                    this.autoExploreMessage = '自动探索已停止：背包已满，请先分解不需要的装备。';
                } else if (this.player.spirit < loc.spiritCost) {
                    this.autoExploreMessage = `等待灵力恢复，需要 ${fmt(loc.spiritCost)} 灵力后继续探索。`;
                } else {
                    this.autoExploreMessage = '';
                    this.explore(loc.id, true);
                }
            }
        },

        // ---------- 修炼 ----------
        cultivate(mode = 'one') {
            let done = 0, doubled = 0, gained = 0;
            const limit = mode === 'one' ? 1 : mode === 'ten' ? 10 : mode === 'hundred' ? 100 : Infinity;
            while (done < limit) {
                if (this.canBreakthrough) break;
                const cost = this.cultivateCost;
                if (this.player.spirit < cost) break;
                this.player.spirit -= cost;
                let gain = this.cultivateGain;
                if (Math.random() < 0.3 * this.luck) { gain *= 2; doubled++; }
                const actualGain = Math.min(gain, this.realm.maxCultivation - this.player.cultivation);
                this.player.cultivation += actualGain;
                gained += actualGain;
                done++;
                if (this.canBreakthrough && mode !== 'one' && mode !== 'ten' && mode !== 'hundred') break;
            }
            if (done > 0) {
                this.log(`修炼 ${done} 次，修为 +${fmt(gained)}${doubled ? `，触发顿悟${doubled}次` : ''}`, 'cultivate');
            } else if (mode !== 'auto') {
                this.log(this.canBreakthrough ? '修为已满，请先突破或完成历练条件。' : '灵力不足，无法修炼。等待灵力恢复或服用回灵丹。', 'warning');
            }
            return done;
        },

        breakthrough() {
            if (!this.canBreakthrough) {
                this.log('修为尚未圆满，无法突破。', 'warning');
                return false;
            }
            if (this.isMaxLevel) {
                this.log('已达九天玄仙九重圆满，天下无敌！', 'success');
                return false;
            }
            if (this.breakthroughBlockers.length) { this.log('大境界突破还需：' + this.breakthroughBlockers.map(g => g.label).join('、'), 'warning'); return false; }
            this.player.cultivation = 0;
            this.player.level++;
            this.player.counters.breakthroughCount++;
            this.player.counters.level = Math.max(this.player.counters.level, this.player.level);
            this.player.points += 3;
            this.player.spiritRateBase = Math.round((this.player.spiritRateBase + 0.02) * 100) / 100;
            this.player.progression = { ...this.player.progression, adventureLevel:this.player.level, adventureCultivation:0 };
            this.log(`突破成功！当前境界: ${realmName(this.player.level)}，获得3点境界点。下一段仙途已开启`, 'breakthrough');
            this.checkAchievements();
            return true;
        },

        allocate(stat, n = 1) {
            n = Math.min(n, this.player.points);
            if (n <= 0) return;
            this.player.alloc[stat] += n;
            this.player.points -= n;
        },

        gainAdventureCultivation(amount) {
            const p = this.player;
            if (!p.progression || p.progression.adventureLevel !== p.level) {
                p.progression = { ...freshProgression(p.level), trials:p.progression?.trials || [] };
            }
            const maximum = this.realm.maxCultivation;
            const gain = Math.max(0, Math.min(amount, maximum * 0.025, maximum * ADVENTURE_SHARE - p.progression.adventureCultivation, maximum - p.cultivation));
            p.progression.adventureCultivation += gain;
            p.cultivation += gain;
            return gain;
        },

        // ---------- 探索 ----------
        explore(locationId, silent = false) {
            const loc = locations.find(l => l.id === locationId);
            if (!loc) return;
            if (this.exploreCd > 0) return;
            if (this.player.level < loc.minLevel) {
                if (!silent) this.log(`境界不足，${loc.name}需要达到 ${realmName(loc.minLevel)}`, 'warning');
                return;
            }
            if (this.player.spirit < loc.spiritCost) {
                if (!silent) this.log('灵力不足，探索失败。', 'warning');
                return;
            }
            this.player.spirit -= loc.spiritCost;
            this.exploreCd = 3;
            this.player.counters.explorationCount++;
            const luck = this.luck;
            const ef = economyFactor(loc.minLevel);
            const stageIdx = getRealm(this.player.level).stageIndex;
            const parts = [`${loc.name}:`];
            // 常规奖励
            for (const r of loc.rewards) {
                if (Math.random() > Math.min(r.chance * luck, 1)) continue;
                const amount = rint(r.amount[0], r.amount[1]);
                if (r.type === 'spirit_stone') {
                    const gain = Math.floor(amount * ef);
                    this.player.spiritStones += gain; parts.push(`灵石+${fmt(gain)}`);
                } else if (r.type === 'cultivation') {
                    const gain = this.gainAdventureCultivation(amount); parts.push(`修为+${fmt(gain)}`);
                } else if (r.type === 'herb') {
                    const n = rint(1, 2 + Math.floor(stageIdx / 3));
                    for (let i = 0; i < n; i++) this.gainHerb(getRandomHerb(luck));
                    parts.push(`灵草×${n}`);
                } else if (r.type === 'pill_fragment') {
                    const n = Math.min(8, rint(1, 2 + Math.floor(stageIdx / 2)));
                    this.gainFragment(n); parts.push(`丹方残页+${n}`);
                }
            }
            // 装备掉落
            if (chance(0.08 * luck)) {
                this.gainEquipment(genEquipment(this.player.level, { luck }));
                parts.push('获得装备!');
            }
            // 灵宠遭遇
            if (chance(0.04 * luck)) {
                this.gainPet(genPet(null, this.player.level));
                parts.push('发现灵宠!');
            }
            // 战斗遭遇
            let metBattle = false;
            if (chance(0.22)) {
                metBattle = true;
                this.fight(genMonster(this.player.level, chance(0.15) ? 'elite' : 'normal'));
            }
            // 奇遇事件
            if (chance(0.45)) {
                const evt = rollEvent();
                if (evt) this.applyEvent(evt);
            }
            if (!silent || !metBattle) this.log(parts.join(' '), 'explore');
            this.checkAchievements();
        },

        applyEvent(evt) {
            this.player.counters.eventTriggered++;
            const res = resolveEvent(evt, this.player.level);
            this.log(`[奇遇·${evt.name}] ${evt.description}`, evt.good ? 'event' : 'danger');
            switch (res.type) {
                case 'cultivation': { const gain = this.gainAdventureCultivation(res.amount); this.log(res.text + ` 修为+${fmt(gain)}`, 'event'); break; }
                case 'spirit': this.player.spirit = Math.min(this.spiritCap, this.player.spirit + res.amount); this.log(res.text + ` 灵力+${fmt(res.amount)}`, 'event'); break;
                case 'both': {
                    const gain = this.gainAdventureCultivation(res.cultivation);
                    this.player.spirit = Math.min(this.spiritCap, this.player.spirit + res.spirit);
                    this.log(`${res.text} 修为+${fmt(gain)} 灵力+${fmt(res.spirit)}`, 'event'); break; }
                case 'stones': this.player.spiritStones += res.amount; this.log(res.text + ` 灵石+${fmt(res.amount)}`, 'event'); break;
                case 'lose_cultivation': this.player.cultivation = Math.max(0, this.player.cultivation - res.amount); this.log(`${res.text} 修为-${fmt(res.amount)}`, 'danger'); break;
                case 'lose_both':
                    this.player.spirit = Math.max(0, this.player.spirit - res.amount);
                    this.player.cultivation = Math.max(0, this.player.cultivation - res.amount);
                    this.log(`${res.text} 灵力修为各-${fmt(res.amount)}`, 'danger'); break;
                case 'buff':
                    this.player.activeEffects.push({ ...res.buff, remain: res.buff.duration, id: uid() });
                    if (res.cultivation) this.gainAdventureCultivation(res.cultivation);
                    this.log(res.text, 'event'); break;
                case 'equip': this.gainEquipment(genEquipment(this.player.level, { luck: this.luck })); this.log(res.text, 'event'); break;
                case 'pet': this.gainPet(genPet(null, this.player.level)); this.log(res.text, 'event'); break;
                case 'checkin': {
                    const stones = Math.floor((5 + this.player.level * 2) * economyFactor(this.player.level) / economyFactor(1));
                    this.player.spiritStones += stones;
                    this.gainFragment(rint(1, 3));
                    this.log(`${res.text} 灵石+${fmt(stones)}，残页若干`, 'event'); break;
                }
                case 'battle': this.fight(genMonster(this.player.level, res.monsterType)); break;
            }
            this.checkAchievements();
        },

        // ---------- 战斗 ----------
        fight(monster, opts = {}) {
            const player = {
                name: this.player.name,
                stats: this.stats,
                health: opts.playerHealth || this.stats.health,
                maxHealth: this.stats.health,
                autoHeal: this.stats.autoHeal
            };
            // 应用副本内临时属性
            if (opts.runStats) player.stats = { ...player.stats, ...opts.runStats };
            if (opts.runHealth) { player.health = opts.runHealth; player.maxHealth = opts.runMaxHealth || player.maxHealth; }
            const result = runBattle(player, monster, { maxRounds: opts.maxRounds || 30 });
            this.battle = { monster, ...result, playerMaxHealth: player.maxHealth, time: Date.now() };
            // 胜利结算
            if (result.win) {
                this.player.counters.killCount++;
                const scale = economyFactor(this.player.level) / economyFactor(Math.max(1, monster.level - 4));
                const stones = Math.floor(monster.reward.stones * Math.max(0.2, Math.min(scale, 8)));
                this.player.spiritStones += stones;
                const cult = this.gainAdventureCultivation(Math.floor(monster.reward.cultivation * Math.max(0.2, Math.min(scale, 8))));
                this.log(`战胜【${monster.name}】! 灵石+${fmt(stones)} 修为+${fmt(cult)}`, 'victory');
                // 掉落
                const dropChance = monster.type === 'boss' ? 1 : monster.type === 'elite' ? 0.35 : 0.12;
                if (chance(dropChance)) {
                    const eq = genEquipment(Math.min(monster.level, this.player.level), { luck: this.luck, quality: monster.type === 'boss' ? pick(['warning', 'danger', 'pink']) : undefined });
                    this.gainEquipment(eq);
                    this.log(`【${monster.name}】掉落了 [${QUALITIES[eq.quality].name}] ${eq.name}!`, 'victory');
                }
                // 捕捉灵宠(XiuXianGame玩法)
                if (monster.reward.captureChance && chance(monster.reward.captureChance * this.luck)) {
                    const tier = monster.level > 90 ? 'mystic' : monster.level > 45 ? 'spiritual' : 'mortal';
                    this.gainPet(genPet(chance(0.05) ? 'celestial' : tier, monster.level));
                    this.log(`成功收服【${monster.name}】成为灵宠!`, 'victory');
                }
            } else {
                const loss = Math.floor(this.player.spirit * 0.1);
                this.player.spirit -= loss;
                this.log(`败给【${monster.name}】，仓皇而逃，灵力-${fmt(loss)}`, 'defeat');
            }
            this.checkAchievements();
            return result;
        },

        // ---------- 世界BOSS(vue-XiuXianGame) ----------
        canFightBoss() {
            return this.nextBossIn <= 0;
        },
        fightBoss() {
            if (!this.canFightBoss()) {
                this.log(`世界BOSS尚未刷新，还需 ${fmtTime(this.nextBossIn)}`, 'warning');
                return;
            }
            const info = genWorldBoss(this.player.level);
            const boss = genMonster(this.player.level + 5, 'world');
            boss.name = info.name;
            this.log(`世界BOSS【${info.name}】降临: "${info.text}"`, 'boss');
            const result = this.fight(boss, { maxRounds: 60 });
            this.player.nextBossTime = nowSec() + 24 * 3600;
            if (result.win) {
                this.player.counters.bossKills++;
                // 奖励: 神阶/仙阶装备 + 大量灵石 + 永久幸运
                for (let i = 0; i < 2; i++) {
                    const eq = genEquipment(this.player.level, { quality: chance(0.3) ? 'pink' : 'danger' });
                    this.gainEquipment(eq);
                }
                const stones = Math.floor((500 + this.player.level * 60) * economyFactor(this.player.level) / economyFactor(1) * 10);
                this.player.spiritStones += stones;
                if (this.player.luckBase < 3) {
                    this.player.luckBase = Math.round((this.player.luckBase + 0.05) * 100) / 100;
                    this.log('获得【悟性丹】, 永久幸运 +0.05!', 'boss');
                }
                this.log(`讨伐世界BOSS成功! 灵石+${fmt(stones)}, 获得两件高阶装备!`, 'boss');
            }
            this.checkAchievements();
        },

        // ---------- 背包/装备 ----------
        gainEquipment(item) {
            item.score = equipScore(item.stats);
            this.player.counters.equipmentFound++;
            if (item.quality === 'pink') this.player.counters.pinkFound++;
            // 自动出售
            if (this.player.settings.autoSellQualities.includes(item.quality) && this.player.inventory.length > 60) {
                const gain = salvageGain(item);
                this.player.spiritStones += gain.stones;
                this.player.reinforceStones += gain.refine;
                return;
            }
            if (this.player.inventory.length >= 200) {
                this.log('背包已满(200), 请分解装备', 'warning');
                return;
            }
            this.player.inventory.unshift(item);
        },
        equipItem(id) {
            const idx = this.player.inventory.findIndex(i => i.id === id);
            if (idx < 0) return;
            const item = this.player.inventory[idx];
            if (item.level > this.player.level + 5) {
                this.log(`境界不足，无法穿戴 ${item.level} 级装备`, 'warning');
                return;
            }
            let slot = item.slot;
            // 双戒指: 优先空槽
            if (slot === 'ring1' || slot === 'ring2') {
                slot = !this.player.equipment.ring1 ? 'ring1' : !this.player.equipment.ring2 ? 'ring2' : slot;
            }
            const old = this.player.equipment[slot];
            this.player.equipment[slot] = item;
            this.player.inventory.splice(idx, 1);
            if (old) this.player.inventory.unshift(old);
            this.log(`穿上 [${QUALITIES[item.quality].name}] ${item.name}`, 'equip');
        },
        unequipSlot(slot) {
            const item = this.player.equipment[slot];
            if (!item) return;
            if (this.player.inventory.length >= 200) { this.log('背包已满，请先整理装备后再卸下。', 'warning'); return; }
            this.player.equipment[slot] = null;
            delete this.player.equipment[slot];
            this.player.inventory.unshift(item);
        },
        salvageItem(id) {
            const idx = this.player.inventory.findIndex(i => i.id === id);
            if (idx < 0) return;
            const item = this.player.inventory[idx];
            if (item.locked) { this.log('装备已锁定，先解锁再分解', 'warning'); return; }
            const gain = salvageGain(item);
            this.player.inventory.splice(idx, 1);
            this.player.spiritStones += gain.stones;
            this.player.reinforceStones += gain.refine;
            this.log(`分解 [${QUALITIES[item.quality].name}] ${item.name}，灵石+${fmt(gain.stones)} 炼器石+${gain.refine}`, 'info');
        },
        salvageAll(qualityList) {
            const list = [...this.player.inventory].filter(i => !i.locked && qualityList.includes(i.quality));
            let stones = 0, refine = 0;
            for (const item of list) {
                const g = salvageGain(item);
                stones += g.stones; refine += g.refine;
                this.player.inventory.splice(this.player.inventory.indexOf(item), 1);
            }
            this.player.spiritStones += stones;
            this.player.reinforceStones += refine;
            this.log(`批量分解 ${list.length} 件装备，灵石+${fmt(stones)} 炼器石+${refine}`, 'info');
        },
        toggleLock(id) {
            const item = this.player.inventory.find(i => i.id === id);
            if (item) item.locked = !item.locked;
        },
        enhanceItem(id) {
            const item = this.player.inventory.find(i => i.id === id) || Object.values(this.player.equipment).find(i => i && i.id === id);
            if (!item) return;
            if (item.enhanceLevel >= 100) { this.log('装备已达最大强化等级', 'warning'); return; }
            if (item.enhanceLevel >= this.enhancementLimit) { this.log(`当前境界强化上限 +${this.enhancementLimit}，突破后再来。`, 'warning'); return; }
            const cost = enhanceCost(item);
            if (this.player.reinforceStones < cost) { this.log(`炼器石不足，需要 ${cost}`, 'warning'); return; }
            this.player.reinforceStones -= cost;
            this.player.counters.enhanceCount++;
            if (Math.random() < enhanceSuccess(item)) {
                item.enhanceLevel++;
                this.log(`强化成功! ${item.name} +${item.enhanceLevel}`, 'success');
            } else {
                this.log(`强化失败... ${item.name} 依旧是 +${item.enhanceLevel}`, 'warning');
            }
            this.checkAchievements();
        },
        reforgeItem(id) {
            const item = this.player.inventory.find(i => i.id === id) || Object.values(this.player.equipment).find(i => i && i.id === id);
            if (!item) return;
            const cost = REFORGE_CFG.costPerAttempt;
            if (this.player.refinementStones < cost) { this.log(`洗练石不足，需要 ${cost}`, 'warning'); return; }
            this.player.refinementStones -= cost;
            const oldScore = equipScore(item.stats);
            item.stats = reforge(item);
            item.score = equipScore(item.stats);
            const delta = item.score - oldScore;
            this.log(`洗练完成，评分 ${delta >= 0 ? '+' : ''}${fmt(Math.abs(delta))} → ${fmt(item.score)}`, delta >= 0 ? 'success' : 'warning');
        },

        // ---------- 灵草/炼丹 ----------
        gainHerb(herb) {
            const found = this.player.herbs.find(h => h.id === herb.id && h.quality === herb.quality);
            if (found) found.count++;
            else this.player.herbs.push({ ...herb, count: 1 });
        },
        sellHerb(id, quality) {
            const idx = this.player.herbs.findIndex(h => h.id === id && h.quality === quality);
            if (idx < 0) return;
            const h = this.player.herbs[idx];
            this.player.spiritStones += h.value * h.count;
            this.player.herbs.splice(idx, 1);
        },
        sellAllHerbs() {
            let total = 0;
            for (const h of this.player.herbs) total += h.value * h.count;
            this.player.herbs = [];
            this.player.spiritStones += total;
            this.log(`卖出全部灵草，灵石+${fmt(total)}`, 'info');
        },
        gainFragment(n) {
            // 随机加到一张未解锁丹方上
            const locked = pillRecipes.filter(r => !this.player.pillRecipes.includes(r.id));
            const target = locked.length ? pick(locked) : null;
            const rid = target ? target.id : pick(pillRecipes).id;
            this.player.pillFragments[rid] = (this.player.pillFragments[rid] || 0) + n;
        },
        craftPill(recipeId) {
            const recipe = pillRecipes.find(r => r.id === recipeId);
            if (!recipe) return;
            const unlocked = this.player.pillRecipes.includes(recipeId);
            if (!unlocked && (this.player.pillFragments[recipeId] || 0) < recipe.fragmentsNeeded) {
                this.log(`丹方残页不足，还需 ${recipe.fragmentsNeeded - (this.player.pillFragments[recipeId] || 0)} 页`, 'warning');
                return;
            }
            for (const m of recipe.materials) {
                const need = m.count;
                let have = 0;
                for (const h of this.player.herbs) if (h.id === m.herb) have += h.count;
                if (have < need) {
                    this.log(`灵草不足: ${herbById(m.herb).name} 需要${need}株`, 'warning');
                    return;
                }
            }
            // 扣材料
            for (const m of recipe.materials) {
                let need = m.count;
                for (const h of this.player.herbs) {
                    const take = Math.min(need, h.count);
                    h.count -= take; need -= take;
                    if (need <= 0) break;
                }
            }
            this.player.herbs = this.player.herbs.filter(h => h.count > 0);
            if (!unlocked) {
                this.player.pillFragments[recipeId] -= recipe.fragmentsNeeded;
                this.player.pillRecipes.push(recipeId);
                this.player.counters.unlockedPillRecipes = this.player.pillRecipes.length;
                this.log(`丹方【${recipe.name}】参悟成功!`, 'success');
            }
            this.player.counters.pillsCrafted++;
            if (Math.random() > pillGrades[recipe.grade].successRate * this.player.alchemyRate * this.luck) {
                this.log(`【${recipe.name}】炼制失败，药材化为灰烬...`, 'warning');
            } else {
                const found = this.player.pills.find(p => p.recipeId === recipeId);
                if (found) found.count++;
                else this.player.pills.push({ recipeId, count: 1 });
                this.log(`【${recipe.name}】炼制成功!`, 'success');
            }
            this.checkAchievements();
        },
        usePill(recipeId) {
            const idx = this.player.pills.findIndex(p => p.recipeId === recipeId);
            if (idx < 0) return;
            const recipe = pillRecipes.find(r => r.id === recipeId);
            const effect = calculatePillEffect(recipe, this.player.level);
            this.player.pills[idx].count--;
            if (this.player.pills[idx].count <= 0) this.player.pills.splice(idx, 1);
            this.player.counters.pillsConsumed++;
            // 同类型效果刷新
            const existing = this.player.activeEffects.find(e => e.type === effect.type && e.name === recipe.name);
            if (existing) { existing.value = Math.max(existing.value, effect.value); existing.remain = effect.duration; }
            else this.player.activeEffects.push({ id: uid(), name: recipe.name, type: effect.type, value: effect.value, remain: effect.duration });
            this.log(`服用【${recipe.name}】，${effect.type === 'autoHeal' ? '战斗中自动疗伤' : effect.type + ' +'}${pct(effect.value)}，持续 ${fmtTime(effect.duration)}`, 'success');
        },

        // ---------- 灵宠 ----------
        gainPet(pet) {
            this.player.counters.petFound++;
            if (pet.rarity === 'divine') this.player.counters.divinePetFound++;
            if (this.player.pets.length >= 50) {
                this.player.petEssence += RARITIES[pet.rarity].essence;
                this.log('灵宠栏已满，自动放生', 'warning');
                return;
            }
            this.player.pets.push(pet);
            this.log(`获得灵宠【${pet.name}】(${RARITIES[pet.rarity].name}) ${pet.description}`, 'pet');
        },
        deployPet(id) {
            this.player.activePetId = this.player.activePetId === id ? null : id;
        },
        upgradePet(id) {
            const pet = this.player.pets.find(p => p.id === id);
            if (!pet) return;
            const cost = petUpgradeCost(pet);
            if (this.player.petEssence < cost) { this.log(`灵宠精华不足，需要 ${cost}`, 'warning'); return; }
            this.player.petEssence -= cost;
            pet.level++;
            this.log(`【${pet.name}】培养至 ${pet.level} 级`, 'pet');
        },
        evolvePet(id, foodId) {
            const pet = this.player.pets.find(p => p.id === id);
            const food = this.player.pets.find(p => p.id === foodId);
            if (!pet || !food || pet === food) return;
            if (pet.name !== food.name || pet.rarity !== food.rarity) {
                this.log('进化需要同名同稀有度的灵宠', 'warning');
                return;
            }
            this.player.petEssence += Math.floor(RARITIES[food.rarity].essence * 0.5);
            this.player.pets.splice(this.player.pets.indexOf(food), 1);
            pet.star++;
            this.log(`【${pet.name}】进化成功，升至 ${pet.star} 星!`, 'pet');
        },
        releasePet(id) {
            const idx = this.player.pets.findIndex(p => p.id === id);
            if (idx < 0) return;
            const pet = this.player.pets[idx];
            if (this.player.activePetId === id) this.player.activePetId = null;
            this.player.petEssence += RARITIES[pet.rarity].essence;
            this.player.pets.splice(idx, 1);
            this.log(`放生【${pet.name}】，精华+${RARITIES[pet.rarity].essence}`, 'info');
        },

        // ---------- 抽奖 ----------
        gachaCost(pool, n) {
            const base = (8 + getRealm(this.player.level).stageIndex * 3) ** 2 * 60;
            return Math.floor(base * n * (n >= 10 ? 0.9 : 1));
        },
        gacha(pool, n) {
            const cost = this.gachaCost(pool, n);
            if (this.player.spiritStones < cost) { this.log('灵石不足', 'warning'); return; }
            this.player.spiritStones -= cost;
            this.player.counters.gachaCount += n;
            const results = [];
            for (let i = 0; i < n; i++) {
                if (pool === 'equipment') {
                    const eq = genEquipment(this.player.level, { luck: this.luck * 1.3 });
                    this.gainEquipment(eq);
                    results.push({ kind: 'equip', item: eq });
                } else {
                    const pet = genPet(null, this.player.level);
                    this.gainPet(pet);
                    results.push({ kind: 'pet', item: pet });
                }
            }
            this.gachaResults = { pool, results, time: Date.now() };
            const best = results.reduce((a, b) => {
                const ra = a.kind === 'equip' ? QUALITY_ORDER.indexOf(a.item.quality) : Object.keys(RARITIES).indexOf(a.item.rarity);
                const rb = b.kind === 'equip' ? QUALITY_ORDER.indexOf(b.item.quality) : Object.keys(RARITIES).indexOf(b.item.rarity);
                return rb > ra ? b : a;
            });
            const bestName = best.kind === 'equip' ? `[${QUALITIES[best.item.quality].name}]${best.item.name}` : `【${best.item.name}】(${RARITIES[best.item.rarity].name})`;
            this.log(`抽奖×${n}，最佳: ${bestName}`, 'gacha');
            this.checkAchievements();
        },

        // ---------- 秘境副本(roguelike) ----------
        dungeonEntryCost(difficulty) { return Math.ceil(baseSpiritRegen(this.player.level) * (DIFFICULTIES[difficulty]?.entrySeconds || 45)); },
        dungeonStart(difficulty) {
            const cfg = DIFFICULTIES[difficulty];
            if (!cfg || (this.dungeon && !this.dungeon.finished)) return;
            const entryCost = this.dungeonEntryCost(difficulty);
            if (this.player.level < cfg.minLevel) {
                this.log(`${cfg.name}难度需要 ${realmName(cfg.minLevel)}`, 'warning');
                return;
            }
            if (this.player.spirit < entryCost) { this.log(`入境需要 ${fmt(entryCost)} 灵力，请先恢复。`, 'warning'); return; }
            this.player.spirit -= entryCost;
            const st = this.stats;
            this.dungeon = {
                difficulty,
                entryLevel: this.player.level,
                floorMax: cfg.floors,
                cleared: false,
                floor: 1,
                maxHealth: st.health,
                runHealth: st.health,
                runStats: { ...st },
                options: [],
                finished: false
            };
            this.log(`进入秘境(${cfg.name})，共 ${cfg.floors} 层`, 'dungeon');
            this.dungeonEncounter();
        },
        dungeonEncounter() {
            const d = this.dungeon;
            if (!d || d.finished) return;
            const cfg = DIFFICULTIES[d.difficulty];
            const type = d.floor === d.floorMax ? 'boss' : chance(0.25) ? 'elite' : 'normal';
            const ceiling = d.difficulty === 1 ? (getRealm(d.entryLevel).stageIndex + 1) * 9 : MAX_LEVEL;
            const m = genMonster(Math.min(ceiling, d.entryLevel + d.floor - 1), type);
            // 应用难度系数
            m.stats.health = Math.floor(m.stats.health * cfg.healthMod);
            m.stats.attack = Math.floor(m.stats.attack * cfg.damageMod);
            m.reward.stones = Math.floor(m.reward.stones * cfg.rewardMod * 2);
            m.reward.cultivation = Math.floor(m.reward.cultivation * cfg.rewardMod * 2);
            d.currentMonster = m;
            const player = {
                name: this.player.name,
                stats: { ...this.stats, ...d.runStats },
                health: d.runHealth,
                maxHealth: d.maxHealth,
                autoHeal: this.stats.autoHeal
            };
            const result = runBattle(player, m, { maxRounds: 30 });
            this.battle = { monster: m, ...result, playerMaxHealth:player.maxHealth, time: Date.now() };
            d.runHealth = result.playerHealth;
            if (result.win) {
                const stones = Math.floor(m.reward.stones * (1 + d.floor * 0.1));
                this.player.spiritStones += stones;
                this.gainAdventureCultivation(m.reward.cultivation);
                this.log(`第${d.floor}层击败【${m.name}】，灵石+${fmt(stones)}`, 'dungeon');
                if (d.floor >= d.floorMax) {
                    // 通关
                    this.player.counters.dungeonClear += d.floorMax;
                    d.cleared = true;
                    if (!this.player.progression.trials.includes(d.difficulty)) this.player.progression.trials.push(d.difficulty);
                    if (d.difficulty === 4) this.player.counters.dungeonHellClear = 1;
                    const tiers = {1:['success','primary'],2:['primary','purple'],3:['purple','warning'],4:['warning','danger']};
                    const eq = genEquipment(this.player.level, { quality: tiers[d.difficulty][chance(0.35) ? 1 : 0], luck: this.luck });
                    this.gainEquipment(eq);
                    this.log(`秘境通关! 获得宝箱装备 [${QUALITIES[eq.quality].name}] ${eq.name}`, 'dungeon');
                    d.finished = true;
                } else {
                    d.options = rollBuffOptions(3);
                    d.phase = 'choose';
                }
            } else {
                this.log(`在秘境第${d.floor}层落败，被传送出来...`, 'defeat');
                d.finished = true;
            }
            this.checkAchievements();
        },
        dungeonChooseBuff(optId) {
            const d = this.dungeon;
            if (!d || d.phase !== 'choose') return;
            const opt = d.options.find(o => o.id === optId);
            if (!opt) return;
            const ctx = { runStats: d.runStats, runHealth: d.runHealth, maxHealth: d.maxHealth };
            opt.apply(ctx);
            d.maxHealth = ctx.maxHealth;
            d.runHealth = Math.min(d.maxHealth, ctx.runHealth);
            this.log(`获得秘境强化【${opt.name}】${opt.description}`, 'dungeon');
            d.floor++;
            d.phase = 'battle';
            d.options = [];
            this.dungeonEncounter();
        },
        dungeonExit() {
            this.dungeon = null;
        },

        // ---------- 签到(vue-XiuXianGame checkin) ----------
        checkin() {
            if (!this.checkinAvailable) return;
            const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            this.player.checkin.streak = this.player.checkin.lastDate === y ? this.player.checkin.streak + 1 : 1;
            this.player.checkin.lastDate = today();
            this.player.counters.checkinTotal++;
            const mult = 1 + Math.min(this.player.checkin.streak, 7) * 0.2;
            const stones = Math.floor(100 * mult * economyFactor(this.player.level) / economyFactor(1));
            this.player.spiritStones += stones;
            this.gainFragment(rint(2, 5));
            if (chance(0.3)) {
                const eq = genEquipment(this.player.level, { luck: 1.5 });
                this.gainEquipment(eq);
            }
            this.log(`签到成功(连续${this.player.checkin.streak}天)，灵石+${fmt(stones)}，残页+若干`, 'success');
            this.checkAchievements();
        },

        // ---------- 成就 ----------
        checkAchievements() {
            for (const ach of achievements) {
                if (this.player.achievements.includes(ach.id)) continue;
                const val = ach.cond.counter === 'level' ? this.player.level : (this.player.counters[ach.cond.counter] || 0);
                if (val >= ach.cond.target) {
                    this.player.achievements.push(ach.id);
                    this.player.spiritStones += ach.reward;
                    if (ach.title && !this.player.unlockedTitles.includes(ach.title)) {
                        this.player.unlockedTitles.push(ach.title);
                    }
                    this.log(`达成成就【${ach.name}】! 灵石+${fmt(ach.reward)}${ach.title ? `，获得称号「${ach.title}」` : ''}`, 'achievement');
                }
            }
        },
        equipTitle(title) {
            this.player.title = title;
        },

        // ---------- GM(idle-xiuxian) ----------
        gm(command, value = 0) {
            if (!this.isGM) return;
            const p = this.player;
            switch (command) {
                case 'spirit': p.spirit = this.spiritCap; break;
                case 'stones': p.spiritStones += 100000; break;
                case 'stones_max': p.spiritStones += 10000000; break;
                case 'reinforce': p.reinforceStones += 1000; break;
                case 'refinement': p.refinementStones += 1000; break;
                case 'essence': p.petEssence += 1000; break;
                case 'cultivation': p.cultivation = maxCultivationOf(p.level); break;
                case 'levelup': for (let i = 0; i < (value || 9); i++) { if (p.level < MAX_LEVEL) p.level++; } p.counters.level = Math.max(p.counters.level, p.level); break;
                case 'equip': this.gainEquipment(genEquipment(p.level, { quality: 'pink' })); break;
                case 'pet': this.gainPet(genPet('divine', p.level)); break;
                case 'herbs': for (let i = 0; i < 30; i++) this.gainHerb(getRandomHerb(5)); break;
                case 'fragments': for (const r of pillRecipes) p.pillFragments[r.id] = (p.pillFragments[r.id] || 0) + r.fragmentsNeeded; break;
                case 'reset_boss': p.nextBossTime = 0; break;
            }
            this.log(`GM指令 [${command}] 执行完毕`, 'gm');
        },

        // ---------- 存档管理 ----------
        rename(name) {
            name = (name || '').trim().slice(0, 8);
            if (!name) return;
            this.player.name = name;
            this.log(`道号改为「${name}」`, 'info');
        },
        exportSave() {
            return JSON.stringify({ version: 1, exportAt: new Date().toISOString(), player: this.player });
        },
        backupSave() {
            const success = createBackup(this.player);
            this.log(success ? '本地备份已保存，可在设置中恢复。' : '备份未成功，请导出存档。', success ? 'success' : 'warning');
            return success;
        },
        restoreBackup() {
            const backup = readBackup();
            if (!backup) { this.log('没有可恢复的本地备份。', 'warning'); return false; }
            return this.importSave(backup);
        },
        importSave(json) {
            try {
                const data = JSON.parse(json);
                if (data?.version !== 1 || !data.player) throw new Error('不支持的存档格式');
                data.player.progression ??= freshProgression(data.player.level);
                if (data.player.progression.version !== BALANCE_VERSION) data.player.progression = freshProgression(data.player.level);
                validateSave(data.player, createPlayer());
                if (!Number.isInteger(data.player.level) || data.player.level < 1 || data.player.level > MAX_LEVEL) throw new Error('境界无效');
                for (const key of ['spirit', 'cultivation', 'spiritStones', 'points', 'lastOnline']) {
                    if (data.player[key] < 0) throw new Error(`${key} 不可为负数`);
                }
                const equipment = [...data.player.inventory, ...Object.values(data.player.equipment).filter(Boolean)];
                for (const item of equipment) {
                    if (!item || typeof item.name !== 'string' || !QUALITIES[item.quality] ||
                        typeof item.slot !== 'string' || !item.stats || typeof item.stats !== 'object' || Array.isArray(item.stats) ||
                        !Number.isFinite(item.level) || !Number.isFinite(item.enhanceLevel)) throw new Error('装备数据无效');
                }
                for (const pet of data.player.pets) {
                    if (!pet || !RARITIES[pet.rarity] || !pet.bonus || typeof pet.bonus !== 'object' ||
                        !Number.isFinite(pet.level) || !Number.isFinite(pet.star)) throw new Error('灵宠数据无效');
                }
                for (const effect of data.player.activeEffects) {
                    if (!effect || typeof effect.type !== 'string' || !Number.isFinite(effect.value) ||
                        !Number.isFinite(effect.remain)) throw new Error('效果数据无效');
                }
                for (const herb of data.player.herbs) {
                    if (!herb || !herbById(herb.id) || !Number.isFinite(herb.count) || !Number.isFinite(herb.value)) throw new Error('灵草数据无效');
                }
                for (const pill of data.player.pills) {
                    if (!pill || !pillRecipes.some(r => r.id === pill.recipeId) || !Number.isFinite(pill.count)) throw new Error('丹药数据无效');
                }
                if (!createBackup(this.player)) throw new Error('无法备份当前进度，请先导出存档');
                this.player = data.player;
                this.player.lastOnline = Date.now();
                this._lastTick = Date.now();
                this.offlineReport = null;
                this.lastOfflineReport = null;
                rememberOfflineReport(null);
                this.autoExploreMessage = '';
                this.exploreCd = 0;
                this.gachaResults = null;
                this.logs = [];
                this.dungeon = null;
                this.battle = null;
                this.log('存档导入成功!', 'success');
                return true;
            } catch (e) {
                this.log('存档导入失败: ' + e.message, 'danger');
                return false;
            }
        },
        resetGame() {
            if (!createBackup(this.player)) return false;
            this.lastOfflineReport = null; this.offlineReport = null; this.autoExploreMessage = '';
            rememberOfflineReport(null);
            this.player = createPlayer();
            this.exploreCd = 0; this._lastTick = Date.now();
            this.logs = []; this.battle = null; this.dungeon = null; this.gachaResults = null;
            this.log('轮回重修，一切归零...', 'breakthrough');
        }
    },

    persist: {
        key: 'idle-xiuxian-fusion',
        storage: saveStorage,
        pick: ['player']
    }
});

