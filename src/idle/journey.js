import { fmt } from './utils';

// Shared by the live guide and offline return panel.
export function nextJourneyGoal(store) {
    if (store.player.inventory.length >= 160) return {title:'整理行囊，再出发',description:'背包即将装满。锁定珍贵装备，再分解不需要的品质。',tab:'equipment',action:'整理装备'};
    if (store.majorGoals.length && store.breakthroughBlockers.length) { const next=store.breakthroughBlockers[0]; return {title:'为下一大境界准备历练',description:next.label + '。修为可以继续积累到本重上限。',tab:next.tab,action:'完成历练'}; }
    if (store.canBreakthrough && !store.isMaxLevel) return {title:'修为已满，可以突破',description:'突破后获得3点境界点；记得分配属性。',tab:'cultivate',action:'前往突破'};
    if (store.player.points > 0) return {title:`分配 ${store.player.points} 点境界点`,description:'按原规则强化攻击、生命、防御或速度，为下一次探索做准备。',tab:'cultivate',action:'分配属性'};
    if (!store.player.counters.breakthroughCount) return {title:'完成第一次境界突破',description:`还需 ${fmt(Math.max(0, store.realm.maxCultivation - store.player.cultivation))} 修为。可开启自动修炼，灵力会随时间恢复。`,tab:'cultivate',action:'开始修炼'};
    if (!store.player.counters.explorationCount) return {title:'踏出第一次探索',description:'先从新手村出发，收集装备、灵草与丹方残页。',tab:'explore',action:'前往探索'};
    if (!Object.values(store.player.equipment).some(Boolean)) return {title:store.player.inventory.length ? '穿上第一件装备' : '寻找第一件装备',description:store.player.inventory.length ? '查看装备属性，再选择穿戴。评分只是参考，具体属性同样重要。' : '继续探索，遇敌和掉落沿用原来的概率。',tab:store.player.inventory.length ? 'equipment' : 'explore',action:store.player.inventory.length ? '查看装备' : '继续探索'};
    if (store.player.level >= 3 && !store.player.progression?.trials?.length) return {title:'挑战初试秘境',description:'准备足够灵力与装备，通过5层初试，为筑基积累历练。',tab:'dungeon',action:'前往秘境'};
    if (!store.player.counters.pillsCrafted) return {title:'准备第一次炼丹',description:'查看丹方需要的灵草与残页；材料不足时可以继续探索。',tab:'alchemy',action:'查看丹方'};
    return {title:'选择自己的修行方向',description:'继续突破提升境界，或探索装备、培养灵宠、挑战秘境。',tab:'explore',action:'继续探索'};
}
