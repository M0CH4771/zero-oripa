// ゲームの一覧。template.game で選ぶ（省略時は rush）
import {streamRound as tropicalStream,round as tropicalRound} from '../tropical.mjs?v=cap119';
import * as rush from './rush.js?v=cap119';
import * as fruit from './fruit.js?v=live113';
import * as mine from './mine.js?v=items143';
import * as plinko from './plinko.js?v=live113';
import {FEATURE_CONFIG,featureModule} from './features.js?v=adventure131';


const tropical={VOLATILITY:{normal:{}},*stream(opts){const it=tropicalStream(opts.rate,opts);let n=it.next(),played=0;yield n.value;while(!(n=it.next()).done){played++;yield n.value;}return {...n.value,played,freePlayed:played};},play(opts){const r=tropicalRound(opts.rate,opts);return {...r,played:r.steps.length,freePlayed:r.steps.length,spins:r.steps,script:r.steps};}};
export const GAMES = {
  tropical:{label:'ZERO HIBISCUS',theme:'tropical',mod:tropical},
  rush: { label: 'ZERO RUSH', theme: 'gems', mod: rush },
  fruit: { label: 'ZERO FRUITS', theme: 'fruit', mod: fruit },
  mine: { label: 'ZERO MINE', theme: 'mine', mod: mine },
  plinko: { label: 'ZERO PLINKO', theme: 'plinko', mod: plinko },
  ...Object.fromEntries(Object.entries(FEATURE_CONFIG).map(([g,c])=>[g,{label:c.title,theme:g,mod:featureModule(g)}])),
};
export function gameOf(name) { return GAMES[name] || GAMES.rush; }
export function volatilityOf(game, vol) { const g = gameOf(game).mod; return g.VOLATILITY[vol] || g.VOLATILITY.normal; }
export const GAME_VOLATILITY={mine:2,rush:3,gods:4,tropical:3,dogs:4,fruit:5,dwarf:4};
const options=(game,opts)=>({...opts,volatility:game==='mine'?'mild':game==='fruit'?'extreme':'normal'});
export function playGame(game,opts){return gameOf(game).mod.play(options(game,opts));}
export function streamGame(game,opts){return gameOf(game).mod.stream(options(game,opts));}

// スコアから景品の段階を決める。tiers は [{min: レートの何倍以上, rank, name}] を小さい順
export function tierFor(tiers, score, rate) {
  let t = tiers[0];
  for (const x of tiers) if (score >= x.min * rate) t = x;
  return t;
}
