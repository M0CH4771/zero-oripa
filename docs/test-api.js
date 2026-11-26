import { streamGame, tierFor, GAME_VOLATILITY } from './test-games/index.js?v=dwarf122';
import { plinkoConfig } from './test-games/plinko.js?v=live113';
import {FEATURE_CONFIG} from './test-games/features.js?v=dwarf122';
import {createEarnState,earnView,earnAction} from './earn.js?v=earn52';
window.plinkoConfig=plinkoConfig;
window.FEATURE_CONFIG=FEATURE_CONFIG;

const data = await (await fetch('./test-data.json')).json();
const config = {...data.config, site_name:'ゼロ円オリパ', dev:true,daily_game_rate:1000};
const key = 'zero-oripa-public-demo-v1';
const fresh = () => ({coins:100000, nickname:'テストプレイヤー', spent:0, points:0, cards:[], history:[], packs:structuredClone(data.packs), bonus:false, ad:0, limit:0, seq:0,earn:createEarnState()});
let s;
try { s = JSON.parse(localStorage.getItem(key)) || fresh(); } catch { s = fresh(); }
s.earn??=createEarnState();
s.monthly??={};
const dailyDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tokyo'});
const monthKey=()=>dailyDate().slice(0,7),monthPoints=()=>s.monthly[monthKey()]||0;
function resetDailyCounters(){const today=dailyDate();if(s.counterDate===today)return;s.counterDate=today;s.todaySpent=0;s.ad=0;for(const p of s.packs)p.playedToday=0;}
const DAILY_RATE=1000;
const SLOT_RATES=[500,1000,2000,3000,4000,5000,10000,20000,30000,50000,100000,200000,300000,400000,500000,1000000];
const dailyAvailable=()=>{try{return s.dailyPlayed!==dailyDate()&&localStorage.getItem(key+'-daily')!==dailyDate();}catch{return s.dailyPlayed!==dailyDate();}};
function preparePacks(){
 s.packs=s.packs.filter(p=>!['daily','new'].includes(p.tag));
 if(!s.packs.some(p=>p.game==='plinko')){
  const base=data.packs.find(p=>p.game==='rush');
  s.packs.push({...structuredClone(base),id:11,name:'ZERO PLINKO',game:'plinko',theme:'plinko',tag:'rush',badge:'12段のピンボード',plays:0,actual_rtp:null,best:0});
 }
 const base=data.packs.find(p=>p.game==='rush');
 for(const [game,c] of Object.entries(FEATURE_CONFIG))if(game!=='train'&&!s.packs.some(p=>p.game===game))s.packs.push({...structuredClone(base),id:c.id,name:c.title,game,theme:game,tag:'rush',badge:c.badge,rates:[100,300,1000,3000,10000],max_mult:c.max,plays:0,bet:0,won:0,actual_rtp:null,best:0});
}
preparePacks();
resetDailyCounters();
const save = () => { try { localStorage.setItem(key, JSON.stringify(s)); } catch {} };
const tx = (amount,reason) => { s.coins += amount; s.history.unshift({amount,reason,created_at:Date.now()}); };
const tier = () => { const t = [...config.tiers].reverse().find(t=>s.spent>=t.min) || config.tiers[0]; const level=config.tiers.indexOf(t), next=config.tiers[level+1]; return {...t,level,next_min:next?.min,next_name:next?.name}; };
const me = () => ({user:{id:1,nickname:s.nickname,nickname_set:true,coins:s.coins,ship_points_total:s.points,month_points:monthPoints(),streak:s.bonus?1:0,bonus_available:!s.bonus,daily_limit:s.limit,ad_today:s.ad,ad_max:config.ad_daily_max,ad_reward:config.ad_reward,total_spent:s.spent,tier:tier(),bonus_amount:Math.round(config.login_bonus*(1+tier().bonus))},invite:{code:'TESTONLY',invited:0,rewarded:0,used:false,can_enter:false},stats:{spent:s.spent,today_spent:s.todaySpent||0,got:s.cards.reduce((a,c)=>a+c.value,0),draws:s.cards.length,held:s.cards.filter(c=>c.status==='held').length},claims:[]});
const card = (p,c) => { const x={id:++s.seq,card_id:s.seq,pack_id:p.id,rank:c.rank,name:c.name,value:c.value,image:c.image||null,status:'held',created_at:Date.now()}; s.cards.push(x); return x; };
const pay = n => { if(s.limit>0&&(s.todaySpent||0)+n>s.limit)throw new Error('本日の消費上限です');if(s.coins<n) throw new Error('コインが足りません。テスト補充をお試しください'); tx(-n,'draw'); s.spent+=n;s.todaySpent=(s.todaySpent||0)+n; };
// An interrupted test session cannot be resumed from localStorage. Refund its
// unused test credits instead of drawing the remaining spins in the background.
function refundPending(token){const pending=s.pendingRound;if(!pending||token&&pending.token!==token)return;tx(pending.cost,'interrupted-round-refund');s.spent=Math.max(0,s.spent-pending.cost);if(pending.date===dailyDate())s.todaySpent=Math.max(0,(s.todaySpent||0)-pending.cost);delete s.pendingRound;save();}
refundPending();
// One in-memory simulation session. No future spins are generated until requested.
const sessions=new Map();
function packView(p){const badges={train:'NEW · 6列の鉱山＆回収宝箱',rush:'6×5・どこでも8個',fruit:'7×7・つながる5個',mine:'5列の採掘チャレンジ',plinko:'3段階の荒さ・RTP 約97%',dogs:'6リール・最大117,649 WAYS'}; const rates=p.kind==='rush'&&p.game!=='plinko'?SLOT_RATES:p.rates;const v=GAME_VOLATILITY[p.game]; return {...p,rates,volatility_label:v?v+'/5':p.game==='plinko'?'選択式':p.volatility_label,volatility_level:v,max_mult:p.game==='plinko'?null:FEATURE_CONFIG[p.game]?.max??50,min_mult:p.kind==='rush'?0:p.min_mult,min_coins:p.kind==='rush'?1:undefined,badge:badges[p.game]||p.badge,locked:null, today_left:p.per_user_daily?Math.max(0,p.per_user_daily-(p.playedToday||0)):null}; }
async function api(path,b){
 resetDailyCounters();
 const u=new URL(path,location.origin), pth=u.pathname; let m;
 if(pth==='/api/config') return config;
 if(pth==='/api/earn')return {...earnView(s.earn),coins:s.coins};
 if(pth==='/api/earn/action'){const before=s.earn.points;const result=earnAction(s.earn,b?.action,b?.id);const delta=s.earn.points-before;if(delta>0)tx(delta,'earn');return {...result,coins:s.coins};}
 if(pth==='/api/me'){if(b){if(b.nickname)s.nickname=String(b.nickname).slice(0,12);if(b.daily_limit!==undefined)s.limit=+b.daily_limit||0;return {ok:true};}const profile=me();profile.user.bonus_available=dailyAvailable();profile.user.bonus_amount=0;return profile;}
 if(pth==='/api/packs')return {packs:s.packs.filter(p=>p.game!=='train'&&p.id!==14).map(packView)};
 if(pth==='/api/daily')return {available:dailyAvailable(),rate:DAILY_RATE,date:dailyDate()};
 if(pth==='/api/game-step'){
   const session=sessions.get(b?.token);if(!session)throw Error('プレイ情報がありません');
   const next=session.it.next();
   if(!next.done)return {done:false,spin:next.value};
   sessions.delete(b.token);
   if(s.pendingRound?.token===b.token)delete s.pendingRound;
   const {p,cost,demo,daily,count}=session,r=next.value,t=tierFor(p.tiers,r.score,cost),c={...t,value:r.score};
   if(!demo&&!daily){p.plays=(p.plays||0)+count;p.bet=(p.bet||0)+cost;p.won=(p.won||0)+r.score;p.actual_rtp=p.won/p.bet;p.best=Math.max(p.best||0,r.score);}
   return {done:true,result:{...r,card:r.score?(demo?c:card(p,c)):null,coins:s.coins,today_spent:s.todaySpent||0,daily_limit:s.limit}};
 }
 if(pth==='/api/game-cancel'){if(b?.token&&sessions.has(b.token)){sessions.delete(b.token);refundPending(b.token);}return {coins:s.coins};}
 if(m=pth.match(/^\/api\/packs\/(\d+)(?:\/(draw|rush|rush-demo|daily))?$/)){
   if(+m[1]===14)throw Error('ZERO TRAINはサービス終了しました');
   const p=s.packs.find(x=>x.id===+m[1]); if(!p||p.game==='train')throw Error('パックが見つかりません');
   if(!m[2])return {pack:packView(p)};
   if(m[2]==='draw'){
     let n=b.count==='all'?p.remaining:Math.max(1,Math.min(100,+b.count||1)); n=Math.min(n,p.remaining,p.per_user_daily?Math.max(0,p.per_user_daily-(p.playedToday||0)):Infinity); if(!n)throw Error('本日の上限です');
     pay(n*p.price); const results=[],kiriban=[]; let last_one=null,first=p.draw_count+1;
     for(let i=0;i<n;i++){let r=Math.floor(Math.random()*p.remaining);const x=p.prizes.find(x=>(r-=x.remaining)<0);if(!x)break;x.remaining--;p.remaining--;p.draw_count++;results.push(card(p,x));if(p.kiriban&&p.draw_count%p.kiriban.every===0)kiriban.push(card(p,{...p.kiriban,rank:'KB'}));}
     p.playedToday=(p.playedToday||0)+n; const last=p.draw_count;
     if(!p.remaining){if(p.last_one)last_one=card(p,{...p.last_one,rank:'LO'});p.prizes.forEach(x=>x.remaining=x.total);p.remaining=p.total;p.draw_count=0;p.round++;}
     return {results,kiriban,last_one,cost:n*p.price,coins:s.coins,draw_no:[first,last],today_spent:s.todaySpent||0,daily_limit:s.limit};
   }
   const daily=m[2]==='daily', demo=m[2]==='rush-demo';
   if(daily&&(p.kind!=='rush'||!dailyAvailable()))throw Error('本日の無料プレイは利用済みです');
   const rates=packView(p).rates,rate=daily?DAILY_RATE:Number(b.rate??rates[0]);
   if(!daily&&!rates.includes(rate))throw Error('レートを選び直してください');
   const count=p.game==='plinko'&&!daily?Number(b.count??1):1;
   if(!Number.isInteger(count)||count<1||count>1000)throw Error('球数は1〜1,000個');
   const risk=b.risk??'medium',rows=b.rows??12;
   if(p.game==='plinko')plinkoConfig(rows,risk);
   const cost=rate*count;

   const strategy=p.game==='train'&&['train2','train3','train4'].includes(b.strategy)?b.strategy:p.game==='dogs'?(b.strategy==='raining'?'raining':'sticky'):b.strategy==='run'?'run':'battle';
   const it=streamGame(p.game,{rate,volatility:p.volatility,maxMult:50,count,risk,rows,strategy,encounter:b.encounter,dogEntry:p.game==='dogs'?b.dogEntry:null}),r=it.next().value;
   if(!demo&&!daily){if(s.pendingRound)throw Error('前のゲームが進行中です');pay(cost);}
   if(daily){s.dailyPlayed=dailyDate();try{localStorage.setItem(key+'-daily',s.dailyPlayed)}catch{}}
   const token=crypto.randomUUID();sessions.set(token,{it,p,cost,demo,daily,count});
   if(!demo&&!daily)s.pendingRound={token,cost,date:dailyDate()};
   return {...r,token,rate:cost,game:p.game,cost:daily?0:cost,coins:s.coins,today_spent:s.todaySpent||0,daily_limit:s.limit,demo,daily};
 }
 if(pth==='/api/cards')return {cards:s.cards.filter(c=>c.status===(u.searchParams.get('status')||'held')).sort((a,b)=>b.value-a.value),ship_rate:config.ship_rate};
 if(pth==='/api/cards/convert'||pth==='/api/cards/ship'){let coins=0,points=0,count=0;for(const c of s.cards){if(c.status!=='held'||!b.ids.includes(c.id))continue;count++;if(pth.endsWith('convert')){c.status='converted';coins+=c.value;}else{c.status='shipped';points+=Math.floor(c.value*config.ship_rate);}}if(coins)tx(coins,'convert');s.points+=points;s.monthly??={};s.monthly[monthKey()]=monthPoints()+points;return {ok:true,count,coins,points};}
 if(pth==='/api/bonus/claim')throw Error('ログインボーナスタブからゲームを選んでください');
 if(pth==='/api/ad/start')return {token:'test-ad',min_seconds:1};
 if(pth==='/api/ad/claim'){if(s.ad>=config.ad_daily_max)throw Error('本日の上限です');s.ad++;tx(config.ad_reward,'ad');return {amount:config.ad_reward};}
 if(pth==='/api/feed')return {feed:s.cards.filter(c=>['S','A','LO'].includes(c.rank)).slice(-50).reverse().map(c=>({...c,nickname:s.nickname,pack:s.packs.find(p=>p.id===c.pack_id)?.name}))};
 if(pth==='/api/ranking'){const points=monthPoints();return {month:monthKey(),rewards:[],rows:points?[{rank:1,nickname:s.nickname,points,me:true}]:[],mine:{rank:points?1:null,points}};}
 if(pth==='/api/coin-history')return {history:s.history};
 if(pth==='/api/auth/logout'){return {ok:true};}
 throw Error('この機能はテスト環境では利用できません');
}
const original=window.fetch.bind(window);
window.fetch=async(input,opt)=>{if(typeof input!=='string'||!input.startsWith('/api/'))return original(input,opt);try{const result=await api(input,opt?.body?JSON.parse(opt.body):undefined);save();return Response.json(result);}catch(e){return Response.json({error:e.message},{status:400});}};
window.testRefill=()=>{tx(1000000,'admin');save();location.reload();};
window.testReset=()=>{if(confirm('テスト履歴と獲得商品をリセットしますか？')){s=fresh();preparePacks();try{localStorage.removeItem(key+'-daily')}catch{}save();location.hash='#home';location.reload();}};
await import('./app.js?v=dwarf122');
