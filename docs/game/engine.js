// ゲーム画面の描画エンジン（Canvas 2D・ライブラリなし）
// ・高DPI対応、トゥイーン（イージング）、パーティクル、画面揺れ、フラッシュ、文字ポップ、ビッグウィン演出
// ・speed（1=通常 / 0.45=高速）と skip（タップで最後まで飛ばす）に対応
(function () {
  const ZG = (window.ZG = window.ZG || {});

  const Ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    landing: (t) => t < .77 ? .96 * (t/.77)**1.25 : .96 + .04*(1-(1-(t-.77)/.23)**3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };
  ZG.Ease = Ease;

  class Stage {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.aspect = opts.aspect || 1;
      this.fit = opts.fit || 'aspect';
      this.bg = opts.bg || null; // (ctx, w, h, t) => void
      this.nodes = [];
      this.parts = [];
      this.rings = [];
      this.tweens = [];
      this.overlays = [];
      this.speed = 1;
      this.skip = false;
      this.shakeAmp = 0; this.shakeUntil = 0;
      this.flashA = 0; this.flashColor = '#fff';
      this.t = 0;
      this.dead = false;
      this.resize();
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas);
      this._last = performance.now();
      const loop = (now) => {
        if (this.dead) return;
        const dt = Math.min(50, now - this._last);
        this._last = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    destroy() { this.dead = true; this._ro.disconnect(); this.finishAll(); this.parts=[]; this.rings=[]; }
    resize() {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = this.canvas.clientWidth || 320;
      let h;
      if (this.fit === 'container') h = this.canvas.clientHeight || this.canvas.parentElement.clientHeight || 600;
      else { h = Math.round(w / this.aspect); this.canvas.style.height = h + 'px'; }
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.dpr = dpr; this.w = w; this.h = h;
      if (this.onResize) this.onResize(w, h);
    }
    // ---- ノード（スプライト） ----
    add(node) {
      const n = Object.assign({ x: 0, y: 0, w: 40, h: 40, sx: 1, sy: 1, rot: 0, alpha: 1, z: 1, glow: 0, glowColor: '#fff', visible: true }, node);
      this.nodes.push(n);
      return n;
    }
    remove(n) { const i = this.nodes.indexOf(n); if (i >= 0) this.nodes.splice(i, 1); }
    clear() { this.nodes = []; this.parts = []; this.rings=[];this.overlays = []; this.tweens = []; }
    // ---- 時間 ----
    roundPause() {
      return this.wait(this.speed >= 1 ? 750 : 500);
    }
    async atNormalSpeed(action) {
      const previous=this.presentationSpeed;
      this.presentationSpeed=this.speed;
      try{return await action();}finally{this.presentationSpeed=previous;}
    }
    // Compact event callout instead of a full-screen celebration.
    async featureCue(title, detail, {color='#ffe5a0',hold=560,sound='sparkle'}={}) {
      if(this.skip||this.dead)return;
      const o={kind:'cue',title,detail,color,a:0,s:.95,z:72};
      this.overlays.push(o);ZG.sfx?.play(sound);
      try{await this.tween(o,{a:1,s:1},150);await this.wait(hold);await this.tween(o,{a:0,s:.98},150);}
      finally{const i=this.overlays.indexOf(o);if(i>=0)this.overlays.splice(i,1);}
    }
    wait(ms) {
      if (this.skip||this.dead) return Promise.resolve();
      return new Promise((res) => {
        const end = this.t + ms * (this.presentationSpeed ?? this.speed);
        this.tweens.push({ waitUntil: end, res });
      });
    }
    tween(obj, to, ms = 300, ease = Ease.outCubic, delay = 0) {
      if (this.skip||this.dead) { Object.assign(obj, to); return Promise.resolve(); }
      return new Promise((res) => {
        const from = {};
        for (const k in to) from[k] = obj[k];
        const speed = this.presentationSpeed ?? this.speed;
        this.tweens.push({ obj, from, to, start: this.t + delay * speed, dur: Math.max(1, ms * speed), ease, res });
      });
    }
    finishAll() {
      for (const tw of this.tweens) { if (tw.obj) Object.assign(tw.obj, tw.to); tw.res(); }
      this.tweens = [];
    }
    setSkip(v) { this.skip = v; if (v) this.finishAll(); }
    // ---- 効果 ----
    shake(amp = 8, ms = 300) { if (this.skip) return; this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeUntil = this.t + ms; }
    flash(color = '#fff', a = 0.8) { if (this.skip) return; this.flashColor = color; this.flashA = a; }
    burst(x, y, opts = {}) {
      if (this.skip||this.dead) return;
      const n = opts.n || 18, colors = opts.colors || ['#fff'], spd = opts.speed || 4, life = opts.life || 700, size = opts.size || 4, grav = opts.gravity ?? 0.12;
      for (let i = 0; i < n && this.parts.length<280; i++) {
        const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random());
        this.parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), g: grav, life, age: 0,
          size: size * (0.5 + Math.random()), color: colors[(Math.random() * colors.length) | 0], shape: opts.shape || 'circle', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        });
      }
    }
    sparkle(x, y, r = 20, n = 6) {
      if (this.skip||this.dead) return;
      for (let i = 0; i < n && this.parts.length<280; i++) {
        this.parts.push({ x: x + (Math.random() - 0.5) * r * 2, y: y + (Math.random() - 0.5) * r * 2, vx: 0, vy: -0.3, g: 0, life: 600 + Math.random() * 400, age: 0, size: 3 + Math.random() * 4, color: '#fff', shape: 'star', rot: 0, vr: 0.05 });
      }
    }
    impact(x,y,r=28,color='#ffe6a1',strength=1){
      if(this.skip||this.dead)return;
      if(this.rings.length<65)this.rings.push({x,y,r,color,age:0,life:350+strength*100,strength});
      this.burst(x,y,{n:Math.round(5+strength*4),colors:[color,'#fff7cf'],size:Math.max(1.5,r*.065),speed:2.1+strength,shape:'star',life:420,gravity:.045});
    }
    landing(x,y,r=18,color='#fff0c7'){
      if(this.skip||this.dead)return;
      this.burst(x,y,{n:4,colors:[color,'#fff'],size:Math.max(1.3,r*.07),speed:1.4,life:250,gravity:.025,shape:'star'});
    }
    beam(x,y,tx,ty,color='#ffe3a0'){
      if(this.skip||this.dead||this.rings.length>=65||![x,y,tx,ty].every(Number.isFinite))return;
      this.rings.push({x,y,tx,ty,color,age:0,life:380,strength:1});
    }
    popText(x, y, text, style = {}) {
      if (this.skip||this.dead) return Promise.resolve();
      const o = { kind: 'text', x, y, text, a: 0, s: 0.86, size: style.size || 22, color: style.color || '#fff0a4', stroke: style.stroke || '#43230b', z: 50 };
      this.overlays.push(o);
      return (async () => {
        await this.tween(o, { a: 1, s: 1.045 }, 155, Ease.outCubic);
        await this.tween(o, { s: 1 }, 80);
        await this.wait(style.hold || 450);
        await this.tween(o, { a: 0, y: y - 26 }, 320, Ease.inCubic);
        const i=this.overlays.indexOf(o);if(i>=0)this.overlays.splice(i, 1);
      })();
    }
    anchor(selector,fallback) {
      const target=this.canvas.parentElement?.querySelector?.(selector);
      if(!target?.getBoundingClientRect||!this.canvas.getBoundingClientRect)return fallback;
      const box=target.getBoundingClientRect(),canvas=this.canvas.getBoundingClientRect();
      if(!box.width||!canvas.width||!canvas.height)return fallback;
      return {x:(box.left+box.width/2-canvas.left)*this.w/canvas.width,y:(box.top+box.height/2-canvas.top)*this.h/canvas.height};
    }
    async carry(from,to,label,color,size=19,duration=300) {
      if(this.dead||this.skip)return;
      const n=this.add({...from,z:64,progress:0});
      n.draw=(ctx)=>{ctx.translate(0,-Math.sin(n.progress*Math.PI)*14);
        ZG.scene.text3d(ctx,label,0,0,size,{colors:['#ffffff',color,'#94692c']});};
      this.beam(from.x,from.y,to.x,to.y,color);
      try{await this.tween(n,{...to,progress:1},duration,Ease.inOutCubic);}finally{this.remove(n);}
    }
    async loadScene(name) {
      this.scenes ||= {};
      const img=new Image();
      this.scenes[name]=await new Promise(resolve=>{
        img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
        img.src='./assets/anime/'+this.theme+'/'+name+'.webp';
      });
    }
    async loadWinArt(url) {
      if(!url)return;
      const img=new Image();
      this.winArt=await new Promise(resolve=>{img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});
    }
    async transition(name,caption='',reverse=false) {
      const image=this.scenes?.[name];if(!image||this.skip||this.dead)return;
      const sprite=this.add({x:this.w/2,y:this.h*.47,z:48,frame:0});
      sprite.draw=ctx=>{
        const sw=image.width/4,sh=image.height,w=Math.min(this.w*.98,this.h*.48*sw/sh),h=w*sh/sw;
        const frame=Math.min(3,Math.floor(sprite.frame));
        ctx.drawImage(image,(reverse?3-frame:frame)*sw,0,sw,sh,-w/2,-h/2,w,h);
        if(caption&&frame===3)ZG.scene.text3d(ctx,caption,0,0,Math.min(32,w/9),{});
      };
      try{await this.tween(sprite,{frame:3.99},560,Ease.linear);await this.wait(caption?380:100);}finally{this.remove(sprite);}
    }
    banner(lines, style = {}) {
      if (this.skip||this.dead) return Promise.resolve();
      const o = { kind: 'banner', lines, a: 0, s: 0.92, color: style.color || '#fff', sub: style.sub || '#ffd54a', rainbow: style.rainbow, z: 80,born:this.t };
      this.overlays.push(o);
      return (async () => {
        await this.tween(o, { a: 1, s: 1 }, 260, Ease.outCubic);
        await this.wait(style.hold || 900);
        await this.tween(o, { a: 0, s: 0.9 }, 220, Ease.inCubic);
        const i=this.overlays.indexOf(o);if(i>=0)this.overlays.splice(i, 1);
      })();
    }
    // ビッグウィン：level 1=BIG 2=MEGA 3=EPIC。金額をカウントアップしながらコインを降らせる
    async celebrateWin(amount, reference, fmt, thresholds = [5,15,30,40]) {
      if (!(reference > 0)) return;
      // Per-spin reference is 1/100 of the bonus purchase. Reserve the full
      // screen celebration for the final result and label actual spin value.
      const ratio=amount/reference/100;
      if(ratio>=1)await this.featureCue('ROUND WIN',fmt(amount)+' C · '+ratio.toFixed(2)+'× BONUS',{color:'#ffe19a',hold:ratio>=5?900:520,sound:ratio>=5?'featureWin':'win'});
    }
    async bigWin(level, amount, fmt, title) {
      if (this.skip||this.dead) return;
      const names = ['', 'BIG WIN', 'MEGA WIN', 'SUPER WIN', 'ULTRA WIN'];
      const o = { kind: 'big', title: title || names[level], amount: 0, a: 0, s: .84, z: 90, level, fmt,born:this.t };
      this.overlays.push(o);
      this.flash('#fff1bb', 0.22);
      this.shake(2 + level * 1.5, 350);
      ZG.sfx && ZG.sfx.play('bigwin', {level,speed:this.speed});
      let tapped=false;
      const finishCount=()=>{
        tapped=true;
        const active=this.tweens.find(t=>t.obj===o && 'amount' in t.to);
        if(active){this.tweens.splice(this.tweens.indexOf(active),1);active.res();}
        o.amount=amount;
      };
      const surface=this.canvas.parentElement;
      const tap=e=>{if(!e.target.closest?.('button,a,input,select'))finishCount();};
      surface?.addEventListener?.('click',tap);
      await this.tween(o, { a: 1, s: 1 }, 350, Ease.outCubic);
      this.coinRain(5+level*3);
      const coinTimer = setInterval(() => this.coinRain(3 + level * 2), Math.max(60,160*this.speed));
      try{if(!tapped)await this.tween(o, { amount }, 1400 + level * 600, Ease.outCubic);await this.wait(900);}finally{clearInterval(coinTimer);surface?.removeEventListener?.('click',tap);}
      await this.tween(o, { a: 0 }, 300);
      const i=this.overlays.indexOf(o);if(i>=0)this.overlays.splice(i, 1);
    }
    coinRain(n = 8) {
      if (this.skip||this.dead) return;
      for (let i = 0; i < n && this.parts.length<180; i++) {
        this.parts.push({ x: Math.random() * this.w, y: -20, vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 3, g: 0.15, life: 2200, age: 0, size: 9 + Math.random() * 6, color: '#ffc21a', shape: 'coin', rot: Math.random() * 6, vr: 0.15 + Math.random() * 0.2 });
      }
    }
    // ---- 更新と描画 ----
    update(dt) {
      this.t += dt;
      const keep = [];
      for (const tw of this.tweens) {
        if (tw.waitUntil !== undefined) { if (this.t >= tw.waitUntil) tw.res(); else keep.push(tw); continue; }
        if (this.t < tw.start) { keep.push(tw); continue; }
        const k = Math.min(1, (this.t - tw.start) / tw.dur);
        const e = tw.ease(k);
        for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
        if (k >= 1) tw.res(); else keep.push(tw);
      }
      this.tweens = keep;
      for (const p of this.parts) { p.age += dt; p.vy += p.g * (dt / 16); p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16); p.rot += p.vr * (dt / 16); }
      this.parts = this.parts.filter((p) => p.age < p.life);
      for(const r of this.rings)r.age+=dt;this.rings=this.rings.filter(r=>r.age<r.life);
      this.flashA = Math.max(0, this.flashA - dt / 250);
    }
    draw() {
      const { ctx, dpr, w, h } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let ox = 0, oy = 0;
      if (this.t < this.shakeUntil) { const k = (this.shakeUntil - this.t) / 300; ox = (Math.random() - 0.5) * this.shakeAmp * k; oy = (Math.random() - 0.5) * this.shakeAmp * k; } else this.shakeAmp = 0;
      ctx.save();
      ctx.translate(ox, oy);
      if (this.bg) this.bg(ctx, w, h, this.t);
      const nodes = this.nodes.slice().sort((a, b) => a.z - b.z);
      for (const n of nodes) {
        if (!n.visible || n.alpha <= 0) continue;
        ctx.save();
        if (n.clip && this.clipRect) { const c = this.clipRect; ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip(); }
        ctx.globalAlpha = Math.max(0, Math.min(1, n.alpha));
        ctx.translate(n.x, n.y);
        if (n.rot) ctx.rotate(n.rot);
        ctx.scale(n.sx, n.sy);
        if (n.glow > 0) { ctx.shadowColor = n.glowColor; ctx.shadowBlur = n.glow; }
        if (n.draw) { try { n.draw(ctx, n, this.t); } catch (e) { if (!n._err) { n._err = 1; console.error(e); } } }
        else if (n.img) ctx.drawImage(n.img, -n.w / 2, -n.h / 2, n.w, n.h);
        ctx.restore();
      }
      for (const p of this.parts) this.drawPart(ctx, p);
      for(const r of this.rings){const k=r.age/r.life;ctx.save();ctx.globalAlpha=(1-k)*.75;ctx.strokeStyle=r.color;ctx.shadowColor=r.color;ctx.shadowBlur=6;ctx.lineWidth=2.4*(1-k)+.5;ctx.beginPath();if(r.tx!==undefined){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+(r.tx-r.x)*Math.min(1,k*3),r.y+(r.ty-r.y)*Math.min(1,k*3));}else ctx.arc(r.x,r.y,r.r*(.18+.92*Ease.outCubic(k)),0,Math.PI*2);ctx.stroke();ctx.restore();}
      ctx.restore();
      for (const o of this.overlays.slice().sort((a, b) => a.z - b.z)) this.drawOverlay(ctx, o);
      if(this.overlays.some(o=>o.kind==='big'))for(const p of this.parts)if(p.shape==='coin')this.drawPart(ctx,p);
      if (this.flashA > 0) { ctx.globalAlpha = this.flashA; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    }
    drawPart(ctx, p) {
      const k = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'square') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      else if(p.shape==='peel'){ctx.beginPath();ctx.arc(0,0,p.size,0,2.2);ctx.lineWidth=2;ctx.strokeStyle=p.color;ctx.stroke();}
      else if (p.shape === 'star') { ZG.starPath(ctx, 0, 0, p.size, p.size * 0.35, 4); ctx.fill(); }
      else if (p.shape === 'coin') {
        const sx = Math.abs(Math.cos(p.rot * 2));
        ctx.scale(Math.max(0.15, sx), 1);
        const g = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.3, 1, 0, 0, p.size);
        g.addColorStop(0, '#fff7c0'); g.addColorStop(0.5, '#ffc21a'); g.addColorStop(1, '#b97800');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7); ctx.fill();
        ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.5; ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    drawOverlay(ctx, o) {
      const { w, h } = this;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, o.a));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const font = (px) => `${px}px ${ZG.FONT || '"Arial Black",sans-serif'}`;
      if (o.kind === 'text') {
        ctx.translate(o.x, o.y); ctx.scale(o.s, o.s);
        ctx.font = font(o.size); ctx.lineJoin = 'round';
        ctx.lineWidth = o.size / 4; ctx.strokeStyle = o.stroke; ctx.strokeText(o.text, 0, 0);
        ctx.fillStyle = o.color; ctx.fillText(o.text, 0, 0);
      } else if (o.kind === 'cue') {
        const boxW=Math.min(w*.86,420),boxH=62,y=Math.max(30,h*.30);
        ctx.translate(w/2,y);ctx.scale(o.s,o.s);ZG.rr(ctx,-boxW/2,-boxH/2,boxW,boxH,10);
        const g=ctx.createLinearGradient(0,-boxH/2,0,boxH/2);g.addColorStop(0,'#302533f5');g.addColorStop(1,'#100e19f5');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=o.color;ctx.lineWidth=1.5;ctx.stroke();
        ctx.font='900 16px system-ui';ctx.fillStyle=o.color;ctx.fillText(o.title,0,-11,boxW-18);
        ctx.font='700 14px system-ui';ctx.fillStyle='#fff';ctx.fillText(o.detail,0,12,boxW-16);
      } else if (o.kind === 'banner') {
        const g=ctx.createLinearGradient(0,h/2-72,0,h/2+72);g.addColorStop(0,'rgba(12,8,20,0)');g.addColorStop(.25,'rgba(12,8,20,.91)');g.addColorStop(.75,'rgba(12,8,20,.91)');g.addColorStop(1,'rgba(12,8,20,0)');ctx.fillStyle=g;ctx.fillRect(0,h/2-72,w,144);
        ctx.strokeStyle='#e8c274';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.08,h/2-45);ctx.lineTo(w*.92,h/2-45);ctx.moveTo(w*.08,h/2+56);ctx.lineTo(w*.92,h/2+56);ctx.stroke();
        const shine=ctx.createLinearGradient(w*.05,0,w*.95,0);shine.addColorStop(0,'#fff0');shine.addColorStop(.5,'#fff0bd');shine.addColorStop(1,'#fff0');ctx.fillStyle=shine;ctx.fillRect(w*.05,h/2-46,w*.9,2);ctx.fillRect(w*.05,h/2+55,w*.9,2);
        ctx.translate(w / 2, h / 2); ctx.scale(o.s, o.s);
        if (ZG.scene) ZG.scene.text3d(ctx, o.lines[0], 0, -10, Math.min(48, w / 7.5), { rainbow: o.rainbow });
        if (o.lines[1]) { ctx.font = `16px ${ZG.FONT_JP || 'sans-serif'}`; ctx.fillStyle = o.sub; ctx.fillText(o.lines[1], 0, 32); }
      } else if (o.kind === 'big') {
        const palette=this.theme==='fruit'?'rgba(43,83,31,.80)':this.theme==='mine'||this.theme==='train'?'rgba(74,37,12,.86)':this.theme==='dogs'?'rgba(86,35,24,.87)':this.theme==='dwarf'?'rgba(21,62,42,.86)':this.theme==='plinko'?'rgba(13,47,89,.86)':'rgba(44,16,86,.86)';
        const grd = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w,h)*.68);
        grd.addColorStop(0, 'rgba(255,207,115,.32)'); grd.addColorStop(.55,palette);grd.addColorStop(1,'rgba(5,3,8,.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        const picture=this.scenes?.victories;
        if(picture){
          const sw=picture.width/2,sh=picture.height/2,i=Math.min(3,o.level-1);
          const dh=Math.min(h,w*sh/sw);
          ctx.drawImage(picture,i%2*sw,Math.floor(i/2)*sh,sw,sh,0,(h-dh)/2,w,dh);
        }else if(this.winArt){
          const im=this.winArt,scale=Math.max(w/im.width,h/im.height),iw=im.width*scale,ih=im.height*scale;
          ctx.save();ctx.globalAlpha*=.66;ctx.drawImage(im,(w-iw)/2,(h-ih)/2,iw,ih);ctx.restore();
        }
        // 回転する光線
        ctx.save(); ctx.translate(w / 2, h / 2 - 10); ctx.rotate(this.t / 1500);
        for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = 'rgba(255,230,150,.10)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, -30); ctx.lineTo(w, 30); ctx.fill(); }
        ctx.restore();
        ctx.translate(w / 2, h / 2); ctx.scale(o.s, o.s);
        const tsize = Math.min(76, w / 6.4, w*.83/(o.title.length*.66));
        const pw=Math.min(w*.89,560),ph=tsize*2.55;
        ctx.save();ctx.strokeStyle=['#f6dea8','#a2e9ff','#dbb8ff','#ffce62'][o.level-1]||'#ffda84';ctx.globalAlpha*=.44;ctx.lineWidth=1.5;for(let i=0;i<2+o.level;i++){ctx.beginPath();ctx.ellipse(0,0,pw*(.53+i*.055),ph*(.63+i*.06),0,0,Math.PI*2);ctx.stroke();}ctx.restore();
        ctx.save();ZG.rr(ctx,-pw/2,-ph/2,pw,ph,14);ctx.fillStyle='rgba(8,5,15,.78)';ctx.fill();ctx.strokeStyle='#e7b65e';ctx.lineWidth=2;ctx.stroke();ZG.rr(ctx,-pw/2+5,-ph/2+5,pw-10,ph-10,10);ctx.strokeStyle='rgba(255,238,188,.45)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
        if (ZG.scene) {
          const colors=[['#fff','#fff3c4','#ffd54a'],['#fff','#9eeaff','#39a8ff'],['#fff','#ddb4ff','#a848ec'],['#fff','#fff5a5','#ff9b26']][Math.max(0,Math.min(3,o.level-1))];
          ZG.scene.text3d(ctx, o.title, 0, -tsize * 0.55, tsize, { colors,rainbow:o.level===4 });
          ZG.scene.text3d(ctx, o.fmt(Math.round(o.amount)), 0, tsize * 0.48, tsize * 0.79, { colors: ['#ffffff', '#fff3c4', '#ffd54a'], mid: '#7a3a00', deep: '#3a1400' });
          ctx.font='700 10px system-ui';ctx.fillStyle='#fff3c4';ctx.fillText('TEST COINS',0,tsize*1.02);
        }
        ctx.restore();return;
      }
      ctx.restore();
    }
  }
  ZG.Stage = Stage;

  ZG.starPath = function (ctx, x, y, r1, r2, n = 5) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = (i * Math.PI) / n - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  ZG.rainbow = function (ctx, x0, x1) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    ['#ff3b3b', '#ffb02e', '#fff23b', '#3bff7a', '#3bc8ff', '#8a3bff', '#ff3bd5'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    return g;
  };
})();
