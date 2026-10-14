// ===== 战斗引擎(移植自 vue-idle-xiuxian combat.js 的 CombatStats 数值体系) =====
// 支持: 暴击/连击/反击/眩晕/闪避/吸血 六大战斗属性 + 对应六抗性
//       + 特殊属性: 强化爆伤/爆伤减免/最终增伤/最终减伤/战斗提升/抗性提升/自动疗伤
// 双方统一的数据结构: { name, stats: {...}, health, maxHealth }

import { rint } from './utils';

export const BASE_STATS = {
    health: 100, attack: 10, defense: 5, speed: 10,
    critRate: 0.05, comboRate: 0, counterRate: 0, stunRate: 0, dodgeRate: 0.03, vampireRate: 0,
    critResist: 0, comboResist: 0, counterResist: 0, stunResist: 0, dodgeResist: 0, vampireResist: 0,
    healBoost: 0, critDamageBoost: 0.5, critDamageReduce: 0,
    finalDamageBoost: 0, finalDamageReduce: 0, combatBoost: 0, resistanceBoost: 0
};

// 一次攻击的伤害结算
const attackDamage = (attacker, target) => {
    const a = attacker.stats;
    const d = target.stats;
    const log = [];
    // 闪避判定(受击方闪避率 - 被抗性抵消部分)
    if ((d.dodgeRate || 0) > 0 && Math.random() < Math.max(0, d.dodgeRate - d.dodgeResist)) {
        return { dodged: true, logs: [{ text: `${target.name} 闪避了 ${attacker.name} 的攻击!`, type: 'dodge' }] };
    }

    let damage = Math.abs(a.attack * (1 + (a.combatBoost || 0)));
    let isCrit = false, isCombo = false, isVampire = false, isStun = false;

    // 暴击(考虑目标抗暴)
    const critRate = Math.max(0, (a.critRate || 0) * (1 + (a.combatBoost || 0)) - (d.critResist || 0) * (1 + (d.resistanceBoost || 0)));
    if (Math.random() < critRate) {
        damage *= 1.5 + (a.critDamageBoost || 0);
        isCrit = true;
    }
    // 连击(考虑目标抗连击)
    const comboRate = Math.max(0, (a.comboRate || 0) * (1 + (a.combatBoost || 0)) - (d.comboResist || 0));
    if (Math.random() < comboRate) {
        damage *= 1.3;
        isCombo = true;
    }
    // 吸血判定
    const vampireRate = Math.max(0, (a.vampireRate || 0) * (1 + (a.combatBoost || 0)) - (d.vampireResist || 0));
    if (Math.random() < vampireRate) isVampire = true;
    // 眩晕判定
    const stunRate = Math.max(0, (a.stunRate || 0) * (1 + (a.combatBoost || 0)) - (d.stunResist || 0) * (1 + (d.resistanceBoost || 0)));
    if (Math.random() < stunRate) isStun = true;

    // 最终增伤
    damage *= 1 + (a.finalDamageBoost || 0);

    // 防御减伤: 比例公式 attack/(attack+def), 保证跨境界数值尺度不变
    const effDef = d.defense * (1 + (d.combatBoost || 0));
    const atkBase = Math.abs(a.attack) || 1;
    damage *= atkBase / (atkBase + effDef);
    // 暴伤减免
    if (isCrit) damage *= 1 - (d.critDamageReduce || 0);
    // 最终减伤
    damage *= 1 - (d.finalDamageReduce || 0);

    damage = Math.max(1, Math.floor(damage));

    // 吸血回复
    if (isVampire) {
        const heal = Math.floor(damage * (a.vampireRate || 0) * (1 + (a.healBoost || 0)));
        attacker.health = Math.min(attacker.maxHealth, attacker.health + heal);
        log.push({ text: `${attacker.name} 吸取 ${heal} 点气血`, type: 'vampire' });
    }

    const tags = [isCrit && '暴击', isCombo && '连击'].filter(Boolean).join('·');
    return {
        dodged: false,
        damage,
        isStun,
        logs: [
            ...(tags ? [{ text: `${attacker.name} 触发 [${tags}]`, type: 'buff' }] : []),
            { text: `${attacker.name} 对 ${target.name} 造成 ${damage} 点伤害`, type: 'damage' }
        ]
    };
};

// 完整战斗: player = {name, stats, health, maxHealth, autoHeal}
// 返回 { win, rounds, logs, playerHealth }
export const runBattle = (player, monster, opts = {}) => {
    const p = { name: player.name, stats: player.stats, health: player.health, maxHealth: player.maxHealth, stunned: 0 };
    const m = { name: monster.name, stats: monster.stats, health: monster.stats.health, maxHealth: monster.stats.health, stunned: 0 };
    const logs = [];
    const frames = [{ actor:null, playerHealth:p.health, monsterHealth:m.health, damage:0, round:0 }];
    const maxRounds = opts.maxRounds || 30;
    let round = 0;

    logs.push({ text: `【${m.name}】(等级${monster.level}) 出现了!`, type: 'info' });

    while (round < maxRounds && p.health > 0 && m.health > 0) {
        round++;
        logs.push({ text: `—— 第 ${round} 回合 ——`, type: 'round' });
        // 自动疗伤(丹药效果)
        if (p.autoHeal > 0 && p.health < p.maxHealth) {
            const heal = Math.floor(p.maxHealth * p.autoHeal);
            p.health = Math.min(p.maxHealth, p.health + heal);
            logs.push({ text: `${p.name} 丹药生效，回复 ${heal} 点气血`, type: 'heal' });
        }
        // 先手按速度
        const pFirst = p.stats.speed >= m.stats.speed;
        const order = pFirst ? [p, m] : [m, p];
        for (const actor of order) {
            const target = actor === p ? m : p;
            if (actor.health <= 0 || target.health <= 0) continue;
            if (actor.stunned > 0) {
                actor.stunned--;
                logs.push({ text: `${actor.name} 被眩晕，无法行动!`, type: 'stun' });
                continue;
            }
            const res = attackDamage(actor, target);
            logs.push(...res.logs);
            if (res.dodged) { frames.push({actor:actor === p ? 'player' : 'monster',playerHealth:Math.max(0,p.health),monsterHealth:Math.max(0,m.health),damage:0,dodged:true,round}); continue; }
            target.health -= res.damage;
            if (res.isStun && target.health > 0) {
                target.stunned = 1;
                logs.push({ text: `${target.name} 被眩晕了!`, type: 'stun' });
            }
            // 反击判定
            if (target.health > 0 && Math.random() < Math.max(0, (target.stats.counterRate || 0) - (actor.stats.counterResist || 0))) {
                const counter = attackDamage(target, actor);
                logs.push({ text: `${target.name} 触发 [反击]!`, type: 'buff' }, ...counter.logs);
                if (!counter.dodged) actor.health -= counter.damage;
            }
            frames.push({actor:actor === p ? 'player' : 'monster',playerHealth:Math.max(0,p.health),monsterHealth:Math.max(0,m.health),damage:res.damage,round});
            if (actor.health <= 0 || target.health <= 0) break;
        }
    }

    const win = m.health <= 0 && p.health > 0;
    if (round >= maxRounds && p.health > 0 && m.health > 0) {
        logs.push({ text: '回合数耗尽，双方罢手言和。', type: 'info' });
    }
    logs.push({ text: win ? `击败了【${m.name}】!` : (p.health <= 0 ? `不敌【${m.name}】，落败而逃...` : '战成平手'), type: win ? 'victory' : 'defeat' });
    return { win, rounds: round, logs, frames, playerHealth: Math.max(0, p.health), monsterHealth:Math.max(0,m.health) };
};
