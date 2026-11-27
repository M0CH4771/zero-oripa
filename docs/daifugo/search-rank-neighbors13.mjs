import {bank} from './bank13-certified.mjs';
import {proof} from './proof13.mjs';
import {simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {robustness,varied} from './robust13.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const out=process.argv[2],extras=process.argv.slice(3).flatMap(p=>JSON.parse(readFileSync(p,'utf8'))),target=2,pattern=x=>x.hands[0].map(c=>c>>2).join(',');
const current=bank.filter(x=>x.target===target),known=new Set([...current,...extras].map(pattern)),seeds=[...current,...extras].sort((a,b)=>b.robust.score-a.robust.score),patterns=new Map();for(const x of seeds)if(!patterns.has(pattern(x)))patterns.set(pattern(x),x);
const queue=[...patterns.values()],accepted=[];let n=0;
for(let k=0;k<queue.length&&k<60;k++){let x=queue[k];for(let a=0;a<13;a++)for(let d of [-8,-4,4,8]){let c=x.hands[0][a]+d;if(c<0||c>=52||x.hands[0].includes(c))continue;let hands=x.hands.map(h=>h.slice()),p=hands.findIndex(h=>h.includes(c)),b=hands[p].indexOf(c);[hands[0][a],hands[p][b]]=[hands[p][b],hands[0][a]];hands.forEach(h=>h.sort((a,b)=>a-b));let t={id:`neighbor2-${n++}`,hands,starter:x.starter,target,family:hands[0].join(','),version:VERSION,cpu:CPU_VERSION};let pat=pattern(t);if(known.has(pat))continue;const s=simulate(hands,t.starter);if(s.rank!==target||s.penalties)continue;let robust=robustness(t),stress=varied(t);if(robust.score<.68||stress<34||robust.policies.filter(Boolean).length<2)continue;let cap=proof(hands,t.starter,target,200000);if(cap.status!=='certified')continue;let z={...t,samples:[s],robust,stress,cap};known.add(pat);accepted.push(z);queue.push(z);writeFileSync(out,JSON.stringify(accepted));console.log(n,accepted.length,robust.score);}}
