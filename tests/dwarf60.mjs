import assert from 'node:assert/strict';
import {DWARF_WEIGHTS,DWARF_ENCOUNTER_WEIGHTS,DWARF_ROULETTE,FEATURE_CONFIG} from '../docs/test-games/features.js';
import {playGame} from '../docs/test-games/index.js';
const names=['Goblin','Troll','Dragon'],hp=[3,4,5],rewards=[10,20,30];
let overall=0,added=0;
for(const [i,name] of names.entries()){
 const weights=DWARF_WEIGHTS[name],choices=DWARF_ROULETTE[name],memo=new Map();assert.equal(weights.reduce((a,b)=>a+b,0),10000);
 function p(hero,enemy){if(enemy<=0)return 1;if(hero<=0)return 0;const key=hero+','+enemy;if(!memo.has(key))memo.set(key,choices.reduce((v,d,j)=>v+weights[j]/10000*(d>0?p(hero,enemy-d):p(hero+d,enemy)),0));return memo.get(key);}
 const win=p(4,hp[i]),freq=DWARF_ENCOUNTER_WEIGHTS[name]/10000;overall+=win*freq;added+=win*freq*rewards[i];console.log(name,'appearance',freq,'win',win);
}
assert.ok(Math.abs(overall-.60)<.001);assert.ok(added<10);
let seed=918813;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);let wins=0,battles=0,score=0,raw=0,frequencies=Object.fromEntries(names.map(n=>[n,0]));
const count=50000,rate=1000;
for(let i=0;i<count;i++){const r=playGame('dwarf',{rate,rand,withScript:true});score+=r.score;for(const s of r.spins){raw+=s.raw;if(s.battle){battles++;wins+=Number(s.won);frequencies[s.monster]++;assert.deepEqual(s.choices,DWARF_ROULETTE[s.monster]);assert.equal(s.awarded,s.won?s.reward:0);}}}
const exactSpinRaw=8.14555641496891,expectedRaw=exactSpinRaw*10/(1-added/10),scale=FEATURE_CONFIG.dwarf.scale,rtp=score/count/rate,corrected=expectedRaw*scale+rtp-raw/count*scale;
assert.ok(Math.abs(wins/battles-.60)<.005);assert.ok(Math.abs(rtp-.97)<.035);assert.ok(Math.abs(corrected-.97)<.002);
for(const n of names)assert.ok(Math.abs(frequencies[n]/battles-DWARF_ENCOUNTER_WEIGHTS[n]/10000)<.005);
console.log({count,battles,observedWin:wins/battles,expectedWin:overall,expectedSpins:10/(1-added/10),observedRTP:rtp,analyticalCorrectedRTP:corrected});
