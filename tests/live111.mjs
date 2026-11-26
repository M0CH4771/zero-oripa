import assert from 'node:assert/strict';
import {playGame,streamGame} from '../docs/test-games/index.js?v=live111';
import {round,streamRound} from '../docs/tropical.mjs';
import {plinkoConfig} from '../docs/test-games/plinko.js';
const rng=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
const cases=['mine','rush','gods','dogs','fruit','dwarf','tropical','plinko-low','plinko-medium','plinko-high','dogs-raining'];
function args(name,rand,rate=10000){return {rate,rand,withScript:true,strategy:name==='dogs-raining'?'raining':'sticky',risk:name.startsWith('plinko-')?name.slice(7):'medium',count:1}}
const kind=name=>name.startsWith('plinko')?'plinko':name==='dogs-raining'?'dogs':name;
for(const name of cases){
 let calls=0;const rand=rng(1234),counting=()=>{calls++;return rand()};
 const opts=args(name,counting),it=name==='tropical'?streamRound(opts.rate,opts):streamGame(kind(name),opts);
 const entry=it.next(),afterEntry=calls;
 assert.equal(entry.done,false,name+' entry');
 assert.equal(entry.value.score,undefined,name+' no final score at entry');
 const first=it.next();assert.equal(first.done,false);assert.ok(calls>afterEntry,name+' draws during next spin');
 let result,steps=[first.value];while(!(result=it.next()).done)steps.push(result.value);
 const result2=name==='tropical'?round(opts.rate,args(name,rng(1234))):playGame(kind(name),args(name,rng(1234)));
 assert.equal(result.value.score,result2.score,name+' deterministic final amount');assert.deepEqual(steps,result2.steps??result2.spins,name+' same spin stream');
 assert.ok(Number.isInteger(result.value.score)&&result.value.score>=1);
 if(name==='mine')assert.equal(result.value.score,Math.max(1,Math.min(Math.floor(result.value.final.raw),opts.rate*50)));
 else if(name!=='tropical')assert.equal(result.value.score,Math.max(1,(entry.value.entry?.win??0)+steps.reduce((sum,sp)=>sum+sp.win,0)),name+' ledger');
 console.log(name+' stream OK');
}
const selected=process.argv[2],N=Number(process.argv[3]||0);
if(N&&selected){
 const name=selected,rand=rng(0x9e3779b9),values=new Float64Array(N);let sum=0,squares=0,recoup=0,high=0;
 for(let i=0;i<N;i++){const opts={...args(name,rand),withScript:false};const x=(name==='tropical'?round(opts.rate,opts):playGame(kind(name),opts)).score/opts.rate;assert.ok(Number.isFinite(x));values[i]=x;sum+=x;squares+=x*x;recoup+=x>=1;high+=x>=5;}
 values.sort();const mean=sum/N,sd=Math.sqrt(squares/N-mean*mean);
 console.log(JSON.stringify({name,N,rtp:mean*100,sd,median:values[Math.floor(N/2)],recoup:recoup/N,high:high/N,ci95:1.96*sd/Math.sqrt(N)*100}));
}
for(const risk of ['low','medium','high']){const c=plinkoConfig(12,risk),rtp=c.probabilities.reduce((s,p,i)=>s+p*c.multipliers[i],0);assert.ok(Math.abs(rtp-.97)<.002);console.log('PLINKO exact',risk,rtp*100);}
