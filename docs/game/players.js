// 3種類のゲーム画面。サーバーから届いた台本（script）を、Canvas 上でアニメーション再生する。
// ZG.createGame(canvas, { game, region }, hooks) → { play(result), idle(), bigWin(), setSpeed(), skip(), destroy() }
//   region(w, h) → 盤面を置く範囲 {x, y, w, h}（全画面のときに上下のUIを避けるため）
//   hooks: { onScore(合計), onSpinWin(このスピンの勝ち), onSpin(何回目, 全部で何回), fmt(数値→文字) }
(function () {
  const ZG = (window.ZG = window.ZG || {});
  const E = () => ZG.Ease;
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const S = (name, arg) => ZG.sfx && ZG.sfx.play(name, arg);

  function makeStage(canvas, theme, opt, drawExtra) {
    const st = new ZG.Stage(canvas, {
      fit: opt.region ? 'container' : 'aspect',
      aspect: opt.aspect || 1,
      bg: (ctx, w, h, t) => {
        const bg = ZG.scene.background(theme, w, h);
        ctx.drawImage(bg, 0, 0, w, h);
        drawExtra(ctx, w, h, t);
      },
    });
    st.theme = theme;
    return st;
  }
  // このスピンの勝ち（盤面の上に出す「WIN」表示）
  function spinWinNode(st, getPos, fmt, fine) {
    const n = st.add({ z: 60, v: 0, shown: 0 });
    n.draw = (ctx, nd) => {
      if (nd.shown <= 0 || st.theme==='gems' || st.theme==='fruit') return;
      const p = getPos();
      ctx.save();
      const v = nd.shown;
      ZG.scene.text3d(ctx, nd.formula || ((nd.label || 'WIN') + ' ' + (fine && v < 100 ? String(Math.round(v * 100) / 100) : fmt(Math.round(v)))), p.x, p.y, Math.min(30, st.w / 12), { colors: ['#ffffff', '#fff3c4', '#ffd54a'] });
      ctx.restore();
    };
    return n;
  }

  // ---------- 盤面型（RUSH / FRUIT 共通） ----------
  function gridGame(canvas, opt, hooks, cfg) {
    const { cols, rows, theme } = cfg;
    const L = { cell: 40, ox: 0, oy: 0 };
    const st = makeStage(canvas, theme, { ...opt, aspect: cfg.aspect }, (ctx, w, h, t) => {
      ZG.scene.character(ctx, theme, w, h, t, { x: L.ox, y: L.oy, w: L.cell * cols, h: L.cell * rows });
      ZG.scene.frame(ctx, theme, L.ox - 6, L.oy - 6, L.cell * cols + 12, L.cell * rows + 12, t);
      // 列の区切り
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
      for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
        const x=L.ox+c*L.cell,y=L.oy+r*L.cell;
        ctx.fillStyle=theme==='fruit'?((c+r)%2?'rgba(255,239,245,.83)':'rgba(228,176,211,.76)'):((c+r)%2?'rgba(31,20,58,.84)':'rgba(17,12,37,.83)');
        ZG.rr(ctx,x+1,y+1,L.cell-2,L.cell-2,Math.max(3,L.cell*.08));ctx.fill();
      }
      for (let c = 1; c < cols; c++) { const x = L.ox + c * L.cell; ctx.beginPath(); ctx.moveTo(x, L.oy); ctx.lineTo(x, L.oy + rows * L.cell); ctx.stroke(); }
      ctx.restore();
    });
    const layout = (w, h) => {
      const R = opt.region ? opt.region(w, h) : { x: 0, y: 0, w, h };
      const compact=R.w<=640;
      const pad = theme==='fruit'||compact?Math.max(4,Math.min(R.w,R.h)*.012):Math.max(12, Math.min(R.w, R.h) * 0.04);
      L.cell = Math.max(8,Math.floor(Math.min((R.w - pad * 2) / cols, (R.h - pad * 2 - (theme==='fruit'||compact?0:28)) / rows)));
      L.ox = Math.round(R.x + (R.w - L.cell * cols) / 2); L.oy = Math.round(R.y + (R.h - L.cell * rows) / 2);
      // キャラを盤面の上に置くときは、盤面を下に寄せて上にスペースを作る
      if(theme!=='fruit'&&!compact)L.oy = Math.round(R.y + R.h - pad * 1.1 - L.cell * rows);
      // 盤面の外（枠の上）に絵柄がはみ出して見えないように切り抜く
      if (st) st.clipRect = { x: L.ox - 4, y: L.oy - 4, w: L.cell * cols + 8, h: L.cell * rows + 8 };
    };
    st.onResize = (w, h) => { layout(w, h); relayout(); };
    layout(st.w, st.h);
    st.clipRect = { x: L.ox - 4, y: L.oy - 4, w: L.cell * cols + 8, h: L.cell * rows + 8 };
    let nodes = new Array(cols * rows).fill(null);
    // Shorten routine NORMAL motions only; preserve bonus/cutin presentation timing.
    const routineTime = ms => st.speed >= 1 ? Math.round(ms * .58) : ms;
    let spotNodes = [];
    const swin = spinWinNode(st, () => ({ x: L.ox + (L.cell * cols) / 2, y: L.oy - Math.min(34, L.cell * 0.55) }), hooks.fmt);
    swin.label='TUMBLE WIN';
    const setSpinWin = (v) => { swin.formula=null;swin.v = v; st.tween(swin, { shown: v }, 300); hooks.onSpinWin && hooks.onSpinWin(v); };
    const pos = (i) => ({ x: L.ox + (i % cols) * L.cell + L.cell / 2, y: L.oy + Math.floor(i / cols) * L.cell + L.cell / 2 });
    const symSize = () => L.cell * 0.96;
    function makeNode(id, i, yOff = 0) {
      const p = pos(i);
      const n = st.add({ id, x: p.x, y: p.y + yOff, w: L.cell, h: L.cell, z: 5, clip: true });
      n.draw = (ctx, nd) => {
        if (nd.id[0] === 'B') {
          if(nd.released){ZG.scene.text3d(ctx,nd.id.replace('B','×'),0,0,L.cell*.48,{});return;}
          ZG.emblemTrail(ctx,'gems',Number(nd.id.slice(1)),0,0,L.cell,nd.motion||0);
          if(ZG.multiplierEmblem(ctx,'gems',Number(nd.id.slice(1)),0,0,L.cell*.99))return;
          const illustrated=!!ZG.art.images?.gems?.[nd.id];
          const sp = ZG.art.sprite('gems', illustrated?nd.id:'bomb', symSize());
          const full = symSize() + sp.pad * 2; ctx.drawImage(sp, -full / 2, -full / 2, full, full);
          ZG.multiplierLabel(ctx,Number(nd.id.slice(1)),0,L.cell*.12,L.cell*.88,L.cell*.48);
          return;
        }
        const size=symSize(),dy=0,sp=ZG.art.sprite(theme,nd.id,size),full=size+sp.pad*2;
        if(nd.motion>0){ctx.save();ctx.globalAlpha*=.14*nd.motion;ctx.drawImage(sp,-full/2,-full/2-L.cell*.23+dy,full,full*1.1);ctx.restore();}
        ctx.drawImage(sp,-full/2,-full/2+dy,full,full);
      };
      return n;
    }
    function relayout() { nodes.forEach((n, i) => { if (n) { const p = pos(i); n.x = p.x; n.y = p.y; } }); spotNodes.forEach((n, i) => { if (n) { const p = pos(i); n.x = p.x; n.y = p.y;if(n.badge){n.badge.x=p.x;n.badge.y=p.y;} } }); }
    function setSpots(spots, animate) {
      if (!cfg.spots) return;
      spots.forEach((v, i) => {
        let n = spotNodes[i];
        if (!n) {
          const p = pos(i);
          n = spotNodes[i] = st.add({ x: p.x, y: p.y, z: 2, v: 0 });
          n.badge=st.add({x:p.x,y:p.y,z:3,v:0,clip:true});
          n.badge.draw=(ctx,nd)=>{if(nd.v<2)return;const s=L.cell;ctx.save();ctx.globalAlpha*=.55;ctx.font='bold '+Math.max(9,s*.36)+'px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#572750';ctx.fillText('×'+nd.v,0,s*.30,s*.92);ctx.restore();};
          n.draw = (ctx, nd) => {
            if (!nd.v) return;
            const s = L.cell - 3;
            ZG.rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
            const tier=nd.v>=32?3:nd.v>=8?2:nd.v>=2?1:0;
            ctx.save();ctx.globalAlpha*=.48;ctx.fillStyle=['#f5dba5','#ffe198','#dcbaf0','#ffd0c9'][tier];ctx.fill();ctx.restore();
          };
        }
        if (n.v !== v) {
          n.v = v;n.badge.v=v;
          if (animate && v >= 2) st.landing(n.x,n.y,L.cell*.18,'#ffe9c0');
        }
      });
    }
    function clearBoard() { nodes.forEach((n) => n && st.remove(n)); nodes = new Array(cols * rows).fill(null); }
    async function dropIn(grid, routine=false) {
      const timing=ms=>ms;
      S('spin');
      const old = nodes.filter(Boolean);
      old.forEach((n, k) => {n.motion=1;st.tween(n, { y: n.y + st.h, alpha: 0 }, timing(320), E().inCubic, timing((k % cols) * 12)).then(() => st.remove(n));});
      await st.wait(old.length ? timing(200) : 0);
      nodes = grid.map((id, i) => {const n=makeNode(id, i, -st.h * .9);n.motion=1;return n;});
      const landed = new Set();
      await Promise.all(nodes.map((n, i) => {
        const p = pos(i), c = i % cols, r = Math.floor(i / cols);
        const rush=theme==='gems';
        const delay=routine?c*300/Math.max(1,cols-1):timing(c*(rush?155:125));
        const duration=routine?ZG.SPIN_TIMING.reel-(old.length?200:0)-300:timing(rush?940:780);
        return st.tween(n,{y:p.y,motion:0},duration,E().landing,delay).then(()=>{if(n.id.startsWith('B'))st.emblemLand('gems',Number(n.id.slice(1)),p.x,p.y,L.cell);if(!landed.has(c)){landed.add(c);S('land',c);const q=pos((rows-1)*cols+c);st.landing(q.x,q.y+L.cell*.34,L.cell*.28,theme==='fruit'?'#ffccf5':'#d8e4ff');}});
      }));
    }
    async function pulse(list, color, routine=false) {
      const timing=ms=>routine?routineTime(ms):ms;
      list.forEach((n) => { n.glow = L.cell * .25; n.glowColor = color; n.z = 8;st.impact(n.x,n.y,L.cell*.42,color,.35); });
      await Promise.all(list.map((n) => st.tween(n, { sx: 1.075, sy: 1.075,glow:L.cell*.33 }, timing(180), E().outCubic)));
      await Promise.all(list.map((n) => st.tween(n, { sx: 1, sy: 1,glow:L.cell*.12 }, timing(160), E().inCubic)));
    }
    async function explode(idx, color) {
      S('pop');
      idx.forEach((i) => { const n = nodes[i]; if (!n) return; st.burst(n.x, n.y, { n: 8, colors: [color, '#fff', ZG.shade(color, 0.45)], speed: 4, size: L.cell * 0.055, life: 460,shape:cfg.spots?(['f1','f2'].includes(n.id)?'peel':['f3','f4'].includes(n.id)?'circle':'square'):'star' }); });
      await Promise.all(idx.map((i) => nodes[i] && st.tween(nodes[i], { sx: .82, sy: .82, alpha: 0 }, routineTime(180), E().inCubic)));
      idx.forEach((i) => { if (nodes[i]) st.remove(nodes[i]); nodes[i] = null; });
    }
    async function gravity(newGrid, hitSet) {
      const next = new Array(cols * rows).fill(null);
      const moves = [];
      for (let c = 0; c < cols; c++) {
        const keep = [];
        for (let r = 0; r < rows; r++) { const i = r * cols + c; if (!hitSet.has(i)) keep.push(nodes[i]); }
        const k = rows - keep.length;
        keep.forEach((n, j) => { const to = (k + j) * cols + c; next[to] = n; moves.push([n, to]); });
        for (let r = 0; r < k; r++) { const to = r * cols + c; const n = makeNode(newGrid[to], to, -(k + 0.5) * L.cell - 30); next[to] = n; moves.push([n, to, true]); }
      }
      nodes = next;
      await Promise.all(moves.map(([n, to, fresh]) => { const p = pos(to);n.motion=Math.min(1,Math.abs(p.y-n.y)/(3*L.cell));return st.tween(n, { y: p.y,motion:0 }, routineTime(fresh ? 400 : 300), E().landing, routineTime((to % cols) * 28)).then(()=>{if(fresh){st.landing(p.x,p.y+L.cell*.22,L.cell*.20,theme==='fruit'?'#ffb7f2':'#d8d6ff');if(n.id.startsWith('B'))st.emblemLand('gems',Number(n.id.slice(1)),p.x,p.y,L.cell);}}); }));
      S('land', 2);
      nodes.forEach((n, i) => { if (n && n.id !== newGrid[i]) n.id = newGrid[i]; });
    }
    function centroid(idx) { let x = 0, y = 0; idx.forEach((i) => { const p = pos(i); x += p.x; y += p.y; }); return { x: x / idx.length, y: y / idx.length }; }

    async function playSpin(sp, state) {
      const spinStart=state.score;
      setSpinWin(0);
      setSpots(sp.spots || new Array(cols * rows).fill(0), false);
      await dropIn(sp.first,true);
      await st.wait(100);
      if (sp.add) { S('free'); }
      let base = 0, stepNo = 0;
      for (const step of sp.steps) {
        const hits = step.hits || [].concat(...step.wins.map((w) => w.cells));
        const groups = step.wins || [{ cells: step.hits, sym: step.syms[0], pay: step.pay, mult: 1 }];
        const color = ZG.art.COLORS[theme][groups[0].sym] || '#fff';
        S('win', stepNo++);
        const outlines=[];
        if(cfg.spots)for(const group of groups){
          const members=new Set(group.cells);
          const outline=st.add({x:0,y:0,z:12});
          outline.draw=ctx=>{
            ctx.beginPath();
            for(const j of members){
              const x=L.ox+j%cols*L.cell,y=L.oy+Math.floor(j/cols)*L.cell,d=L.cell;
              if(!members.has(j-cols)){ctx.moveTo(x,y);ctx.lineTo(x+d,y);}
              if(!members.has(j+cols)){ctx.moveTo(x,y+d);ctx.lineTo(x+d,y+d);}
              if(j%cols===0||!members.has(j-1)){ctx.moveTo(x,y);ctx.lineTo(x,y+d);}
              if(j%cols===cols-1||!members.has(j+1)){ctx.moveTo(x+d,y);ctx.lineTo(x+d,y+d);}
            }
            ctx.strokeStyle='#fffbe4';ctx.lineWidth=4;ctx.shadowColor='#ff77aa';ctx.shadowBlur=7;ctx.stroke();
          };
          outlines.push(outline);
        }
        await pulse(hits.map((i) => nodes[i]).filter(Boolean), color,true);
        if(cfg.spots){
          if([2,4,8,12].includes(stepNo))await st.featureCue('CHAIN ×'+stepNo,groups.length+' クラスター成立',{color:'#ffb5df',hold:250,sound:'pop'});
          for(const group of groups){
            const center=centroid(group.cells);
            const active=group.cells.filter(i=>(spotNodes[i]?.v||0)>0);
            if(active.length)await st.carry(pos(active[0]),center,'×'+group.mult,'#ffe786',Math.max(12,L.cell*.29),280);
            if(group.mult>1){st.impact(center.x,center.y,L.cell*.65,'#ff9dd4',1);S('wild');}
          }
        }
        hooks.onTumble?.(groups);
        const stepPay=groups.reduce((sum,g)=>sum+g.pay,0),texts=[st.popText(L.ox+cols*L.cell/2,L.oy+rows*L.cell/2,'+'+hooks.fmt(stepPay)+' C',{size:Math.max(15,L.cell*.4),hold:120,maxWidth:L.cell*cols*.88})];
        outlines.forEach(n=>st.remove(n));
        await explode(hits, color);
        if(cfg.spots){setSpots(step.spots,true);await st.wait(routineTime(120));}
        const pay = groups.reduce((s, g) => s + g.pay, 0);
        base += pay; setSpinWin(base);
        if(cfg.spots&&Number.isFinite(step.credited))hooks.onScore(spinStart+step.credited);
        await gravity(step.grid, new Set(hits));
        await Promise.all(texts);
      }
      const normalMultiplier = theme === 'gems' && !!sp.bombs?.length;
      if (normalMultiplier) st.presentationSpeed = st.speed;
      try {
      if (base>0 && sp.bombs && sp.bombs.length) {
        const bn = sp.bombs.map((b) => nodes[b.pos]).filter(Boolean);
        S('mult');
        if(sp.mult>=10)await st.featureCue('MULTIPLIER ×'+sp.mult,sp.bombs.length+' 個の倍率シンボル',{color:'#ffd765',hold:620,sound:'featureWin'});
        if(theme==='gems')swin.formula=hooks.fmt(base)+' × '+sp.mult;

        await pulse(bn, '#ffb02e');
        st.flash('#ffe9a0', 0.22); st.shake(3, 260);
        bn.forEach((n) => (n.clip = false));
        let sum=0;for(const n of bn){n.released=true;st.sparkle(n.x,n.y,L.cell*.32,6);
          const {x,y}=st.anchor('#gmRoundAmount',{x:st.w/2,y:L.oy-L.cell*.4});st.beam(n.x,n.y,x,y,'#ffd36e');await st.tween(n, { x,y,sx:1.18,sy:1.18 }, 340, E().inOutCubic);sum+=Number(n.id.slice(1));hooks.onMultiplier?.(base,sum);n.alpha=0;}
        bn.forEach((n) => { st.burst(n.x, n.y, { n: 30, colors: ['#ffd54a', '#ff8a00', '#fff'], speed: 6.5, size: 5 }); st.remove(n); nodes[nodes.indexOf(n)] = null; });
        S('boom');
        await st.popText(st.w / 2, L.oy + (L.cell * rows) / 2, `×${sp.mult}`, { size: Math.min(72, L.cell * 1.4), color: '#fff', stroke: '#b0200a', hold: 550 });
        setSpinWin(sp.win-(sp.scatterPay||0));
        S('coin');
      }
      if(sp.scatterPay){const ss=nodes.filter(n=>n&&n.id==='S');await pulse(ss,'#ffe1a0');setSpinWin(sp.win);await st.popText(st.w/2,L.oy+L.cell*rows/2,'SCATTER +'+hooks.fmt(sp.scatterPay),{size:Math.min(38,L.cell*.6),hold:250});}
      setSpinWin(sp.win);
      await hooks.onRoundWin?.(sp.win, normalMultiplier ? st.speed : undefined);
      state.score=spinStart+sp.win;hooks.onScore(state.score, normalMultiplier ? st.speed : undefined);
      await st.celebrateWin(sp.win,opt.getRate?.(),hooks.fmt);
      } finally {
        if (normalMultiplier) st.presentationSpeed = undefined;
      }
      await st.roundPause();
      if (sp.add) { S('free');const scatter=nodes.find(n=>n?.id==='S');if(scatter)await st.carry(scatter,st.anchor('#rSpin',{x:st.w*.87,y:st.h*.84}),'+'+sp.add,'#ffd480'); await pulse(nodes.filter((n) => n && n.id === 'S'), '#ff8ad8'); if(cfg.spots)await st.transition('gift','+'+sp.add+' SPINS');else await st.banner([`${sp.add} FREE SPINS`, sp.trigger?'ボーナス開始':'フリースピン追加'], { rainbow: true }); }
    }
    return {
      st,
      async warm(cb) { await Promise.all((cfg.spots?['gift']:['victories','torii']).map(name=>st.loadScene(name)));await ZG.art.preload(theme, [...ZG.art.IDS[theme].filter((x) => x !== 'bomb'), ...(theme === 'gems' ? ['bomb','l5'] : [])], symSize(), cb); },
      idle() { const ids = cfg.idle(); setSpots(new Array(cols * rows).fill(0)); clearBoard(); nodes = ids.map((id, i) => makeNode(id, i)); setSpinWin(0); },
      async play(r) {
        const state = { score: r.entry?.win || 0,unit:r.unit };
        let total = r.entry?.initialSpins || 10;
        if(r.entry){
          hooks.onMode?.('ENTRY');hooks.onSpin(0,total);
          setSpots(new Array(cols*rows).fill(0),false);
          await dropIn(r.entry.grid);
          await pulse(nodes.filter(n=>n&&n.id==='S'),'#ffe1a0');
          setSpinWin(state.score);await hooks.onRoundWin?.(state.score);hooks.onScore(state.score);
          S('free');
          await hooks.onBonusIntro?.({spins:total});
        }else await hooks.onBonusIntro?.({spins:total});
        for (let k = 0; k < r.script.length; k++) {
          hooks.onMode?.('BONUS');
          hooks.onSpin(k + 1, total);
          await playSpin(r.script[k], state);
          total += r.script[k].add || 0;
          hooks.onSpin(k + 1, total);
        }
        if(cfg.spots){await Promise.all(nodes.filter(Boolean).map(n=>st.tween(n,{alpha:.15},240)));await st.banner(['TOTAL WIN',hooks.fmt(r.score)+' C'],{hold:600});}
        if(r.guarantee){await st.banner(['最終配当','1 C'],{hold:350});await hooks.onRoundWin?.(r.guarantee);}if(r.capped)await st.banner(['MAX WIN',hooks.fmt(r.score)+' C'],{});hooks.onScore(r.score);hooks.onMode?.('COMPLETE');
      },
    };
  }

  // ---------- 採掘（DIG） ----------
  // 上に 5×3 のスロット枠、下に 5列×6段のブロックと宝箱5つ。
  // スロットに止まったつるはしが真下の列へ落ちて、数字の回数ぶん上からブロックを削る。
  // 列を掘り切ると宝箱が開き、倍率（×2〜×10）は掛け算で最後に配当の合計へ掛かる。
  function mineGame(canvas, opt, hooks) {
    const COLS = 5, ROWS = 6, RR = 3;
    const HP = { D: 1, T: 2, C: 4, I: 4, G: 5, X: 6, R: 7, E: 2, Q: 4 };
    const TIER = { 1: '#c8803e', 2: '#e8edf4', 3: '#ffc21a', 5: '#4ee8ff', 7: '#9a5aff' };
    const CHEST = { 2: '#1f4fe0', 3: '#2a86ea', 4: '#19b8cf', 5: '#18c27c', 6: '#46d23a', 7: '#b4dc26', 8: '#f0b41c', 9: '#f07a1a', 10: '#e8283a' };
    const ITEM = { b: 'book', g: 'goldbook', n: 'N', s: 'dyn' };
    const L = { cell: 40, ox: 0, oy: 0, rc: 34, rx: 0, ry: 0 };
    let dug = [], mult = 1, chestM = [];
    const st = makeStage(canvas, 'mine', { ...opt, aspect: 5 / 10.9 }, (ctx, w, h, t) => {
      const bw = L.cell * COLS, bh = L.cell * (ROWS + 1);
      ZG.scene.character(ctx, 'mine', w, h, t, { x: L.rx, y: L.ry, w: L.rc * COLS, h: L.oy + bh - L.ry });
      // 掘削アイテム用の独立した金属製トレー。
      ZG.rr(ctx,L.rx-5,L.ry-5,L.rc*COLS+10,L.rc*RR+10,8);ctx.fillStyle='#54403a';ctx.fill();ctx.strokeStyle='#ecd6b8';ctx.lineWidth=2;ctx.stroke();
      for(let r=0;r<RR;r++)for(let c=0;c<COLS;c++){
        const x=L.rx+c*L.rc,y=L.ry+r*L.rc;const g=ctx.createLinearGradient(x,y,x,y+L.rc);g.addColorStop(0,'#d3c1b7');g.addColorStop(1,'#887b78');ctx.fillStyle=g;ctx.fillRect(x+1,y+1,L.rc-2,L.rc-2);ctx.strokeStyle='#685a54';ctx.strokeRect(x+1,y+1,L.rc-2,L.rc-2);
      }
      ctx.strokeStyle = 'rgba(255,220,160,.16)'; ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(L.rx + c * L.rc, L.ry); ctx.lineTo(L.rx + c * L.rc, L.ry + L.rc * RR); ctx.stroke(); }
      for (let r = 1; r < RR; r++) { ctx.beginPath(); ctx.moveTo(L.rx, L.ry + r * L.rc); ctx.lineTo(L.rx + L.rc * COLS, L.ry + r * L.rc); ctx.stroke(); }
      // 盤面
      // 破壊済みのマスは背景まで抜けて、残った鉱石がそのまま見える。
      const cy = L.oy + ROWS * L.cell;
      const g2 = ctx.createLinearGradient(0, cy, 0, cy + L.cell); g2.addColorStop(0, 'rgba(120,70,20,.55)'); g2.addColorStop(1, 'rgba(40,20,5,.75)');
      ctx.fillStyle = g2; ctx.fillRect(L.ox, cy, bw, L.cell);
      ctx.fillStyle = '#c88a3a'; ctx.fillRect(L.ox, cy - 2, bw, 4);

    });
    const layout = (w, h) => {
      const R = opt.region ? opt.region(w, h) : { x: 0, y: 0, w, h };
      const pad = R.w<=640?Math.max(5,R.w*.012):Math.max(6, R.w * 0.025);
      L.cell = Math.max(6,Math.floor(Math.min((R.w - pad * 2) / COLS, (R.h - pad * 2) / (RR*.82 + 0.3 + ROWS + 1))));
      L.rc = L.cell*.82;
      L.ox = Math.round(R.x + (R.w - L.cell * COLS) / 2);
      L.oy = Math.round(R.y + R.h - pad * 0.5 - L.cell * (ROWS + 1));
      L.rx = Math.round(R.x + (R.w - L.rc * COLS) / 2);
      L.ry = Math.round(L.oy - L.cell * 0.3 - L.rc * RR);
    };
    st.onResize = (w, h) => { layout(w, h); relayout(); };
    layout(st.w, st.h);
    const setSpinWin = (v) => { hooks.onSpinWin?.(v); };
    const pos = (c, r) => ({ x: L.ox + c * L.cell + L.cell / 2, y: L.oy + r * L.cell + L.cell / 2 });
    const rpos = (c, k) => ({ x: L.rx + c * L.rc + L.rc / 2, y: L.ry + k * L.rc + L.rc / 2 });
    // 色つきのスプライト（つるはしの段階・宝箱の倍率）
    const tintCache = new Map();
    function tinted(id, size, color, amt) {
      const key = `${id}:${Math.round(size)}:${color}:${amt}`;
      if (tintCache.has(key)) return tintCache.get(key);
      const sp = ZG.art.sprite('mine', id, size);
      const c = document.createElement('canvas'); c.width = sp.width; c.height = sp.height;
      const x = c.getContext('2d'); x.drawImage(sp, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.globalAlpha = amt; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      c.pad = sp.pad; tintCache.set(key, c); return c;
    }
    let cols = [], chests = [], reel = [];
    function makeBlock(b, c, r) {
      const p = pos(c, r);
      const n = st.add({ id: b, hp: HP[b], c, r, x: p.x, y: p.y, z: 5, seed: (Math.random() * 1000) | 0 });
      n.draw = (ctx, nd) => {
        const s = L.cell * .96;
        const sp = ZG.art.sprite('mine', nd.id, s); const full = s + sp.pad * 2; ctx.drawImage(sp, -full / 2, -full / 2, full, full);
        const max = HP[nd.id], dmg = max - nd.hp;
        if(dmg){const next=cols[nd.c]?.[nd.r+1];const preview=ZG.art.sprite('mine',next?.id||('chest-'+chests[nd.c]?.m),s);if(preview){ctx.save();ctx.beginPath();ctx.moveTo(-s*.15,s*.24);ctx.lineTo(s*.17,s*.11);ctx.lineTo(s*.05,s*.24);ctx.lineTo(-s*.17,s*.32);ctx.clip();ctx.drawImage(preview,-s/2,-s/2,s,s);ctx.restore();}}
        if (dmg > 0) {
          const lvl = Math.min(3, Math.ceil((dmg / max) * 3));
          const cr = ZG.art.sprite('mine', 'crack' + lvl, s, (nd.seed % 5) + 1); const f2 = s + cr.pad * 2; ctx.drawImage(cr, -f2 / 2, -f2 / 2, f2, f2);
        }
        ctx.save();ctx.font='800 '+Math.max(10,s*.24)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#201811db';ZG.rr(ctx,-s*.36,s*.22,s*.72,s*.25,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(nd.hp+'/'+max,0,s*.35,s*.66);ctx.restore();
      };
      return n;
    }
    function drawTreasureChest(ctx, size, m, color, open) {
      const metals=['#b4c7ec','#bceaff','#a5fff5','#b9ffcb','#dcffaf','#f3f99e','#ffe4a0','#ffd1a0','#fff0b0'];
      const trim=metals[m-2]||'#ffe8b0';
      ctx.save();ctx.scale(size,size);
      const path=(points,fill,stroke='#281b19',width=.025)=>{
        ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
        ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
      };
      const gradient=(a,b,y0,y1)=>{const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g;};
      const body=gradient(color,'#222034',-.1,.36),metal=gradient('#fff8df',trim,-.42,.4);
      ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,.38,.47,.08,0,0,Math.PI*2);ctx.fill();
      path([[-.45,-.12],[.36,-.12],[.45,-.02],[.45,.3],[.35,.38],[-.4,.38],[-.45,.29]],body);
      path([[.36,-.12],[.45,-.02],[.45,.3],[.35,.38],[.35,-.1]],gradient(color,'#171928',-.15,.4));
      const crown=m>=8?.12:m>=5?.07:0;
      if(open){
        path([[-.42,-.14],[-.36,-.43-crown],[.27,-.43-crown],[.42,-.14]],body);
        path([[-.42,-.12],[.36,-.12],[.25,.03],[-.29,.03]],'#fff3a5');
      }else{
        path([[-.46,-.13],[-.42,-.29],[-.28,-.39-crown],[.24,-.39-crown],[.4,-.27],[.46,-.13]],gradient(trim,color,-.45,-.13));
      }
      for(const x of [-.32,.25]){
        path([[x-.045,-.35-crown],[x+.045,-.35-crown],[x+.07,.35],[x-.07,.35]],metal,'#513a29',.012);
        for(const y of [-.2,.05,.26]){ctx.fillStyle='#fff8d0';ctx.beginPath();ctx.arc(x,y,.021,0,Math.PI*2);ctx.fill();}
      }
      path([[-.45,-.15],[.44,-.15],[.43,-.075],[-.45,-.075]],metal,'#534132',.015);
      path([[-.13,-.19],[.13,-.19],[.16,-.08],[.1,.13],[-.1,.13],[-.16,-.08]],metal);
      const sides=m===2?4:m===3?6:m===4?5:m===5?8:m===6?3:m===7?6:m===8?4:m===9?8:5;
      const gem=Array.from({length:sides},(_,i)=>{const a=i*Math.PI*2/sides-Math.PI/2;return [Math.cos(a)*.098,Math.sin(a)*.098-.04];});
      path(gem,gradient('#ffffff',color,-.14,.06),'#251f24',.014);
      if(m>=7)for(const x of [-.17,.17])path([[x,-.29-crown],[x+.04,-.36-crown],[x+.08,-.29-crown],[x+.04,-.23-crown]],trim,'#5a3e2d',.012);
      ctx.restore();
    }
    function makeChest(c, m) {
      const p = pos(c, ROWS);
      const n = st.add({ c, m, x: p.x, y: p.y, z: 6, open: 0, ray: 0, t0: Math.random() * 6 });
      n.draw = (ctx, nd, t) => {
        const s = L.cell * 0.96;
        const col = CHEST[nd.m] || '#888';
        if (nd.ray > 0) {
          ctx.save(); ctx.globalAlpha = nd.ray; ctx.rotate(((t || 0) / 1400) % (Math.PI * 2));
          for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = k % 2 ? col : 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.16, -s * 0.95); ctx.lineTo(s * 0.16, -s * 0.95); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
        const chestSize=L.cell*.96;
        const sp=ZG.art.sprite('mine',(nd.open?'chest-open-':nd.half?'chest-half-':'chest-')+nd.m,chestSize);
        const full=chestSize+sp.pad*2;
        // The multiplier emblem itself depicts a closed chest. Never layer it
        // over the state-specific chest artwork (especially after opening).
        ctx.drawImage(sp,-full/2,-full/2-(nd.open?L.cell*.045:0),full,full);
        ZG.multiplierLabel(ctx,nd.m,0,nd.open?L.cell*.14:L.cell*.015,L.cell*.86,L.cell*.28);
        if (!nd.open && dug[nd.c] && dug[nd.c].filter(Boolean).length >= ROWS - 1) {
          const k = 0.5 + 0.5 * Math.sin((t || 0) / 140 + nd.t0);
          ctx.save(); ctx.globalAlpha = 0.4 + 0.5 * k; ctx.strokeStyle = '#fff36a'; ctx.lineWidth = 3; ZG.rr(ctx, -L.cell / 2 + 2, -L.cell / 2 + 2, L.cell - 4, L.cell - 4, 8); ctx.stroke(); ctx.restore();
        }
        if(!nd.open){const remaining=ROWS-(dug[nd.c]?.filter(Boolean).length||0);ctx.save();ctx.font='800 '+Math.max(9,L.cell*.18)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#231a14';ZG.rr(ctx,-L.cell*.43,L.cell*.22,L.cell*.86,L.cell*.24,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('残'+remaining+'個',0,L.cell*.34,L.cell*.78);ctx.restore();}
      };
      return n;
    }
    // スロットのアイテム
    function makeItem(v, c, k) {
      const p = rpos(c, k);
      const isPick = v[0] === 'p';
      const n = st.add({ v, c, k, x: p.x, y: p.y, z: 30, isPick, power: isPick ? +v.slice(1) : 0, toolTier: isPick ? +v.slice(1) : 0, alpha: 1, rot: 0, sx: 1, sy: 1 });
      n.draw = (ctx, nd) => {
        const s = L.rc * 0.86;
        if (nd.isPick) {
          const col = TIER[nd.toolTier] || '#8a7a6a';
          const sp = ZG.art.sprite('mine', 'pick-'+nd.toolTier, s);
          const full = s + sp.pad * 2; ctx.drawImage(sp, -full / 2, -full / 2, full, full);
          const bx = s * 0.3, by = s * 0.3, br = Math.max(8, s * 0.2);
          for(let dot=0;dot<Math.min(7,nd.power);dot++){
            ctx.fillStyle='#ffdf86';ctx.beginPath();ctx.arc(-s*.20+dot*s*.06,s*.22,Math.max(1,s*.024),0,Math.PI*2);ctx.fill();
          }
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); ctx.strokeStyle = '#1a0c04'; ctx.lineWidth = 2; ctx.stroke();
          ctx.font = `${br * 1.35}px ${ZG.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a0c04'; ctx.fillText(String(nd.power), bx, by + 1);
        } else {
          const id = ITEM[nd.v]; if (!id) return; const sz = nd.v === 'n' ? s * 0.9 : s;
          const sp = ZG.art.sprite('mine', id, sz); const full = sz + sp.pad * 2; ctx.drawImage(sp, -full / 2, -full / 2, full, full);
        }
      };
      return n;
    }
    function relayout() {
      cols.forEach((col) => col.forEach((n) => { if (n) { const p = pos(n.c, n.r); n.x = p.x; n.y = p.y; } }));
      chests.forEach((n) => { const p = pos(n.c, ROWS); n.x = p.x; n.y = p.y; });
      reel.forEach((n) => { if (n && !n.moving) { const p = rpos(n.c, n.k); n.x = p.x; n.y = p.y; } });
    }
    function build(board, chestMult) {
      cols.flat().forEach((n) => n && st.remove(n)); chests.forEach((n) => st.remove(n)); reel.forEach((n) => n && st.remove(n));
      dug = Array.from({ length: COLS }, () => new Array(ROWS).fill(false));
      cols = board.map((col, c) => col.map((b, r) => makeBlock(b, c, r)));
      chestM = chestMult; chests = chestMult.map((m, c) => makeChest(c, m));
      reel = []; mult = 1;
    }
    const topOf = (c) => cols[c].find((n) => n);
    async function spinReel(cells) {
      reel.forEach((n) => n && st.remove(n)); reel = [];
      S('spin');
      const jobs = [];
      for (let c = 0; c < COLS; c++) for (let k = 0; k < RR; k++) {
        const v = cells[c][k]; if (v === '0') continue;
        const n = makeItem(v, c, k); const y0 = n.y; n.y = L.ry - L.rc; n.alpha = 0;
        reel.push(n);
        jobs.push(st.tween(n, { y: y0, alpha: 1 }, 700, E().landing, c * 50 + k * 20).then(()=>{st.landing(n.x,n.y+L.rc*.25,L.rc*.3,'#ffd5a5');if(k===RR-1)S('land',c);}));
      }
      await Promise.all([...jobs,st.wait(ZG.SPIN_TIMING.reel-160)]); S('land');
      await st.wait(160);
    }
    const reelAt = (c, k) => reel.find((n) => n.c === c && n.k === k);
    let curPick = null;
    async function onUpgrade(ev) {
      const book = reel.find((n) => n.c === ev.c && n.v === ev.item);
      S('mult'); st.flash(ev.power === 7 ? '#ffe9a0' : '#c8a0ff', 0.3);
      if (book) { st.sparkle(book.x, book.y, L.rc * 0.5, 10); await st.tween(book, { sx: 1.4, sy: 1.4 }, 160); st.tween(book, { sx: 1, sy: 1, alpha: 0.35 }, 200); }
      const picks = reel.filter((n) => n.c === ev.c && n.isPick);
      for(const n of picks){n.power=ev.power;n.toolTier=ev.power;st.sparkle(n.x,n.y,L.rc*.4,5);await st.tween(n,{sx:1.2,sy:1.2},140);await st.tween(n,{sx:1,sy:1},160,E().outCubic);}
    }
    async function onPick(ev) {
      const n = reelAt(ev.c, ev.k); if (!n) return;
      curPick = n; n.moving = true; n.power = ev.power; n.toolTier=ev.power; n.z = 40;
      const tgt = topOf(ev.c); const r = tgt ? tgt.r : ROWS - 1;
      const p = pos(ev.c, r);
      await st.tween(n, { x: p.x + L.cell * 0.18, y: p.y - L.cell * 0.62, rot: -0.5 }, 200 + r * 30, E().inCubic);
    }
    async function swing(n) {
      const angle=n.rot;await st.tween(n,{rot:angle-.28},55,E().outCubic);await st.tween(n, { rot: 0.55 }, 75, E().inCubic);
      st.beam(n.x-L.cell*.2,n.y-L.cell*.32,n.x+L.cell*.25,n.y+L.cell*.45,'#ffe8c3');await st.tween(n, { rot: -0.5 }, 90);
    }
    async function onHit(ev, prevHp) {
      const b = cols[ev.c][ev.r]; if (!b) return;
      const dmg = prevHp - ev.hp;
      if (ev.by && curPick && curPick.c === ev.c) { await swing(curPick); curPick.power = Math.max(0, curPick.power - dmg); }
      b.hp = ev.hp; S('hit');
      st.impact(b.x,b.y-L.cell*.2,L.cell*.38,'#ffdd95',.35);
      st.burst(b.x, b.y - L.cell * 0.4, { n: 6, colors: [ZG.art.COLORS.mine[b.id], '#fff'], speed: 2.4, size: 3, shape: 'square', up: 1.5 });
      const x0 = b.x; await st.tween(b, { x: x0 + 3 }, 35); await st.tween(b, { x: x0 - 3 }, 50); await st.tween(b, { x: x0 }, 35);
    }
    async function onBreak(ev, prevHp, state) {
      const b = cols[ev.c][ev.r]; if (!b) return;
      if (ev.by && curPick && curPick.c === ev.c) { await swing(curPick); curPick.power = Math.max(0, curPick.power - prevHp); }
      cols[ev.c][ev.r] = null;
      const color = ZG.art.COLORS.mine[ev.b] || '#aaa';
      S(['G','X','R','Q'].includes(ev.b)?'crystal':ev.b==='T'?'earth':'crumble');
      st.impact(b.x,b.y,L.cell*.62,color,.65);
      st.burst(b.x, b.y, { n: 18, colors: [color, ZG.shade(color, -0.3), ZG.shade(color, 0.4)], speed: 4.6, size: L.cell * 0.085, shape: 'square', life: 800 });
      if (['G', 'X', 'R', 'Q'].includes(ev.b)) { st.sparkle(b.x, b.y, L.cell / 2, 9); st.flash(color, 0.22); S('sparkle'); }
      if (ev.b === 'R') st.shake(8, 300);
      await st.tween(b, { y:b.y+L.cell*.15,sx:ev.b==='T'?1.16:.86, sy:.75, alpha: 0 }, 175, E().outCubic);
      st.remove(b); dug[ev.c][ev.r] = true;
      if (ev.pay > 0) {
        state.base += ev.pay;
        if (ev.pay >= 1 || ev.b === 'Q') st.popText(b.x, b.y, (ev.b === 'Q' ? '?→' : '+') + hooks.fmt(Math.round(ev.pay * 100) / 100)+' C', { size: Math.max(13, L.cell * (ev.b === 'Q' ? 0.42 : 0.34)), hold: ev.b === 'Q' ? 420 : 200,exclusive:true,maxWidth:L.cell*2.2 });
      }
      // つるはしを次のブロックへ
      if (curPick && curPick.c === ev.c && curPick.power > 0) {
        const nt = topOf(ev.c); if (nt) { const p = pos(ev.c, nt.r); await st.tween(curPick, { x: p.x + L.cell * 0.18, y: p.y - L.cell * 0.62 }, 110); }
      }
    }
    async function onPickEnd() {
      if (!curPick) return;
      const n = curPick; curPick = null;
      await st.tween(n, { alpha: 0, y: n.y - 14 }, 180);st.remove(n);reel=reel.filter(x=>x!==n);
    }
    async function onTnt(ev) {
      const n = reelAt(ev.c, ev.k); if (!n) return;
      n.moving = true; n.z = 40;
      const p = pos(ev.c, ev.r);
      await st.tween(n, { x: p.x, y: p.y - L.cell * 0.2 }, 260 + ev.r * 30, E().inCubic);
      st.remove(n); reel = reel.filter((x) => x !== n);
    }
    async function onBoom(ev) {
      const p = pos(ev.c, ev.r);
      S('boom'); st.flash('#ffb02e', ev.kind === 'tnt' ? 0.28 : 0.18); st.shake(ev.kind === 'tnt' ? 6 : 3, 320);st.impact(p.x,p.y,L.cell*1.45,'#ffab42',2);
      st.burst(p.x, p.y, { n: 40, colors: ['#ffe14a', '#ff8a00', '#ff3b1a', '#3a2a1a'], speed: 7, size: 6, life: 900 });
      await st.wait(160);
    }
    async function onOpen(ev,state,cap) {
      const n = chests[ev.c];
      S('free'); st.flash('#fff2b0', 0.22); st.shake(3, 220);
      const x0 = n.x;
      await st.carry({x:x0-L.cell*.15,y:n.y-L.cell*.9},{x:x0,y:n.y-L.cell*.3},'◆','#b69a83',12,140);
      for(const dx of [-.045,.045,0])await st.tween(n,{x:x0+L.cell*dx},55,E().outCubic);
      await st.tween(n,{sx:.94,sy:.94},130,E().outCubic);n.half=true;n.ray=.3;await st.wait(165);await st.tween(n,{sx:1.04,sy:1.04},100,E().outCubic);
      n.x = x0; n.open = 1; n.sx = n.sy = .97;st.impact(n.x,n.y,L.cell*.82,CHEST[ev.mult]||'#fff4bd',1.5);
      st.emblemLand('mine',ev.mult,n.x,n.y,L.cell);
      st.tween(n, { ray: 1 }, 300);
      st.sparkle(n.x, n.y, L.cell * 0.7, 14);
      st.burst(n.x, n.y, { n: 26, colors: [CHEST[ev.mult], '#fff', '#ffe14a'], speed: 5.5, size: 4, life: 900, up: 2 });
      S('chest');
      await st.tween(n, { sx: 1, sy: 1 }, 380, E().outCubic);
      await st.featureCue('TREASURE ×'+ev.mult,'累積倍率 ×'+mult+' → ×'+ev.total,{color:CHEST[ev.mult]||'#ffe1a0',hold:650,sound:'crystal'});
      st.tween(n, { ray: 0 }, 550);
      const total=Math.min(cap,Math.floor(state.base*ev.total));
      await st.carry(n,st.anchor('#rScore',{x:st.w/2,y:st.h*.85}),'+'+hooks.fmt(Math.max(0,total-Math.min(cap,Math.floor(state.base*mult))))+' C',CHEST[ev.mult],24);
      hooks.onScore(total);hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(ev.total));
      mult = ev.total;
      await st.wait(100);
    }
    async function finale(base, m, score, f) {
      const cx = L.ox + (L.cell * COLS) / 2, cy = L.oy + (L.cell * ROWS) / 2;
      const size = Math.min(42, L.cell * 0.78);
      const shade = st.add({ z: 80, a: 0, x: 0, y: 0 });
      shade.draw = (ctx, nd) => { ctx.save(); ctx.globalAlpha = nd.a; ctx.fillStyle = '#000'; ctx.fillRect(-st.w, -st.h, st.w * 3, st.h * 3); ctx.restore(); };
      const line = st.add({ z: 81, x: cx, y: cy, a: 0, txt: '', sub: '' });
      line.draw = (ctx, nd) => {
        ctx.save(); ctx.globalAlpha = nd.a;
        ZG.scene.text3d(ctx, nd.sub, 0, -size * 1.2, size * 0.55, { colors: ['#ffffff', '#ffe9c4', '#ffc27a'] });
        ZG.scene.text3d(ctx, nd.txt, 0, size * 0.2, size, { colors: ['#ffffff', '#fff3c4', '#ffd54a'] });
        ctx.restore();
      };
      await st.tween(shade, { a: 0.55 }, 200);
      line.sub = '鉱石の合計'; line.txt = hooks.fmt(base);
      await st.tween(line, { a: 1 }, 220); await st.wait(300);
      line.sub = '宝箱の倍率'; line.txt = `${hooks.fmt(base)} × ${m}`; S('mult');
      await st.wait(460);
      line.sub = f && f.capped ? 'MAX 50倍' : 'TOTAL'; line.txt = hooks.fmt(score); line.sx = line.sy = 1.4; S('coin'); st.coinRain(18);
      setSpinWin(score);
      await st.tween(line, { sx: 1, sy: 1 }, 320, E().outBack);
      await st.wait(460);
      await Promise.all([st.tween(line, { a: 0 }, 220), st.tween(shade, { a: 0 }, 220)]);
      st.remove(line); st.remove(shade);
    }
    const IDLE_ROWS = [['D'], ['T', 'T', 'E'], ['T', 'C'], ['C', 'I', 'Q'], ['I', 'G'], ['G', 'X']];
    return {
      st,
      async warm(cb) {
        await ZG.art.preload('mine', ['D', 'T', 'C', 'I', 'G', 'X', 'R', 'E', 'Q'], L.cell * 1.08, (k) => cb && cb(k * 0.6));
        await ZG.art.preload('mine', ['H'], L.cell * 0.96, (k) => cb && cb(0.6 + k * 0.1));
        await ZG.art.preload('mine', ['pick', 'book', 'goldbook', 'N', 'dyn'], L.rc * 0.86, (k) => cb && cb(0.7 + k * 0.3));
      },
      idle() {
        build(Array.from({ length: COLS }, () => IDLE_ROWS.map((ids) => pick(ids))), [2, 3, 5, 3, 2]);
        setSpinWin(0);
      },
      async play(r) {
        build(r.board, r.chests || [2, 2, 2, 2, 2]);
        const hp = r.board.map((col) => col.map((b) => HP[b]));
        const state = { base: 0 };
        setSpinWin(0);
        hooks.onMode?.('ENTRY');hooks.onSpin(0,5);await st.banner(['MINING EXPEDITION','採掘チャレンジ開始'],{hold:400});await hooks.onBonusIntro?.({spins:5});hooks.onMode?.('BONUS');
        for (let k = 0; k < r.script.length; k++) {
          const sp = r.script[k];
          const previousBase=state.base,previousValue=Math.min(r.score,Math.floor(state.base*mult));
          setSpinWin(0);
          hooks.onSpin(k + 1, Math.max(sp.total - (sp.add || 0), k + 1));
          await spinReel(sp.reel);
          for (const ev of sp.events) {
            if (ev.t === 'upgrade') await onUpgrade(ev);
            else if (ev.t === 'pick') await onPick(ev);
            else if (ev.t === 'hit') { await onHit(ev, hp[ev.c][ev.r]); hp[ev.c][ev.r] = ev.hp; }
            else if (ev.t === 'break') { await onBreak(ev, hp[ev.c][ev.r], state); hp[ev.c][ev.r] = 0; }
            else if (ev.t === 'pickEnd') await onPickEnd();
            else if (ev.t === 'tnt') await onTnt(ev);
            else if (ev.t === 'boom') await onBoom(ev);
            else if (ev.t === 'open') await onOpen(ev,state,r.score);
          }
          await onPickEnd();
          // スタークリスタル：スピン追加
          const stars = reel.filter((n) => n.v === 's');
          if (stars.length) {
            S('free');
            for(const n of stars){st.sparkle(n.x,n.y,L.rc*.5,8);await st.popText(n.x,n.y,'+1 SPIN',{size:Math.max(12,L.rc*.32),color:'#ffe9a0',stroke:'#6a1000',hold:200});await st.tween(n,{sx:1.35,sy:1.35},180);await st.tween(n,{sx:1,sy:1},160);}
          }
          state.base = sp.base; const roundWin=Math.max(0,sp.base-previousBase);setSpinWin(roundWin);hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(sp.mult));await hooks.onRoundWin?.(roundWin);hooks.onScore(Math.min(r.score,Math.floor(sp.base*sp.mult)));await st.celebrateWin(Math.max(0,Math.min(r.score,Math.floor(sp.base*sp.mult))-previousValue),r.rate||opt.getRate?.(),hooks.fmt);
          hooks.onSpin(k + 1, sp.total);
          await Promise.all([st.roundPause(),...reel.map((n) => st.tween(n, { alpha: 0 }, 160))]);
        }
        const f = r.final || { base: r.score, mult: 1, score: r.score };
        if (f.mult > 1 && f.base > 0 && !f.guaranteed) await st.atNormalSpeed(()=>finale(f.base, f.mult, f.score, f));
        else if (f.guaranteed) {
          // 配当ゼロの場合だけ1C
          S('coin');
          await st.banner(['最終配当', `${hooks.fmt(f.score)} C`], {hold:350});
        }
        await hooks.onRoundWin?.(Math.max(0,r.score-state.base));
        hooks.onScore(r.score); setSpinWin(r.score);hooks.onFeatureMetric?.('最終倍率','×'+hooks.fmt(f.mult));
        hooks.onMode?.('COMPLETE');
      },
    };
  }

  const GEM_IDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'h1', 'h2', 'h3', 'h4'];
  const FRUIT_IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
  function plinkoGame(canvas,opt,hooks){
    let {rows,risk,multipliers:mult,cents}=opt.plinko||window.plinkoConfig();
    // Draw exact payout labels as text, not as tiny lettering baked into art.
    let plinkoArt=null,balls=[],hits=Array(rows+1).fill(0),clock={v:0},landed=0,score=0,goal=0,lastSound=-Infinity,pegGlow=new Map(),slotGlow=new Map();
    function settle(b){if(b.done)return;b.done=true;hits[b.slot]++;landed++;score+=b.win;hooks.onSpin(landed,goal);hooks.onBallLand?.(b.win,b.mult);const g=geometry(st.w,st.h),p=point(g,rows+1,b.slot+.5);slotGlow.set(b.slot,st.t);if(b.mult>=5){st.impact(p.x,p.y,g.gap*1.2,'#ffce70',1.6);st.popText(p.x,p.y-g.rise,hooks.fmt(b.win)+' C',{size:Math.min(26,g.gap*.75+10),hold:500,exclusive:true,maxWidth:Math.min(st.w*.72,180)});S('pocket');}else if(goal<=10){st.impact(p.x,p.y,g.gap*.55,'#ffe2a0',.7);S('land',b.slot%5);} }
    const geometry=(w,h)=>{const r=opt.region(w,h),gap=Math.max(3,Math.min((r.w-12)/(rows+1.7),64));const vertical=gap<52,labelH=vertical?Math.min(96,Math.max(62,r.h*.30)):55;const rise=Math.max(3,Math.min(gap,(r.h-labelH-16)/(rows+1.4)));const content=rise*(rows+1)+labelH;return {gap,rise,labelH,vertical,x:w/2,y:r.y+(r.h-content)/2};};
    const point=(g,l,k)=>({x:g.x+(k-l/2)*g.gap,y:g.y+l*g.rise});
    const st=new ZG.Stage(canvas,{fit:'container',bg:(ctx,w,h)=>{
      const g=geometry(w,h),d=g.gap;
      const bg=ctx.createRadialGradient(w/2,h*.38,20,w/2,h*.5,Math.max(w,h)*.65);bg.addColorStop(0,'#192c57');bg.addColorStop(1,'#080e20');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      ZG.rr(ctx,g.x-d*(rows/2+.85),g.y-g.rise*.5,d*(rows+1.7),g.rise*(rows+1.5)+g.labelH+3,12);const cabinet=ctx.createLinearGradient(0,g.y,0,g.y+g.rise*(rows+1)+g.labelH);cabinet.addColorStop(0,'#192a4b');cabinet.addColorStop(.55,'#101a32');cabinet.addColorStop(1,'#263d60');ctx.fillStyle=cabinet;ctx.fill();ctx.strokeStyle=({low:'#8abbdc',medium:'#d4ac70',high:'#da7771'})[risk]||'#34486e';ctx.lineWidth=2.5;ctx.stroke();
      ctx.save();ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x-d*(rows/2+.5),g.y+g.rise*(rows+.5));ctx.lineTo(g.x+d*(rows/2+.5),g.y+g.rise*(rows+.5));ctx.closePath();ctx.fillStyle='#1e335b';ctx.fill();ctx.restore();
      const gate=ctx.createLinearGradient(g.x-d*.52,0,g.x+d*.52,0);
      gate.addColorStop(0,'#403e4c');gate.addColorStop(.25,'#dfba79');gate.addColorStop(.5,'#282a38');gate.addColorStop(.8,'#e6c994');gate.addColorStop(1,'#48404a');
      ctx.fillStyle=gate;ZG.rr(ctx,g.x-d*.53,g.y-d*.54,d*1.06,d*.52,4);ctx.fill();
      const queued=balls.reduce((count,b)=>count+Number(b.delay>clock.v),0);
      for(let i=0;i<Math.min(5,queued);i++){const x=g.x-d*(.78+i*.28);ctx.beginPath();ctx.arc(x,g.y-d*.27,d*.13,0,Math.PI*2);ctx.fillStyle='#f6c977';ctx.fill();ctx.strokeStyle='#856037';ctx.stroke();}
      for(let l=1;l<=rows;l++)for(let k=0;k<l;k++){const p=point(g,l,k+.5),r=Math.max(1.5,Math.min(d*.10,g.rise*.21)),a=Math.max(0,1-(st.t-(pegGlow.get(l+':'+k)?.time??-1000))/260);const grad=ctx.createRadialGradient(p.x-r*.35,p.y-r*.4,0,p.x,p.y,r);grad.addColorStop(0,'#fff');grad.addColorStop(.35,a>0?'#ffebaa':'#d5e3f7');grad.addColorStop(.72,'#8398b8');grad.addColorStop(1,'#384966');ctx.save();if(a){ctx.shadowBlur=9*a;ctx.shadowColor='#ffdf87';}ctx.beginPath();ctx.arc(p.x+a*r*.2*Math.sin(st.t/18),p.y,r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();if(plinkoArt){const sw=plinkoArt.width/3,sh=plinkoArt.height/2;ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.clip();ctx.drawImage(plinkoArt,sw*1.27,sh*.27,sw*.46,sh*.40,p.x-r,p.y-r,r*2,r*2);ctx.restore();}if(a){const side=pegGlow.get(l+':'+k)?.side||1;ctx.fillStyle='#fff4ca';ctx.beginPath();ctx.arc(p.x+side*r*.65,p.y-r*.3,r*.34,0,Math.PI*2);ctx.fill();}ctx.restore();}
      for(let k=0;k<=rows;k++){const p=point(g,rows+1,k+.5),m=mult[k],x=p.x-d*.46,a=Math.max(0,1-(st.t-(slotGlow.get(k)??-1000))/420),slotTop=p.y-g.rise*.3,slotH=g.labelH+g.rise*.3-3;
        const color=m>=10?'#8a4524':m>=1?'#305f58':m>0?'#344b78':'#272d43';
        ctx.fillStyle=color;ZG.rr(ctx,x,slotTop,d*.92,slotH,Math.min(5,d*.2));ctx.fill();ctx.strokeStyle=a>0?'#fff0b3':'#ffffff50';ctx.lineWidth=a>0?2:1;ctx.stroke();
        if(a){ctx.save();ctx.globalAlpha=a*.34;ctx.fillStyle='#fff4b8';ctx.fill();ctx.restore();}
        const label=hooks.fmt(Math.round((opt.getRate?.()??100)*cents[k]/100))+'C',font=Math.max(9,Math.min(g.vertical?15:22,d*.69));ctx.save();ctx.translate(p.x,slotTop+slotH/2);if(g.vertical)ctx.rotate(-Math.PI/2);ctx.font='900 '+font+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='#101525';ctx.lineWidth=2.2;ctx.strokeText(label,0,0,g.vertical?slotH-7:d*.86);ctx.fillStyle='#fff';ctx.fillText(label,0,0,g.vertical?slotH-7:d*.86);ctx.restore();
        if(hits[k]){ctx.save();ctx.fillStyle='#ffe79b';ctx.font='800 '+Math.max(9,Math.min(12,d*.6))+'px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(String(hits[k]),p.x,slotTop-2,d*.9);ctx.restore();}}
      for(const b of balls){
        const age=(clock.v-b.delay)/b.duration;if(age<0||b.done)continue;
        if(age>=1){settle(b);continue;}
        const progress=Math.min(age/.94,1)*(rows+1),l=Math.min(rows,Math.floor(progress)),t=progress-l;
        const contact=(i)=>{if(i===0)return point(g,0,0);if(i===rows+1)return point(g,rows+1,b.slot+.5);const p=point(g,i,b.prefix[i-1]+.5);p.x+=(b.path[i-1]?1:-1)*d*.19;p.y-=d*.15;return p;};
        const a=contact(l),z=contact(l+1);
        const x=a.x+(z.x-a.x)*(t*t*(3-2*t)),y=a.y+(z.y-a.y)*t-d*(.18+b.arc)*4*t*(1-t)+Math.max(0,(age-.94)/.06)*d*.30;
        if(l!==b.row){b.row=l;if(l>0)pegGlow.set(l+':'+b.prefix[l-1],{time:st.t,side:b.path[l-1]?1:-1});if(clock.v-lastSound>.035){lastSound=clock.v;S('land',l%4);}}
        const radius=Math.max(2,Math.min(d*.19,g.rise*.36));ctx.save();if(goal<=100&&l>=rows-2&&Math.abs(x-g.x)>d*rows*.32){ctx.globalAlpha=.32;ctx.strokeStyle=Math.abs(x-g.x)>d*rows*.32?'#ff916d':'#ffdd85';ctx.lineWidth=radius*.75;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(z.x-a.x)*.14,y-d*.23);ctx.stroke();ctx.globalAlpha=1;}ctx.shadowColor='#0008';ctx.shadowBlur=radius;ctx.shadowOffsetY=2;const metal=ctx.createRadialGradient(x-radius*.42,y-radius*.45,0,x,y,radius);metal.addColorStop(0,'#fff9df');metal.addColorStop(.32,'#ffdd85');metal.addColorStop(.7,Math.abs(x-g.x)>d*rows*.32?'#d88669':'#92adc3');metal.addColorStop(1,'#68451b');ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=metal;ctx.fill();if(plinkoArt){const sw=plinkoArt.width/3,sh=plinkoArt.height/2;ctx.save();ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.clip();ctx.drawImage(plinkoArt,sw*.19,sh*.19,sw*.62,sh*.64,x-radius,y-radius,radius*2,radius*2);ctx.restore();}ctx.restore();
      }
    }});st.theme='plinko';
return {st,configure(c){risk=c.risk;rows=c.rows;mult=c.multipliers;cents=c.cents;balls=[];hits=Array(rows+1).fill(0);slotGlow.clear();pegGlow.clear();st.resize()},async warm(cb){plinkoArt=await ZG.loadSymbolAtlas('plinko');cb?.(1)},idle(){balls=[];hits.fill(0)},async play(r){hits.fill(0);slotGlow.clear();pegGlow.clear();landed=0;score=0;goal=r.script.length;const n=goal,group=n>100?100:n>10?25:n;hooks.onSpin(0,n);await hooks.onBonusIntro?.({spins:n});for(let i=0;i<n;i+=group){const batch=r.script.slice(i,i+group),before=score;balls=batch.map((b,j)=>({...b,delay:j*.018,duration:1,arc:Math.random()*.10,row:-1,done:false,prefix:b.path.reduce((a,v)=>(a.push(a.at(-1)+v),a),[0])}));clock.v=0;lastSound=-Infinity;const end=Math.max(...balls.map(b=>b.delay+b.duration));await st.tween(clock,{v:end},end*ZG.SPIN_TIMING.reel,E().linear);for(const b of balls)settle(b);const bestBall=batch.reduce((a,b)=>a.mult>=b.mult?a:b);await st.celebrateWin(bestBall.win,opt.getRate?.(),hooks.fmt);balls=[];await hooks.onRoundWin?.(score-before);hooks.onScore(score);await st.roundPause();}hooks.onScore(r.score);
    const best=Math.max(...r.script.map(b=>b.win));
    const count=r.script.filter(b=>b.win===best).length;
    await st.banner(['TOTAL WIN '+hooks.fmt(r.score)+' C','最高 '+hooks.fmt(best)+' C · '+count+'球'],{});
    }};
  }
  ZG.THEME_OF = { rush: 'gems', fruit: 'fruit', mine: 'mine', plinko:'plinko',gods:'gods',dogs:'dogs',train:'train',dwarf:'dwarf' };
  ZG.createGame = function (canvas, opt, hooks) {
    let g;
    if (['gods','dogs','train','dwarf'].includes(opt.game)) g = ZG.createFeatureGame(canvas,opt,hooks);
    else if (opt.game === 'plinko') g = plinkoGame(canvas,opt,hooks);
    else if (opt.game === 'mine') g = mineGame(canvas, opt, hooks);
    else if (opt.game === 'fruit') g = gridGame(canvas, opt, hooks, { cols: 7, rows: 7, theme: 'fruit', aspect: 1, spots: true, idle: () => Array.from({ length: 49 }, () => pick(FRUIT_IDS)) });
    else g = gridGame(canvas, opt, hooks, { cols: 6, rows: 5, theme: 'gems', aspect: 6 / 5.2, idle: () => Array.from({ length: 30 }, () => pick(GEM_IDS)) });
    const st = g.st;st.overlayRegion=opt.region;
    return {
      idle: () => g.idle(),
      configure: (c) => g.configure?.(c),
      warm: async (cb) => {const art={fruit:'fruit/bg.webp',mine:'mine/bg.webp',gods:'gods/bg.webp',dogs:'dogs/park.webp',train:'train/bg.webp',dwarf:'dwarf/hero.webp'}[opt.game];await Promise.all([g.warm(cb),st.loadWinArt(art?'./assets/anime/'+art:null),opt.game==='fruit'?st.loadCinematic(opt.game):Promise.resolve()]);},
      prepareDogs: (entry) => g.prepareDogs?.(entry),
      async play(r) { st.setSkip(false); await g.play(r); st.setSkip(false); },
      async bigWin(level, amount) { await st.atNormalSpeed(()=>st.bigWin(level, amount, hooks.fmt)); },
      setSpeed(v) { st.speed = v; },
      skip() { st.setSkip(true); },
      resize() { st.resize(); },
      destroy() { st.destroy(); },
    };
  };
})();
