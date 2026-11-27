import {deal,simulate} from './engine13.mjs';
import {proof} from './proof13.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const count=Number(process.argv[2]||20),budget=Number(process.argv[3]||200000),attempts=Number(process.argv[4]||100000),out=process.argv[5]||'bank13-certified.json';
let seed=Number(process.argv[6]||20261201);const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const bank=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):[];
const seen=new Set(bank.map(x=>x.hands[0].join(',')));
for(let i=0;i<attempts;i++){const hands=deal(random),starter=i%4,family=hands[0].join(','),sample=simulate(hands,starter),target=sample.rank;if(seen.has(family)||bank.filter(x=>x.target===target).length>=count||sample.penalties||sample.plays<3||(target===3&&sample.close>2)||(target===4&&sample.remaining>2))continue;const cap=proof(hands,starter,target,budget);if(cap.status!=='certified')continue;const x={id:'cert13-'+family+'-'+target,hands,starter,family,target,samples:[sample],cap};seen.add(family);bank.push(x);writeFileSync(out,JSON.stringify(bank));console.log(target,bank.filter(x=>x.target===target).length,cap.nodes);if([1,2,3,4].every(r=>bank.filter(x=>x.target===r).length>=count))break;}
console.log('Counts:',[1,2,3,4].map(r=>bank.filter(x=>x.target===r).length));
