import {bank} from './bank13-certified.mjs';
import {proof} from './proof13.mjs';
import {simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {robustness,varied} from './robust13.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const target=2,out=process.argv[2],extras=process.argv.slice(3).flatMap(p=>JSON.parse(readFileSync(p,'utf8'))),known=new Set(bank.filter(x=>x.target===target).map(x=>x.family));
let seed=8829,rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),accepted=[];const candidates=[...bank,...extras].filter(x=>x.target>=3);
for(let i=0;i<1800;i++){let x=candidates[Math.floor(rand()*candidates.length)],hands=x.hands.map(h=>h.slice()),p=1+Math.floor(rand()*3),starter=x.starter;[hands[0],hands[p]]=[hands[p],hands[0]];starter=starter===p?0:starter===0?p:starter;
 if(i%2===0){let q=1+Math.floor(rand()*3),a=Math.floor(rand()*13),b=Math.floor(rand()*13);[hands[0][a],hands[q][b]]=[hands[q][b],hands[0][a]];hands.forEach(h=>h.sort((a,b)=>a-b));}
 let family=hands[0].join(',');if(known.has(family))continue;let s=simulate(hands,starter);if(s.rank!==target||s.penalties)continue;const t={id:`seat2-${i}`,hands,starter,family,target,version:VERSION,cpu:CPU_VERSION,samples:[s]},robust=robustness(t),stress=varied(t);if(robust.score<.65||stress<34||robust.policies.filter(Boolean).length<2)continue;const cap=proof(hands,starter,target,200000);if(cap.status!=='certified')continue;known.add(family);accepted.push({...t,robust,stress,cap});writeFileSync(out,JSON.stringify(accepted));console.log(i,accepted.length,robust.score);
}
