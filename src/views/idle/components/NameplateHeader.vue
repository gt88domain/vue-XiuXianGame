<template>
    <header class="plate ink-panel">
        <div class="plate-top">
            <!-- 境界印玺 -->
            <div class="plate-seal">{{ sealChar }}</div>

            <!-- 名号 -->
            <div class="plate-who">
                <div class="plate-name" role="button" tabindex="0" @keydown.enter="$emit('rename')" @keydown.space.prevent="$emit('rename')" @click="$emit('rename')">
                    {{ store.player.name }}
                    <span v-if="store.player.title" class="plate-title">〔{{ store.player.title }}〕</span>
                    <el-icon style="font-size:13px; opacity:.7"><EditPen /></el-icon>
                </div>
                <div class="plate-realm-line">
                    <b>{{ store.realm.name }}</b> · 第{{ store.player.level }}重 / 189重
                    <template v-if="store.player.points > 0"> ·
                        <span class="pts-hot">境界点 {{ store.player.points }}</span>
                    </template>
                </div>
            </div>

            <!-- 资源 -->
            <div class="plate-chips">
                <span class="pchip">战力 <b>{{ fmt(store.power) }}</b></span>
                <span class="pchip">◈ 灵石 <b>{{ fmt(store.player.spiritStones) }}</b></span>
                <span class="pchip">炼器石 <b>{{ fmt(store.player.reinforceStones) }}</b></span>
                <span class="pchip" v-if="store.player.petEssence > 0">精华 <b>{{ fmt(store.player.petEssence) }}</b></span>
                <span class="pchip hot" role="button" tabindex="0" @keydown.enter="$emit('breakthrough')" @keydown.space.prevent="$emit('breakthrough')" v-if="store.canBreakthrough" @click="$emit('breakthrough')">● 可突破</span>
            </div>
        </div>

        <!-- 修为条 -->
        <div class="xiu-row">
            <span class="xiu-label">修为·{{ store.realm.name }}</span>
            <div class="xiu-bar">
                <div class="xiu-fill" :class="{ full: cultPct >= 100 }" :style="{ width: cultPct + '%' }" />
            </div>
            <span class="xiu-num">{{ fmt(store.player.cultivation) }} / {{ fmt(store.realm.maxCultivation) }}</span>
        </div>

        <!-- 灵力条 -->
        <div class="spirit-row">
            <span class="sp-label">灵力</span>
            <div class="sp-bar">
                <div class="sp-fill" :style="{ width: spiritPct + '%' }" />
            </div>
            <span class="sp-num">{{ fmt(store.player.spirit) }} / {{ fmt(store.spiritCap) }} (+{{ fmt(store.spiritRegen) }}/秒)</span>
        </div>

        <!-- 丹药buff -->
        <div class="buff-row" v-if="store.player.activeEffects.length">
            <span class="buff-chip" v-for="e in store.player.activeEffects" :key="e.id">
                {{ e.name }} {{ e.type === 'autoHeal' ? '' : '+' + (e.value * 100).toFixed(0) + '%' }} ({{ fmtTime(e.remain) }})
            </span>
        </div>
    </header>
</template>

<script setup>
    import { computed } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, fmtTime } from '@/idle/utils';

    defineEmits(['rename', 'breakthrough']);

    const store = useIdleStore();

    const sealChar = computed(() => store.realm.stage.slice(-1));
    const cultPct = computed(() => Math.min(100, (store.player.cultivation / store.realm.maxCultivation) * 100));
    const spiritPct = computed(() => Math.min(100, (store.player.spirit / store.spiritCap) * 100));
</script>

<style scoped>
    .pts-hot {
        color: #ff9a8a;
        text-shadow: 0 0 8px rgba(255, 106, 90, 0.45);
    }

    .pchip.hot { cursor: pointer; }
</style>
