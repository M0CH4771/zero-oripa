import {REELS,ULTIMATE_STRIP,reelStop,LINES,TIERS} from '../tropical.mjs?v=cap119';
const ZG=window.ZG, atlasIds=[9,10,11,0,1,2,3,4,5,6,7,8], initial=Array.from({length:9},(_,j)=>REELS[j%3][Math.floor(j/3)]);
const load=src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='./assets/anime/tropical/'+src});
const names=['青7','赤7','金7'],choices=['blue','red','gold'];
ZG.createTropicalGame=function(canvas,opt,hooks){
 let daylight,night,atlas,ultimate,reachArt,grid=initial.slice(),phase=0,lit=false,reaching=false,rolling=[null,null,null],hits=[],line=null;
 const col=(g,c)=>g.length===3?[g[c]]:[g[c],g[c+3],g[c+6]];
 const layout=(w,h)=>{const r=opt.region(w,h),size=Math.max(6,Math.min(r.w-20,r.h-22,640)),cell=size/3,rows=grid.length===3?1:3,bh=rows*cell;return {x:r.x+(r.w-size)/2,y:r.y+(r.h-bh)/2,size,cell,bh,rows,r}};
 const drawSymbol=(ctx,v,x,y,d)=>{const a=v>=12?ultimate:atlas;if(!a)return;const n=v>=12?3:4,i=v>=12?v-12:atlasIds[v],sw=a.width/n,sh=a.height/(v>=12?1:4);ctx.drawImage(a,i%n*sw,Math.floor(i/n)*sh,sw,sh,x-d/2,y-d/2,d,d);};
 const st=new ZG.Stage(canvas,{fit:'container',bg(ctx,w,h){
  const bg=phase>0?night||daylight:daylight;ctx.fillStyle='#123848';ctx.fillRect(0,0,w,h);if(bg){const scale=Math.max(w/bg.width,h/bg.height),bw=bg.width*scale,bh=bg.height*scale;ctx.drawImage(bg,(w-bw)/2,(h-bh)/2,bw,bh);}ctx.fillStyle='#091c2544';ctx.fillRect(0,0,w,h);
  const L=layout(w,h),{x,y,size,cell,bh,rows}=L;
  ctx.fillStyle='#102a3988';ctx.fillRect(x,y,size,bh);ctx.strokeStyle='#bb864a';ctx.lineWidth=5;ctx.strokeRect(x,y,size,bh);
  for(let c=0;c<3;c++){const xx=x+c*cell,roll=rolling[c];ctx.save();ctx.beginPath();ctx.rect(xx,y,cell,bh);ctx.clip();if(roll){const off=Math.max(0,roll.offset),whole=Math.floor(off),f=off-whole;for(let j=0;j<=rows;j++){const v=roll.strip[(roll.end+whole+j)%roll.strip.length];drawSymbol(ctx,v,xx+cell/2,y+(j+.5-f)*cell,cell*.92);}}else for(let j=0;j<rows;j++){const idx=j*3+c;if(hits.includes(idx)){ctx.fillStyle='#ffe27c33';ctx.fillRect(xx,y+j*cell,cell,cell);}drawSymbol(ctx,grid[idx],xx+cell/2,y+(j+.5)*cell,cell*.92);}ctx.restore();if(c>0){ctx.strokeStyle='#9b6a38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx,y+bh);ctx.stroke();}}
  if(line){ctx.strokeStyle='#ffe17a';ctx.lineWidth=3;ctx.beginPath();line.forEach((j,i)=>{const cx=x+(j%3+.5)*cell,cy=y+(Math.floor(j/3)+.5)*cell;i?ctx.lineTo(cx,cy):ctx.moveTo(cx,cy)});ctx.stroke();}
  if(reaching&&reachArt){const rw=Math.min(size*.7,360),rh=rw*reachArt.height/reachArt.width;ctx.drawImage(reachArt,x+(size-rw)/2,y-rh*.15,rw,rh);}
  if(lit){const d=Math.min(42,cell*.42),cx=x+size-d*.65,cy=y+d*.65;ctx.save();ctx.shadowColor='#ffe05c';ctx.shadowBlur=17;if(atlas)ctx.drawImage(atlas,atlas.width/4,atlas.height*3/4,atlas.width/4,atlas.height/4,cx-d/2,cy-d/2,d,d);ctx.restore();}
 }});st.theme='tropical';
 function reset(){grid=initial.slice();phase=0;lit=false;reaching=false;rolling=[null,null,null];hits=[];line=null;}
 async function spin(g){const rows=g.length===3?1:3,old=grid.slice();grid=g.slice();hits=[];line=null;reaching=false;const reach=rows===3?LINES.filter(l=>g[l[0]]<3&&g[l[0]]===g[l[1]]):[];const normal=st.speed===1;
 await Promise.all([0,1,2].map(async c=>{const strip=rows===1?ULTIMATE_STRIP:REELS[c],end=reelStop(strip,col(g,c));if(end<0)throw Error('Invalid fixed reel stop');let start=old.length===g.length?reelStop(strip,col(old,c)):-1;if(start<0)start=0;const loops=normal?2:1,distance=loops*strip.length+(start-end+strip.length)%strip.length;const roll={strip,end,offset:distance};rolling[c]=roll;const ms=normal?1450+c*260+(c===2&&reach.length?1800:0):650+c*185+(c===2&&reach.length?900:0);await st.tween(roll,{offset:0},ms,ZG.Ease.outCubic);rolling[c]=null;ZG.sfx?.play('land',c);if(c===1&&reach.length)reaching=true;}));reaching=false;}
 async function award(t,seen){hooks.onFeatureMetric?.('現在の7',names[t]);if(!seen.has(t)){seen.add(t);await hooks.onBonusIntro?.({spins:t===2?Infinity:8,choice:choices[t]});}else await st.featureCue(names[t],'継続',{hold:350,color:'#ffe7a0'});}
 return {st,idle:reset,async warm(cb){[daylight,night,atlas,ultimate,reachArt]=await Promise.all(['bg103.webp','night103.webp','atlas109.webp','ultimate98.webp','reach102.webp'].map(load));cb?.(1);},async play(r){
 reset();hooks.onMode?.('ENTRY');hooks.onSpin?.(0,8);await spin(r.entry);hits=r.entryLine;line=r.entryLine;phase=r.tier;let seen=new Set();hooks.onRemaining?.(phase===2?1:8);await award(phase,seen);hooks.onMode?.('BONUS');hits=[];line=null;
 for await(const s of r.spinStream()){phase=s.phase;lit=s.lit;hooks.onSpin?.(s.played,s.played+s.remain);hooks.onFeatureMetric?.(lit?'点灯・継続確定':'現在の7',names[phase]);if(s.justLit)ZG.sfx?.play('sparkle');await spin(s.grid);hooks.onSpinWin?.(s.win);for(const win of s.wins){hits=win.cells;line=win.cells;await st.wait(180);}await hooks.onRoundWin?.(s.win);hooks.onScore?.(s.total);hooks.onRemaining?.(s.remain);if(s.continuation){lit=false;if(s.continuation.upgrade||s.continuation.extra||s.continuation.success&&!s.continuation.ultimate){phase=s.mode;await award(phase,seen);}}await st.roundPause();}
 lit=false;hooks.onMode?.('COMPLETE');
 }};
};
