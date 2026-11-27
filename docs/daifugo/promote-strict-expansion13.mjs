import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bank as old} from './bank13-certified.mjs';
const paths=process.argv.slice(2);assert.equal(paths.length,4);const groups=paths.map(p=>JSON.parse(readFileSync(p,'utf8'))),bank=groups.flatMap(x=>x.rows),report=groups.map(x=>x.report);assert.equal(bank.length,800);assert.equal(old.length,400);for(let r=1;r<=4;r++){const a=bank.filter(x=>x.target===r);assert.equal(a.length,200);assert.equal(new Set(a.map(x=>x.family)).size,200);assert.equal(report.find(x=>x.rank===r).qualification,20000);}
for(const x of old)assert(bank.some(y=>JSON.stringify(x)===JSON.stringify(y)),`original missing: ${x.id}`);
writeFileSync(new URL('./bank13-certified.mjs',import.meta.url),'// 800 strict-qualified fixed-deal scenarios; 400 previous entries retained.\nexport const bank='+JSON.stringify(bank)+';\n');
writeFileSync(new URL('./strict200-report.json',import.meta.url),JSON.stringify({qualificationSeed:48871,independentSeed:90213,runsPerHand:100,deviation:.25,report,nodes:report.reduce((n,x)=>n+x.nodes,0)},null,2)+'\n');console.log(report);
