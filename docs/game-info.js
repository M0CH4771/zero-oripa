import {PAYS as rushPays} from './test-games/rush.js?v=min70';
import {PAYS as fruitPays} from './test-games/fruit.js?v=min70';
import {BLOCKS,VOLATILITY as mineVolatility} from './test-games/mine.js?v=min70';
import {FEATURE_CONFIG,GODS_PAYS,DOGS_PAYS,DWARF_CHEST_WEIGHTS,dwarfUpgradeTable} from './test-games/features.js?v=quest73';
const fmt=n=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:4});
const coin=n=>fmt(n)+' C';
const order=['rush','fruit','mine','plinko','gods','dogs','train','dwarf'];
const icon=(theme,id)=>{if(['gods','dogs','train','dwarf'].includes(theme)){const n=Number(id.slice(1)),cols=['gods','dwarf'].includes(theme)?4:3;if(theme==='dogs'&&n>=9)return `<b class="info-symbol">${['A','K','Q','J','10'][n-9]}</b>`;return `<i class="info-symbol" style="background-image:url(./assets/anime/${theme}/${theme==='train'?'atlas':'atlas-v2'}.webp);background-size:${cols*100}% 300%;background-position:${n%cols*100/(cols-1)}% ${Math.floor(n/cols)*50}%"></i>`;}return `<img class="info-symbol" src="./assets/anime/${theme}/${id}.webp" alt="" loading="lazy">`;};
const table=(headers,rows)=>`<div class="info-scroll"><table class="info-table"><thead><tr>${headers.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(s=>`<td>${s}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const section=(title,body)=>`<section class="info-section"><h3>${title}</h3>${body}</section>`;
const card=(title,description)=>`<div class="info-card"><b>${title}</b><p>${description}</p></div>`;
const rules={
 rush:['10フリースピン','同じ宝石が盤面のどこでも8個以上で配当。消えた後に落ちてくる宝石でも連鎖します。'],
 fruit:['10〜30フリースピン','同じお菓子が縦・横に5個以上つながると配当。消えたマスの倍率が育ちます。'],
 mine:['5回の採掘から開始','つるはしで真下の鉱石を削り、壊した鉱石の配当を獲得。列を掘り切ると宝箱が開きます。'],
 plinko:['1〜1,000球','12段固定。リスク、球数、1球の消費Cを設定します。ボールが落ちた枠の表示Cが配当です。'],
 gods:['15フリースピン','同じ宝石が8個以上で配当・連鎖。倍率オーブを当たりスピンで集めると累積倍率が上昇します。'],
 dogs:['2種類のボーナス','左端から隣接する3リール以上で同じ絵柄がそろうと配当。リールの高さは毎回変わります。'],
 train:['3リスピン','コインを固定し、空きマスだけ再抽選。新しいコインが入るとリスピン数が戻ります。'],
 dwarf:['10スピンから冒険開始','宝箱を集め、ゴブリン・トロール・ドラゴンの順に戦います。勝利すると宝箱の獲得Cが増え、次のステージへ。']
};
export function gameInfoHtml(game,rate,volatility='normal'){const [start,intro]=rules[game]||rules.rush;const unit=rate/100;const idx=order.indexOf(game),max=FEATURE_CONFIG[game]?.max??50;
 let out=`<div class="game-info"><div class="info-hero" style="--ix:${idx%4*100/3}%;--iy:${Math.floor(idx/4)*100}%"><span>${start}</span></div>${section('基本ルール',`<p>${intro}</p><p class="info-note">${game==='plinko'?'1球の消費':'1ゲームの消費'}：<b>${coin(rate)}</b>　${game==='plinko'?'':'最大配当：<b>'+coin(max*rate)+'</b>'}</p>`)} `;
 if(['rush','fruit','gods','dogs'].includes(game)){const pays=({rush:rushPays,fruit:fruitPays,gods:GODS_PAYS,dogs:DOGS_PAYS})[game],theme=game==='rush'?'gems':game;const heads=game==='fruit'?Array.from({length:11},(_,i)=>i===10?'15+':i+5):game==='dogs'?[3,4,5,6]:['8〜9','10〜11','12+'];out+=section('シンボル配当表',`<p>現在の消費Cでの${game==='dogs'?'1 WAYSあたりの':'倍率適用前の'}配当。最終獲得Cはゲーム内で集計・整数化します。</p>${table(['絵柄',...heads],Object.entries(pays).reverse().map(([id,v])=>[icon(theme,id),...v.map(x=>coin(x*unit))]))}`);}
 if(game==='rush')out+=section('特殊シンボル',card('魔法のオーブ ×2〜100','配当が成立したスピンで出たオーブの倍率を合計して、そのスピンの連鎖配当に掛けます。配当がない場合は適用されません。')+card('スキャッター（魔法の杖）','3個以上で＋5回。4／5／6個以上は配当計算単位の3／5／100倍。最大120回。')+card('計算例',`連鎖 ${coin(unit*5)} × オーブ合計10 = ${coin(unit*50)}。`));
 if(game==='fruit')out+=section('倍率スポット',card('同じマスで繰り返し配当','初回は印がつき、以降×2・×4・×8…最大×128へ。成立グループに含まれる倍率を合計して適用します。')+card('金のりんご','3／4／5／6／7個で10／12／15／20／30回。追加時も同じ回数。最大120回。')+card('計算例',`${coin(unit*2)} のグループに×2と×4があると、合計×6で ${coin(unit*12)}。`));
 if(game==='mine')out+=section('鉱石配当表',table(['鉱石','HP','破壊時'],Object.entries(BLOCKS).map(([id,x])=>[icon('mine',id)+' '+x.name,x.hp,id==='Q'?'ランダム':coin(rate*(mineVolatility[volatility]||mineVolatility.normal).scale*.994*x.v)])))+section('アイテムと宝箱',card('つるはし','数字1／2／3／5／7の回数だけ削ります。HPが0になると破壊。')+card('強化の書・ダイナマイト・スター','同列のつるはしを5または7に強化。ダイナマイトは3×3の範囲に2ダメージ。スターで＋1回、最大20回。')+card('宝箱倍率','開いた宝箱は掛け算。例：×2と×4を開けば採掘合計に×8。'));
 if(game==='gods')out+=section('特殊シンボル',card('倍率オーブ ×2〜500','当たりスピンに出たオーブが累積倍率に加算されます。配当がない場合は不発です。')+card('スキャッター','開始時4個で15回。フリースピン中3個以上で＋5回。4／5／6個は配当計算単位の3／5／100倍。')+card('計算例',`累積倍率×10なら、連鎖 ${coin(unit*5)} は ${coin(unit*50)}。`));
 if(game==='dogs')out+=section('WILDとボーナス',card('STICKY WILDS','7／12／15／20回。出現したワイルドが固定されます。')+card('RAINING WILDS','15／18／25／30回。各スピンでワイルドを追加。')+card('WAYS配当','WILDは2〜5リールに出現し、通常絵柄を代用。組み合わせに含まれる倍率付きWILDは掛け算。再トリガーなし。'));
 if(game==='train')out+=section('特殊コイン', [['PAYER','他のコインへ自分の数値を加算'],['COLLECTOR','他のコインの合計を自分に加算'],['COLLECTOR/PAYER','集金と配布を両方行う'],['SNIPER','選ばれたコインを2倍'],['NECROMANCER','使用済み特殊コインを再起動'],['RESET PLUS','リセット回数＋1']].map(([a,b])=>card(a,b)).join('')+card('貨車拡張・最終配当',`最大7列、全マスが埋まると合計×2。通常コイン×1〜10、金コイン×20〜200。合計×100なら ${coin(unit*100)}。P付きは繰り返し発動。`));
 if(game==='dwarf')out+=section('3連戦',table(['累計スピン','敵','勝利報酬'],[[10,'ゴブリン','＋10回'],[20,'トロール','＋20回'],[40,'ドラゴン','＋30回']])+`<p>敗北で終了。ドラゴン撃破後は70回まで最終宝箱ラッシュ。</p>`)+section('勝利で宝箱の配当アップ',`<p>開始時は宝箱×1につき ${coin(unit)}。バトルに勝つと、×1あたりの獲得Cが増えます。例えば＋${coin(unit*.5)} を引けば、以降は×1につき ${coin(unit*1.5)} になります。</p>${table(['敵','宝箱×1あたりの増加C'],['Goblin','Troll','Dragon'].map((n,i)=>[['ゴブリン','トロール','ドラゴン'][i],dwarfUpgradeTable(rate,n).values.map(v=>'+'+fmt(v)).join(' / ')]))}`)+section('宝箱倍率',`<p>ゲーム開始直後の獲得Cの例です。勝利後は増えた金額を使って計算します。</p>`+table(['宝箱倍率','開始時の獲得C'],Object.keys(DWARF_CHEST_WEIGHTS).map(x=>['×'+x,coin(unit*x)]))+card('計算例',`宝箱×1の獲得Cが ${coin(unit*1.5)} に増えたら、×10の宝箱は ${coin(unit*15)}。`));
 if(game==='plinko')out+=section('配当の読み方',card('リスクの違い','LOWは小さな配当を受け取りやすく、MEDIUMは中程度の変動、HIGHは0Cの枠もある大きな変動です。いずれも配当表RTPは約90%。最大倍率はLOW 11.01倍、MEDIUM 29.2倍、HIGH 101.05倍。')+card('着地枠','枠の数字は倍率ではなく、現在の消費Cでの獲得コインです。')+card('複数球','全ボールの配当を合計します。合計0Cの場合は1C。配当上限なし。'));
 return out+section('配当・遊び方の注意',`<p>各ゲームは無料テストコイン専用。購入・換金・実物景品はありません。最終配当は最低1C。RTPは長期平均の目標値（${game==='plinko'?'配当表 約90%':'約97%'}）で、個々の結果を保証するものではありません。</p>`)+`</div>`;
}
