import assert from 'node:assert/strict';
import {bank} from './bank13-certified.mjs';
import {robustness,varied} from './robust13.mjs';
import {proof} from './proof13.mjs';
import {validate,simulate,VERSION,CPU_VERSION} from './engine13.mjs';
assert.equal(bank.length,800);let nodes=0;
for(let r=1;r<=4;r++){const pool=bank.filter(x=>x.target===r);assert.equal(pool.length,200);assert.equal(new Set(pool.map(x=>x.family)).size,200);for(const x of pool){validate(x.hands);assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);assert.equal(x.strict?.matches,100);assert.equal(x.family,x.hands[0].join(','));const s=simulate(x.hands,x.starter);assert.equal(s.rank,r);assert.equal(s.penalties,0);if(r===3)assert(s.close<=2);if(r===4)assert(s.remaining>=1&&s.remaining<=2);const m=robustness(x);assert.equal(m.score,1);assert(m.policies.every(Boolean));assert.equal(varied(x,{runs:100,seed:48871,deviation:.25}),100);const cap=proof(x.hands,x.starter,r,200000);assert.deepEqual(cap,x.cap);assert.equal(cap.status,'certified');nodes+=cap.nodes;}console.log({rank:r,count:pool.length,cumulativeNodes:nodes});}
