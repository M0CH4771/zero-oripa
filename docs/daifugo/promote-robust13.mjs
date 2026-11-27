import {bank as old} from './bank13-certified.mjs';
import {robustness,varied} from './robust13.mjs';
import {simulate,validate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const paths=process.argv.slice(2);assert.equal(paths.length,4);
const bank=paths.flatMap((path,i)=>{const rows=JSON.parse(readFileSync(path,'utf8'));if(i===1){const score=x=>.40*x.robust.score+.25*x.stress/40+.35*x.robust.policies.filter(Boolean).length/3;rows.sort((a,b)=>score(b)-score(a));}const a=rows.slice(0,20);assert.equal(a.length,20);assert(a.every(x=>x.target===i+1));assert.equal(new Set(a.map(x=>x.family)).size,20);return a;});
function report(rows){return [1,2,3,4].map(r=>{const p=rows.filter(x=>x.target===r),metrics=p.map(robustness);return {rank:r,oneMove:metrics.reduce((s,x)=>s+x.score,0)/20,standard:metrics.reduce((s,x)=>s+x.policies.filter(Boolean).length,0)/60,random12:p.reduce((s,x)=>s+varied(x,{runs:100,seed:71137}),0)/2000,random25:p.reduce((s,x)=>s+varied(x,{runs:100,seed:47762,deviation:.25}),0)/2000,distinctRankPatterns:new Set(p.map(x=>x.hands[0].map(c=>c>>2).join(','))).size};});}
const reportPath=new URL('./robustness-report.json',import.meta.url);const before=existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')).before:report(old),after=report(bank);console.log(JSON.stringify({before,after},null,2));
let nodes=0;for(const x of bank){validate(x.hands);assert.equal(x.version,VERSION);assert.equal(x.cpu,CPU_VERSION);const p=proof(x.hands,x.starter,x.target,200000);assert.deepEqual(p,x.cap);assert.equal(p.status,'certified');nodes+=p.nodes;const s=simulate(x.hands,x.starter);assert.equal(s.rank,x.target);assert.equal(s.penalties,0);if(x.target===3)assert(s.close<=2);if(x.target===4)assert(s.remaining>=1&&s.remaining<=2);}
console.log({nodes,scenarios:bank.length});
writeFileSync(new URL('./bank13-certified.mjs',import.meta.url),'// Certified fixed-deal scenarios, ranked by robustness metrics and assessed on independent trials.\nexport const bank='+JSON.stringify(bank)+';\n');
writeFileSync(new URL('./robustness-report.json',import.meta.url),JSON.stringify({before,after,nodes,scenarios:80},null,2)+'\n');
