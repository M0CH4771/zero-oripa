import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bank as old} from './bank13-certified.mjs';
import {validate,simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {robustness,varied} from './robust13.mjs';
const r=Number(process.argv[2]),out=process.argv[3],paths=process.argv.slice(4);assert([1,2,3,4].includes(r));
const pattern=x=>x.hands[0].map(c=>c>>2).join(','),base=old.filter(x=>x.target===r),rows=base.slice(),seen=new Set(base.map(x=>x.family)),counts=new Map();for(const x of base)counts.set(pattern(x),(counts.get(pattern(x))||0)+1);
const pool=paths.flatMap(p=>JSON.parse(readFileSync(p,'utf8'))).filter(x=>x.target===r&&!seen.has(x.family));
while(rows.length<200){const candidates=pool.filter(x=>!seen.has(x.family));assert(candidates.length,`insufficient rank ${r}`);candidates.sort((a,b)=>(counts.get(pattern(a))||0)-(counts.get(pattern(b))||0)||b.stress-a.stress);const x=candidates[0];rows.push(x);seen.add(x.family);counts.set(pattern(x),(counts.get(pattern(x))||0)+1);}
let qualification=0,independent=0,perfect=0,nodes=0;for(const [i,x] of rows.entries()){validate(x.hands);assert.equal(x.family,x.hands[0].join(','));assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);const s=simulate(x.hands,x.starter);assert.equal(s.rank,r);assert.equal(s.penalties,0);if(r===3)assert(s.close<=2);if(r===4)assert(s.remaining>=1&&s.remaining<=2);const m=robustness(x);assert.equal(m.score,1);assert(m.policies.every(Boolean));const n=varied(x,{runs:100,seed:48871,deviation:.25});assert.equal(n,100);qualification+=n;const k=varied(x,{runs:100,seed:90213,deviation:.25});independent+=k;perfect+=Number(k===100);const cap=proof(x.hands,x.starter,r,200000);assert.equal(cap.status,'certified');assert.deepEqual(cap,x.cap);nodes+=cap.nodes;if((i+1)%25===0)console.log({rank:r,checked:i+1,nodes});}
const report={rank:r,count:rows.length,patterns:counts.size,qualification,independent,perfect,nodes};writeFileSync(out,JSON.stringify({rows,report}));console.log(report);
