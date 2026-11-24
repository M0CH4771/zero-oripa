// ゲーム共通の道具
const randomWords=new Uint32Array(1024);
let nextWord=randomWords.length;
export function secureRandom() {
  if(nextWord===randomWords.length){crypto.getRandomValues(randomWords);nextWord=0;}
  return randomWords[nextWord++]/4294967296;
}
export function picker(weights, rand) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  return () => {
    let r = rand() * total;
    for (const k of keys) { r -= weights[k]; if (r < 0) return k; }
    return keys[keys.length - 1];
  };
}
export const BASE_SPINS = 10;
export const MAX_SPINS = 120;
export const BONUS_BUY_MULT = 100;
export const FRUIT_AWARDS = {3:10,4:12,5:15,6:20,7:30};
// Guaranteed entry tableau, separate from the feature spins.
export function bonusEntry(cols,rows,min,weights,rand,max=cols){
  const {S,...ordinary}=weights;
  const pick=picker(ordinary,rand);
  const grid=Array.from({length:cols*rows},()=>pick());
  const columns=Array.from({length:cols},(_,i)=>i);
  // Independent demo distribution; original reel strips are not available.
  let count=min;
  while(count<max && rand()<0.12)count++;
  for(let i=0;i<count;i++){
    const j=i+Math.floor(rand()*(cols-i));
    [columns[i],columns[j]]=[columns[j],columns[i]];
    grid[Math.floor(rand()*rows)*cols+columns[i]]='S';
  }
  return {grid,scatters:count};
}
export function extraSpins(scatters) { return scatters >= 5 ? 5 : scatters === 4 ? 3 : scatters === 3 ? 2 : 0; }
