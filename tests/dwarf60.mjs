import assert from 'node:assert/strict';
import {DWARF_WEIGHTS,DWARF_ENCOUNTER_WEIGHTS,DWARF_ROULETTE,DWARF_INITIAL_SCALE,DWARF_UPGRADE_SCALES,DWARF_UPGRADE_WEIGHTS} from '../docs/test-games/features.js';
import {playGame} from '../docs/test-games/index.js';
const names=['Goblin','Troll','Dragon'],hp=[3,4,5],rewards=[10,20,30];
let overall=0,added=0,second=0;
for(const [i,name] of names.entries()){
 const weights=DWARF_WEIGHTS[name],choices=DWARF_ROULETTE[name],memo=new Map();assert.equal(weights.reduce((a,b)=>a+b,0),10000);
 function p(hero,enemy){if(enemy<=0)return 1;if(hero<=0)return 0;const key=hero+','+enemy;if(!memo.has(key))memo.set(key,choices.reduce((v,d,j)=>v+weights[j]/10000*(d>0?p(hero,enemy-d):p(hero+d,enemy)),0));return memo.get(key);}
 const win=p(4,hp[i]),freq=DWARF_ENCOUNTER_WEIGHTS[name]/10000;overall+=win*freq;added+=win*freq*rewards[i];second+=win*freq*(rewards[i]/10)**2;console.log(name,'appearance',freq,'win',win);
}
assert.ok(Math.abs(overall-.60)<.001);assert.ok(added<10);
let seed=918813;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);let wins=0,battles=0,score=0,weightedRaw=0,upgradeCounts=DWARF_UPGRADE_SCALES.map(()=>0),frequencies=Object.fromEntries(names.map(n=>[n,0]));
const count=50000,rate=1000;
for(let i=0;i<count;i++){const r=playGame('dwarf',{rate,rand,withScript:true});score+=r.score;let unit=r.unit;assert.equal(unit,rate*DWARF_INITIAL_SCALE);let paid=0;for(const s of r.spins){assert.equal(s.unit,unit);weightedRaw+=s.raw*s.unit/rate;paid+=s.win;if(s.battle){battles++;wins+=Number(s.won);frequencies[s.monster]++;assert.deepEqual(s.choices,DWARF_ROULETTE[s.monster]);assert.equal(s.awarded,s.won?s.reward:0);if(s.won){assert.equal(s.upgrade.amount,s.upgrade.values[s.upgrade.selected]);upgradeCounts[s.upgrade.selected]++;unit+=s.upgrade.amount;assert.equal(s.nextUnit,unit);}else assert.equal(s.upgrade,undefined);}}assert.equal(r.finalUnit,unit);assert.equal(r.score,paid+r.guarantee);}
const exactSpinRaw=8.14555641496891,m=added/10,T=1/(1-m),queueSum=(1+T*(second-2*m+1))/(2*(1-m)),meanUpgrade=DWARF_UPGRADE_SCALES.reduce((a,v,i)=>a+v*DWARF_UPGRADE_WEIGHTS[i]/10000,0),expectedRaw=exactSpinRaw*10*(T*DWARF_INITIAL_SCALE+meanUpgrade*(m*queueSum+T*(second-m))/(1-m)),rtp=score/count/rate,corrected=expectedRaw+rtp-weightedRaw/count;
console.log({rtp,corrected,expectedRaw,weightedRaw:weightedRaw/count});
assert.ok(Math.abs(wins/battles-.60)<.005);assert.ok(Math.abs(rtp-.97)<.035);assert.ok(Math.abs(corrected-.97)<.002);
for(const n of names)assert.ok(Math.abs(frequencies[n]/battles-DWARF_ENCOUNTER_WEIGHTS[n]/10000)<.005);
for(let i=0;i<upgradeCounts.length;i++)assert.ok(Math.abs(upgradeCounts[i]/wins-DWARF_UPGRADE_WEIGHTS[i]/10000)<.01);console.log({upgradeCounts,count,battles,observedWin:wins/battles,expectedWin:overall,expectedSpins:10/(1-added/10),observedRTP:rtp,analyticalCorrectedRTP:corrected});
