// Independent, non-redeemable test-credit arcade simulation.
export const SYMBOLS=['金7','赤7','青7','金の仮面','赤の仮面','緑の仮面','青の仮面','赤のコイン','紫のコイン','緑のコイン','水色のコイン','灰のコイン','紫のダンサー','金のダンサー','桃のダンサー'];
export const PAYS=[0,5,5,20,10,6,4,1.4,1,.6,.4,.2,4,6,2];
export const LINES=[[3,4,5],[0,1,2],[6,7,8],[0,4,8],[6,4,2]];
export const TIERS=[{name:'HIBISCUS RUSH',seven:2,continue:.65},{name:'HIBISCUS RUSH SUPER',seven:1,continue:.85},{name:'ULTIMATE RUSH',seven:0}];
export const CAP=200,MAX_SPINS=160,UNIT=.03584;
const weights=[2,3,5,7,12,14,16,18,20];
function draw(rand){let n=rand()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)if((n-=weights[i])<0)return i+3;return 11;}
const force=(grid,symbol)=>{for(const j of LINES[0])grid[j]=symbol;};
export function evaluate(grid,phase=0){return (phase===2?[[0,1,2]]:LINES).flatMap((line,index)=>line.every(j=>grid[j]===grid[line[0]])?[{index,symbol:grid[line[0]],cells:line,pay:PAYS[grid[line[0]]]}]:[]);}
export function round(bet,{rand=Math.random,tier=null,unit=UNIT}={}){
 if(!Number.isInteger(bet)||bet<=0)throw Error('BET');
 const q=rand(),initialTier=tier??(q<.8?0:q<.98?1:2);let mode=initialTier,remain=mode===2?1:8,played=0,raw=0,previous=0,set=1;const steps=[];
 const entry=Array.from({length:9},()=>draw(rand));
 // The two adjacent seven positions are display-only on entry; never change the sampled tier or payout.
 const entryLine=mode===1?LINES[1]:LINES[0];
 if(mode!==2){entry[0]=entry[1]=1;entry[3]=entry[4]=2;entry[entryLine[2]]=TIERS[mode].seven;}else force(entry,0);
 while(remain>0&&played<MAX_SPINS&&previous<bet*CAP){
  const phase=mode,setBefore=set;remain--;played++;let add=0,continuation=null,grid;
  if(phase===2){grid=Array.from({length:3},()=>12+Math.floor(rand()*3));if(rand()<.9)grid.fill(12+Math.floor(rand()*3));else if(grid.every(x=>x===grid[0]))grid[2]=12+(grid[2]-11)%3;}
  else{grid=Array.from({length:9},()=>draw(rand));if(rand()<(phase===0?.13:.32))force(grid,draw(rand));if(remain===0){const success=rand()<TIERS[phase].continue;if(success){const upgrade=rand()<(phase===0?.024:.021);mode=upgrade?phase+1:phase;force(grid,TIERS[mode].seven);add=mode===2?0:8;remain=mode===2?1:8;set++;}continuation={success,upgrade:success&&mode!==phase};}}
  const wins=evaluate(grid,phase);
  if(phase===2){if(wins.length){remain=1;continuation={success:true,ultimate:true};}else{mode=1;remain=8;set++;continuation={success:true,extra:true};}}
  raw+=wins.reduce((s,w)=>s+w.pay,0);const total=Math.min(bet*CAP,Math.floor(raw*unit*bet)),win=total-previous;previous=total;
  if(total===bet*CAP||played===MAX_SPINS)remain=0;
  steps.push({grid,wins,win,total,remain,played,add,continuation,mode,phase,set:setBefore});
 }
 return {entry,entryLine,tier:initialTier,entryWin:0,steps,score:Math.max(1,previous),raw};
}
