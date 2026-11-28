import {start,legal,step,cpu,label,rank,shape,VERSION,CPU_VERSION} from './engine13.mjs?v=24';
import {bank} from './bank13-certified.mjs?v=24';
import {drawReward,RTP} from './reward.mjs?v=5';
import {shouldAutoPass} from './auto-pass.mjs?v=27';
import {playerRank,revivalOrder} from './early-result.mjs?v=28';
const $=s=>document.querySelector(s),names=['あなた','レオン','ルビー','セレーネ'],suits=['♠','♥','♦','♣'],ranks=['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
let state=null,scenario=null,reward=null,selected=new Set(),busy=false,autoPassing=false,history=[],ticket=0,settled=false,bet=1000,credits=100000;
const storyImages=['comic-leon10.webp','comic-ruby10.webp','comic-selene10.webp','decree7.webp'].map(src=>{const img=new Image();img.src='./'+src;return img});
const allowed=bank.filter(x=>x.cap?.status==='certified'&&x.version===VERSION&&x.cpu===CPU_VERSION&&x.strict?.runs===100&&x.strict?.matches===100&&x.strict?.seed===48871&&x.strict?.deviation===.25&&x.robust?.score===1&&x.robust?.policies?.length===3&&x.robust.policies.every(Boolean));const ready=[1,2,3,4].every(r=>allowed.filter(x=>x.target===r).length===2000);
const pause=ms=>new Promise(r=>setTimeout(r,ms)),fmt=n=>n.toLocaleString('ja-JP'),random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
// Presentation only: game state and certified CPU policy are unchanged.
const helper=document.createElement('div');helper.className='hand-helper';helper.innerHTML='<span id="handMessage" aria-live="polite">カードを選択してください</span><span class="selection-count" id="selectionCount">0枚選択</span><button type="button" id="clearSelection">解除</button>';$('#hand').before(helper);
const owner=document.createElement('div');owner.className='field-owner';owner.id='fieldOwner';$('#field').before(owner);
$('#clearSelection').onclick=()=>{if(!busy&&state?.turn===0){selected.clear();draw()}};
function updateTableUI(can,moves,match,done){for(let i=1;i<=3;i++){const p=$('#cpu'+i);p.dataset.status=state.passed&(1<<i)?'pass':'';}$('#revolution').classList.toggle('is-active',state.rev);$('#binding').classList.toggle('is-active',!!state.lock);owner.textContent=state.field?names[state.field.owner]+'の出札 ・ '+(state.field.type==='run'?'階段':state.field.n===1?'単体':state.field.n+'枚組'):'場が空いています';$('#selectionCount').textContent=selected.size+'枚選択';$('#clearSelection').disabled=!can||!selected.size;$('#handMessage').textContent=done?'対戦終了':autoPassing?'出せる札なし・自動パス':state.passed&1?'パス済み・場流し待ち':!can?'対戦相手のターン':match?'出札できます':selected.size?'組み合わせを確認してください':moves.some(a=>a.length)?'カードを選択してください':'出せるカードがありません';$('#play').textContent=match?selected.size+'枚出す':'カードを出す';}
$('#rtp').textContent=(RTP*100).toFixed(2)+'%';$('#balance').textContent=fmt(credits);
function card(c,interactive=false){let b=document.createElement(interactive?'button':'div');b.dataset.card=String(c);b.className='card'+([1,2].includes(c%4)?' red':'');b.innerHTML='<span class="corner">'+ranks[rank(c)]+'<small>'+suits[c%4]+'</small></span><strong><span>'+ranks[rank(c)]+'</span>'+suits[c%4]+'</strong><span class="corner bottom">'+ranks[rank(c)]+'<small>'+suits[c%4]+'</small></span>';if(interactive){b.setAttribute('aria-label',label(c));b.classList.toggle('selected',selected.has(c));b.setAttribute('aria-pressed',String(selected.has(c)));b.onclick=()=>{if(busy||state.turn!==0)return;selected.has(c)?selected.delete(c):selected.add(c);draw()};}return b}
let cueTimer;function cue(title,sub=''){let c=$('#cue');c.querySelector('strong').textContent=title;c.querySelector('small').textContent=sub;c.classList.remove('show');void c.offsetWidth;c.dataset.kind=title==='革命'?'revolution':title==='8 CUT'?'eight':title==='縛り'?'lock':title==='PASS'?'pass':'rank';c.classList.add('show');clearTimeout(cueTimer);cueTimer=setTimeout(()=>c.classList.remove('show'),1250);}
function draw(){if(!state)return;let done=playerRank(state)!==null;$('#turn').textContent=done?'対戦終了':autoPassing?'あなた：自動パス':state.turn===0?'あなたのターン':names[state.turn]+'のターン';$('#turn').classList.toggle('your-turn',!done&&state.turn===0);$('#revolution').textContent=state.rev?'革命中：3が最強':'通常：2が最強';$('#binding').textContent=state.lock?'縛り '+suits.filter((_,i)=>state.lock&(1<<i)).join(''):'縛りなし';let fieldKey=state.field?state.field.cards.join(','):'empty';if($('#field').dataset.key!==fieldKey){$('#field').dataset.key=fieldKey;$('#field').replaceChildren(...(state.field?state.field.cards.map(c=>card(c)):[Object.assign(document.createElement('span'),{className:'empty',textContent:'新しい場'})]));$('#field').classList.remove('land');void $('#field').offsetWidth;$('#field').classList.add('land');}for(let i=1;i<=3;i++){let p=$('#cpu'+i),finished=state.finish.length===4?state.finish.indexOf(i):state.good.includes(i)?state.good.indexOf(i):state.bad.includes(i)?3-state.bad.indexOf(i):-1;p.classList.toggle('active',!done&&state.turn===i);p.classList.toggle('finished',finished>=0);p.querySelector('.count').textContent=finished>=0?(finished+1)+'着':state.h[i].length+' 枚';p.querySelector('.backs').replaceChildren(...Array.from({length:Math.min(state.h[i].length,13)},()=>Object.assign(document.createElement('i'),{className:'back'})));}
let can=state.turn===0&&!busy&&!done,moves=can?legal(state):[],match=moves.some(a=>a.length&&a.length===selected.size&&a.every(c=>selected.has(c)));let h=[...state.h[0]];if($('#sort').checked)h.sort((a,b)=>(a%4)-(b%4)||a-b);
$('#hand').replaceChildren(...h.map(c=>{let b=card(c,true);b.disabled=!can;if(can&&moves.some(a=>a.includes(c)))b.classList.add('possible');return b}));$('#hcount').textContent=h.length+' 枚';$('#play').disabled=!can||!match;$('#pass').disabled=!can||!moves.some(a=>!a.length);updateTableUI(can,moves,match,done);$('#log').textContent=history.slice(-10).reverse().join('\n');$('#start').disabled=!done;$('#base').disabled=!done;if(done&&!settled){settled=true;finish(ticket)}}
function act(a){let p=state.turn,before=state.rev,lock=state.lock;state=step(state,a);if(p){let el=$('#cpu'+p);el.classList.remove('acting');void el.offsetWidth;el.classList.add('acting');setTimeout(()=>el.classList.remove('acting'),500)}history.push(names[p]+'：'+(a.length?a.map(label).join(' '):'パス'));$('#last').textContent=names[p]+'　'+(a.length?a.map(label).join(' '):'PASS');if(!a.length&&p===0&&!autoPassing)cue('PASS','あなた・パス');else if(before!==state.rev)cue('革命','カードの強さが逆転');else if(state.lastPenalty===p)cue('反則上がり',names[p]);else if(a.length&&shape(a).type==='group'&&rank(a[0])===5)cue('8 CUT','場を流す');else if(!lock&&state.lock)cue('縛り','マークを制限');else if(state.h[p].length===1)cue('LAST ONE',names[p]);else if(state.good.includes(p)&&a.length)cue((state.good.indexOf(p)+1)+'位',names[p]);selected.clear();}
async function advance(t){busy=true;draw();while(state&&!settled&&playerRank(state)===null){if(state.turn===0){if(!shouldAutoPass(state,legal(state)))break;autoPassing=true;selected.clear();draw();cue('PASS','あなた・出せるカードがありません');await pause(1000);if(ticket!==t)return;act([]);autoPassing=false;draw();continue;}await pause($('#cue').classList.contains('show')?1250:650);if(ticket!==t)return;act(cpu(state));draw();}if(ticket===t){autoPassing=false;busy=false;draw()}}
async function finish(t){let actual=playerRank(state);$('#result').dataset.actual=String(actual);$('#wheel').hidden=true;if(actual<reward.rank){credits+=bet;$('#balance').textContent=fmt(credits);$('#actual').textContent=actual+'着';$('#rewardRank').textContent=reward.rank+'着相当';$('#rewardValue').textContent='返却';$('#resultText').textContent='検証不整合：テスト消費Cを返却。';$('#again').disabled=false;$('#result').showModal();return;}let amount=Math.round(bet*reward.mult);$('#actual').textContent=actual+'着';$('#rewardRank').textContent=reward.rank+'着相当';$('#resultText').textContent=actual!==reward.rank?'事前抽選の報酬を適用します。対戦順位はそのままです。':'対戦結果と事前報酬ランクが一致しました。';$('#rewardValue').textContent='—';$('#wheel').hidden=reward.rank!==1;$('#again').disabled=true;if(actual>reward.rank){await royalDecree(actual,reward.rank);if(ticket!==t)return;}$('#result').showModal();if(reward.rank===1){await spinRewardReel(reward.mult);if(ticket!==t)return;}credits+=amount;$('#balance').textContent=fmt(credits);$('#rewardValue').textContent=fmt(amount)+' C（×'+reward.mult+'）';$('#again').disabled=false;}
$('#start').onclick=()=>{if(state&&!settled)return;if(!ready){$('#notice').textContent='全着順の検証が完了していません。対戦開始できません。';return;}bet=Number($('#base').value);if(credits<bet){$('#notice').textContent='テスト残高不足。補充を押してください。';return}reward=drawReward(random);let pool=allowed.filter(x=>x.target===reward.rank);if(!pool.length){$('#notice').textContent='検証済みシナリオがありません';return}ticket++;scenario=pool[Math.floor(random()*pool.length)];state=start(scenario.hands,scenario.starter);credits-=bet;settled=false;selected.clear();history=[];$('#balance').textContent=fmt(credits);$('#assigned').textContent=reward.rank+'着相当';$('#notice').textContent='事前抽選済み・全合法手で上振れなしを検証済み';$('#last').textContent='配札完了';$('#intro').hidden=true;$('#table').hidden=false;document.body.classList.add('in-match');$('#table').classList.remove('deal');void $('#table').offsetWidth;$('#table').classList.add('deal');setTimeout(()=>$('#table').classList.remove('deal'),400);advance(ticket)};
$('#play').onclick=()=>{if(!busy&&state?.turn===0){try{act([...selected]);advance(ticket)}catch(e){$('#notice').textContent=e.message}}};
$('#pass').onclick=()=>{if(!busy&&state?.turn===0&&state.field){act([]);advance(ticket)}};
$('#sort').onchange=draw;$('#again').onclick=()=>{$('#result').close();$('#start').disabled=false;$('#base').disabled=false;$('#intro').hidden=false;$('#table').hidden=true;document.body.classList.remove('in-match')};
$('#refill').onclick=()=>{if(!state||settled){credits+=100000;$('#balance').textContent=fmt(credits);$('#notice').textContent='無料テストコインを補充しました'}};
$('#info').onclick=()=>$('#rules').showModal();$('#closeRules').onclick=()=>$('#rules').close();

$('#result').addEventListener('cancel',e=>e.preventDefault());

function royalDecree(actual,assigned){
const d=$('#revival'),art=$('#revivalArt'),b=$('#revivalContinue'),order=revivalOrder(state),first=order[0],target=order[assigned-1];
let panel=0,timer;
$('#comicWinner').textContent=names[first];$('#comicTarget').textContent=names[target];
$('#revivalActual').textContent=actual+'着';$('#revivalRank').textContent=assigned+'着相当';$('#promotionRank').textContent=assigned+'着';
return new Promise(resolve=>{
function paint(){
clearTimeout(timer);
const promotion=panel===4;
art.dataset.actor=String(panel===0?first:target);art.dataset.panel=String(panel);d.classList.toggle('promotion-mode',promotion);d.classList.toggle('cinematic-mode',!promotion);
$('#comicNumber').textContent=promotion?'恩賞確定':(panel+1)+' / 4';
$('#revivalTitle').textContent=promotion?'報酬ランク昇格':'漫画の物語演出';
$('#revivalRanks').hidden=!promotion;$('#promotionArt').hidden=!promotion;
$('#revivalDisclosure').textContent=promotion?'実際の対戦順位は'+actual+'着のままです。報酬は対戦開始時に確定しています。':'フィクション演出・実際の対戦に不正はありません。';
b.textContent=promotion?'報酬を確認':'次へ';
art.classList.remove('comic-enter');void art.offsetWidth;art.classList.add('comic-enter');
if(!promotion)timer=setTimeout(next,[1350,1550,1600,1600][panel]);
}
function next(){clearTimeout(timer);if(panel<4){panel++;paint();return}b.onclick=null;d.close();resolve();}
b.onclick=next;paint();d.showModal();b.focus();
});
}
async function spinRewardReel(mult){
const strip=$('#reelStrip'),status=$('#reelStatus'),windowEl=$('.reel-window');
const values=[2,3,4,5];const stop=24+values.indexOf(mult);
strip.replaceChildren(...Array.from({length:stop+3},(_,i)=>{const el=document.createElement('div');el.className='reel-cell';el.textContent='×'+values[i%4];return el}));
strip.style.transition='none';strip.style.transform='translateY(0)';$('#wheel').classList.remove('reel-stopped');status.textContent='事前抽選済み倍率を表示中';
const height=windowEl.clientHeight;void strip.offsetHeight;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
strip.style.transition=reduced?'none':'transform 2.7s cubic-bezier(.12,.68,.14,1)';
strip.style.transform='translateY(-'+(stop*height)+'px)';
if(!reduced)await pause(2750);
$('#wheel').classList.add('reel-stopped');status.textContent='倍率確定';
}
$('#revival').addEventListener('cancel',e=>e.preventDefault());
