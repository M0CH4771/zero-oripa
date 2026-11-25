// Headless canvas contract test: render every animation frame against a strict
// mock context, advance the stage clock, and verify the settled score.
import assert from 'node:assert/strict';
import {playGame} from '../docs/test-games/index.js';
import {plinkoConfig} from '../docs/test-games/plinko.js';
globalThis.window=globalThis;
globalThis.ResizeObserver=class{observe(){} disconnect(){}};
globalThis.requestAnimationFrame=()=>0;
globalThis.Image=class{width=900;height=900;set src(v){queueMicrotask(()=>this.onload?.())}};
let lastStage,draws=0,errors=[],capturedLabels=null;
const gradient={addColorStop(){}};
const numeric=new Set(['arc','ellipse','translate','scale','rotate','moveTo','lineTo','rect','fillRect','strokeRect','clearRect','setTransform','drawImage','createLinearGradient','createRadialGradient']);
const ctx=new Proxy({}, {get(t,k){if(k in t)return t[k];return (...args)=>{if(numeric.has(k)){for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),`${String(k)}: nonfinite ${v}`);draws++;}if(k==='fillText'&&capturedLabels)capturedLabels.push(args[0]);if(String(k).includes('Gradient'))return gradient;if(k==='measureText')return {width:40};};}});
let viewport={w:390,h:740};
const canvas=()=>({clientWidth:viewport.w,clientHeight:viewport.h,parentElement:parent,style:{},getContext:()=>ctx});
const parent={clientHeight:740,append(e){e.isConnected=true;setImmediate(()=>{if(e.onclick)e.onclick();else if(e.buttons?.length)e.buttons[0].onclick?.();});}};
globalThis.document={createElement(tag){if(tag==='canvas')return canvas();return {isConnected:false,buttons:Array.from({length:4},()=>({dataset:{mode:'sticky'},classList:{add(){},remove(){}},onclick:null})),querySelectorAll(){return this.buttons},querySelector(){return this.buttons[0]},remove(){this.isConnected=false},focus(){}};}};
await import('../docs/game/engine.js');
const Stage=ZG.Stage;ZG.Stage=class extends Stage{constructor(...a){super(...a);lastStage=this;}};
ZG.rr=(c,x,y,w,h)=>{c.beginPath();c.rect(x,y,w,h)};
capturedLabels=[];for(const value of [1,2,3,10,50,100,128,500,1000,20000])ZG.multiplierLabel(ctx,value,20,20,30,15);
assert.deepEqual(capturedLabels,['×1','×2','×3','×10','×50','×100','×128','×500','×1,000','×20,000']);capturedLabels=null;
await Promise.resolve();capturedLabels=[];for(const theme of ['gems','fruit','mine','gods','dogs','train'])for(const value of [2,12,100])assert.equal(ZG.multiplierEmblem(ctx,theme,value,20,20,40),true);
assert.deepEqual(capturedLabels,Array.from({length:6},()=>['×2','×12','×100']).flat());capturedLabels=null;
for(const [theme,values] of Object.entries({gems:[2,10,50],fruit:[2,8,32],mine:[2,5,8],gods:[2,10,50],dogs:[1,2,3],train:[1,10,50]})){
 const stage=new ZG.Stage(canvas(),{fit:'container'});for(const [tier,v] of values.entries()){stage.emblemLand(theme,v,40,40,32);assert.equal(stage.rings.at(-1).tier,tier);if(tier<2)assert.equal(stage.shakeAmp,0);}assert.ok(stage.shakeAmp>0);const count=stage.rings.length;
 globalThis.matchMedia=()=>({matches:true});stage.emblemLand(theme,values[2],40,40,32);assert.equal(stage.rings.length,count);delete globalThis.matchMedia;stage.draw();stage.destroy();
}
ZG.scene={background:()=>({}),character(){},frame(){},text3d(){}};
let openChestDraws=0,mineEmblemDraws=0;
const originalEmblem=ZG.multiplierEmblem;
ZG.multiplierEmblem=(ctx,theme,...args)=>{if(theme==='mine')mineEmblemDraws++;return originalEmblem(ctx,theme,...args);};
ZG.art={sprite:(theme,id)=>{if(theme==='mine'&&id.startsWith('chest-open-'))openChestDraws++;return {width:100,height:100,pad:0};},preload:async()=>{},IDS:{gems:['l1','l2','l3','l4','l5','h1','h2','h3','h4'],fruit:['f1','f2','f3','f4','f5','f6','f7']},COLORS:{gems:{},fruit:{},mine:new Proxy({},{get:()=> '#987654'})}};
ZG.shade=x=>x;ZG.sfx={play(){}};
await import('../docs/game/feature-player.js');await import('../docs/game/players.js');
const origError=console.error;console.error=(...a)=>{errors.push(a);origError(...a)};
async function pump(p){let done=false,err;p.then(()=>done=true,e=>{done=true;err=e});for(let k=0;k<18000&&!done;k++){lastStage.update(50);lastStage.draw();await new Promise(setImmediate);}assert.ok(done,'animation stalled');if(err)throw err;assert.equal(errors.length,0,'node rendering errors');}
for(const game of ['rush','fruit','mine','plinko','gods','dogs','train','dwarf']){
 let seed=640;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);const r=playGame(game,{rate:1000,rand,rows:12,risk:'medium',count:10,strategy:'sticky'});
 const times=[];
 for(const speed of [1.2,.45,.2]){
  viewport=speed===.45?{w:320,h:600}:{w:390,h:740};
  let total=0,remaining=null,ballCount=0,ballTotal=0;const metrics=[];const hooks={fmt:v=>String(v),onScore:v=>total=v,onSpin(n,t){remaining=t-n;assert.ok(remaining>=0);},onRemaining(v){remaining=v;assert.ok(v>=0);},onRoundWin:async()=>{},onSpinWin(){},onBallLand(v){assert.ok(Number.isFinite(v));ballCount++;ballTotal+=v;},onFeatureMetric(label,value){assert.ok(label&&value);metrics.push([label,value]);},onMode(mode){if(mode==='COMPLETE')remaining=0;}};
  const g=ZG.createGame(canvas(),{game,region:()=>({x:0,y:145,w:viewport.w,h:viewport.h-295}),getRate:()=>1000,plinko:game==='plinko'?plinkoConfig(12,'medium'):null},hooks);await g.warm();g.idle();g.setSpeed(speed);lastStage.draw();
  if(game==='dogs')await pump(g.prepareDogs(r.entry));
  await pump(g.play({...r,script:r.spins}));assert.equal(total,r.score,game+' final score');assert.equal(remaining,0);assert.ok(lastStage.parts.length<=280);if(game==='plinko'){assert.equal(ballCount,r.spins.length);assert.equal(ballTotal,r.score);}if(['mine','gods','dogs','train'].includes(game))assert.ok(metrics.length,game+' metric updates');if(game==='dwarf'&&r.spins.some(s=>s.battle))assert.ok(metrics.some(([label])=>label==='バトル結果'));times.push(lastStage.t);
  await pump(g.bigWin(2,12500));assert.ok(!lastStage.overlays.some(o=>o.kind==='big'),'win overlay released');g.destroy();
 }
 assert.ok(times[0]>times[1]&&times[1]>times[2],game+' speed order');console.log(game,'normal / quick / turbo, score & remaining passed',times.map(v=>Math.round(v/100)/10+'s').join(' / '));
}
assert.ok(draws>10000);
assert.ok(openChestDraws>0,'MINE opened chest sprites rendered');
assert.equal(mineEmblemDraws,0,'MINE chest art never receives a closed-chest emblem overlay');
viewport={w:320,h:600};
for(const rows of [8,12,16])for(const risk of ['low','medium','high']){
 let rate=100;const config=plinkoConfig(rows,risk),g=ZG.createGame(canvas(),{game:'plinko',region:()=>({x:0,y:110,w:320,h:265}),plinko:config,getRate:()=>rate},{fmt:String,onScore(){},onSpin(){}});await g.warm();g.idle();
 for(rate of [100,300,1000,3000]){capturedLabels=[];lastStage.draw();assert.deepEqual(capturedLabels.filter(s=>String(s).endsWith('C')),config.cents.map(c=>String(Math.round(rate*c/100))+'C'));}capturedLabels=null;g.destroy();
}
console.log('PLINKO: all 9 mobile configurations render every exact coin payout across four bets');
