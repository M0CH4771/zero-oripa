import {bank} from './bank13-certified.mjs';
import {deal,simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {robustness,varied} from './robust13.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const rank=Number(process.argv[2]),attempts=Number(process.argv[3]||500),out=process.argv[4],seed0=Number(process.argv[5]||20261127)+rank;
if(![1,2,3,4].includes(rank)||!out)throw Error('rank, attempts, output required');
let seed=seed0;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const base=bank.filter(x=>x.target===rank),accepted=[];
const score=x=>.60*x.robust.score+.25*(x.stress/40)+.15*x.robust.policies.filter(Boolean).length/3;
function consider(x,known=false){const f=x.hands[0].join(',');const existing=accepted.findIndex(a=>a.family===f);const s=simulate(x.hands,x.starter);if(s.rank!==rank||s.penalties||(rank===3&&s.close>2)||(rank===4&&(s.remaining<1||s.remaining>2)))return;
  const robust=robustness(x),stress=varied(x),candidate={...x,family:f,target:rank,version:VERSION,cpu:CPU_VERSION,samples:[s],robust,stress};
  if(existing>=0&&score(candidate)<=score(accepted[existing]))return;
  if(existing<0&&!known&&accepted.length>=20&&score(candidate)<=Math.min(...accepted.map(score)))return;
  const cap=known?x.cap:proof(x.hands,x.starter,rank,200000);if(cap.status!=='certified')return;
  candidate.cap=cap;if(existing>=0)accepted.splice(existing,1);accepted.push(candidate);accepted.sort((a,b)=>score(b)-score(a));if(accepted.length>35)accepted.pop();writeFileSync(out,JSON.stringify(accepted));if(!known)console.log(rank,x.id,score(candidate).toFixed(3),cap.nodes);
}
const prior=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):[];
for(const x of base)consider(x,true);
for(const x of prior)consider(x,true);
for(let i=0;i<attempts;i++){const x=accepted[Math.floor(rand()*Math.min(accepted.length,i%3===0?15:4))]??base[i%base.length];let hands,starter;if(rank===1&&i%2===0){hands=deal(rand);starter=i%4;}else{hands=x.hands.map(a=>a.slice());starter=x.starter;for(let j=0;j<1+Number(i%4===0);j++){let p=Math.floor(rand()*4),q=(p+1+Math.floor(rand()*3))%4,a=Math.floor(rand()*13),b=Math.floor(rand()*13);[hands[p][a],hands[q][b]]=[hands[q][b],hands[p][a]];}hands.forEach(a=>a.sort((a,b)=>a-b));}consider({id:`robust-${rank}-${seed0}-${i}`,hands,starter,target:rank});}
console.log({rank,accepted:accepted.length,best:accepted.slice(0,20).map(score)});
