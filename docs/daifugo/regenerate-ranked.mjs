import {bank} from './bank.mjs';
import {deal,verify,verifyPlayability} from './engine.mjs';
import {normalRanks,variedMatches} from './normal-play.mjs';
import {writeFileSync} from 'node:fs';
const target=Number(process.argv[2]),out=process.argv[3];
if(![1,2,3,4].includes(target)||!out)throw Error('rank and output required');
let seed=20261127+target,rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const approved=[],seen=new Set(),rankPatterns=new Map();
const family=h=>h[0].join(','),pattern=h=>h[0].map(c=>c>>2).join(',');
function add(x){const k=family(x.hands),p=pattern(x.hands);if(seen.has(k)||(rankPatterns.get(p)||0)>=3)return false;const normal=normalRanks(x.hands,x.starter);if(normal.some(r=>r!==target))return false;const varied=variedMatches(x.hands,x.starter,target);if(varied<28)return false;const playability=verifyPlayability(x.hands,x.starter);if(!playability.reachable)return false;const proof=x.proof??verify(x.hands,x.starter);if(!proof.complete||proof.best!==target)return false;seen.add(k);rankPatterns.set(p,(rankPatterns.get(p)||0)+1);approved.push({...x,proof,playability,family:k,normal,varied});return true;}
for(const x of bank.filter(x=>x.proof.best===target))add(x);
const base=bank.filter(x=>x.proof.best===target);let attempts=0;
while(approved.length<50&&attempts<50000){attempts++;let hands,starter;
  if(target>=3&&attempts%2===0){const x=base[Math.floor(rand()*base.length)];hands=x.hands.map(h=>h.slice());starter=x.starter;const p=Math.floor(rand()*8),old=hands[0][p],free=Array.from({length:52},(_,i)=>i).filter(c=>!hands.flat().includes(c));const c=free[Math.floor(rand()*free.length)];hands[0][p]=c;hands[0].sort((a,b)=>a-b);if(old===c)continue;}
  else{hands=deal(rand);starter=Math.floor(rand()*4);}
  if(!hands[0].some(c=>(c>>2)===5)||new Set(hands[0].map(c=>c>>2)).size===8)continue;
  if(add({id:`ranked-${target}-${attempts}`,hands,starter})&&approved.length%10===0)console.log(target,approved.length,attempts);
}
if(approved.length!==50)throw Error(`rank ${target}: ${approved.length}/50`);
writeFileSync(out,JSON.stringify(approved));console.log({target,attempts,patterns:rankPatterns.size});
