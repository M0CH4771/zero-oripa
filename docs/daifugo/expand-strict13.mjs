import * as e from './engine13.mjs';
import {robustness,varied} from './robust13.mjs';
import {proof} from './proof13.mjs';
import {bank} from './bank13-certified.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const r=Number(process.argv[2]),max=Number(process.argv[3]),seed0=Number(process.argv[4]),out=process.argv[5],goal=Number(process.argv[6]||200),mode=process.argv[7]||'balanced';
if(![1,2,3,4].includes(r)||!out||!Number.isInteger(max))throw Error('rank attempts seed output [goal]');
let seed=seed0,rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const pattern=x=>x.hands[0].map(c=>c>>2).join(','), base=bank.filter(x=>x.target===r),a=base.slice(),seen=new Set(a.map(x=>x.family)),pat=new Map();
for(const x of a)pat.set(pattern(x),(pat.get(pattern(x))||0)+1);
const append=x=>{if(seen.has(x.family))return;seen.add(x.family);pat.set(pattern(x),(pat.get(pattern(x))||0)+1);a.push(x)};
if(existsSync(out))for(const x of JSON.parse(readFileSync(out,'utf8')))append(x);
for(let i=0;i<max&&a.length<goal;i++){
 const diverse=[...new Map(a.slice().reverse().map(x=>[pattern(x),x])).values()];const pool=i%3===0?diverse:a;const x=pool[Math.floor(rand()*pool.length)];let hands=x.hands.map(h=>h.slice()),starter=x.starter;
 if(r===1&&i%4===0){hands=e.deal(rand);starter=i%4;}
 else if(mode==='neighbor'&&i%2===0){let u=Math.floor(rand()*13),c=hands[0][u]+[-8,-4,4,8][Math.floor(rand()*4)];if(c<0||c>=52||hands[0].includes(c))continue;let p=hands.findIndex(h=>h.includes(c)),v=hands[p].indexOf(c);[hands[0][u],hands[p][v]]=[hands[p][v],hands[0][u]];}
 else if(i%(mode==='suits'?3:9)===0){let m=[0,1,2,3];for(let j=3;j>0;j--){let k=Math.floor(rand()*(j+1));[m[j],m[k]]=[m[k],m[j]];}hands=hands.map(h=>h.map(c=>(c&~3)|m[c&3]));}
 else {let p=i%3===0?Math.floor(rand()*4):0,q=(p+1+Math.floor(rand()*3))%4,u=Math.floor(rand()*13),v=Math.floor(rand()*13);[hands[p][u],hands[q][v]]=[hands[q][v],hands[p][u]];}
 hands.forEach(h=>h.sort((a,b)=>a-b));const family=hands[0].join(','),p=hands[0].map(c=>c>>2).join(',');if(seen.has(family)||(pat.get(p)||0)>=(mode==='suits'?16:10))continue;
 const s=e.simulate(hands,starter);if(s.rank!==r||s.penalties||s.plays<3||(r===3&&s.close>2)||(r===4&&(s.remaining<1||s.remaining>2)))continue;
 const t={id:`strict-expand-${r}-${seed0}-${i}`,hands,starter,family,target:r,version:e.VERSION,cpu:e.CPU_VERSION,samples:[s]};
 if(varied(t,{runs:12,seed:48871,deviation:.25})!==12)continue;const m=robustness(t);if(m.score!==1||!m.policies.every(Boolean)||varied(t,{runs:100,seed:48871,deviation:.25})!==100)continue;
 const cap=proof(hands,starter,r,200000);if(cap.status!=='certified')continue;append({...t,cap,robust:m,stress:varied(t),strict:{runs:100,matches:100,seed:48871,deviation:.25}});writeFileSync(out,JSON.stringify(a));if(a.length%5===0)console.log({rank:r,count:a.length,patterns:pat.size,attempt:i});
}
console.log({rank:r,count:a.length,patterns:pat.size});
