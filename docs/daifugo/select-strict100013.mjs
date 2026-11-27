import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bank} from './bank13-certified.mjs';
const r=Number(process.argv[2]),out=process.argv[3],paths=process.argv.slice(4),base=bank.filter(x=>x.target===r),rows=base.slice(),seen=new Set(base.map(x=>x.family)),ids=new Set(base.map(x=>x.id)),counts=new Map();assert.equal(base.length,500);
const pattern=x=>x.hands[0].map(c=>c>>2).join(',');for(const x of base)counts.set(pattern(x),(counts.get(pattern(x))||0)+1);
const pool=paths.flatMap(p=>JSON.parse(readFileSync(p,'utf8'))).filter(x=>x.target===r&&!seen.has(x.family)&&!ids.has(x.id));
while(rows.length<1000){const candidates=pool.filter(x=>!seen.has(x.family)&&!ids.has(x.id));assert(candidates.length,`rank ${r}: only ${rows.length}`);candidates.sort((a,b)=>(counts.get(pattern(a))||0)-(counts.get(pattern(b))||0)||b.stress-a.stress);const x=candidates[0];rows.push(x);seen.add(x.family);ids.add(x.id);counts.set(pattern(x),(counts.get(pattern(x))||0)+1);}
writeFileSync(out,JSON.stringify(rows));console.log({rank:r,count:rows.length,patterns:counts.size});
