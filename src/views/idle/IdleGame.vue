<template>
    <div class="idle-page">
        <!-- 水墨背景 + 流雾 + 灵气粒子 -->
        <div class="ink-backdrop" />
        <div class="ink-mist" />
        <SpiritMotes />

        <!-- 突破/升境金色闪屏 -->
        <div class="bt-flash" :class="flash" v-if="flash" />

        <div class="idle-container">
            <!-- 铭牌头部 -->
            <NameplateHeader @rename="renameVisible = true" @breakthrough="store.breakthrough()" />

            <WorldScene @navigate="navigateTo" />
            <JourneyGuide @navigate="navigateTo" />

            <!-- 主体: 左侧功能 / 右侧日志 -->
            <div class="idle-body">
                <div ref="tabsElement" class="idle-tabs ink-panel">
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

                <div class="idle-log ink-panel">
                    <div class="log-head">
                        <span class="lt">修行日志</span>
                        <el-button size="small" text @click="store.logs = []">清空</el-button>
                    </div>
                    <div class="log-list">
                        <div v-for="l in store.logs" :key="l.id" class="log-item" :class="'log-' + l.type">
                            <span class="log-time">{{ l.time }}</span>{{ l.text }}
                        </div>
                        <el-empty v-if="!store.logs.length" description="仙路漫漫，从这里开始…" :image-size="60" />
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
                <p>你闭关了 <b style="color:#f0d890">{{ fmtTime(store.offlineReport?.elapsed || 0) }}</b></p>
                <p>恢复灵力: <b style="color:#7cb8ff">{{ fmt(store.offlineReport?.spirit || 0) }}</b> (离线效率60%)</p>
                <div class="offline-next"><b>下一步 · {{ nextGoal.title }}</b><p>{{ nextGoal.description }}</p></div>
                <template #footer>
                    <el-button @click="store.offlineReport = null; navigateTo(nextGoal.tab)">{{ nextGoal.action }}</el-button>
                    <el-button type="primary" @click="store.offlineReport = null">继续修行</el-button>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
    import '@/idle/theme.css';
    import { useIdleStore } from '@/idle/store';
    import { fmt, fmtTime } from '@/idle/utils';
    import { nextJourneyGoal } from '@/idle/journey';
    import WorldScene from './components/WorldScene.vue';
    import JourneyGuide from './components/JourneyGuide.vue';
    import SpiritMotes from './components/SpiritMotes.vue';
    import NameplateHeader from './components/NameplateHeader.vue';
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
    const nextGoal = computed(() => nextJourneyGoal(store));
    const activeTab = ref('cultivate');
    const tabsElement = ref(null);
    const navigateTo = tab => { activeTab.value = tab; nextTick(() => tabsElement.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'})); };
    const renameVisible = ref(false);
    const newName = ref('');
    const flash = ref(null);
    let tickTimer = null;
    let flashTimer = null;

    const playFlash = name => {
        flash.value = name;
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => { flash.value = null; }, 1800);
    };

    // 突破可用时金光一闪
    watch(() => store.canBreakthrough, (v, ov) => {
        if (v && ov === false) playFlash('breakthrough');
    });

    // 升境大闪
    watch(() => store.player.level, (nv, ov) => {
        if (nv > ov) playFlash('realm');
    });

    const rememberOnline = () => {
        store.player.lastOnline = Date.now();
    };

    onMounted(() => {
        store.init();
        // 原有 tick 使用真实时间差。普通计时器也可用于离线 HTML 原版包。
        tickTimer = setInterval(() => {
            store.tick();
            rememberOnline();
        }, 1000);
        window.addEventListener('pagehide', rememberOnline);
    });

    onUnmounted(() => {
        clearInterval(tickTimer);
        clearTimeout(flashTimer);
        window.removeEventListener('pagehide', rememberOnline);
        rememberOnline();
    });
</script>

<style scoped>
    .offline-next { margin-top:18px;padding:12px;background:#c1a36d12;border-left:2px solid #b29a61;line-height:1.7;font-size:13px }
    .offline-next p { margin-bottom:0;font-size:12px }
    .idle-page {
        min-height: 100vh;
        padding: 18px 0 34px;
        box-sizing: border-box;
    }

    .idle-container {
        position: relative;
        z-index: 2;
        width: min(1000px, 95vw);
        margin: 0 auto;
    }

    @media (max-width: 860px) {
        .idle-container { width: 96vw; }
    }
</style>
