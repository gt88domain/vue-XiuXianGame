<template>
    <div class="cultivate">
        <!-- 修为进度 -->
        <div class="progress-box">
            <div class="realm-name">{{ store.realm.name }} <span class="realm-sub">第 {{ store.player.level }} / 189 重</span></div>
            <el-progress :percentage="cultPct" :stroke-width="18" :format="() => cultPct + '%'" />
            <div class="need" v-if="!store.canBreakthrough">
                距离 {{ nextRealmName }} 还需 {{ fmt(store.realm.maxCultivation - store.player.cultivation) }} 修为
            </div>
            <div class="need ready" v-else>修为圆满，可以突破！</div>
        </div>

        <!-- 修炼操作 -->
        <div class="actions">
            <el-button type="primary" :disabled="store.player.spirit < store.cultivateCost" @click="store.cultivate('one')">
                修炼一次 (灵力 -{{ fmt(store.cultivateCost) }})
            </el-button>
            <el-button type="success" :disabled="store.player.spirit < store.cultivateCost" @click="store.cultivate('ten')">修炼×10</el-button>
            <el-button type="success" :disabled="store.player.spirit < store.cultivateCost" @click="store.cultivate('hundred')">修炼×100</el-button>
            <el-button :type="store.player.settings.autoCultivate ? 'warning' : 'info'" @click="store.player.settings.autoCultivate = !store.player.settings.autoCultivate">
                自动修炼 {{ store.player.settings.autoCultivate ? '开' : '关' }}
            </el-button>
            <el-button class="btn-breakthrough" type="danger" :disabled="!store.canBreakthrough || store.breakthroughBlockers.length > 0" @click="store.breakthrough()">
                {{ store.isMaxLevel ? '已至圆满' : '突破境界' }}
            </el-button>
        </div>

        <section v-if="store.majorGoals.length" class="major-goals">
            <b>跨越大境界 · 历练准备</b><p>修为圆满后，完成以下历练才能突破；小境界不需要这些条件。</p><div v-for="goal in store.majorGoals" :key="goal.label" :class="{done:goal.done}">{{ goal.done ? '✓' : '○' }} {{ goal.label }}</div>
        </section>
        <p class="pace-note">当前这一重基础修炼约 {{ Math.round(store.trainingSeconds / 60) }} 分钟，顿悟、装备与丹药可缩短时间。突破不再返还灵力。历练修为每重最多补足25%，其余需要修炼。</p>
        <!-- 单次修炼说明 -->
        <div class="info-line">单次修炼: 灵力 -{{ fmt(store.cultivateCost) }} → 修为 +{{ fmt(store.cultivateGain) }} (幸运触发双倍, 当前幸运 {{ store.luck.toFixed(2) }})</div>

        <!-- 属性点 -->
        <div class="alloc-box" v-if="store.player.points > 0 || hasAlloc">
            <div class="alloc-title">
                属性点分配
                <span class="alloc-remain">剩余: <b>{{ store.player.points }}</b> (每次突破+3)</span>
            </div>
            <div class="alloc-grid">
                <div class="alloc-item" v-for="st in allocDefs" :key="st.key">
                    <span>{{ st.name }}: <b>{{ fmt(store.stats[st.key]) }}</b></span>
                    <span class="alloc-pts">(+{{ store.player.alloc[st.key] }}点)</span>
                    <div>
                        <el-button size="small" circle :disabled="store.player.points < 1" @click="store.allocate(st.key, 1)">+1</el-button>
                        <el-button size="small" circle :disabled="store.player.points < 10" @click="store.allocate(st.key, 10)">+10</el-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 属性总览 -->
        <div class="stat-box">
            <div class="stat-title">属性总览 (含装备/灵宠/称号/丹药加成)</div>
            <div class="stat-grid">
                <div class="tag" v-for="row in statRows" :key="row.label">{{ row.label }}: {{ row.value }}</div>
            </div>
        </div>

        <!-- 境界表 -->
        <div class="realm-table">
            <el-collapse>
                <el-collapse-item title="📜 修仙境界总表 (21境×9重, 融合两作境界体系)">
                    <div class="realm-grid">
                        <div v-for="r in realmList" :key="r.level" class="realm-cell" :class="{ passed: r.level <= store.player.level }">
                            {{ r.name }} <span class="realm-exp">{{ fmt(r.maxCultivation) }}</span>
                        </div>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt } from '@/idle/utils';
    import { realms, realmName } from '@/idle/data/realms';
    import { pct } from '@/idle/utils';

    const store = useIdleStore();

    const cultPct = computed(() => Math.min(100, Math.floor((store.player.cultivation / store.realm.maxCultivation) * 100)));
    const nextRealmName = computed(() => realmName(Math.min(store.player.level + 1, 189)));
    const hasAlloc = computed(() => Object.values(store.player.alloc).some(v => v > 0));

    const allocDefs = [
        { key: 'attack', name: '攻击' },
        { key: 'health', name: '生命' },
        { key: 'defense', name: '防御' },
        { key: 'speed', name: '速度' }
    ];

    const statRows = computed(() => {
        const s = store.stats;
        const p = v => (v * 100).toFixed(1) + '%';
        return [
            { label: '气血', value: fmt(s.health) },
            { label: '攻击', value: fmt(s.attack) },
            { label: '防御', value: fmt(s.defense) },
            { label: '速度', value: s.speed },
            { label: '暴击率', value: p(s.critRate) },
            { label: '连击率', value: p(s.comboRate) },
            { label: '反击率', value: p(s.counterRate) },
            { label: '眩晕率', value: p(s.stunRate) },
            { label: '闪避率', value: p(s.dodgeRate) },
            { label: '吸血率', value: p(s.vampireRate) },
            { label: '暴击伤害', value: p(s.critDamageBoost) },
            { label: '最终增伤', value: p(s.finalDamageBoost) },
            { label: '最终减伤', value: p(s.finalDamageReduce) },
            { label: '战斗提升', value: p(s.combatBoost) },
            { label: '抗性提升', value: p(s.resistanceBoost) },
            { label: '幸运', value: store.luck.toFixed(2) }
        ];
    });

    const realmList = realms;
</script>

<style scoped>
    .cultivate { padding: 4px 2px; }

    .major-goals{padding:12px;margin:12px 0;border:1px solid #b5964350;border-radius:6px;font-size:13px;line-height:1.9}.major-goals p,.pace-note{font-size:12px;color:var(--el-text-color-secondary);line-height:1.8}.major-goals .done{color:#a4c88d}
    .progress-box { text-align: center; }

    .realm-name {
        font-size: 18px;
        font-weight: bold;
        color: var(--el-color-primary);
        margin-bottom: 6px;
    }

    .realm-sub { font-size: 12px; color: var(--el-text-color-secondary); font-weight: normal; }

    .need { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
    .need.ready { color: var(--el-color-danger); font-weight: bold; }

    .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        margin: 14px 0 6px;
    }

    .info-line { text-align: center; font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; }

    .alloc-box, .stat-box {
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
    }

    .alloc-title, .stat-title { font-size: 13px; font-weight: bold; margin-bottom: 8px; }

    .alloc-remain { font-size: 12px; color: var(--el-color-danger); margin-left: 8px; font-weight: normal; }

    .alloc-grid, .stat-grid { display: flex; flex-wrap: wrap; gap: 6px; }

    .alloc-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
        padding: 4px 8px;
    }

    .alloc-pts { color: var(--el-text-color-secondary); }

    .stat-grid .tag {
        height: 26px;
        line-height: 24px;
        padding: 0 8px;
        font-size: 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
    }

    .realm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px; }

    .realm-cell {
        font-size: 12px;
        padding: 3px 6px;
        border-radius: 3px;
        color: var(--el-text-color-secondary);
        display: flex;
        justify-content: space-between;
    }

    .realm-cell.passed { color: var(--el-color-success); }

    .realm-exp { opacity: 0.7; }
</style>
