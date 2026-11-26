// Independent, non-redeemable test-credit arcade simulation.
import {secureRandom} from './test-games/common.js';
export const SYMBOLS=['金7','赤7','青7','金の仮面','赤の仮面','緑の仮面','青の仮面','赤のコイン','紫のコイン','緑のコイン','水色のコイン','灰のコイン','紫のダンサー','金のダンサー','桃のダンサー'];
export const PAYS=[0,1.5,1.5,2.5,2,1.8,1.5,1.4,1.2,1.1,1.05,1,1.5,2,1.2];
export const LINES=[[3,4,5],[0,1,2],[6,7,8],[0,4,8],[6,4,2]];
export const TIERS=[{name:'HIBISCUS RUSH',seven:2,continue:.22},{name:'HIBISCUS RUSH SUPER',seven:1,continue:.30},{name:'ULTIMATE RUSH',seven:0}];
export const TIER_PAY_FACTORS=[1,3.2,3.7];
export const lampChance=phase=>1-Math.pow(1-TIERS[phase].continue,1/8);
export const CAP=200,MAX_SPINS=160,UNIT=.03888;
const weights=[2,3,5,7,12,14,16,18,20];
// Each normal reel is a circular, immutable strip. The right reel reverses the adjacent seven pair.
export const REELS=Object.freeze([
 [11,7,10,5,9,11,8,6,10,4,11,9,7,3,10,8,11,1,2,9,10,6,11,8,5,10,9,0,11,7,9,8],
 [10,8,11,6,9,10,7,5,11,4,9,8,10,3,11,7,10,1,2,8,11,9,6,10,5,11,7,0,9,8,10,11],
 [9,11,7,5,10,8,11,6,9,4,10,7,11,3,8,10,9,2,1,11,7,10,6,9,5,11,8,0,10,11,9,8]
].map(Object.freeze));
export const ULTIMATE_STRIP=Object.freeze([12,13,14]);
export const reelWindow=(strip,i,rows=3)=>Array.from({length:rows},(_,j)=>strip[(i+j)%strip.length]);
export const reelStop=(strip,values)=>strip.findIndex((_,i)=>reelWindow(strip,i,values.length).every((v,j)=>v===values[j]));
const windows=REELS.map(strip=>strip.map((_,i)=>reelWindow(strip,i)));
const normalWindows=windows.map(ws=>ws.filter(w=>w.every(v=>v>=3)));
const matches=normalWindows.map(ws=>Array.from({length:12},(_,v)=>ws.filter(w=>w[1]===v)));
const pick=(a,r)=>a[Math.floor(r()*a.length)];
const columnsToGrid=cols=>Array.from({length:9},(_,j)=>cols[j%3][Math.floor(j/3)]);
function sevenGrid(seven,row=1){return columnsToGrid(windows.map(ws=>ws.find(w=>w[row]===seven)));}
function draw(rand){let n=rand()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)if((n-=weights[i])<0)return i+3;return 11;}
const force=(grid,symbol)=>{for(const j of LINES[0])grid[j]=symbol;};
export function evaluate(grid,phase=0){return (phase===2?[[0,1,2]]:LINES).flatMap((line,index)=>line.every(j=>grid[j]===grid[line[0]])?[{index,symbol:grid[line[0]],cells:line,pay:PAYS[grid[line[0]]]}]:[]);}
export function* streamRound(bet,{rand=secureRandom,tier=null,unit=UNIT}={}){
 if(!Number.isInteger(bet)||bet<=0)throw Error('BET');
 const q=rand(),initialTier=tier??(q<.59?0:q<.999?1:2);let mode=initialTier,remain=mode===2?1:8,played=0,raw=0,previous=0,set=1,lit=false;const steps=[];
 const entryLine=mode===1?LINES[1]:LINES[0];
 const entry=mode===2?sevenGrid(0):columnsToGrid([windows[0].find(w=>w[0]===1&&w[1]===2),windows[1].find(w=>w[0]===1&&w[1]===2),windows[2].find(w=>w[mode===1?0:1]===TIERS[mode].seven)]);
 yield {entry,entryLine,tier:initialTier,entryWin:0};
 while(remain>0&&played<MAX_SPINS&&previous<bet*CAP){
  const phase=mode,setBefore=set;remain--;played++;let add=0,continuation=null,grid,justLit=false;
  if(phase===2){grid=Array.from({length:3},()=>12+Math.floor(rand()*3));if(rand()<.9)grid.fill(12+Math.floor(rand()*3));else if(grid.every(x=>x===grid[0]))grid[2]=12+(grid[2]-11)%3;}
  else{let cols=normalWindows.map(ws=>pick(ws,rand));if(rand()<(phase===0?.65:.95)){const target=draw(rand);cols=matches.map(m=>m[target].length?pick(m[target],rand):pick(m[11],rand));}grid=columnsToGrid(cols);if(!lit&&rand()<lampChance(phase)){lit=true;justLit=true;}if(remain===0){const success=lit;if(success){const upgrade=rand()<(phase===0?.024:.021);mode=upgrade?phase+1:phase;grid=sevenGrid(TIERS[mode].seven);add=mode===2?0:8;remain=mode===2?1:8;set++;}continuation={success,upgrade:success&&mode!==phase};}}
  const wins=evaluate(grid,phase).map(w=>({...w,pay:w.pay*TIER_PAY_FACTORS[phase]}));
  if(phase===2){if(wins.length){remain=1;continuation={success:true,ultimate:true};}else{mode=1;remain=8;set++;continuation={success:true,extra:true};}}
  raw+=wins.reduce((s,w)=>s+w.pay,0);const total=Math.min(bet*CAP,Math.floor(raw*unit*bet)),win=total-previous;previous=total;
  if(total===bet*CAP||played===MAX_SPINS)remain=0;
  yield {grid,wins,win,total,remain,played,add,continuation,mode,phase,set:setBefore,lit:phase!==2&&lit,justLit};
  if(continuation)lit=false;
 }
 // A hard limit can truncate a set; do not announce an unreached guaranteed result.

 return {entry,entryLine,tier:initialTier,entryWin:0,steps,score:Math.max(1,previous),raw};
}

export function round(bet,opts){const it=streamRound(bet,opts),start=it.next().value,steps=[];let n;while(!(n=it.next()).done)steps.push(n.value);return {...start,...n.value,steps}}
