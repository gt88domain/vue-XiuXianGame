<template>
    <div class="equip-tab">
        <!-- 已穿戴 -->
        <div class="section">
            <div class="sec-title">🧥 已穿戴 · 13个部位</div>
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
                <input v-model="search" type="search" class="bag-control bag-search" aria-label="搜索装备名称" placeholder="搜索装备名称" />
                <select v-model="filterQuality" aria-label="筛选装备品质" class="bag-control">
                    <option value="">全部品质</option><option v-for="q in qualityOrder" :key="q" :value="q">{{ QUALITIES[q].name }}</option>
                </select>
                <select v-model="sortBy" aria-label="装备排序" class="bag-control"><option value="newest">最新获得</option><option value="score">评分从高到低</option><option value="level">等级从高到低</option></select>
                <el-button size="small" @click="salvageDialog = true">批量分解</el-button>
                <el-button v-if="filterSlot || filterQuality || search" size="small" text @click="filterSlot='';filterQuality='';search=''">清除筛选</el-button>
            </div>
            <div class="bag-list" v-if="filtered.length">
                <div v-for="item in filtered" :key="item.id" class="bag-item">
                    <span class="bag-equip" :class="'q-' + item.quality" @click="showInfo(item)">
                        <el-icon v-if="item.locked" style="margin-right:2px"><Lock /></el-icon>
                        [{{ QUALITIES[item.quality].name }}] {{ item.name }}<template v-if="item.enhanceLevel">+{{ item.enhanceLevel }}</template>
                        <span class="bag-lv">Lv.{{ item.level }} · 评分 {{ fmt(scoreOf(item)) }}</span>
                    </span>
                    <span class="bag-ops">
                        <el-button size="small" text type="primary" @click="store.equipItem(item.id)">穿</el-button>
                        <el-button size="small" text type="success" @click="store.enhanceItem(item.id)">强化</el-button>
                        <el-button size="small" text @click="store.toggleLock(item.id)">{{ item.locked ? '解锁' : '锁定' }}</el-button>
                        <el-button size="small" text type="danger" @click="store.salvageItem(item.id)">分解</el-button>
                    </span>
                </div>
            </div>
            <el-empty v-else :description="store.player.inventory.length ? '没有符合筛选条件的装备' : '探索可以获得装备，先从新手村出发'" :image-size="50" />
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
                <p>品质: <b :class="'q-' + infoItem.quality">{{ QUALITIES[infoItem.quality].name }}</b> · 等级 Lv.{{ infoItem.level }} · 评分 {{ fmt(scoreOf(infoItem)) }}</p>
                <p v-if="infoItem.enhanceLevel">强化等级: +{{ infoItem.enhanceLevel }} (每级+8%属性)</p>
                <div class="compare-card">
                    <b>穿戴前对比</b><p>{{ comparedItem ? `当前：${comparedItem.name}` : '当前部位未穿戴装备' }} · 评分变化 {{ signed(scoreOf(infoItem) - (comparedItem ? scoreOf(comparedItem) : 0)) }}</p>
                    <p class="compare-note">评分供参考，具体属性决定不同的修行方向。</p>
                    <div v-for="row in comparison" :key="row.stat" class="stat-line"><span>{{ STAT_NAMES[row.stat] || row.stat }}</span>：{{ formatStat(row.before,row.stat) }} → {{ formatStat(row.after,row.stat) }} <b :class="row.diff >= 0 ? 'compare-up' : 'compare-down'">({{ formatStat(row.diff,row.stat,true) }})</b></div>
                </div>
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
            <p class="salvage-preview">将分解 {{ salvagePreview.count }} 件，获得灵石 {{ fmt(salvagePreview.stones) }}、炼器石 {{ fmt(salvagePreview.refine) }}。锁定和穿戴中的装备不会被分解。</p>
            <template #footer>
                <el-button @click="salvageDialog = false">取消</el-button>
                <el-button type="danger" :disabled="!salvagePreview.count" @click="store.salvageAll(salvageQualities); salvageDialog = false">分解</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt, pct } from '@/idle/utils';
    import { SLOTS, QUALITIES, QUALITY_ORDER, STAT_NAMES, enhancedStats, isPercentStat, equipScore, salvageGain } from '@/idle/data/equipment';

    const store = useIdleStore();
    const filterSlot = ref('');
    const filterQuality = ref('');
    const search = ref('');
    const sortBy = ref('newest');
    const infoVisible = ref(false);
    const infoItem = ref(null);
    const salvageDialog = ref(false);
    const salvageQualities = ref(['info']);

    const qualityOrder = QUALITY_ORDER;

    const worn = slot => store.player.equipment[slot];
    const scoreOf = item => equipScore(enhancedStats(item));
    const filtered = computed(() => {
        const items = store.player.inventory.filter(i => (!filterSlot.value || i.slot === filterSlot.value) && (!filterQuality.value || i.quality === filterQuality.value) && (!search.value.trim() || i.name.includes(search.value.trim())));
        if (sortBy.value === 'score') items.sort((a,b) => scoreOf(b) - scoreOf(a));
        if (sortBy.value === 'level') items.sort((a,b) => b.level - a.level);
        return items;
    });
    const comparedItem = computed(() => {
        if (!infoItem.value) return null;
        let slot = infoItem.value.slot;
        if (slot === 'ring1' || slot === 'ring2') slot = !worn('ring1') ? 'ring1' : !worn('ring2') ? 'ring2' : slot;
        return worn(slot) || null;
    });
    const comparison = computed(() => {
        if (!infoItem.value) return [];
        const after = enhancedStats(infoItem.value), before = comparedItem.value ? enhancedStats(comparedItem.value) : {};
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].map(stat => ({stat,before:before[stat] || 0,after:after[stat] || 0,diff:(after[stat] || 0)-(before[stat] || 0)}));
    });
    const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + fmt(Math.abs(value));
    const formatStat = (value, stat, withSign = false) => (value < 0 ? '−' : withSign && value > 0 ? '+' : '') + (isPercentStat(stat) ? pct(Math.abs(value)) : fmt(Math.abs(value)));
    const salvagePreview = computed(() => store.player.inventory.filter(i => !i.locked && salvageQualities.value.includes(i.quality)).reduce((total,item) => {
        const gain = salvageGain(item); total.count++; total.stones += gain.stones; total.refine += gain.refine; return total;
    }, {count:0,stones:0,refine:0}));

    const showInfo = item => { infoItem.value = item; infoVisible.value = true; };

    const displayStats = item => enhancedStats(item);
</script>

<style scoped>
    .bag-search{width:160px}
    .bag-control { padding:6px 8px; color:var(--el-text-color-primary); background:var(--el-fill-color-blank); border:1px solid var(--el-border-color); border-radius:4px; min-height:32px; max-width:100%; }
    .compare-card { margin:12px 0;padding:12px;border:1px solid #b5964344;border-radius:6px; }
    .compare-note {font-size:12px;color:var(--el-text-color-secondary)}
    .compare-up {color:#9bc68d}.compare-down {color:#ef9690}.salvage-preview{font-size:13px;line-height:1.8}
    @media(max-width:600px){.bag-control{min-height:44px}}
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
</style>
