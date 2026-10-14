<template>
    <section class="journey ink-panel" aria-label="修行指引">
        <div class="journey-title"><span>修行指引</span><el-button text @click="toggle">{{ visible ? '收起指引' : '展开指引' }}</el-button></div>
        <template v-if="visible">
            <div class="journey-next"><div class="journey-seal">道</div><div><p class="journey-label">下一步</p><h2>{{ goal.title }}</h2><p>{{ goal.description }}</p></div><el-button type="primary" @click="$emit('navigate', goal.tab)">{{ goal.action }}</el-button></div>
            <div class="journey-milestones"><span v-for="step in milestones" :key="step.label" :class="{done:step.done}">{{ step.done ? '✓' : '○' }} {{ step.label }}</span></div>
        </template>
    </section>
</template>
<script setup>
import { computed, ref } from 'vue';
import { useIdleStore } from '@/idle/store';
import { fmt } from '@/idle/utils';
const store = useIdleStore();
defineEmits(['navigate']);
const visible = ref(true);
try { visible.value = localStorage.getItem('xiuxian-guide-hidden') !== 'yes'; } catch { /* optional preference */ }
function toggle() {
    visible.value = !visible.value;
    try { localStorage.setItem('xiuxian-guide-hidden', visible.value ? 'no' : 'yes'); } catch { /* optional preference */ }
}
const milestones = computed(() => [
    { label:'首次突破', done:store.player.counters.breakthroughCount > 0 },
    { label:'首次探索', done:store.player.counters.explorationCount > 0 },
    { label:'穿戴装备', done:Object.values(store.player.equipment).some(Boolean) },
    { label:'首次炼丹', done:store.player.counters.pillsCrafted > 0 }
]);
const goal = computed(() => {
    if (store.player.inventory.length >= 160) return {title:'整理行囊，再出发',description:'背包即将装满。锁定珍贵装备，再分解不需要的品质。',tab:'equipment',action:'整理装备'};
    if (store.canBreakthrough && !store.isMaxLevel) return {title:'修为已满，可以突破',description:'突破后获得3点境界点；记得分配属性。',tab:'cultivate',action:'前往突破'};
    if (store.player.points > 0) return {title:`分配 ${store.player.points} 点境界点`,description:'按原规则强化攻击、生命、防御或速度，为下一次探索做准备。',tab:'cultivate',action:'分配属性'};
    if (!store.player.counters.breakthroughCount) return {title:'完成第一次境界突破',description:`还需 ${fmt(Math.max(0, store.realm.maxCultivation - store.player.cultivation))} 修为。可开启自动修炼，灵力会随时间恢复。`,tab:'cultivate',action:'开始修炼'};
    if (!store.player.counters.explorationCount) return {title:'踏出第一次探索',description:'先从新手村出发，收集装备、灵草与丹方残页。',tab:'explore',action:'前往探索'};
    if (!Object.values(store.player.equipment).some(Boolean)) return {title:store.player.inventory.length ? '穿上第一件装备' : '寻找第一件装备',description:store.player.inventory.length ? '查看装备属性，再选择穿戴。评分只是参考，具体属性同样重要。' : '继续探索，遇敌和掉落沿用原来的概率。',tab:store.player.inventory.length ? 'equipment' : 'explore',action:store.player.inventory.length ? '查看装备' : '继续探索'};
    if (!store.player.counters.pillsCrafted) return {title:'准备第一次炼丹',description:'查看丹方需要的灵草与残页；材料不足时可以继续探索。',tab:'alchemy',action:'查看丹方'};
    return {title:'选择自己的修行方向',description:'继续突破提升境界，或探索装备、培养灵宠、挑战秘境。',tab:'explore',action:'继续探索'};
});
</script>
<style scoped>
.journey{margin:12px 0;padding:12px 16px}.journey-title{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#d9c28b}.journey-next{display:flex;align-items:center;gap:16px}.journey-next>div:nth-child(2){flex:1;min-width:0}.journey-seal{border:1px solid #b29a61;border-radius:50%;width:54px;height:54px;display:grid;place-items:center;flex-shrink:0;color:#e9d69e;font:28px serif;background:radial-gradient(circle,#b5964324,transparent)}.journey-label{font-size:11px;letter-spacing:3px;color:#a69e8b}.journey h2{font-size:18px;font-weight:500;color:#eddcb1;margin:5px 0}.journey p{margin:4px 0;font-size:12px;line-height:1.7;color:#b3afa5}.journey-milestones{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #cbb77b22;font-size:12px;color:#7e817c}.journey-milestones .done{color:#bccb92}@media(max-width:600px){.journey-next{flex-wrap:wrap;gap:10px}.journey-next>div:nth-child(2){flex:1 1 calc(100% - 54px)}.journey-next>.el-button{flex:0 0 calc(100% - 54px);margin-left:54px;min-height:44px}.journey-seal{width:44px;height:44px}.journey h2{font-size:16px}}
</style>
