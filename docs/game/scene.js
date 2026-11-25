// 背景・枠・立体文字（PP系のテイスト：描き込んだ背景、太い装飾フレーム、金の立体文字）
// 背景は読み込み時に一度だけ大きなキャンバスに描いておき、毎フレームはそれを貼るだけ（軽い）
(function () {
  const ZG = (window.ZG = window.ZG || {});
  const FONT = '"Luckiest Guy","Dela Gothic One","Hiragino Sans","Arial Black",sans-serif';
  const FONT_JP = '"Dela Gothic One","Hiragino Sans","Noto Sans JP",sans-serif';
  ZG.FONT = FONT; ZG.FONT_JP = FONT_JP;

  function addRR(ctx, x, y, w, h, r) { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function glow(ctx, x, y, r, color, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
  function softBlob(ctx, x, y, r, color, a) { // ぼかしの代わり（Safariでも動くようにfilterは使わない）
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x, y, r * 0.55, r, [[0, color], [1, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }
  function rays(ctx, x, y, len, n, color, a, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) { ctx.rotate((Math.PI * 2) / n); ctx.fillStyle = lin(ctx, 0, 0, len, 0, [[0, color], [1, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -len * 0.06); ctx.lineTo(len, len * 0.06); ctx.fill(); }
    ctx.restore();
  }
  function crystal(ctx, x, y, w, h, c1, c2, tilt = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.75); ctx.lineTo(w / 2, 0); ctx.closePath();
    ctx.fillStyle = lin(ctx, -w / 2, 0, w / 2, 0, [[0, c2], [0.45, c1], [0.55, '#ffffff'], [0.6, c1], [1, c2]]); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, w * 0.04); ctx.stroke();
    ctx.restore();
  }

  // ---------- 背景 ----------
  const PAINT = {
    gems(ctx, w, h) { // 水晶の神殿
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#120a3a'], [0.45, '#2a1470'], [1, '#0a0624']]); ctx.fillRect(0, 0, w, h);
      rays(ctx, w / 2, -h * 0.05, h * 1.1, 18, 'rgba(180,150,255,.5)', 0.25);
      glow(ctx, w / 2, h * 0.32, w * 0.8, 'rgba(140,90,255,.55)');
      const r = seeded(4);
      // 奥の柱とアーチ
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#0c0630';
      for (const k of [0.08, 0.92]) { ctx.fillRect(w * k - w * 0.06, h * 0.05, w * 0.12, h); }
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.12, w * 0.46, h * 0.1, 0, Math.PI, 0); ctx.lineWidth = w * 0.05; ctx.strokeStyle = '#0c0630'; ctx.stroke(); ctx.restore();
      // 水晶の群れ（左右下）
      const groups = [[0.06, 1.0, 1], [0.94, 1.0, -1], [0.2, 1.02, 1], [0.8, 1.02, -1]];
      groups.forEach(([gx, gy, dir], gi) => {
        glow(ctx, w * gx, h * gy - h * 0.1, w * 0.35, gi % 2 ? 'rgba(80,200,255,.45)' : 'rgba(220,90,255,.45)');
        for (let i = 0; i < 7; i++) {
          const cw = w * (0.035 + r() * 0.05), ch = h * (0.1 + r() * 0.22);
          crystal(ctx, w * gx + (r() - 0.5) * w * 0.2, h * gy, cw, ch, gi % 2 ? '#7fdcff' : '#d48aff', gi % 2 ? '#1e4a9a' : '#5a1e9a', (r() - 0.5) * 0.7 * dir);
        }
      });
      for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.2 + r() * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r() * w, r() * h, r() * 1.6 + 0.3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    fruit(ctx, w, h) { // 果樹園の楽園
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#3ec7ff'], [0.4, '#9be8ff'], [0.65, '#ffe1b0'], [1, '#ffb27a']]); ctx.fillRect(0, 0, w, h);
      glow(ctx, w * 0.78, h * 0.12, w * 0.5, 'rgba(255,250,200,.95)');
      rays(ctx, w * 0.78, h * 0.12, h, 22, 'rgba(255,255,230,.6)', 0.3);
      const r = seeded(9);
      // 雲
      for (let i = 0; i < 7; i++) {
        const cx = r() * w, cy = h * (0.06 + r() * 0.25), s = w * (0.12 + r() * 0.12);
        for (let k = 0; k < 6; k++) softBlob(ctx, cx + (k - 2.5) * s * 0.35, cy + (k % 2 ? -s * 0.15 : s * 0.05), s * (0.35 + (k % 3) * 0.1), '#ffffff', 0.85);
      }
      // 丘（3層）
      const hill = (y0, amp, c1, c2, seed) => {
        const rr = seeded(seed); ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, y0 + Math.sin(x / w * 6 + seed) * amp + Math.sin(x / w * 13 + seed * 2) * amp * 0.3);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, y0 - amp, 0, h, [[0, c1], [1, c2]]); ctx.fill();
        // 木
        for (let i = 0; i < 6; i++) {
          const tx = rr() * w, ty = y0 + Math.sin(tx / w * 6 + seed) * amp - 2, tr = w * (0.03 + rr() * 0.03);
          ctx.fillStyle = '#7a4a22'; ctx.fillRect(tx - tr * 0.12, ty - tr * 0.6, tr * 0.24, tr * 0.8);
          ctx.fillStyle = lin(ctx, 0, ty - tr * 2, 0, ty, [[0, '#7fe05a'], [1, '#2f9a3a']]); ctx.beginPath(); ctx.arc(tx, ty - tr * 1.1, tr, 0, 7); ctx.fill();
          ['#ff3b5c', '#ffb02e', '#ffe14a'].forEach((fc, k) => { ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(tx + (k - 1) * tr * 0.5, ty - tr * (1.1 + (k % 2) * 0.4), tr * 0.15, 0, 7); ctx.fill(); });
        }
      };
      hill(h * 0.58, h * 0.03, '#9be37a', '#4aa84a', 1);
      hill(h * 0.7, h * 0.04, '#6ccf54', '#2f8a3a', 2);
      hill(h * 0.84, h * 0.03, '#4fb848', '#1e6a2a', 3);
      for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.5; ctx.fillStyle = ['#fff', '#ffe14a', '#ff8ad8'][i % 3]; ctx.beginPath(); ctx.arc(r() * w, h * (0.6 + r() * 0.4), 1.5 + r() * 2, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    mine(ctx, w, h) { // 地下の鉱山
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#2a1a0e'], [0.5, '#1a0f07'], [1, '#0a0603']]); ctx.fillRect(0, 0, w, h);
      const r = seeded(13);
      // 岩肌
      for (let i = 0; i < 60; i++) {
        const x = r() * w, y = r() * h, s = w * (0.05 + r() * 0.12);
        ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6);
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * 1.047 + r() * 0.5, d = s * (0.6 + r() * 0.5); ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); } ctx.closePath();
        ctx.fillStyle = `rgba(${90 + r() * 40},${60 + r() * 25},${35 + r() * 15},${0.25 + r() * 0.25})`; ctx.fill(); ctx.restore();
      }
      // 金の鉱脈
      ctx.strokeStyle = 'rgba(255,200,80,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); let x = r() * w, y = r() * h; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * w * 0.15; y += r() * h * 0.06; ctx.lineTo(x, y); } ctx.stroke(); }
      // 坑木（左右の柱と上の梁）
      const beam = (x, y, bw, bh) => { ctx.fillStyle = lin(ctx, x, 0, x + bw, 0, [[0, '#4a2a10'], [0.5, '#8a5a2a'], [1, '#3a1e08']]); ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh); };
      beam(w * 0.02, 0, w * 0.07, h); beam(w * 0.91, 0, w * 0.07, h);
      ctx.save(); ctx.fillStyle = lin(ctx, 0, h * 0.02, 0, h * 0.07, [[0, '#8a5a2a'], [1, '#3a1e08']]); ctx.fillRect(0, h * 0.02, w, h * 0.05); ctx.restore();
      // ランタン
      [[0.12, 0.12], [0.88, 0.12]].forEach(([lx, ly]) => {
        glow(ctx, w * lx, h * ly, w * 0.45, 'rgba(255,170,60,.55)');
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(w * lx - 7, h * ly - 14, 14, 4);
        ctx.fillStyle = rad(ctx, w * lx, h * ly, 1, 10, [[0, '#fff6c0'], [0.5, '#ffb02e'], [1, '#a85a00']]); ctx.beginPath(); ctx.ellipse(w * lx, h * ly, 8, 11, 0, 0, 7); ctx.fill();
      });
      // レール
      ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 3;
      [0.95, 0.985].forEach((k) => { ctx.beginPath(); ctx.moveTo(0, h * k); ctx.lineTo(w, h * k); ctx.stroke(); });
      for (let x = 0; x < w; x += 22) { ctx.fillStyle = '#4a2a10'; ctx.fillRect(x, h * 0.945, 10, h * 0.05); }
    },
  };
  const bgCache = new Map();
  const bgImages = {}, chars = {};
  ZG.scene = {
    setBackground(theme, img) { bgImages[theme] = img; for (const k of [...bgCache.keys()]) if (k.startsWith(theme + ':')) bgCache.delete(k); },
    setCharacter(theme, img, opts = {}) { chars[theme] = { img, anchor: opts.anchor || 'top', align: opts.align || 'right', height: opts.height || 0.4 }; },
    hasCharacter(theme) { return !!(chars[theme] && chars[theme].img.naturalWidth); },
    characterAnchor(theme) { return chars[theme]?.anchor || 'top'; },
    // キャラクター（画像があるときだけ）。盤面の後ろ、横から顔を出す位置にふわふわ浮かせて描く
    character(ctx, theme, w, h, t, board) {
      const c = chars[theme];
      if (!c || !c.img.naturalWidth) return;
      const ratio = c.img.naturalWidth / c.img.naturalHeight;
      const bob = Math.sin(t / 650) * h * 0.006;
      let ch = h * c.height, x, y;
      if (c.anchor === 'top') { // 盤面の上（縦長のスマホ向け）。下の部分は盤面の後ろに隠れる
        const room = board.y - 84;
        ch = Math.max(60, Math.min(ch, room / 0.8));
        const cw = ch * ratio;
        x = c.align === 'left' ? board.x - cw * 0.08 : c.align === 'center' ? w / 2 - cw / 2 : board.x + board.w - cw * 0.92;
        y = board.y - ch * 0.8;
      } else if (c.anchor === 'left') { x = Math.max(-ch * ratio * 0.25, board.x - ch * ratio * 0.55); y = board.y + board.h - ch * 0.95; }
      else { x = Math.min(w - ch * ratio * 0.75, board.x + board.w - ch * ratio * 0.45); y = board.y + board.h - ch * 0.95; }
      const cw = ch * ratio;
      ctx.save();
      // 盤面の内側には描かない（絵柄が見づらくならないように）
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(board.x - 2, board.y - 2, board.w + 4, board.h + 4); ctx.clip('evenodd');
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18;
      ctx.drawImage(c.img, x, y + bob, cw, ch); ctx.restore();
    },
    background(theme, w, h) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = `${theme}:${Math.round(w)}x${Math.round(h)}`;
      if (bgCache.has(key)) return bgCache.get(key);
      const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
      const img = bgImages[theme];
      if (img && img.naturalWidth) { // 画面いっぱいに切り抜いて貼る（cover）
        const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, (w - iw) / 2, 0, iw, ih);
        // Keep background art visible, while adding depth behind the cabinet.
        ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0,'rgba(0,0,0,.28)'],[.25,'rgba(0,0,0,.02)'],[.72,'rgba(0,0,0,.1)'],[1,'rgba(0,0,0,.65)']]); ctx.fillRect(0,0,w,h);
        ctx.fillStyle = rad(ctx,w*.5,h*.45,Math.min(w,h)*.16,Math.max(w,h)*.72,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.65)']]); ctx.fillRect(0,0,w,h);
        bgCache.set(key, c);
        return c;
      }
      (PAINT[theme] || PAINT.gems)(ctx, w, h);
      bgCache.set(key, c);
      return c;
    },
    // 盤面のまわりの装飾フレーム
    frame(ctx, theme, x, y, w, h, t) {
      const b = theme==='fruit'||(theme==='gems'&&w<=640)?Math.max(5,Math.min(w,h)*.019):Math.max(9, Math.min(w, h) * 0.039);
      ctx.save();
      // 内側（半透明の盤面）
      ZG.rr(ctx, x, y, w, h, b);
      const inner = theme === 'fruit' ? ['#ffe3f2','#de9dc9'] : theme === 'mine' ? ['#493524','#1d130c'] : ['#4a2d7a','#251447'];
      ctx.fillStyle = lin(ctx,0,y,0,y+h,[[0,inner[0]],[.55,inner[1]],[1,inner[0]]]);
      ctx.fill();
      ctx.save(); ZG.rr(ctx,x,y,w,h,b);ctx.clip();
      ctx.fillStyle=rad(ctx,x+w/2,y+h/2,0,Math.max(w,h)*.7,[[0,'rgba(255,255,255,.08)'],[1,'rgba(0,0,0,.24)']]);ctx.fillRect(x,y,w,h);
      ctx.restore();
      // 外枠
      const outer = () => ZG.rr(ctx, x - b, y - b, w + b * 2, h + b * 2, b * 1.6);
      const ring = () => { ctx.beginPath(); addRR(ctx, x - b, y - b, w + b * 2, h + b * 2, b * 1.6); addRR(ctx, x, y, w, h, b); };
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = b * 1.5; ctx.shadowOffsetY = b * 0.4;
      ring(); // 穴あき
      const pal = theme === 'fruit' ? ['#fff7e7', '#ffb7d1', '#b54e8c'] : theme === 'mine' ? ['#d8a868', '#7a4a1a', '#3a1e08'] : ['#fff4d3', '#d2acff', '#6b3bb7'];
      ctx.fillStyle = lin(ctx, 0, y - b, 0, y + h + b, [[0, pal[0]], [0.18, pal[1]], [0.5, pal[2]], [0.82, pal[1]], [1, pal[0]]]);
      ctx.fill('evenodd');
      ctx.shadowColor = 'transparent';
      outer(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();
      ZG.rr(ctx,x-b*.66,y-b*.66,w+b*1.32,h+b*1.32,b*1.3);ctx.strokeStyle='rgba(255,245,211,.75)';ctx.lineWidth=1.4;ctx.stroke();
      ZG.rr(ctx,x-b*.27,y-b*.27,w+b*.54,h+b*.54,b*1.15);ctx.strokeStyle='rgba(45,22,9,.85)';ctx.lineWidth=2;ctx.stroke();
      ZG.rr(ctx, x, y, w, h, b); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
      // 角の飾り
      const corners = [[x - b * 0.5, y - b * 0.5], [x + w + b * 0.5, y - b * 0.5], [x - b * 0.5, y + h + b * 0.5], [x + w + b * 0.5, y + h + b * 0.5]];
      corners.forEach(([cx, cy], i) => {
        const r = b * 1.15;
        if (theme === 'mine') { // ボルト
          ctx.fillStyle = rad(ctx, cx - r * 0.3, cy - r * 0.3, 0, r, [[0, '#f0f2f5'], [0.6, '#8a929e'], [1, '#3a4048']]); ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, 0, 7); ctx.fill();
          ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy); ctx.lineTo(cx + r * 0.4, cy); ctx.stroke();
        } else if (theme === 'fruit') { // 葉っぱ
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * 1.57 + 0.6);
          ctx.fillStyle = lin(ctx, 0, -r, 0, r, [[0, '#9be37a'], [1, '#2f8a3a']]); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.6, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = '#1e6a2a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        } else { // 宝石
          const sp = ZG.art.sprite('gems', ['l1', 'l3', 'l2', 'l4'][i], r * 2.2);
          const full = r * 2.2 + sp.pad * 2; ctx.drawImage(sp, cx - full / 2, cy - full / 2, full, full);
        }
      });
      // きらめき
      if (theme !== 'mine') {
        const k = (t / 2600) % 1; const sx = x - b + (w + b * 2) * k;
        ctx.save(); ring(); ctx.clip('evenodd');
        ctx.fillStyle = lin(ctx, sx - 40, 0, sx + 40, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(sx - 40, y - b, 80, h + b * 2); ctx.restore();
      }
      ctx.restore();
    },
    // 金の立体文字（BIG WIN など）
    text3d(ctx, text, x, y, size, opts = {}) {
      ctx.save();
      ctx.font = `${size}px ${opts.font || FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const depth = Math.max(3, size * 0.12);
      for (let d = depth; d > 0; d -= 1) { ctx.fillStyle = d > depth * 0.6 ? (opts.deep || '#5a2a00') : (opts.mid || '#a85a00'); ctx.fillText(text, x, y + d); }
      ctx.lineWidth = size * 0.14; ctx.strokeStyle = opts.stroke || '#3a1400'; ctx.strokeText(text, x, y);
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      (opts.colors || ['#fffbe6', '#ffe14a', '#ffb000', '#ff7a00']).forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = opts.rainbow ? ZG.rainbow(ctx, x - size * 3, x + size * 3) : g; ctx.fillText(text, x, y);
      ctx.save(); ctx.globalAlpha = 0.55; ctx.lineWidth = size * 0.03; ctx.strokeStyle = '#fff'; ctx.strokeText(text, x, y - size * 0.03); ctx.restore();
      ctx.restore();
    },
  };
})();
