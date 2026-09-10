// ===== 世界BOSS(语录与命名来自 vue-XiuXianGame boss.js) =====

import { pick } from '../utils';

export const BOSS_TEXTS = [
    '本座镇守此界百万年，尔等蝼蚁也敢放肆？',
    '就凭你？也配问鼎仙路？',
    '天威难犯，速速退去，可免一死！',
    '你的气运不错，可惜遇到了本座。',
    '这方天地的灵气，都将为本座所用！',
    '古往今来，敢与本座为敌者，皆已成尘。',
    '你的道，今日到此为止了。'
];

export const BOSS_NAMES = [
    { name: '赤炎魔尊', description: '据传是上古魔道巨擘，一身魔功出神入化' },
    { name: '九幽冥帝', description: '九幽炼狱之主，掌天下生死轮回' },
    { name: '噬天老祖', description: '传说中吞噬了半壁天穹的绝世凶人' },
    { name: '万古至尊', description: '一个纪元唯一证道之人' },
    { name: '天外邪神', description: '来自域外天魔界的邪神，觊觎此界灵气' },
    { name: '血海老魔', description: '血海凝聚而成的魔头，杀气滔天' },
    { name: '太古凶灵', description: '太古大战中陨落大能的怨念所化' },
    { name: '六道魔君', description: '掌六道轮回之力的神秘魔君' }
];

// 生成世界BOSS (等级随玩家)
export const genWorldBoss = playerLevel => {
    const info = pick(BOSS_NAMES);
    return {
        name: info.name,
        desc: info.description,
        text: pick(BOSS_TEXTS),
        respawnAt: 0
    };
};
