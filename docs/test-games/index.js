// ゲームの一覧。template.game で選ぶ（省略時は rush）
import * as rush from './rush.js?v=min70';
import * as fruit from './fruit.js?v=min70';
import * as mine from './mine.js?v=min70';
import * as plinko from './plinko.js?v=min70';
import {FEATURE_CONFIG,featureModule} from './features.js?v=dwarf72';

import {hasFeature} from './bonus-round.js';
import {secureRandom} from './common.js';

export const GAMES = {
  rush: { label: 'ZERO RUSH', theme: 'gems', mod: rush },
  fruit: { label: 'ZERO FRUITS', theme: 'fruit', mod: fruit },
  mine: { label: 'ZERO MINE', theme: 'mine', mod: mine },
  plinko: { label: 'ZERO PLINKO', theme: 'plinko', mod: plinko },
  ...Object.fromEntries(Object.entries(FEATURE_CONFIG).map(([g,c])=>[g,{label:c.title,theme:g,mod:featureModule(g)}])),
};
export function gameOf(name) { return GAMES[name] || GAMES.rush; }
export function volatilityOf(game, vol) { const g = gameOf(game).mod; return g.VOLATILITY[vol] || g.VOLATILITY.normal; }
export function playGame(game, opts) { const mod=gameOf(game).mod;
  // DWARF uses its actual weighted combat distribution. Do not select rounds
  // by payout, which would bias the observed battle win rate.
  if(game==='plinko'||game==='dwarf')return mod.play(opts);
  const target=opts.rate*.97,rand=opts.rand||secureRandom;
  let low,high;
  // Both candidates are complete native rounds. Their weighted mean is the
  // target even when the DOGS entry or strategy was selected in advance.
  for(let attempt=0;attempt<2048;attempt++){
    const round=mod.play({...opts,rand,withScript:true});
    if(round.score!==1&&!hasFeature(game,round))continue;
    if(round.score<=target)low=round;
    if(round.score>=target)high=round;
    if(low&&high){
      const probability=high.score===low.score?0:(target-low.score)/(high.score-low.score);
      const selected=rand()<probability?high:low;
      if(opts.withScript===false)selected.spins=[];
      return selected;
    }
  }
  throw new Error('ボーナスを準備できませんでした。もう一度お試しください。'); }

// スコアから景品の段階を決める。tiers は [{min: レートの何倍以上, rank, name}] を小さい順
export function tierFor(tiers, score, rate) {
  let t = tiers[0];
  for (const x of tiers) if (score >= x.min * rate) t = x;
  return t;
}
