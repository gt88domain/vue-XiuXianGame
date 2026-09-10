<template>
    <div class="explore">
        <!-- 战斗回放 -->
        <el-collapse v-model="openPanels" class="battle-collapse">
            <el-collapse-item name="battle">
                <template #title>⚔️ 战斗记录 {{ store.battle ? (store.battle.win ? '(胜利)' : '(战败)') : '' }}</template>
                <div class="battle-box" v-if="store.battle">
                    <div class="battle-vs">
                        <span>{{ store.player.name }}</span>
                        <span class="vs">VS</span>
                        <span>【{{ store.battle.monster.name }}】Lv.{{ store.battle.monster.level }}</span>
                    </div>
                    <div class="battle-logs">
                        <div v-for="(l, i) in store.battle.logs" :key="i" class="bl" :class="'bl-' + l.type">{{ l.text }}</div>
                    </div>
                </div>
                <el-empty v-else description="尚未战斗" :image-size="50" />
            </el-collapse-item>
        </el-collapse>

        <!-- 探索开关 -->
        <div class="explore-head">
            <el-button :type="store.player.settings.autoExplore ? 'warning' : 'info'" size="small"
                @click="store.player.settings.autoExplore = !store.player.settings.autoExplore">
                自动探索 {{ store.player.settings.autoExplore ? '开' : '关' }}
            </el-button>
            <span class="cd" v-if="store.exploreCd > 0">冷却 {{ store.exploreCd.toFixed(1) }}s</span>
            <span class="tip">探索消耗灵力，可获得灵石/灵草/残页/装备，还有奇遇与战斗</span>
        </div>

        <!-- 地点列表 -->
        <div class="loc-list">
            <div v-for="loc in locations" :key="loc.id" class="loc-card"
                :class="{ locked: store.player.level < loc.minLevel, active: store.player.settings.exploreLocation === loc.id }"
                @click="choose(loc)">
                <div class="loc-name">
                    {{ loc.name }}
                    <el-tag v-if="store.player.level < loc.minLevel" size="small" type="info">需 {{ realmName(loc.minLevel) }}</el-tag>
                    <el-tag v-else-if="store.player.settings.exploreLocation === loc.id" size="small" type="success">当前</el-tag>
                </div>
                <div class="loc-desc">{{ loc.description }}</div>
                <div class="loc-cost">灵力消耗: {{ fmt(loc.spiritCost) }}</div>
            </div>
        </div>

        <div class="explore-btn">
            <el-button type="primary" size="large" :disabled="store.exploreCd > 0" @click="store.explore(store.player.settings.exploreLocation)">
                探索 · {{ currentLocName }}
            </el-button>
        </div>

        <!-- 奇遇图鉴 -->
        <div class="event-intro">
            <div class="ei-title">奇遇事件表 (来自 idle-xiuxian 8种 + 全靠刷 4种)</div>
            <div class="ei-grid">
                <div v-for="e in events" :key="e.id" class="ei-item" :class="{ bad: !e.good }">
                    <b>{{ e.name }}</b>
                    <span>{{ e.description }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt } from '@/idle/utils';
    import { locations } from '@/idle/data/locations';
    import { events } from '@/idle/data/events';
    import { realmName } from '@/idle/data/realms';

    const store = useIdleStore();
    const openPanels = ref([]);

    const currentLocName = computed(() => locations.find(l => l.id === store.player.settings.exploreLocation)?.name || '');

    const choose = loc => {
        if (store.player.level < loc.minLevel) return;
        store.player.settings.exploreLocation = loc.id;
    };
</script>

<style scoped>
    .battle-collapse { margin-bottom: 10px; }

    .battle-box { max-height: 260px; }

    .battle-vs {
        text-align: center;
        font-weight: bold;
        margin-bottom: 6px;
    }

    .battle-vs .vs { color: var(--el-color-danger); margin: 0 10px; }

    .battle-logs {
        max-height: 200px;
        overflow: auto;
        font-size: 12px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 4px;
        padding: 6px 10px;
    }

    html.dark .battle-logs { background: rgba(255, 255, 255, 0.04); }

    .bl { margin-bottom: 2px; }
    .bl-damage { color: var(--el-text-color-primary); }
    .bl-victory { color: var(--el-color-success); font-weight: bold; }
    .bl-defeat { color: var(--el-color-danger); font-weight: bold; }
    .bl-round { color: var(--el-text-color-secondary); margin-top: 4px; }
    .bl-dodge { color: var(--el-color-primary); }
    .bl-buff { color: var(--el-color-warning); }
    .bl-stun { color: #9c27b0; }
    .bl-vampire, .bl-heal { color: var(--el-color-success); }
    .bl-info { color: var(--el-text-color-secondary); }

    .explore-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        flex-wrap: wrap;
    }

    .cd { color: var(--el-color-warning); font-size: 12px; }

    .tip { font-size: 12px; color: var(--el-text-color-secondary); }

    .loc-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
    }

    .loc-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .loc-card:hover { border-color: var(--el-color-primary); }

    .loc-card.active { border-color: var(--el-color-success); background: var(--el-color-success-light-9); }

    .loc-card.locked { opacity: 0.5; cursor: not-allowed; }

    .loc-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: flex; gap: 6px; align-items: center; }

    .loc-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; min-height: 32px; }

    .loc-cost { font-size: 12px; color: var(--el-color-primary); }

    .explore-btn { text-align: center; margin: 14px 0; }

    .event-intro { margin-top: 6px; }

    .ei-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }

    .ei-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 6px; }

    .ei-item {
        font-size: 12px;
        border: 1px solid var(--el-color-success-light-5);
        border-radius: 4px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
    }

    .ei-item.bad { border-color: var(--el-color-danger-light-5); }
</style>
