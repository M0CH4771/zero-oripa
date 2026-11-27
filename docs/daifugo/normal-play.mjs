import {cpu,key,legal,rank,start,step} from './engine.mjs';

// Three deterministic, non-passing-when-playable sample strategies.
export const policies=['weakest-largest','preserve-groups','save-eights'];
export function normalMove(s,policy='weakest-largest') {
  if(policy===policies[0])return cpu(s);
  const moves=legal(s).filter(a=>a.length);
  if(!moves.length)return [];
  const strength=a=>s.rev?12-rank(a[0]):rank(a[0]);
  const splits=a=>s.h[s.turn].filter(c=>rank(c)===rank(a[0])).length-a.length;
  const score=a=>policy===policies[1]
    ? -18*a.length+10*splits(a)+strength(a)
    : -18*a.length+strength(a)+(rank(a[0])===5?8:0);
  return moves.sort((a,b)=>score(a)-score(b)||a[0]-b[0])[0];
}
export function normalRanks(hands,starter){
  return policies.map(policy=>{let s=start(hands,starter);while(!s.finish.includes(0))s=step(s,s.turn===0?normalMove(s,policy):cpu(s));return s.finish.indexOf(0)+1;});
}
// Stress test: occasionally choose another legal non-pass action instead of the baseline.
export function variedMatches(hands,starter,target,{runs=30,seed=19,deviation=.15}={}){
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  let matches=0;
  for(let i=0;i<runs;i++){
    let s=start(hands,starter);
    while(!s.finish.includes(0)){
      let a=cpu(s);
      if(s.turn===0&&random()<deviation){const options=legal(s).filter(a=>a.length);if(options.length)a=options[Math.floor(random()*options.length)];}
      s=step(s,a);
    }
    if(s.finish.indexOf(0)+1===target)matches++;
  }
  return matches;
}
// Optional player hint: search for a normal route to the disclosed test rank.
// Never changes the cards, rules, CPU, or the move actually selected by the player.
export function targetHint(s,target,{limit=30000}={}){
  const fallback=cpu(s),memo=new Map();let nodes=0;
  const choices=state=>{if(state.turn!==0)return [cpu(state)];const moves=legal(state),preferred=cpu(state);return [preferred,...moves.filter(a=>a.length&&a.join(',')!==preferred.join(','))];};
  function canReach(state){const pos=state.finish.indexOf(0);if(pos>=0)return pos+1===target;const k=key(state);if(memo.has(k))return memo.get(k);if(++nodes>limit)throw Error('hint-budget');const answer=choices(state).some(a=>canReach(step(state,a)));memo.set(k,answer);return answer;}
  try{return choices(s).find(a=>canReach(step(s,a)))??fallback;}catch(e){if(e.message!=='hint-budget')throw e;return fallback;}
}
