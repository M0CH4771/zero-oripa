import {deal,verify,verifyPlayability,VERSION,CPU_VERSION} from './engine.mjs';
import {bank} from './bank.mjs';
import {writeFileSync} from 'node:fs';
const args=process.argv.slice(2),count=Number(args[0]||100),limit=Number(args[1]||80000),out=args[2]||'./bank.generated.mjs';
if(!Number.isInteger(count)||count<1||!Number.isInteger(limit)||limit<1)throw Error('Usage: node generate.mjs [candidate count] [state budget] [output file]');
let approved=[],seen=new Set();
for(let x of bank){const v=verify(x.hands,x.starter,{limit});if(!v.complete)continue;const playability=verifyPlayability(x.hands,x.starter);if(!playability.reachable)continue;const k=JSON.stringify([x.hands,x.starter]);seen.add(k);approved.push({...x,proof:v,playability});}
let incomplete=0,newCount=0;
for(let i=0;i<count;i++){let hands=deal(),starter=i%4,k=JSON.stringify([hands,starter]);if(seen.has(k))continue;const playability=verifyPlayability(hands,starter);if(!playability.reachable)continue;let proof=verify(hands,starter,{limit});if(!proof.complete){incomplete++;continue;}seen.add(k);approved.push({id:'df-'+Date.now()+'-'+i,hands,starter,proof,playability});newCount++;}
writeFileSync(out,'// Generated; verify before promotion.\nexport const bank='+JSON.stringify(approved,null,2)+';\n',{flag:'wx'});
console.log({version:VERSION,cpu:CPU_VERSION,newCount,incomplete,total:approved.length,byRank:[1,2,3,4].map(r=>approved.filter(x=>x.proof.best===r).length),out});
