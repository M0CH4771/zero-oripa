import {bank} from './bank13-certified.mjs';
import {deal,simulate,VERSION,CPU_VERSION} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {robustness,varied} from './robust13.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const rank=Number(process.argv[2]),attempts=Number(process.argv[3]),out=process.argv[4],seed0=Number(process.argv[5])+rank,priorFile=process.argv[6];
if(![1,2,3,4].includes(rank)||!out||!Number.isInteger(attempts))throw Error('rank attempts output seed [prior candidates]');
let seed=seed0;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const base=bank.filter(x=>x.target===rank),used=new Set(base.map(x=>x.family)),accepted=[];
const score=x=>(rank===2?.4:.6)*x.robust.score+.25*x.stress/40+(rank===2?.35:.15)*x.robust.policies.filter(Boolean).length/3;
const pattern=x=>x.hands[0].map(c=>c>>2).join(',');
const limit=140,basePatterns=new Map();for(const x of base)basePatterns.set(pattern(x),(basePatterns.get(pattern(x))||0)+1);
function diversityScore(x){return score(x)-.008*(basePatterns.get(pattern(x))||0)-.006*accepted.filter(y=>pattern(y)===pattern(x)).length;}
function consider(x,known=false){const family=x.hands[0].join(',');if(used.has(family))return;const existing=accepted.findIndex(a=>a.family===family),s=simulate(x.hands,x.starter);if(s.rank!==rank||s.penalties||s.plays<3||(rank===3&&s.close>2)||(rank===4&&(s.remaining<1||s.remaining>2)))return;
 const robust=robustness(x),stress=varied(x),candidate={...x,family,target:rank,version:VERSION,cpu:CPU_VERSION,samples:[s],robust,stress};
 if(robust.score<(rank===2?.70:.85)||stress<(rank===2?34:37)||robust.policies.filter(Boolean).length<2)return;
 if(existing>=0&&score(candidate)<=score(accepted[existing]))return;
 if(existing<0&&accepted.length>=limit&&diversityScore(candidate)<Math.min(...accepted.map(diversityScore)))return;
 const cap=known?x.cap:proof(x.hands,x.starter,rank,200000);if(cap?.status!=='certified')return;
 candidate.cap=cap;if(existing>=0)accepted.splice(existing,1);accepted.push(candidate);if(accepted.length>limit){let worst=accepted.reduce((a,b)=>diversityScore(a)<=diversityScore(b)?a:b);accepted.splice(accepted.indexOf(worst),1);}accepted.sort((a,b)=>score(b)-score(a));writeFileSync(out,JSON.stringify(accepted));
 if(!known&&accepted.length%5===0)console.log(rank,accepted.length,x.id,score(candidate).toFixed(3));
}
const checkpoint=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):[];
for(const x of checkpoint)consider(x,true);
if(priorFile&&existsSync(priorFile))for(const x of JSON.parse(readFileSync(priorFile,'utf8')))consider(x,true);
for(let i=0;i<attempts;i++){const seeds=[...base,...accepted].sort((a,b)=>score(b)-score(a));const distinct=[...new Map(seeds.slice().reverse().map(x=>[pattern(x),x])).values()];const deck=i%2===0?distinct:seeds.slice(0,20);const x=deck[Math.floor(rand()*deck.length)];let hands,starter=x.starter;
 if(rank===1&&i%2===0){hands=deal(rand);starter=i%4;}
 else {hands=x.hands.map(a=>a.slice());if(i%16===0){const suits=[0,1,2,3];for(let j=3;j>0;j--){const k=Math.floor(rand()*(j+1));[suits[j],suits[k]]=[suits[k],suits[j]];}hands=hands.map(a=>a.map(c=>(c&~3)|suits[c&3]));}else for(let j=0;j<1+Number(i%4===0);j++){let p=i%3!==0?0:Math.floor(rand()*4),q=(p+1+Math.floor(rand()*3))%4,a=Math.floor(rand()*13),b=Math.floor(rand()*13);[hands[p][a],hands[q][b]]=[hands[q][b],hands[p][a]];}hands.forEach(a=>a.sort((a,b)=>a-b));}
 consider({id:`expand-${rank}-${seed0}-${i}`,hands,starter,target:rank});
}
console.log({rank,accepted:accepted.length,patterns:new Set(accepted.map(pattern)).size,top:accepted.slice(0,30).map(score)});
