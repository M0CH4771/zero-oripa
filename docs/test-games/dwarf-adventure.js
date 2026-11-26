import {secureRandom} from './common.js';
export const DWARF_CHEST_WEIGHTS={1:400,3:300,5:174,10:100,30:20,50:5,100:1};
export const DWARF_CHEST_CHANCE=.0531;
export const DWARF_BATTLE_CHANCE=1/12;
export const DWARF_ENCOUNTER_WEIGHTS=[50,30,20];
export const DWARF_MAX_SPINS=100;
export const DWARF_INITIAL_SCALE=.01;
export const DWARF_REWARD_TIERS=[[70,25,4,1,0],[45,35,15,4,1],[20,30,30,15,5]];
// Order matches the 4x4 illustrated inventory atlas.
export const DWARF_ITEMS=[
 ['shield','守護の盾','次の被ダメージを1回無効化',1],
 ['smallClock','小さな砂時計','残りスピン＋2G',1],
 ['glove','戦士の手袋','次の攻撃1回のダメージ＋1',1],
 ['whetstone','砥石','次の敵の初期HP−1（最低1）',1],
 ['shard','魔力のかけら','基準C×1.1',1],
 ['sword','勇者の剣','次のバトル中の攻撃ダメージ＋1',2],
 ['gold','黄金の結晶','基準C＋BETの0.5%',2],
 ['clock','時の砂時計','残りスピン＋5G',2],
 ['magic','魔法の結晶','基準C×1.5',3],
 ['pickaxe','黄金のつるはし','次のバトルまで宝箱出現率×1.5',3],
 ['sage','賢者の書','次回報酬★3以上確定',3],
 ['crown','王家の冠','基準C×2',4],
 ['evolution','進化の書','宝箱の最低倍率を1段階強化',4],
 ['blast','爆発の石','次のスピンの全9マスが宝箱',4],
 ['relic','ドラゴンの秘宝','基準C×3',5],
 ['revive','復活の羽','次のバトル敗北時に逆転勝利',5]
].map(([key,name,description,rarity],icon)=>({key,name,description,rarity,icon}));
const byKey=Object.fromEntries(DWARF_ITEMS.map(x=>[x.key,x]));
const tiers=Array.from({length:5},(_,i)=>DWARF_ITEMS.filter(x=>x.rarity===i+1));
const monsters=['Goblin','Troll','Dragon'],monsterIcons=['s1','s3','s2'];
const choicesByMonster=[[1,2,-1,-2],[1,2,-1,-3],[1,2,-1,-4]];
export const DWARF_ATTACK_WEIGHTS=[[2802,2802,2198,2198],[2791,2791,2209,2209],[2790,2790,2210,2210]];
export const DWARF_BATTLE_REWARDS=[5,10,20];
const chestValues=Object.keys(DWARF_CHEST_WEIGHTS).map(Number),chestWeights=Object.values(DWARF_CHEST_WEIGHTS);
const symbolWeights=[4,7,5,8,16,17,18,20],linePay=[20,3,7,5,.5,.4,.3,.2],lines=[[0,1,2],[3,4,5],[6,7,8],[0,4,8],[2,4,6]];
function pick(weights,rand){let t=rand()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)if((t-=weights[i])<0)return i;return weights.length-1;}
export function* dwarfAdventureStream({rate,rand=secureRandom,chestChance=DWARF_CHEST_CHANCE}){
 const cap=rate*50,initialUnit=rate*DWARF_INITIAL_SCALE;
 let unit=initialUnit,remaining=10,freePlayed=0,played=0,running=0,paid=0;
 let shield=0,glove=0,whetstone=0,sword=0,pickaxe=false,sage=false,evolution=0,blast=0,revive=0;
 const inventory=()=>({minimum:chestValues[evolution],items:Object.entries({shield,glove,whetstone,sword,pickaxe:+pickaxe,sage:+sage,blast,revive,evolution}).filter(([,v])=>v>0).map(([key,count])=>({...byKey[key],count}))});
 yield {entry:null,unit:initialUnit,cap,inventory:inventory()};
 while(remaining>0&&freePlayed<DWARF_MAX_SPINS&&paid<cap){
  remaining--;freePlayed++;played++;
  const forced=remaining===0&&freePlayed<DWARF_MAX_SPINS;
  const all=blast>0&&!forced;if(all)blast--;
  const chance=all?1:Math.min(1,chestChance*(pickaxe?1.5:1));
  const early=!all&&freePlayed<DWARF_MAX_SPINS&&rand()<DWARF_BATTLE_CHANCE;
  const battleLine=!all&&(early||forced);
  const g=[],chests=[],hits=[];let raw=0;
  for(let j=0;j<9;j++){
   if(battleLine&&j>=3&&j<=5){g.push('S');hits.push(j);continue;}
   if(rand()<chance){const value=chestValues[evolution+pick(chestWeights.slice(evolution),rand)];g.push('s8');chests.push({pos:j,value});hits.push(j);raw+=value;}
   else g.push('s'+pick(symbolWeights,rand));
  }
  let lineRaw=0;for(const [a,b,c] of lines){const n=Number(g[a].slice(1));if(g[a].startsWith('s')&&n<8&&g[a]===g[b]&&g[a]===g[c]){lineRaw+=linePay[n];hits.push(a,b,c);}}
  raw+=lineRaw;
  const before=running;running+=raw*unit;
  const next=Math.min(cap,Math.floor(running)),win=next-paid;paid=next;
  let subtotal=before+lineRaw*unit,credited=Math.min(cap,Math.floor(subtotal));
  for(const [i,chest] of chests.entries()){subtotal+=chest.value*unit;const end=i===chests.length-1?next:Math.min(cap,Math.floor(subtotal));chest.win=Math.max(0,end-credited);credited=end;}
  const finished=paid>=cap||freePlayed>=DWARF_MAX_SPINS;
  const battleTriggered=!finished&&(early||forced);
  if(finished)remaining=0;
  yield {grid:g,raw,win,cols:3,rows:3,hits:[...new Set(hits)],chests,unit,freePlayed,remaining,total:Math.min(DWARF_MAX_SPINS,freePlayed+remaining),battleTriggered,forced,activated:all?['blast']:[],inventory:inventory(),note:battleTriggered?'BATTLE TRIGGER':'宝箱ラッシュ'};
  if(!battleTriggered)continue;
  played++;
  const m=pick(DWARF_ENCOUNTER_WEIGHTS,rand),monster=monsters[m],choices=choicesByMonster[m],weights=DWARF_ATTACK_WEIGHTS[m],monsterHP=Math.max(1,m+3-whetstone),battleItems=[];
  if(whetstone)battleItems.push('whetstone');if(sword)battleItems.push('sword');if(pickaxe)battleItems.push('pickaxe');
  let hp=4,enemy=monsterHP,boost=sword;
  whetstone=sword=0;pickaxe=false;
  const attacks=[];
  while(hp>0&&enemy>0){
   const selected=pick(weights,rand),roll=choices[selected],activated=[];
   if(roll>0){enemy=Math.max(0,enemy-roll-boost-(glove?1:0));if(glove){glove--;activated.push('glove');}}
   else if(shield){shield--;activated.push('shield');}else hp=Math.max(0,hp+roll);
   attacks.push({selected,roll,heroHP:hp,enemyHP:enemy,activated});
  }
  let won=enemy===0,revived=false;
  if(!won&&revive){revive--;won=true;revived=true;}
  const beforeUnit=unit;let awarded=0,reward=null,extra=0;
  if(won){
   awarded=DWARF_BATTLE_REWARDS[m];remaining+=awarded;
   const tier=pick(DWARF_REWARD_TIERS[m].map((w,j)=>sage&&j<2?0:w),rand);sage=false;
   const pool=tiers[tier].filter(x=>x.key!=='evolution'||evolution<3);
   const selected=Math.floor(rand()*pool.length);reward={...pool[selected],pool:pool.map(x=>({...x})),selected};
   switch(reward.key){
    case'shield':shield++;break;
    case'smallClock':extra=2;break;
    case'glove':glove++;break;
    case'whetstone':whetstone++;break;
    case'shard':unit*=1.1;break;
    case'sword':sword++;break;
    case'gold':unit+=rate*.005;break;
    case'clock':extra=5;break;
    case'magic':unit*=1.5;break;
    case'pickaxe':pickaxe=true;break;
    case'sage':sage=true;break;
    case'crown':unit*=2;break;
    case'evolution':evolution++;break;
    case'blast':blast++;break;
    case'relic':unit*=3;break;
    case'revive':revive++;break;
   }
   remaining+=extra;
  }
  remaining=Math.min(remaining,DWARF_MAX_SPINS-freePlayed);
  yield {grid:['s0','s7',monsterIcons[m],'s4','s7','s5','s6','s7','s8'],raw:0,win:0,cols:3,rows:3,battle:true,monster,monsterHP,heroMax:4,choices,weights,actions:attacks,won,revived,awarded,baseReward:DWARF_BATTLE_REWARDS[m],extra,reward,unit:beforeUnit,nextUnit:unit,freePlayed,remaining,total:freePlayed+remaining,activated:battleItems,inventory:inventory(),note:won?'勝利':remaining?'敗北・冒険継続':'冒険終了'};
 }
 const score=Math.max(1,paid);return {score,played,freePlayed,guarantee:score-paid,capped:paid>=cap,unit:initialUnit,finalUnit:unit,entry:null,inventory:inventory()};
}
