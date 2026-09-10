<template>
    <div class="idle-page">
        <div class="idle-container">
            <!-- 顶部状态栏 -->
            <div class="status-bar">
                <div class="status-row">
                    <div class="tag attribute" @click="renameVisible = true">
                        道号: {{ store.player.name }}
                        <el-text v-if="store.player.title" type="danger">[{{ store.player.title }}]</el-text>
                        <el-icon><EditPen /></el-icon>
                    </div>
                    <div class="tag attribute">境界: {{ store.realm.name }}({{ Math.floor((store.player.level / 189) * 100) }}%)</div>
                    <div class="tag attribute" :type="store.canBreakthrough ? 'danger' : 'info'">
                        修为: {{ fmt(store.player.cultivation) }} / {{ fmt(store.realm.maxCultivation) }}
                        <span v-if="store.canBreakthrough" class="blink">●可突破</span>
                    </div>
                </div>
                <div class="status-row">
                    <div class="tag attribute">灵力: {{ fmt(store.player.spirit) }} / {{ fmt(store.spiritCap) }} (+{{ fmt(store.spiritRegen) }}/秒)</div>
                    <div class="tag attribute">灵石: {{ fmt(store.player.spiritStones) }}</div>
                    <div class="tag attribute">战力: {{ fmt(store.power) }}</div>
                    <div class="tag attribute" v-if="store.player.points > 0" type="danger">
                        境界点: {{ store.player.points }}
                        <el-icon><CirclePlus /></el-icon>
                    </div>
                </div>
                <div class="status-row" v-if="store.player.activeEffects.length">
                    <div class="tag buff" v-for="e in store.player.activeEffects" :key="e.id">
                        {{ e.name }} {{ e.type === 'autoHeal' ? '' : '+' + (e.value * 100).toFixed(0) + '%' }}
                        ({{ fmtTime(e.remain) }})
                    </div>
                </div>
            </div>

            <!-- 主体: 左侧功能 / 右侧日志 -->
            <div class="main-area">
                <div class="tab-area">
                    <el-tabs v-model="activeTab">
                        <el-tab-pane label="修炼" name="cultivate"><TabCultivate /></el-tab-pane>
                        <el-tab-pane label="探索" name="explore"><TabExplore /></el-tab-pane>
                        <el-tab-pane label="炼丹" name="alchemy"><TabAlchemy /></el-tab-pane>
                        <el-tab-pane label="装备" name="equipment"><TabEquipment /></el-tab-pane>
                        <el-tab-pane label="灵宠" name="pets"><TabPets /></el-tab-pane>
                        <el-tab-pane label="秘境" name="dungeon"><TabDungeon /></el-tab-pane>
                        <el-tab-pane label="抽奖" name="gacha"><TabGacha /></el-tab-pane>
                        <el-tab-pane label="世界BOSS" name="boss"><TabBoss /></el-tab-pane>
                        <el-tab-pane label="成就" name="achievements"><TabAchievements /></el-tab-pane>
                        <el-tab-pane label="设置" name="settings"><TabSettings /></el-tab-pane>
                    </el-tabs>
                </div>
                <div class="log-area">
                    <div class="log-title">
                        <span>修行日志</span>
                        <el-button size="small" text @click="store.logs = []">清空</el-button>
                    </div>
                    <div class="log-list">
                        <div v-for="l in store.logs" :key="l.id" class="log-item" :class="'log-' + l.type">
                            <span class="log-time">{{ l.time }}</span>{{ l.text }}
                        </div>
                        <el-empty v-if="!store.logs.length" description="开始你的修仙之路吧" :image-size="60" />
                    </div>
                </div>
            </div>

            <!-- 改名 -->
            <el-dialog v-model="renameVisible" title="修改道号" width="320px">
                <el-input v-model="newName" maxlength="8" placeholder="最多8个字" />
                <template #footer>
                    <el-button @click="renameVisible = false">取消</el-button>
                    <el-button type="primary" @click="store.rename(newName); renameVisible = false">确定</el-button>
                </template>
            </el-dialog>

            <!-- 离线收益 -->
            <el-dialog :model-value="!!store.offlineReport" title="闭关归来" width="360px" @close="store.offlineReport = null">
                <p>你闭关了 <b>{{ fmtTime(store.offlineReport?.elapsed || 0) }}</b></p>
                <p>恢复灵力: <b class="c-spirit">{{ fmt(store.offlineReport?.spirit || 0) }}</b> (离线效率60%)</p>
                <template #footer>
                    <el-button type="primary" @click="store.offlineReport = null">继续修行</el-button>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, fmtTime } from '@/idle/utils';
    import TabCultivate from './components/TabCultivate.vue';
    import TabExplore from './components/TabExplore.vue';
    import TabAlchemy from './components/TabAlchemy.vue';
    import TabEquipment from './components/TabEquipment.vue';
    import TabPets from './components/TabPets.vue';
    import TabDungeon from './components/TabDungeon.vue';
    import TabGacha from './components/TabGacha.vue';
    import TabBoss from './components/TabBoss.vue';
    import TabAchievements from './components/TabAchievements.vue';
    import TabSettings from './components/TabSettings.vue';

    const store = useIdleStore();
    const activeTab = ref('cultivate');
    const renameVisible = ref(false);
    const newName = ref('');
    let worker = null;

    onMounted(() => {
        store.init();
        // 注意: new URL() 内必须用相对路径(不能用@别名), 否则 dev 模式下 worker 无法加载
        worker = new Worker(new URL('../../idle/worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = () => store.tick();
    });

    onUnmounted(() => {
        if (worker) worker.terminate();
        store.player.lastOnline = Date.now();
    });
</script>

<style scoped>
    .idle-page {
        display: flex;
        justify-content: center;
        padding: 10px 0 30px;
    }

    .idle-container {
        width: min(980px, 96vw);
        background-color: rgba(255, 255, 255, 0.6);
        border-radius: 8px;
        padding: 14px;
    }

    html.dark .idle-container {
        background-color: rgba(30, 30, 30, 0.9);
    }

    .status-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
    }

    .status-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .tag.attribute, .tag.buff {
        height: 30px;
        line-height: 28px;
        padding: 0 10px;
        font-size: 12px;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        cursor: default;
        white-space: nowrap;
    }

    .tag.buff {
        color: var(--el-color-success);
        border-color: var(--el-color-success-light-5);
    }

    .blink {
        color: var(--el-color-danger);
        animation: blink 1s infinite;
        margin-left: 4px;
    }

    @keyframes blink {
        50% { opacity: 0.2; }
    }

    .main-area {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 12px;
        align-items: start;
    }

    .log-area {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        height: 560px;
        background: rgba(255, 255, 255, 0.4);
    }

    html.dark .log-area {
        background: rgba(20, 20, 20, 0.6);
    }

    .log-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--el-border-color-lighter);
        font-weight: bold;
        font-size: 13px;
    }

    .log-list {
        flex: 1;
        overflow: auto;
        padding: 8px 12px;
        font-size: 12px;
    }

    .log-item {
        margin-bottom: 6px;
        line-height: 1.5;
        word-break: break-all;
    }

    .log-time {
        color: var(--el-text-color-secondary);
        margin-right: 6px;
        font-size: 11px;
    }

    .log-victory, .log-breakthrough, .log-achievement { color: var(--el-color-success); }
    .log-defeat, .log-danger { color: var(--el-color-danger); }
    .log-warning { color: var(--el-color-warning); }
    .log-boss, .log-gacha, .log-pet { color: var(--el-color-danger); }
    .log-event { color: var(--el-color-primary); }
    .log-dungeon { color: #9c27b0; }
    .log-cultivate { color: var(--el-color-success); }
    .log-equip { color: var(--el-color-warning); }
    .log-gm { color: #e91e63; }

    @media (max-width: 860px) {
        .main-area {
            grid-template-columns: 1fr;
        }

        .log-area {
            height: 300px;
            order: 2;
        }
    }
</style>
