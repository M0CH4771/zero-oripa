import assert from 'node:assert/strict';
import {round,evaluate,LINES,TIERS,MAX_SPINS,UNIT} from '../docs/tropical.mjs';
assert.deepEqual(evaluate(Array(9).fill(4)).map(x=>x.index),[0,1,2,3,4]);
assert.equal(evaluate([0,1,2,3,4,5,6,7,8]).length,0);
let seed=781;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
const n=300000,bet=10000;let sum=0,spins=0;
for(let i=0;i<n;i++){const r=round(bet,{rand});assert.ok(LINES[0].every(j=>r.entry[j]===TIERS[r.tier].seven));assert.ok(r.steps.length>=8&&r.steps.length<=MAX_SPINS);assert.equal(r.steps.at(-1).remain,0);assert.equal(r.score,Math.max(1,r.steps.reduce((s,x)=>s+x.win,0)));assert.equal(r.score,Math.max(1,Math.min(1400*bet,Math.floor(r.raw*UNIT*bet))));sum+=r.score;spins+=r.steps.length;}
const rtp=sum/n/bet;assert.ok(rtp>=.96&&rtp<=.98);console.log('Tropical: RTP',rtp,'mean spins',spins/n);
for(let tier=0;tier<3;tier++)for(let i=0;i<2000;i++){
 const r=round(bet,{rand,tier});for(const s of r.steps){
  if(s.phase===2){assert.ok(s.grid.every(x=>x>=18&&x<=20));assert.ok(s.wins.every(w=>w.index===0));assert.equal(s.continuation.extra===true,s.wins.length===0);if(s.continuation.extra)assert.equal(s.mode,1);}
  else if(s.add){assert.ok(s.wins.some(w=>w.symbol===TIERS[s.phase].seven));assert.equal(s.add,8);}
  if(s.phase!==2&&s.continuation)assert.equal(s.continuation.success,s.wins.some(w=>w.symbol===TIERS[s.phase].seven));
 }
}
