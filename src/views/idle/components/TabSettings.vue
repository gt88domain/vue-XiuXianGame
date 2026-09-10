<template>
    <div class="settings-tab">
        <!-- 数据管理 -->
        <div class="set-card">
            <div class="set-title">💾 数据管理 (存档自动保存在浏览器本地)</div>
            <div class="set-row">
                <el-button type="primary" @click="doExport">导出存档</el-button>
                <el-upload :show-file-list="false" :auto-upload="false" accept=".json" :on-change="onFile">
                    <el-button type="success">导入存档</el-button>
                </el-upload>
                <el-popconfirm title="确定要轮回重修吗? 所有数据将清空!" @confirm="store.resetGame()">
                    <template #reference>
                        <el-button type="danger">轮回重修(重置)</el-button>
                    </template>
                </el-popconfirm>
            </div>
            <el-input v-model="saveText" type="textarea" :rows="4" placeholder="存档内容会显示在这里, 也可粘贴存档后点击导入" style="margin-top:8px" />
            <el-button v-if="saveText && !imported" size="small" style="margin-top:6px" @click="doImport">导入文本框中的存档</el-button>
        </div>

        <!-- GM面板 -->
        <div class="set-card">
            <div class="set-title">🛠️ GM面板 (来自「我的放置仙途」, 调试与快速体验用)</div>
            <el-switch v-model="store.isGM" active-text="GM模式" />
            <div class="gm-grid" v-if="store.isGM">
                <el-button size="small" @click="store.gm('spirit')">灵力拉满</el-button>
                <el-button size="small" @click="store.gm('cultivation')">修为拉满</el-button>
                <el-button size="small" @click="store.gm('stones')">灵石+10万</el-button>
                <el-button size="small" @click="store.gm('stones_max')">灵石+1000万</el-button>
                <el-button size="small" @click="store.gm('reinforce')">炼器石+1000</el-button>
                <el-button size="small" @click="store.gm('refinement')">洗练石+1000</el-button>
                <el-button size="small" @click="store.gm('essence')">灵宠精华+1000</el-button>
                <el-button size="small" @click="store.gm('herbs')">灵草×30</el-button>
                <el-button size="small" @click="store.gm('fragments')">丹方残页拉满</el-button>
                <el-button size="small" @click="store.gm('levelup')">境界+9重</el-button>
                <el-button size="small" @click="store.gm('equip')">仙阶装备×1</el-button>
                <el-button size="small" @click="store.gm('pet')">神品灵宠×1</el-button>
                <el-button size="small" @click="store.gm('reset_boss')">BOSS立即刷新</el-button>
            </div>
        </div>

        <!-- 关于 -->
        <div class="set-card">
            <div class="set-title">📖 关于本作</div>
            <div class="about">
                <p><b>挂机修仙 · 融合版</b> — 基于 Vue 3 + Pinia + Element Plus 构建。</p>
                <p>数据与玩法来源(均为 MIT 开源, 同一作者 setube):</p>
                <ul>
                    <li>《我的文字修仙全靠刷》(vue-XiuXianGame): 境界点分配、装备品质/命名库/分解、世界BOSS、每日签到、称号、灵宠捕捉、自动出售</li>
                    <li>《我的放置仙途》(vue-idle-xiuxian): 灵力/修炼/突破、13槽装备与强化洗练、探索地点、奇遇事件、灵草/丹方炼丹、六维战斗属性与抗性、roguelike秘境、抽奖、GM面板</li>
                </ul>
                <p>境界体系: 两作合并为 21大境界 × 9重 = 189级。离线也按 60% 效率恢复灵力(上限8小时)。</p>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { saveAs } from 'file-saver';

    const store = useIdleStore();
    const saveText = ref('');
    const imported = ref(false);

    const doExport = () => {
        const data = store.exportSave();
        saveText.value = data;
        const blob = new Blob([data], { type: 'application/json' });
        saveAs(blob, `idle-xiuxian-save-${new Date().toISOString().slice(0, 10)}.json`);
    };

    const doImport = () => {
        if (store.importSave(saveText.value)) {
            imported.value = true;
            saveText.value = '';
        }
    };

    const onFile = file => {
        const reader = new FileReader();
        reader.onload = e => {
            saveText.value = e.target.result;
            doImport();
        };
        reader.readAsText(file.raw);
    };
</script>

<style scoped>
    .set-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
    }

    .set-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; }

    .set-row { display: flex; gap: 10px; flex-wrap: wrap; }

    .gm-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

    .about { font-size: 13px; line-height: 1.8; }

    .about ul { padding-left: 18px; }

    .about li { margin: 4px 0; }
</style>
