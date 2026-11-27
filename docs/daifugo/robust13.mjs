import {start,step,legal,cpu,forbidden,simulate} from './engine13.mjs';

// Every single non-pass, non-forbidden alternative on the baseline route,
// followed by baseline play. This measures resilience, not the rank cap.
export function robustness(x){
  const target=x.target;let state=start(x.hands,x.starter),matches=0,total=0,passMatches=0,passTotal=0;
  function finish(s){while(s.finish.length!==4)s=step(s,cpu(s));return s.finish.indexOf(0)+1;}
  while(state.finish.length!==4){const move=cpu(state);if(state.turn===0){for(const a of legal(state)){if(a.join(',')===move.join(',')||a.length&&forbidden(state,a))continue;const same=finish(step(state,a))===target;if(a.length){total++;matches+=Number(same);}else{passTotal++;passMatches+=Number(same);}}}state=step(state,move);}
  const policies=[0,1,2].map(p=>simulate(x.hands,x.starter,p).rank===target);
  return {matches,total,passMatches,passTotal,policies,score:total?matches/total:1};
}
export function varied(x,{runs=40,seed=12345,deviation=.12}={}){
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let matches=0;
  for(let i=0;i<runs;i++){let s=start(x.hands,x.starter);while(s.finish.length!==4){let a=cpu(s);if(s.turn===0&&rand()<deviation){const choices=legal(s).filter(c=>c.length&&!forbidden(s,c));if(choices.length)a=choices[Math.floor(rand()*choices.length)];}s=step(s,a);}matches+=Number(s.finish.indexOf(0)+1===x.target);}
  return matches;
}
