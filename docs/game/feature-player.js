(function(){
 const ZG=window.ZG;
 const styles={
  gods:{cols:6,rows:5,accent:'#e9ca78',panel:'#251a46',title:'DIVINE MULTIPLIER',fallback:['👑','⌛','💍','🏆','♦','🔮','🔶','💚','💎','⚡','🌟']},
  dogs:{cols:6,rows:7,accent:'#ffe4a0',panel:'#54342e',title:'MEGAWAYS',fallback:['🐕','🐶','🐩','🐕‍🦺','🦮','🦴','🏠','🐾','🎾']},
  train:{cols:5,rows:3,accent:'#efb46a',panel:'#332b23',title:'MONEY CART',fallback:['🪙','💰','🔒','⌚','🏮','⚙️','🎩','🕴️','🎯']},
  dwarf:{cols:3,rows:3,accent:'#d4edaa',panel:'#213a30',title:'TREASURE RUSH',fallback:['🧔','👹','🐉','🛡️','🔨','🪙','🎁','🪨','🧝']}
 };
 const im=src=>new Promise(resolve=>{let i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src});
 ZG.createFeatureGame=function(canvas,opt,hooks){
  const mode=opt.game,cfg=styles[mode];let bg=null,atlas=null,cols=cfg.cols,rows=cfg.rows,grid=[],hits=[],note=cfg.title,offset={v:0},battlePanel=null,trainTotal=0,trainRemaining=3,trainReset=3,trainSource=null,godsMult=0,godsTumble='0 C',fall={v:0,dist:[]},board=null;
  let blanks=null,glyphs=null;
  const plateCache=new Map();
  let actions=null,plates=null,kennels=null,monsters=null,trophies=null;
  const values=mode==='train'?[1,2,3,4,5,6,8,10,20,21,22,25,30,40,50,75,100,200]:[2,3,4,5,6,8,10,12,15,20,25,50,100,250,500];
  function drawPlate(ctx,value,cx,cy,size){
   const i=values.indexOf(value);if(!plates)return false;
   if(i<0){
    if(mode!=='train'||!blanks||!glyphs||!Number.isInteger(value)||value<0)return false;
    let plate=plateCache.get(value);
    if(!plate){
     plate=document.createElement('canvas');plate.width=plate.height=256;
     const g=plate.getContext('2d'),digits='×'+value,w=Math.min(49,156/digits.length);
     g.drawImage(blanks,value>=50?256:0,0,256,256,0,0,256,256);
     Array.from(digits).forEach((digit,j)=>g.drawImage(glyphs,'×0123456789'.indexOf(digit)*60,0,60,86,128+(j-digits.length/2)*w,147-w*.72,w,w*1.44));
     if(plateCache.size>=128)plateCache.delete(plateCache.keys().next().value);
     plateCache.set(value,plate);
    }
    ctx.drawImage(plate,cx-size/2,cy-size/2,size,size);ZG.multiplierLabel(ctx,value,cx,cy+size*.10,size*.94,size*.45);return true;
   }
   const columns=mode==='train'?6:5,w=plates.width/columns,h=plates.height/3;
   ctx.drawImage(plates,i%columns*w,Math.floor(i/columns)*h,w,h,cx-size/2,cy-size/2,size,size);
   ZG.multiplierLabel(ctx,value,cx,cy+size*.10,size*.94,size*.45);
   return true;
  }
  let duel=null,arena=null,escapeArt=null;
  const foeNames={Goblin:'ゴブリン',Troll:'トロール',Dragon:'ドラゴン'};
  let expansion=null,trainOrder='';
  let dogHeights=[4,4,4,4,4,4],dogWays=4096,dogPositions=[],dogPrepared=false,dogPay=0;
  const reelState=(j,n=cols)=>{const v=offset.reels?.[j%n]?.v??1,locked=offset.locked?.has(j);return locked?{rolling:false,shift:0}:{rolling:v<.76,shift:v>=.76&&v<1?-(1-ZG.Ease.landing((v-.76)/.24)):0};};
  function tile(ctx,x,y,w,h,active,light=false){const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,active?'#ce9c4e':light?'#fff8db':'#ffffff22');g.addColorStop(1,active?'#926126':light?'#e9c48d':'#00000022');ctx.fillStyle=g;ZG.rr(ctx,x,y,w,h,6);ctx.fill();if(active){ctx.strokeStyle='#fff2ac';ctx.lineWidth=2;ctx.stroke();}}
  function text(ctx,s,x,y,n,color='#fff',maxWidth){ctx.font='800 '+n+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor='#000';ctx.shadowBlur=5;if(maxWidth)ctx.fillText(s,x,y,maxWidth);else ctx.fillText(s,x,y);ctx.shadowBlur=0;}
  const st=new ZG.Stage(canvas,{fit:'container',bg:(ctx,w,h)=>{
   ctx.fillStyle=cfg.panel;ctx.fillRect(0,0,w,h);
   if(bg){const scale=Math.max(w/bg.width,h/bg.height),bw=bg.width*scale,bh=bg.height*scale;ctx.drawImage(bg,(w-bw)/2,0,bw,bh);}
   ctx.fillStyle='#06071470';ctx.fillRect(0,0,w,h);
   if(mode==='gods'&&godsMult>=50&&st.scenes?.cast){const img=st.scenes.cast,sw=img.width/4;ctx.save();ctx.globalAlpha=.56;ctx.drawImage(img,(godsMult>=100?3:1)*sw,0,sw,img.height,w*.48,0,w*.52,h*.38);ctx.restore();}
   if(duel){
    const region=opt.region(w,h),art=duel.run?escapeArt:arena;
    if(art)ctx.drawImage(art,region.x,region.y,region.w,region.h);
    if(!duel.run){for(const [index,label,hp,max] of [[0,'ドワーフ',duel.hp,4],[1,foeNames[duel.monster],duel.enemyHP,duel.max]]){
     const x=region.x+region.w*(index?.75:.25),y=region.y+25;
     ctx.fillStyle='#17141feb';ZG.rr(ctx,x-region.w*.22,y-19,region.w*.44,52,8);ctx.fill();
     text(ctx,label,x,y-4,Math.min(17,w/19),'#ffecbc',region.w*.41);const bw=region.w*.36;ctx.fillStyle='#353040';ZG.rr(ctx,x-bw/2,y+11,bw,15,5);ctx.fill();if(hp>0){ctx.fillStyle=index?'#df6665':'#54b58c';ZG.rr(ctx,x-bw/2,y+11,bw*hp/max,15,5);ctx.fill();}text(ctx,'HP '+hp+' / '+max,x,y+18,12,'#fff');
    }}return;
   }
   if(mode==='dogs'){
    const r=opt.region(w,h),bw=Math.min(r.w-20,700),bh=Math.max(70,Math.min(r.h-76,bw*1.12)),x=r.x+(r.w-bw)/2,y=r.y+Math.max(42,(r.h-bh)/2),cw=bw/6;
    ZG.rr(ctx,x-7,y-7,bw+14,bh+14,12);ctx.fillStyle='#4d271de8';ctx.fill();ctx.strokeStyle='#ffe1a5';ctx.lineWidth=3;ctx.stroke();
    text(ctx,dogWays.toLocaleString()+' MEGAWAYS',w/2,y-29,Math.min(24,w/17),cfg.accent,w-24);text(ctx,note+' · GAME PAYS '+hooks.fmt(dogPay)+' C',w/2,y+bh+23,Math.min(16,w/24),'#fff',w-18);
    dogPositions=[];for(let c=0;c<6;c++){const count=dogHeights[c],ch=bh/count;for(let row=0;row<count;row++){const j=row*6+c,xx=x+c*cw,yy=y+row*ch,cx=xx+cw/2,cy=yy+ch/2;dogPositions[j]={x:cx,y:cy};const m=reelState(j,6),spinning=m.rolling,s=spinning?'s'+([0,1,2,3,4,5,9,10,11,12,13][(Math.floor(st.t/70)+j)%11]):grid[j];
    tile(ctx,xx+2,yy+2,cw-4,ch-4,hits.includes(j),true);
    ctx.fillStyle='#a16b43';ctx.fillRect(xx,yy,cw,2);ctx.fillRect(xx,yy,3,ch);
    if(offset.locked?.has(j)){ctx.strokeStyle='#ffcc56';ctx.lineWidth=3;ctx.strokeRect(xx+3,yy+3,cw-6,ch-6);}if(!s)continue;const k=s==='S'?7:s.startsWith('W')?6:Number(s.slice(1)),d=Math.min(cw*.98,ch*.96),dy=spinning?((st.t%70)/70-.5)*ch*.88:-m.shift*ch;
    ctx.save();ctx.beginPath();ctx.rect(xx,yy,cw,ch);ctx.clip();if(k>=9){const ranks=['A','K','Q','J','10'],colors=['#b82342','#1974b6','#8a45aa','#17865a','#dc871a'];ctx.lineWidth=3;ctx.strokeStyle='#fff8dc';ctx.font='900 '+Math.min(d*.72,45)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(ranks[k-9],cx,cy-dy);text(ctx,ranks[k-9],cx,cy-dy,Math.min(d*.72,45),colors[k-9]);}else if(kennels&&s.startsWith('W')){const kw=kennels.width/3;ctx.drawImage(kennels,(Number(s.slice(1))-1)*kw,0,kw,kennels.height,cx-d/2,cy-d/2-dy,d,d);}else if(atlas){const aw=atlas.width/3,ah=atlas.height/3;if(spinning){ctx.globalAlpha=.16;ctx.drawImage(atlas,k%3*aw,Math.floor(k/3)*ah,aw,ah,cx-d/2,cy-d/2-dy-ch*.22,d,d);ctx.globalAlpha=1;}ctx.drawImage(atlas,k%3*aw,Math.floor(k/3)*ah,aw,ah,cx-d/2,cy-d/2-dy,d,d);}else text(ctx,cfg.fallback[k],cx,cy,d*.7);
    if(s.startsWith('W'))ZG.multiplierLabel(ctx,Number(s.slice(1)),cx,cy-dy+d*.15,Math.min(cw*.91,d*.97),d*.47);else if(s==='S'){ctx.fillStyle='#572218ee';ZG.rr(ctx,xx+3,yy+ch*.71,cw-6,ch*.25,4);ctx.fill();text(ctx,'BONUS',cx,yy+ch*.835,Math.min(13,cw*.18,ch*.19),'#fff3ad');}ctx.restore();}}
    return;
   }
   const r=opt.region(w,h),gap=3,targetCell=Math.max(8,Math.min((r.w-22)/cols,(r.h-(['train','gods'].includes(mode)?100:75))/rows,mode==='dwarf'?170:130)),cell=expansion?expansion.cell+(targetCell-expansion.cell)*expansion.progress:targetCell,
    visibleCols=expansion?cols-1+expansion.progress:cols,bw=visibleCols*cell,bh=rows*cell,x=r.x+(r.w-bw)/2,y=r.y+Math.max(['train','gods'].includes(mode)?60:28,(r.h-bh)/2);
   board={x,y,cell};
   ZG.rr(ctx,x-9,y-9,bw+18,bh+18,13);ctx.fillStyle='#060815e8';ctx.fill();ctx.strokeStyle=cfg.accent;ctx.lineWidth=3;ctx.stroke();
   if(mode!=='gods')text(ctx,note,w/2,y-25,Math.min(19,w/22),cfg.accent,w-24);
   if(mode==='train'){if(trainOrder)text(ctx,trainOrder,w/2,y+bh+14,12,'#ffe19a',bw);text(ctx,'SPINS '+trainRemaining+' / '+trainReset,w*.25,y-50,Math.min(17,w/23),cfg.accent,w*.43);text(ctx,'TOTAL ×'+hooks.fmt(trainTotal),w*.75,y-50,Math.min(17,w/23),cfg.accent,w*.43);}
   if(mode==='gods'){text(ctx,'連鎖配当 '+godsTumble,w/2,y-28,Math.min(25,w/13),'#fff5cf',w-20);}
   for(let j=0;j<cols*rows;j++){
    if(expansion&&j%cols===cols-1&&expansion.progress<.98)continue;
    const xx=x+j%cols*cell,yy=y+Math.floor(j/cols)*cell;
    ZG.rr(ctx,xx+gap/2,yy+gap/2,cell-gap,cell-gap,8);ctx.fillStyle=cfg.panel;ctx.fill();tile(ctx,xx+gap/2,yy+gap/2,cell-gap,cell-gap,hits.includes(j));if(j===trainSource){ctx.strokeStyle='#54e8ff';ctx.lineWidth=3;ctx.stroke();}
    const m=reelState(j),spinning=m.rolling;
    const item=spinning?'s'+((Math.floor(st.t/75)+j)%6):grid[j];if(!item)continue;
    const id=typeof item==='string'?item:item.id;
    const k=id[0]==='s'?+id.slice(1):id[0]==='W'?6:id[0]==='B'?(mode==='gods'?10:8):mode==='dwarf'?11:mode==='gods'?9:7;
    const d=cell*.94,cy=yy+cell/2+(spinning?((st.t%75)/75-.5)*cell*.85:m.shift*cell)-(mode==='gods'?(fall.dist[j]||0)*cell*fall.v:0),cx=xx+cell/2;
    ctx.save();ctx.beginPath();if(mode==='gods'&&fall.v>0)ctx.rect(x,y,bw,bh);else ctx.rect(xx,yy,cell,cell);ctx.clip();
    const usePlate=mode==='gods'&&id.startsWith('B')?drawPlate(ctx,Number(id.slice(1)),cx,cy,d):mode==='train'&&['coin','golden'].includes(item.kind)?drawPlate(ctx,item.value,cx,cy,d):false;
    if(mode==='train'&&typeof item==='object'){ctx.fillStyle='#c5ac85';for(const dx of [.09,.91])for(const dy of [.09,.91]){ctx.beginPath();ctx.arc(xx+cell*dx,yy+cell*dy,Math.max(1,cell*.035),0,Math.PI*2);ctx.fill();}if(item.persistent){ctx.strokeStyle='rgba(255,202,99,'+(.5+.3*Math.sin(st.t/310))+')';ctx.strokeRect(xx+3,yy+3,cell-6,cell-6);}}
    if(usePlate){ctx.restore();continue;}
    if(atlas){const ac=['dwarf','gods'].includes(mode)?4:3;let aw=atlas.width/ac,ah=atlas.height/3;if(spinning){ctx.globalAlpha=.16;ctx.drawImage(atlas,(k%ac)*aw,Math.floor(k/ac)*ah,aw,ah,cx-d/2,cy-d/2-cell*.22,d,d);ctx.globalAlpha=1;}ctx.drawImage(atlas,(k%ac)*aw,Math.floor(k/ac)*ah,aw,ah,cx-d/2,cy-d/2,d,d);}
    else text(ctx,cfg.fallback[k]||'✦',cx,cy,Math.floor(cell*.63));
    const label=typeof item==='object'?(item.persistent?'P · ':'')+'×'+hooks.fmt(item.value):id[0]==='W'?'WILD ×'+id.slice(1):id[0]==='B'?'×'+id.slice(1):id==='S'?(mode==='dwarf'?'VS BATTLE':'SCATTER'):'';
    if(mode==='train'&&typeof item==='object'&&drawPlate(ctx,item.value,cx,cy+cell*.12,cell*.88)){
     if(item.persistent)text(ctx,'P',xx+cell*.16,yy+cell*.18,cell*.20,'#ffe398');
    }else if(id[0]==='B'||id[0]==='W'||typeof item==='object'){ZG.multiplierLabel(ctx,typeof item==='object'?item.value:Number(id.slice(1)),cx,cy+cell*.12,cell*.86,cell*.43);}else if(label){const labelY=cy+cell*.19;ctx.fillStyle='#110c1be8';ZG.rr(ctx,xx+3,labelY,cell-6,cell*.27,4);ctx.fill();text(ctx,label,cx,labelY+cell*.135,Math.max(8,Math.min(14,cell*.17)),cfg.accent);}
    ctx.restore();
   }
  }});
  st.theme=mode;
  // NORMAL regular spins and tumbling only; leave special sequences untouched.
  const routineTime=ms=>st.speed>=1?Math.round(ms*.74):ms;
  function reset(){cols=cfg.cols;rows=cfg.rows;hits=[];note=cfg.title;trainTotal=0;trainRemaining=trainReset=3;trainSource=null;godsMult=0;godsTumble='0 C';fall={v:0,dist:[]};dogHeights=[4,4,4,4,4,4];dogWays=4096;dogPay=0;dogPrepared=false;grid=Array.from({length:cols*rows},(_,i)=>mode==='train'?null:'s'+(i%(mode==='dogs'?6:9)));}
  async function reveal(title,subtitle,color=cfg.accent){
   ZG.sfx?.play('free');st.flash(color,.15);st.impact(st.w/2,st.h/2,Math.min(st.w*.32,145),color,2);await st.banner([title,subtitle],{rainbow:false});
  }
  async function attackRoulette(choices,selected,weights){
   const panel=document.createElement('div');panel.className='attack-roulette';
   panel.innerHTML='<strong>攻撃ルーレット</strong><div>'+choices.map((v,i)=>'<span class="'+(v>0?'attack':'damage')+'">'+(v>0?'⚔':'♥')+' '+Math.abs(v)+(v>0?' ダメージ':' 被ダメージ')+'<small>'+((weights?.[i]??2500)/100).toFixed(2)+'%</small></span>').join('')+'</div>';
   canvas.parentElement.append(panel);
   try{const cells=panel.querySelectorAll('span');const steps=12+selected;for(let i=0;i<=steps;i++){if(st.dead||st.skip)break;const cell=cells[i%4];if(!cell)continue;for(const c of cells)c.classList.remove('active');cell.classList.add('active');if(st.speed>=.45||i>=steps-2)ZG.sfx?.play('rouletteTick');await st.wait(45+Math.max(0,i-8)*24);}if(cells[selected]){for(const c of cells)c.classList.remove('active');cells[selected].classList.add('active');cells[selected].classList.add('chosen');}ZG.sfx?.play('rouletteLock');await st.wait(800);}finally{panel.remove();}
  }
  async function tickets(values){
   if(!values?.length)return;
   const panel=document.createElement('div');panel.className='feature-tickets';panel.innerHTML='<strong>FREE SPIN REVEAL</strong><div>'+values.map(()=>'<span>?</span>').join('')+'</div><b>0 SPINS</b>';canvas.parentElement.append(panel);
   let sum=0;try{for(const [i,v] of values.entries()){await st.wait(240);const card=panel.querySelectorAll('span')[i];card.textContent='+'+v;card.classList.add('revealed');sum+=v;panel.querySelector('b').textContent=sum+' SPINS';ZG.sfx?.play('land',i%5);}await st.wait(650);}finally{panel.remove();}
  }
  async function show(g,h=[],locked=[],routine=false){
   offset.locked=new Set(mode==='dogs'?grid.flatMap((item,j)=>typeof item==='string'&&item.startsWith('W')&&item===g[j]?[j]:[]):mode==='train'&&rows===3?g.flatMap((item,j)=>item&&typeof item==='object'&&grid[j]?.id===item.id&&grid[j]?.value===item.value?[j]:[]):[]);
   for(const j of locked)offset.locked.add(j);
   grid=g;hits=[];const timing=ms=>routine&&mode==='gods'?routineTime(ms):ms;await reelSpin(timing(mode==='train'?320:530),timing(mode==='train'?75:145));hits=h;highlight(h);
  }
  function cellPoint(j){if(!Number.isInteger(j))return null;if(mode==='dogs')return dogPositions[j];if(!board)return null;return {x:board.x+(j%cols+.5)*board.cell,y:board.y+(Math.floor(j/cols)+.5)*board.cell};}
  function highlight(h){for(const j of h||[]){const p=cellPoint(j);if(p)st.impact(p.x,p.y,Math.min(32,board?.cell*.37||23),cfg.accent,.38);}}
  async function reelSpin(base,stagger){offset.v=1;offset.reels=Array.from({length:cols},()=>({v:0}));ZG.sfx?.play('spin');await Promise.all(offset.reels.map((r,c)=>st.tween(r,{v:1},base+c*stagger,ZG.Ease.linear).then(()=>{if(mode==='dogs')dogWays*=dogHeights[c];const p=cellPoint(c);if(p)st.landing(p.x,p.y,20,cfg.accent);ZG.sfx?.play('land',c);})));offset.v=0;}
  async function showDogs(sp,routine=false){dogHeights=sp.heights;dogWays=1;dogPay=0;const locked=sp.mode==='sticky'?grid.flatMap((v,j)=>v?.startsWith('W')&&v===sp.grid[j]?[j]:[]):[];offset.locked=new Set(locked);grid=sp.grid;hits=[];await reelSpin(routine?routineTime(430):430,routine?routineTime(135):135);dogWays=sp.ways;const freshWilds=[];
   hooks.onFeatureMetric?.('WAYS数',hooks.fmt(dogWays));
   for(const [j,v] of grid.entries())if(v?.startsWith('W')&&!offset.locked.has(j)){
    freshWilds.push(v);const p=cellPoint(j);if(p){st.burst(p.x,p.y+12,{n:8,colors:['#ddb786','#fff0c3'],speed:2,life:280});const img=st.scenes?.reaction;if(img){const pup=st.add({x:p.x-16,y:p.y-22,z:31});pup.draw=ctx=>ctx.drawImage(img,0,0,img.width/4,img.height,-17,-17,34,34);try{await st.tween(pup,p,220,ZG.Ease.outCubic);}finally{st.remove(pup);}}st.impact(p.x,p.y,29,'#ffe295',.72);}
   }
   if(freshWilds.length)await st.featureCue(sp.mode==='sticky'?'STICKY WILD · 固定':'RAINING WILD',freshWilds.length+'個出現 · '+freshWilds.map(v=>'×'+v.slice(1)).join(' / '),{color:'#ffe3a0',hold:550,sound:'wild'});hits=sp.hits||[];highlight(hits);}
  async function prepareDogs(entry){reset();hooks.onMode?.('ENTRY');note='BONUS TRIGGER';await showDogs({...entry,hits:entry.grid.flatMap((s,j)=>s==='S'?[j]:[])});await reveal('BONUS ACTIVE',entry.scatters+' SCATTERS');dogPrepared=true;return await new Promise(resolve=>{const panel=document.createElement('div');panel.className='dog-choice';panel.innerHTML='<strong>CHOOSE YOUR BONUS</strong><button data-mode="sticky"><b>STICKY WILDS</b><span>'+entry.choices.sticky+' FREE SPINS</span><small>固定ワイルドが最後まで残る</small></button><button data-mode="raining"><b>RAINING WILDS</b><span>'+entry.choices.raining+' FREE SPINS</span><small>各スピン最大6個のワイルド</small></button>';canvas.parentElement.append(panel);let timer;const done=v=>{clearInterval(timer);panel.remove();resolve(v)};panel.querySelectorAll('button').forEach(b=>b.onclick=()=>done(b.dataset.mode));timer=setInterval(()=>{if(st.dead||!panel.isConnected)done(null)},100);});}
  async function finishDogs(r){
   const winners=new Set();
   for(const spin of r.script)for(const group of spin.groups)for(const j of group.cells){
    const id=spin.grid[j];if(/^s[0-5]$/.test(id))winners.add(Number(id.slice(1)));
   }
   const portraits=Array.from(winners,i=>'<i style="background-position:'+((i%3)*50)+'% '+(Math.floor(i/3)*100)+'%"></i>').join('');
await st.atNormalSpeed(()=>new Promise(resolve=>{const panel=document.createElement('div');panel.className='dog-choice dog-finish';panel.innerHTML='<strong>CONGRATULATIONS!</strong><div class="dog-winners">'+portraits+'</div><span>YOU HAVE WON</span><b>'+hooks.fmt(r.score)+' C</b><span>IN '+r.played+' FREE SPINS</span><button>タップして続ける</button>';canvas.parentElement.append(panel);let timer;const done=()=>{clearInterval(timer);panel.remove();resolve()};panel.onclick=done;timer=setInterval(()=>{if(st.dead||!panel.isConnected)done()},100);}));note='FREE SPINS COMPLETED';}
  function drawPose(ctx,row,frame,size){
   if(!actions)return;
   const w=actions.width/4,h=actions.height/3;
   ctx.drawImage(actions,Math.min(3,Math.floor(frame))*w,row*h,w,h,-size/2,-size/2,size,size);
  }
  async function attachCart(){
   ZG.sfx?.play('whistle');ZG.sfx?.play('rails');
   const region=opt.region(st.w,st.h),size=Math.min(145,region.w*.32);
   const cart=st.add({x:region.x+region.w+size/2,y:region.y+region.h*.58,z:38,frame:0});
   cart.draw=ctx=>drawPose(ctx,1,cart.frame,size);
   const hook=st.add({x:region.x+region.w*.56,y:cart.y,z:39,frame:0});
   hook.draw=ctx=>drawPose(ctx,0,hook.frame,size*.38);
   try{
    await Promise.all([st.tween(hook,{frame:2},230),st.tween(cart,{x:hook.x+size*.42,frame:2},520,ZG.Ease.outCubic)]);
    ZG.sfx?.play('rails',true);hook.frame=cart.frame=3;ZG.sfx?.play('hit');st.impact(hook.x,hook.y,size*.33,'#ffbd70',.8);await st.wait(190);
   }finally{st.remove(cart);st.remove(hook);}
  }
  async function collectCoins(ev){
   const target=cellPoint(ev.source);if(!target||!grid[ev.source])return;
   const start=grid[ev.source].value;
   let collected=0;
   const conductor=st.add({...target,z:36,frame:0});
   conductor.draw=ctx=>drawPose(ctx,2,conductor.frame,board.cell*.88);
   try{
    conductor.frame=1;
    for(const [i,coin] of grid.entries()){
     if(!coin||i===ev.source)continue;
     const from=cellPoint(i);conductor.frame=2;
     const token=st.add({...from,z:40});
     token.draw=ctx=>text(ctx,'+'+hooks.fmt(coin.value),0,0,Math.max(13,board.cell*.27),'#ffe3a0');
     try{await st.tween(token,target,150,ZG.Ease.inOutCubic);}finally{st.remove(token);}
     collected+=coin.value;
     grid=grid.map((v,j)=>j===ev.source?{...v,value:Math.min(ev.grid[j].value,start+collected)}:v);
     ZG.sfx?.play('coin');
    }
    conductor.frame=3;await st.wait(100);
   }finally{st.remove(conductor);}
  }
  async function trainEvents(events){
   const labels={'NEW COINS':'コイン着地・回数リセット',COLLECTOR:'盤上の合計を回収',PAYER:'対象コインに加算',SNIPER:'対象コインを2倍に',REVIVE:'特殊コインを再起動','NEW CART':'貨車を1列追加','RESET PLUS':'リセット回数 +1','FULL CART ×2':'全マス完成・合計2倍'};
   for(const [index,ev] of (events||[]).entries()){
    trainOrder=(index+1)+' / '+events.length+'　'+ev.name;
    if(ev.name==='NEW CART'){await attachCart();expansion={progress:0,cell:board?.cell||24};await st.featureCue('NEW CART','貨車 +1 列',{color:'#ffce83',hold:620,sound:'whistle'});}
    const activation=cellPoint(ev.source);
    if(activation&&ev.name!=='NEW CART'){const color=({PAYER:'#70ffd4',SNIPER:'#ff7878',REVIVE:'#c792ff',COLLECTOR:'#ffd682'})[ev.name]||'#ffe3ab';st.impact(activation.x,activation.y,board.cell*.58,color,1);if(ev.name!=='NEW COINS')await st.featureCue(ev.name,labels[ev.name]||ev.name,{color,hold:500,sound:'crystal'});}
    if(ev.name==='COLLECTOR')await collectCoins(ev);
    if((ev.remaining??0)>trainRemaining)await st.carry(activation||{x:st.w/2,y:board.y}, {x:st.w*.25,y:board.y-50},'+'+(ev.remaining-trainRemaining),'#ffe191',18);
    cols=ev.cols;rows=ev.rows;trainSource=ev.source??null;trainTotal=ev.totalMultiple??trainTotal;trainRemaining=ev.remaining??trainRemaining;trainReset=ev.resetValue??trainReset;hooks.onRemaining?.(trainRemaining);
    hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(trainTotal));
    note=(labels[ev.name]||ev.name)+(ev.amount!=null&&ev.name!=='RESET PLUS'?' '+(ev.name==='SNIPER'?'×':'+')+hooks.fmt(ev.amount):'');
    if(ev.name==='NEW COINS')await show(ev.grid,ev.hits);
    else if(ev.name==='NEW CART'){grid=ev.grid;hits=[];try{await st.tween(expansion,{progress:1},420,ZG.Ease.outCubic);highlight([cols-1,cols*2-1,cols*3-1]);await st.wait(160);}finally{expansion=null;}}
    else {grid=ev.grid;hits=ev.hits||[];ZG.sfx?.play('sparkle');const source=cellPoint(ev.source);for(const j of hits){const p=cellPoint(j);if(p&&source&&j!==ev.source)st.beam(source.x,source.y,p.x,p.y,'#ffd07a');}highlight(hits);await st.wait(420);}
   }trainSource=null;trainOrder='';
  }
  async function playGodsTumble(step,score){
   for(const group of step.groups){
    const cells=group.cells.map(cellPoint).filter(Boolean);
    for(let i=1;i<cells.length;i++)st.beam(cells[i-1].x,cells[i-1].y,cells[i].x,cells[i].y,'#b9afff');
   }
   hits=step.hits;ZG.sfx?.play('win');highlight(hits);await st.wait(routineTime(350));
   hooks.onTumble?.(step.groups);
   const texts=step.groups.map(g=>{const p=board,center=g.cells.reduce((a,j)=>({x:a.x+p.x+(j%6+.5)*p.cell,y:a.y+p.y+(Math.floor(j/6)+.5)*p.cell}),{x:0,y:0});return st.popText(center.x/g.cells.length,center.y/g.cells.length,g.cells.length+'個 +'+hooks.fmt(g.pay),{size:Math.min(25,p.cell*.48),hold:300});});
   godsTumble=hooks.fmt(step.tumbleTotal*currentUnit)+' C';hooks.onScore(score+step.credited);
   const removed=new Set(hits),dist=Array(30).fill(0);
   for(const j of hits){const p=cellPoint(j);if(p)st.burst(p.x,p.y,{n:8,colors:['#d6baff','#ffe5a0','#fff'],speed:3,life:420,shape:'star',size:3});}grid=grid.map((v,j)=>removed.has(j)?null:v);await st.wait(routineTime(200));
   for(let c=0;c<6;c++){const keep=[];for(let row=0;row<5;row++)if(grid[row*6+c]!=null)keep.push(row);const fresh=5-keep.length;for(let j=0;j<fresh;j++)dist[j*6+c]=fresh;keep.forEach((row,i)=>{dist[(fresh+i)*6+c]=fresh+i-row;});}
   grid=step.grid;hits=[];fall.dist=dist;fall.v=1;await st.tween(fall,{v:0},routineTime(520),ZG.Ease.landing);ZG.sfx?.play('land');await Promise.all(texts);
  }
  let currentUnit=1;
  async function godsOrbs(sp){
   if(!sp.orbs?.length)return;
   if(sp.orbs.some(b=>b.mult>=50)){await st.transition('cast');await st.featureCue('DIVINE POWER','高倍率オーブ出現',{color:'#d3baff',hold:650,sound:'featureWin'});}
   await st.atNormalSpeed(async()=>{for(const b of sp.orbs){const p=board;if(!p)continue;const orb=st.add({x:p.x+(b.pos%6+.5)*p.cell,y:p.y+(Math.floor(b.pos/6)+.5)*p.cell,z:50,glow:12,glowColor:'#a7d5ff'});orb.draw=(ctx,n)=>{const d=p.cell*.9;if(drawPlate(ctx,b.mult,0,0,d))return;if(atlas)ctx.drawImage(atlas,2*atlas.width/4,2*atlas.height/3,atlas.width/4,atlas.height/3,-d/2,-d/2,d,d);text(ctx,'×'+b.mult,0,0,Math.max(13,d*.3),'#fff');};grid[b.pos]=null;st.beam(st.w*.82,p.y-p.cell*.6,orb.x,orb.y,'#e9d8ff');const seal=st.add({x:orb.x,y:orb.y,z:51,rot:0,alpha:1});seal.draw=ctx=>{ctx.strokeStyle='#ffe3a3';ctx.lineWidth=2;ctx.strokeRect(-p.cell*.33,-p.cell*.33,p.cell*.66,p.cell*.66);};try{await st.tween(seal,{rot:.8,sx:1.4,sy:1.4,alpha:0},170);}finally{st.remove(seal);}ZG.sfx?.play('mult');st.beam(orb.x,orb.y,st.w/2,p.y-50,'#bbddff');st.impact(orb.x,orb.y,p.cell*.65,'#adcbff',.9);await st.tween(orb,{x:st.w/2,y:p.y-50,sx:.75,sy:.75},450,ZG.Ease.inOutCubic);st.impact(orb.x,orb.y,p.cell*.85,'#ffe8a1',1.3);st.remove(orb);godsMult+=b.mult;ZG.sfx?.play('crystal');await st.popText(st.w/2,p.y-50,'累積 ×'+godsMult,{size:Math.min(23,st.w*.065),color:'#e5caff',hold:420});}
   hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(godsMult));godsTumble=hooks.fmt(sp.tumbleRaw*currentUnit)+' × '+sp.mult;await st.wait(550);godsTumble=hooks.fmt(sp.win)+' C';await st.wait(350);});
  }
  async function trainEntry(entry){
   cols=5;rows=4;note='BONUS TRIGGER';const tableau=Array.from({length:20},(_,i)=>'s'+(i%9));const trigger=[];
   entry.grid.forEach((t,j)=>{if(t){tableau[j]='S';trigger.push(j);}});
   await show(tableau,trigger);await st.atNormalSpeed(()=>st.banner(['MONEY CART','通常 ×1–10 · GOLDEN ×20–200'],{rainbow:false}));
   const start=document.createElement('button');start.className='rush-entry-start';start.textContent='MONEY CART　タップで開始';canvas.parentElement.append(start);
   try{await new Promise(resolve=>{const done=()=>{clearInterval(timer);resolve();};const timer=setInterval(()=>{if(st.dead||!start.isConnected)done();},100);start.onclick=done;});}finally{start.remove();}
   note='貨車へ移動';await st.banner(['MONEY CART','3 RESPINS'],{});cols=5;rows=3;
   grid=entry.grid;trainTotal=grid.reduce((s,t)=>s+(t?.value||0),0);hits=[];await st.wait(300);await trainEvents(entry.events);
  }
  return {st,idle:reset,prepareDogs,async warm(cb){if(mode==='dwarf')[arena,escapeArt]=await Promise.all(['arena','escape'].map(n=>im('./assets/anime/dwarf/'+n+'.webp')));await Promise.all(({dwarf:['gate','knockout'],gods:['gate','cast'],dogs:['reaction'],train:[]})[mode].map(name=>st.loadScene(name)));[bg,atlas,actions,plates,kennels,monsters,trophies,blanks,glyphs]=await Promise.all([im('./assets/anime/'+mode+'/bg.webp'),im('./assets/anime/'+mode+(['dwarf','gods','dogs'].includes(mode)?'/atlas-v2.webp':'/atlas.webp')),['train','dwarf'].includes(mode)?im('./assets/anime/'+mode+'/actions.webp'):null,['train','gods'].includes(mode)?im('./assets/anime/'+mode+'/multipliers.webp'):null,mode==='dogs'?im('./assets/anime/dogs/kennels.webp'):null,...['monsters','trophies'].map(name=>mode==='dwarf'?im('./assets/anime/dwarf/'+name+'.webp'):null),...['blanks','glyphs'].map(name=>mode==='train'?im('./assets/anime/train/'+name+'.webp'):null)]);cb?.(1)},async play(r){
   if(mode==='dogs'){if(!dogPrepared){reset();await showDogs(r.entry);await reveal('BONUS ACTIVE',r.entry.initialSpins+' FREE SPINS');}dogPrepared=false;currentUnit=r.unit||1;let score=0;hooks.onSpin(0,r.entry.initialSpins);hooks.onMode?.('BONUS');for(const [i,sp] of r.script.entries()){note=sp.note;hooks.onSpin(i+1,sp.total);await showDogs(sp,true);dogPay=sp.win;if(sp.groups?.some(g=>g.cells.some(j=>sp.grid[j]?.startsWith('W'))))await st.transition('reaction');if(sp.win){ZG.sfx?.play('win');for(const g of sp.groups){const p=dogPositions[g.cells[0]];for(const j of g.cells){const q=cellPoint(j);if(q)st.popText(q.x,q.y+12,'🐾',{size:13,hold:130});}if(p)await st.popText(p.x,p.y,g.ways+' WAYS · +'+hooks.fmt(g.value*currentUnit),{size:Math.min(20,st.w*.05),hold:220});}await st.wait(280);}hooks.onSpinWin?.(sp.win);score+=sp.win;hooks.onScore(score);await st.celebrateWin(sp.win,r.unit,hooks.fmt,[20,40,50,100]);await st.roundPause();}if(r.guarantee)await st.banner(['最低保証','+'+hooks.fmt(r.guarantee)+' C'],{});if(r.capped)await st.banner(['MAX WIN',hooks.fmt(r.score)+' C'],{});hooks.onScore(r.score);await finishDogs(r);hooks.onMode?.('COMPLETE');return;}
   reset();currentUnit=r.unit||1;let score=0;hooks.onMode?.('ENTRY');hooks.onSpin(0,r.entry?.initialSpins??10);if(mode==='train'&&r.entry)await trainEntry(r.entry);else if(r.entry){await show(r.entry.grid);hits=r.entry.grid.map((s,i)=>s==='S'?i:-1).filter(i=>i>=0);await st.wait(300);if(r.entry.tickets)await tickets(r.entry.tickets);if(mode==='gods'){score=r.entry.win;godsTumble=hooks.fmt(score)+' C';hooks.onScore(score);}await reveal(cfg.title,r.entry.initialSpins+' FREE SPINS');if(mode==='gods'){const start=document.createElement('button');start.className='rush-entry-start';start.textContent=r.entry.initialSpins+' FREE SPINS　タップで開始';canvas.parentElement.append(start);try{await new Promise(resolve=>{const done=()=>{clearInterval(timer);resolve();};const timer=setInterval(()=>{if(st.dead||!start.isConnected)done();},100);start.onclick=done;});}finally{start.remove();}}}else if(mode==='dwarf'){hooks.onSpin(0,10);await reveal('宝箱ラッシュ','10フリースピン');}else await reveal(cfg.title,'BONUS START');hooks.onMode?.('BONUS');
   for(let i=0;i<r.script.length;i++){const sp=r.script[i];cols=sp.cols;rows=sp.rows;note=sp.battle?'バトル':sp.note;if(mode==='dwarf')hooks.onSpin(sp.freePlayed,sp.freePlayed+sp.remaining-(sp.battle?sp.awarded:0));else if(mode==='train')hooks.onSpin(i+1,i+1+Math.max(0,trainRemaining-1));else hooks.onSpin(i+1,Math.max(i+1,(sp.total||r.played)-(sp.add||0)));
    if(mode==='train'){
     cols=sp.landingCols;rows=3;note='空きマスをリスピン';trainRemaining=Math.max(0,trainRemaining-1);
     ZG.sfx?.play('rails',trainRemaining<=1);
     if(!sp.events?.some(e=>e.name==='NEW COINS'))await show(sp.landing,[]);
     await trainEvents(sp.events);cols=sp.cols;grid=sp.grid;trainTotal=sp.totalMultiple;trainRemaining=sp.remaining;trainReset=sp.resetValue;note=sp.note;hooks.onSpin(i+1,i+1+sp.remaining);
     hooks.onSpinWin?.(sp.win);score+=sp.win;hooks.onScore(score);await st.roundPause();continue;
    }
    else if(!sp.battle){if(mode==='gods'){godsTumble='0 C';godsMult=sp.previousMult;hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(godsMult));}await show(sp.grid,sp.hits||[],[],true);}
    if(sp.battle){
     hooks.onFeatureMetric?.('バトル','対 '+foeNames[sp.monster]);
     await st.transition('gate');
     const panel=document.createElement('div');
     panel.className='encounter-card';panel.innerHTML='<img class="encounter-enemy" src="./assets/anime/dwarf/'+sp.monster+'-arrival.webp" alt=""><h2>'+foeNames[sp.monster]+'出現</h2><b>勝利で ＋'+sp.reward+' スピン</b>';
     canvas.parentElement.append(panel);ZG.sfx?.play('enemyArrival');try{await st.wait(2200);}finally{panel.remove();}
     duel={monster:sp.monster,hp:4,enemyHP:sp.monsterHP,max:sp.monsterHP};
     const fighter=(id,x,flip)=>{const region=opt.region(st.w,st.h),n=st.add({x,y:region.y+region.h*.43,z:25});n.draw=(ctx)=>{const d=Math.min(125,st.w*.29);if(flip!==1&&sp.monster!=='Goblin'&&monsters){
       const sw=monsters.width/4,sh=monsters.height/2;
       ctx.drawImage(monsters,(n.pose||0)*sw,sp.monster==='Dragon'?sh:0,sw,sh,-d/2,-d/2,d,d);return;
      }if(actions&&(flip===1||sp.monster==='Goblin'||sp.monster==='Troll')){drawPose(ctx,flip===1?0:sp.monster==='Goblin'?1:2,n.pose||0,d);return;}ctx.scale(flip,1);if(atlas){const aw=atlas.width/4,ah=atlas.height/3;ctx.drawImage(atlas,id%4*aw,Math.floor(id/4)*ah,aw,ah,-d/2,-d/2,d,d);}else text(ctx,cfg.fallback[id],0,0,d*.65);};return n;};
     const hero=fighter(0,st.w*.25,1),enemy=fighter(Number(sp.grid[2].slice(1)),st.w*.75,-1);
     let hp=4,enemyHP=sp.monsterHP;
     try{for(const action of sp.actions||[]){await attackRoulette(sp.choices,action.selected,sp.weights);const attack=action.roll>0,actor=attack?hero:enemy,target=attack?enemy:hero,home=actor.x,dir=Math.sign(target.x-home);note=attack?'ATTACK ×'+action.roll:'DAMAGE ×'+Math.abs(action.roll);actor.pose=1;await st.tween(actor,{x:home-dir*15,sy:.94},140,ZG.Ease.outCubic);st.beam(home,actor.y,target.x,target.y,'#fae0a3');await st.tween(actor,{x:target.x-dir*24,sy:1},250,ZG.Ease.inCubic);const damage=attack?enemyHP-action.enemyHP:hp-action.heroHP;duel.hp=action.heroHP;duel.enemyHP=action.enemyHP;st.popText(target.x,target.y-25,'−'+damage+' HP',{size:20,hold:380});target.pose=(attack?action.enemyHP:action.heroHP)<=0?3:2;ZG.sfx?.play(attack?'attack':'damage');st.shake(3,170);st.impact(target.x,target.y,65,'#ffe0a2',1.8);await Promise.all([st.tween(actor,{x:home},380,ZG.Ease.outCubic),st.tween(target,{x:target.x+dir*10},140,ZG.Ease.outCubic).then(()=>st.tween(target,{x:target.x-dir*10},180,ZG.Ease.outCubic))]);actor.pose=0;if(target.pose===2)target.pose=0;hp=action.heroHP;enemyHP=action.enemyHP;await st.wait(450);}}finally{st.remove(hero);st.remove(enemy);}
     if(sp.won){ZG.sfx?.play('featureWin');await st.transition('knockout');await st.wait(420);}else{ZG.sfx?.play('damage');await st.wait(300);}
     await reveal(sp.won?'勝利！':'敗北',sp.won?'フリースピン ＋'+sp.awarded+'回':(sp.remaining?'追加なし · 残り '+sp.remaining+' 回':'追加なし · ラッシュ終了'));
     hooks.onFeatureMetric?.('バトル結果',sp.won?'勝利 ＋'+sp.awarded+'回':'敗北');if(sp.awarded)await st.carry({x:st.w*.5,y:st.h*.45},st.anchor('#rSpin',{x:st.w*.85,y:st.h*.84}),'＋'+sp.awarded+'回','#ffe9a2',26);hooks.onSpin(sp.freePlayed,sp.freePlayed+sp.remaining);duel=null;await st.transition('gate','',true);note=sp.note;
    }
    for(const chest of sp.chests||[]){hits=[chest.pos];ZG.sfx?.play('sparkle');const p=cellPoint(chest.pos);if(p&&trophies&&chest.value){
      const index=[3,5,8,10,15,20,30,50,100,300].indexOf(chest.value);
      if(index>=0){
       const trophy=st.add({...p,z:33,sy:.7,sx:.7});
       trophy.draw=ctx=>{const w=trophies.width/5,h=trophies.height/2,d=board.cell;ctx.drawImage(trophies,index%5*w,Math.floor(index/5)*h,w,h,-d/2,-d/2,d,d);};
       try{await st.tween(trophy,{sy:1,sx:1,y:p.y-board.cell*.22},240,ZG.Ease.outCubic);await st.wait(160);await st.tween(trophy,{...st.anchor('#rScore',{x:st.w*.5,y:st.h*.82}),sx:.35,sy:.35},360,ZG.Ease.inOutCubic);}finally{st.remove(trophy);}
      }
     }if(p){st.impact(p.x,p.y,board.cell*.72,'#ffe9a2',1.6);st.sparkle(p.x,p.y,board.cell*.35,8);}await st.popText(p?.x??st.w/2,p?.y??st.h*.46,chest.add?'+'+chest.add+' FREE SPINS':mode==='dwarf'?hooks.fmt(chest.win??Math.round(chest.value*currentUnit))+' C':'×'+chest.value,{size:Math.min(30,st.w*.08),hold:280});}
    if(mode==='gods'){for(const step of sp.steps||[])await playGodsTumble(step,score);await godsOrbs(sp);if(sp.scatterRaw){hits=grid.flatMap((v,j)=>v==='S'?[j]:[]);await st.popText(st.w/2,st.h*.46,'SCATTER +'+hooks.fmt(sp.scatterRaw*currentUnit),{size:Math.min(30,st.w*.07),hold:300});}godsTumble=hooks.fmt(sp.win)+' C';}
    if(sp.add&&mode==='gods')await st.transition('gate','+'+sp.add+' SPINS');
    else if(sp.add)await reveal('+'+sp.add+' FREE SPINS','追加フリースピン');
    if(sp.add&&mode==='gods')hooks.onSpin(i+1,sp.total);if(sp.win>0)ZG.sfx?.play('coin');hooks.onSpinWin?.(sp.win);await hooks.onRoundWin?.(sp.win);score+=sp.win;hooks.onScore(score);
    await st.celebrateWin(sp.win,r.unit,hooks.fmt,[20,40,50,100]);
    await st.roundPause();
   }
   if(r.guarantee){await st.banner(['最低保証','+'+hooks.fmt(r.guarantee)+' C'],{});await hooks.onRoundWin?.(r.guarantee);}
   if(r.capped)await st.banner(['MAX WIN',hooks.fmt(r.score)+' C'],{});
   if(mode==='train')await st.atNormalSpeed(async()=>{
    note='貨車の積荷を集計';const destination=st.anchor('#rScore',{x:st.w/2,y:st.h*.85});
    for(let col=0;col<cols;col++){
     let value=0,origin=null;
     for(let j=col;j<grid.length;j+=cols){if(grid[j]?.value){value+=grid[j].value;origin=cellPoint(j);}}
     if(origin){ZG.sfx?.play('coin');await st.carry(origin,destination,'×'+hooks.fmt(value),'#ffe5a2',24,200);}
    }
    // The final result is presented by the shared result sheet.
    await st.banner(['TOTAL ×'+hooks.fmt(trainTotal),hooks.fmt(r.score)+' C'],{hold:1000});
   });
   hooks.onScore(r.score);hooks.onMode?.('COMPLETE');
  }};
 };
})();
