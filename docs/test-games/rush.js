// RUSH（スロット型ゲームオリパ）のエンジン
// ボーナス専用。10フリースピンから開始、6×5、どこでも8個以上で連鎖。
// 倍率オーブが出現し、3個以上のスキャッターで5回追加。
// テストコイン専用の独立抽選。
// 抽選はすべてサーバーで行い、クライアントには結果の台本（script）を渡して再生させる。

import { picker, secureRandom, MAX_SPINS, BONUS_BUY_MULT, bonusEntry } from './common.js';

export const COLS = 6, ROWS = 5, CELLS = COLS * ROWS;
const PAY_SYMS = ['l1', 'l2', 'l3', 'l4', 'l5', 'h1', 'h2', 'h3', 'h4'];

// 配当表（1スピンあたりの賭け＝レート÷10 の何倍か）。[8〜9個, 10〜11個, 12個以上]
export const PAYS = {
  l1: [0.25, 0.75, 2], l2: [0.4, 0.9, 4], l3: [0.5, 1, 5], l4: [0.8, 1.2, 8],
  l5: [1, 1.5, 10], h1: [1.5, 2, 12], h2: [2, 5, 15], h3: [2.5, 10, 25], h4: [10, 25, 50],
};

// 荒さ（ボラティリティ）ごとの設定。scale はシミュレーションで還元率がほぼ 90% になるよう合わせた値
export const VOLATILITY = {
  mild: {
    label: 'マイルド', bolt: 2,
    weights: { l1: 28, l2: 25, l3: 20, l4: 14, h1: 8, h2: 6, h3: 4, h4: 2, S: 1.6 },
    bombP: 0.006, bombs: [[2, 40], [3, 30], [4, 15], [5, 10], [10, 5]],
    scale: 0.217,
  },
  normal: {
    label: '通常', bolt: 3,
    weights: { l1: 22, l2: 20, l3: 18, l4: 16, h1: 11, h2: 8, h3: 6, h4: 3, S: 1.6 },
    bombP: 0.004, bombs: [[2, 30], [3, 25], [4, 15], [5, 12], [10, 8], [15, 4], [20, 3], [25, 2], [50, 0.8], [100, 0.2]],
    scale: 0.444,
  },
  extreme: {
    label: '極', bolt: 5,
    weights: { l1: 18, l2: 17, l3: 16, l4: 15, h1: 12, h2: 10, h3: 8, h4: 5, S: 1.3 },
    bombP: 0.003, bombs: [[5, 30], [10, 30], [25, 20], [50, 12], [100, 8]],
    scale: 0.441,
  },
};


// 1マス分の絵柄（ボムは 'B倍率'）
function makeCellGen(v, rand, bonus = false) {
  const pick = picker({...v.weights,l5:v.weights.h1*.85}, rand);
  const {S:_, ...ordinary}=v.weights;
  const pickOrdinary=picker({...ordinary,l5:v.weights.h1*.85},rand);
  const bombPick = picker({2:30,3:25,4:15,5:12,6:8,8:6,10:5,12:4,15:3,20:2,25:1.5,50:.8,100:.2}, rand);
  return (allowScatter=true,above=null) => {
    if(PAYS[above] && rand() < (v.stackP??.315))return above;
    return bonus && rand() < (v.featureBombP??.045) ? 'B' + bombPick() : (allowScatter?pick():pickOrdinary());
  };
}

function payIndex(n) { return n >= 12 ? 2 : n >= 10 ? 1 : 0; }

// 1スピン分を実行。返り値は再生用の台本と、そのスピンの配当（賭け単位）
function runSpin(cellGen) {
  let scatterColumns=new Array(COLS).fill(false);
  let grid=[];for(let i=0;i<CELLS;i++){const c=i%COLS,s=cellGen(!scatterColumns[c],grid[i-COLS]);if(s==='S')scatterColumns[c]=true;grid.push(s);}
  const first = grid.slice();
  const steps = [];
  let raw = 0;
  for (let guard = 0; guard < 50; guard++) {
    const counts = {};
    grid.forEach((s) => { if (PAYS[s]) counts[s] = (counts[s] || 0) + 1; });
    const wins = Object.keys(counts).filter((s) => counts[s] >= 8);
    if (!wins.length) break;
    const hits = [];
    let pay = 0;
    for (const s of wins) {
      pay += PAYS[s][payIndex(counts[s])];
      grid.forEach((x, i) => { if (x === s) hits.push(i); });
    }
    raw += pay;
    // 重力：列ごとに残ったものを下に詰め、上に新しい絵柄
    const hitSet = new Set(hits);
    const next = grid.slice();
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      const keep = [];
      for (let r = 0; r < ROWS; r++) { const i = r * COLS + c; if (!hitSet.has(i)) keep.push(grid[i]); }
      if (keep.length === ROWS) continue;
      cols.push(c);
      let hasScatter=keep.includes('S');
      const fresh=[];while(fresh.length<ROWS-keep.length){const s=cellGen(!hasScatter,fresh.at(-1));if(s==='S')hasScatter=true;fresh.push(s);}
      [...fresh, ...keep].forEach((s, r) => (next[r * COLS + c] = s));
    }
    steps.push({ hits, syms: wins, pay, grid: next, cols });
    grid = next;
  }
  const bombs = [];
  grid.forEach((s, i) => { if (s[0] === 'B') bombs.push({ pos: i, mult: parseInt(s.slice(1), 10) }); });
  const mult = raw > 0 && bombs.length ? bombs.reduce((a, b) => a + b.mult, 0) : 1;
  const scatters = grid.filter((s) => s === 'S').length;
  return { first, steps, bombs, mult, raw: raw * mult, scatters };
}

// 1プレイ（10スピン＋追加）。rate は1プレイの値段（コイン）
export function play({ rate, volatility = 'normal', maxMult = 50, rand = secureRandom, withScript = true }) {
  const v = VOLATILITY[volatility] || VOLATILITY.normal;
  const unit = rate / BONUS_BUY_MULT;
  const payUnit = unit;
  const cap=rate*Math.min(50,maxMult), floor=rate*.1;
  const entry=bonusEntry(COLS,ROWS,4,{...v.weights,l5:v.weights.h1*.85},rand,4);
  entry.initialSpins=10;
  entry.win=Math.min(cap,Math.round(unit*(entry.scatters>=6?100:entry.scatters===5?5:3)));
  const spins = [];
  let total = entry.win, paid=entry.win, left = entry.initialSpins, played = 0;
  while (left > 0 && played < MAX_SPINS) {
    left--; played++;
    const s = runSpin(makeCellGen(v,rand,true));
    const add=Math.max(0,Math.min(s.scatters>=3?5:0,MAX_SPINS-played-left));
    left += Math.max(0, add);
    const scatterPay=s.scatters>=6?100*payUnit:s.scatters===5?5*payUnit:s.scatters===4?3*payUnit:0;
    const win = s.raw * payUnit + scatterPay;
    total += win;
    const settled=Math.min(cap,Math.floor(total))-paid;paid+=settled;
    if (withScript) {
      spins.push({
        first: s.first,
        steps: s.steps.map((x) => ({ hits: x.hits, syms: x.syms, pay: Number((x.pay * payUnit).toFixed(4)), grid: x.grid, cols: x.cols })),
        bombs: s.mult > 1 ? s.bombs : [],
        mult: s.mult,
        win: settled,
        add: Math.max(0, add),
        bonus:true, trigger:false, scatters:s.scatters, scatterPay:Math.min(settled,Math.round(scatterPay)),
      });
    }
  }
  const score = Math.max(floor,paid);
  return { score, capped: total > cap, guaranteed:paid<floor, guarantee:score-paid, spins, played, entry, unit };
}

