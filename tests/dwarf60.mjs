import assert from 'node:assert/strict';
import {DWARF_WEIGHTS,DWARF_CHEST_WEIGHTS,DWARF_ROULETTE,DWARF_INITIAL_SCALE,DWARF_UPGRADE_SCALES,DWARF_UPGRADE_WEIGHTS,dwarfUpgradeTable} from '../docs/test-games/features.js';
import {playGame} from '../docs/test-games/index.js';
const names=['Goblin','Troll','Dragon'],hp=[3,4,5],rewards=[10,20,30],stages=[10,20,40],winProbs={};
for(const [i,name] of names.entries()){
 const weights=DWARF_WEIGHTS[name],choices=DWARF_ROULETTE[name],memo=new Map();assert.equal(weights.reduce((a,b)=>a+b,0),10000);
 function p(hero,enemy){if(enemy<=0)return 1;if(hero<=0)return 0;const k=hero+','+enemy;if(!memo.has(k))memo.set(k,choices.reduce((v,d,j)=>v+weights[j]/10000*(d>0?p(hero,enemy-d):p(hero+d,enemy)),0));return memo.get(k);}
 winProbs[name]=p(4,hp[i]);assert.ok(Math.abs(winProbs[name]-[.8,.6,.3][i])<.0002);
}
const pG=winProbs.Goblin,pT=winProbs.Troll,pD=winProbs.Dragon;
const mean=n=>DWARF_UPGRADE_SCALES[n].reduce((a,v,i)=>a+v*DWARF_UPGRADE_WEIGHTS[i]/10000,0);
const U=DWARF_INITIAL_SCALE,expectedSpins=10+10*pG+20*pG*pT+30*pG*pT*pD;
const chestMean=Object.entries(DWARF_CHEST_WEIGHTS).reduce((a,[v,w])=>a+Number(v)*w/10000,0);
assert.equal(Object.values(DWARF_CHEST_WEIGHTS).reduce((a,b)=>a+b,0),10000);
assert.deepEqual(Object.keys(DWARF_CHEST_WEIGHTS).map(Number),[1,2,3,5,8,10,15,20,50,100]);
const rawPerSpin=.07202700320420587+9*1.9/96.9*chestMean;
const expectedRaw=rawPerSpin*(10*U+10*pG*(U+mean('Goblin'))+20*pG*pT*(U+mean('Goblin')+mean('Troll'))+30*pG*pT*pD*(U+mean('Goblin')+mean('Troll')+mean('Dragon')));
for(const rate of [1000,2000,3000,4000,5000,10000,20000,30000,50000,100000,200000,300000,400000,500000,1000000])for(const name of names){const t=dwarfUpgradeTable(rate,name);assert.ok(t.values.every(Number.isInteger));assert.equal(t.weights.reduce((a,b)=>a+b,0),10000);}
let seed=918813;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
let score=0,weightedRaw=0,spinSum=0,perEnemyWins=Object.fromEntries(names.map(n=>[n,0])),perEnemyBattles=Object.fromEntries(names.map(n=>[n,0])),endings={};
const count=100000,rate=10000;
for(let i=0;i<count;i++){
 const r=playGame('dwarf',{rate,rand,withScript:true});score+=r.score;spinSum+=r.freePlayed;endings[r.freePlayed]=(endings[r.freePlayed]||0)+1;assert.ok([10,20,40,70].includes(r.freePlayed));
 let unit=r.unit,paid=0,battles=0;assert.equal(unit,rate*U);
 for(const s of r.spins){assert.equal(s.unit,unit);weightedRaw+=s.raw*s.unit/rate;paid+=s.win;
  if(s.battle){assert.equal(s.monster,names[battles]);assert.equal(s.freePlayed,stages[battles]);battles++;perEnemyBattles[s.monster]++;perEnemyWins[s.monster]+=Number(s.won);assert.equal(s.awarded,s.won?s.reward:0);if(s.won){assert.equal(s.upgrade.amount,s.upgrade.values[s.upgrade.selected]);assert.ok(Number.isInteger(s.upgrade.amount));unit+=s.upgrade.amount;assert.equal(s.nextUnit,unit);}else assert.equal(s.upgrade,undefined);}
  for(const c of s.chests||[])assert.ok(c.value in DWARF_CHEST_WEIGHTS);
 }assert.ok(battles<=3);assert.equal(r.finalUnit,unit);assert.equal(r.score,paid+r.guarantee);
}
const rtp=score/count/rate,corrected=expectedRaw+rtp-weightedRaw/count;
for(const n of names)assert.ok(Math.abs(perEnemyWins[n]/perEnemyBattles[n]-winProbs[n])<.007);
assert.ok(Math.abs(spinSum/count-expectedSpins)<.25);assert.ok(corrected>=.96&&corrected<=.98);assert.ok(Math.abs(rtp-.97)<.04);
console.log({count,winProbs,perEnemyWins:Object.fromEntries(names.map(n=>[n,perEnemyWins[n]/perEnemyBattles[n]])),endings,expectedSpins,observedSpins:spinSum/count,observedRTP:rtp,analyticalCorrectedRTP:corrected});
