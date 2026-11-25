// Original free-test-coin bonus game. All outcomes are drawn before playback.
export const SYMBOLS=['金7','赤7','青7','RESPIN','金マスク','赤マスク','桃マスク','緑マスク','水色マスク','青マスク','赤衣装','紫衣装','桃衣装','赤ピン','紫ピン','緑ピン','青ピン','灰ピン'];
export const PAYS=[5,5,5,.2,20,10,10,6,6,4,6,4,2,1.4,1,.6,.4,.2];
export const LINES=[[3,4,5],[0,1,2],[6,7,8],[0,4,8],[6,4,2]];
export const TIERS=[{name:'HIBISCUS RUSH',seven:2,continue:.65,weight:80,lineChance:.13,retrigger:.006},{name:'SUPER RUSH',seven:1,continue:.85,weight:18,lineChance:.32,retrigger:.012},{name:'ULTIMATE RUSH',seven:0,weight:2,lineChance:.9,retrigger:0}];
const WEIGHTS=[.5,.7,1,1.5,2,3,4,5,6,7,6,8,10,11,12,14,16,18];
const TOTAL=WEIGHTS.reduce((a,b)=>a+b,0);
const draw=(r)=>{let n=r()*(TOTAL-WEIGHTS.slice(0,3).reduce((a,b)=>a+b,0));for(let i=3;i<WEIGHTS.length;i++)if((n-=WEIGHTS[i])<0)return i;return 17;};
const forceLine=(grid,symbol,rand)=>{const line=LINES[Math.floor(rand()*LINES.length)];for(const j of line)grid[j]=symbol;};
const winSymbol=rand=>draw(rand);
export function evaluate(grid){return LINES.flatMap((line,index)=>line.every(j=>grid[j]===grid[line[0]])?[{index,symbol:grid[line[0]],cells:line,pay:PAYS[grid[line[0]]]}]:[]);}
export const CAP=1400,MAX_SPINS=160;
export const UNIT=.03132; // bonus-buy test payout unit
export function round(bet,{rand=Math.random,tier=null,unit=UNIT}={}){
 if(!Number.isInteger(bet)||bet<=0)throw Error('BET');
 const q=rand()*100;let mode=tier??(q<80?0:q<98?1:2),initialTier=mode;
 const entry=Array.from({length:9},()=>draw(rand));entry[3]=entry[4]=entry[5]=TIERS[mode].seven;
 let remain=mode===2?1:8,played=0,raw=0,previous=0,steps=[],set=1;
 while(remain&&played<MAX_SPINS&&previous<bet*CAP){
  const phase=mode,setBefore=set;remain--;played++;const grid=Array.from({length:9},()=>draw(rand));let add=0,continuation=null;
  if(rand()<TIERS[phase].lineChance)forceLine(grid,winSymbol(rand),rand);
  if(phase!==2){const final=remain===0,seven=rand()<(final?TIERS[phase].continue:TIERS[phase].retrigger);if(seven){forceLine(grid,TIERS[phase].seven,rand);add=8;}if(final)continuation={success:seven};remain=Math.min(MAX_SPINS-played,remain+add);if(final&&seven)set++;}
  const wins=evaluate(grid);
  if(phase===2){if(wins.length){remain=Math.min(1,MAX_SPINS-played);continuation={success:true,ultimate:true};}else{mode=1;remain=Math.min(8,MAX_SPINS-played);set++;continuation={success:true,extra:true};}}
  raw+=wins.reduce((s,w)=>s+w.pay,0);
  const total=Math.min(bet*CAP,Math.floor(raw*unit*bet));const win=total-previous;previous=total;
  if(total===bet*CAP)remain=0;
  steps.push({grid,wins,win,total,remain,played,add,continuation,mode,phase,set:setBefore});
 }
 return {entry,tier:initialTier,entryWin:0,steps,score:Math.max(1,previous),raw};
}
