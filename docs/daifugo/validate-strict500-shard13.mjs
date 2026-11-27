import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validate,simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {robustness,varied} from './robust13.mjs';
const r=Number(process.argv[2]),shard=Number(process.argv[3]),input=process.argv[4],out=process.argv[5],rows=JSON.parse(readFileSync(input,'utf8')).slice(200+shard*100,300+shard*100);assert.equal(rows.length,100);
let qualification=0,independent=0,perfect=0,nodes=0;for(const [i,x] of rows.entries()){validate(x.hands);assert.equal(x.family,x.hands[0].join(','));assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);assert.equal(x.target,r);const s=simulate(x.hands,x.starter);assert.equal(s.rank,r);assert.equal(s.penalties,0);if(r===3)assert(s.close<=2);if(r===4)assert(s.remaining>=1&&s.remaining<=2);const m=robustness(x);assert.equal(m.score,1);assert(m.policies.every(Boolean));const n=varied(x,{runs:100,seed:48871,deviation:.25});assert.equal(n,100);qualification+=n;const k=varied(x,{runs:100,seed:90213,deviation:.25});independent+=k;perfect+=Number(k===100);const cap=proof(x.hands,x.starter,r,200000);assert.equal(cap.status,'certified');assert.deepEqual(cap,x.cap);nodes+=cap.nodes;if((i+1)%25===0)console.log({rank:r,shard,checked:i+1,nodes});}
const report={rank:r,shard,count:rows.length,qualification,independent,perfect,nodes};writeFileSync(out,JSON.stringify(report));console.log(report);
