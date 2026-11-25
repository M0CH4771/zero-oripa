import {secureRandom} from './common.js';
// Symmetric test-only tables in hundredths; weighted binomial mean is 90%.
const HALF={
 12:{low:[1101,300,180,120,95,80,67],medium:[2920,1000,400,200,100,45,30],high:[9643,3000,700,200,73,15,1]}
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
export function play({rate,rand=secureRandom,count=1,rows=12,risk='medium'}){
 if(!Number.isInteger(count)||count<1||count>1000)throw Error('球数は1〜1,000個');
 const cfg=plinkoConfig(rows,risk);
 const spins=Array.from({length:count},()=>{
   const path=Array.from({length:cfg.rows},()=>rand()<.5?0:1);
   const slot=path.reduce((a,b)=>a+b,0),mult=cfg.multipliers[slot];
   return {path,slot,mult,win:Math.round(rate*cfg.cents[slot]/100)};
 });
 const paid=spins.reduce((a,s)=>a+s.win,0);return {score:Math.max(1,paid),guarantee:paid===0?1:0,played:count,spins,multipliers:cfg.multipliers,rows:cfg.rows,risk:cfg.risk};
}
