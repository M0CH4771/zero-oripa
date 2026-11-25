import assert from 'node:assert/strict';
import {plinkoConfig,play} from '../docs/test-games/plinko.js';
assert.deepEqual(plinkoConfig(12,'low').cents.slice(0,7),[3000,480,235,135,100,70,55]);
assert.deepEqual(plinkoConfig(12,'medium').cents.slice(0,7),[5000,1285,455,208,104,34,21]);
assert.deepEqual(plinkoConfig(12,'high').cents.slice(0,7),[20000,3995,655,163,52,14,1]);
for(const rows of [12]){
 let previousVariance=0;
 for(const risk of ['low','medium','high']){
  const c=plinkoConfig(rows,risk);
  assert.equal(c.multipliers.length,rows+1);
  assert.equal(c.cents.reduce((s,m,i)=>s+m*c.probabilities[i],0),90);
  assert.ok(c.cents.every(m=>m>=0));
  assert.deepEqual(c.cents,[...c.cents].reverse());
  const variance=c.multipliers.reduce((s,m,i)=>s+(m-.90)**2*c.probabilities[i],0);
  assert.ok(variance>previousVariance);previousVariance=variance;
  for(let slot=0;slot<=rows;slot++){
   let index=0;
   const r=play({rate:100,rows,risk,rand:()=>index++<slot?.75:.25});
   assert.equal(r.spins[0].slot,slot);assert.equal(r.score,Math.max(1,c.cents[slot]));assert.equal(r.spins[0].win,c.cents[slot]);
   assert.equal(r.spins[0].path.length,rows);
  }
  const batch=play({rate:1000,rows,risk,count:100});
  assert.equal(batch.spins.length,100);
  assert.equal(batch.score,Math.max(1,batch.spins.reduce((s,b)=>s+b.win,0)));
  console.log(rows,risk,'RTP 90%','max',c.multipliers[0]);
 }
}
assert.throws(()=>play({rate:100,rows:10,risk:'high'}));
assert.throws(()=>play({rate:100,rows:8,risk:'high'}));
assert.throws(()=>play({rate:100,rows:16,risk:'high'}));
assert.throws(()=>play({rate:100,rows:12,risk:'other'}));
assert.ok(play({rate:1000,rows:12,risk:'high',rand:()=>0,maxMult:50}).score>50*1000);
let i=0;
assert.equal(play({rate:100,rows:12,risk:'high',rand:()=>i++<6?.25:.75}).score,1);
