import {secureRandom} from './common.js';
// Symmetric test-only tables in hundredths; weighted binomial mean is 90%.
const HALF={
 8:{low:[7349,412,20,5,1],medium:[10025,130,9,3,1],high:[11112,30,4,1,0]},
 12:{low:[141327,1600,150,30,9,3,1],medium:[164679,600,70,15,5,2,1],high:[178318,150,20,5,2,1,0]},
 16:{low:[2656213,4500,550,90,20,6,3,1,1],medium:[2808328,2000,220,50,12,3,1,1,0],high:[2903064,600,70,15,4,1,1,0,0]}
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
