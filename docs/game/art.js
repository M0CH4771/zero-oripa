// イラスト（すべてコードで描くベクター風の絵。画像ファイルは使わない）
// ZG.art.sprite(theme, id, size) で、高DPIのキャンバスを返す（作った絵はキャッシュ）。
// 画像に差し替えたいときは ZG.art.images[theme][id] = '画像のURL' を入れておくと、そちらを使う。
(function () {
  const ZG = (window.ZG = window.ZG || {});
  const cache = new Map();
  const images = { gems: {}, fruit: {}, mine: {} };
  const loaded = new Map();
  const imageOutline = { gems: false, fruit: false, mine: false };
  const imageScale = {};
  // 読み込み済みの画像を絵柄として登録する（assets/manifest.json から）
  function useImage(theme, id, img, opts = {}) {
    images[theme][id] = img.src;
    loaded.set(img.src, img);
    if (opts.outline !== undefined) imageOutline[theme] = !!opts.outline;
    for (const k of [...cache.keys()]) if (k.startsWith(`${theme}:${id}:`)) cache.delete(k);
  }

  function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rad(ctx, x, y, r0, r1, stops, fx, fy) { const g = ctx.createRadialGradient(fx ?? x, fy ?? y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function shade(hex, k) { // k>0 明るく / k<0 暗く
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function gloss(ctx, cx, cy, rx, ry, a = 0.55) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = lin(ctx, 0, cy - ry, 0, cy + ry, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -0.5, 0, 7); ctx.fill(); ctx.restore();
  }
  function twinkle(ctx, x, y, r) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = r;
    ZG.starPath(ctx, x, y, r, r * 0.22, 4); ctx.fill(); ctx.restore();
  }
  ZG.rr = rr; ZG.shade = shade;

  // ---------- 宝石（RUSH） ----------
  function facetGem(ctx, s, outer, inner, color) {
    // outer/inner は頂点の配列（同じ数）。内側がテーブル面、間をカット面として塗り分ける
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.04;
    poly(ctx, outer); ctx.fillStyle = shade(color, -0.35); ctx.fill();
    ctx.restore();
    const n = outer.length;
    for (let i = 0; i < n; i++) {
      const a = outer[i], b = outer[(i + 1) % n], c = inner[(i + 1) % n], d = inner[i];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const light = (-mx - my) / s; // 左上ほど明るい
      poly(ctx, [a, b, c, d]);
      ctx.fillStyle = shade(color, Math.max(-0.45, Math.min(0.55, light * 0.9 + (i % 2 ? -0.08 : 0.08))));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = s * 0.012; ctx.stroke();
    }
    poly(ctx, inner);
    ctx.fillStyle = lin(ctx, -s * 0.3, -s * 0.3, s * 0.3, s * 0.3, [[0, shade(color, 0.55)], [0.5, shade(color, 0.15)], [1, shade(color, -0.1)]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = s * 0.015; ctx.stroke();
    poly(ctx, outer); ctx.strokeStyle = shade(color, -0.55); ctx.lineWidth = s * 0.03; ctx.stroke();
    // ハイライト
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff';
    poly(ctx, [inner[0], [inner[0][0] + (inner[1][0] - inner[0][0]) * 0.5, inner[0][1] + (inner[1][1] - inner[0][1]) * 0.5], [(inner[0][0] + inner[2][0]) / 2 - s * 0.02, (inner[0][1] + inner[2][1]) / 2]]);
    ctx.globalAlpha = 0.35; ctx.fill(); ctx.restore();
    twinkle(ctx, inner[0][0] + s * 0.04, inner[0][1] + s * 0.04, s * 0.07);
  }
  const ring = (n, r, rot = 0, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => { const a = rot + (i * Math.PI * 2) / n; return [Math.cos(a) * r * sx, Math.sin(a) * r * sy]; });
  const GEMS = {
    l1(ctx, s) { facetGem(ctx, s, ring(6, s * 0.42, -Math.PI / 2), ring(6, s * 0.22, -Math.PI / 2), '#e8123c'); },
    l2(ctx, s) {
      const o = [[-0.26, -0.4], [0.26, -0.4], [0.38, -0.26], [0.38, 0.26], [0.26, 0.4], [-0.26, 0.4], [-0.38, 0.26], [-0.38, -0.26]].map(([x, y]) => [x * s, y * s * 0.95]);
      const i = o.map(([x, y]) => [x * 0.55, y * 0.6]);
      facetGem(ctx, s, o, i, '#12b863');
    },
    l3(ctx, s) { facetGem(ctx, s, ring(10, s * 0.42, -Math.PI / 2), ring(10, s * 0.22, -Math.PI / 2 + 0.31), '#2b66ff'); },
    l4(ctx, s) {
      const o = [[0, -0.44], [0.42, 0.32], [-0.42, 0.32]].map(([x, y]) => [x * s, y * s]);
      const m = [[0, -0.42], [0.12, -0.2], [0.36, 0.28], [0.1, 0.24], [-0.36, 0.28], [-0.12, -0.2]].map(([x, y]) => [x * s, y * s]);
      facetGem(ctx, s, [o[0], m[1], o[1], m[3], o[2], m[5]], ring(6, s * 0.16, -Math.PI / 2).map(([x, y]) => [x, y + s * 0.05]), '#9a32ff');
    },
    h1(ctx, s) { // 金の延べ棒
      const t = [[-0.28, -0.2], [0.28, -0.2], [0.42, 0.08], [-0.42, 0.08]].map(([x, y]) => [x * s, y * s]);
      const f = [[-0.42, 0.08], [0.42, 0.08], [0.42, 0.3], [-0.42, 0.3]].map(([x, y]) => [x * s, y * s]);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.05;
      poly(ctx, [t[0], t[1], t[2], f[2], f[3], t[3]]); ctx.fillStyle = '#8a5a00'; ctx.fill(); ctx.restore();
      poly(ctx, f); ctx.fillStyle = lin(ctx, 0, f[0][1], 0, f[2][1], [[0, '#ffcf3a'], [1, '#a86a00']]); ctx.fill();
      poly(ctx, t); ctx.fillStyle = lin(ctx, t[0][0], t[0][1], t[2][0], t[2][1], [[0, '#fff6c2'], [0.4, '#ffd54a'], [1, '#d99000']]); ctx.fill();
      poly(ctx, [[-0.18 * s, -0.12 * s], [0.18 * s, -0.12 * s], [0.26 * s, 0.03 * s], [-0.26 * s, 0.03 * s]]); ctx.strokeStyle = 'rgba(140,80,0,.5)'; ctx.lineWidth = s * 0.02; ctx.stroke();
      poly(ctx, [t[0], t[1], t[2], f[2], f[3], t[3]]); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = s * 0.025; ctx.stroke();
      twinkle(ctx, -0.2 * s, -0.14 * s, s * 0.08); twinkle(ctx, 0.3 * s, 0.18 * s, s * 0.05);
    },
    h2(ctx, s) { // 王冠
      const pts = [[-0.4, 0.28], [-0.42, -0.2], [-0.2, 0.0], [0, -0.36], [0.2, 0.0], [0.42, -0.2], [0.4, 0.28]].map(([x, y]) => [x * s, y * s]);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.04;
      poly(ctx, pts); ctx.fillStyle = lin(ctx, 0, -0.36 * s, 0, 0.28 * s, [[0, '#fff3b0'], [0.45, '#ffc21a'], [1, '#b06d00']]); ctx.fill(); ctx.restore();
      poly(ctx, pts); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = s * 0.03; ctx.stroke();
      rr(ctx, -0.42 * s, 0.2 * s, 0.84 * s, 0.14 * s, s * 0.04); ctx.fillStyle = lin(ctx, 0, 0.2 * s, 0, 0.34 * s, [[0, '#ffe680'], [1, '#c47e00']]); ctx.fill(); ctx.stroke();
      [[-0.42, -0.2], [0, -0.36], [0.42, -0.2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.055, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#b07000'; ctx.stroke(); });
      [[-0.24, 0.27, '#e8123c'], [0, 0.27, '#2b66ff'], [0.24, 0.27, '#12b863']].forEach(([x, y, c]) => { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.05, 0, 7); ctx.fillStyle = rad(ctx, x * s, y * s, 0, s * 0.05, [[0, '#fff'], [0.4, c], [1, shade(c, -0.4)]], x * s - s * 0.02, y * s - s * 0.02); ctx.fill(); });
      twinkle(ctx, -0.1 * s, -0.1 * s, s * 0.07);
    },
    h3(ctx, s) { // 金の星（カット面つき）
      const o = [], i0 = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? s * 0.19 : s * 0.45; o.push([Math.cos(a) * r, Math.sin(a) * r]); }
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.04; poly(ctx, o); ctx.fillStyle = '#a86a00'; ctx.fill(); ctx.restore();
      for (let k = 0; k < 10; k++) {
        const a = o[k], b = o[(k + 1) % 10];
        poly(ctx, [[0, 0], a, b]);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        ctx.fillStyle = shade('#ffc21a', Math.max(-0.4, Math.min(0.6, (-mx - my) / s * 1.2 + (k % 2 ? -0.1 : 0.1)))); ctx.fill();
      }
      poly(ctx, o); ctx.strokeStyle = '#8a5200'; ctx.lineWidth = s * 0.03; ctx.stroke();
      twinkle(ctx, -0.08 * s, -0.12 * s, s * 0.09);
    },
    h4(ctx, s) { // ダイヤ（横から見たブリリアントカット）
      const top = -0.32 * s, girdle = -0.06 * s, bot = 0.44 * s, W = 0.44 * s, T = 0.22 * s;
      ctx.save(); ctx.shadowColor = 'rgba(80,200,255,.6)'; ctx.shadowBlur = s * 0.15;
      poly(ctx, [[-T, top], [T, top], [W, girdle], [0, bot], [-W, girdle]]); ctx.fillStyle = '#5fc8ff'; ctx.fill(); ctx.restore();
      const cols = ['#e8fbff', '#9ee6ff', '#55c4ff', '#bff2ff', '#7fd8ff', '#3aa8f0'];
      const crown = [[-T, top], [-T / 3, top], [T / 3, top], [T, top]];
      const gird = [[-W, girdle], [-W / 2, girdle], [0, girdle], [W / 2, girdle], [W, girdle]];
      poly(ctx, [crown[0], gird[0], gird[1]]); ctx.fillStyle = cols[2]; ctx.fill();
      poly(ctx, [crown[0], crown[1], gird[1]]); ctx.fillStyle = cols[0]; ctx.fill();
      poly(ctx, [crown[1], gird[1], gird[2], gird[3], crown[2]]); ctx.fillStyle = cols[3]; ctx.fill();
      poly(ctx, [crown[2], crown[3], gird[3]]); ctx.fillStyle = cols[1]; ctx.fill();
      poly(ctx, [crown[3], gird[4], gird[3]]); ctx.fillStyle = cols[5]; ctx.fill();
      [[gird[0], gird[1], cols[1]], [gird[1], gird[2], cols[4]], [gird[2], gird[3], cols[2]], [gird[3], gird[4], cols[5]]].forEach(([a, b, c]) => { poly(ctx, [a, b, [0, bot]]); ctx.fillStyle = c; ctx.fill(); });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = s * 0.012;
      [...gird.map((g) => [g, [0, bot]]), [crown[1], gird[1]], [crown[2], gird[3]]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); });
      poly(ctx, [[-T, top], [T, top], [W, girdle], [0, bot], [-W, girdle]]); ctx.strokeStyle = '#2b7ab8'; ctx.lineWidth = s * 0.025; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = ZG.rainbow(ctx, -W, W); poly(ctx, [gird[1], gird[3], [0, bot]]); ctx.fill(); ctx.restore();
      twinkle(ctx, -0.12 * s, -0.22 * s, s * 0.1); twinkle(ctx, 0.25 * s, 0.05 * s, s * 0.06);
    },
    S(ctx, s) { // スキャッター：虹の宝珠
      ctx.save(); ctx.shadowColor = '#ff6ad5'; ctx.shadowBlur = s * 0.25;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.fillStyle = rad(ctx, 0, 0, s * 0.05, s * 0.42, [[0, '#fff'], [0.35, '#ff8ad8'], [0.75, '#9b3dff'], [1, '#3a0b7a']], -s * 0.12, -s * 0.14); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = ZG.rainbow(ctx, -s * 0.4, s * 0.4); ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, 7); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = s * 0.1; ZG.starPath(ctx, 0, 0, s * 0.2, s * 0.08, 5); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = `900 ${s * 0.15}px "Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#5a0a6a'; ctx.strokeText('FREE', 0, s * 0.33); ctx.fillStyle = '#ffd54a'; ctx.fillText('FREE', 0, s * 0.33);
      gloss(ctx, -s * 0.12, -s * 0.2, s * 0.16, s * 0.08, 0.6);
    },
    bomb(ctx, s) {
      ctx.save(); ctx.shadowColor = '#ff8a00'; ctx.shadowBlur = s * 0.25;
      ctx.beginPath(); ctx.arc(0, s * 0.06, s * 0.36, 0, 7); ctx.fillStyle = rad(ctx, 0, s * 0.06, s * 0.02, s * 0.38, [[0, '#6a7bb8'], [0.5, '#24305e'], [1, '#0a0f24']], -s * 0.12, -s * 0.06); ctx.fill(); ctx.restore();
      rr(ctx, -s * 0.1, -s * 0.36, s * 0.2, s * 0.1, s * 0.02); ctx.fillStyle = lin(ctx, 0, -s * 0.36, 0, -s * 0.26, [[0, '#c9ced8'], [1, '#6a7080']]); ctx.fill();
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -s * 0.36); ctx.quadraticCurveTo(s * 0.12, -s * 0.5, s * 0.24, -s * 0.42); ctx.stroke();
      ctx.save(); ctx.shadowColor = '#ffd54a'; ctx.shadowBlur = s * 0.15; ctx.fillStyle = '#fff3a0'; ZG.starPath(ctx, s * 0.26, -s * 0.43, s * 0.09, s * 0.03, 6); ctx.fill(); ctx.restore();
      gloss(ctx, -s * 0.12, -s * 0.06, s * 0.12, s * 0.06, 0.5);
    },
  };

  // ---------- フルーツ（FRUIT） ----------
  function leaf(ctx, x, y, len, ang, color = '#2fb04a') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
    ctx.fillStyle = lin(ctx, 0, -len * 0.3, 0, len * 0.3, [[0, shade(color, 0.3)], [1, shade(color, -0.3)]]); ctx.fill();
    ctx.strokeStyle = shade(color, -0.45); ctx.lineWidth = len * 0.05; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke(); ctx.restore();
  }
  function ball(ctx, x, y, r, color, outline) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    ctx.fillStyle = rad(ctx, x, y, r * 0.1, r, [[0, shade(color, 0.45)], [0.55, color], [1, shade(color, -0.45)]], x - r * 0.35, y - r * 0.4); ctx.fill();
    ctx.strokeStyle = outline || shade(color, -0.55); ctx.lineWidth = r * 0.09; ctx.stroke();
    gloss(ctx, x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.16, 0.7);
  }
  const shadowed = (ctx, s, fn) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.05; fn(); ctx.restore(); };
  const FRUIT = {
    f1(ctx, s) { // さくらんぼ
      ctx.strokeStyle = '#5a8a1a'; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-0.18 * s, 0.05 * s); ctx.quadraticCurveTo(-0.1 * s, -0.25 * s, 0.08 * s, -0.38 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.2 * s, 0.1 * s); ctx.quadraticCurveTo(0.16 * s, -0.2 * s, 0.08 * s, -0.38 * s); ctx.stroke();
      leaf(ctx, 0.08 * s, -0.38 * s, s * 0.3, -0.3);
      shadowed(ctx, s, () => { ball(ctx, -0.18 * s, 0.17 * s, s * 0.2, '#e3123a'); });
      shadowed(ctx, s, () => { ball(ctx, 0.2 * s, 0.22 * s, s * 0.2, '#d10f30'); });
    },
    f2(ctx, s) { // レモン
      shadowed(ctx, s, () => {
        ctx.beginPath(); ctx.ellipse(0, 0.04 * s, s * 0.4, s * 0.29, -0.25, 0, 7);
        ctx.fillStyle = rad(ctx, 0, 0, s * 0.05, s * 0.42, [[0, '#fffbb0'], [0.6, '#ffe11a'], [1, '#d9a800']], -s * 0.12, -s * 0.1); ctx.fill();
      });
      ctx.fillStyle = '#e8c400';
      [[-0.4, 0.12], [0.4, -0.04]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x * s, y * s, s * 0.06, s * 0.045, -0.25, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(0, 0.04 * s, s * 0.4, s * 0.29, -0.25, 0, 7); ctx.strokeStyle = '#a88400'; ctx.lineWidth = s * 0.03; ctx.stroke();
      leaf(ctx, 0.28 * s, -0.16 * s, s * 0.22, -0.9);
      gloss(ctx, -0.12 * s, -0.08 * s, s * 0.14, s * 0.06, 0.7);
    },
    f3(ctx, s) { // オレンジ
      shadowed(ctx, s, () => ball(ctx, 0, 0.04 * s, s * 0.38, '#ff8a00'));
      const r = seeded(7); ctx.fillStyle = 'rgba(180,80,0,.25)';
      for (let i = 0; i < 26; i++) { const a = r() * 7, d = r() * s * 0.32; ctx.beginPath(); ctx.arc(Math.cos(a) * d, 0.04 * s + Math.sin(a) * d, s * 0.012, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#5a8a1a'; ZG.starPath(ctx, 0.02 * s, -0.31 * s, s * 0.06, s * 0.03, 5); ctx.fill();
      leaf(ctx, 0.04 * s, -0.32 * s, s * 0.24, -0.6);
    },
    f4(ctx, s) { // すもも
      shadowed(ctx, s, () => ball(ctx, 0, 0.05 * s, s * 0.37, '#8a2ad8'));
      ctx.strokeStyle = 'rgba(60,0,100,.45)'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0.02 * s, -0.3 * s); ctx.quadraticCurveTo(-0.14 * s, 0.05 * s, 0.04 * s, 0.4 * s); ctx.stroke();
      ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.moveTo(0.02 * s, -0.3 * s); ctx.lineTo(0.08 * s, -0.42 * s); ctx.stroke();
      leaf(ctx, 0.07 * s, -0.4 * s, s * 0.22, -0.2);
    },
    f5(ctx, s) { // ぶどう
      const pos = [[-0.2, -0.16], [0, -0.18], [0.2, -0.16], [-0.1, 0.02], [0.1, 0.02], [-0.22, 0.02], [0.22, 0.02], [0, 0.2], [-0.12, 0.2], [0.12, 0.2], [0, 0.36]];
      ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(0, -0.26 * s); ctx.lineTo(0.04 * s, -0.42 * s); ctx.stroke();
      leaf(ctx, 0.02 * s, -0.32 * s, s * 0.28, -2.6, '#3aa84a');
      shadowed(ctx, s, () => pos.forEach(([x, y]) => ball(ctx, x * s, y * s, s * 0.11, '#6a1fb8', '#3a0a70')));
    },
    f6(ctx, s) { // スイカ
      shadowed(ctx, s, () => {
        ctx.beginPath(); ctx.moveTo(-0.44 * s, -0.08 * s); ctx.arc(0, -0.08 * s, s * 0.44, 0, Math.PI, false); ctx.closePath();
        ctx.fillStyle = '#1e8a2e'; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(0, -0.08 * s, s * 0.39, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#d6f5c8'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -0.08 * s, s * 0.35, 0, Math.PI); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, -0.08 * s, 0, 0.3 * s, [[0, '#ff6a7a'], [1, '#e0123a']]); ctx.fill();
      ctx.fillStyle = '#1a0a0a';
      [[-0.18, 0.02], [0, 0.06], [0.18, 0.02], [-0.08, 0.16], [0.1, 0.16], [-0.24, -0.04], [0.26, -0.04]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x * s, y * s, s * 0.022, s * 0.034, x * 2, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.arc(0, -0.08 * s, s * 0.44, 0, Math.PI); ctx.closePath(); ctx.strokeStyle = '#0f5a1a'; ctx.lineWidth = s * 0.03; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(-0.32 * s, -0.1 * s, 0.64 * s, s * 0.03); ctx.restore();
    },
    f7(ctx, s) { // いちご
      shadowed(ctx, s, () => {
        ctx.beginPath(); ctx.moveTo(0, 0.42 * s);
        ctx.bezierCurveTo(-0.46 * s, 0.1 * s, -0.4 * s, -0.3 * s, 0, -0.24 * s);
        ctx.bezierCurveTo(0.4 * s, -0.3 * s, 0.46 * s, 0.1 * s, 0, 0.42 * s);
        ctx.fillStyle = rad(ctx, 0, 0, s * 0.05, s * 0.46, [[0, '#ff8a9a'], [0.5, '#f0193f'], [1, '#a00a22']], -s * 0.12, -s * 0.08); ctx.fill();
      });
      ctx.fillStyle = '#ffe680';
      const r = seeded(3);
      for (let i = 0; i < 18; i++) { const x = (r() - 0.5) * 0.56, y = -0.12 + r() * 0.42; if (Math.abs(x) > 0.3 - (y + 0.12) * 0.55) continue; ctx.beginPath(); ctx.ellipse(x * s, y * s, s * 0.014, s * 0.024, 0, 0, 7); ctx.fill(); }
      for (let k = 0; k < 5; k++) leaf(ctx, 0, -0.24 * s, s * 0.2, -Math.PI / 2 + (k - 2) * 0.55, '#2fb04a');
      gloss(ctx, -0.13 * s, -0.08 * s, s * 0.1, s * 0.05, 0.6);
    },
    S(ctx, s) { // スキャッター：金のりんご
      ctx.save(); ctx.shadowColor = '#ffd54a'; ctx.shadowBlur = s * 0.3;
      ctx.beginPath(); ctx.moveTo(0, -0.24 * s);
      ctx.bezierCurveTo(-0.5 * s, -0.42 * s, -0.5 * s, 0.38 * s, -0.05 * s, 0.38 * s); ctx.bezierCurveTo(0, 0.42 * s, 0.05 * s, 0.38 * s, 0.05 * s, 0.38 * s);
      ctx.bezierCurveTo(0.5 * s, 0.38 * s, 0.5 * s, -0.42 * s, 0, -0.24 * s);
      ctx.fillStyle = rad(ctx, 0, 0, s * 0.05, s * 0.45, [[0, '#fffbe0'], [0.45, '#ffcf1a'], [1, '#a86a00']], -s * 0.14, -s * 0.1); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = s * 0.03; ctx.stroke();
      ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(0, -0.24 * s); ctx.lineTo(0.03 * s, -0.4 * s); ctx.stroke();
      leaf(ctx, 0.03 * s, -0.36 * s, s * 0.22, -0.4, '#2fb04a');
      gloss(ctx, -0.15 * s, -0.1 * s, s * 0.1, s * 0.06, 0.8);
      twinkle(ctx, 0.2 * s, 0.1 * s, s * 0.08);
      ctx.font = `900 ${s * 0.14}px "Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#6a3a00'; ctx.strokeText('FREE', 0, s * 0.12); ctx.fillStyle = '#fff'; ctx.fillText('FREE', 0, s * 0.12);
    },
  };

  // ---------- 採掘（DIG） ----------
  function tile(ctx, s, top, bottom, seed, edge) {
    const r = s * 0.1, x = -s / 2, y = -s / 2;
    rr(ctx, x, y, s, s, r); ctx.fillStyle = lin(ctx, x, y, x + s, y + s, [[0, top], [1, bottom]]); ctx.fill();
    // ふちの立体感
    ctx.save(); rr(ctx, x, y, s, s, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x, y, s, s * 0.07); ctx.fillRect(x, y, s * 0.07, s);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + s * 0.93, s, s * 0.07); ctx.fillRect(x + s * 0.93, y, s * 0.07, s);
    ctx.restore();
    rr(ctx, x + 0.5, y + 0.5, s - 1, s - 1, r); ctx.strokeStyle = edge || 'rgba(0,0,0,.45)'; ctx.lineWidth = s * 0.025; ctx.stroke();
  }
  function specks(ctx, s, seed, n, colors, size = 0.03) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) { ctx.fillStyle = colors[i % colors.length]; ctx.beginPath(); ctx.arc((r() - 0.5) * s * 0.8, (r() - 0.5) * s * 0.8, s * size * (0.5 + r()), 0, 7); ctx.fill(); }
  }
  function nuggets(ctx, s, seed, color, n = 5, facets = true) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) {
      const cx = (r() - 0.5) * s * 0.6, cy = (r() - 0.5) * s * 0.6, rr0 = s * (0.07 + r() * 0.06);
      const pts = Array.from({ length: 6 }, (_, k) => { const a = k * 1.047 + r() * 0.4, d = rr0 * (0.75 + r() * 0.4); return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; });
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = s * 0.03; ctx.shadowOffsetY = s * 0.015;
      poly(ctx, pts); ctx.fillStyle = lin(ctx, cx - rr0, cy - rr0, cx + rr0, cy + rr0, [[0, shade(color, 0.5)], [0.5, color], [1, shade(color, -0.45)]]); ctx.fill(); ctx.restore();
      poly(ctx, pts); ctx.strokeStyle = shade(color, -0.6); ctx.lineWidth = s * 0.012; ctx.stroke();
      if (facets) { ctx.fillStyle = 'rgba(255,255,255,.45)'; poly(ctx, [pts[3], pts[4], [cx, cy]]); ctx.fill(); }
    }
  }
  function stoneBase(ctx, s, seed) {
    tile(ctx, s, '#a7adb8', '#5d636e', seed);
    specks(ctx, s, seed, 14, ['rgba(255,255,255,.18)', 'rgba(0,0,0,.18)'], 0.035);
    ctx.strokeStyle = 'rgba(40,44,52,.45)'; ctx.lineWidth = s * 0.015; const r = seeded(seed + 9);
    for (let i = 0; i < 2; i++) { ctx.beginPath(); let x = (r() - 0.5) * s * 0.7, y = (r() - 0.5) * s * 0.7; ctx.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (r() - 0.5) * s * 0.25; y += (r() - 0.5) * s * 0.25; ctx.lineTo(x, y); } ctx.stroke(); }
  }
  const MINE = {
    D(ctx, s) { // 土（小石と根っこ）
      tile(ctx, s, '#b07440', '#5a3416', 1); specks(ctx, s, 2, 24, ['#7a4a22', '#c8905a', '#4e2a10'], 0.03);
      nuggets(ctx, s, 3, '#9a8a78', 3, false);
      ctx.strokeStyle = 'rgba(70,40,15,.6)'; ctx.lineWidth = s * 0.018; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.35); ctx.quadraticCurveTo(-s * 0.1, -s * 0.15, -s * 0.2, s * 0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.18); ctx.quadraticCurveTo(-s * 0.02, -s * 0.12, s * 0.02, -s * 0.2); ctx.stroke(); },
    T(ctx, s) { stoneBase(ctx, s, 5); },
    C(ctx, s) { stoneBase(ctx, s, 11); nuggets(ctx, s, 12, '#2a2a2e', 5); },
    I(ctx, s) { stoneBase(ctx, s, 21); nuggets(ctx, s, 22, '#e8b48a', 5); },
    G(ctx, s) { stoneBase(ctx, s, 31); nuggets(ctx, s, 32, '#ffc21a', 6); twinkle(ctx, s * 0.18, -s * 0.2, s * 0.08); twinkle(ctx, -s * 0.2, s * 0.15, s * 0.06); },
    X(ctx, s) { stoneBase(ctx, s, 41); nuggets(ctx, s, 42, '#4ee8ff', 5); twinkle(ctx, -s * 0.15, -s * 0.18, s * 0.1); twinkle(ctx, s * 0.2, s * 0.18, s * 0.07); },
    R(ctx, s) {
      tile(ctx, s, '#3a1a6a', '#120628', 51);
      const cols = ['#ff4f6a', '#ffb02e', '#ffe94a', '#4effa0', '#4ac8ff', '#b06aff'];
      cols.forEach((c, i) => nuggets(ctx, s, 52 + i, c, 1));
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = ZG.rainbow(ctx, -s / 2, s / 2); rr(ctx, -s / 2, -s / 2, s, s, s * 0.1); ctx.fill(); ctx.restore();
      twinkle(ctx, 0, 0, s * 0.14);
    },
    N(ctx, s) { // 火薬だる
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.03;
      ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.42); ctx.quadraticCurveTo(-s * 0.46, 0, -s * 0.32, s * 0.42); ctx.lineTo(s * 0.32, s * 0.42); ctx.quadraticCurveTo(s * 0.46, 0, s * 0.32, -s * 0.42); ctx.closePath();
      ctx.fillStyle = lin(ctx, -s * 0.4, 0, s * 0.4, 0, [[0, '#5a2e10'], [0.35, '#b06a32'], [0.6, '#9a5a28'], [1, '#4a240c']]); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#2a1206'; ctx.lineWidth = s * 0.025; ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,6,.45)'; ctx.lineWidth = s * 0.015;
      [-0.16, 0, 0.16].forEach((k) => { ctx.beginPath(); ctx.moveTo(k * s, -s * 0.42); ctx.quadraticCurveTo(k * s * 1.25, 0, k * s, s * 0.42); ctx.stroke(); });
      [-0.3, 0.3].forEach((k) => { ctx.beginPath(); ctx.ellipse(0, k * s, s * 0.405, s * 0.05, 0, 0, Math.PI); ctx.strokeStyle = '#8a929e'; ctx.lineWidth = s * 0.05; ctx.stroke(); });
      // 危険マーク
      ctx.save(); ctx.translate(0, s * 0.02); ctx.rotate(Math.PI / 4);
      rr(ctx, -s * 0.15, -s * 0.15, s * 0.3, s * 0.3, s * 0.03); ctx.fillStyle = '#ffcf1a'; ctx.fill(); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = s * 0.02; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#e8123c'; ctx.beginPath(); ctx.moveTo(0, -s * 0.12); ctx.quadraticCurveTo(s * 0.1, 0, s * 0.04, s * 0.1); ctx.quadraticCurveTo(0, s * 0.06, -s * 0.04, s * 0.1); ctx.quadraticCurveTo(-s * 0.1, 0, 0, -s * 0.12); ctx.fill();
      ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0, -s * 0.42); ctx.quadraticCurveTo(s * 0.12, -s * 0.52, s * 0.2, -s * 0.46); ctx.stroke();
      ctx.fillStyle = '#ffe680'; ctx.shadowColor = '#ffb02e'; ctx.shadowBlur = s * 0.12; ZG.starPath(ctx, s * 0.21, -s * 0.46, s * 0.07, s * 0.025, 6); ctx.fill(); ctx.shadowBlur = 0;
    },
    H(ctx, s) { // 宝箱
      const x = -s * 0.44, w = s * 0.88;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.03;
      rr(ctx, x, -s * 0.1, w, s * 0.5, s * 0.06); ctx.fillStyle = lin(ctx, 0, -s * 0.1, 0, s * 0.4, [[0, '#a8642a'], [1, '#5a2e10']]); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(x, -s * 0.08); ctx.lineTo(x, -s * 0.2); ctx.quadraticCurveTo(0, -s * 0.5, x + w, -s * 0.2); ctx.lineTo(x + w, -s * 0.08); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -s * 0.42, 0, -s * 0.08, [[0, '#c47e3a'], [1, '#7a4218']]); ctx.fill(); ctx.strokeStyle = '#3a1a06'; ctx.lineWidth = s * 0.025; ctx.stroke();
      rr(ctx, x, -s * 0.1, w, s * 0.5, s * 0.06); ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, -s * 0.3, 0, s * 0.4, [[0, '#ffe680'], [1, '#c48a00']]);
      [-0.3, 0.3].forEach((k) => ctx.fillRect(k * s - s * 0.05, -s * 0.36, s * 0.1, s * 0.76));
      ctx.fillRect(x, -s * 0.12, w, s * 0.07);
      rr(ctx, -s * 0.09, -s * 0.1, s * 0.18, s * 0.2, s * 0.03); ctx.fill(); ctx.strokeStyle = '#7a4a00'; ctx.stroke();
      ctx.fillStyle = '#3a1a06'; ctx.beginPath(); ctx.arc(0, -s * 0.02, s * 0.025, 0, 7); ctx.fill(); ctx.fillRect(-s * 0.012, -s * 0.01, s * 0.024, s * 0.06);
      twinkle(ctx, s * 0.32, -s * 0.3, s * 0.07);
    },
    E(ctx, s) { // 爆発鉱石（暗い岩に赤く光る粒）
      tile(ctx, s, '#4a3a34', '#1a1210', 61); specks(ctx, s, 62, 18, ['rgba(255,255,255,.08)', 'rgba(0,0,0,.25)'], 0.035);
      ctx.save(); ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = s * 0.12; nuggets(ctx, s, 63, '#ff6a1a', 6); ctx.restore();
      nuggets(ctx, s, 64, '#ffd04a', 3);
    },
    Q(ctx, s) { // ハテナ（木箱に？）
      tile(ctx, s, '#ff4a5a', '#a0101e', 71);
      ctx.strokeStyle = 'rgba(80,0,10,.55)'; ctx.lineWidth = s * 0.035; rr(ctx, -s * 0.38, -s * 0.38, s * 0.76, s * 0.76, s * 0.06); ctx.stroke();
      [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].forEach(([x, y]) => { ctx.fillStyle = '#ffd6da'; ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.035, 0, 7); ctx.fill(); });
      ctx.font = `900 ${s * 0.62}px "Luckiest Guy", "Dela Gothic One", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * 0.07; ctx.strokeStyle = '#5a0010'; ctx.strokeText('?', 0, s * 0.04); ctx.fillStyle = '#fff'; ctx.fillText('?', 0, s * 0.04);
    },
    book(ctx, s) { // 強化の書
      ctx.save(); ctx.rotate(-0.18);
      rr(ctx, -s * 0.3, -s * 0.36, s * 0.6, s * 0.72, s * 0.05); ctx.fillStyle = lin(ctx, -s * 0.3, 0, s * 0.3, 0, [[0, '#3a1a7a'], [0.5, '#6a3ad0'], [1, '#2a0e5a']]); ctx.fill();
      ctx.strokeStyle = '#1a0838'; ctx.lineWidth = s * 0.025; ctx.stroke();
      ctx.fillStyle = '#f4ead8'; ctx.fillRect(s * 0.22, -s * 0.32, s * 0.08, s * 0.64);
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = s * 0.03; rr(ctx, -s * 0.22, -s * 0.28, s * 0.38, s * 0.56, s * 0.04); ctx.stroke();
      ctx.fillStyle = '#ffd54a'; ZG.starPath(ctx, -s * 0.03, 0, s * 0.12, s * 0.05, 5); ctx.fill();
      ctx.restore(); twinkle(ctx, s * 0.3, -s * 0.32, s * 0.08);
    },
    pick(ctx, s) { // つるはし
      ctx.save(); ctx.rotate(-0.6);
      rr(ctx, -s * 0.04, -s * 0.2, s * 0.08, s * 0.62, s * 0.03); ctx.fillStyle = lin(ctx, -s * 0.04, 0, s * 0.04, 0, [[0, '#c48a52'], [1, '#6a3a12']]); ctx.fill(); ctx.strokeStyle = '#3a1a06'; ctx.lineWidth = s * 0.02; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.42, -s * 0.02); ctx.quadraticCurveTo(0, -s * 0.36, s * 0.42, -s * 0.02); ctx.quadraticCurveTo(0, -s * 0.2, -s * 0.42, -s * 0.02);
      ctx.fillStyle = lin(ctx, 0, -s * 0.3, 0, -s * 0.05, [[0, '#f2f6fa'], [0.5, '#9aa6b4'], [1, '#4a5260']]); ctx.fill(); ctx.strokeStyle = '#2a3038'; ctx.stroke();
      ctx.restore();
    },
    drill(ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.3); ctx.lineTo(s * 0.2, -s * 0.3); ctx.lineTo(0, s * 0.42); ctx.closePath();
      ctx.fillStyle = lin(ctx, -s * 0.2, 0, s * 0.2, 0, [[0, '#ffe680'], [0.5, '#ffc21a'], [1, '#a86a00']]); ctx.fill(); ctx.strokeStyle = '#6a4200'; ctx.lineWidth = s * 0.02; ctx.stroke();
      ctx.strokeStyle = 'rgba(90,50,0,.6)'; for (let i = 0; i < 5; i++) { const y = -s * 0.22 + i * s * 0.12, w = s * 0.2 * (1 - (i * 0.12 + 0.1)); ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y + s * 0.06); ctx.stroke(); }
      rr(ctx, -s * 0.16, -s * 0.46, s * 0.32, s * 0.18, s * 0.04); ctx.fillStyle = lin(ctx, 0, -s * 0.46, 0, -s * 0.28, [[0, '#ff6a4a'], [1, '#b0200a']]); ctx.fill(); ctx.strokeStyle = '#5a0a00'; ctx.stroke();
    },
    dyn(ctx, s) {
      ctx.save(); ctx.rotate(0.35);
      [-0.13, 0, 0.13].forEach((k) => { rr(ctx, k * s - s * 0.065, -s * 0.28, s * 0.13, s * 0.56, s * 0.04); ctx.fillStyle = lin(ctx, k * s - s * 0.065, 0, k * s + s * 0.065, 0, [[0, '#ff6a5a'], [1, '#a00f0f']]); ctx.fill(); ctx.strokeStyle = '#5a0000'; ctx.lineWidth = s * 0.015; ctx.stroke(); });
      ctx.fillStyle = '#f4ead8'; ctx.fillRect(-s * 0.21, -s * 0.06, s * 0.42, s * 0.1);
      ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0, -s * 0.28); ctx.quadraticCurveTo(s * 0.1, -s * 0.42, s * 0.2, -s * 0.38); ctx.stroke();
      ctx.fillStyle = '#ffe680'; ctx.shadowColor = '#ffb02e'; ctx.shadowBlur = s * 0.12; ZG.starPath(ctx, s * 0.21, -s * 0.38, s * 0.08, s * 0.03, 6); ctx.fill();
      ctx.restore();
    },
  };
  // ひび（ダメージ表現）：level 1〜3
  function crack(ctx, s, level, seed = 1) {
    const r = seeded(seed * 31 + level);
    ctx.strokeStyle = 'rgba(20,15,10,.75)'; ctx.lineWidth = s * 0.025; ctx.lineCap = 'round';
    for (let i = 0; i < level * 2; i++) {
      ctx.beginPath(); let x = (r() - 0.5) * s * 0.2, y = (r() - 0.5) * s * 0.2; ctx.moveTo(x, y);
      const a = r() * 7;
      for (let k = 0; k < 4; k++) { x += Math.cos(a + (r() - 0.5)) * s * 0.11; y += Math.sin(a + (r() - 0.5)) * s * 0.11; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  const PAINTERS = { gems: GEMS, fruit: FRUIT, mine: MINE };
  const COLORS = {
    gems: { l1: '#ff3b5c', l2: '#5a8cff', l3: '#3be08a', l4: '#ffd54a', l5:'#81d9ff', h1: '#b66aff', h2: '#e8eeff', h3: '#ff8ad8', h4: '#ffd54a', S: '#ff8ad8', bomb: '#ff8a00' },
    fruit: { f1: '#ff3b5c', f2: '#ffe11a', f3: '#ff9a1a', f4: '#a04aff', f5: '#8a3aff', f6: '#ff5a6a', f7: '#ff2a4a', S: '#ffd54a' },
    mine: { D: '#a86a3a', T: '#a7adb8', C: '#3a3a40', I: '#e8b48a', G: '#ffc21a', X: '#4ee8ff', R: '#ff6ad5', N: '#ff4a3a', H: '#ffc21a', E: '#ff6a1a', Q: '#ff4a5a' },
  };

  // ステッカー風の太いふち：形をなぞった濃い色のシルエットを周囲にずらして重ね、その上に絵を描く
  function outlined(src, thick, color) {
    const w = src.width, h = src.height;
    const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
    const s = sil.getContext('2d');
    s.drawImage(src, 0, 0);
    try {
      const img = s.getImageData(0, 0, w, h), d = img.data;
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0; // 影のうすい部分はふちにしない
      s.putImageData(img, 0, 0);
    } catch (e) { /* 読めないときはそのまま */ }
    s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, w, h);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; o.drawImage(sil, Math.cos(a) * thick, Math.sin(a) * thick); }
    o.drawImage(src, 0, 0);
    return out;
  }
  const NO_OUTLINE = new Set(['crack1', 'crack2', 'crack3']);
  ZG.outline = { on: true, color: 'rgba(28,10,40,.92)', ratio: 0.035 };

  function sprite(theme, id, size, extra) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const key = `${theme}:${id}:${Math.round(size)}:${extra || ''}`;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    const pad = size * 0.25;
    c.width = Math.ceil((size + pad * 2) * dpr); c.height = c.width;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, (size / 2 + pad) * dpr, (size / 2 + pad) * dpr);
    const url = images[theme]?.[id];
    let fromImage = false;
    if (url) {
      let img = loaded.get(url);
      if (!img) { img = new Image(); img.src = url; loaded.set(url, img); img.onload = () => { for (const k of [...cache.keys()]) if (k.startsWith(`${theme}:${id}:`)) cache.delete(k); }; }
      if (img.complete && img.naturalWidth) {
        // 画像は縦横比を保ったまま枠に収める
        const k = Math.min(size / img.naturalWidth, size / img.naturalHeight) * (imageScale[theme] || 1.08);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        fromImage = true;
      } else (PAINTERS[theme][id] || (() => {}))(ctx, size);
    } else if (id.startsWith('crack')) crack(ctx, size, parseInt(id.slice(5), 10) || 1, extra || 1);
    else (PAINTERS[theme][id] || (() => {}))(ctx, size);
    let outC = c;
    const wantOutline = fromImage ? imageOutline[theme] : ZG.outline.on;
    if (wantOutline && !NO_OUTLINE.has(id)) outC = outlined(c, Math.max(1.5, size * ZG.outline.ratio * dpr), ZG.outline.color);
    outC.pad = pad;
    cache.set(key, outC);
    return outC;
  }
  // 読み込み画面で、使う絵柄をまとめて先に作っておく
  async function preload(theme, ids, size, onProgress) {
    for (let i = 0; i < ids.length; i++) {
      sprite(theme, ids[i], size);
      onProgress && onProgress((i + 1) / ids.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  // スプライトをノードの描画関数として使う
  function drawer(theme, id, size) {
    return (ctx, n) => {
      const sp = sprite(theme, n.id || id, size, n.extra);
      const full = size + sp.pad * 2;
      ctx.drawImage(sp, -full / 2, -full / 2, full, full);
    };
  }
  ZG.art = { sprite, drawer, images, useImage, imageScale, COLORS, preload, IDS: { gems: Object.keys(GEMS), fruit: Object.keys(FRUIT), mine: Object.keys(MINE) } };
})();
