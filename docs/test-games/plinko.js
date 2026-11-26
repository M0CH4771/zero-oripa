import {secureRandom} from './common.js';
// Symmetric test-only tables in hundredths; weighted binomial mean is about 97%.
const HALF={
 12:{low:[3000,480,235,135,110,78,62],medium:[5000,1285,455,208,120,44,18],high:[20000,3995,655,163,78,16,1]}
};
export function plinkoConfig(rows=12,risk='medium'){
 const half=HALF[rows]?.[risk];
 if(!half)throw Error('段数または荒さが無効です');
 const cents=[...half,...half.slice(0,-1).reverse()];
 let ways=1;
 const probabilities=cents.map((_,i)=>{if(i)ways=ways*(rows-i+1)/i;return ways/2**rows});
 return {rows:Number(rows),risk,multipliers:cents.map(x=>x/100),cents,probabilities};
}
export const MULTIPLIERS=plinkoConfig().multipliers;
export const VOLATILITY={normal:{label:'通常',bolt:3}};
export function* stream({rate,rand=secureRandom,count=1,rows=12,risk='medium'}){
 if(!Number.isInteger(count)||count<1||count>1000)throw Error('球数は1〜1,000個');
 const cfg=plinkoConfig(rows,risk);
 yield {played:count,multipliers:cfg.multipliers,rows:cfg.rows,risk:cfg.risk};
 let paid=0;for(let i=0;i<count;i++){
   const path=Array.from({length:cfg.rows},()=>rand()<.5?0:1);
   const slot=path.reduce((a,b)=>a+b,0),mult=cfg.multipliers[slot];
   const win=Math.round(rate*cfg.cents[slot]/100);paid+=win;yield {path,slot,mult,win};
 }
 return {score:Math.max(1,paid),guarantee:paid===0?1:0,played:count,multipliers:cfg.multipliers,rows:cfg.rows,risk:cfg.risk};
}

export function play(opts){const it=stream(opts),start=it.next().value,spins=[];let n;while(!(n=it.next()).done)if(opts.withScript!==false)spins.push(n.value);return {...start,...n.value,spins}}
