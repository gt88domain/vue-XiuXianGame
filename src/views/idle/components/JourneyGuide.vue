<template>
    <section class="journey ink-panel" aria-label="修行指引">
        <div class="journey-title"><span>修行指引</span><el-button text @click="toggle">{{ visible ? '收起指引' : '展开指引' }}</el-button></div>
        <template v-if="visible">
            <div class="journey-next"><div class="journey-seal">道</div><div><p class="journey-label">下一步</p><h2>{{ goal.title }}</h2><p>{{ goal.description }}</p></div><el-button type="primary" @click="$emit('navigate', goal.tab)">{{ goal.action }}</el-button></div>
            <details v-if="store.stageGoals.length" class="stage-road"><summary>通往{{ nextMajor }} · 当前{{ store.realm.layer }}/9重 · 历练 {{ store.stageGoals.filter(g=>g.done).length }}/{{ store.stageGoals.length }}</summary><div v-for="g in store.stageGoals" :key="g.label" :class="{done:g.done}">{{ g.done ? '✓' : '○' }} {{ g.label }}<el-button text size="small" @click="$emit('navigate',g.tab)">前往</el-button></div><p>跨入新大境界后，形象与山河变化，并逐步解锁装备品质与更高秘境。普通小境界只需修为。</p></details>
            <div class="journey-milestones"><span v-for="step in milestones" :key="step.label" :class="{done:step.done}">{{ step.done ? '✓' : '○' }} {{ step.label }}</span></div>
        </template>
    </section>
</template>
<script setup>
import { computed, ref } from 'vue';
import { useIdleStore } from '@/idle/store';
import { nextJourneyGoal } from '@/idle/journey';
import { STAGES } from '@/idle/data/realms';
const store = useIdleStore();
const nextMajor = computed(()=>STAGES[Math.min(STAGES.length-1,store.realm.stageIndex+1)]);
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
const goal = computed(() => nextJourneyGoal(store));
</script>
<style scoped>
.stage-road{font-size:12px;line-height:1.8;margin-top:12px;color:#b3afa5}.stage-road summary{cursor:pointer;color:#d9c28b;min-height:32px}.stage-road .done{color:#b8cc91}.stage-road>div{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffffff0a}.stage-road p{font-size:11px}
.journey{margin:12px 0;padding:12px 16px}.journey-title{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#d9c28b}.journey-next{display:flex;align-items:center;gap:16px}.journey-next>div:nth-child(2){flex:1;min-width:0}.journey-seal{border:1px solid #b29a61;border-radius:50%;width:54px;height:54px;display:grid;place-items:center;flex-shrink:0;color:#e9d69e;font:28px serif;background:radial-gradient(circle,#b5964324,transparent)}.journey-label{font-size:11px;letter-spacing:3px;color:#a69e8b}.journey h2{font-size:18px;font-weight:500;color:#eddcb1;margin:5px 0}.journey p{margin:4px 0;font-size:12px;line-height:1.7;color:#b3afa5}.journey-milestones{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #cbb77b22;font-size:12px;color:#7e817c}.journey-milestones .done{color:#bccb92}@media(max-width:600px){.journey-next{flex-wrap:wrap;gap:10px}.journey-next>div:nth-child(2){flex:1 1 calc(100% - 54px)}.journey-next>.el-button{flex:0 0 calc(100% - 54px);margin-left:54px;min-height:44px}.journey-seal{width:44px;height:44px}.journey h2{font-size:16px}}
</style>
