import {bank as old} from './bank13-certified.mjs';
import {robustness,varied} from './robust13.mjs';
import {simulate,validate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const paths=process.argv.slice(2);assert.equal(paths.length,4);const previous=old.length/4;assert.equal(previous,50);const addCount=50,total=previous+addCount;
const family=x=>x.hands[0].join(','),pattern=x=>x.hands[0].map(c=>c>>2).join(',');
const score=(x,r)=>(r===2?.4:.6)*x.robust.score+.25*x.stress/40+(r===2?.35:.15)*x.robust.policies.filter(Boolean).length/3;
const added=paths.flatMap((path,i)=>{let r=i+1,pool=JSON.parse(readFileSync(path,'utf8')),current=old.filter(x=>x.target===r),selected=[],seen=new Set(current.map(family)),counts=new Map();for(const x of current)counts.set(pattern(x),(counts.get(pattern(x))||0)+1);
 while(selected.length<addCount){let available=pool.filter(x=>x.target===r&&!seen.has(family(x)));assert(available.length,`not enough rank ${r} candidates`);const newPatterns=available.filter(x=>!counts.has(pattern(x)));if(newPatterns.length)available=newPatterns;const weight=x=>score(x,r)-.024*(counts.get(pattern(x))||0);available.sort((a,b)=>weight(b)-weight(a));const x=available[0];selected.push(x);seen.add(family(x));counts.set(pattern(x),(counts.get(pattern(x))||0)+1);}return selected;});
const bank=[...old,...added].sort((a,b)=>a.target-b.target);assert.equal(bank.length,total*4);
function report(rows){return [1,2,3,4].map(r=>{const p=rows.filter(x=>x.target===r),metrics=p.map(robustness);return {rank:r,count:p.length,oneMove:metrics.reduce((s,x)=>s+x.score,0)/p.length,standard:metrics.reduce((s,x)=>s+x.policies.filter(Boolean).length,0)/(3*p.length),random12:p.reduce((s,x)=>s+varied(x,{runs:100,seed:73319}),0)/(100*p.length),random25:p.reduce((s,x)=>s+varied(x,{runs:100,seed:48871,deviation:.25}),0)/(100*p.length),rankPatterns:new Set(p.map(pattern)).size};});}
const prior=report(old),additional=report(added),combined=report(bank);console.log(JSON.stringify({prior,additional,combined},null,2));
let nodes=0;for(let r=1;r<=4;r++){const pool=bank.filter(x=>x.target===r);assert.equal(pool.length,total);assert.equal(new Set(pool.map(family)).size,total);for(const x of pool){validate(x.hands);assert.equal(x.family,family(x));assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);const v=proof(x.hands,x.starter,r,200000);assert.equal(v.status,'certified');assert.deepEqual(v,x.cap);nodes+=v.nodes;const s=simulate(x.hands,x.starter);assert.equal(s.rank,r);assert.equal(s.penalties,0);if(r===3)assert(s.close<=2);if(r===4)assert(s.remaining>=1&&s.remaining<=2);}console.log({rank:r,scenarios:total,cumulativeNodes:nodes});}
writeFileSync(new URL('./bank13-certified.mjs',import.meta.url),'// 400 fixed-deal scenarios: 200 previous plus 200 independently certified additions.\nexport const bank='+JSON.stringify(bank)+';\n');
writeFileSync(new URL('./expansion100-report.json',import.meta.url),JSON.stringify({prior,additional,combined,nodes,scenarios:total*4},null,2)+'\n');
