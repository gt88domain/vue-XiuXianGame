// ===== 境界表(融合版) =====
// 融合两作境界体系:
//   vue-XiuXianGame(我的文字修仙全靠刷): 筑基/开光/胎息/辟谷/金丹/元婴/出窍/分神/合体/大乘/渡劫/地仙/天仙/金仙/大罗金仙/九天玄仙
//   vue-idle-xiuxian(我的放置仙途):     练气/筑基/金丹/元婴/化神/返虚/合体/大乘/渡劫/仙人/真仙/金仙/太乙...
// 合并为 21 个大境界 × 每境 9 重 = 189 级

export const STAGES = [
    '练气', '筑基', '开光', '胎息', '辟谷', '金丹', '元婴', '出窍', '分神',
    '化神', '返虚', '合体', '大乘', '渡劫', '地仙', '天仙', '真仙', '金仙',
    '太乙', '大罗金仙', '九天玄仙'
];

const CN_NUM = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };

const LAYER_GROWTH = 1.15;   // 境内每重修为倍率
const STAGE_GROWTH = 2.4;    // 跨大境界战斗数值倍率
const ECONOMY_GROWTH = 7.37; // 跨大境界经济数值倍率(与 LAYER_GROWTH^8 * STAGE_GROWTH 匹配)

export const MAX_LEVEL = STAGES.length * 9; // 189

// 生成境界表
const buildRealms = () => {
    const list = [];
    let stageBase = 100;
    for (let s = 0; s < STAGES.length; s++) {
        for (let l = 0; l < 9; l++) {
            const maxCultivation = Math.floor(stageBase * Math.pow(LAYER_GROWTH, l));
            list.push({
                level: s * 9 + l + 1,
                name: `${STAGES[s]}${CN_NUM[l + 1]}重`,
                stage: STAGES[s],
                stageIndex: s,
                layer: l + 1,
                maxCultivation
            });
        }
        // 下一大境基础修为(与经济倍率一致, 保证修炼节奏恒定)
        stageBase = stageBase * ECONOMY_GROWTH;
    }
    return list;
};

export const realms = buildRealms();

export const getRealm = level => realms[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];

export const realmName = level => (level >= MAX_LEVEL ? '九天玄仙九重(圆满)' : getRealm(level).name);

// 战斗数值倍率(随大境界指数增长)
export const combatFactor = level => Math.pow(STAGE_GROWTH, getRealm(level).stageIndex);

// 经济数值倍率
export const economyFactor = level => Math.pow(ECONOMY_GROWTH, getRealm(level).stageIndex);

// 下一境界所需修为
export const maxCultivationOf = level => getRealm(level).maxCultivation;
