// DIG（採掘）
// 盤面：5列×5段のブロック。いちばん下に宝箱が5つ（倍率は抽選設定に従う。開ける前から色で倍率がわかる）。
// 上に 5列×3段 のスロット枠があり、スピンごとにアイテムが止まる。
//   つるはし（1・2・3・5・7回）… 同じ列の真下のブロックを、数字の回数ぶん上から削る（壊れたら次のブロックへ）
//   強化の書 … 同じ列のつるはしを全部 5回 に
//   超強化の書 … めったに出ない。同じ列のつるはしを全部 7回 に
//   ダイナマイト … 全ブロックへ2ダメージ
//   巨大ドリル … 同列の残存ブロックを破壊
//   連鎖爆弾 … ランダムな残存3ブロックに2ダメージ
//   宝箱強化結晶 … 全宝箱の倍率を+1（開封済みも含む）
//   スタークリスタル … 1個につきスピンが1回増える
// ブロックを壊すと配当（賭けに対する倍率）。爆発鉱石は壊れると周り8マスに2ダメージ（連鎖する）。
// 1列を下まで掘り切るとその列の宝箱が開き、開いた宝箱の倍率は掛け算（×2 と ×4 なら ×8）で、最後に配当の合計に掛かる。
// 最初の採掘＋4スピン（＝5回）。盤面の掘れ具合は最後まで引き継ぐ。
import { picker, secureRandom } from './common.js';

export const COLS = 5, ROWS = 5, REEL_ROWS = 3;
export const FIRST_SPINS = 5, MAX_SPINS = 20;
export const MIN_PAY = 1; // 1ゲームあたりの最低配当C

// hp：何回削ると壊れるか / v：賭け（1プレイの消費コイン）に対する配当
export const BLOCKS = {
  D: { name: '土', hp: 1, v: .001 },
  T: { name: '石', hp: 2, v: .005 },
  I: { name: '鉄', hp: 3, v: .01 },
  G: { name: '金', hp: 4, v: .03 },
  X: { name: 'ダイヤ', hp: 5, v: .05 },
  R: { name: '虹鉱石', hp: 6, v: .25 },
  E: { name: '爆発鉱石', hp: 2, v: 0.005 },
  Q: { name: 'ハテナ', hp: 4, v: 0 },
};
// ハテナの中身（賭けに対する倍率）
export const MILD_PAY = {D:.001,T:.005,I:.01,G:.03,X:.05,R:.25,E:.005,Q:0};
export const MILD_Q_PAY={.005:35,.01:30,.03:20,.05:12,.25:0.1};


// 段ごとの出やすさ（上 → 下）
const ROW_ORES = [{D:100},{T:100},{I:55,G:15,E:30},{I:42,G:26,X:8,E:16,Q:8},{I:28,G:30,X:24,R:0.2,E:9.8,Q:8}];

// スロット枠に止まるもの（1マスごと）
//   0=空き p1..p7=つるはし b/g=強化の書 n=ダイナマイト s=スター d=巨大ドリル l=連鎖爆弾 m=宝箱強化
export const VOLATILITY = {
  mild: {
    label: 'マイルド', bolt: 2,
    cells: {"0":78.78,"p1":6.8,"p2":4,"p3":2,"p5":1,"p7":0.15,"b":4,"g":1,"n":0.05,"s":0.6,"d":0.2,"l":1.4,"m":0.02},
    chests: { 2: 99.2, 3: .4, 4: .15, 5: .1, 6: .06, 7: .04, 8: .025, 9: .015, 10: .01 }, scale: 1,
  },
  normal: {
    label: '通常', bolt: 3,
    cells: { 0: 74, p1: 10, p2: 6, p3: 3, p5: 1, p7: 0.3, b: 1.1, g: 0.12, n: 1.6, s: 1.2 },
    chests: { 2: 40, 3: 24, 4: 14, 5: 9, 6: 5.5, 7: 3, 8: 2.3, 9: 1.3, 10: 0.9 }, scale: 0.1654,
  },
  extreme: {
    label: '極', bolt: 5,
    cells: { 0: 78, p1: 8, p2: 5, p3: 2.5, p5: 0.9, p7: 0.35, b: 1, g: 0.14, n: 1.4, s: 1.2 },
    chests: { 2: 30, 3: 20, 4: 14, 5: 11, 6: 8, 7: 6, 8: 5, 9: 3.5, 10: 2.5 }, scale: 0.2150,
  },
};
const POWER = { p1: 1, p2: 2, p3: 3, p5: 5, p7: 7 };

export function* stream({ rate, volatility = 'normal', maxMult = 50, rand = secureRandom, withScript = true }) {
  const v = VOLATILITY[volatility] || VOLATILITY.normal;
  const mild=v===VOLATILITY.mild;
  const unit = mild?rate:rate * v.scale * .994;
  const pickCell = picker(v.cells, rand);
  const pickChest = picker(v.chests, rand);
  const valueAt=[];
  // board[c][r]（r=0 がいちばん上）
  const board = Array.from({length:COLS},(_,c)=>{let prev=0;valueAt[c]=[];return ROW_ORES.map(w=>{
    const eligible=Object.fromEntries(Object.entries(w).filter(([b])=>b==='Q'?Object.keys(MILD_Q_PAY).some(v=>Number(v)>=prev):MILD_PAY[b]>=prev));
    const b=picker(Object.keys(eligible).length?eligible:{R:1},rand)();
    const pay=b==='Q'?Number(picker(Object.fromEntries(Object.entries(MILD_Q_PAY).filter(([v])=>Number(v)>=prev)),rand)()):MILD_PAY[b];
    prev=pay;valueAt[c].push(pay);return b;
  });});
  const hp = board.map((col) => col.map((b) => BLOCKS[b].hp));
  const alive = board.map((col) => col.map(() => true));
  const chests = Array.from({ length: COLS }, () => Number(pickChest()));
  const opened = new Array(COLS).fill(false);
  let base = 0, mult = 1;
  const r2 = (x) => Math.round(x * 10000) / 10000;

  const topOf = (c) => { for (let r = 0; r < ROWS; r++) if (alive[c][r]) return r; return -1; };
  const checkChest = (c, ev) => {
    if (opened[c] || topOf(c) !== -1) return;
    opened[c] = true; mult *= chests[c];
    ev.push({ t: 'open', c, mult: chests[c], total: mult });
  };
  // (c, r) に dmg ダメージ。壊れたら配当、爆発鉱石なら周りにも
  const damage = (c, r, dmg, ev, by) => {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || !alive[c][r]) return;
    hp[c][r] -= dmg;
    if (hp[c][r] > 0) { ev.push(by ? { t: 'hit', c, r, hp: hp[c][r], by } : { t: 'hit', c, r, hp: hp[c][r] }); return; }
    alive[c][r] = false;
    const b = board[c][r];
    const pay = valueAt[c][r] * unit;
    base += pay;
    ev.push(by ? { t: 'break', c, r, b, pay: r2(pay), by } : { t: 'break', c, r, b, pay: r2(pay) });
    checkChest(c, ev);
    if (b === 'E') {
      ev.push({ t: 'boom', c, r, kind: 'ore' });
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dc || dr) damage(c + dc, r + dr, 2, ev);
    }
  };

  const spins = [];
  let total = FIRST_SPINS;
  yield {board,chests:[...chests],unit,cap:rate*Math.min(50,maxMult)};
  for (let s = 0; s < total; s++) {
    // スロット枠：reel[c][段]
    const reel = Array.from({ length: COLS }, () => Array.from({ length: REEL_ROWS }, () => pickCell()));
    const ev = [];
    let add = 0;
    for (let c = 0; c < COLS; c++) {
      const col = reel[c];
      add += col.filter((x) => x === 's').length;
      const up = col.includes('g') ? 7 : col.includes('b') ? 5 : 0;
      if (up && col.some((x) => POWER[x])) ev.push({ t: 'upgrade', c, power: up, item: up === 7 ? 'g' : 'b' });
      for (let k = 0; k < REEL_ROWS; k++) {
        if (!POWER[col[k]]) continue;
        let p = up || POWER[col[k]];
        ev.push({ t: 'pick', c, k, power: p });
        while (p > 0) {
          const r = topOf(c);
          if (r < 0) break;
          const d = 1;
          p -= d;
          damage(c, r, d, ev, 'pick');
        }
        ev.push({ t: 'pickEnd', c, k });
      }
      for (let k = 0; k < REEL_ROWS; k++) {
        if (!['n','d','l','m'].includes(col[k])) continue;
        const r = topOf(c);
        const at = r < 0 ? ROWS - 1 : r;
        const item=col[k];
        ev.push({t:'mineItem',c,k,r:at,item});
        if(item==='m'){
          for(let j=0;j<COLS;j++)chests[j]=Math.min(10,chests[j]+1);
          mult=chests.reduce((p,x,j)=>opened[j]?p*x:p,1);
          ev.push({t:'chestBoost',chests:[...chests],total:mult});
        }else if(item==='d'){
          for(let j=0;j<ROWS;j++)if(alive[c][j])damage(c,j,hp[c][j],ev);
        }else if(item==='n'){
          for(let j=0;j<COLS;j++)for(let r=0;r<ROWS;r++)damage(j,r,2,ev);
        }else{
          const targets=[];for(let j=0;j<COLS;j++)for(let r=0;r<ROWS;r++)if(alive[j][r])targets.push([j,r]);
          for(let j=0;j<3&&targets.length;j++){const [x,y]=targets.splice(Math.floor(rand()*targets.length),1)[0];ev.push({t:'boom',c:x,r:y,kind:'chain'});damage(x,y,2,ev);}
        }
      }
    }
    if (base*mult>=rate*Math.min(50,maxMult)) {total=s+1;add=0;}
    else if (add) total = Math.min(MAX_SPINS, total + add);
    yield { reel, events: ev, add, total, base: r2(base), mult };
  }
  const sum = base * mult;
  const floor = MIN_PAY, cap = rate * Math.min(50,maxMult);
  const score = Math.max(floor, Math.min(Math.floor(sum), cap));
  const guaranteed = Math.floor(sum) < floor, capped = sum >= cap;
  return {
    score, capped, guaranteed, guarantee:guaranteed?score-Math.floor(sum):0, played: total,
    spins, board, chests, final: { base: Math.round(base * 100) / 100, mult, raw: Math.floor(sum), score, guaranteed, capped },
    opened,
  };
}

export function play(opts){const it=stream(opts),start=it.next().value,spins=[];let n;while(!(n=it.next()).done){if(opts.withScript!==false)spins.push(n.value)}return {...start,...n.value,spins}}
