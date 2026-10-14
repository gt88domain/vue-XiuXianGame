<template>
    <main class="original-game">
        <header class="original-heading">
            <div>
                <p class="original-kicker">我的文字修仙全靠刷</p>
                <h1>挂机修仙<span>·</span>融合版</h1>
            </div>
            <p class="original-edition">修行体验版 <span>{{ saveStatus.error ? '存档需要备份' : saveStatus.savedAt ? '进度已保存' : '本地自动存档' }}</span></p>
        </header>
        <div v-if="saveStatus.error" class="save-warning" role="alert">{{ saveStatus.error }} <el-button @click="exportEmergency">导出当前存档</el-button></div>
        <IdleGame v-if="playReady" />
        <section v-else class="session-wait ink-panel">
            <h2>{{ unsupported ? '当前浏览器不支持安全存档锁' : duplicate ? '这份存档正在另一个页面运行' : '正在打开修行进度…' }}</h2>
            <p v-if="unsupported">请使用新版 Chrome、Edge、Firefox 或 Safari 打开游戏，以保护进度。</p>
            <p v-if="duplicate">请关闭另一个游戏页面，再回到这里继续，避免两个页面覆盖进度。</p>
            <el-button v-if="duplicate" type="primary" @click="acquireSession">继续修行</el-button>
        </section>
    </main>
</template>

<script setup>
    import IdleGame from './views/idle/IdleGame.vue';
    import { ref, onMounted, onUnmounted } from 'vue';
    import { saveStatus } from './idle/save-storage';
    import { useIdleStore } from './idle/store';
    import { saveAs } from 'file-saver';
    const playReady = ref(false);
    const duplicate = ref(false);
    const unsupported = ref(false);
    let releaseSession;
    async function acquireSession() {
        if (playReady.value) return;
        duplicate.value = false;
        if (!navigator.locks) { unsupported.value = true; return; }
        try {
            await navigator.locks.request('xiuxian-original-save-owner', { ifAvailable: true }, async lock => {
                if (!lock) { duplicate.value = true; return; }
                playReady.value = true;
                await new Promise(resolve => { releaseSession = resolve; });
            });
        } catch { duplicate.value = true; }
    }
    function exportEmergency() {
        saveAs(new Blob([useIdleStore().exportSave()], {type:'application/json'}), 'xiuxian-recovery.json');
    }
    onMounted(acquireSession);
    onUnmounted(() => releaseSession?.());
</script>

<style>
    html, body { margin: 0; min-height: 100%; background: #0e1219; }
    .save-warning, .session-wait { position:relative;z-index:3;width:min(1000px,95vw);box-sizing:border-box;margin:16px auto;padding:16px;color:#eddcb1;background:#241c13;border:1px solid #a88745;line-height:1.8; }
    .original-game { min-height: 100vh; }
    .original-heading {
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        width: min(1000px, 95vw);
        margin: 0 auto;
        padding: 26px 0 2px;
        color: #e9d69e;
        font-family: 'Noto Serif SC', 'Songti SC', 'STSong', 'KaiTi', 'SimSun', serif;
    }
    .original-kicker { margin: 0 0 7px; font-size: 12px; letter-spacing: 3px; color: #c1b496; }
    .original-heading h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); font-weight: 500; letter-spacing: 3px; }
    .original-heading h1 span { padding: 0 5px; color: #aa8740; }
    .original-edition { margin: 0 0 3px; font: 12px/1.8 sans-serif; color: #d5c8a6; text-align: right; }
    .original-edition span { display: block; color: #a9a291; }
    .original-game .idle-page { min-height: calc(100vh - 86px); }
    @media (max-width: 600px) {
        .original-heading { padding-top: 20px; width: 96vw; gap: 8px; }
        .original-kicker { letter-spacing: 2px; }
        .original-heading h1 { letter-spacing: 1px; }
        .original-edition { font-size: 10px; }
        .original-game .el-tabs__nav-wrap { padding: 0; }
        .original-game .el-tabs__nav-scroll { overflow: visible; }
        .original-game .el-tabs__nav {
            display: flex;
            flex-wrap: wrap;
            width: 100%;
            transform: none !important;
        }
        .original-game .el-tabs__item {
            flex: 0 0 25%;
            box-sizing: border-box;
            height: 44px;
            padding: 0;
            font-size: 13px;
        }
        .original-game .el-tabs__item.is-active { border-bottom: 1px solid #d4af37; }
        .original-game .el-tabs__active-bar,
        .original-game .el-tabs__nav-prev,
        .original-game .el-tabs__nav-next { display: none; }
        .original-game .el-dialog { max-width:calc(100vw - 24px); }
        .original-game .el-button { min-height: 44px; }
        .original-game .el-select__wrapper { min-height: 44px; }
        .original-game .bag-item { flex-wrap:wrap;gap:6px; }
        .original-game .bag-equip { flex-wrap:wrap;overflow-wrap:anywhere; }
        .original-game .bag-ops { display:flex;flex-wrap:wrap; }
        .original-game .worn-ops { flex-wrap:wrap; }
    }
    @media (prefers-reduced-motion: reduce) {
        .original-game .ink-mist,
        .original-game .spirit-motes span { animation: none; }
    }
</style>
