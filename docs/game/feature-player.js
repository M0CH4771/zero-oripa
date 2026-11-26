(function(){
 const ZG=window.ZG;
 const styles={
  gods:{cols:6,rows:5,accent:'#e9ca78',panel:'#251a46',title:'DIVINE MULTIPLIER',fallback:['👑','⌛','💍','🏆','♦','🔮','🔶','💚','💎','⚡','🌟']},
  dogs:{cols:6,rows:7,accent:'#ffe4a0',panel:'#54342e',title:'MEGAWAYS',fallback:['🐕','🐶','🐩','🐕‍🦺','🦮','🦴','🏠','🐾','🎾']},
  train:{cols:6,rows:6,accent:'#efb46a',panel:'#332b23',title:'LUCKY WAGON',fallback:['🪙','💰','🔒','⌚','🏮','⚙️','🎩','🕴️','🎯']},
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
   if(ZG.multiplierEmblem(ctx,mode,value,cx,cy,size))return true;
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
  let duel=null,arena=null,escapeArt=null,upgradeArt=null,arrivalArt=null,arrivalAlt=null,combatArt=null,combatAlt=null;
  const chestReveals=new Map(),spinChestValues=new Map();
  const chestTypes=['normal','rare','gold','legend','mythic'],chestColors=['#ffe6a1','#9fe4ff','#ffe281','#ffb06e','#f2ddff'];
  let spinChestArt=[],battleArt=null;
  const chestTier=value=>value>=100?4:value>=30?3:value>=10?2:value>=3?1:0;
  function drawSpinChest(ctx,value,frame,cx,cy,d){
   const art=spinChestArt[chestTier(value)],f=Math.min(7,Math.max(0,Math.floor(frame)));
   if(art){const sw=art.width/4,sh=art.height/2;ctx.drawImage(art,sw*(f%4),sh*Math.floor(f/4),sw,sh,cx-d/2,cy-d/2,d,d);}
   else if(upgradeArt){const sw=upgradeArt.width/6,sh=upgradeArt.height/3,row=value>=50?2:value>=10?1:0;ctx.drawImage(upgradeArt,sw*Math.min(3,Math.floor(f*3/7)),sh*row,sw,sh,cx-d/2,cy-d/2,d,d);}
   else if(atlas){const sw=atlas.width/4,sh=atlas.height/3,k=value>=20?8:9;ctx.drawImage(atlas,k%4*sw,Math.floor(k/4)*sh,sw,sh,cx-d/2,cy-d/2,d,d);}
   else text(ctx,frame>=3?'✦':'🔒',cx,cy,d*.65);
  }
  function drawChestNumber(ctx,value,x,y,d,alpha=1){
   const tier=chestTier(value),label='×'+value.toLocaleString('en-US');
   ctx.save();ctx.globalAlpha=alpha;ctx.font='900 '+Math.max(9,d*.30)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,d*.042);ctx.strokeStyle='#141016';ctx.strokeText(label,x,y,d*.9);ctx.fillStyle=chestColors[tier];ctx.fillText(label,x,y,d*.9);ctx.restore();
  }
  const foeNames={Goblin:'ゴブリン',Troll:'トロール',Dragon:'ドラゴン'};
  let expansion=null,trainOrder='',wagonEnhancers=[],wagonOpened=[],wagonCollected=0;
  let dogHeights=[4,4,4,4,4,4],dogVisualHeights=Array.from({length:6},()=>({heightSlots:4})),dogWays=4096,dogPositions=[],dogPrepared=false,dogPay=0;
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
    if(!duel.run){for(const [index,label,hp,max] of [[0,'ドワーフ',duel.hp,duel.heroMax||5],[1,foeNames[duel.monster],duel.enemyHP,duel.max]]){
     const x=region.x+region.w*(index?.75:.25),y=region.y+25;
     ctx.fillStyle='#17141feb';ZG.rr(ctx,x-region.w*.22,y-19,region.w*.44,52,8);ctx.fill();
     text(ctx,label,x,y-4,Math.min(17,w/19),'#ffecbc',region.w*.41);const bw=region.w*.36;ctx.fillStyle='#353040';ZG.rr(ctx,x-bw/2,y+11,bw,15,5);ctx.fill();if(hp>0){ctx.fillStyle=index?'#df6665':'#54b58c';ZG.rr(ctx,x-bw/2,y+11,bw*hp/max,15,5);ctx.fill();}text(ctx,'HP '+hp+' / '+max,x,y+18,15,'#fff');
    }}return;
   }
   if(mode==='dogs'){
    const r=opt.region(w,h),compact=w<=640,bw=Math.min(r.w-(compact?8:20),700),bh=Math.max(12,Math.min(r.h-(compact?35:60),bw*1.12)),x=r.x+(r.w-bw)/2,y=r.y+Math.max(compact?27:42,(r.h-bh)/2+8),cw=bw/6;
    ZG.rr(ctx,x-7,y-7,bw+14,bh+14,12);ctx.fillStyle='#4d271de8';ctx.fill();ctx.strokeStyle='#ffe1a5';ctx.lineWidth=3;ctx.stroke();
    text(ctx,dogWays.toLocaleString()+' MEGAWAYS',w/2,y-(compact?16:25),Math.min(21,w/19),cfg.accent,w-24);
    dogPositions=[];for(let c=0;c<6;c++){const count=dogVisualHeights[c].heightSlots,ch=bh/count;ctx.save();ctx.beginPath();ctx.rect(x+c*cw,y,cw,bh);ctx.clip();for(let row=0;row<Math.ceil(count);row++){const j=row*6+c,xx=x+c*cw,yy=y+row*ch,cx=xx+cw/2,cy=yy+ch/2;if(row<dogHeights[c])dogPositions[j]={x:cx,y:cy};const m=reelState(j,6),spinning=m.rolling,s=spinning?'s'+([0,1,2,3,4,5,9,10,11,12,13][(Math.floor(st.t/70)+j)%11]):grid[j];
    tile(ctx,xx+2,yy+2,cw-4,ch-4,hits.includes(j),true);
    ctx.fillStyle='#a16b43';ctx.fillRect(xx,yy,cw,2);ctx.fillRect(xx,yy,3,ch);
    if(offset.locked?.has(j)){ctx.strokeStyle='#ffcc56';ctx.lineWidth=3;ctx.strokeRect(xx+3,yy+3,cw-6,ch-6);}if(!s)continue;const k=s==='S'?7:s.startsWith('W')?6:Number(s.slice(1)),d=Math.min(cw*.98,ch*.96),dy=spinning?((st.t%70)/70-.5)*ch*.88:-m.shift*ch;
    ctx.save();ctx.beginPath();ctx.rect(xx,yy,cw,ch);ctx.clip();
    if(s.startsWith('W')){const v=Number(s.slice(1));if(!ZG.multiplierEmblem(ctx,'dogs',v,cx,cy-dy,d)){if(atlas){const aw=atlas.width/4,ah=atlas.height/4,i=v>=3?15:v===2?14:6;ctx.drawImage(atlas,i%4*aw,Math.floor(i/4)*ah,aw,ah,cx-d/2,cy-d/2-dy,d,d);}ZG.multiplierLabel(ctx,v,cx,cy-dy+d*.1,Math.min(cw*.91,d*.97),d*.45);}}
    else if(atlas){const aw=atlas.width/4,ah=atlas.height/4;if(spinning){ctx.globalAlpha=.16;ctx.drawImage(atlas,k%4*aw,Math.floor(k/4)*ah,aw,ah,cx-d/2,cy-d/2-dy-ch*.22,d,d);ctx.globalAlpha=1;}ctx.drawImage(atlas,k%4*aw,Math.floor(k/4)*ah,aw,ah,cx-d/2,cy-d/2-dy,d,d);}
    else if(k>=9)text(ctx,['A','K','Q','J','10'][k-9],cx,cy-dy,d*.65);else text(ctx,cfg.fallback[k],cx,cy,d*.7);
    ctx.restore();}ctx.restore();}
    return;
   }
   if(mode==='train'){
    const r=opt.region(w,h),cell=Math.min((r.w-12)/6,(r.h-48)/8),bw=cell*6,x=r.x+(r.w-bw)/2,y=r.y+(r.h-cell*8)/2+cell;board={x,y,cell};
    ZG.rr(ctx,x-7,y-cell-7,bw+14,cell*8+14,12);ctx.fillStyle='#20130fee';ctx.fill();ctx.strokeStyle='#c69b57';ctx.lineWidth=3;ctx.stroke();
    const labels={coin:'COIN',mult:'MULTI',dynamite:'BOMB',bag:'BAG',chest:'CHEST',dwarf:'DWARF'},icons={coin:'🪙',mult:'✦',dynamite:'🧨',bag:'💰',chest:'📦',dwarf:'⛏'},ids={coin:0,mult:1,dynamite:2,bag:3,chest:4,dwarf:5};
    const icon=(i,cx,cy,d,fallback)=>{if(atlas){const sw=atlas.width/3,sh=atlas.height/3;ctx.drawImage(atlas,i%3*sw,Math.floor(i/3)*sh,sw,sh,cx-d/2,cy-d/2,d,d);}else text(ctx,fallback,cx,cy,d*.65);};
    text(ctx,'LUCKY WAGON  ·  '+trainRemaining+' RESPINS',w/2,y-cell-13,Math.min(18,cell*.35),'#ffe5a2');
    for(let c=0;c<6;c++){const xx=x+c*cell,e=wagonEnhancers[c];tile(ctx,xx+2,y-cell+2,cell-4,cell-4,false);if(e){icon(ids[e.kind],xx+cell/2,y-cell*.60,cell*.76,icons[e.kind]);text(ctx,labels[e.kind]+(e.value?' '+e.value:''),xx+cell/2,y-cell*.13,cell*.20,'#ffe1a2',cell-3);}else text(ctx,'◆',xx+cell/2,y-cell*.5,cell*.4,'#b58b4c');}
    for(let j=0;j<36;j++){const xx=x+j%6*cell,yy=y+Math.floor(j/6)*cell,item=grid[j],rock=item?.kind==='rock';tile(ctx,xx+2,yy+2,cell-4,cell-4,hits.includes(j));if(rock){icon(6,xx+cell/2,yy+cell/2,cell*.91,'▧');}else if(item){const cy=yy+cell/2;icon(item.kind==='dwarf'?5:0,xx+cell/2,cy-cell*.06,cell*.89,'🪙');text(ctx,hooks.fmt(Math.floor(item.value*currentUnit))+' C',xx+cell/2,cy+cell*.31,cell*.24,'#fff2ba',cell-4);}else if(reelState(j).rolling)text(ctx,'✧',xx+cell/2,yy+cell/2,cell*.38,'#ffd380');}
    for(let c=0;c<6;c++){const xx=x+c*cell,cy=y+cell*6.5;tile(ctx,xx+2,y+cell*6+2,cell-4,cell-4,!!wagonOpened[c]);icon(wagonOpened[c]?8:7,xx+cell/2,cy-cell*.08,cell*.84,wagonOpened[c]?'💰':'🔒');text(ctx,wagonOpened[c]?'OPEN':'LOCK',xx+cell/2,cy+cell*.34,cell*.18,wagonOpened[c]?'#aaffbb':'#c8b49a');}
    text(ctx,'回収 '+hooks.fmt(Math.floor(wagonCollected*currentUnit))+' C  ·  '+note,w/2,y+cell*7+14,Math.min(13,cell*.24),'#ffe1a2',w-12);return;
   }
   const r=opt.region(w,h),compact=w<=640,gap=3,topPad=compact?(mode==='train'?50:mode==='gods'?11:34):(['train','gods'].includes(mode)?24:36),bottomPad=compact?(mode==='train'?25:12):24,targetCell=Math.max(8,Math.min((r.w-(compact?8:22))/cols,(r.h-topPad-bottomPad)/rows,mode==='dwarf'?170:130)),cell=expansion?expansion.cell+(targetCell-expansion.cell)*expansion.progress:targetCell,
    visibleCols=expansion?cols-1+expansion.progress:cols,bw=visibleCols*cell,bh=rows*cell,x=r.x+(r.w-bw)/2,y=r.y+Math.max(topPad,(r.h-bh)/2);
   board={x,y,cell};
   ZG.rr(ctx,x-9,y-9,bw+18,bh+18,13);ctx.fillStyle='#060815e8';ctx.fill();ctx.strokeStyle=cfg.accent;ctx.lineWidth=3;ctx.stroke();
   if(mode!=='gods')text(ctx,note,w/2,y-17,Math.min(16,w/24),cfg.accent,w-24);
   if(mode==='train'){if(trainOrder)text(ctx,trainOrder,w/2,y+bh+14,12,'#ffe19a',bw);text(ctx,'SPINS '+trainRemaining+' / '+trainReset,w*.25,y-50,Math.min(17,w/23),cfg.accent,w*.43);text(ctx,'合計 ×'+hooks.fmt(trainTotal),w*.75,y-50,Math.min(17,w/23),cfg.accent,w*.43);}

   for(let j=0;j<cols*rows;j++){
    if(expansion&&j%cols===cols-1&&expansion.progress<.98)continue;
    const xx=x+j%cols*cell,yy=y+Math.floor(j/cols)*cell;
    ZG.rr(ctx,xx+gap/2,yy+gap/2,cell-gap,cell-gap,8);ctx.fillStyle=cfg.panel;ctx.fill();tile(ctx,xx+gap/2,yy+gap/2,cell-gap,cell-gap,hits.includes(j));if(j===trainSource){ctx.strokeStyle='#54e8ff';ctx.lineWidth=3;ctx.stroke();}
    const m=reelState(j),spinning=m.rolling;
    const spinIndex=(Math.floor(st.t/75)+j)%(mode==='dwarf'?9:6);
    const item=spinning?(mode==='dwarf'&&spinIndex===8?'S':'s'+spinIndex):grid[j];if(!item)continue;
    const id=typeof item==='string'?item:item.id;
    const k=id[0]==='s'?+id.slice(1):id[0]==='W'?6:id[0]==='B'?(mode==='gods'?10:8):mode==='dwarf'?11:mode==='gods'?9:7;
    const d=cell*.99,cy=yy+cell/2+(spinning?((st.t%75)/75-.5)*cell*.85:m.shift*cell)-(mode==='gods'?(fall.dist[j]||0)*cell*fall.v:0),cx=xx+cell/2;
    ctx.save();ctx.beginPath();if(mode==='gods'&&fall.v>0)ctx.rect(x,y,bw,bh);else ctx.rect(xx,yy,cell,cell);ctx.clip();
    if(mode==='dwarf'&&id==='S'){if(battleArt)ctx.drawImage(battleArt,cx-d/2,cy-d/2,d,d);else text(ctx,'VS',cx,cy,d*.42,'#ffe29e');ctx.restore();continue;}
    if(mode==='dwarf'&&!spinning&&spinChestValues.has(j)){const value=spinChestValues.get(j),state=chestReveals.get(j);if(!state?.active){drawSpinChest(ctx,value,state?7:0,cx,cy,d);if(state)drawChestNumber(ctx,value,cx,cy+d*.12,d);}ctx.restore();continue;}
    if(mode==='gods'&&id.startsWith('B'))ZG.emblemTrail(ctx,mode,Number(id.slice(1)),cx,cy,d,Math.max(fall.v&&fall.dist[j]?fall.v:0,Math.abs(m.shift)));
    if(mode==='train'&&typeof item==='object'&&!offset.locked?.has(j))ZG.emblemTrail(ctx,mode,item.value,cx,cy,d,Math.abs(m.shift));
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
  const routineTime=ms=>st.speed>=1?Math.round(ms*.58):ms;
  function reset(){cols=cfg.cols;rows=cfg.rows;hits=[];note=cfg.title;trainTotal=0;trainRemaining=trainReset=3;trainSource=null;wagonEnhancers=[];wagonOpened=[];wagonCollected=0;godsMult=0;godsTumble='0 C';fall={v:0,dist:[]};dogHeights=[4,4,4,4,4,4];dogVisualHeights=Array.from({length:6},()=>({heightSlots:4}));dogWays=4096;dogPay=0;dogPrepared=false;grid=Array.from({length:cols*rows},(_,i)=>mode==='train'?(i>=12?{id:'s2',kind:'rock',value:0}:null):'s'+(i%(mode==='dogs'?6:9)));}
  async function reveal(title,subtitle,color=cfg.accent){
   if(mode==='dwarf'&&title==='宝箱ラッシュ'){chestReveals.clear();spinChestValues.clear();}
   ZG.sfx?.play('free');st.flash(color,.15);st.impact(st.w/2,st.h/2,Math.min(st.w*.32,145),color,2);await st.banner([title,subtitle],{rainbow:false});
  }
  const itemData=key=>(window.DWARF_ITEMS||[]).find(x=>x.key===key);
  const itemImage=item=>'<i class="dwarf-item-art" style="--ix:'+((item.icon%4)*100/3)+'%;--iy:'+(Math.floor(item.icon/4)*100/3)+'%"></i>';
  async function itemActivation(key){
   const item=itemData(key);if(!item)return;
   const el=document.createElement('div');el.className='dwarf-activation tier-'+item.rarity;el.innerHTML=itemImage(item)+'<div><b>'+item.name+' 発動</b><small>'+item.description+'</small></div>';canvas.parentElement.append(el);
   ZG.sfx?.play('sparkle');try{await st.wait(580);}finally{el.remove();}
  }
  async function rewardReel(reward){
   if(!reward?.pool?.length||reward.pool[reward.selected]?.key!==reward.key)throw Error('報酬抽選データが一致しません');
   const el=document.createElement('div');el.className='dwarf-reward-layer';el.innerHTML='<section class="dwarf-reward-card"><small>VICTORY REWARD</small><h2>宝箱アイテム抽選</h2><div class="dwarf-reward-window"></div><strong class="dwarf-reward-stars"></strong><b class="dwarf-reward-name">抽選中…</b><p class="dwarf-reward-desc">冒険を強化するアイテムを獲得</p></section>';canvas.parentElement.append(el);
   const card=el.querySelector('section'),slot=el.querySelector('.dwarf-reward-window');
   function draw(item){slot.innerHTML=itemImage(item);}
   try{
    ZG.sfx?.play('chest');await st.wait(250);
    const pool=reward.pool;
    for(let k=0;k<14;k++){draw(pool[k%pool.length]);ZG.sfx?.play('land',k%5);await st.wait(55+k*6);}
    draw(reward);card.classList.add('locked','tier-'+reward.rarity);el.querySelector('.dwarf-reward-stars').textContent='★'.repeat(reward.rarity);el.querySelector('.dwarf-reward-name').textContent=reward.name;el.querySelector('.dwarf-reward-desc').textContent=reward.description;
    ZG.sfx?.play('rouletteLock');st.flash(reward.rarity>=4?'#ffd678':'#91e1b9',.12);await st.wait(reward.rarity>=4?1400:900);
   }finally{el.remove();}
  }
  async function battleTrigger(forced){
   const slots=grid.flatMap((id,j)=>id==='S'?[j]:[]);
   for(const j of slots){const p=cellPoint(j);if(p)st.impact(p.x,p.y,Math.min(board?.cell||100,115)*.65,'#ffe09c',1.2);}
   await st.wait(270);await st.banner(['BATTLE',forced?'残り0G · 最終挑戦':'バトルシンボル成立'],{hold:450});
  }
  async function attackRoulette(action,monster){
   const panel=document.createElement('div');panel.className='attack-roulette dual-stage';const r=opt.region(st.w,st.h);panel.style.top=(r.y+r.h*.55)+'px';panel.style.maxHeight=Math.max(64,r.h*.43)+'px';
   canvas.parentElement.append(panel);
   async function roll(title,options,selected,rounds){
    panel.innerHTML='<strong>'+title+'</strong><div style="--choice-count:'+options.length+'">'+options.map(o=>'<span class="'+o.className+'"><b>'+o.label+'</b>'+(o.sub?'<small>'+o.sub+'</small>':'')+'</span>').join('')+'</div>';
    const cells=[...panel.querySelectorAll('span')],steps=rounds*options.length+selected;
    for(let i=0;i<=steps;i++){if(st.dead||st.skip)break;for(const c of cells)c.classList.remove('active');cells[i%cells.length].classList.add('active');if(st.speed>=.45||i>=steps-2)ZG.sfx?.play('rouletteTick');await st.wait(45+Math.max(0,i-steps+4)*23);}
    for(const c of cells)c.classList.remove('active');cells[selected].classList.add('active','chosen');ZG.sfx?.play('rouletteLock');await st.wait(420);
   }
   try{
    const hero=action.attacker==='hero',enemy=foeNames[monster];
    await roll('STEP 1 · 攻撃者抽選',[{label:'ドワーフ',className:'attack'},{label:enemy,className:'damage'}],hero?0:1,4);
    await roll('STEP 2 · '+(hero?'ドワーフ':enemy)+'のダメージ',[1,2,3,4,5].map(n=>({label:n,sub:'ダメージ',className:(hero?'attack':'damage')+' dmg-'+n})),action.damage-1,2);
   }finally{panel.remove();}
  }
  async function battleMotion(actor,target,damage,hit,hero){
   const home=actor.x,ay=actor.y,tx=target.x,ty=target.y,dir=Math.sign(tx-home),color=hero?'#ffe49a':'#ff977b',gap=Math.min(Math.abs(tx-home)*.24,36);
   const tween=(x,y,motion,ms,sy=1,sx=1)=>st.tween(actor,{x,y,motion,sy,sx},ms,ZG.Ease.outCubic);
   actor.pose=1;actor.motion=0;
   if(damage===1){await tween(home-dir*5,ay,2,90);await tween(tx-dir*gap,ay,7,160);st.impact(tx,ty,29,color,.65);}
   else if(damage===2){await tween(tx-dir*gap,ay,6,175);st.impact(tx,ty,32,color,.75);await tween(tx-dir*(gap+20),ay,3,100);await tween(tx-dir*gap,ay,8,135);st.impact(tx,ty,41,color,1);}
   else if(damage===3){await tween(home-dir*12,ay+5,3,140,.9);await tween((home+tx)/2,ay-48,5,200);await tween(tx-dir*gap,ay,8,170);st.impact(tx,ty,54,color,1.25);st.shake(3,130);}
   else if(damage===4){await tween(home-dir*20,ay,3,260,.87,1.08);st.sparkle(home,ay,35,10);st.beam(home,ay,tx,ty,color);await tween(tx-dir*gap,ay,9,180,1.08,1.08);st.impact(tx,ty,78,color,1.65);st.shake(5,200);}
   else{await tween(home-dir*22,ay+8,3,290,.85,1.14);st.sparkle(home,ay,55,18);st.flash(color,.10);await tween((home+tx)/2,ay-58,5,230);st.beam(actor.x,actor.y,tx,ty,color);await tween(tx-dir*gap,ay,9,150,1.12,1.12);st.impact(tx,ty,108,color,2.2);st.shake(7,250);st.flash(color,.14);}
   hit();actor.motion=9;
   const recoil=damage===1?5:damage===2?8:damage===3?12:damage===4?16:20;
   await Promise.all([tween(home,ay,13,damage>=4?300:230),st.tween(target,{x:tx+dir*recoil,motion:12},130,ZG.Ease.outCubic).then(()=>st.tween(target,{x:tx,motion:target.pose===3?15:13},170,ZG.Ease.outCubic))]);
   actor.pose=0;actor.motion=0;actor.sx=actor.sy=1;if(target.pose!==3){target.pose=0;target.motion=0;}
  }
  async function tickets(values){
   if(!values?.length)return;
   const panel=document.createElement('div');panel.className='feature-tickets';panel.innerHTML='<strong>FREE SPIN REVEAL</strong><div>'+values.map(()=>'<span>?</span>').join('')+'</div><b>0 SPINS</b>';canvas.parentElement.append(panel);
   let sum=0;try{for(const [i,v] of values.entries()){await st.wait(240);const card=panel.querySelectorAll('span')[i];card.textContent='+'+v;card.classList.add('revealed');sum+=v;panel.querySelector('b').textContent=sum+' SPINS';ZG.sfx?.play('land',i%5);}await st.wait(650);}finally{panel.remove();}
  }
  async function show(g,h=[],locked=[],routine=false){
   chestReveals.clear();
   offset.locked=new Set(mode==='dogs'?grid.flatMap((item,j)=>typeof item==='string'&&item.startsWith('W')&&item===g[j]?[j]:[]):mode==='train'&&rows===3?g.flatMap((item,j)=>item&&typeof item==='object'&&grid[j]?.id===item.id&&grid[j]?.value===item.value?[j]:[]):[]);
   for(const j of locked)offset.locked.add(j);
   grid=g;hits=[];const base=routine?700:mode==='train'?320:530,stagger=routine?(ZG.SPIN_TIMING.reel-base)/Math.max(1,cols-1):mode==='train'?75:145;await reelSpin(base,stagger);hits=h;highlight(h);
  }
  function cellPoint(j){if(!Number.isInteger(j))return null;if(mode==='dogs')return dogPositions[j];if(!board)return null;return {x:board.x+(j%cols+.5)*board.cell,y:board.y+(Math.floor(j/cols)+.5)*board.cell};}
  function highlight(h){for(const j of h||[]){const p=cellPoint(j);if(p)st.impact(p.x,p.y,Math.min(32,board?.cell*.37||23),cfg.accent,.38);}}
  async function reelSpin(base,stagger){offset.v=1;offset.reels=Array.from({length:cols},()=>({v:0}));ZG.sfx?.play('spin');await Promise.all(offset.reels.map((r,c)=>st.tween(r,{v:1},base+c*stagger,ZG.Ease.linear).then(()=>{if(mode==='dogs')dogWays*=dogHeights[c];const p=cellPoint(c);if(p)st.landing(p.x,p.y,20,cfg.accent);for(let j=c;j<grid.length;j+=cols){if(offset.locked?.has(j))continue;const item=grid[j],value=mode==='train'&&item&&typeof item==='object'?item.value:typeof item==='string'&&((mode==='gods'&&item.startsWith('B'))||(mode==='dogs'&&item.startsWith('W')))?Number(item.slice(1)):null;const q=cellPoint(j);if(q&&value!==null)st.emblemLand(mode,value,q.x,q.y,board?.cell||Math.min(st.w/6,45));}ZG.sfx?.play('land',c);})));offset.v=0;}
  async function showDogs(sp,routine=false){dogHeights=sp.heights;dogWays=1;dogPay=0;const locked=sp.mode==='sticky'?grid.flatMap((v,j)=>v?.startsWith('W')&&v===sp.grid[j]?[j]:[]):[];offset.locked=new Set(locked);grid=sp.grid;hits=[];const base=routine?700:430,stagger=routine?(ZG.SPIN_TIMING.reel-base)/5:135;await Promise.all([reelSpin(base,stagger),...dogVisualHeights.map((v,c)=>st.tween(v,{heightSlots:dogHeights[c]},base*.9,ZG.Ease.inOutCubic,c*stagger*.55))]);dogWays=sp.ways;const freshWilds=[];
   hooks.onFeatureMetric?.(sp.mode==='sticky'?'固定 WILD · WAYS':'降下 WILD · WAYS',hooks.fmt(dogWays));
   for(const [j,v] of grid.entries())if(v?.startsWith('W')&&!offset.locked.has(j)){
    freshWilds.push(v);const p=cellPoint(j);if(p){st.burst(p.x,p.y+12,{n:8,colors:['#ddb786','#fff0c3'],speed:2,life:280});const img=st.scenes?.reaction;if(img){const pup=st.add({x:p.x-16,y:p.y-22,z:31});pup.draw=ctx=>ctx.drawImage(img,0,0,img.width/4,img.height,-17,-17,34,34);try{await st.tween(pup,p,220,ZG.Ease.outCubic);}finally{st.remove(pup);}}st.impact(p.x,p.y,29,'#ffe295',.72);}
   }
   if(freshWilds.some(v=>Number(v.slice(1))>=3))await st.featureCue(sp.mode==='sticky'?'STICKY WILD · 固定':'RAINING WILD',freshWilds.length+'個出現 · '+freshWilds.map(v=>'×'+v.slice(1)).join(' / '),{color:'#ffe3a0',hold:250,sound:'wild'});hits=sp.hits||[];highlight(hits);}
  async function prepareDogs(entry){reset();hooks.onMode?.('ENTRY');note='BONUS TRIGGER';await showDogs({...entry,hits:entry.grid.flatMap((s,j)=>s==='S'?[j]:[])});await reveal('BONUS ACTIVE',entry.scatters+' SCATTERS');dogPrepared=true;return await new Promise(resolve=>{const panel=document.createElement('div');panel.className='dog-choice';panel.innerHTML='<strong>CHOOSE YOUR BONUS</strong><button data-mode="sticky"><b>STICKY WILDS</b><span>'+entry.choices.sticky+' FREE SPINS</span><small>荒さ ★★★★☆ · 4/5</small><small>固定ワイルドが最後まで残る</small></button><button data-mode="raining"><b>RAINING WILDS</b><span>'+entry.choices.raining+' FREE SPINS</span><small>荒さ ★★★★★ · 5/5</small><small>各スピン最大6個のワイルド</small></button>';canvas.parentElement.append(panel);let timer;const done=v=>{clearInterval(timer);panel.remove();resolve(v)};panel.querySelectorAll('button').forEach(b=>b.onclick=()=>done(b.dataset.mode));timer=setInterval(()=>{if(st.dead||!panel.isConnected)done(null)},100);});}
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
  async function monsterArrival(monster,hp,reward){
   const row={Goblin:0,Troll:1,Dragon:2}[monster],region=opt.region(st.w,st.h),size=Math.min(st.w*.94,region.h*.92,430);
   const n=st.add({x:st.w/2,y:region.y+region.h*.5,z:60,frame:0});
   n.draw=(ctx,s)=>{const image=arrivalAlt||arrivalArt;if(image){const sw=image.width/6,sh=image.height/3,col=Math.min(5,Math.floor(s.frame));ctx.drawImage(image,col*sw,row*sh,sw,sh,-size/2,-size/2,size,size);}ctx.fillStyle='#090c0be9';ZG.rr(ctx,-size/2,-size/2,size,45,8);ctx.fill();text(ctx,foeNames[monster]+' 出現',0,-size/2+22,23,'#ffe6a1',size-20);ctx.fillStyle='#090c0be9';ZG.rr(ctx,-size/2,size/2-46,size,46,8);ctx.fill();text(ctx,'HP '+hp+' · 勝利で ＋'+reward+' スピン',0,size/2-23,15,'#fff5d7',size-16);};
   try{ZG.sfx?.play('enemyArrival');await st.tween(n,{frame:5.99},1600,ZG.Ease.linear);await st.wait(450);}finally{st.remove(n);}
  }
  function drawCombat(ctx,row,frame,size){
   if(!combatAlt)return false;
   const i=Math.max(0,Math.min(7,Math.floor(frame/2))),sw=combatAlt.width/8,sh=combatAlt.height/4;ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(combatAlt,i*sw,row*sh,sw,sh,-size/2,-size/2,size,size);ctx.restore();return true;
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
   const labels={'NEW COINS':'コイン着地・回数リセット',COIN:'コイン値を追加',MULT:'倍率アップ',DYNAMITE:'岩を爆破',BAG:'列のコインを合体',CHEST:'列のコインを回収',DWARF:'ドワーフ登場','DWARF COLLECT':'全盤面を回収','COLLECT CHEST':'宝箱が回収','FINAL CHEST':'宝箱の最終3回分'};
   for(const [index,ev] of (events||[]).entries()){
    trainOrder=(index+1)+' / '+events.length+'　'+ev.name;wagonEnhancers=ev.enhancers||wagonEnhancers;wagonOpened=ev.opened||wagonOpened;wagonCollected=ev.collected??wagonCollected;
    if(ev.name==='NEW CART'){await attachCart();expansion={progress:0,cell:board?.cell||24};await st.featureCue('NEW CART','貨車 +1 列',{color:'#ffce83',hold:380,sound:'whistle'});}
    const activation=cellPoint(ev.source);
    if(activation&&ev.name!=='NEW CART'){const color=({PAYER:'#70ffd4',SNIPER:'#ff7878',REVIVE:'#c792ff',COLLECTOR:'#ffd682'})[ev.name]||'#ffe3ab';st.impact(activation.x,activation.y,board.cell*.58,color,1);if(ev.name!=='NEW COINS')await st.featureCue(ev.name,labels[ev.name]||ev.name,{color,hold:240,sound:'crystal'});}
    if(ev.name==='COLLECTOR')await collectCoins(ev);
    if((ev.remaining??0)>trainRemaining)await st.carry(activation||{x:st.w/2,y:board.y}, {x:st.w*.25,y:board.y-50},'+'+(ev.remaining-trainRemaining),'#ffe191',18);
    cols=ev.cols;rows=ev.rows;trainSource=ev.source??null;trainTotal=ev.totalMultiple??trainTotal;trainRemaining=ev.remaining??trainRemaining;trainReset=ev.resetValue??trainReset;hooks.onRemaining?.(trainRemaining);
    hooks.onFeatureMetric?.('獲得見込',hooks.fmt(Math.floor(trainTotal*currentUnit))+' C');
    note=(labels[ev.name]||ev.name)+(ev.amount!=null&&ev.name!=='RESET PLUS'?' '+(ev.name==='SNIPER'?'×':'+')+hooks.fmt(ev.amount):'');
    if(ev.name==='NEW COINS')await show(ev.grid,ev.hits);
    else if(ev.name==='NEW CART'){grid=ev.grid;hits=[];try{await st.tween(expansion,{progress:1},420,ZG.Ease.outCubic);highlight([cols-1,cols*2-1,cols*3-1]);await st.wait(160);}finally{expansion=null;}}
    else {grid=ev.grid;hits=ev.hits||[];ZG.sfx?.play('sparkle');const source=cellPoint(ev.source);for(const j of hits){const p=cellPoint(j);if(p&&source&&j!==ev.source)st.beam(source.x,source.y,p.x,p.y,'#ffd07a');}highlight(hits);await st.wait(240);}
   }trainSource=null;trainOrder='';
  }
  async function playGodsTumble(step,score){
   for(const group of step.groups){
    const cells=group.cells.map(cellPoint).filter(Boolean);
    for(let i=1;i<cells.length;i++)st.beam(cells[i-1].x,cells[i-1].y,cells[i].x,cells[i].y,'#b9afff');
   }
   hits=step.hits;ZG.sfx?.play('win');highlight(hits);await st.wait(routineTime(350));
   hooks.onTumble?.(step.groups);
   const texts=[st.popText(board.x+board.cell*3,board.y+board.cell*2.5,'+'+hooks.fmt(step.groups.reduce((sum,g)=>sum+g.pay,0))+' C',{size:Math.min(24,board.cell*.46),hold:160,maxWidth:board.cell*5})];
   godsTumble=hooks.fmt(step.tumbleTotal*currentUnit)+' C';hooks.onSpinWin?.(step.credited);hooks.onScore(score+step.credited);
   const removed=new Set(hits),dist=Array(30).fill(0);
   for(const j of hits){const p=cellPoint(j);if(p)st.burst(p.x,p.y,{n:8,colors:['#d6baff','#ffe5a0','#fff'],speed:3,life:420,shape:'star',size:3});}grid=grid.map((v,j)=>removed.has(j)?null:v);await st.wait(routineTime(200));
   for(let c=0;c<6;c++){const keep=[];for(let row=0;row<5;row++)if(grid[row*6+c]!=null)keep.push(row);const fresh=5-keep.length;for(let j=0;j<fresh;j++)dist[j*6+c]=fresh;keep.forEach((row,i)=>{dist[(fresh+i)*6+c]=fresh+i-row;});}
   grid=step.grid;hits=[];fall.dist=dist;fall.v=1;await st.tween(fall,{v:0},routineTime(520),ZG.Ease.landing);for(let j=0;j<grid.length;j++){const v=grid[j],p=cellPoint(j);if(dist[j]>0&&p&&typeof v==='string'&&v.startsWith('B'))st.emblemLand('gods',Number(v.slice(1)),p.x,p.y,board.cell);}ZG.sfx?.play('land');await Promise.all(texts);
  }
  let currentUnit=1;
  async function godsOrbs(sp){
   if(!sp.orbs?.length)return;
   if(sp.orbs.some(b=>b.mult>=50)){await st.transition('cast');await st.featureCue('DIVINE POWER','高倍率オーブ出現',{color:'#d3baff',hold:400,sound:'featureWin'});}
   await st.atNormalSpeed(async()=>{for(const b of sp.orbs){const p=board;if(!p)continue;const orb=st.add({x:p.x+(b.pos%6+.5)*p.cell,y:p.y+(Math.floor(b.pos/6)+.5)*p.cell,z:50,glow:12,glowColor:'#a7d5ff'});orb.draw=(ctx,n)=>{const d=p.cell*.9;if(drawPlate(ctx,b.mult,0,0,d))return;if(atlas)ctx.drawImage(atlas,2*atlas.width/4,2*atlas.height/3,atlas.width/4,atlas.height/3,-d/2,-d/2,d,d);text(ctx,'×'+b.mult,0,0,Math.max(13,d*.3),'#fff');};grid[b.pos]=null;st.beam(st.w*.82,p.y-p.cell*.6,orb.x,orb.y,'#e9d8ff');const seal=st.add({x:orb.x,y:orb.y,z:51,rot:0,alpha:1});seal.draw=ctx=>{ctx.strokeStyle='#ffe3a3';ctx.lineWidth=2;ctx.strokeRect(-p.cell*.33,-p.cell*.33,p.cell*.66,p.cell*.66);};try{await st.tween(seal,{rot:.8,sx:1.4,sy:1.4,alpha:0},170);}finally{st.remove(seal);}ZG.sfx?.play('mult');st.beam(orb.x,orb.y,st.w/2,p.y-50,'#bbddff');st.impact(orb.x,orb.y,p.cell*.65,'#adcbff',.9);await st.tween(orb,{x:st.w/2,y:p.y-50,sx:.75,sy:.75},450,ZG.Ease.inOutCubic);st.impact(orb.x,orb.y,p.cell*.85,'#ffe8a1',1.3);st.remove(orb);godsMult+=b.mult;ZG.sfx?.play('crystal');await st.popText(st.w/2,p.y-50,'累積 ×'+godsMult,{size:Math.min(23,st.w*.065),color:'#e5caff',hold:220});}
   hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(godsMult));godsTumble=hooks.fmt(sp.tumbleRaw*currentUnit)+' C × '+sp.mult;await st.wait(320);godsTumble=hooks.fmt(sp.win)+' C';await st.wait(350);});
  }
  async function trainEntry(entry){
   cols=6;rows=6;note='LUCKY WAGON';wagonEnhancers=[];wagonOpened=[];wagonCollected=0;grid=entry.grid;await st.atNormalSpeed(()=>st.banner(['LUCKY WAGON','岩を爆破して宝箱を開けよう'],{rainbow:false}));
   await hooks.onBonusIntro?.({spins:3});
   note='鉱山へ移動';await st.banner(['LUCKY WAGON','3 RESPINS'],{});cols=6;rows=6;
   grid=entry.grid;trainTotal=grid.reduce((s,t)=>s+(t?.value||0),0);hits=[];await st.wait(300);await trainEvents(entry.events);
  }
  return {st,idle:reset,prepareDogs,async warm(cb){if(mode==='dwarf'){[arena,escapeArt,upgradeArt,arrivalArt,arrivalAlt,combatArt,combatAlt]=await Promise.all(['arena','escape','upgrade-reel-v1','arrival-v3','arrival-v4','combat-v3','combat-v4'].map(n=>im('./assets/anime/dwarf/'+n+'.webp')));[spinChestArt,battleArt]=await Promise.all([Promise.all(chestTypes.map(n=>im('./assets/anime/dwarf/chest118-'+n+'.webp'))),im('./assets/anime/dwarf/battle124.webp')]);}await Promise.all(({dwarf:['gate','knockout'],gods:['gate','cast'],dogs:[],train:[]})[mode].map(name=>st.loadScene(name)));[bg,atlas,actions,plates,kennels,monsters,trophies,blanks,glyphs]=await Promise.all([im('./assets/anime/'+mode+'/bg.webp'),mode==='train'?im('./assets/anime/train/wagon-atlas.webp'):ZG.loadSymbolAtlas(mode),['train','dwarf'].includes(mode)?im('./assets/anime/'+mode+'/actions.webp'):null,['train','gods'].includes(mode)?im('./assets/anime/'+mode+'/multipliers.webp'):null,mode==='dogs'?im('./assets/anime/dogs/kennels.webp'):null,...['monsters','trophies'].map(name=>mode==='dwarf'?im('./assets/anime/dwarf/'+name+'.webp'):null),...['blanks','glyphs'].map(name=>mode==='train'?im('./assets/anime/train/'+name+'.webp'):null)]);cb?.(1)},async play(r){
   if(mode==='dogs'){if(!dogPrepared){reset();await showDogs(r.entry);await reveal('BONUS ACTIVE',r.entry.initialSpins+' FREE SPINS');}dogPrepared=false;currentUnit=r.unit||1;let score=0;hooks.onSpin(0,r.entry.initialSpins);await hooks.onBonusIntro?.({spins:r.entry.initialSpins,choice:r.entry.mode});hooks.onMode?.('BONUS');let i=0;for await(const sp of r.spinStream()){note=sp.note;hooks.onSpin(i+1,sp.total);await showDogs(sp,true);dogPay=sp.win;if(sp.win){ZG.sfx?.play('win');for(const g of sp.groups){const p=dogPositions[g.cells[0]];for(const j of g.cells){const q=cellPoint(j);if(q)st.impact(q.x,q.y,Math.min(18,st.w*.035),'#ffe295',.35);}if(p)await st.popText(p.x,p.y,g.ways+' WAYS · +'+hooks.fmt(g.value*currentUnit),{size:Math.min(20,st.w*.05),hold:220});}await st.wait(280);}hooks.onSpinWin?.(sp.win);score+=sp.win;hooks.onScore(score);await st.celebrateWin(sp.win,r.rate||opt.getRate?.(),hooks.fmt);await st.roundPause();i++;}if(r.guarantee)await st.banner(['最終配当','1 C'],{hold:350});if(r.capped)await st.banner(['MAX WIN',hooks.fmt(r.score)+' C'],{});hooks.onScore(r.score);note='FREE SPINS COMPLETED';hooks.onMode?.('COMPLETE');return;}
   reset();currentUnit=r.unit||1;let score=0;hooks.onMode?.('ENTRY');hooks.onSpin(0,r.entry?.initialSpins??10);if(mode==='train'&&r.entry)await trainEntry(r.entry);else if(r.entry){await show(r.entry.grid);hits=r.entry.grid.map((s,i)=>s==='S'?i:-1).filter(i=>i>=0);await st.wait(300);if(r.entry.tickets)await tickets(r.entry.tickets);if(mode==='gods'){score=r.entry.win;godsTumble=hooks.fmt(score)+' C';hooks.onScore(score);}await reveal(cfg.title,r.entry.initialSpins+' FREE SPINS');await hooks.onBonusIntro?.({spins:r.entry.initialSpins});}else if(mode==='dwarf'){hooks.onSpin(0,10);await reveal('宝箱ラッシュ','10フリースピン');currentUnit=r.unit;hooks.onBaseUnit?.(currentUnit);hooks.onDwarfInventory?.(r.inventory);await hooks.onBonusIntro?.({spins:10});}else {await reveal(cfg.title,'BONUS START');await hooks.onBonusIntro?.({spins:10});}hooks.onMode?.('BONUS');
   let i=0;for await(const sp of r.spinStream()){cols=sp.cols;rows=sp.rows;note=sp.battle?'バトル':sp.note;if(mode==='dwarf')hooks.onSpin(sp.freePlayed,Math.max(sp.freePlayed,sp.freePlayed+sp.remaining-(sp.battle?(sp.awarded||0)+(sp.extra||0):0)));else if(mode==='train')hooks.onSpin(i+1,i+1+Math.max(0,trainRemaining-1));else hooks.onSpin(i+1,Math.max(i+1,(sp.total||r.played)-(sp.add||0)));
    if(mode==='train'){
     cols=sp.landingCols;rows=6;wagonEnhancers=sp.enhancers;note='空きマスをリスピン';trainRemaining=Math.max(0,trainRemaining-1);
     ZG.sfx?.play('rails',trainRemaining<=1);
     if(!sp.events?.some(e=>e.name==='NEW COINS'))await show(sp.landing,[]);
     await trainEvents(sp.events);cols=sp.cols;grid=sp.grid;trainTotal=sp.totalMultiple;trainRemaining=sp.remaining;trainReset=sp.resetValue;wagonOpened=sp.opened;wagonCollected=sp.collected;note=sp.note;hooks.onSpin(i+1,i+1+sp.remaining);hooks.onFeatureMetric?.('獲得見込',hooks.fmt(Math.min((r.rate||opt.getRate?.())*200,Math.floor(trainTotal*currentUnit)))+' C');
     hooks.onSpinWin?.(sp.win);score+=sp.win;hooks.onScore(score);await st.celebrateWin(sp.win,r.rate||opt.getRate?.(),hooks.fmt);await st.roundPause();continue;
    }
    else if(!sp.battle){if(mode==='dwarf'){for(const key of sp.activated||[])await itemActivation(key);hooks.onDwarfInventory?.(sp.inventory);}if(mode==='gods'){godsTumble='0 C';godsMult=sp.previousMult;hooks.onFeatureMetric?.('累積倍率','×'+hooks.fmt(godsMult));}spinChestValues.clear();for(const chest of sp.chests||[])spinChestValues.set(chest.pos,chest.value);await show(sp.grid,sp.hits||[],[],true);}
    if(sp.battle){
     hooks.onFeatureMetric?.('バトル','対 '+foeNames[sp.monster]);
     await st.transition('gate');for(const key of sp.activated||[])if(key!=='pickaxe')await itemActivation(key);
     await monsterArrival(sp.monster,sp.monsterHP,sp.baseReward);
     duel={monster:sp.monster,hp:sp.heroMax,heroMax:sp.heroMax,enemyHP:sp.monsterHP,max:sp.monsterHP};
     const fighter=(id,x,flip)=>{const region=opt.region(st.w,st.h),d=Math.min(165,st.w*.40,Math.max(36,region.h*.25)),n=st.add({x,y:region.y+Math.max(52+d/2,region.h*.34),z:25,motion:0});n.draw=(ctx)=>{if(drawCombat(ctx,flip===1?0:({Goblin:1,Troll:2,Dragon:3}[sp.monster]),n.motion||0,d))return;if(flip!==1&&sp.monster!=='Goblin'&&monsters){
       const sw=monsters.width/4,sh=monsters.height/2;
       ctx.drawImage(monsters,(n.pose||0)*sw,sp.monster==='Dragon'?sh:0,sw,sh,-d/2,-d/2,d,d);return;
      }if(actions&&(flip===1||sp.monster==='Goblin'||sp.monster==='Troll')){drawPose(ctx,flip===1?0:sp.monster==='Goblin'?1:2,n.pose||0,d);return;}ctx.scale(flip,1);if(atlas){const aw=atlas.width/4,ah=atlas.height/3;ctx.drawImage(atlas,id%4*aw,Math.floor(id/4)*ah,aw,ah,-d/2,-d/2,d,d);}else text(ctx,cfg.fallback[id],0,0,d*.65);};return n;};
     const hero=fighter(0,st.w*.25,1),enemy=fighter(Number(sp.grid[2].slice(1)),st.w*.75,-1);
     let hp=sp.heroMax,enemyHP=sp.monsterHP;
     try{for(const action of sp.actions||[]){await attackRoulette(action,sp.monster);for(const key of action.activated||[])await itemActivation(key);const attack=action.attacker==='hero',actor=attack?hero:enemy,target=attack?enemy:hero;note=(attack?'ATTACK ':'DAMAGE ')+action.damage;const damage=attack?enemyHP-action.enemyHP:hp-action.heroHP;
      await battleMotion(actor,target,action.damage,()=>{duel.hp=action.heroHP;duel.enemyHP=action.enemyHP;st.popText(target.x,target.y-25,damage===0?'BLOCK':'−'+damage+' HP',{size:Math.min(30,17+action.damage*2),hold:380});target.pose=damage===0?0:(attack?action.enemyHP:action.heroHP)<=0?3:2;target.motion=damage===0?0:10;ZG.sfx?.play(attack?'attack':'damage');},attack);
      hp=action.heroHP;enemyHP=action.enemyHP;await st.wait(150);
     }}finally{st.remove(hero);st.remove(enemy);}
     if(sp.revived)await itemActivation('revive');if(sp.won){ZG.sfx?.play('featureWin');await st.transition('knockout');await st.wait(240);}else{ZG.sfx?.play('damage');await st.wait(300);}
     await reveal(sp.won?'勝利！':'敗北',sp.won?'フリースピン ＋'+sp.awarded+'回':(sp.remaining?'追加なし · 残り '+sp.remaining+' 回':'追加なし · ラッシュ終了'));
     hooks.onFeatureMetric?.('バトル結果',sp.won?'勝利 ＋'+sp.awarded+'回':'敗北');if(sp.awarded)await st.carry({x:st.w*.5,y:st.h*.45},st.anchor('#rSpin',{x:st.w*.85,y:st.h*.84}),'＋'+sp.awarded+'回','#ffe9a2',26);hooks.onSpin(sp.freePlayed,sp.freePlayed+sp.remaining);duel=null;if(sp.won){await rewardReel(sp.reward);currentUnit=sp.nextUnit;hooks.onBaseUnit?.(currentUnit);if(sp.extra)await reveal('＋'+sp.extra+' FREE SPINS',sp.reward.name);}hooks.onDwarfInventory?.(sp.inventory);await st.transition('gate','',true);note=sp.note;
    }
    for(const chest of sp.chests||[]){hits=[chest.pos];const p=cellPoint(chest.pos);if(p&&chest.value){
      const state={active:true},tier=chestTier(chest.value),color=chestColors[tier];chestReveals.set(chest.pos,state);
      const trophy=st.add({...p,z:33,sx:1,sy:1,frame:0,reveal:0});
      trophy.draw=(ctx)=>{const d=board.cell;drawSpinChest(ctx,chest.value,trophy.frame,0,0,d);if(trophy.reveal>0)drawChestNumber(ctx,chest.value,0,d*.12,d,trophy.reveal);};
      try{await st.tween(trophy,{sx:1+Math.min(.15,tier*.04),sy:1+Math.min(.15,tier*.04),frame:7.99},400+tier*100,ZG.Ease.linear);ZG.sfx?.play('sparkle');st.impact(p.x,p.y,board.cell*(.55+tier*.07),color,1+tier*.2);st.sparkle(p.x,p.y,board.cell*.35,8+tier*4);await st.tween(trophy,{reveal:1,sx:1,sy:1},180,ZG.Ease.outCubic);await st.wait(200+tier*75);}finally{st.remove(trophy);state.active=false;}
     }await st.popText(p?.x??st.w/2,p?.y??st.h*.46,chest.add?'+'+chest.add+' FREE SPINS':mode==='dwarf'?hooks.fmt(chest.win??Math.round(chest.value*currentUnit))+' C':'×'+chest.value,{size:Math.min(24,st.w*.065),hold:280});}
    if(mode==='gods'){for(const step of sp.steps||[])await playGodsTumble(step,score);await godsOrbs(sp);if(sp.scatterRaw){hits=grid.flatMap((v,j)=>v==='S'?[j]:[]);await st.popText(st.w/2,st.h*.46,'SCATTER +'+hooks.fmt(sp.scatterRaw*currentUnit),{size:Math.min(30,st.w*.07),hold:300});}godsTumble=hooks.fmt(sp.win)+' C';}
    if(sp.add&&mode==='gods')await st.featureCue('追加スピン','＋'+sp.add+' 回',{hold:350,color:'#ffe6a0'});
    else if(sp.add)await reveal('+'+sp.add+' FREE SPINS','追加フリースピン');
    if(sp.add&&mode==='gods')hooks.onSpin(i+1,sp.total);if(sp.win>0)ZG.sfx?.play('coin');hooks.onSpinWin?.(sp.win);await hooks.onRoundWin?.(sp.win);score+=sp.win;hooks.onScore(score);
    await st.celebrateWin(sp.win,r.rate||opt.getRate?.(),hooks.fmt);
    if(mode==='dwarf'&&sp.battleTriggered)await battleTrigger(sp.forced);
    await st.roundPause();i++;
   }
   if(r.guarantee){await st.banner(['最終配当','1 C'],{hold:350});await hooks.onRoundWin?.(r.guarantee);}
   if(r.capped)await st.banner(['MAX WIN',hooks.fmt(r.score)+' C'],{});
   if(mode==='train')await st.atNormalSpeed(async()=>{
    note='貨車の積荷を集計';const destination=st.anchor('#rScore',{x:st.w/2,y:st.h*.85});
    for(let col=0;col<cols;col++){
     let value=0,origin=null;
     for(let j=col;j<grid.length;j+=cols){if(grid[j]?.value){value+=grid[j].value;origin=cellPoint(j);}}
     if(origin){ZG.sfx?.play('coin');await st.carry(origin,destination,'×'+hooks.fmt(value),'#ffe5a2',24,200);}
    }
    // The final result is presented by the shared result sheet.
    await st.banner(['TOTAL WIN',hooks.fmt(r.score)+' C · '+r.script.length+' SPINS'],{hold:1000});
   });
   hooks.onScore(r.score);hooks.onMode?.('COMPLETE');
  }};
 };
})();
