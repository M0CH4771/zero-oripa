import assert from 'node:assert/strict';
import {bank} from './bank-ranked.mjs';
import {verify,verifyPlayability,start,step,cpu} from './engine.mjs';
import {normalRanks,variedMatches,targetHint} from './normal-play.mjs';
assert.equal(bank.length,200);
let checks=0,nodes=0;
for(const r of [1,2,3,4]){
  const pool=bank.filter(x=>x.proof.best===r);
  assert.equal(pool.length,50);
  assert.equal(new Set(pool.map(x=>x.family)).size,50);
  for(const x of pool){
    assert.equal(x.family,x.hands[0].join(','));
    const proof=verify(x.hands,x.starter);assert.deepEqual(proof,x.proof);assert(proof.complete);
    const play=verifyPlayability(x.hands,x.starter);assert.deepEqual(play,x.playability);assert(play.reachable);
    const normal=normalRanks(x.hands,x.starter);assert.deepEqual(normal,[r,r,r]);assert.deepEqual(normal,x.normal);
    assert.equal(variedMatches(x.hands,x.starter,r),x.varied);assert(x.varied>=28);
    let s=start(x.hands,x.starter);while(!s.finish.includes(0))s=step(s,s.turn===0?targetHint(s,r):cpu(s));assert.equal(s.finish.indexOf(0)+1,r);
    checks+=normal.length;nodes+=proof.nodes;
  }
  console.log({rank:r,hands:pool.length,matchingRuns:pool.length*3,holdoutMatches:pool.reduce((sum,x)=>sum+variedMatches(x.hands,x.starter,r,{runs:100,seed:4661}),0),holdoutRuns:pool.length*100,rankPatterns:new Set(pool.map(x=>x.hands[0].map(c=>c>>2).join(','))).size});
}
console.log({scenarios:bank.length,normalChecks:checks,nodes});
