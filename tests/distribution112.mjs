import {playGame} from '../docs/test-games/index.js';
import {round} from '../docs/tropical.mjs';
const name=process.argv[2],N=1000000,rate=10000;
let seed=0x9e3779b9;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
const game=name.startsWith('plinko-')?'plinko':name==='dogs-raining'?'dogs':name;
const opts={rate,rand,withScript:false,strategy:name==='dogs-raining'?'raining':'sticky',risk:name.startsWith('plinko-')?name.slice(7):'medium',count:1};
const vals=new Uint32Array(N),counts=[0,0,0,0,0,0,0,0,0];let sum=0,squares=0;
for(let i=0;i<N;i++){const v=(game==='tropical'?round(rate,opts):playGame(game,opts)).score;vals[i]=v;const x=v/rate;sum+=x;squares+=x*x;counts[x<.1?0:x<.5?1:x<1?2:x<2?3:x<5?4:x<10?5:x<20?6:x<50?7:8]++;}
vals.sort();const quant=p=>vals[Math.min(N-1,Math.floor(p*N))];
console.log(JSON.stringify({name,N,rtp:sum/N*100,sd:Math.sqrt(squares/N-(sum/N)**2),min:vals[0],p01:quant(.01),p10:quant(.1),median:quant(.5),p90:quant(.9),p99:quant(.99),p999:quant(.999),max:vals[N-1],maxCount:vals.filter(v=>v===vals[N-1]).length,counts}));
