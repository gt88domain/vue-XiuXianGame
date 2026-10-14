globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const {createPinia,setActivePinia}=await import('pinia');
const {useIdleStore}=await import('../src/idle/store.js');
const {equipScore}=await import('../src/idle/data/equipment.js');
let seed=1729;Math.random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
setActivePinia(createPinia());const s=useIdleStore();let now=Date.now();Date.now=()=>now;s.init();s.player.settings.autoSellQualities=[];
const records=[];let trialAttempts=0;
for(let sec=1;sec<=7200;sec++) {
 now+=1000;s.tick();
 if(s.player.points){s.allocate('attack',Math.ceil(s.player.points/2));s.allocate('health',s.player.points);}
 for(const item of [...s.player.inventory]){const worn=s.player.equipment[item.slot];if(!worn||equipScore(item)>equipScore(worn))s.equipItem(item.id);}
 const equipped=Object.values(s.player.equipment).filter(Boolean).length;
 if((s.player.counters.explorationCount<12||equipped<3)&&s.player.spirit>=30&&s.exploreCd<=0)s.explore('newbie_village');
 else if(s.player.level===9&&s.canBreakthrough&&!s.player.progression.trials.includes(1)) {
  if(!s.dungeon||s.dungeon.finished){if(s.player.spirit>=s.dungeonEntryCost(1)){s.dungeonStart(1);trialAttempts++;}}
  if(s.dungeon&&!s.dungeon.finished&&s.dungeon.phase==='choose'){
   const opts=s.dungeon.options;const heal=opts.find(o=>o.id==='heal'||o.id==='max_health');
   const damage=opts.find(o=>['small_buff','final_damage','lifesteal_battle'].includes(o.id));
   s.dungeonChooseBuff((s.dungeon.runHealth<s.dungeon.maxHealth*.75&&heal?heal:damage||opts[0]).id);
  }
 } else s.cultivate('auto');
 if(s.canBreakthrough&&s.breakthrough()){records.push({seconds:sec,level:s.player.level,explores:s.player.counters.explorationCount,equipped,trials:[...s.player.progression.trials]});if(s.player.level>=10)break;}
}
const report={kind:'Seeded virtual-time simulation using normal store actions, no GM or resource injection',seed:1729,records,trialAttempts,finalLevel:s.player.level,finalDungeon:s.dungeon?{floor:s.dungeon.floor,cleared:s.dungeon.cleared}:null};console.log(JSON.stringify(report,null,2));if(s.player.level<10)process.exitCode=1;
