import {start,legal,step,cpu,label,shape,simulate,VERSION,CPU_VERSION} from './engine13.mjs?v=24';
import {bank} from './bank13-certified.mjs?v=24';
import {proof} from './proof13.mjs?v=24';
const $=s=>document.querySelector(s);let state=null,scenario=null,selected=new Set(),busy=false,history=[],ticket=0;
const names=['あなた','CPU 1','CPU 2','CPU 3'];
const cards=a=>a.map(label).join(' ');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const approved=bank.filter(x=>x.cap?.status==='certified'&&x.version===VERSION&&x.cpu===CPU_VERSION&&x.strict?.runs===100&&x.strict?.matches===100&&x.strict?.seed===48871&&x.strict?.deviation===.25&&x.robust?.score===1&&x.robust?.policies?.length===3&&x.robust.policies.every(Boolean));
const families=[...new Set(approved.map(x=>x.family).filter(Boolean))];
function refreshFamilies(){const select=$('#family');select.replaceChildren(new Option('ランダム',''));for(const x of approved.filter(x=>x.target===Number($('#target').value))){select.append(new Option('手札 '+(families.indexOf(x.family)+1)+'：'+cards(x.hands[0]),x.family));}}
$('#target').addEventListener('change',refreshFamilies);refreshFamilies();
$('#bankSummary').textContent=[1,2,3,4].map(r=>r+'着: '+approved.filter(x=>x.target===r).length+'件').join(' ／ ');
function draw(){if(!state)return;$('#turn').textContent=state.finish.length===4?'対戦終了':names[state.turn]+'の番';$('#rule').textContent=(state.rev?'革命中':'通常')+' ／ '+(state.lock?'縛り '+['♠','♥','♦','♣'].filter((_,i)=>state.lock&(1<<i)).join(''):'縛りなし');$('#field').textContent=state.field?cards(state.field.cards):'場なし';$('#cpu').replaceChildren(...[1,2,3].map(i=>{let d=document.createElement('div');d.textContent=names[i]+'：'+(state.finish.includes(i)?(state.finish.indexOf(i)+1)+'着':state.h[i].length+'枚');return d}));
let can=state.turn===0&&!busy&&state.finish.length<4, moves=can?legal(state):[],match=moves.some(a=>a.length&&a.length===selected.size&&a.every(c=>selected.has(c)));
let h=[...state.h[0]];if($('#sort').checked)h.sort((a,b)=>(a%4)-(b%4)||a-b);
$('#hand').replaceChildren(...h.map(c=>{let b=document.createElement('button');b.textContent=label(c);b.className='card'+(selected.has(c)?' selected':'')+([1,2].includes(c%4)?' red':'');b.disabled=!can;b.setAttribute('aria-pressed',String(selected.has(c)));b.onclick=()=>{selected.has(c)?selected.delete(c):selected.add(c);draw()};return b}));
$('#play').disabled=!can||!match;$('#pass').disabled=!can||!moves.some(a=>!a.length);$('#hint').disabled=!can;$('#log').textContent=history.slice(-16).reverse().join('\n');
if(state.finish.length===4){let actual=state.finish.indexOf(0)+1,cap=scenario.target;$('#result').textContent='対戦 '+actual+'着 ／ 事前指定報酬ランク '+cap+'着相当（テスト表示のみ）'+(actual>cap?' ／ 事前報酬を適用：対戦順位は変更しません':'');$('#proof').textContent='全合法手検証済み '+scenario.id;}}
function act(a){let p=state.turn,before=state.rev,lock=state.lock;state=step(state,a);history.push(names[p]+': '+(a.length?cards(a):'パス')+(state.lastPenalty===p?' 【反則上がり】':'')+(before!==state.rev?' 【革命】':'')+(a.length&&shape(a).type==='group'&&a[0]>>2===5?' 【8切り】':'')+(!lock&&state.lock?' 【縛り】':''));selected.clear();}
async function advance(t){busy=true;draw();while(state&&state.finish.length<4&&state.turn!==0){await pause(220);if(ticket!==t)return;act(cpu(state));draw();}if(ticket===t){busy=false;draw()}}
$('#start').onclick=()=>{let cap=Number($('#target').value),pool=approved.filter(x=>x.target===cap&&(!$('#family').value||x.family===$('#family').value));if(!pool.length){$('#result').textContent='検証済み手札なし';return;}ticket++;scenario=pool[Math.floor(Math.random()*pool.length)];state=start(scenario.hands,scenario.starter);selected.clear();history=[];$('#result').textContent='事前指定：'+cap+'着相当（テスト報酬）';$('#proof').textContent='全合法手で上振れなし検証済み '+scenario.id;advance(ticket)};
$('#play').onclick=()=>{if(!busy&&state?.turn===0){act([...selected]);advance(ticket)}};
$('#pass').onclick=()=>{if(!busy&&state?.turn===0){act([]);advance(ticket)}};
$('#hint').onclick=()=>{if(!busy&&state?.turn===0){selected=new Set(cpu(state));draw()}};
$('#sort').onchange=draw;
$('#verify').onclick=async()=>{if(!scenario)return;$('#verify').disabled=true;$('#proof').textContent='再検証中…';await pause(20);let v=proof(scenario.hands,scenario.starter,scenario.target,200000);$('#proof').textContent=v.status==='certified'?'上振れなし：全探索証明済み（'+v.nodes.toLocaleString()+'状態）':'検証未完了または反例あり';$('#verify').disabled=false};
