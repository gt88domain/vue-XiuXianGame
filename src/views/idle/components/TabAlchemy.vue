<template>
    <div class="alchemy">
        <!-- 灵草背包 -->
        <div class="section">
            <div class="sec-title">
                🌿 灵草 ({{ totalHerbs }}株)
                <el-button size="small" type="warning" :disabled="!store.player.herbs.length" @click="store.sellAllHerbs()">全部卖出</el-button>
            </div>
            <div class="herb-grid" v-if="store.player.herbs.length">
                <div v-for="h in store.player.herbs" :key="h.id + h.quality" class="herb-item">
                    <el-tag :color="qualityColor(h.quality)" style="border:none" effect="dark" size="small">{{ qualityName(h.quality) }}</el-tag>
                    <span class="herb-name">{{ h.name }}</span>
                    <span class="herb-count">×{{ h.count }}</span>
                    <span class="herb-value">{{ fmt(h.value * h.count) }}灵石</span>
                </div>
            </div>
            <el-empty v-else description="探索可获得灵草" :image-size="50" />
        </div>

        <!-- 丹方列表 -->
        <div class="section">
            <div class="sec-title">⚗️ 丹方 (已参悟 {{ store.player.pillRecipes.length }} / {{ pillRecipes.length }})</div>
            <div class="pill-list">
                <div v-for="r in pillRecipes" :key="r.id" class="pill-card" :class="{ locked: !store.player.pillRecipes.includes(r.id) }">
                    <div class="pill-head">
                        <b>{{ r.name }}</b>
                        <el-tag size="small" :type="gradeType(r.grade)">{{ gradeName(r.grade) }}</el-tag>
                        <el-tag size="small" type="info">{{ typeName(r.type) }}</el-tag>
                        <el-tag v-if="pillCount(r.id)" size="small" type="danger">持有×{{ pillCount(r.id) }}</el-tag>
                    </div>
                    <div class="pill-desc">{{ r.description }}</div>
                    <div class="pill-mat">
                        <span v-for="m in r.materials" :key="m.herb" class="mat" :class="{ lack: herbCount(m.herb) < m.count }">
                            {{ herbName(m.herb) }}×{{ m.count }}(有{{ herbCount(m.herb) }})
                        </span>
                    </div>
                    <div class="pill-frag" v-if="!store.player.pillRecipes.includes(r.id)">
                        残页: {{ store.player.pillFragments[r.id] || 0 }} / {{ r.fragmentsNeeded }}
                    </div>
                    <div class="pill-effect">
                        效果: {{ effectText(r) }} · 成功率 {{ (gradeRate(r.grade) * store.player.alchemyRate * store.luck * 100).toFixed(0) }}%
                    </div>
                    <div class="pill-btns">
                        <el-button size="small" type="primary" @click="store.craftPill(r.id)">
                            {{ store.player.pillRecipes.includes(r.id) ? '炼制' : '参悟(消耗残页+药材)' }}
                        </el-button>
                        <el-button size="small" type="success" :disabled="!pillCount(r.id)" @click="store.usePill(r.id)">服用</el-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, pct } from '@/idle/utils';
    import { pillRecipes, pillGrades, pillTypes, EFFECT_NAMES, calculatePillEffect } from '@/idle/data/pills';
    import { herbQualities, herbById } from '@/idle/data/herbs';

    const store = useIdleStore();

    const totalHerbs = computed(() => store.player.herbs.reduce((a, h) => a + h.count, 0));
    const pillCount = id => store.player.pills.find(p => p.recipeId === id)?.count || 0;
    const herbCount = id => store.player.herbs.find(h => h.id === id)?.count || 0;
    const herbName = id => herbById(id)?.name || id;
    const qualityName = q => herbQualities[q].name;
    const qualityColor = q => herbQualities[q].color;
    const gradeName = g => pillGrades[g].name;
    const gradeRate = g => pillGrades[g].successRate;
    const typeName = t => pillTypes[t].name;
    const gradeType = g => {
        const n = parseInt(g.replace('grade', ''));
        return n <= 2 ? 'success' : n <= 4 ? 'primary' : n <= 6 ? 'warning' : 'danger';
    };
    const effectText = r => {
        const e = calculatePillEffect(r, store.player.level);
        return `${EFFECT_NAMES[e.type] || e.type} +${pct(e.value)} / ${Math.floor(e.duration / 60)}分钟`;
    };
</script>

<style scoped>
    .section { margin-bottom: 16px; }

    .sec-title {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .herb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }

    .herb-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
        padding: 4px 8px;
    }

    .herb-count { color: var(--el-color-primary); }

    .herb-value { margin-left: auto; color: var(--el-color-warning); }

    .pill-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }

    .pill-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        padding: 10px;
    }

    .pill-card.locked { opacity: 0.75; border-style: dashed; }

    .pill-head { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .pill-desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }

    .pill-mat { font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px; }

    .mat { border: 1px solid var(--el-border-color-lighter); border-radius: 3px; padding: 1px 5px; }

    .mat.lack { color: var(--el-color-danger); border-color: var(--el-color-danger-light-5); }

    .pill-frag { font-size: 12px; color: var(--el-color-warning); margin-top: 4px; }

    .pill-effect { font-size: 12px; color: var(--el-color-success); margin: 4px 0; }

    .pill-btns { display: flex; gap: 6px; }
</style>
