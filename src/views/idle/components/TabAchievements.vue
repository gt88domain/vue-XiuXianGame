<template>
    <div class="ach-tab">
        <div class="progress-line">
            成就进度: {{ store.player.achievements.length }} / {{ achievements.length }}
            <el-progress :percentage="Math.floor((store.player.achievements.length / achievements.length) * 100)" :stroke-width="10" />
        </div>

        <el-collapse v-model="openCats" class="cat-collapse">
            <el-collapse-item v-for="cat in ACH_CATS" :key="cat" :name="cat">
                <template #title>{{ cat }} ({{ doneOf(cat) }}/{{ countOf(cat) }})</template>
                <div class="ach-list">
                    <div v-for="ach in ofCat(cat)" :key="ach.id" class="ach-item"
                        :class="{ done: store.player.achievements.includes(ach.id) }">
                        <div class="ach-main">
                            <b>{{ ach.name }}</b>
                            <el-tag v-if="ach.title" size="small" type="danger">称号</el-tag>
                        </div>
                        <div class="ach-desc">{{ ach.desc }}</div>
                        <div class="ach-reward">
                            奖励: {{ fmt(ach.reward) }}灵石
                            <template v-if="ach.titleBonus">
                                · 称号加成: {{ bonusText(ach.titleBonus) }}
                            </template>
                        </div>
                        <div class="ach-state">
                            {{ store.player.achievements.includes(ach.id) ? '✓ 已达成' : '未达成' }}
                        </div>
                    </div>
                </div>
            </el-collapse-item>
        </el-collapse>

        <!-- 称号佩戴 -->
        <div class="title-box">
            <div class="sec-title">🎖️ 称号佩戴 (佩戴后获得永久属性加成)</div>
            <div class="title-list">
                <div class="title-item" :class="{ picked: !store.player.title }" @click="store.equipTitle(null)">
                    无称号
                </div>
                <div v-for="t in store.player.unlockedTitles" :key="t" class="title-item"
                    :class="{ picked: store.player.title === t }" @click="store.equipTitle(t)">
                    {{ t }}
                    <span class="title-bonus" v-if="bonusText(titleBonusOf(t))">{{ bonusText(titleBonusOf(t)) }}</span>
                </div>
                <el-empty v-if="!store.player.unlockedTitles.length" description="达成成就解锁称号" :image-size="40" />
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, pct } from '@/idle/utils';
    import { achievements, ACH_CATS } from '@/idle/data/achievements';
    import { STAT_NAMES } from '@/idle/data/equipment';

    const store = useIdleStore();
    const openCats = ref(ACH_CATS);

    const ofCat = cat => achievements.filter(a => a.cat === cat);
    const doneOf = cat => ofCat(cat).filter(a => store.player.achievements.includes(a.id)).length;
    const countOf = cat => ofCat(cat).length;

    const bonusText = bonus => Object.entries(bonus)
        .map(([k, v]) => `${STAT_NAMES[k] || k}${v < 1 ? '+' + pct(v, 0) : '+' + fmt(v)}`)
        .join(' ');

    const titleBonusOf = title => achievements.find(a => a.title === title)?.titleBonus || {};
</script>

<style scoped>
    .progress-line { font-size: 13px; margin-bottom: 10px; }

    .ach-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }

    .ach-item {
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 12px;
        position: relative;
    }

    .ach-item.done { border-color: var(--el-color-success); background: var(--el-color-success-light-9); }

    .ach-main { display: flex; align-items: center; gap: 6px; }

    .ach-desc { color: var(--el-text-color-secondary); margin: 3px 0; }

    .ach-reward { color: var(--el-color-warning); }

    .ach-state { position: absolute; right: 8px; top: 8px; font-size: 11px; color: var(--el-text-color-placeholder); }

    .ach-item.done .ach-state { color: var(--el-color-success); }

    .title-box { margin-top: 14px; }

    .sec-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; }

    .title-list { display: flex; flex-wrap: wrap; gap: 8px; }

    .title-item {
        border: 1px solid var(--el-color-danger-light-5);
        color: var(--el-color-danger);
        border-radius: 14px;
        padding: 4px 14px;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .title-item.picked { background: var(--el-color-danger); color: #fff; }

    .title-bonus { font-size: 11px; opacity: 0.8; }
</style>
