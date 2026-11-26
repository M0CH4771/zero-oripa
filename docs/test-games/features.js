// Original, virtual-coin-only feature games. All scripts are deterministic given rand.
import {secureRandom,picker,bonusEntry} from './common.js';
export const FEATURE_CONFIG={
gods:{id:12,title:'ZERO GODS',badge:'天空の累積倍率',minCoins:1,max:50,scale:.00909,cols:6,rows:5,initial:15},
dogs:{id:13,title:'ZERO DOGS',badge:'6リール・最大117,649 WAYS',minCoins:1,max:75,scale:.00861,rainingScale:.004885,cols:6,rows:7,initial:7},
 train:{id:14,title:'ZERO TRAIN',badge:'6列・鉱山トロッコ＆宝箱',minCoins:1,max:200,scale:.015,cols:6,rows:6,initial:3},
 dwarf:{id:15,title:'ZERO DWARF',badge:'バトル＆宝箱ラッシュ',minCoins:1,max:200,scale:.0025832,cols:3,rows:3,initial:10}
};
const lottery=(r,a)=>a[Math.floor(r()*a.length)];
const grid=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const VOLATILITY={normal:{label:'通常',bolt:3}};
const lines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,0,2,0,1]];
export const GODS_PAYS={s0:[10,25,50],s1:[2.5,10,25],s2:[2,5,15],s3:[1.5,2,12],s4:[1,1.5,10],s5:[.8,1.2,8],s6:[.5,1,5],s7:[.4,.9,4],s8:[.25,.75,2]};
function* godsStream(r){
 const weights={s0:3,s1:6,s2:8,s3:10,s4:12,s5:16,s6:18,s7:20,s8:22,S:1.4};
 const pick=picker(weights,r),ordinary=picker(Object.fromEntries(Object.entries(weights).filter(([k])=>k!=='S')),r);
 const bomb=picker({2:35,3:27,4:16,5:12,6:8,8:6,10:4,12:3,15:2,20:1.4,25:1,50:.65,100:.35,250:.08,500:.025},r);
 const spawn=(above=null,allowScatter=true)=>{if(GODS_PAYS[above]&&r()<.22)return above;return r()<.0127?'B'+bomb():allowScatter?pick():ordinary();};
 const entry=bonusEntry(6,5,4,weights,r,4);
 let total=15,run=0,roundRaw=3;yield {...entry,initialSpins:15};
 for(let i=0;i<total;i++){
  let g=[],scatterColumns=Array(6).fill(false);
  for(let j=0;j<30;j++){const c=j%6,s=spawn(g[j-6],!scatterColumns[c]);g.push(s);if(s==='S')scatterColumns[c]=true;}
  const first=g.slice(),steps=[];let raw=0;
  for(let n=0;n<35;n++){
   let counts={};for(const s of g)if(GODS_PAYS[s])counts[s]=(counts[s]||0)+1;
   let wins=Object.keys(counts).filter(s=>counts[s]>=8);if(!wins.length)break;
   const hits=g.map((s,i)=>wins.includes(s)?i:-1).filter(i=>i>=0);
   const groups=wins.map(sym=>({sym,cells:g.flatMap((s,j)=>s===sym?[j]:[]),base:GODS_PAYS[sym][counts[sym]>=12?2:counts[sym]>=10?1:0]}));
   const value=groups.reduce((a,x)=>a+x.base,0);
   raw+=value;const next=g.slice();for(let c=0;c<6;c++){const keep=[];for(let j=0;j<5;j++)if(!hits.includes(j*6+c))keep.push(g[j*6+c]);let fresh=[],hasScatter=keep.includes('S');while(fresh.length<5-keep.length){const s=spawn(fresh.at(-1),!hasScatter);fresh.push(s);if(s==='S')hasScatter=true;}[...fresh,...keep].forEach((s,j)=>next[j*6+c]=s);}
   steps.push({hits,grid:next.slice(),value,groups,tumbleTotal:raw});g=next;
   if(roundRaw+raw>=5000)break;
  }
  const orbs=g.flatMap((s,j)=>s.startsWith('B')?[{pos:j,mult:Number(s.slice(1))}]:[]);
  const b=orbs.reduce((a,s)=>a+s.mult,0),previousMult=run,tumbleRaw=raw;
  if(raw&&b){run+=b;raw*=run;}
  const scatters=g.filter(s=>s==='S').length,scatterRaw=scatters>=6?100:scatters===5?5:scatters===4?3:0;
  raw+=scatterRaw;roundRaw+=raw;
  const add=roundRaw<5000&&scatters>=3?Math.min(5,120-total):0;total+=add;
  yield {grid:first,steps,raw,cols:6,rows:5,add,total,note:'累積倍率 ×'+run,mult:run,previousMult,tumbleRaw,scatterRaw,orbs:raw&&tumbleRaw?orbs:[],scatters};
  if(roundRaw>=5000)break;
 }

}
const DOGS_RAW_PAYS={s0:[1.1,2,3,5.5],s1:[.75,1,1.5,2.3],s2:[.5,.75,1,1.6],s3:[.35,.5,.75,1.15],s4:[.26,.4,.5,1.1],s5:[.26,.4,.5,1.1],s9:[.19,.24,.3,.75],s10:[.19,.24,.3,.75],s11:[.19,.24,.3,.75],s12:[.12,.15,.2,.4],s13:[.12,.15,.2,.4]};
export const DOGS_PAYS=Object.fromEntries(Object.entries(DOGS_RAW_PAYS).map(([k,v])=>[k,[v[0]*1.25,Math.max(v[0]*1.25,v[1]*1.1),v[2],v[3]]]));
const dogWeights={s0:3,s1:4,s2:5,s3:6,s4:8,s5:8,s9:12,s10:12,s11:12,s12:14,s13:14};
const dogHeight=r=>Number(picker({3:1,4:9,5:35,6:35,7:20},r)());
const dogAwards={sticky:[7,12,15,20],raining:[15,18,25,30]};
const dogWays=h=>h.reduce((a,b)=>a*b,1);
export function dogsEntry(r=secureRandom){const pickHeight=picker({2:30,3:32,4:22,5:10,6:4,7:2},r),heights=Array.from({length:6},()=>Number(pickHeight())),pick=picker(dogWeights,r),g=grid(42,j=>Math.floor(j/6)<heights[j%6]?pick():null),columns=[0,1,2,3,4,5];let scatters=3;while(scatters<6&&r()<.035)scatters++;for(let i=0;i<scatters;i++){const c=columns.splice(Math.floor(r()*columns.length),1)[0];g[Math.floor(r()*heights[c])*6+c]='S';}return {grid:g,heights,ways:dogWays(heights),scatters,choices:{sticky:dogAwards.sticky[scatters-3],raining:dogAwards.raining[scatters-3]}};}
export function dogsWins(g,h){let raw=0,groups=[],hits=new Set();for(const [sym,pay] of Object.entries(DOGS_PAYS)){let weighted=1,ways=1,n=0,cells=[];for(let c=0;c<6;c++){const matches=[];for(let y=0;y<h[c];y++){const j=y*6+c,s=g[j];if(s===sym||s?.startsWith('W'))matches.push(j);}if(!matches.length)break;n++;ways*=matches.length;weighted*=matches.reduce((sum,j)=>sum+(g[j].startsWith('W')?Number(g[j].slice(1)):1),0);cells.push(...matches);}if(n<3)continue;const value=pay[n-3]*weighted;raw+=value;cells.forEach(j=>hits.add(j));groups.push({sym,cells,ways,reels:n,value});}return {raw,groups,hits:[...hits]};}
function* dogsStream(r,{strategy='sticky',dogEntry=null}={}){
 const entry=dogEntry||dogsEntry(r),mode=strategy==='raining'?'raining':'sticky',total=entry.choices[mode],pick=picker(dogWeights,r),sticky=Array(42).fill(0),spins=[];
 yield {...entry,mode,initialSpins:total,win:0};
 const mult=()=>Number(picker(mode==='raining'?{1:70,2:20,3:10}:{1:90,2:9,3:1},r)());
 for(let i=0;i<total;i++){
  const heights=Array.from({length:6},(_,c)=>Math.max(dogHeight(r),...sticky.flatMap((v,j)=>v&&j%6===c?[Math.floor(j/6)+1]:[])));
  const g=grid(42,j=>Math.floor(j/6)<heights[j%6]?(sticky[j]?'W'+sticky[j]:pick()):null),eligible=g.flatMap((v,j)=>v&&j%6>0&&j%6<5&&!sticky[j]?[j]:[]);
  if(mode==='sticky'){for(const j of eligible)if(r()<.029){sticky[j]=mult();g[j]='W'+sticky[j];}}
  else {const count=Math.min(eligible.length,Number(picker({0:36,1:50,2:8,3:2,4:1,5:1,6:2},r)()));for(let k=0;k<count;k++){const j=eligible.splice(Math.floor(r()*eligible.length),1)[0];g[j]='W'+(count===6?Number(picker({1:20,2:30,3:50},r)()):mult());}}
  const win=dogsWins(g,heights);yield {grid:g,...win,cols:6,rows:7,heights,ways:dogWays(heights),sticky:sticky.slice(),total,mode,note:mode==='sticky'?'STICKY WILDS':'RAINING WILDS'};
 }

}
// Six fixed columns, progressively excavated from top to bottom.
function train(r,{strategy}={}){
 const cols=6,rows=6,spins=[],depth=Array(cols).fill(strategy==='train4'?4:strategy==='train3'?3:2),opened=Array(cols).fill(false),coins=Array(cols*rows).fill(null);
 const pick=picker({1:35,2:26,3:18,10:10,15:5,25:3.5,50:2,100:.5},r),enhance=picker({coin:64,mult:16,dynamite:13,bag:4,chest:2.5,dwarf:.5},r),mult=picker({2:55,3:25,4:10,5:6,10:3,25:1},r);
 let remaining=3,collected=0,previous=0,dwarf=-1;
 const snap=()=>coins.map((v,j)=>v?{id:j===dwarf?'s7':'s0',kind:j===dwarf?'dwarf':'coin',value:v}:Math.floor(j/cols)>=depth[j%cols]?{id:'s2',kind:'rock',value:0}:null);
 const total=()=>Math.min(20000,collected+coins.reduce((a,b)=>a+(b||0),0));
 const initialGrid=snap(), initialDepth=depth.slice();
 while(remaining>0&&spins.length<100){
  remaining--;const events=[],hits=[],enhancers=Array.from({length:cols},()=>{const kind=enhance();return {kind,value:kind==='mult'?+mult():kind==='coin'?+pick():0};});
  const capture=(name,indices=[],source=null,amount=null)=>events.push({name,cols,rows,grid:snap(),hits:indices,source,amount,totalMultiple:total(),remaining,resetValue:3,depth:depth.slice(),opened:opened.slice(),enhancers:enhancers.map(x=>({...x})),collected,dwarf});
  for(let j=0;j<coins.length;j++)if(Math.floor(j/cols)<depth[j%cols]&&!coins[j]&&r()<.075){coins[j]=1;hits.push(j);}
  if(hits.length)remaining=3;
  const landing=snap();if(hits.length)capture('NEW COINS',hits);
  for(const j of hits){if(!coins[j])continue;const c=j%cols,e=enhancers[c],indices=coins.flatMap((v,i)=>i%cols===c&&v&&i!==dwarf?[i]:[]);let amount=0;
   if(e.kind==='coin'){coins[j]=e.value;amount=e.value;}
   else if(e.kind==='mult'){coins[j]*=e.value;amount=e.value;}
   else if(e.kind==='dynamite'){if(depth[c]<rows)depth[c]++;else opened[c]=true;}
   else if(e.kind==='bag'||e.kind==='chest'){amount=indices.reduce((s,i)=>s+coins[i],0);for(const i of indices)coins[i]=null;if(e.kind==='bag')coins[j]=amount;else collected+=amount;}
   else if(e.kind==='dwarf'){if(dwarf<0)dwarf=j;}
   capture(e.kind.toUpperCase(),[j],j,amount||null);
  }
  for(let c=0;c<cols;c++)if(opened[c]){const v=coins.reduce((s,n,i)=>s+(i%cols===c?(n||0):0),0);collected+=v;capture('COLLECT CHEST',[],null,v);}
  if(dwarf>=0){const v=coins.reduce((s,n)=>s+(n||0),0);collected+=v;capture('DWARF COLLECT',[dwarf],dwarf,v);}
  if(coins.every(Boolean)||total()>=20000||spins.length===99)remaining=0;
  if(!remaining){for(let c=0;c<cols;c++)if(opened[c]){const v=coins.reduce((s,n,i)=>s+(i%cols===c?(n||0):0),0)*3;collected+=v;capture('FINAL CHEST',[],null,v);}}
  const now=total();spins.push({grid:snap(),landing,landingCols:cols,events,raw:now-previous,cols,rows,hits,total:spins.length+1+remaining,note:'残り '+remaining+' RESPINS',remaining,resetValue:3,totalMultiple:now,depth:depth.slice(),opened:opened.slice(),enhancers,collected,dwarf});previous=now;
 }
 spins[0].initialGrid=initialGrid;spins[0].initialDepth=initialDepth;spins[0].initialEvents=[];return spins;
}
const DWARF_MONSTERS={Goblin:{hp:3,win:10,icon:'s1'},Troll:{hp:4,win:20,icon:'s3'},Dragon:{hp:5,win:30,icon:'s2'}};
export const DWARF_ROULETTE={Goblin:[1,2,-1,-2],Troll:[1,2,-1,-3],Dragon:[1,2,-1,-4]};
// Exact basis-point weights in roulette display order. Weighted encounter
// distribution keeps expected added spins below ten per battle.
export const DWARF_ENCOUNTER_WEIGHTS={Goblin:6500,Troll:2500,Dragon:1000};
export const DWARF_WEIGHTS={Goblin:[3185,3185,1815,1815],Troll:[3103,3103,1897,1897],Dragon:[2790,2790,2210,2210]};
export const DWARF_CHEST_WEIGHTS={1:2600,2:2600,3:1500,5:1800,8:800,10:400,15:150,20:100,50:40,100:10};
export const DWARF_INITIAL_SCALE=.01;
export const DWARF_UPGRADE_SCALES={Goblin:[.001,.002,.005,.007,.01],Troll:[.005,.006,.008,.011,.02],Dragon:[.01,.015,.02,.025,.03]};
export const DWARF_UPGRADE_WEIGHTS=[2000,2000,2000,2000,2000];
export function dwarfUpgradeTable(rate,monster){const raw=DWARF_UPGRADE_SCALES[monster].map(s=>Number((rate*s).toFixed(8)));return {values:raw,weights:[...DWARF_UPGRADE_WEIGHTS]};}
function dwarfUpgrade(rate,monster,rand){const {values,weights}=dwarfUpgradeTable(rate,monster);let ticket=rand()*weights.reduce((a,b)=>a+b,0),selected=values.length-1;for(let i=0;i<weights.length;i++){ticket-=weights[i];if(ticket<0){selected=i;break;}}return {selected,values,weights,amount:values[selected]};}
function* dwarfStream(r){
 const spins=[];
 const pick=picker({s0:4,s1:7,s2:5,s3:8,s4:16,s5:17,s6:18,s7:20,s8:2,s9:2},r);
 const pickChest=picker(DWARF_CHEST_WEIGHTS,r);
 const pays={s0:20,s2:7,s3:5,s1:3,s4:.5,s5:.4,s6:.3,s7:.2};
 let remaining=10,freePlayed=0;
 yield null;
 const stages={10:'Goblin',20:'Troll',40:'Dragon'};
 function battle(monster){
  const m=DWARF_MONSTERS[monster];
  const choices=DWARF_ROULETTE[monster],weights=DWARF_WEIGHTS[monster],actions=[];
  let hp=4,enemy=m.hp;
  while(hp>0&&enemy>0){
   let ticket=r()*10000,selected=choices.length-1;
   for(let i=0;i<weights.length;i++){ticket-=weights[i];if(ticket<0){selected=i;break;}}
   const roll=choices[selected];
   if(roll>0)enemy=Math.max(0,enemy-roll);else hp=Math.max(0,hp+roll);
   actions.push({type:roll>0?'ATTACK':'DAMAGE',selected,roll,heroHP:hp,enemyHP:enemy});
  }
  const won=enemy===0;
  const awarded=won?m.win:0;remaining+=awarded;
  const battleGrid=['s0','s7',m.icon,'s4','s7','s5','s6','s7','s8'];
  return {grid:battleGrid,raw:0,cols:3,rows:3,note:won?'勝利':'追加なし',battle:true,monster,monsterHP:m.hp,reward:m.win,choices,weights,actions,won,awarded,freePlayed,remaining,total:freePlayed+remaining};
 }
 while(remaining>0){remaining--;freePlayed++;const g=grid(9,pick);let raw=0,hits=[],chests=[];
  for(const line of [[0,1,2],[3,4,5],[6,7,8],[0,4,8],[2,4,6]])if(pays[g[line[0]]]&&line.every(j=>g[j]===g[line[0]])){raw+=pays[g[line[0]]];hits.push(...line);}
  for(let j=0;j<g.length;j++)if(g[j]==='s8'||g[j]==='s9'){const value=Number(pickChest());raw+=value;chests.push({pos:j,value});hits.push(j);}
  const target=freePlayed<=10?10:freePlayed<=20?20:freePlayed<=40?40:null;
  yield {grid:g,raw,cols:3,rows:3,hits:[...new Set(hits)],chests,freePlayed,remaining,note:target===null?'最終宝箱ラッシュ':({10:'ゴブリン',20:'トロール',40:'ドラゴン'}[target])+' まで '+Math.max(0,target-freePlayed)+' 回',total:freePlayed+remaining};
  if(stages[freePlayed])yield battle(stages[freePlayed]);
 }
}
const generators={gods:godsStream,dogs:dogsStream,dwarf:dwarfStream};

export function featureRaw(game,rand=secureRandom,opts={}){if(game==='train')return train(rand,opts);const it=generators[game](rand,opts);const entry=it.next().value;const spins=[...it];if(spins.length&&entry)spins[0].entry=entry;return spins;}
export function* featureStream(game,{rate,rand=secureRandom,strategy='battle',dogEntry=null,encounter=null}){
 const c=FEATURE_CONFIG[game],initialUnit=game==='dwarf'?rate*DWARF_INITIAL_SCALE:rate*(game==='dogs'?(strategy==='raining'?c.rainingScale:c.scale):c.scale);
 const it=generators[game](rand,{strategy,dogEntry,encounter});let entry=it.next().value;
 const cap=Math.floor(c.max*rate);let running=game==='gods'?3*initialUnit:0,paid=Math.floor(running),unit=initialUnit,played=0,freePlayed=0;
 if(entry)entry={...entry,win:paid};yield {entry,unit:initialUnit,cap};
 for(const s of it){played++;if(!s.battle)freePlayed++;
  if(game==='dwarf'){s.unit=unit;if(s.battle&&s.won){s.upgrade=dwarfUpgrade(rate,s.monster,rand);unit+=s.upgrade.amount;s.nextUnit=unit;}}
  const before=running;running+=s.raw*(game==='dwarf'?s.unit:initialUnit);const next=Math.min(cap,Math.floor(running));s.win=next-paid;paid=next;
  if(game==='dwarf'&&s.chests?.length){let subtotal=before+(s.raw-s.chests.reduce((n,chest)=>n+chest.value,0))*unit,credited=Math.min(cap,Math.floor(subtotal));for(const [i,chest] of s.chests.entries()){subtotal+=chest.value*unit;const end=i===s.chests.length-1?next:Math.min(cap,Math.floor(subtotal));chest.win=Math.max(0,end-credited);credited=end;}}
  if(s.steps)for(const step of s.steps){step.win=Math.floor(step.value*initialUnit);step.groups=step.groups.map(g=>({...g,pay:g.base*initialUnit,base:g.base*initialUnit,mult:1}));step.credited=Math.min(s.win,Math.floor(step.tumbleTotal*initialUnit));}
  yield s;
 }
 const score=Math.max(1,paid);return {score,played,freePlayed:game==='dwarf'?freePlayed:undefined,guarantee:score-paid,capped:running>=cap,unit:initialUnit,finalUnit:unit,entry};
}
export function featurePlay(game,opts){const it=featureStream(game,opts),start=it.next().value,spins=[];let n;while(!(n=it.next()).done)if(opts.withScript!==false)spins.push(n.value);return {...start,...n.value,spins}}
export const featureModule=game=>({VOLATILITY,play:opts=>featurePlay(game,opts),stream:opts=>featureStream(game,opts)});
