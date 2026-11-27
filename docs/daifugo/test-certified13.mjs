import assert from 'node:assert/strict';
import {bank} from './bank13-certified.mjs';
import {VERSION,CPU_VERSION,simulate,validate} from './engine13.mjs';
import {proof} from './proof13.mjs';
assert.equal(bank.length,80); let nodes=0;
for(let r=1;r<=4;r++){const pool=bank.filter(x=>x.target===r);assert.equal(pool.length,20);assert.equal(new Set(pool.map(x=>x.family)).size,20);for(const x of pool){validate(x.hands);assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);const v=proof(x.hands,x.starter,r,200000);assert.equal(v.status,'certified');assert.deepEqual(v,x.cap);nodes+=v.nodes;const s=simulate(x.hands,x.starter);assert.equal(s.rank,r);assert.equal(s.penalties,0);if(r===3)assert(s.close<=2);if(r===4)assert(s.remaining>=1&&s.remaining<=2);}}
console.log({scenarios:80,nodes});