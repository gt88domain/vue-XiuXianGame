// ===== 装备系统(融合版) =====
// 槽位体系来自 vue-idle-xiuxian(13槽位 + 洗练/强化)
// 品质体系与命名库来自 vue-XiuXianGame(黄/玄/地/天/帝/神/仙 7阶 + 240个装备名)

import { rint, rfloat, pick, chance, uid } from '../utils';
import { combatFactor, getRealm } from './realms';
import { equipmentQualityCeiling } from '../progression';

// ---------- 品质(vue-XiuXianGame) ----------
export const QUALITIES = {
    info:    { name: '黄阶', color: 'info',    weight: 50,  mult: 1.2,  statCount: 2 },
    success: { name: '玄阶', color: 'success', weight: 20,  mult: 2,    statCount: 2 },
    primary: { name: '地阶', color: 'primary', weight: 15,  mult: 3,    statCount: 3 },
    purple:  { name: '天阶', color: 'purple',  weight: 9,   mult: 5,    statCount: 3 },
    warning: { name: '帝阶', color: 'warning', weight: 5,   mult: 7,    statCount: 4 },
    danger:  { name: '神阶', color: 'danger',  weight: 1,   mult: 10,   statCount: 4 },
    pink:    { name: '仙阶', color: 'pink',    weight: 0.3, mult: 16,   statCount: 5 }
};
export const QUALITY_ORDER = ['info', 'success', 'primary', 'purple', 'warning', 'danger', 'pink'];

// ---------- 槽位(13槽来自 idle-xiuxian) ----------
export const SLOTS = {
    weapon:   { name: '神兵', pool: 'weapon' },
    head:     { name: '头部', prefixes: ['天灵', '玄冥', '紫金', '青玉', '赤霞', '幽月', '星辰', '云霄'], base: ['冠', '盔', '簪'] },
    body:     { name: '衣服', pool: 'body' },
    legs:     { name: '裤子', prefixes: ['天罡', '玄武', '紫电', '青云', '赤阳', '幽灵', '星光', '云雾'], base: ['裤', '行障', '缚腿'] },
    feet:     { name: '鞋子', prefixes: ['天行', '玄风', '紫霞', '青莲', '赤焰', '幽影', '星步', '云踪'], base: ['靴', '履', '靴'] },
    shoulder: { name: '肩甲', prefixes: ['天御', '玄岳', '紫岩', '青峰', '赤铁', '幽山', '星岩', '云岭'], base: ['肩铠', '肩甲', '护肩'] },
    hands:    { name: '手套', prefixes: ['天罗', '玄玉', '紫晶', '青钢', '赤金', '幽银', '星铁', '云纹'], base: ['手套', '拳套', '指虎'] },
    wrist:    { name: '护腕', prefixes: ['天绝', '玄铁', '紫玉', '青石', '赤铜', '幽钢', '星晶', '云纱'], base: ['护腕', '腕甲', '缠腕'] },
    necklace: { name: '项链', pool: 'necklace' },
    ring1:    { name: '戒指', prefixes: ['天命', '玄命', '紫命', '青命', '赤命', '幽命', '星命', '云命'], base: ['戒', '指环', '扳指'] },
    ring2:    { name: '戒指', prefixes: ['天道', '玄道', '紫道', '青道', '赤道', '幽道', '星道', '云道'], base: ['戒', '指环', '扳指'] },
    belt:     { name: '腰带', prefixes: ['天系', '玄系', '紫系', '青系', '赤系', '幽系', '星系', '云系'], base: ['腰带', '束带', '锦带'] },
    artifact: { name: '法宝', pool: 'sutra' }
};

// ---------- 属性池(数值区间来自 idle-xiuxian Gacha) ----------
export const STAT_NAMES = {
    attack: '攻击', health: '生命', defense: '防御', speed: '速度',
    critRate: '暴击率', comboRate: '连击率', counterRate: '反击率', stunRate: '眩晕率',
    dodgeRate: '闪避率', vampireRate: '吸血率',
    critResist: '抗暴击', comboResist: '抗连击', counterResist: '抗反击', stunResist: '抗眩晕',
    dodgeResist: '抗闪避', vampireResist: '抗吸血',
    healBoost: '强化治疗', critDamageBoost: '暴击伤害', critDamageReduce: '爆伤减免',
    finalDamageBoost: '最终增伤', finalDamageReduce: '最终减伤',
    combatBoost: '战斗属性提升', resistanceBoost: '抗性提升',
    spiritRate: '灵力获取', luck: '幸运'
};

// 百分比属性上限(防止高阶装备数值爆炸)
export const STAT_CAPS = {
    critRate: 0.6, comboRate: 0.5, counterRate: 0.5, stunRate: 0.4, dodgeRate: 0.5, vampireRate: 0.4,
    critResist: 0.5, comboResist: 0.5, counterResist: 0.5, stunResist: 0.5, dodgeResist: 0.5, vampireResist: 0.5,
    healBoost: 1, critDamageBoost: 2, critDamageReduce: 0.6, finalDamageBoost: 1, finalDamageReduce: 0.6,
    combatBoost: 1, resistanceBoost: 1, spiritRate: 2, luck: 2
};
const clampStat = (stat, v) => isPercentStat(stat) ? Math.min(v, STAT_CAPS[stat] || 1) : v;

const PERCENT_STATS = ['critRate', 'comboRate', 'counterRate', 'stunRate', 'dodgeRate', 'vampireRate',
    'critResist', 'comboResist', 'counterResist', 'stunResist', 'dodgeResist', 'vampireResist',
    'healBoost', 'critDamageBoost', 'critDamageReduce', 'finalDamageBoost', 'finalDamageReduce',
    'combatBoost', 'resistanceBoost', 'spiritRate', 'luck'];

export const isPercentStat = stat => PERCENT_STATS.includes(stat);

const STAT_POOLS = {
    weapon: [
        { stat: 'attack', min: 10, max: 24, weight: 5 },
        { stat: 'critRate', min: 0.05, max: 0.1, weight: 3 },
        { stat: 'critDamageBoost', min: 0.1, max: 0.3, weight: 2 },
        { stat: 'comboRate', min: 0.05, max: 0.12, weight: 2 },
        { stat: 'finalDamageBoost', min: 0.05, max: 0.12, weight: 1 },
        { stat: 'vampireRate', min: 0.04, max: 0.1, weight: 1 }
    ],
    head: [
        { stat: 'defense', min: 8, max: 18, weight: 4 },
        { stat: 'health', min: 50, max: 110, weight: 4 },
        { stat: 'stunResist', min: 0.05, max: 0.12, weight: 2 },
        { stat: 'dodgeResist', min: 0.04, max: 0.1, weight: 1 }
    ],
    body: [
        { stat: 'defense', min: 12, max: 26, weight: 5 },
        { stat: 'health', min: 80, max: 160, weight: 5 },
        { stat: 'finalDamageReduce', min: 0.04, max: 0.1, weight: 2 }
    ],
    legs: [
        { stat: 'defense', min: 8, max: 18, weight: 4 },
        { stat: 'speed', min: 5, max: 12, weight: 3 },
        { stat: 'dodgeRate', min: 0.04, max: 0.1, weight: 2 }
    ],
    feet: [
        { stat: 'defense', min: 6, max: 14, weight: 3 },
        { stat: 'speed', min: 8, max: 16, weight: 4 },
        { stat: 'dodgeRate', min: 0.05, max: 0.12, weight: 3 }
    ],
    shoulder: [
        { stat: 'defense', min: 6, max: 12, weight: 4 },
        { stat: 'health', min: 40, max: 90, weight: 3 },
        { stat: 'counterRate', min: 0.05, max: 0.1, weight: 2 }
    ],
    hands: [
        { stat: 'attack', min: 6, max: 14, weight: 4 },
        { stat: 'critRate', min: 0.03, max: 0.08, weight: 3 },
        { stat: 'comboRate', min: 0.04, max: 0.1, weight: 2 }
    ],
    wrist: [
        { stat: 'defense', min: 5, max: 12, weight: 4 },
        { stat: 'counterRate', min: 0.04, max: 0.1, weight: 2 },
        { stat: 'vampireRate', min: 0.04, max: 0.1, weight: 2 }
    ],
    necklace: [
        { stat: 'health', min: 60, max: 130, weight: 4 },
        { stat: 'healBoost', min: 0.1, max: 0.25, weight: 2 },
        { stat: 'spiritRate', min: 0.08, max: 0.2, weight: 3 }
    ],
    ring1: [
        { stat: 'attack', min: 6, max: 14, weight: 4 },
        { stat: 'critDamageBoost', min: 0.1, max: 0.25, weight: 2 },
        { stat: 'finalDamageBoost', min: 0.04, max: 0.1, weight: 2 },
        { stat: 'luck', min: 0.05, max: 0.15, weight: 1 }
    ],
    ring2: [
        { stat: 'defense', min: 6, max: 14, weight: 4 },
        { stat: 'critDamageReduce', min: 0.08, max: 0.2, weight: 2 },
        { stat: 'resistanceBoost', min: 0.05, max: 0.12, weight: 2 }
    ],
    belt: [
        { stat: 'health', min: 40, max: 90, weight: 4 },
        { stat: 'defense', min: 5, max: 10, weight: 3 },
        { stat: 'combatBoost', min: 0.04, max: 0.1, weight: 2 }
    ],
    artifact: [
        { stat: 'attack', min: 14, max: 30, weight: 4 },
        { stat: 'critRate', min: 0.06, max: 0.14, weight: 3 },
        { stat: 'comboRate', min: 0.06, max: 0.14, weight: 2 },
        { stat: 'spiritRate', min: 0.1, max: 0.25, weight: 2 },
        { stat: 'vampireRate', min: 0.05, max: 0.12, weight: 1 }
    ]
};

// ---------- 命名库(vue-XiuXianGame equip.js / boss.js) ----------
const POOL_NAMES = {
    weapon: {
        info:    ['白玉净尘剑', '雪魄寒冰枪', '白龙吟风弓', '月华流光扇', '白玉玄灵笛', '霜雪无痕鞭', '云隐白凰刃', '净世白莲杖', '冰魄寒光轮', '白玉玲珑塔'],
        success: ['翠玉青藤剑', '碧影灵蛇鞭', '绿叶风暴弓', '青木长生杖', '翡翠灵犀刃', '藤蔓缠绕索', '翠竹清风扇', '生命之泉壶', '绿野仙踪笛', '森罗万象轮'],
        primary: ['寒冰破晓剑', '碧海潮生笛', '蓝玉冰魄弓', '苍穹蓝龙枪', '冰魄寒光剑', '鲛人织梦扇', '深海之怒戟', '碧波凌霄杖', '幽蓝蝶舞鞭', '银河落霜刃'],
        purple:  ['紫霄龙吟剑', '幽冥紫蝶刃', '星河紫电枪', '紫玉寒冰弓', '紫焰凤凰琴', '苍穹紫雷锤', '紫莲幽光扇', '紫晶破晓戟', '幽冥紫影鞭', '紫霄凌虚杖'],
        warning: ['金煌剑', '炽焰长枪', '琥珀流光弓', '龙鳞金斧', '破晓黄玉锤', '炎阳鞭', '流光扇', '战神金戟', '黄芒闪电刃', '日曜乾坤轮'],
        danger:  ['赤焰凤凰剑', '血玉红莲枪', '烈焰焚天弓', '赤霄神火戟', '火舞流云扇', '朱雀炎翼鞭', '赤龙焚世刃', '炎狱魔瞳镰', '炽血星辰杖', '红莲业火轮'],
        pink:    ['诛仙四剑', '太极玄清符', '盘古开天斧', '东皇钟', '轩辕圣道剑', '崆峒印', '炼妖壶', '山河社稷图', '混沌钟', '弑神枪']
    },
    body: {
        info:    ['瑶池仙绡羽衣', '广寒玉兔霜甲', '昆仑玉璧战袍', '白龙吐珠云裳', '九天玄女素绫', '瑶光星辰织锦', '冰魄银丝战衣', '凌霄琼华宝衣', '雪域神女雪绒', '云隐龙鳞轻铠'],
        success: ['翠竹幽兰轻衫', '碧落青藤云裳', '碧眼麒麟战衣', '青鸾翔翼织锦', '苍梧古木灵袍', '绿野仙踪羽衣', '灵蛇翠蔓软甲', '翡翠琉璃长裙', '松风竹影轻裘', '春水碧于天衣'],
        primary: ['寒冰护甲衣', '碧波守护铠', '蓝玉冰心链甲', '苍穹蓝灵披风', '深海蛟龙鳞甲', '冰魄幽光战铠', '蓝蝶轻舞护腕', '银河之盾胸甲', '鲛人织梦护腿', '碧波凌波靴'],
        purple:  ['紫云织锦袍', '幽冥紫霜甲', '星河紫霞衣', '紫玉冰心链甲', '紫焰凤凰披风', '苍穹紫雷战铠', '紫莲幽光护腕', '紫晶凌霄战裙', '幽冥紫影护腿', '紫霄逐风靴'],
        warning: ['金辉流光锦袍', '琥珀流光战衣', '黄土龙纹长袍', '日炎金鳞铠甲', '秋菊金缎华服', '蜜蜡黄绸云裳', '凤凰涅槃黄衫', '黄沙漫天披风', '金穗流光纱裙', '辉煌金羽战袍'],
        danger:  ['烈焰红莲战甲', '赤霄火凤云裳', '朱雀焚天织锦', '赤焰龙鳞宝衣', '血色蔷薇华服', '丹霞流光长袍', '炎阳炽烈战袍', '炽火红莲披风', '火舞凤凰羽衣', '红莲业火锦衣'],
        pink:    ['九天玄女圣衣', '女娲补天锦', '不死火凤羽衣', '混沌青莲体', '太初道袍', '万劫不灭甲', '先天紫绶衣', '大罗仙尊袍', '鸿蒙紫气裳', '永恒星河铠']
    },
    necklace: {
        info:    ['瑶池白玉簪', '月华流光坠', '寒霜凝露链', '九天玄女玉佩', '云锦织梦镯', '龙涎润雪环', '白鹤衔珠珮', '仙山雪莲花链', '瑶台仙露耳环', '银河织梦项链'],
        success: ['翠竹凝露簪', '碧泉幽兰链', '青藤绕梦镯', '翡翠灵叶耳环', '灵山仙草玉佩', '松柏长青戒', '翠影轻舞项链', '绿野仙踪手环', '碧波荡漾珠链', '春回大地玉珮'],
        primary: ['碧海珊瑚簪', '冰魄幽蓝链', '深海珍珠耳环', '蓝田玉髓镯', '苍穹蓝宝坠', '鲛人泪滴珠', '碧波荡漾戒', '银河之心项链', '蓝蝶飞舞手环', '深海龙鳞珮'],
        purple:  ['紫霄流光戒', '幽冥紫蝶项链', '星河紫玉耳环', '紫玉冰心手链', '紫焰凤凰簪', '苍穹紫雷吊坠', '紫莲幽光发带', '紫晶破晓护符', '幽冥紫影指环', '紫霄凌虚玉佩'],
        warning: ['金辉日冕簪', '琥珀流光链', '黄粱一梦镯', '皇天后土玉佩', '蜜蜡福瑞戒', '秋收万颗项链', '暖阳照耀耳环', '炎黄子孙玉珮', '金色麦田手环', '盛世繁华珠链'],
        danger:  ['赤焰凤凰翎', '血珀琉璃坠', '烈焰红宝石链', '朱雀之翼耳环', '红莲业火镯', '丹霄火凤戒', '玛瑙赤焰项链', '炽天使之泪珮', '绯红织锦手环', '火凤涅槃珠链'],
        pink:    ['周天星斗戒', '轮回生死簿坠', '天道酬勤佩', '鸿蒙灵宝珠', '造化玉牒链', '太虚幻境簪', '命轮天指针', '宿命之环', '永恒之心', '万物本源坠']
    },
    sutra: {
        info:    ['白玉净瓶', '寒霜琉璃镜', '瑶池雪莲珠', '九天玄冰尺', '月华宝莲灯', '白云隐龙笛', '玉清昆仑扇', '净世白莲座', '银河落雪琴', '碧落瑶光盘'],
        success: ['翠玉葫芦', '青木长生杖', '碧落灵珠', '幽冥鬼藤鞭', '万木回春图', '绿绮琴音笛', '青鸾火凤羽扇', '翠影追魂剑', '草木皆兵符', '碧泉灵泉壶'],
        primary: ['碧波神珠', '冰魄寒玉葫', '深海龙息珠', '苍穹蓝灵珠', '鲛人织梦灯', '银河落霜瓶', '蓝玉冰心镜', '寒冰净世莲', '碧波幽兰笛', '深海龙吟佩'],
        purple:  ['紫霄神雷珠', '幽冥紫蝶翼', '星河紫玉壶', '紫玉冰心镜', '紫焰凤凰翎', '苍穹紫雷鼎', '紫莲幽光轮', '紫晶破晓琴', '幽冥紫影幡', '紫霄凌虚印'],
        warning: ['金蛟剪', '乾坤圈', '黄金玲珑塔', '戊己杏黄旗', '轩辕黄帝鼎', '镇妖伏魔镜', '落日熔金轮', '万寿无疆葫芦', '金翅大鹏羽扇', '地黄玄玉珠'],
        danger:  ['炽焰灵珠阵图', '火凤涅槃炉鼎', '红莲业火净世碑', '血玉轮回盘', '朱雀翔天翼', '烈焰焚天炉', '丹霄火域图', '赤龙炼魂珠', '火灵炽心镜', '九转炎灵祭坛'],
        pink:    ['混沌青莲', '造化玉牒', '鸿蒙量天尺', '弑神枪·灭', '太极图', '盘古幡', '诛仙剑阵图', '天地玄黄塔', '周天星辰盘', '万道归一炉']
    }
};

// 生成装备名: 4大主槽用 XiuXianGame 名称库, 其余槽位用 idle-xiuxian 前缀拼名
const genName = (slot, quality) => {
    const slotCfg = SLOTS[slot];
    if (slotCfg.pool) return pick(POOL_NAMES[slotCfg.pool][quality]);
    return pick(slotCfg.prefixes) + pick(slotCfg.base);
};

// 按权重随机品质
export const rollQuality = (luck = 1) => {
    const adjusted = QUALITY_ORDER.map(q => ({
        q,
        w: q === 'info' ? QUALITIES[q].weight / Math.max(luck, 0.5) : QUALITIES[q].weight * luck
    }));
    const total = adjusted.reduce((a, { w }) => a + w, 0);
    let roll = Math.random() * total;
    for (const { q, w } of adjusted) {
        roll -= w;
        if (roll <= 0) return q;
    }
    return 'info';
};

// 装备评分(权重来自 XiuXianGame calculateEquipmentScore)
export const equipScore = stats => Math.floor(
    (stats.attack || 0) * 1.5 +
    ((stats.health || 0) / 100) * 1.0 +
    (stats.defense || 0) * 1.2 +
    (stats.critRate || 0) * 180 +
    (stats.dodgeRate || 0) * 160 +
    (stats.speed || 0) * 1.0
);

// 生成装备
export const genEquipment = (level, opts = {}) => {
    const rolled = opts.quality || rollQuality(opts.luck || 1);
    const quality = QUALITY_ORDER[Math.min(QUALITY_ORDER.indexOf(rolled), equipmentQualityCeiling(level))];
    const qcfg = QUALITIES[quality];
    const slot = opts.slot || pick(Object.keys(SLOTS));
    const cf = combatFactor(level);
    const pool = STAT_POOLS[slot];
    // 按权重挑选属性
    const weighted = [];
    pool.forEach((p, i) => { for (let k = 0; k < p.weight; k++) weighted.push(i); });
    const stats = {};
    const chosen = new Set();
    for (let n = 0; n < qcfg.statCount && chosen.size < pool.length; n++) {
        let idx = pick(weighted);
        let guard = 0;
        while (chosen.has(idx) && guard++ < 20) idx = pick(weighted);
        chosen.add(idx);
        const p = pool[idx];
        const base = rfloat(p.min, p.max);
        if (isPercentStat(p.stat)) {
            stats[p.stat] = clampStat(p.stat, Math.round(base * qcfg.mult * 0.8 * 1000) / 1000);
        } else {
            // 数值属性随等级与境界倍率成长, 品质提供额外倍率
            const growth = (0.8 + getRealm(level).layer * 0.18) * cf * qcfg.mult * 0.35;
            stats[p.stat] = Math.max(1, Math.floor(base * growth));
        }
    }
    return {
        id: uid(),
        name: genName(slot, quality),
        slot,
        quality,
        level,
        stats,
        enhanceLevel: 0,
        locked: false,
        score: 0
    };
};

// ---------- 强化(idle-xiuxian enhanceConfig) ----------
export const ENHANCE_CFG = { maxLevel: 100, costPerLevel: 4, statIncrease: 0.08 };

export const enhanceCost = item => ENHANCE_CFG.costPerLevel * (Math.floor(item.enhanceLevel / 10) + 1) * (item.enhanceLevel % 10 + 1);

export const enhanceSuccess = item => Math.max(0.15, 1 - item.enhanceLevel * 0.012);

// 强化后属性
export const enhancedStats = item => {
    const mult = 1 + item.enhanceLevel * ENHANCE_CFG.statIncrease;
    const out = {};
    Object.entries(item.stats).forEach(([k, v]) => {
        out[k] = clampStat(k, isPercentStat(k) ? Math.round(v * mult * 1000) / 1000 : Math.floor(v * mult));
    });
    return out;
};

// ---------- 洗练(idle-xiuxian reforgeConfig) ----------
export const REFORGE_CFG = { costPerAttempt: 6, minVar: -0.3, maxVar: 0.3, newStatChance: 0.3 };

// 洗练: 属性在原值 ±30% 波动, 概率替换为新属性
export const reforge = item => {
    const pool = STAT_POOLS[item.slot];
    const stats = { ...item.stats };
    const keys = Object.keys(stats);
    const target = pick(keys);
    if (chance(REFORGE_CFG.newStatChance)) {
        // 替换为池内新属性
        const candidates = pool.filter(p => !keys.includes(p.stat));
        if (candidates.length) {
            const np = pick(candidates);
            delete stats[target];
            const qcfg = QUALITIES[item.quality];
            stats[np.stat] = isPercentStat(np.stat)
                ? clampStat(np.stat, Math.round(rfloat(np.min, np.max) * qcfg.mult * 0.8 * 1000) / 1000)
                : Math.max(1, Math.floor(rfloat(np.min, np.max) * (0.5 + item.level * 0.35) * combatFactor(item.level) * qcfg.mult * 0.35));
            return stats;
        }
    }
    const v = stats[target] * rfloat(REFORGE_CFG.minVar + 1, REFORGE_CFG.maxVar + 1);
    stats[target] = clampStat(target, isPercentStat(target) ? Math.round(v * 1000) / 1000 : Math.max(1, Math.floor(v)));
    return stats;
};

// 分解收益(XiuXianGame: 灵石 + 炼器石)
export const salvageGain = item => ({
    stones: Math.floor((6 + item.level * 1.5) * QUALITIES[item.quality].mult),
    refine: Math.max(1, Math.floor(QUALITIES[item.quality].mult / 2))
});
