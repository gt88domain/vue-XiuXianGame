<template>
    <section class="world-scene" :class="{'is-breakthrough':burst,'has-battle':!!store.battle}" :style="{'--scene-position':scenePosition,'--realm-color':realmColor}" aria-label="修行场景">
        <div class="scene-landscape" :style="landscapeStyle" />
        <div class="scene-shade" />
        <div class="scene-caption"><span>山海修行 · {{ store.realm.stage }}</span><h2>{{ locationName }}</h2><p>{{ sceneCaption }}</p></div>
        <div class="character-stage" :class="{'in-battle':!!store.battle}">
            <div class="fighter player-fighter">
                <div v-if="stage > 0" class="cultivator-aura" :class="'aura-'+appearance" />
                <div class="cultivator-sprite" :class="{'attack-right':frame?.actor === 'player' && playing,'take-hit':frame?.actor === 'monster' && playing}" :style="heroStyle" role="img" :aria-label="`${store.realm.stage}修士形象`" />
                <span v-if="playing && frame?.actor === 'monster'" :key="'pd'+frameIndex" class="floating-damage">{{ frame.dodged ? '闪避' : '−'+fmt(frame.damage) }}</span>
                <div class="fighter-label">{{ store.player.name }}<small v-if="store.battle">本场气血 {{ fmt(playerHealth) }}/{{ fmt(store.battle.playerMaxHealth) }}</small></div>
            </div>
            <div v-if="store.battle" class="fighter monster-fighter">
                <div class="monster-sprite" :class="{'attack-left':frame?.actor === 'monster' && playing,'take-hit':frame?.actor === 'player' && playing}" :style="monsterStyle" role="img" :aria-label="(enemyAppearance === 3 ? '山灵示意 · ' : '')+store.battle.monster.name+'战斗形象'" />
                <span v-if="playing && frame?.actor === 'player'" :key="'md'+frameIndex" class="floating-damage">{{ frame.dodged ? '闪避' : '−'+fmt(frame.damage) }}</span>
                <div class="fighter-label">{{ store.battle.monster.name }}<small><template v-if="enemyAppearance === 3">山灵示意 · </template>Lv.{{ store.battle.monster.level }} · 本场气血 {{ fmt(monsterHealth) }}</small></div>
            </div>
        </div>
        <div v-if="store.battle" class="scene-battle-status" role="status"><span>{{ playing ? `交锋片段 · 第${frame?.round || 1}回合` : store.battle.win ? '胜 · 此战告捷' : '退 · 休整再来' }}</span><el-button text size="small" @click="replay">重播片段</el-button></div>
        <nav class="scene-actions" aria-label="快捷修行"><el-button @click="$emit('navigate','cultivate')">修行</el-button><el-button @click="$emit('navigate','explore')">历练</el-button><el-button @click="$emit('navigate','dungeon')">秘境试炼</el-button></nav>
        <Transition name="realm-reveal"><div v-if="burst" class="realm-reveal" role="status"><span>灵台清明 · 破境</span><strong>{{ store.realm.name }}</strong><small>{{ majorBurst ? '道途新启，仙衣与灵光随境而变' : '修为精进，前路渐明' }}</small></div></Transition>
    </section>
</template>
<script setup>
import {computed,ref,watch,onUnmounted} from 'vue';
import {useIdleStore} from '@/idle/store';
import {locations} from '@/idle/data/locations';
import {fmt} from '@/idle/utils';
import heroes from '@/assets/xiuxian/cultivators.png';
import monsters from '@/assets/xiuxian/spirits.png';
import landscape from '@/assets/xiuxian/landscape.png';
defineEmits(['navigate']);
const store=useIdleStore();
const stage=computed(()=>store.realm.stageIndex);
const appearance=computed(()=>Math.min(3,stage.value));
const realmColor=computed(()=>stage.value===0?'#c2ab6a':['#88c5bb','#e9ce86','#a7bfe5','#c1a2d8','#d9a59b','#aaca94'][(stage.value-1)%6]);
const locationName=computed(()=>locations.find(l=>l.id===store.player.settings.exploreLocation)?.name || '新手村');
const scenePosition=computed(()=>stage.value===0?'left center':stage.value===1?'center center':'right center');
const sceneCaption=computed(()=>stage.value===0?'一袭布衣，一柄木剑，从凡尘起步。':stage.value===1?'道基初成，踏入云间山门。':`${store.realm.stage}灵光流转，云海之外仍有未见的山河。`);
const enemyAppearance=computed(()=> /蛟|龙|蛇|蟒/.test(store.battle?.monster.name||'')?2:/虎|豹|狮/.test(store.battle?.monster.name||'')?1:/狼|狐|犬|兽/.test(store.battle?.monster.name||'')?0:3);
const landscapeStyle={backgroundImage:`url(${landscape})`};
const heroStyle=computed(()=>({backgroundImage:`url(${heroes})`,backgroundPosition:`${appearance.value * 100 / 3}% center`}));
const monsterStyle=computed(()=>({backgroundImage:`url(${monsters})`,backgroundPosition:`${enemyAppearance.value * 100 / 3}% center`}));
const frameIndex=ref(0),playing=ref(false),burst=ref(false),majorBurst=ref(false);
let replayTimer,burstTimer;
const frame=computed(()=>store.battle?.frames?.[frameIndex.value]);
const playerHealth=computed(()=>playing.value?frame.value?.playerHealth ?? store.battle?.playerHealth:store.battle?.playerHealth);
const monsterHealth=computed(()=>playing.value?frame.value?.monsterHealth ?? store.battle?.monsterHealth:store.battle?.monsterHealth);
function replay(){
 clearTimeout(replayTimer);frameIndex.value=0;const frames=store.battle?.frames;
 if(!frames?.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches){playing.value=false;return;}
 playing.value=true;const delay=Math.max(35,Math.min(180,3200/frames.length));
 const advance=()=>{if(frameIndex.value>=frames.length-1){playing.value=false;return;}frameIndex.value++;replayTimer=setTimeout(advance,delay);};
 replayTimer=setTimeout(advance,delay);
}
watch(()=>store.battle,replay);
watch(()=>store.player.level,(level,old)=>{if(level<=old)return;majorBurst.value=Math.floor((level-1)/9)>Math.floor((old-1)/9);burst.value=true;clearTimeout(burstTimer);burstTimer=setTimeout(()=>burst.value=false,2400);});
onUnmounted(()=>{clearTimeout(replayTimer);clearTimeout(burstTimer);});
</script>
<style scoped>
.world-scene{position:relative;height:310px;border:1px solid var(--realm-color);border-radius:12px;overflow:hidden;isolation:isolate;background:#1b2527;margin:12px 0}.scene-landscape,.scene-shade{position:absolute;inset:0;z-index:-2}.scene-landscape{background-size:170% auto;background-position:var(--scene-position);transition:background-position 1.5s ease,filter 1s;filter:brightness(.78) saturate(.8)}.scene-shade{z-index:-1;background:radial-gradient(ellipse at 20% 80%,color-mix(in srgb,var(--realm-color) 18%,transparent),transparent 65%),linear-gradient(90deg,#07151880,transparent 60%),linear-gradient(0deg,#101722ed,transparent 55%)}.scene-caption{position:absolute;right:22px;top:20px;max-width:50%;text-align:right;color:#f2e8cb;text-shadow:0 2px 8px #000}.has-battle .scene-caption{left:50%;right:auto;transform:translateX(-50%);text-align:center;max-width:45%}.scene-caption>span{font-size:11px;letter-spacing:3px;color:#dac99c}.scene-caption h2{font:30px/1.3 'Songti SC',serif;letter-spacing:5px;margin:6px 0}.scene-caption p{font-size:12px;line-height:1.8;margin:0;color:#d6d5ca}.character-stage{position:absolute;inset:8px 0 28px}.fighter{position:absolute;bottom:12px;display:flex;align-items:center;flex-direction:column;width:190px}.player-fighter{left:8%}.monster-fighter{right:11%}.cultivator-sprite{width:156px;height:260px;background-size:400% 100%;background-repeat:no-repeat;filter:drop-shadow(0 9px 7px #0007);z-index:1}.monster-sprite{width:190px;height:250px;background-size:400% 100%;background-repeat:no-repeat;filter:drop-shadow(0 9px 7px #0008)}.fighter-label{position:absolute;bottom:14px;text-align:center;font-size:12px;color:#efe4c8;text-shadow:0 1px 5px #000;background:#122024b8;border:1px solid #e0cd8d30;padding:3px 12px;border-radius:12px;z-index:2;white-space:nowrap}.fighter-label small{display:block;font-size:10px;color:#c4d3c0}.scene-actions{position:absolute;bottom:12px;left:22px;display:flex;gap:8px}.scene-actions .el-button{margin:0;background:#10232ad9;border-color:#b6a06870;color:#e8d8ae}.scene-battle-status{position:absolute;bottom:12px;right:16px;display:flex;align-items:center;gap:8px;color:#f2dc9d;font-size:12px}.scene-battle-status .el-button{color:#dbcfaf}.in-battle~.scene-actions{left:50%;transform:translateX(-50%)}.in-battle .player-fighter{left:8%}.cultivator-aura{position:absolute;width:180px;height:80px;border:1px solid #c7d7be6b;border-radius:50%;bottom:5px;box-shadow:0 0 25px #c7d7be50,inset 0 0 20px #c7d7be35;transform:rotateX(55deg);animation:aura-breathe 3s ease-in-out infinite}.aura-1,.aura-2,.aura-3{border-color:var(--realm-color)}.aura-2{box-shadow:0 0 30px #efce7560}.aura-3{box-shadow:0 0 30px #b6cbea60}.floating-damage{position:absolute;top:70px;left:45%;font:bold 24px serif;color:#ffd59a;text-shadow:0 2px 4px #300;z-index:4;animation:damage-rise .28s ease-out both}.attack-right{animation:attack-right .16s ease-in-out}.attack-left{animation:attack-left .16s ease-in-out}.take-hit{animation:take-hit .16s ease-in-out}.realm-reveal{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse,#15251dcc,#07121388);color:#f6dd99;text-align:center;z-index:5;pointer-events:none}.realm-reveal span{font-size:12px;letter-spacing:6px}.realm-reveal strong{font:36px/1.7 'Songti SC',serif;letter-spacing:8px;text-shadow:0 0 20px #cdaa40}.realm-reveal small{color:#dcd4bf;font-size:12px}.realm-reveal-enter-active,.realm-reveal-leave-active{transition:opacity .45s}.realm-reveal-enter-from,.realm-reveal-leave-to{opacity:0}.is-breakthrough .scene-landscape{filter:brightness(1.2) saturate(1.1)}
@keyframes attack-right{50%{transform:translateX(26px) rotate(3deg)}}@keyframes attack-left{50%{transform:translateX(-26px) rotate(-3deg)}}@keyframes take-hit{35%{filter:brightness(1.8) drop-shadow(0 0 10px #e9d8ad);transform:translateX(4px)}70%{transform:translateX(-3px)}}@keyframes damage-rise{from{opacity:.3;transform:translateY(8px)}to{opacity:1;transform:translateY(-14px)}}@keyframes aura-breathe{50%{opacity:.45}}
@media(max-width:600px){.has-battle .scene-caption{top:10px;max-width:42%}.has-battle .scene-caption h2{font-size:17px;letter-spacing:2px}.has-battle .scene-caption p{display:none}.world-scene{height:290px}.scene-landscape{background-size:auto 125%}.scene-caption{top:14px;right:12px;max-width:60%}.scene-caption h2{font-size:23px}.scene-caption p{font-size:10px;max-width:175px}.character-stage{bottom:58px;top:25px}.fighter{width:125px}.player-fighter,.in-battle .player-fighter{left:2%}.monster-fighter{right:2%}.cultivator-sprite{width:126px;height:210px}.monster-sprite{width:140px;height:185px}.in-battle~.scene-actions{left:12px;transform:none}.scene-actions{left:12px;bottom:10px;gap:4px}.scene-actions .el-button{padding:8px;min-height:44px;font-size:12px}.scene-battle-status{right:8px;bottom:59px;font-size:10px;gap:2px}.fighter-label{font-size:11px;max-width:155px;padding:3px 6px;bottom:16px}.fighter-label small{font-size:9px}.cultivator-aura{width:135px}.realm-reveal strong{font-size:27px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
