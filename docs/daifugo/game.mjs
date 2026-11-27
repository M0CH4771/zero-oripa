import {start,legal,step,cpu,label,rank,VERSION,CPU_VERSION} from './engine.mjs';
import {bank} from './bank.mjs?v=4';
import {drawReward,RTP} from './reward.mjs?v=5';
const $=s=>document.querySelector(s),names=['あなた','レオン','ルビー','セレーネ'],suits=['♠','♥','♦','♣'],ranks=['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
let state=null,scenario=null,reward=null,selected=new Set(),busy=false,history=[],ticket=0,settled=false,bet=1000,credits=100000;
const storyImages=['comic-leon10.webp','comic-ruby10.webp','comic-selene10.webp','decree7.webp'].map(src=>{const img=new Image();img.src='./'+src;return img});
const allowed=bank.filter(x=>x.playability?.reachable&&x.proof.complete&&x.proof.version===VERSION&&x.proof.cpu===CPU_VERSION);
const pause=ms=>new Promise(r=>setTimeout(r,ms)),fmt=n=>n.toLocaleString('ja-JP'),random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
$('#rtp').textContent=(RTP*100).toFixed(2)+'%';$('#balance').textContent=fmt(credits);
function card(c,interactive=false){let b=document.createElement(interactive?'button':'div');b.dataset.card=String(c);b.className='card'+([1,2].includes(c%4)?' red':'');b.innerHTML='<span class="corner">'+ranks[rank(c)]+'<small>'+suits[c%4]+'</small></span><strong><span>'+ranks[rank(c)]+'</span>'+suits[c%4]+'</strong><span class="corner bottom">'+ranks[rank(c)]+'<small>'+suits[c%4]+'</small></span>';if(interactive){b.setAttribute('aria-label',label(c));b.classList.toggle('selected',selected.has(c));b.setAttribute('aria-pressed',String(selected.has(c)));b.onclick=()=>{if(busy||state.turn!==0)return;selected.has(c)?selected.delete(c):selected.add(c);draw()};}return b}
let cueTimer;function cue(title,sub=''){let c=$('#cue');c.querySelector('strong').textContent=title;c.querySelector('small').textContent=sub;c.classList.remove('show');void c.offsetWidth;c.dataset.kind=title==='革命'?'revolution':title==='8 CUT'?'eight':title==='縛り'?'lock':'rank';c.classList.add('show');clearTimeout(cueTimer);cueTimer=setTimeout(()=>c.classList.remove('show'),1250);}
function draw(){if(!state)return;let done=state.finish.length===4;$('#turn').textContent=done?'対戦終了':state.turn===0?'あなたのターン':names[state.turn]+'のターン';$('#turn').classList.toggle('your-turn',!done&&state.turn===0);$('#revolution').textContent=state.rev?'革命中：3が最強':'通常：2が最強';$('#binding').textContent=state.lock?'縛り '+suits.filter((_,i)=>state.lock&(1<<i)).join(''):'縛りなし';let fieldKey=state.field?state.field.cards.join(','):'empty';if($('#field').dataset.key!==fieldKey){$('#field').dataset.key=fieldKey;$('#field').replaceChildren(...(state.field?state.field.cards.map(c=>card(c)):[Object.assign(document.createElement('span'),{className:'empty',textContent:'新しい場'})]));$('#field').classList.remove('land');void $('#field').offsetWidth;$('#field').classList.add('land');}for(let i=1;i<=3;i++){let p=$('#cpu'+i),finished=state.finish.indexOf(i);p.classList.toggle('active',!done&&state.turn===i);p.classList.toggle('finished',finished>=0);p.querySelector('.count').textContent=finished>=0?(finished+1)+'着':state.h[i].length+' 枚';p.querySelector('.backs').replaceChildren(...Array.from({length:Math.min(state.h[i].length,8)},()=>Object.assign(document.createElement('i'),{className:'back'})));}
let can=state.turn===0&&!busy&&!done,moves=can?legal(state):[],match=moves.some(a=>a.length&&a.length===selected.size&&a.every(c=>selected.has(c)));let h=[...state.h[0]];if($('#sort').checked)h.sort((a,b)=>(a%4)-(b%4)||a-b);
$('#hand').replaceChildren(...h.map(c=>{let b=card(c,true);b.disabled=!can;if(can&&moves.some(a=>a.includes(c)))b.classList.add('possible');return b}));$('#hcount').textContent=h.length+' 枚';$('#play').disabled=!can||!match;$('#pass').disabled=!can||!moves.some(a=>!a.length);$('#hint').disabled=!can;$('#log').textContent=history.slice(-10).reverse().join('\n');$('#start').disabled=!done;$('#base').disabled=!done;if(done&&!settled){settled=true;finish(ticket)}}
function act(a){let p=state.turn,before=state.rev,lock=state.lock;state=step(state,a);if(p){let el=$('#cpu'+p);el.classList.remove('acting');void el.offsetWidth;el.classList.add('acting');setTimeout(()=>el.classList.remove('acting'),500)}history.push(names[p]+'：'+(a.length?a.map(label).join(' '):'パス'));$('#last').textContent=names[p]+'　'+(a.length?a.map(label).join(' '):'PASS');if(before!==state.rev)cue('革命','カードの強さが逆転');else if(a.length&&rank(a[0])===5)cue('8 CUT','場を流す');else if(!lock&&state.lock)cue('縛り','マークを制限');else if(state.h[p].length===1)cue('LAST ONE',names[p]);else if(state.finish.includes(p)&&a.length)cue((state.finish.indexOf(p)+1)+'位',names[p]);selected.clear();}
async function advance(t){busy=true;draw();while(state&&!settled&&state.finish.length<4&&state.turn!==0){await pause($('#cue').classList.contains('show')?1250:650);if(ticket!==t)return;act(cpu(state));draw();}if(ticket===t){busy=false;draw()}}
async function finish(t){let actual=state.finish.indexOf(0)+1;$('#result').dataset.actual=String(actual);$('#wheel').hidden=true;if(actual<reward.rank){$('#resultText').textContent='検証不整合：テスト消費Cを返却';credits+=bet;$('#balance').textContent=fmt(credits);$('#actual').textContent=actual+'着';$('#rewardRank').textContent=reward.rank+'着相当';$('#rewardValue').textContent='返却';$('#again').disabled=false;$('#result').showModal();return}let amount=Math.round(bet*reward.mult);$('#actual').textContent=actual+'着';$('#rewardRank').textContent=reward.rank+'着相当';$('#resultText').textContent=actual>reward.rank?'事前抽選の報酬を適用します。対戦順位はそのままです。':'対戦結果と事前報酬ランクが一致しました。';$('#rewardValue').textContent='—';$('#wheel').hidden=reward.rank!==1;$('#again').disabled=true;if(actual>reward.rank){await royalDecree(actual,reward.rank);if(ticket!==t)return;}$('#result').showModal();if(reward.rank===1){const cells=[...$('#wheel').children];let index=0;for(let i=0;i<18;i++){cells.forEach(x=>x.classList.remove('highlight'));index=i%4;cells[index].classList.add('highlight');await pause(65+i*7);if(ticket!==t)return}cells.forEach(x=>x.classList.remove('highlight'));cells[reward.mult-2].classList.add('highlight');}credits+=amount;$('#balance').textContent=fmt(credits);$('#rewardValue').textContent=fmt(amount)+' C（×'+reward.mult+'）';$('#again').disabled=false;}
$('#start').onclick=()=>{if(state&&!settled)return;bet=Number($('#base').value);if(credits<bet){$('#notice').textContent='テスト残高不足。補充を押してください。';return}reward=drawReward(random);let pool=allowed.filter(x=>x.proof.best===reward.rank);if(!pool.length){$('#notice').textContent='検証済みシナリオがありません';return}ticket++;scenario=pool[Math.floor(random()*pool.length)];state=start(scenario.hands,scenario.starter);credits-=bet;settled=false;selected.clear();history=[];$('#balance').textContent=fmt(credits);$('#assigned').textContent=reward.rank+'着相当';$('#notice').textContent='事前抽選済み・抽選ランクを上回らない対戦シナリオ';$('#last').textContent='配札完了';$('#intro').hidden=true;$('#table').hidden=false;document.body.classList.add('in-match');$('#table').classList.remove('deal');void $('#table').offsetWidth;$('#table').classList.add('deal');setTimeout(()=>$('#table').classList.remove('deal'),400);advance(ticket)};
$('#play').onclick=()=>{if(!busy&&state?.turn===0){try{act([...selected]);advance(ticket)}catch(e){$('#notice').textContent=e.message}}};
$('#pass').onclick=()=>{if(!busy&&state?.turn===0&&state.field){act([]);advance(ticket)}};
$('#hint').onclick=()=>{if(!busy&&state?.turn===0){selected=new Set(cpu(state));draw()}};
$('#sort').onchange=draw;$('#again').onclick=()=>{$('#result').close();$('#start').disabled=false;$('#base').disabled=false;$('#intro').hidden=false;$('#table').hidden=true;document.body.classList.remove('in-match')};
$('#refill').onclick=()=>{if(!state||settled){credits+=100000;$('#balance').textContent=fmt(credits);$('#notice').textContent='無料テストコインを補充しました'}};
$('#info').onclick=()=>$('#rules').showModal();$('#closeRules').onclick=()=>$('#rules').close();

$('#result').addEventListener('cancel',e=>e.preventDefault());

function royalDecree(actual,assigned){
const d=$('#revival'),art=$('#revivalArt'),b=$('#revivalContinue'),first=state.finish[0],target=state.finish[assigned-1];
const tales={
1:{titles:['王子の勝利','袖から落ちた札','隠し札の発覚','王子の謝罪'],proof:'レオンが立ち上がった瞬間、袖の内側に残していたカードが卓上へ落ちた。',clue:'「待て！ 袖から札が落ちたぞ！」',discovery:'女騎士が落ちた札を拾い、全員に見せる。物語では、隠し札を残したまま上がったことが発覚する。',accuse:'「手札を隠したまま上がったのか！」',end:'「私の落ち度だ。王家の印章を受け取ってくれ。」',verdict:'レオンは物語上の非を認め、王家の恩賞を授ける。'},
2:{titles:['騎士の勝利','盾が映した証拠','隠し札の発覚','騎士の誓い'],proof:'ルビーの黄金の盾に手元が映る。表から見えない位置に、もう一枚のカードが隠されていた。',clue:'「盾に映っている札は何だ！？」',discovery:'王子が盾の映り込みを指摘し、隠されていたカードを取り出す。物語では、手札を隠していたことが発覚する。',accuse:'「まだ手札が残っているではないか！」',end:'「騎士の誓いにかけて、恩賞を認めよう。」',verdict:'ルビーは物語上の判定を受け入れ、名誉の勲章を授ける。'},
3:{titles:['魔導師の勝利','消えゆく幻影','幻の札の発覚','魔導師の裁定'],proof:'セレーネの出した札が、青い光を放ち、目の前で魔法の粒子に崩れ始めた。',clue:'「この札が……消えていく！」',discovery:'王子と女騎士は本物の札が残っていることを確認する。物語では、幻影で作られた札を出していたことが発覚する。',accuse:'「偽物の札だったのか！」',end:'「王宮の印章により、恩賞を授けます。」',verdict:'セレーネは物語上の裁定を受け入れ、恩賞の勅令を掲げる。'}
};
const firstStory=tales[first],targetStory=tales[target];let panel=0;
$('#comicWinner').textContent=names[first];$('#comicTarget').textContent=names[target]+'（実際'+assigned+'着）';
$('#revivalActual').textContent=actual+'着';$('#revivalRank').textContent=assigned+'着相当';$('#promotionRank').textContent=assigned+'着';
function paint(){
const promotion=panel===4,actor=panel===0?first:target;
art.dataset.actor=String(actor);art.dataset.panel=String(panel);d.classList.toggle('promotion-mode',promotion);
$('#comicNumber').textContent=promotion?'恩賞確定':(panel+1)+' / 4';
$('#comicBubble').hidden=promotion;
$('#comicBubble').textContent=['「勝負は決まった……！」',targetStory.clue,targetStory.accuse,targetStory.end,''][panel];
$('#comicLine').textContent=['対戦終了','証拠発見','イカサマ発覚（物語）','王家の裁定','報酬ランク昇格'][panel];
$('#comicNarration').textContent=[names[first]+'が1着、あなたは'+actual+'着。'+(first===target?'しかし、勝者の札に異変が起きる。':names[target]+'（'+assigned+'着）の席で異変が起きる。'),targetStory.proof,targetStory.discovery,targetStory.verdict,'事前抽選の'+assigned+'着相当の報酬が適用されます。'][panel];
$('#revivalTitle').textContent=panel===0?firstStory.titles[0]:promotion?'昇格':targetStory.titles[panel];
$('.revival-label').textContent=promotion?'事前抽選報酬の適用':'漫画の物語演出';
$('#revivalRanks').hidden=!promotion;$('#promotionArt').hidden=!promotion;
$('#revivalDisclosure').textContent=promotion?'実際の対戦順位は'+actual+'着のままです。報酬は対戦開始時に確定しています。':'漫画のフィクション演出です。実際の対戦に不正はありません。';
b.textContent=promotion?'報酬を確認':panel===3?'昇格を確認':'次のコマ';
art.classList.remove('comic-enter');void art.offsetWidth;art.classList.add('comic-enter');
}
paint();d.showModal();return new Promise(resolve=>{b.onclick=()=>{if(panel<4){panel++;paint();return}b.onclick=null;d.close();resolve()};b.focus()});
}
$('#revival').addEventListener('cancel',e=>e.preventDefault());
