import {cpu,step} from './engine13.mjs?v=24';

// A valid finish fixes the rank from the top; an invalid finish fixes it from the bottom.
export function playerRank(state){
  if(!state)return null;
  if(state.finish.length===4)return state.finish.indexOf(0)+1;
  if(state.good.includes(0))return state.good.indexOf(0)+1;
  if(state.bad.includes(0))return 4-state.bad.indexOf(0);
  return null;
}

// Only needed to choose the existing fictional revival cast. Never advance the visible table.
export function revivalOrder(state){
  if(playerRank(state)===null)throw Error('Player rank is not fixed');
  let s=state;
  while(s.finish.length<4){if(s.turn===0)throw Error('Unexpected player turn after ranking');s=step(s,cpu(s));}
  return [...s.finish];
}
