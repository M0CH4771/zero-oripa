// Original, virtual-coin-only feature games. All scripts are deterministic given rand.
import {secureRandom,picker,bonusEntry} from './common.js';
export const FEATURE_CONFIG={
gods:{id:12,title:'ZERO GODS',badge:'天空の累積倍率',minCoins:1,max:50,scale:.01,cols:6,rows:5,initial:15},
dogs:{id:13,title:'ZERO DOGS',badge:'6リール・最大117,649 WAYS',minCoins:1,max:75,scale:.01,cols:6,rows:7,initial:7},
 train:{id:14,title:'ZERO TRAIN',badge:'貨車ホールド＆リスピン',minCoins:1,max:200,scale:.01,cols:5,rows:3,initial:3},
 dwarf:{id:15,title:'ZERO DWARF',badge:'バトル＆宝箱ラッシュ',minCoins:1,max:200,scale:.0025832,cols:3,rows:3,initial:10}
};
const lottery=(r,a)=>a[Math.floor(r()*a.length)];
const grid=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const VOLATILITY={normal:{label:'通常',bolt:3}};
const lines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,0,2,0,1]];
export const GODS_PAYS={s0:[10,25,50],s1:[2.5,10,25],s2:[2,5,15],s3:[1.5,2,12],s4:[1,1.5,10],s5:[.8,1.2,8],s6:[.5,1,5],s7:[.4,.9,4],s8:[.25,.75,2]};
function gods(r){
 const weights={s0:3,s1:6,s2:8,s3:10,s4:12,s5:16,s6:18,s7:20,s8:22,S:1.4};
 const pick=picker(weights,r),ordinary=picker(Object.fromEntries(Object.entries(weights).filter(([k])=>k!=='S')),r);
 const bomb=picker({2:35,3:27,4:16,5:12,6:8,8:6,10:4,12:3,15:2,20:1.4,25:1,50:.45,100:.1,250:.02,500:.005},r);
 const spawn=(above=null,allowScatter=true)=>{if(GODS_PAYS[above]&&r()<.22)return above;return r()<.0127?'B'+bomb():allowScatter?pick():ordinary();};
 const entry=bonusEntry(6,5,4,weights,r,4);
 let total=15,run=0,roundRaw=3;const spins=[];
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
  spins.push({grid:first,steps,raw,cols:6,rows:5,add,total,note:'累積倍率 ×'+run,mult:run,previousMult,tumbleRaw,scatterRaw,orbs:raw&&tumbleRaw?orbs:[],scatters});
  if(roundRaw>=5000)break;
 }
 if(spins.length)spins[0].entry=entry;
 return spins;
}
export const DOGS_PAYS={s0:[.75,2,3,7.5],s1:[.5,1,1.5,3],s2:[.35,.75,1,2],s3:[.2,.5,.75,1.5],s4:[.15,.4,.5,1.5],s5:[.15,.4,.5,1.5],s9:[.1,.2,.3,1],s10:[.1,.2,.3,1],s11:[.1,.2,.3,1],s12:[.05,.1,.2,.5],s13:[.05,.1,.2,.5]};
const dogWeights={s0:3,s1:4,s2:5,s3:6,s4:8,s5:8,s9:12,s10:12,s11:12,s12:14,s13:14};
const dogHeight=r=>Number(picker({2:5,3:10,4:15,5:25,6:25,7:20},r)());
const dogAwards={sticky:[7,12,15,20],raining:[15,18,25,30]};
const dogWays=h=>h.reduce((a,b)=>a*b,1);
export function dogsEntry(r=secureRandom){const pickHeight=picker({2:30,3:32,4:22,5:10,6:4,7:2},r),heights=Array.from({length:6},()=>Number(pickHeight())),pick=picker(dogWeights,r),g=grid(42,j=>Math.floor(j/6)<heights[j%6]?pick():null),columns=[0,1,2,3,4,5];let scatters=3;while(scatters<6&&r()<.035)scatters++;for(let i=0;i<scatters;i++){const c=columns.splice(Math.floor(r()*columns.length),1)[0];g[Math.floor(r()*heights[c])*6+c]='S';}return {grid:g,heights,ways:dogWays(heights),scatters,choices:{sticky:dogAwards.sticky[scatters-3],raining:dogAwards.raining[scatters-3]}};}
export function dogsWins(g,h){let raw=0,groups=[],hits=new Set();for(const [sym,pay] of Object.entries(DOGS_PAYS)){let weighted=1,ways=1,n=0,cells=[];for(let c=0;c<6;c++){const matches=[];for(let y=0;y<h[c];y++){const j=y*6+c,s=g[j];if(s===sym||s?.startsWith('W'))matches.push(j);}if(!matches.length)break;n++;ways*=matches.length;weighted*=matches.reduce((sum,j)=>sum+(g[j].startsWith('W')?Number(g[j].slice(1)):1),0);cells.push(...matches);}if(n<3)continue;const value=pay[n-3]*weighted;raw+=value;cells.forEach(j=>hits.add(j));groups.push({sym,cells,ways,reels:n,value});}return {raw,groups,hits:[...hits]};}
function dogs(r,{strategy='sticky',dogEntry=null}={}){
 const entry=dogEntry||dogsEntry(r),mode=strategy==='raining'?'raining':'sticky',total=entry.choices[mode],pick=picker(dogWeights,r),sticky=Array(42).fill(0),spins=[];
 const mult=()=>Number(picker({1:65,2:28,3:7},r)());
 for(let i=0;i<total;i++){
  const heights=Array.from({length:6},(_,c)=>Math.max(dogHeight(r),...sticky.flatMap((v,j)=>v&&j%6===c?[Math.floor(j/6)+1]:[])));
  const g=grid(42,j=>Math.floor(j/6)<heights[j%6]?(sticky[j]?'W'+sticky[j]:pick()):null),eligible=g.flatMap((v,j)=>v&&j%6>0&&j%6<5&&!sticky[j]?[j]:[]);
  if(mode==='sticky'){for(const j of eligible)if(r()<.023){sticky[j]=mult();g[j]='W'+sticky[j];}}
  else {const count=Math.min(eligible.length,Number(picker({0:28,1:29,2:22,3:12,4:6,5:2,6:1},r)()));for(let k=0;k<count;k++){const j=eligible.splice(Math.floor(r()*eligible.length),1)[0];g[j]='W'+mult();}}
  const win=dogsWins(g,heights);spins.push({grid:g,...win,cols:6,rows:7,heights,ways:dogWays(heights),sticky:sticky.slice(),total,mode,note:mode==='sticky'?'STICKY WILDS':'RAINING WILDS'});
 }
 spins[0].entry={...entry,mode,initialSpins:total,win:0};return spins;
}
function train(r){
 const rows=3,spins=[],completed=new Set(),specials=['payer','collector','collectorpayer','sniper'];
 let cols=5,resetValue=3,remaining=3,previous=0,tokens=Array(cols*rows).fill(null);
 const sum=()=>tokens.reduce((a,t)=>a+(t?.v||0),0);
 const bound=v=>Math.min(20000,v);
 const kinds=picker({coin:91,golden:1.1,payer:2.6,collector:1.7,sniper:1.6,collectorpayer:.35,necromancer:.25,reset:.4},r);
 const make=()=>{
  const kind=kinds(),golden=kind==='golden';
  return {kind,v:golden?lottery(r,[20,21,22,25,30,40,50,75,100,200]):lottery(r,[1,1,1,2,2,3,4,5,6,8,10]),persistent:specials.includes(kind)&&r()<.035,spent:false};
 };
 const icons={coin:'s0',golden:'s1',collector:'s6',payer:'s7',collectorpayer:'s2',necromancer:'s4',sniper:'s8',reset:'s5'};
 const snapshot=()=>tokens.map(t=>t?{id:icons[t.kind],kind:t.kind,value:t.v,persistent:t.persistent,spent:t.spent}:null);
 const select=(items,n)=>{const pool=items.slice(),out=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return out;};
 const available=grid(tokens.length,i=>i);
 for(const j of select(available,3))tokens[j]=make();
 const initialGrid=snapshot();
 function process(events,initial=false){
  const capture=(name,indices=[],source=null,amount=null)=>events.push({name,cols,rows,grid:snapshot(),hits:indices,source,amount,totalMultiple:sum(),remaining,resetValue});
  const activate=t=>{
   const i=tokens.indexOf(t),targets=tokens.filter(x=>x&&x!==t);
   t.spent=true;
   if(t.kind==='payer'||t.kind==='collectorpayer'){
    if(t.kind==='collectorpayer'){const collected=targets.reduce((a,x)=>a+x.v,0);t.v=bound(t.v+collected);capture('COLLECTOR',[i],i,collected);}
    const amount=t.kind==='collectorpayer'?targets.reduce((a,x)=>a+x.v,0):t.v;
    for(const x of targets){x.v=bound(x.v+amount);capture('PAYER',[tokens.indexOf(x)],i,amount);}
   }else if(t.kind==='collector'){
    const amount=targets.reduce((a,x)=>a+x.v,0);t.v=bound(t.v+amount);capture('COLLECTOR',[i],i,amount);
   }else if(t.kind==='sniper'){
    for(const x of select(targets,3+Math.floor(r()*6))){x.v=bound(x.v*2);capture('SNIPER',[tokens.indexOf(x)],i,2);}
   }else if(t.kind==='reset'){resetValue++;remaining=resetValue;capture('RESET PLUS',[i],i,1);}
   else if(t.kind==='necromancer'){
    const revived=select(targets.filter(x=>specials.includes(x.kind)&&x.spent&&!x.persistent),2+Math.floor(r()*6));
    capture('REVIVE',revived.map(x=>tokens.indexOf(x)),i);
    for(const x of revived)activate(x);
   }
  };
  for(const t of tokens){if(!t||t.kind==='coin'||t.kind==='golden')continue;if(!t.spent||t.persistent)activate(t);}
  for(let c=0;c<cols&&cols<7;c++){
   if(completed.has(c)||!grid(rows,j=>tokens[j*cols+c]).every(Boolean))continue;
   completed.add(c);const old=cols;cols++;tokens=grid(cols*rows,j=>j%cols===old?null:tokens[Math.floor(j/cols)*old+j%cols]);capture('NEW CART');
  }
 }
 const initialEvents=[];process(initialEvents,true);
 while(remaining>0&&spins.length<120){
  remaining--;const hits=[],events=[];
  for(let j=0;j<tokens.length;j++)if(!tokens[j]&&r()<.049){tokens[j]=make();hits.push(j);}
  if(hits.length)remaining=resetValue;
  const landing=snapshot(),landingCols=cols;
  if(hits.length)events.push({name:'NEW COINS',cols,rows,grid:landing,hits,totalMultiple:sum(),remaining,resetValue});
  process(events);
  const full=cols===7&&tokens.every(Boolean);
  if(full){remaining=0;events.push({name:'FULL CART ×2',cols,rows,grid:snapshot(),hits:[],totalMultiple:sum()*2,remaining,resetValue});}
  const now=Math.min(20000,sum()*(full?2:1)),raw=Math.max(0,now-previous);previous=now;
  if(now>=20000)remaining=0;
  spins.push({grid:snapshot(),landing,landingCols,events,raw,cols,rows,hits,total:spins.length+1+remaining,note:'残り '+remaining+' RESPINS',remaining,resetValue,totalMultiple:now,full});
 }
 if(spins.length){spins[0].initialGrid=initialGrid;spins[0].initialEvents=initialEvents;}
 return spins;
}
const DWARF_MONSTERS={Goblin:{hp:3,win:10,icon:'s1'},Troll:{hp:4,win:20,icon:'s3'},Dragon:{hp:5,win:30,icon:'s2'}};
export const DWARF_ROULETTE={Goblin:[1,2,-1,-2],Troll:[1,2,-1,-3],Dragon:[1,2,-1,-4]};
// Exact basis-point weights in roulette display order. Weighted encounter
// distribution keeps expected added spins below ten per battle.
export const DWARF_ENCOUNTER_WEIGHTS={Goblin:6500,Troll:2500,Dragon:1000};
export const DWARF_WEIGHTS={Goblin:[3185,3185,1815,1815],Troll:[3103,3103,1897,1897],Dragon:[2790,2790,2210,2210]};
export const DWARF_CHEST_WEIGHTS={3:4490,5:2500,8:1200,10:1180,15:300,20:100,30:70,50:100,100:50,300:10};
export const DWARF_INITIAL_SCALE=.001;
export const DWARF_UPGRADE_SCALES=[.00005,.0001,.0002,.00025,.000287];
export const DWARF_UPGRADE_WEIGHTS=[1950,2000,2000,2000,2050];
export function dwarfUpgradeTable(rate,monster){const factor={Goblin:1,Troll:2,Dragon:3}[monster];const raw=DWARF_UPGRADE_SCALES.map(s=>rate*s*factor);if(rate<1000)return {values:raw,weights:[...DWARF_UPGRADE_WEIGHTS]};const masses=new Map();for(const [i,value] of raw.entries()){const w=DWARF_UPGRADE_WEIGHTS[i],lo=Math.floor(value+1e-10),f=Math.max(0,value-lo);for(const [v,p] of [[lo,w*(1-f)],[lo+1,w*f]])if(p>1e-9)masses.set(v,(masses.get(v)||0)+p);}const values=[...masses.keys()].sort((a,b)=>a-b);return {values,weights:values.map(v=>masses.get(v))};}
function dwarfUpgrade(rate,monster,rand){const {values,weights}=dwarfUpgradeTable(rate,monster);let ticket=rand()*weights.reduce((a,b)=>a+b,0),selected=values.length-1;for(let i=0;i<weights.length;i++){ticket-=weights[i];if(ticket<0){selected=i;break;}}return {selected,values,weights,amount:values[selected]};}
function dwarf(r){
 const spins=[];
 const pick=picker({s0:4,s1:7,s2:5,s3:8,s4:16,s5:17,s6:18,s7:20,s8:1,s9:.9},r);
 const pickMonster=picker(DWARF_ENCOUNTER_WEIGHTS,r);
 const pickChest=picker(DWARF_CHEST_WEIGHTS,r);
 const pays={s0:20,s2:7,s3:5,s1:3,s4:.5,s5:.4,s6:.3,s7:.2};
 let remaining=10,freePlayed=0;
 function battle(){
  const monster=freePlayed===10?'Goblin':pickMonster(),m=DWARF_MONSTERS[monster];
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
  spins.push({grid:battleGrid,raw:0,cols:3,rows:3,note:won?'勝利':'追加なし',battle:true,monster,monsterHP:m.hp,reward:m.win,choices,weights,actions,won,awarded,freePlayed,remaining,total:freePlayed+remaining});
 }
 while(remaining>0){remaining--;freePlayed++;const g=grid(9,pick);let raw=0,hits=[],chests=[];
  for(const line of [[0,1,2],[3,4,5],[6,7,8],[0,4,8],[2,4,6]])if(pays[g[line[0]]]&&line.every(j=>g[j]===g[line[0]])){raw+=pays[g[line[0]]];hits.push(...line);}
  for(let j=0;j<g.length;j++)if(g[j]==='s8'||g[j]==='s9'){const value=Number(pickChest());raw+=value;chests.push({pos:j,value});hits.push(j);}
  spins.push({grid:g,raw,cols:3,rows:3,hits:[...new Set(hits)],chests,freePlayed,remaining,note:'次のバトルまで '+(10-(freePlayed-1)%10)+' 回',total:freePlayed+remaining});
  if(freePlayed%10===0)battle();
 }
 return spins;
}
const generators={gods,dogs,train,dwarf};
export function featureRaw(game,rand=secureRandom,opts={}){return generators[game](rand,opts);}
export function featurePlay(game,{rate,rand=secureRandom,withScript=true,strategy='battle',dogEntry=null,encounter=null}){
 const c=FEATURE_CONFIG[game],initialUnit=game==='dwarf'?rate*DWARF_INITIAL_SCALE:rate*c.scale,spins=featureRaw(game,rand,{strategy,dogEntry,encounter}),cap=Math.floor(c.max*rate),floor=1;let unit=initialUnit;
 let running=game==='gods'?3*c.scale*rate:0,paid=Math.floor(running);
 const entryWin=paid;
 for(const s of spins){if(game==='dwarf'){s.unit=unit;if(s.battle&&s.won){s.upgrade=dwarfUpgrade(rate,s.monster,rand);unit+=s.upgrade.amount;s.nextUnit=unit;}}const before=running;running+=game==='dwarf'?s.raw*s.unit:s.raw*c.scale*rate;let next=Math.min(cap,Math.floor(running));s.win=next-paid;paid=next;
  if(game==='dwarf'&&s.chests?.length){let subtotal=before+(s.raw-s.chests.reduce((n,chest)=>n+chest.value,0))*unit,credited=Math.min(cap,Math.floor(subtotal));for(const [i,chest] of s.chests.entries()){subtotal+=chest.value*unit;const end=i===s.chests.length-1?next:Math.min(cap,Math.floor(subtotal));chest.win=Math.max(0,end-credited);credited=end;}}
  if(s.steps)for(const step of s.steps){step.win=Math.floor(step.value*c.scale*rate);if(game==='gods'){step.groups=step.groups.map(g=>({...g,pay:g.base*c.scale*rate,base:g.base*c.scale*rate,mult:1}));step.credited=Math.min(s.win,Math.floor(step.tumbleTotal*c.scale*rate));}}
 }
 const score=Math.max(floor,paid);
 let entry=null;
 if(game==='dogs')entry=spins[0].entry;
 if(game==='gods'){
  const cols=c.cols,rows=c.rows,scatters=game==='gods'?4:3;
  const tableau=grid(cols*rows,i=>'s'+(i%6));
  for(let j=0;j<scatters;j++)tableau[Math.floor(rows/2)*cols+(game==='dogs'?j*2:j)]='S';
  entry={grid:spins[0].entry.grid,scatters,initialSpins:c.initial,win:entryWin};
 }
 if(game==='train')entry={grid:spins[0].initialGrid,events:spins[0].initialEvents,initialSpins:3,win:0};
 return {score,played:spins.length,freePlayed:game==='dwarf'?spins.filter(s=>!s.battle).length:undefined,spins:withScript?spins:[],guarantee:score-paid,capped:game==='gods'?running>=cap:running>cap,unit:initialUnit,finalUnit:unit,entry};
}
export const featureModule=game=>({VOLATILITY,play:opts=>featurePlay(game,opts)});
