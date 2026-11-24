// FRUIT：7×7の盤面。同じ絵柄が縦横に5個以上つながると配当（クラスター）→消えて落ちてくる。
// 消えたマスには印が付き、もう一度そこで消えると倍率スポット（×2→×4→…→×128）になる。
// クラスターの配当には、その上にある倍率スポットの合計が掛かる。
// 通常は各スピンでリセット、フリースピン中はボーナス全体で引き継ぐ。
import { picker, secureRandom, MAX_SPINS, BONUS_BUY_MULT, bonusEntry, FRUIT_AWARDS } from './common.js';

export const SIZE = 7, CELLS = SIZE * SIZE;
export const PAYS = { // 5〜15+個、基準ベット倍率
  f1: [.2,.25,.3,.4,.5,1,1.5,2.5,5,10,20],
  f2: [.25,.3,.4,.5,.75,1.25,2,3,6,12,25],
  f3: [.3,.4,.5,.75,1,1.5,2.5,3.5,8,15,30],
  f4: [.4,.5,.75,1,1.25,2,3,5,10,20,40],
  f5: [.5,.75,1,1.25,1.5,3,4.5,10,20,40,60],
  f6: [.75,1,1.25,1.5,2,4,6,12.5,30,60,100],
  f7: [1,1.5,1.75,2,2.5,5,7.5,15,35,70,150],
};
const bucket = n => Math.min(10,n-5);

export const VOLATILITY = {
  mild: { label: 'マイルド', bolt: 2, weights: { f1: 24, f2: 22, f3: 18, f4: 14, f5: 10, f6: 7, f7: 4, S: 1.1 }, keepSpots: false, maxSpot: 16, scale: 4.2 },
  normal: { label: '通常', bolt: 3, weights: { f1: 28, f2: 26.6, f3: 17, f4: 15, f5: 12, f6: 9, f7: 6, S: 1.2 }, keepSpots: false, maxSpot: 128, scale: 7.09 },
  extreme: { label: '極', bolt: 5, weights: { f1: 17, f2: 17, f3: 16, f4: 15, f5: 13, f6: 11, f7: 8, S: 1.0 }, keepSpots: true, maxSpot: 128, scale: 5.36 },
};

function clustersOf(grid) {
  const seen = new Uint8Array(CELLS);
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (seen[i] || !PAYS[grid[i]]) continue;
    const sym = grid[i], stack = [i], cells = [];
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop();
      cells.push(k);
      const r = Math.floor(k / SIZE), c = k % SIZE;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        const n = nr * SIZE + nc;
        if (!seen[n] && grid[n] === sym) { seen[n] = 1; stack.push(n); }
      }
    }
    if (cells.length >= 5) out.push({ sym, cells });
  }
  return out;
}

export function play({ rate, volatility = 'normal', maxMult = 50, rand = secureRandom, withScript = true }) {
  const v = VOLATILITY[volatility] || VOLATILITY.normal;
  const unit = rate / BONUS_BUY_MULT;
  const payUnit=unit;
  const cap=rate*Math.min(50,maxMult),floor=rate*.1;
  const entry=bonusEntry(SIZE,SIZE,3,v.weights,rand);
  entry.initialSpins=FRUIT_AWARDS[entry.scatters];
  entry.win=0;
  const pick = picker(v.weights, rand);
  const {S:_,...ordinary}=v.weights;
  const pickOrdinary=picker(ordinary,rand);
  let spots = new Array(CELLS).fill(0); // 0=なし 1=印 2以上=倍率
  const spins = [];
  let total = 0, paid=0, left = entry.initialSpins, played = 0;
  while (left > 0 && played < MAX_SPINS && paid < cap) {
    left--; played++;
    const scatterColumns=new Array(SIZE).fill(false);
    let grid=Array.from({length:CELLS},(_,i)=>{const c=i%SIZE,s=scatterColumns[c]?pickOrdinary():pick();if(s==='S')scatterColumns[c]=true;return s;});
    const first = grid.slice();
    const startSpots = spots.slice();
    const steps = [];
    let raw = 0;
    for (let guard = 0; guard < 60; guard++) {
      const cl = clustersOf(grid);
      if (!cl.length) break;
      const hits = new Set();
      const wins = cl.map((x) => {
        const base = PAYS[x.sym][bucket(x.cells.length)];
        const m = x.cells.reduce((s, k) => s + (spots[k] ? Math.min(128, spots[k]*2) : 0), 0);
        x.cells.forEach((k) => hits.add(k));
        return { sym: x.sym, cells: x.cells, base, mult: m || 1, pay: base * (m || 1) };
      });
      const pay = wins.reduce((s, w) => s + w.pay, 0);
      raw += pay;
      // 倍率スポットを育てる
      for (const k of hits) spots[k] = spots[k] === 0 ? 1 : Math.min(128, spots[k] * 2);
      // 重力
      const next = grid.slice(), cols = [];
      for (let c = 0; c < SIZE; c++) {
        const keep = [];
        for (let r = 0; r < SIZE; r++) { const i = r * SIZE + c; if (!hits.has(i)) keep.push(grid[i]); }
        if (keep.length === SIZE) continue;
        cols.push(c);
        let hasScatter=keep.includes('S');
        const fresh=Array.from({length:SIZE-keep.length},()=>{const s=hasScatter?pickOrdinary():pick();if(s==='S')hasScatter=true;return s;});
        [...fresh, ...keep].forEach((s, r) => (next[r * SIZE + c] = s));
      }
      steps.push({ wins: wins.map((w) => ({ sym: w.sym, cells: w.cells, mult: w.mult, base: Number((w.base*payUnit).toFixed(4)), pay: Number((w.pay * payUnit).toFixed(4)) })), credited:Math.min(cap,Math.floor(total+raw*payUnit))-paid, spots: spots.slice(), grid: next, cols });
      grid = next;
      if(total+raw*payUnit>=cap)break;
    }
    const scat = grid.filter((s) => s === 'S').length;
    const add=total+raw*payUnit>=cap?0:Math.max(0,Math.min(FRUIT_AWARDS[scat]||0,MAX_SPINS-played-left));
    left += add;
    const win = raw * payUnit;
    total += win;
    const settled=Math.min(cap,Math.floor(total))-paid;paid+=settled;
    if (withScript) spins.push({ first, spots: startSpots, steps, win: settled, add, bonus:true, trigger:false, scatters:scat });
  }
  const score = Math.max(floor,paid);
  return { score, capped: total >= cap, guaranteed:paid<floor, guarantee:score-paid, spins, played, entry, unit };
}
