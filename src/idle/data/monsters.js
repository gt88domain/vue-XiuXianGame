// ===== 怪物系统(数据与命名来自 vue-XiuXianGame monster.js) =====

import { rint, rfloat, pick } from '../utils';
import { combatFactor } from './realms';

const NAMES = {
    low: [
        '影魅狸奴', '幽谷灵蛇', '雾隐狐仙', '松间灵猴', '月影蝠妖',
        '山涧蛟童', '林涧鹿灵', '岩隙石精', '风鸣鹤怪', '翠竹蛙仙'
    ],
    mid: [
        '青龙啸天', '白虎破晓', '朱雀焚翼', '玄武镇海', '麒麟踏瑞',
        '凤凰涅槃', '毕方炽焰', '貔貅吞金', '白泽知世', '狻猊御火'
    ],
    high: [
        '伏羲天帝', '女娲圣母', '昊天玉皇', '太上老君', '东华帝君',
        '西王母后', '神农炎帝', '轩辕黄帝', '瑶姬仙子', '真武大帝'
    ],
    god: [
        '混沌始元尊', '乾坤造物主', '宇宙创生神', '万灵始祖皇', '鸿蒙创世者',
        '无极造化君', '太虚衍化神', '元始天尊祖', '虚空造物圣', '界域开辟者'
    ]
};

const namesFor = level => {
    if (level <= 45) return NAMES.low;
    if (level <= 90) return NAMES.mid;
    if (level <= 144) return NAMES.high;
    return NAMES.god;
};

// 生成怪物(类型: normal普通 / elite精英 / boss首领 / world世界BOSS)
export const genMonster = (level, type = 'normal') => {
    const cf = combatFactor(level);
    const base = {
        normal: { hp: 1, atk: 1, def: 1, reward: 1 },
        elite: { hp: 1.8, atk: 1.4, def: 1.3, reward: 2.2 },
        boss: { hp: 3.2, atk: 1.9, def: 1.6, reward: 4 },
        world: { hp: 4, atk: 2.2, def: 1.8, reward: 12 }
    }[type];
    const hpMod = type === 'world' ? 1 : rfloat(0.85, 1.2);
    return {
        name: type === 'world' ? pick(NAMES.god) : pick(namesFor(level)),
        type,
        level,
        stats: {
            health: Math.floor((70 + 55 * level) * cf * base.hp * hpMod),
            maxHealth: 0,
            attack: Math.floor((6 + 4.2 * level) * cf * base.atk * rfloat(0.85, 1.2)),
            defense: Math.floor((3 + 2.2 * level) * cf * base.def),
            speed: 8 + level * 0.4,
            critRate: Math.min(0.35, rfloat(0.03, 0.08) * (type === 'normal' ? 1 : 1.8)),
            critDamageBoost: 0.5,
            comboRate: rfloat(0, 0.06),
            counterRate: rfloat(0, 0.05),
            stunRate: type === 'normal' ? 0 : rfloat(0.02, 0.08),
            dodgeRate: rfloat(0.02, 0.06),
            vampireRate: 0,
            critResist: rfloat(0, 0.05),
            comboResist: rfloat(0, 0.05),
            counterResist: rfloat(0, 0.05),
            stunResist: rfloat(0, 0.08),
            dodgeResist: 0,
            vampireResist: 0,
            finalDamageBoost: 0,
            finalDamageReduce: type === 'normal' ? 0 : rfloat(0.02, 0.08),
            healBoost: 0,
            combatBoost: 0,
            resistanceBoost: 0
        },
        reward: {
            stones: Math.floor((3 + level * 1.6) * base.reward),
            cultivation: Math.floor(level * 4 * base.reward),
            captureChance: type === 'normal' ? 0.22 : type === 'elite' ? 0.12 : 0
        }
    };
};
