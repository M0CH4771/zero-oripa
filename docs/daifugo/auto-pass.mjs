// Forced pass only. A legal, nonempty move always remains a player decision.
export function shouldAutoPass(state,moves){
  return !!state&&state.turn===0&&state.finish.length<4&&moves.some(a=>a.length===0)&&!moves.some(a=>a.length>0);
}
