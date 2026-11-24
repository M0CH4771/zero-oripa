// 効果音とBGM（WebAudioでその場で音を作る。音声ファイルは使わない）
// 最初のタップ（スタート画面）で ZG.sfx.unlock() を呼ぶと鳴るようになる
(function () {
  const ZG = (window.ZG = window.ZG || {});
  let ac = null, master = null, sfxGain = null, bgmGain = null, noiseBuf = null, bgmTimer = null;
  let on = true, activeTheme = 'gems';
  try { on = localStorage.getItem('zo-sound') !== 'off'; } catch {}

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
    bgmGain = ac.createGain(); bgmGain.gain.value = 0.16; bgmGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const now = () => ac.currentTime;
  function tone(freq, dur, { type = 'sine', vol = 0.5, at = 0, slide = 0, attack = 0.005, out = sfxGain } = {}) {
    if (!ac) return;
    const t = now() + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.4, at = 0, freq = 1200, q = 0.8, type = 'lowpass', sweep = 0 } = {}) {
    if (!ac) return;
    const t = now() + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.02);
  }
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  const SFX = {
    whistle(){tone(710,.34,{type:'triangle',slide:1.23,vol:.23});tone(950,.31,{slide:1.17,vol:.12});},
    rails(slow){for(let i=0;i<4;i++)noise(.05,{at:i*(slow?.16:.08),vol:.12,freq:480});},
    earth(){noise(.14,{vol:.23,freq:350,sweep:.5});},
    crystal(){tone(1700,.19,{type:'triangle',vol:.20,slide:.73});},
    rouletteTick(){tone(980,.035,{type:'triangle',vol:.09,slide:.87});},
    rouletteLock(){tone(650,.10,{type:'triangle',vol:.18});tone(1040,.16,{type:'sine',vol:.19,at:.07});},
    enemyArrival(){tone(95,.38,{type:'triangle',vol:.20,slide:.61});noise(.27,{vol:.19,freq:420,sweep:.48});},
    attack(){tone(440,.09,{type:'triangle',slide:1.8,vol:.20});noise(.12,{vol:.23,freq:2100,sweep:.4});},
    damage(){tone(135,.18,{type:'triangle',vol:.22,slide:.46});noise(.09,{vol:.13,freq:650});},
    chest(){[440,660,880,1320].forEach((f,i)=>tone(f,.25,{type:'triangle',vol:.15,at:i*.06}));},
    wild(){tone(560,.10,{type:'triangle',vol:.14,slide:1.5});tone(960,.16,{type:'sine',vol:.14,at:.08});},
    featureWin(){[440,554,659,880].forEach((f,i)=>tone(f,.23,{type:'triangle',vol:.17,at:i*.07}));},
    pocket(){tone(660,.12,{type:'triangle',vol:.2});tone(1320,.23,{type:'triangle',vol:.18,at:.07});},
    spin() { noise(0.35, { vol: 0.25, freq: 400, sweep: 6, type: 'bandpass', q: 1.5 }); },
    land(col = 0) {
      if(activeTheme==='fruit'){tone(520+col*40,.10,{type:'triangle',vol:.22,slide:.68});tone(1100+col*60,.06,{vol:.08});}
      else if(activeTheme==='mine'){tone(95-col*3,.17,{vol:.42,slide:.48});noise(.12,{vol:.16,freq:580,sweep:.3});}
      else {tone(180-col*6,.13,{vol:.34,slide:.6});tone(880+col*55,.11,{type:'triangle',vol:.1});noise(.045,{vol:.08,freq:2900});}
    },
    win(step = 0) { const base = Math.min(step, 4); [0, 2, 4].forEach((k, i) => tone(NOTES[base + k] || 1500, 0.22, { type: 'triangle', vol: 0.3, at: i * 0.06 })); },
    pop() { tone(700, 0.12, { type: 'sine', vol: 0.3, slide: 2.2 }); },
    mult() { tone(220, 0.5, { type: 'sawtooth', vol: 0.15, slide: 4 }); [0, 0.1, 0.2].forEach((a, i) => tone(1318 + i * 200, 0.15, { type: 'triangle', vol: 0.18, at: 0.35 + a })); },
    boom() { noise(0.6, { vol: 0.7, freq: 900, sweep: 0.15 }); tone(70, 0.5, { type: 'sine', vol: 0.6, slide: 0.4 }); },
    coin() { tone(1975, 0.08, { type: 'square', vol: 0.06 }); tone(2637, 0.14, { type: 'square', vol: 0.05, at: 0.05 }); },
    hit() { tone(330, 0.07, { type: 'square', vol: 0.12, slide: 0.6 }); noise(0.06, { vol: 0.2, freq: 3000, type: 'highpass' }); },
    crumble() { noise(0.3, { vol: 0.35, freq: 700, sweep: 0.3 }); },
    sparkle() { [0, 0.05, 0.1].forEach((a, i) => tone(1568 + i * 330, 0.12, { type: 'sine', vol: 0.12, at: a })); },
    free() { [0, 0.08, 0.16, 0.24, 0.32].forEach((a, i) => tone(NOTES[i + 2], 0.3, { type: 'triangle', vol: 0.3, at: a })); },
    bigwin(arg = 1) {
      const level=typeof arg==='number'?arg:arg.level, speed=typeof arg==='number'?1:Math.min(1.2,Math.max(.2,arg.speed));
      const chords = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [784, 988, 1175]];
      chords.slice(0, 1 + level).forEach((ch, i) => ch.forEach((f) => tone(f, Math.max(.09,.45*speed), { type: 'triangle', vol: 0.11, at: i * .28*speed, attack: .012 })));
      for (let i = 0; i < 3 + level * 2; i++) setTimeout(() => {if(on)SFX.coin();}, (180 + i * 110)*speed);
    },
    click() { tone(900, 0.05, { type: 'square', vol: 0.06 }); },
  };
  // かんたんなBGM（テーマごとにコードを変えたループ）
  const BGM = {
    gems: { chords: [[220, 261.63, 329.63], [174.61,220,261.63], [196,246.94,293.66], [164.81,207.65,246.94]], arp: 'triangle', tempo: 0.35, pattern:[0,2,1,2,0,2,1,2], bass:.11 },
    fruit: { chords: [[261.63,329.63,392], [349.23,440,523.25], [220,261.63,329.63], [196,246.94,293.66]], arp: 'triangle', tempo: 0.27, pattern:[0,1,2,1,2,1,0,2], bass:.075 },
    mine: { chords: [[146.83,174.61,220], [116.54,146.83,174.61], [130.81,164.81,196], [110,138.59,164.81]], arp: 'sine', tempo: 0.39, pattern:[0,2,2,1,0,1,2,2], bass:.15 },
    gods: { chords:[[146.83,174.61,220],[130.81,164.81,196],[110,130.81,164.81],[123.47,146.83,185]],arp:'triangle',tempo:.42,pattern:[0,2,1,2,0,1,2,1],bass:.14 },
    dogs: { chords:[[261.63,329.63,392],[293.66,369.99,440],[196,246.94,293.66],[220,277.18,329.63]],arp:'sine',tempo:.24,pattern:[0,1,2,1,0,2,1,2],bass:.08 },
    train: { chords:[[110,130.81,164.81],[98,123.47,146.83],[87.31,110,130.81],[98,123.47,146.83]],arp:'triangle',tempo:.31,pattern:[0,0,2,1,0,0,2,1],bass:.16 },
    dwarf: { chords:[[130.81,155.56,196],[116.54,146.83,174.61],[103.83,130.81,155.56],[98,123.47,146.83]],arp:'triangle',tempo:.36,pattern:[0,2,0,1,0,2,1,2],bass:.13 },
    plinko: { chords:[[220,277.18,329.63],[246.94,293.66,369.99],[196,246.94,293.66],[164.81,207.65,246.94]],arp:'sine',tempo:.3,pattern:[0,1,2,0,2,1,0,2],bass:.09 },
  };
  function startBgm(theme) {
    stopBgm();
    activeTheme=theme;
    if (!ac) return;
    const b = BGM[theme] || BGM.gems;
    let bar = 0;
    const playBar = () => {
      const ch = b.chords[bar % b.chords.length];
      ch.forEach((f) => tone(f, b.tempo * 8, { type: 'sine', vol: 0.18, attack: 0.3, out: bgmGain }));
      for (let i = 0; i < 8; i++) tone(ch[b.pattern[i]] * 2, b.tempo * 0.9, { type: b.arp, vol: 0.055, at: i * b.tempo, out: bgmGain });
      for(const i of [0,4])tone(ch[0]/2,b.tempo*1.8,{type:'sine',vol:b.bass,at:i*b.tempo,out:bgmGain});
      if(theme==='gems')tone(ch[2]*4,b.tempo*1.8,{type:'sine',vol:.025,at:b.tempo*3,out:bgmGain});
      bar++;
    };
    playBar();
    bgmTimer = setInterval(playBar, b.tempo * 8 * 1000);
  }
  function stopBgm() { clearInterval(bgmTimer); bgmTimer = null; }

  ZG.sfx = {
    unlock() { if (!init()) return; if (ac.state === 'suspended') ac.resume(); },
    play(name, arg) { if (!ac || !on) return; try { SFX[name] && SFX[name](arg); } catch {} },
    bgm(theme) { if (ac) startBgm(theme); },
    stopBgm,
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem('zo-sound', on ? 'on' : 'off'); } catch {}
      if (master) master.gain.value = on ? 0.9 : 0;
      return on;
    },
  };
})();
