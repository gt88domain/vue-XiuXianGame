<template>
    <div class="equip-tab">
        <!-- 已穿戴 -->
        <div class="section">
            <div class="sec-title">🧥 已穿戴 (13槽位体系 · idle-xiuxian)</div>
            <div class="worn-grid">
                <div v-for="(cfg, slot) in SLOTS" :key="slot" class="worn-item">
                    <div class="worn-name">{{ cfg.name }}</div>
                    <template v-if="worn(slot)">
                        <div class="worn-equip" :class="'q-' + worn(slot).quality" @click="showInfo(worn(slot))">
                            {{ worn(slot).name }}<template v-if="worn(slot).enhanceLevel">+{{ worn(slot).enhanceLevel }}</template>
                        </div>
                        <div class="worn-ops">
                            <el-button size="small" text type="primary" @click="store.enhanceItem(worn(slot).id)">强化</el-button>
                            <el-button size="small" text type="warning" @click="store.reforgeItem(worn(slot).id)">洗练</el-button>
                            <el-button size="small" text type="danger" @click="store.unequipSlot(slot)">卸下</el-button>
                        </div>
                    </template>
                    <div v-else class="worn-empty">空</div>
                </div>
            </div>
            <div class="res-line">
                炼器石: <b>{{ fmt(store.player.reinforceStones) }}</b> · 洗练石: <b>{{ fmt(store.player.refinementStones) }}</b>
                (分解装备获得)
            </div>
        </div>

        <!-- 背包 -->
        <div class="section">
            <div class="sec-title">
                🎒 背包 ({{ store.player.inventory.length }} / 200)
                <el-select v-model="filterSlot" size="small" style="width:100px" clearable placeholder="部位">
                    <el-option v-for="(cfg, slot) in SLOTS" :key="slot" :label="cfg.name" :value="slot" />
                </el-select>
                <el-button size="small" @click="salvageDialog = true">批量分解</el-button>
            </div>
            <div class="bag-list" v-if="filtered.length">
                <div v-for="item in filtered" :key="item.id" class="bag-item">
                    <span class="bag-equip" :class="'q-' + item.quality" @click="showInfo(item)">
                        <el-icon v-if="item.locked" style="margin-right:2px"><Lock /></el-icon>
                        [{{ QUALITIES[item.quality].name }}] {{ item.name }}<template v-if="item.enhanceLevel">+{{ item.enhanceLevel }}</template>
                        <span class="bag-lv">Lv.{{ item.level }}</span>
                    </span>
                    <span class="bag-ops">
                        <el-button size="small" text type="primary" @click="store.equipItem(item.id)">穿</el-button>
                        <el-button size="small" text type="success" @click="store.enhanceItem(item.id)">强化</el-button>
                        <el-button size="small" text @click="store.toggleLock(item.id)">{{ item.locked ? '解锁' : '锁定' }}</el-button>
                        <el-button size="small" text type="danger" @click="store.salvageItem(item.id)">分解</el-button>
                    </span>
                </div>
            </div>
            <el-empty v-else description="背包空空如也" :image-size="50" />
        </div>

        <!-- 自动出售 -->
        <div class="section">
            <div class="sec-title">⚙️ 自动出售 (探索/抽奖获得低阶装备时自动分解, 背包>60件时生效)</div>
            <el-checkbox-group v-model="store.player.settings.autoSellQualities">
                <el-checkbox v-for="q in qualityOrder.slice(0, 4)" :key="q" :value="q">{{ QUALITIES[q].name }}</el-checkbox>
            </el-checkbox-group>
        </div>

        <!-- 装备详情 -->
        <el-dialog v-model="infoVisible" :title="infoItem?.name" width="380px">
            <template v-if="infoItem">
                <p>品质: <b :class="'q-' + infoItem.quality">{{ QUALITIES[infoItem.quality].name }}</b> · 等级 Lv.{{ infoItem.level }} · 评分 {{ fmt(infoItem.score) }}</p>
                <p v-if="infoItem.enhanceLevel">强化等级: +{{ infoItem.enhanceLevel }} (每级+8%属性)</p>
                <div v-for="(v, k) in displayStats(infoItem)" :key="k" class="stat-line">
                    {{ STAT_NAMES[k] || k }}: <b>+{{ typeof v === 'number' && !isPercentStat(k) ? fmt(v) : pct(v) }}</b>
                </div>
            </template>
        </el-dialog>

        <!-- 批量分解 -->
        <el-dialog v-model="salvageDialog" title="批量分解" width="340px">
            <p style="font-size:13px">选择要分解的品质(已锁定的不会被分解):</p>
            <el-checkbox-group v-model="salvageQualities">
                <el-checkbox v-for="q in qualityOrder" :key="q" :value="q">
                    <span :class="'q-' + q">{{ QUALITIES[q].name }}</span>
                </el-checkbox>
            </el-checkbox-group>
            <template #footer>
                <el-button @click="salvageDialog = false">取消</el-button>
                <el-button type="danger" @click="store.salvageAll(salvageQualities); salvageDialog = false">分解</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, pct } from '@/idle/utils';
    import { SLOTS, QUALITIES, QUALITY_ORDER, STAT_NAMES, enhancedStats, isPercentStat } from '@/idle/data/equipment';

    const store = useIdleStore();
    const filterSlot = ref('');
    const infoVisible = ref(false);
    const infoItem = ref(null);
    const salvageDialog = ref(false);
    const salvageQualities = ref(['info']);

    const qualityOrder = QUALITY_ORDER;

    const worn = slot => store.player.equipment[slot];
    const filtered = computed(() => filterSlot.value
        ? store.player.inventory.filter(i => i.slot === filterSlot.value)
        : store.player.inventory);

    const showInfo = item => { infoItem.value = item; infoVisible.value = true; };

    const displayStats = item => enhancedStats(item);
</script>

<style scoped>
    .section { margin-bottom: 16px; }

    .sec-title {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .worn-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 6px;
    }

    .worn-item {
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 12px;
        min-height: 64px;
    }

    .worn-name { color: var(--el-text-color-secondary); margin-bottom: 2px; }

    .worn-equip { cursor: pointer; font-weight: bold; }

    .worn-empty { color: var(--el-text-color-placeholder); }

    .worn-ops { display: flex; margin-top: 2px; }

    .worn-ops .el-button { padding: 0 4px; height: 20px; font-size: 11px; }

    .res-line { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 8px; }

    .bag-list { display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow: auto; }

    .bag-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
        padding: 4px 8px;
    }

    .bag-equip { cursor: pointer; display: inline-flex; align-items: center; }

    .bag-lv { color: var(--el-text-color-secondary); margin-left: 4px; font-weight: normal; }

    .bag-ops .el-button { padding: 0 4px; height: 20px; font-size: 11px; }

    .stat-line { font-size: 13px; margin: 3px 0; }

    /* 品质配色(XiuXianGame 7阶) */
    .q-info { color: #909399; }
    .q-success { color: #67c23a; }
    .q-primary { color: #409eff; }
    .q-purple { color: #8560f5; }
    .q-warning { color: #e6a23c; }
    .q-danger { color: #f56c6c; }
    .q-pink { color: #f472b6; }
</style>
