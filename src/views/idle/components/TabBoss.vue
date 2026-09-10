<template>
    <div class="boss-tab">
        <div class="boss-card">
            <div class="boss-title">👹 世界BOSS (来自「我的文字修仙全靠刷」)</div>
            <div class="boss-desc">
                每日刷新一只世界BOSS，实力远超同阶妖怪。击败可获得两件神阶/仙阶装备、海量灵石与悟性丹(永久提升幸运)。
            </div>
            <div class="boss-info" v-if="store.canFightBoss()">
                <el-alert type="warning" :closable="false" show-icon
                    :title="'一只世界BOSS正在此界肆虐，等待勇者讨伐!'">
                </el-alert>
            </div>
            <div class="boss-info" v-else>
                <el-alert type="info" :closable="false" show-icon
                    :title="`BOSS已被击败，下次刷新: ${fmtTime(store.nextBossIn)} 后`" />
            </div>
            <div class="boss-btn">
                <el-button type="danger" size="large" :disabled="!store.canFightBoss()" @click="store.fightBoss()">
                    讨伐世界BOSS
                </el-button>
            </div>
        </div>

        <div class="boss-card">
            <div class="boss-sub">历史战绩</div>
            <div class="boss-stat">
                <div class="tag">累计击杀世界BOSS: {{ store.player.counters.bossKills }}</div>
                <div class="tag">累计击败妖怪: {{ fmt(store.player.counters.killCount) }}</div>
                <div class="tag">幸运值: {{ store.luck.toFixed(2) }} (上限3.0)</div>
            </div>
        </div>

        <!-- 战斗记录 -->
        <div class="battle-box" v-if="store.battle">
            <div class="battle-logs">
                <div v-for="(l, i) in store.battle.logs" :key="i" class="bl" :class="'bl-' + l.type">{{ l.text }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useIdleStore } from '@/idle/store';
    import { fmt, fmtTime } from '@/idle/utils';

    const store = useIdleStore();
</script>

<style scoped>
    .boss-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
    }

    .boss-title { font-size: 16px; font-weight: bold; margin-bottom: 6px; }

    .boss-sub { font-weight: bold; font-size: 14px; margin-bottom: 8px; }

    .boss-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; line-height: 1.6; }

    .boss-info { margin-bottom: 10px; }

    .boss-btn { text-align: center; }

    .boss-stat { display: flex; flex-wrap: wrap; gap: 6px; }

    .boss-stat .tag {
        height: 28px;
        line-height: 26px;
        padding: 0 10px;
        font-size: 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
    }

    .battle-logs {
        max-height: 300px;
        overflow: auto;
        font-size: 12px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 4px;
        padding: 8px 10px;
    }

    html.dark .battle-logs { background: rgba(255, 255, 255, 0.04); }

    .bl { margin-bottom: 2px; }
    .bl-victory { color: var(--el-color-success); font-weight: bold; }
    .bl-defeat { color: var(--el-color-danger); font-weight: bold; }
    .bl-round { color: var(--el-text-color-secondary); margin-top: 4px; }
    .bl-dodge { color: var(--el-color-primary); }
    .bl-buff { color: var(--el-color-warning); }
    .bl-stun { color: #9c27b0; }
    .bl-vampire, .bl-heal { color: var(--el-color-success); }
    .bl-info { color: var(--el-text-color-secondary); }
</style>
