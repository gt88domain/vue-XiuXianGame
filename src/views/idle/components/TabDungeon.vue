<template>
    <div class="dungeon-tab">
        <!-- 未进入 -->
        <template v-if="!store.dungeon">
            <div class="intro">
                🏔️ 初试5层、普通7层、困难9层、炼狱10层。战斗之间选择强化或回血，最后一层挑战守关者。入境消耗灵力，失败保留已获得的材料；通关记录用于大境界历练。
            </div>
            <div class="diff-list">
                <div v-for="(cfg, d) in DIFFICULTIES" :key="d" class="diff-card"
                    :class="{ locked: store.player.level < cfg.minLevel, picked: pickedDiff == d }"
                    @click="store.player.level >= cfg.minLevel && (pickedDiff = d)">
                    <div class="diff-name">{{ cfg.name }}</div>
                    <div class="diff-line">怪物: 血×{{ cfg.healthMod }} 攻×{{ cfg.damageMod }}</div>
                    <div class="diff-line">{{ cfg.floors }} 层 · 奖励×{{ cfg.rewardMod }}</div><div class="diff-line">入境消耗 {{ fmt(store.dungeonEntryCost(d)) }} 灵力</div>
                    <div class="diff-line" v-if="store.player.level < cfg.minLevel">需 {{ realmName(cfg.minLevel) }}</div>
                </div>
            </div>
            <div class="start-btn">
                <el-button type="primary" size="large" :disabled="store.player.level < DIFFICULTIES[pickedDiff].minLevel || store.player.spirit < store.dungeonEntryCost(pickedDiff)" @click="store.dungeonStart(pickedDiff)">进入秘境</el-button>
            </div>
            <div class="stat-line">历史通关层数: {{ store.player.counters.dungeonClear }} · 炼狱通关: {{ store.player.counters.dungeonHellClear ? '已达成' : '未达成' }}</div>
        </template>

        <!-- 副本中 -->
        <template v-else>
            <div class="run-head">
                <el-tag>{{ DIFFICULTIES[store.dungeon.difficulty].name }}</el-tag>
                <span class="floor">第 {{ store.dungeon.floor }} / {{ store.dungeon.floorMax }} 层</span>
                <el-progress class="hp-bar" :percentage="Math.max(0, Math.floor((store.dungeon.runHealth / store.dungeon.maxHealth) * 100))"
                    :stroke-width="14" :format="() => fmt(store.dungeon.runHealth)" />
                <el-button v-if="store.dungeon.phase === 'choose'" size="small" @click="store.dungeonExit()">离开秘境</el-button>
                <el-button v-else size="small" type="danger" plain @click="store.dungeonExit()">放弃</el-button>
            </div>

            <!-- 三选一 -->
            <div v-if="store.dungeon.phase === 'choose'" class="choose-box">
                <div class="choose-title">选择一项强化:</div>
                <div class="choose-grid">
                    <div v-for="o in store.dungeon.options" :key="o.id" class="choose-card" :class="'r-' + o.rarity"
                        @click="store.dungeonChooseBuff(o.id)">
                        <div class="ch-name">{{ o.name }}</div>
                        <div class="ch-desc">{{ o.description }}</div>
                        <el-tag size="small" :type="o.rarity === 'epic' ? 'danger' : o.rarity === 'rare' ? 'warning' : 'info'">
                            {{ o.rarity === 'epic' ? '史诗' : o.rarity === 'rare' ? '稀有' : '普通' }}
                        </el-tag>
                    </div>
                </div>
            </div>

            <div v-else-if="store.dungeon.finished" class="finish-box">
                <el-result :icon="store.dungeon.cleared ? 'success' : 'warning'"
                    :title="store.dungeon.cleared ? '秘境通关!' : '探索结束'"
                    :sub-title="store.dungeon.cleared ? '宝箱装备已放入背包' : '下次一定'">
                    <template #extra>
                        <el-button type="primary" @click="store.dungeonExit()">返回</el-button>
                    </template>
                </el-result>
            </div>

            <!-- 战斗记录 -->
            <div class="battle-box" v-if="store.battle">
                <div class="battle-logs">
                    <div v-for="(l, i) in store.battle.logs" :key="i" class="bl" :class="'bl-' + l.type">{{ l.text }}</div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt } from '@/idle/utils';
    import { DIFFICULTIES } from '@/idle/data/dungeon';
    import { realmName } from '@/idle/data/realms';

    const store = useIdleStore();
    const pickedDiff = ref(1);
</script>

<style scoped>
    .intro { font-size: 13px; color: var(--el-text-color-regular); margin-bottom: 12px; line-height: 1.6; }

    .diff-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }

    .diff-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
        text-align: center;
        font-size: 12px;
    }

    .diff-card.picked { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }

    .diff-card.locked { opacity: 0.5; cursor: not-allowed; }

    .diff-name { font-size: 15px; font-weight: bold; margin-bottom: 4px; }

    .diff-line { color: var(--el-text-color-secondary); }

    .start-btn { text-align: center; margin: 16px 0 8px; }

    .stat-line { text-align: center; font-size: 12px; color: var(--el-text-color-secondary); }

    .run-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }

    .floor { font-weight: bold; }

    .hp-bar { flex: 1; min-width: 160px; }

    .choose-title { font-weight: bold; margin-bottom: 8px; }

    .choose-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }

    .choose-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s;
    }

    .choose-card:hover { transform: translateY(-2px); }

    .choose-card.r-epic { border-color: var(--el-color-danger); }

    .choose-card.r-rare { border-color: var(--el-color-warning); }

    .ch-name { font-weight: bold; margin-bottom: 4px; }

    .ch-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; }

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
