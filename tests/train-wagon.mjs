import assert from 'node:assert/strict';
import {featurePlay} from '../docs/test-games/features.js';
import {playGame} from '../docs/test-games/index.js';
let seed=19871;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const rate=10000,seen=new Set();
for(const depth of [2,3,4]){
 const strategy='train'+depth;let sum=0,spins=0;
 for(let n=0;n<4000;n++){
  const r=playGame('train',{rate,strategy,rand});sum+=r.score;spins+=r.played;
  assert.equal(r.entry.depth.length,6);assert.ok(r.entry.depth.every(x=>x===depth));assert.equal(r.entry.grid.length,36);
  let previous=0,opens=r.entry.depth;
  for(const s of r.spins){assert.equal(s.cols,6);assert.equal(s.rows,6);assert.equal(s.grid.length,36);assert.ok(s.remaining>=0&&s.remaining<=3);assert.ok(s.raw>=0);assert.ok(s.totalMultiple>=previous);assert.ok(s.depth.every((x,c)=>x>=opens[c]&&x<=6));assert.ok(s.opened.every((x,c)=>!x||s.depth[c]===6));for(const e of s.events)seen.add(e.name);previous=s.totalMultiple;opens=s.depth;}
  assert.equal(r.spins.at(-1).remaining,0);assert.equal(r.score,r.guarantee+r.spins.reduce((a,s)=>a+s.win,0));assert.equal(r.score,Math.max(1,Math.min(200*rate,Math.floor(previous*r.unit+1e-7))));
 }
 console.log('TRAIN',depth,'rows', 'sample RTP',sum/(4000*rate),'mean spins',spins/4000);
}
for(const name of ['NEW COINS','COIN','MULT','DYNAMITE','BAG','CHEST','DWARF','DWARF COLLECT','COLLECT CHEST','FINAL CHEST'])assert.ok(seen.has(name),name);
