import assert from 'node:assert/strict';
import {bank} from './bank.mjs';
import {start,step,legal,mask,verify,verifyPlayability,VERSION,CPU_VERSION} from './engine.mjs';
const h=[[0,1,2,3,20,24,28,32],[4,5,6,7,21,25,29,33],[8,9,10,11,22,26,30,34],[12,13,14,15,23,27,31,35]];
let s=step(start(h),[0,1,2,3]);assert.equal(s.rev,true);
s=step(start(h),[20]);assert.equal(s.field,null);assert.equal(s.turn,0);
s=step(start(h),[0]);s=step(s,[4]);assert.equal(s.lock,1);assert(legal(s).filter(a=>a.length).every(a=>mask(a)===1));
s=step(s,[]);s=step(s,[]);s=step(s,[]);assert.equal(s.field,null);assert.equal(s.turn,1);
assert.throws(()=>start([h[0],h[0],h[2],h[3]]));
assert.throws(()=>step(start(h),[]));
assert.throws(()=>step(start(h),[0,20]));
let nodes=0,edges=0;
for(const x of bank){let v=verify(x.hands,x.starter);assert(v.complete);assert.equal(v.version,VERSION);assert.equal(v.cpu,CPU_VERSION);assert.deepEqual(v,x.proof);const p=verifyPlayability(x.hands,x.starter);assert(p.reachable);assert.deepEqual(p,x.playability);nodes+=v.nodes;edges+=v.edges;}
console.log({scenarios:bank.length,nodes,edges,byRank:[1,2,3,4].map(r=>bank.filter(x=>x.proof.best===r).length)});

const groups=new Map();for(const x of bank){assert.equal(x.family,x.hands[0].join(','));if(!groups.has(x.family))groups.set(x.family,[]);groups.get(x.family).push(x.proof.best);}for(const ranks of groups.values())assert.deepEqual([...ranks].sort(),[1,2,3,4]);assert.equal(groups.size,20);console.log({matchedHands:groups.size});

import {drawReward,RTP,WEIGHTS} from './reward.mjs';
assert.equal(WEIGHTS.reduce((a,b)=>a+b,0),10000);assert(Math.abs(RTP-.969988)<1e-12);assert.deepEqual(drawReward(()=>0),{rank:1,mult:2});assert.equal(drawReward(()=>.16).rank,2);assert.equal(drawReward(()=>.36).rank,3);assert.equal(drawReward(()=>.9999).rank,4);
