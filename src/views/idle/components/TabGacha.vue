<template>
    <div class="gacha-tab">
        <div class="pool-card">
            <div class="pool-title">⚔️ 装备祈愿</div>
            <div class="pool-desc">消耗灵石抽取装备，品质概率与探索掉落一致，幸运值可提升高阶概率。</div>
            <div class="prob-grid">
                <div v-for="q in qualityOrder" :key="q" class="prob-item">
                    <span :class="'q-' + q">{{ QUALITIES[q].name }}</span>
                    <span>{{ qualityProb(q) }}%</span>
                </div>
            </div>
            <div class="pool-btns">
                <el-button type="primary" :disabled="store.player.spiritStones < store.gachaCost('equipment', 1)"
                    @click="store.gacha('equipment', 1)">抽一次 ({{ fmt(store.gachaCost('equipment', 1)) }}灵石)</el-button>
                <el-button type="danger" :disabled="store.player.spiritStones < store.gachaCost('equipment', 10)"
                    @click="store.gacha('equipment', 10)">十连 ({{ fmt(store.gachaCost('equipment', 10)) }}灵石)</el-button>
            </div>
        </div>

        <div class="pool-card">
            <div class="pool-title">🐾 灵宠祈愿</div>
            <div class="pool-desc">消耗灵石抽取灵宠，概率: 凡品50% / 灵品25% / 玄品15% / 仙品8% / 神品2%</div>
            <div class="pool-btns">
                <el-button type="primary" :disabled="store.player.spiritStones < store.gachaCost('pet', 1)"
                    @click="store.gacha('pet', 1)">抽一次 ({{ fmt(store.gachaCost('pet', 1)) }}灵石)</el-button>
                <el-button type="danger" :disabled="store.player.spiritStones < store.gachaCost('pet', 10)"
                    @click="store.gacha('pet', 10)">十连 ({{ fmt(store.gachaCost('pet', 10)) }}灵石)</el-button>
            </div>
        </div>

        <!-- 结果 -->
        <div class="results" v-if="store.gachaResults">
            <div class="res-title">本次抽取结果:</div>
            <div class="res-grid">
                <div v-for="(r, i) in store.gachaResults.results" :key="i" class="res-item">
                    <template v-if="r.kind === 'equip'">
                        <span :class="'q-' + r.item.quality">[{{ QUALITIES[r.item.quality].name }}] {{ r.item.name }}</span>
                    </template>
                    <template v-else>
                        <b :style="{ color: RARITIES[r.item.rarity].color }">【{{ r.item.name }}】</b>
                        <span class="res-rarity">{{ RARITIES[r.item.rarity].name }}</span>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useIdleStore } from '@/idle/store';
    import { fmt } from '@/idle/utils';
    import { QUALITIES, QUALITY_ORDER } from '@/idle/data/equipment';
    import { RARITIES } from '@/idle/data/pets';

    const store = useIdleStore();
    const qualityOrder = QUALITY_ORDER;

    const qualityProb = q => {
        const weights = QUALITY_ORDER.map(k => (k === 'info' ? QUALITIES[k].weight / Math.max(store.luck, 0.5) : QUALITIES[k].weight * store.luck));
        const total = weights.reduce((a, b) => a + b, 0);
        return ((weights[QUALITY_ORDER.indexOf(q)] / total) * 100).toFixed(1);
    };
</script>

<style scoped>
    .pool-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
    }

    .pool-title { font-size: 16px; font-weight: bold; margin-bottom: 6px; }

    .pool-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; }

    .prob-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }

    .prob-item { font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 2px; }

    .pool-btns { display: flex; gap: 8px; }

    .results { border: 1px dashed var(--el-border-color); border-radius: 8px; padding: 12px; }

    .res-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; }

    .res-grid { display: flex; flex-wrap: wrap; gap: 6px; }

    .res-item { font-size: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 4px; padding: 3px 8px; }

    .res-rarity { color: var(--el-text-color-secondary); margin-left: 2px; }
</style>
