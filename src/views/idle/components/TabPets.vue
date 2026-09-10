<template>
    <div class="pets-tab">
        <div class="res-line">
            灵宠精华: <b>{{ fmt(store.player.petEssence) }}</b> (放生灵宠/多余灵宠获得) · 灵宠栏 {{ store.player.pets.length }}/50
        </div>

        <div class="sec-title">🐾 我的灵宠 (同名同品可进化升星)</div>
        <div class="pet-grid" v-if="store.player.pets.length">
            <div v-for="pet in store.player.pets" :key="pet.id" class="pet-card"
                :class="{ active: store.player.activePetId === pet.id }">
                <div class="pet-head">
                    <b :style="{ color: RARITIES[pet.rarity].color }">{{ pet.name }}</b>
                    <el-tag size="small" effect="dark" :color="RARITIES[pet.rarity].color" style="border:none">
                        {{ RARITIES[pet.rarity].name }}
                    </el-tag>
                    <el-tag v-if="pet.star > 1" size="small" type="warning">{{ '★'.repeat(Math.min(pet.star, 5)) }}</el-tag>
                    <el-tag size="small" type="info">Lv.{{ pet.level }}</el-tag>
                </div>
                <div class="pet-desc">{{ pet.description }}</div>
                <div class="pet-bonus">
                    <span v-if="petBonus(pet).attack">攻+{{ fmt(petBonus(pet).attack) }}</span>
                    <span v-if="petBonus(pet).health">血+{{ fmt(petBonus(pet).health) }}</span>
                    <span v-if="petBonus(pet).defense">防+{{ fmt(petBonus(pet).defense) }}</span>
                    <span v-if="petBonus(pet).speed">速+{{ petBonus(pet).speed }}</span>
                    <span v-if="petBonus(pet).critRate">暴+{{ (petBonus(pet).critRate * 100).toFixed(0) }}%</span>
                    <span v-if="petBonus(pet).combatBoost">战+{{ (petBonus(pet).combatBoost * 100).toFixed(0) }}%</span>
                </div>
                <div class="pet-ops">
                    <el-button size="small" :type="store.player.activePetId === pet.id ? 'warning' : 'primary'"
                        @click="store.deployPet(pet.id)">
                        {{ store.player.activePetId === pet.id ? '休息' : '出战' }}
                    </el-button>
                    <el-button size="small" type="success" :disabled="store.player.petEssence < upgradeCost(pet)"
                        @click="store.upgradePet(pet.id)">培养({{ upgradeCost(pet) }})</el-button>
                    <el-button size="small" @click="openEvolve(pet)">进化</el-button>
                    <el-button size="small" type="danger" text @click="store.releasePet(pet.id)">放生</el-button>
                </div>
            </div>
        </div>
        <el-empty v-else description="探索与战斗可捕捉灵宠, 抽奖可获得稀有灵宠" :image-size="60" />

        <!-- 进化 -->
        <el-dialog v-model="evolveVisible" title="灵宠进化" width="360px">
            <p style="font-size:13px">选择一只同名同稀有度的灵宠作为祭品:</p>
            <div class="food-list">
                <div v-for="f in evolveFoods" :key="f.id" class="food-item" :class="{ picked: foodId === f.id }"
                    @click="foodId = f.id">
                    <b :style="{ color: RARITIES[f.rarity].color }">{{ f.name }}</b>
                    <span>Lv.{{ f.level }} ★{{ f.star }}</span>
                    <span class="food-back">返还{{ Math.floor(RARITIES[f.rarity].essence * 0.5) }}精华</span>
                </div>
                <el-empty v-if="!evolveFoods.length" description="没有可用的祭品" :image-size="40" />
            </div>
            <template #footer>
                <el-button @click="evolveVisible = false">取消</el-button>
                <el-button type="primary" :disabled="!foodId"
                    @click="store.evolvePet(evolvePet.id, foodId); evolveVisible = false">进化</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { useIdleStore } from '@/idle/store';
    import { fmt } from '@/idle/utils';
    import { RARITIES, petBonuses, petUpgradeCost } from '@/idle/data/pets';

    const store = useIdleStore();
    const evolveVisible = ref(false);
    const evolvePet = ref(null);
    const foodId = ref(null);

    const petBonus = pet => petBonuses(pet) || {};
    const upgradeCost = pet => petUpgradeCost(pet);

    const evolveFoods = computed(() => {
        if (!evolvePet.value) return [];
        return store.player.pets.filter(p =>
            p.id !== evolvePet.value.id && p.name === evolvePet.value.name && p.rarity === evolvePet.value.rarity);
    });

    const openEvolve = pet => {
        evolvePet.value = pet;
        foodId.value = null;
        evolveVisible.value = true;
    };
</script>

<style scoped>
    .res-line { font-size: 13px; margin-bottom: 10px; }

    .sec-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; }

    .pet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 8px;
    }

    .pet-card {
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        padding: 10px;
    }

    .pet-card.active { border-color: var(--el-color-success); background: var(--el-color-success-light-9); }

    .pet-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

    .pet-desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }

    .pet-bonus { font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px; color: var(--el-color-success); margin-bottom: 6px; }

    .pet-ops { display: flex; gap: 4px; flex-wrap: wrap; }

    .pet-ops .el-button { margin-left: 0; }

    .food-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow: auto; }

    .food-item {
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .food-item.picked { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }

    .food-back { margin-left: auto; color: var(--el-text-color-secondary); }
</style>
