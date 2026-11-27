// DAIFUGO prototype: all 32 dealt cards fixed; all remaining cards unused.
// Card ID 0..51: rank 3..2 (0..12), suit 0..3. No jokers.
export const VERSION='df-fixed-v1';
export const CPU_VERSION='weakest-largest-v1';
export const rank=c=>c>>2, suit=c=>c&3;
export const mask=cards=>cards.reduce((n,c)=>n|(1<<suit(c)),0);
export const label=c=>['3','4','5','6','7','8','9','10','J','Q','K','A','2'][rank(c)]+['♠','♥','♦','♣'][suit(c)];
export function validate(hands){if(hands.length!==4||hands.some(h=>h.length!==8))throw Error('8 cards each required');const a=hands.flat();if(new Set(a).size!==32||a.some(c=>!Number.isInteger(c)||c<0||c>=52))throw Error('invalid deck');}
export function start(hands,turn=0){validate(hands);if(!Number.isInteger(turn)||turn<0||turn>3)throw Error('invalid starter');return {h:hands.map(h=>[...h].sort((a,b)=>a-b)),turn,rev:false,field:null,lock:0,passed:0,finish:[]};}
const alive=(s,p)=>s.h[p].length>0;
const next=(s,p,skip=0)=>{for(let i=1;i<=4;i++){let q=(p+i)%4;if(alive(s,q)&&!(skip&(1<<q)))return q}return -1};
const strength=(r,rev)=>rev?12-r:r;
export function legal(s){if(s.finish.length===4)return [];let h=s.h[s.turn],out=[];for(let r=0;r<13;r++){let group=h.filter(c=>rank(c)===r);for(let bits=1;bits<(1<<group.length);bits++){let a=group.filter((_,i)=>bits&(1<<i));if(s.field&&(a.length!==s.field.n||strength(r,s.rev)<=strength(s.field.r,s.rev)||(s.lock&&mask(a)!==s.lock)))continue;out.push(a)}}if(s.field)out.push([]);return out}
function clear(s,leader){s.field=null;s.lock=0;s.passed=0;s.turn=alive(s,leader)?leader:next(s,leader);}
export function step(state,action){let s={...state,h:state.h.map(h=>h.slice()),field:state.field&&{...state.field},finish:[...state.finish]};let p=s.turn, a=[...action].sort((a,b)=>a-b);if(!legal(s).some(x=>x.length===a.length&&x.every((c,i)=>c===a[i])))throw Error('illegal move');if(!a.length){s.passed|=1<<p;let q=next(s,p,s.passed|(1<<s.field.owner));if(q<0)clear(s,s.field.owner);else s.turn=q;return s;}
let r=rank(a[0]),m=mask(a),prev=s.field;s.h[p]=s.h[p].filter(c=>!a.includes(c));if(a.length===4)s.rev=!s.rev;if(!s.h[p].length)s.finish.push(p);
if(s.finish.length===3){s.finish.push(s.h.findIndex(h=>h.length));return s;}
s.field={r,n:a.length,m,owner:p,cards:a};if(!s.lock&&prev&&prev.m===m)s.lock=m;
if(r===5){clear(s,p);return s}
let q=next(s,p,s.passed|(1<<p));if(q<0)clear(s,p);else s.turn=q;return s;}
export function cpu(s){let moves=legal(s).filter(a=>a.length);if(!moves.length)return [];return moves.sort((a,b)=>b.length-a.length||strength(rank(a[0]),s.rev)-strength(rank(b[0]),s.rev)||mask(a)-mask(b))[0];}
export function key(s){return [s.h.map(h=>h.join('.')).join('/'),s.turn,+s.rev,s.field? [s.field.r,s.field.n,s.field.m,s.field.owner].join('.'):'-',s.lock,s.passed,s.finish.join('.')].join('|')}
export function verify(hands,starter=0,{limit=500000}={}){let memo=new Map(),nodes=0,edges=0,terminals=0;try{function walk(s){const pos=s.finish.indexOf(0);if(pos>=0){terminals++;return 1<<pos;}const k=key(s);if(memo.has(k))return memo.get(k);if(++nodes>limit)throw Error('budget');let choices=s.turn===0?legal(s):[cpu(s)],bits=0;for(let a of choices){edges++;bits|=walk(step(s,a));}memo.set(k,bits);return bits;}let bits=walk(start(hands,starter)),ranks=[1,2,3,4].filter(r=>bits&(1<<(r-1)));return {complete:true,ranks,best:ranks[0],nodes,edges,terminals,version:VERSION,cpu:CPU_VERSION};}catch(e){if(e.message!=='budget')throw e;return {complete:false,nodes,edges,terminals,version:VERSION,cpu:CPU_VERSION};}}
export function deal(rand=Math.random){let d=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){let j=Math.floor(rand()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return Array.from({length:4},(_,i)=>d.slice(i*8,i*8+8).sort((a,b)=>a-b));}

// Additional acceptance criterion for an enjoyable fixed-hand demo:
// at least one legal path contains a player multiplet and an 8-cut.
export function verifyPlayability(hands,starter,{limit=100000}={}){
 const visited=new Set();let nodes=0,exhausted=false;
 function walk(s,flags){if(s.finish.includes(0))return flags===3;if(++nodes>limit){exhausted=true;return false;}let k=key(s)+'|'+flags;if(visited.has(k))return false;visited.add(k);let p=s.turn,choices=p===0?legal(s):[cpu(s)];choices.sort((a,b)=>(b.length>=2?2:0)+(b.some(c=>rank(c)===5)?1:0)-(a.length>=2?2:0)-(a.some(c=>rank(c)===5)?1:0));for(let a of choices){let f=flags;if(p===0){if(a.length===2)f|=1;if(a.some(c=>rank(c)===5))f|=2;}if(walk(step(s,a),f))return true;if(exhausted)return false;}return false;}
 const h=hands[0],pair=h.some((c,i)=>h.some((d,j)=>j!==i&&rank(c)===rank(d))),eight=h.some(c=>rank(c)===5);
 return {pair,eight,reachable:pair&&eight&&walk(start(hands,starter),0),nodes,exhausted};
}
