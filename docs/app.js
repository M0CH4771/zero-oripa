// ゼロ円オリパ フロントエンド（ビルド不要の素のJS）
import {gameInfoHtml} from './game-info.js?v=plinko89';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString();
const yen = (n) => (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n)).toLocaleString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// iOS Safari のピンチジェスチャーも、ゲーム画面に限って拡大を防ぐ。
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, event => {
    if (document.body.classList.contains('gamemode')) event.preventDefault();
  }, { passive: false });
}
const RANK_NAME = { S: 'S賞', A: 'A賞', B: 'B賞', C: 'C賞', D: 'D賞', LO: 'ラストワン賞', KB: 'キリ番賞' };
const RANK_COLOR = { S: 'var(--S)', A: 'var(--A)', B: 'var(--B)', C: 'var(--C)', D: 'var(--D)', LO: 'var(--LO)', KB: '#4ee0e0' };

let CFG = {};
let ME = null;      // { user, stats, claims }
let busy = false;

async function api(path, data) {
  const opt = data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  const res = await fetch(path, { credentials: 'same-origin', ...opt });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(j.error || '通信エラーが発生しました');
    err.status = res.status;
    throw err;
  }
  return j;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}
function sheet(html) {
  $('#sheet').innerHTML = html;
  $('#overlay').classList.add('on');
  return $('#sheet');
}
function closeSheet() { $('#overlay').classList.remove('on'); }
$('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay' && !busy) closeSheet(); });

async function refreshMe() {
  ME = await api('/api/me');
  const u = ME.user;
  $('#wallet').hidden = !u;
  $('#guestBtns').hidden = !!u;
  if (u) $('#coinNum').textContent = num(u.coins);
  return ME;
}
function setCoins(c) { if (ME?.user) { ME.user.coins = c; $('#coinNum').textContent = num(c); } }
function needLogin() { if (!ME?.user) { openLogin(); return true; } return false; }

// ===== ログイン（電話番号SMS認証） =====
function openLogin() {
  const s = sheet(`
    <h3>電話番号でログイン</h3>
    <p class="muted" style="text-align:center">1つの電話番号につき1アカウントです。<br>番号はそのまま保存せず、暗号化した形でのみ使います。</p>
    <div id="step1">
      <label class="lbl">携帯電話番号</label>
      <input class="field" id="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="09012345678">
      <div class="btns"><button class="btn" id="sendBtn">SMSで認証コードを送る</button></div>
    </div>
    <div id="step2" hidden>
      <label class="lbl">SMSで届いた6桁のコード</label>
      <input class="field" id="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">
      <p class="muted" id="devNote"></p>
      <div class="btns"><button class="btn" id="verifyBtn">ログイン</button><button class="btn ghost" id="resendBtn">コードを再送する</button></div>
    </div>`);
  const send = async () => {
    try {
      const r = await api('/api/auth/send', { phone: $('#phone', s).value });
      $('#step1', s).hidden = true;
      $('#step2', s).hidden = false;
      $('#devNote', s).textContent = r.dev || '';
      $('#code', s).focus();
    } catch (e) { toast(e.message); }
  };
  $('#sendBtn', s).onclick = send;
  $('#resendBtn', s).onclick = send;
  $('#verifyBtn', s).onclick = async () => {
    try {
      const r = await api('/api/auth/verify', { phone: $('#phone', s).value, code: $('#code', s).value });
      await refreshMe();
      closeSheet();
      if (r.is_new) toast(`登録ボーナス ${num(CFG.signup_bonus)}コイン！`);
      if (!ME.user.nickname_set) openNickname(true);
      route();
    } catch (e) { toast(e.message); }
  };
}
// 招待リンク（?i=コード）で来た人のコードを覚えておく
const urlInvite = (() => {
  try {
    const c = new URLSearchParams(location.search).get('i');
    if (c) sessionStorage.setItem('zo-invite', c);
    return sessionStorage.getItem('zo-invite') || '';
  } catch { return ''; }
})();
function openNickname(first) {
  const inv = first && ME.invite?.can_enter;
  const s = sheet(`
    <h3>${first ? 'ようこそ！' : 'ニックネーム変更'}</h3>
    <label class="lbl">ニックネーム（ランキングと速報に表示・12文字まで）</label>
    <input class="field" id="nick" maxlength="12" value="${esc(ME.user.nickname)}">
    ${inv ? `<label class="lbl">招待コード（お持ちの方・任意）</label>
      <input class="field" id="invCode" maxlength="12" autocapitalize="characters" value="${esc(urlInvite)}" placeholder="例：AB3CD7EF">
      <p class="muted" style="margin-top:4px">入力すると +${num(CFG.invite_bonus_new)}コイン</p>` : ''}
    <div class="btns"><button class="btn" id="saveNick">決定</button></div>`);
  $('#saveNick', s).onclick = async () => {
    try {
      await api('/api/me', { nickname: $('#nick', s).value });
      const code = inv ? $('#invCode', s).value.trim() : '';
      if (code) {
        try { const r = await api('/api/invite', { code }); toast(`招待ボーナス +${num(r.amount)}コイン！`); }
        catch (e) { toast(e.message); return; }
      }
      await refreshMe(); closeSheet(); route();
    } catch (e) { toast(e.message); }
  };
}
$('#loginBtn').onclick = openLogin;
$('#signupBtn').onclick = openLogin;
$('#wallet').onclick = openEarn;
function openEarn() {
  if(CFG.dev){location.hash='#earn';return;}
  const u = ME.user;
  if (!u) return openLogin();
  const canAd = CFG.ad_unit || CFG.dev;
  const s = sheet(`<div class="sheet-brand-icon">${brandIcon('coin')}</div><h3>コインを貯める</h3>
    <p class="muted" style="text-align:center">コインはすべて無料。購入はできません。</p>
    <div class="btns">
      <button class="btn gold" id="eBonus">ログインボーナス<small>全7機種から1日1回・1,000 C相当</small></button>
      ${canAd ? `<button class="btn blue" id="eAd" ${u.ad_today >= u.ad_max ? 'disabled' : ''}>広告を見て +${num(u.ad_reward)}<small>今日 ${u.ad_today}/${u.ad_max}回</small></button>` : ''}
      <button class="btn" id="eInv">友だちを招待して +${num(CFG.invite_bonus_inviter)}<small>招待した人が${CFG.invite_required_draws}口引いたらもらえます</small></button>
      <button class="btn ghost" id="eNo">閉じる</button>
    </div>`);
  $('#eBonus', s).onclick = () => { closeSheet(); claimBonus(); };
  $('#eAd', s) && ($('#eAd', s).onclick = () => { closeSheet(); watchAd(); });
  $('#eInv', s).onclick = () => { closeSheet(); location.hash = '#invite'; };
  $('#eNo', s).onclick = closeSheet;
}

// ===== コインを貯める =====
async function claimBonus() {
  location.hash='#bonus';
}

let gptLoaded;
function loadGpt() {
  if (gptLoaded) return gptLoaded;
  gptLoaded = new Promise((resolve, reject) => {
    window.googletag = window.googletag || { cmd: [] };
    const sc = document.createElement('script');
    sc.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    sc.async = true;
    sc.onload = resolve;
    sc.onerror = () => reject(new Error('広告を読み込めませんでした（広告ブロッカーをオフにしてください）'));
    document.head.appendChild(sc);
  });
  return gptLoaded;
}
function showRewarded(path) {
  return new Promise((resolve, reject) => {
    loadGpt().then(() => {
      googletag.cmd.push(() => {
        const slot = googletag.defineOutOfPageSlot(path, googletag.enums.OutOfPageFormat.REWARDED);
        if (!slot) return reject(new Error('この端末では広告を表示できません'));
        slot.addService(googletag.pubads());
        const pa = googletag.pubads();
        let granted = false, done = false;
        const finish = (err) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          pa.removeEventListener('rewardedSlotReady', onReady);
          pa.removeEventListener('rewardedSlotGranted', onGranted);
          pa.removeEventListener('rewardedSlotClosed', onClosed);
          pa.removeEventListener('slotRenderEnded', onRender);
          googletag.destroySlots([slot]);
          err ? reject(err) : resolve();
        };
        const onReady = (e) => { if (e.slot === slot) e.makeRewardedVisible(); };
        const onGranted = (e) => { if (e.slot === slot) granted = true; };
        const onClosed = (e) => { if (e.slot === slot) finish(granted ? null : new Error('最後まで見るとコインがもらえます')); };
        const onRender = (e) => { if (e.slot === slot && e.isEmpty) finish(new Error('今は表示できる広告がありません。時間をおいてお試しください')); };
        const timer = setTimeout(() => finish(new Error('今は表示できる広告がありません')), 15000);
        pa.addEventListener('rewardedSlotReady', onReady);
        pa.addEventListener('rewardedSlotGranted', onGranted);
        pa.addEventListener('rewardedSlotClosed', onClosed);
        pa.addEventListener('slotRenderEnded', onRender);
        googletag.enableServices();
        googletag.display(slot);
      });
    }).catch(reject);
  });
}
async function fakeAd(sec) {
  const s = sheet(`<div class="adbox"><h3>テスト広告</h3><p class="muted">開発モードの仮の広告です</p><div class="count" id="cnt">${sec}</div></div>`);
  busy = true;
  for (let i = sec; i > 0; i--) { $('#cnt', s).textContent = i; await sleep(1000); }
  busy = false;
  closeSheet();
}
async function watchAd() {
  if (needLogin() || busy) return;
  try {
    const st = await api('/api/ad/start', {});
    const t0 = Date.now();
    if (CFG.ad_unit) await showRewarded(CFG.ad_unit);
    else await fakeAd(st.min_seconds);
    const wait = st.min_seconds * 1000 - (Date.now() - t0);
    if (wait > 0) await sleep(wait + 300);
    const r = await api('/api/ad/claim', { token: st.token });
    await refreshMe();
    toast(`+${num(r.amount)}コイン獲得！`);
    route();
  } catch (e) { busy = false; toast(e.message); }
}

// ゲームの名前と、スタート画面の説明
const GAME_TITLE = { rush: ['ZERO', 'RUSH'], fruit: ['ZERO', 'FRUITS'], mine: ['ZERO', 'MINE'],plinko:['ZERO','PLINKO'],gods:['ZERO','GODS'],dogs:['ZERO','DOGS'],train:['ZERO','TRAIN'],dwarf:['ZERO','DWARF'] };
const CUSTOM_GAME_LOGOS=new Map([['rush','gems'],['fruit','fruit'],['mine','mine'],['plinko','plinko'],['gods','gods'],['dogs','dogs'],['train','train'],['dwarf','dwarf']]);
const LOGO_REV='logos48';
const BRAND_ASSET='./assets/brand/';
const brandIcon=(name,extra='')=>`<img class="brand-icon ${extra}" src="${BRAND_ASSET}${name}.webp" alt="" decoding="async">`;
const brandMasthead=(label,title,desc,icon)=>`<section class="brand-masthead"><div><span>${label}</span><h1>${title}</h1><p>${desc}</p></div>${brandIcon(icon,'masthead-icon')}</section>`;
const FEATURE_CONFIG=window.FEATURE_CONFIG||{};
const isFeature=g=>Boolean(FEATURE_CONFIG[g]);
const featureBounds=g=>`RTP目標97%・最低1C・最高${FEATURE_CONFIG[g].max}倍`;
const gameName = (g) => (GAME_TITLE[g] || GAME_TITLE.rush).join(' ');
// 文字ロゴはゲームの文字と同じ立体文字で描いて画像にする（フォントの読み込み後に描き直す）
const TITLE_COLORS = {
  rush: { colors: ['#fff6ff', '#ff8ae0', '#c22aff', '#6a10c8'], deep: '#2a0650', mid: '#5a1a9a', stroke: '#1a0638' },
  fruit: { colors: ['#fffbe0', '#ffd23a', '#ff7a1a', '#e8283a'], deep: '#5a0a00', mid: '#a82a00', stroke: '#3a0800' },
  mine: { colors: ['#fffbe8', '#ffd86a', '#e0921a', '#8a4a10'], deep: '#3a1a00', mid: '#7a3a08', stroke: '#2a1000' },
};
function titleHtml(g, h = 40) {
  const [a, b] = GAME_TITLE[g] || GAME_TITLE.rush;
  if(CUSTOM_GAME_LOGOS.has(g))return `<img class="zt-img custom-game-logo" src="./assets/anime/${CUSTOM_GAME_LOGOS.get(g)}/logo.webp?v=${LOGO_REV}" alt="${esc(a+' '+b)}" style="height:${h}px;width:auto;max-width:100%;object-fit:contain">`;
  const style = TITLE_COLORS[g] || TITLE_COLORS.rush;
  const W = Math.round(h * 3.4), H = h, k = 2;
  const c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
  const x = c.getContext('2d'); x.scale(k, k);
  ZG.scene.text3d(x, a, W / 2, H * 0.2, H * 0.28, { colors: ['#ffffff', '#e8eeff', '#a8bce8'], deep: '#1a2040', mid: '#3a4a7a', stroke: '#101830' });
  ZG.scene.text3d(x, b, W / 2, H * 0.64, H * 0.5, style);
  return `<img class="zt-img" src="${c.toDataURL()}" alt="${esc(a + ' ' + b)}" style="height:${h}px">`;
}
const GAME_NOTE = {
  gods:()=>['15フリースピン・天空の累積倍率',featureBounds('gods')],
  dogs:()=>['最大117,649 WAYS・選べるワイルド',featureBounds('dogs')],
  train:()=>['NEW · LUCKY WAGON — 6列の鉱山を掘り進める',featureBounds('train')],
  dwarf:()=>['3連戦の冒険・最大70スピン',featureBounds('dwarf')],
  rush: (p) => ['最初から10回のフリースピン', `6×5・8個以上で連鎖・RTP目標97%・最低1C・最高50倍`],
  fruit: (p) => ['スキャッター3〜7個で10〜30回のフリースピン', `7×7・5個以上のクラスター・倍率スポット最大128倍・RTP目標97%・最低1C・最高50倍`],
  mine: (p) => ['最初の採掘＋4スピンの合計で、もらえるカードが決まる', `荒さ ${esc(p.volatility_label)}・還元率 約97%・最低1C・最高 ベットの${p.max_mult}倍`],
  plinko:()=>['12段のピンを通るボールの行き先でスコアが決まる','球数を選択・配当表RTP約90%・配当上限なし'],
};

// ===== 画面：ホーム（オリパ一覧） =====
const CATS = [
  { key: 'all', label: 'すべて' },
  { key: 'rush', label: 'スロット', tags: ['rush'] },
  { key: 'low', label: 'お手軽', tags: ['low'] },
  { key: 'high', label: '高還元', tags: ['high'] },
  { key: 'big', label: '一撃', tags: ['big'] },
  { key: 'rank', label: 'ランク限定', tags: ['rank'] },
];
const CHIPS = [
  { key: 'ad', label: 'アド確', test: (p) => p.ad_kaku },
  { key: 'day', label: '1日1回限定', test: (p) => p.per_user_daily === 1 },
  { key: 'lo', label: 'ラストワン賞', test: (p) => !!p.last_one },
  { key: 'kb', label: 'キリ番賞', test: (p) => !!p.kiriban },
  { key: 'few', label: '残りわずか', test: (p) => isFew(p) },
  { key: 'new', label: '新着', test: (p) => isNew(p) },
];
const SORTS = {
  rec: { label: 'おすすめ順', fn: () => 0 },
  few: { label: '残りわずか順', fn: (a, b) => a.remaining / a.total - b.remaining / b.total },
  new: { label: '新着順', fn: (a, b) => b.created_at - a.created_at },
  cheap: { label: '安い順', fn: (a, b) => a.price - b.price },
  high: { label: '高い順', fn: (a, b) => b.price - a.price },
};
const isFew = (p) => p.total && p.remaining > 0 && p.remaining / p.total <= 0.1;
const isNew = (p) => Date.now() - p.created_at < 3 * 86400e3;
let homeCat = 'all', homeSort = 'rec';
const homeChips = new Set();
let slideTimer;

// オリパの絵（画像がなければCSSで描く）
function artHtml(p) {
  const bg = p.kind === 'rush' ? 'bg-rush' : ['daily', 'new', 'low', 'high', 'big', 'rank'].includes(p.tag) ? 'bg-' + p.tag : 'bg-default';
  if (p.image) return `<div class="art" style="background:url('${esc(p.image)}') center/cover"></div>`;
  if(p.kind==='rush'&&CUSTOM_GAME_LOGOS.has(p.game))return `<div class="art brand-game-cover cover-${p.game}" style="--key-art:url('${BRAND_ASSET}cover-${p.game}.webp')"><span class="ribbon">${esc(p.badge||gameName(p.game))}</span><div class="feature-cover-title">${titleHtml(p.game,104)}</div>${p.locked?`<div class="lock">🔒 ${esc(p.locked)}</div>`:''}</div>`;
  if (p.kind === 'rush') return `<div class="art anime-cover art-${p.theme}" style="background-image:url('./assets/anime/${p.theme}/bg.webp')">
    ${p.badge ? `<span class="ribbon">${esc(p.badge)}</span>` : '<span></span>'}
    <img class="anime-cover-logo" src="./assets/anime/${p.theme}/logo.webp?v=${LOGO_REV}" alt="${esc(p.name)}">
    <div class="gems">${themeIcons(p.theme)}</div>
    ${p.locked ? `<div class="lock">🔒 ${esc(p.locked)}</div>` : ''}
  </div>`;
  return `<div class="art ${bg}">
    ${p.badge ? `<span class="ribbon">${esc(p.badge)}</span>` : '<span></span>'}
    <div><div class="ttl">${esc(p.name)}</div>${p.top ? `<div class="sub">最高賞 ${esc(p.top.name)}</div>` : ''}</div>
    <div class="fan"><i>A</i><i>B</i><i>S</i></div>
    ${p.locked ? `<div class="lock">🔒 ${esc(p.locked)}</div>` : ''}
  </div>`;
}
function tagsHtml(p) {
  const t = [];
  if (p.tag === 'new') t.push('<span class="tg pink">新規登録限定</span>');
  if (p.per_user_daily === 1) t.push('<span class="tg green">1日1回</span>');
  if (p.min_rank_name) t.push(`<span class="tg yellow">${esc(p.min_rank_name)}以上</span>`);
  if (p.ad_kaku) t.push('<span class="tg red">アド確</span>');
  if (isNew(p)) t.push('<span class="tg">新着</span>');
  if (isFew(p)) t.push('<span class="tg">残りわずか</span>');
  if (p.last_one) t.push('<span class="tg">ラストワン</span>');
  if (p.kiriban) t.push('<span class="tg">キリ番</span>');
  return t.slice(0, 4).join('');
}
function barClass(p) { const r = p.total ? p.remaining / p.total : 0; return r <= 0.1 ? 'low' : r <= 0.4 ? 'mid' : ''; }
function packCard(p) {
  if (p.kind === 'rush') {
    return `<a class="pcard game-card game-${esc(p.theme)}" href="#pack-${p.id}">
      <div class="ptags"><span class="tg red">${gameName(p.game)}</span><span class="tg game-rtp">${p.game==='plinko'?'配当表RTP 約90%':'目標RTP 97%'}</span></div>
      <div class="pimg">${artHtml(p)}</div>
      <div class="pinfo">
        <div class="pprice"><span class="coin-ico">C</span>${num(p.rates[0])}<small>〜${num(p.rates[p.rates.length - 1])} /1回</small></div>
        <div class="premain"><div class="muted" style="font-weight:400">${num(p.plays)}回プレイ</div></div>
      </div>
      <span class="pcta ${p.locked && ME.user ? 'lock' : ''}">${esc(!ME.user ? '新規会員登録して挑戦' : p.locked || `${gameName(p.game)}に挑戦する`)}</span>
    </a>`;
  }
  const cta = !ME.user ? '新規会員登録してガチャる' : p.locked ? p.locked : 'ガチャを引く';
  return `<a class="pcard" href="#pack-${p.id}">
    <div class="ptags">${tagsHtml(p)}${p.effect === 'tumble' ? '<span class="tg hot">🎰 連鎖スロット</span>' : p.effect === 'slot' ? '<span class="tg hot">🎰 3リール</span>' : ''}</div>
    <div class="pimg">${artHtml(p)}${p.min_value ? `<span class="minguar">最低保証 <span class="coin-ico">C</span><b>${num(p.min_value)}</b></span>` : ''}</div>
    <div class="pinfo">
      <div class="pprice">${p.price ? `<span class="coin-ico">C</span>${num(p.price)}<small>/1回</small>` : '<span class="free">無料</span><small>/1日1回</small>'}</div>
      <div class="premain">残り ${num(p.remaining)} / ${num(p.total)}<div class="rbar ${barClass(p)}"><i style="width:${p.total ? (p.remaining / p.total) * 100 : 0}%"></i></div></div>
    </div>
    <span class="pcta ${p.locked && ME.user ? 'lock' : ''}">${esc(cta)}</span>
  </a>`;
}
function slidesData() {
  const u = ME.user;
  return [
    u ? { bg: 'bg-daily', h: u.bonus_available ? '今日のログボ<br>受け取れます' : '本日の無料ゲーム<br>利用済み', p: `7機種から毎日1回 · 1,000 C相当を無料で`, deco: '📅', go: 'bonus' }
      : { bg: 'bg-new', h: '登録だけで<br>' + num(CFG.signup_bonus) + 'コイン', p: '電話番号で無料登録。お金は1円もかかりません', deco: '🎁', go: 'signup' },
    { bg: 'bg-high', h: '招待すると<br>おたがいにコイン', p: `招待された人 +${num(CFG.invite_bonus_new)}・招待した人 +${num(CFG.invite_bonus_inviter)}`, deco: '🤝', go: 'invite' },
    { bg: 'bg-big', h: '連鎖スロットで<br>オリパを引こう', p: '8個そろうと消えて連鎖。倍率とフリースピンも', deco: '🎰', go: 'guide' },
    { bg: 'bg-rank', h: '発送ポイント<br>ランキング', p: '月間上位の方にBOXをプレゼント', deco: '🏆', go: 'ranking' },
  ];
}
function carouselHtml() {
  const s = slidesData();
  return `<div class="carousel"><div class="slides" id="slides">${s.map((x) =>
    `<div class="slide ${x.bg}" data-go="${x.go}"><h3>${x.h}</h3><p>${esc(x.p)}</p><span class="deco">${x.deco}</span></div>`).join('')}</div>
    <div class="dots" id="dots">${s.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></div>`;
}
function bindCarousel() {
  const el = $('#slides');
  if (!el) return;
  const n = el.children.length;
  const w = () => el.children[0].offsetWidth + 8;
  const cur = () => Math.round(el.scrollLeft / w());
  el.addEventListener('scroll', () => { [...$('#dots').children].forEach((d, i) => d.classList.toggle('on', i === cur())); }, { passive: true });
  clearInterval(slideTimer);
  slideTimer = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(slideTimer);
    el.scrollTo({ left: ((cur() + 1) % n) * w(), behavior: 'smooth' });
  }, 4500);
  [...el.children].forEach((s) => (s.onclick = () => {
    const g = s.dataset.go;
    if (g === 'bonus') claimBonus();
    else if (g === 'signup') openLogin();
    else location.hash = '#' + g;
  }));
}
function earnStrip() {
  const u = ME.user;
  if (!u) return '';
  const canAd = CFG.ad_unit || CFG.dev;
  return `<div class="earn-strip">
    <button id="bonusBtn" class="${u.bonus_available?'hot':''}">${brandIcon('chest')}${u.bonus_available?'ログインボーナス 1回':'ログボ利用済み'}</button>
    <button id="adBtn">${brandIcon('coin')}ポイ活・広告で貯める</button>
    <button id="invBtn">${brandIcon('nav-me')}友だち招待</button>
  </div>`;
}
async function viewHome() {
  const { packs } = await api('/api/packs');
  const cat = CATS.find((c) => c.key === homeCat) || CATS[0];
  let shown = packs.filter((p) => !cat.tags || cat.tags.includes(p.tag));
  for (const k of homeChips) { const c = CHIPS.find((x) => x.key === k); shown = shown.filter(c.test); }
  shown = shown.slice().sort(SORTS[homeSort].fn);
  // 通常ロビーと毎日1回の無料ゲームは別タブに分離。
  const featureOn = homeCat === 'all' && !homeChips.size && homeSort === 'rec';
  const rushes = featureOn ? shown.filter((p) => p.kind === 'rush') : [];
  const rest = featureOn ? shown.filter((p) => !rushes.includes(p)) : shown;
  $('#view').innerHTML = `
    ${ME.user ? '' : `<div class="notice">🎁 新規登録で ${num(CFG.signup_bonus)}コインプレゼント！ 完全無料</div>`}
    <section class="lobby-hero"><div class="hero-copy"><span class="hero-kicker">ZERO ORIPA / GAME LOBBY</span><h1>ゼロ円から、<br>新しい冒険へ。</h1><p>7つのゲーム・オリパを無料で体験。</p><span class="hero-note">TEST EDITION · 実物景品なし</span></div><div class="hero-art" aria-hidden="true"></div></section>
    ${earnStrip()}
    <div class="stickybar">
      <div class="cats">${CATS.map((c) => `<button data-c="${c.key}" class="${c.key === homeCat ? 'on' : ''}">${c.label}</button>`).join('')}</div>
      <div class="chips">${CHIPS.map((c) => `<button data-k="${c.key}" class="${homeChips.has(c.key) ? 'on' : ''}">${c.label}</button>`).join('')}</div>
    </div>
    <div class="toolbar"><span><b>${shown.length}</b> 件</span>
      <select id="sortSel">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === homeSort ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    ${rushes.length ? `<section class="rush-sec"><h4><span>ZERO ORIGINALS · ${rushes.length} GAMES</span>オリジナルゲーム</h4><div class="plist">${rushes.map(packCard).join('')}</div></section>` : ''}
    ${rest.length ? `${featureOn?'<div class="catalog-heading"><span>ORIPA COLLECTION</span><h2>オリパ一覧</h2></div>':''}<div class="plist">${rest.map(packCard).join('')}</div>` : rushes.length ? '' : '<div class="empty">条件に合うオリパはありません</div>'}
    ${siteFooter()}`;
  document.querySelectorAll('.cats button').forEach((b) => (b.onclick = () => { homeCat = b.dataset.c; viewHome(); }));
  document.querySelectorAll('.chips button').forEach((b) => (b.onclick = () => { const k = b.dataset.k; homeChips.has(k) ? homeChips.delete(k) : homeChips.add(k); viewHome(); }));
  $('#sortSel').onchange = (e) => { homeSort = e.target.value; viewHome(); };
  $('#bonusBtn') && ($('#bonusBtn').onclick = ()=>location.hash='#bonus');
  $('#adBtn') && ($('#adBtn').onclick = openEarn);
  $('#invBtn') && ($('#invBtn').onclick = () => (location.hash = '#invite'));
  bindCarousel();
}

// ===== RUSH（スロットのスコアで景品が決まる） =====
// 描画は public/game/（engine.js・art.js・players.js）の Canvas エンジンが担当
let rushRate = null, rushSpeed = 1, lastRush = null, game = null;
const boltHtml = (n) => `<span class="bolt">${'⚡'.repeat(n)}<i>${'⚡'.repeat(5 - n)}</i></span>`;
function tierAt(tiers, score, rate) { let t = tiers[0]; for (const x of tiers) if (score >= x.min * rate) t = x; return t; }
const THEME_ICONS = { gems: ['h4', 'h2', 'l3', 'l1', 'h1'], fruit: ['f7', 'f5', 'f6', 'f1', 'f2'], mine: ['X', 'G', 'H', 'N', 'R'] };
const iconCache = {};
function themeIcons(theme, size = 44) {
  if(isFeature(theme))return [0,1,2,3,4].map(i=>`<i class="feature-sprite" style="width:${size}px;height:${size}px;background-image:url('./assets/anime/${theme}/atlas.webp');background-position:${i%3*50}% ${Math.floor(i/3)*50}%"></i>`).join('');
  if(theme==='plinko')theme='gems';
  if (!window.ZG?.art) return '';
  return (THEME_ICONS[theme] || THEME_ICONS.gems).map((id) => `<img src="./assets/anime/${theme}/${id}.webp" style="width:${size}px;height:${size}px;object-fit:contain" alt="">`).join('');
}

const RULES = {
  gods:['6×5の盤面で同じ絵柄8個以上がそろうと消えて連鎖。','4スキャッターで15回。4/5/6個は基準ベットの3/5/100倍。フリースピン中は3個以上で5回追加。','×2〜500の新規オーブが当たりスピンに出た場合だけ累積倍率を加算・適用。ハズレ時のオーブは不発。',featureBounds('gods')],
  dogs:['6リール・各2〜7段。左から3リール以上の連続一致。最大117,649 WAYS。','3〜6個の肉球でSTICKY（7/12/15/20回）かRAINING（15/18/25/30回）を選択。','ワイルドは2〜5リールのみ。×1〜3の倍率は組み合わせごとに乗算。再トリガーなし。',featureBounds('dogs')],
  train:['6列・最大6段。開始時に2〜4段のコースを選択。コインが着地すると残り3回に戻ります。','上段のトロッコが、同じ列の新規コインを強化。爆弾で岩を除去し、下の宝箱を開けることも。','バッグ・チェスト・ドワーフの回収と、終了時の宝箱追加報酬を合計します。',featureBounds('train')],
  dwarf:['最初のフリースピンは10回。基準Cは消費Cの1%。宝箱の倍率に基準Cを掛けて配当を計算。','10回でゴブリン、20回でトロール、40回でドラゴン。勝利で順に＋10／20／30回。ドラゴン撃破後は最終宝箱ラッシュ。','勝率はゴブリン80%・トロール60%・ドラゴン30%。敗北で終了。','勝利時は基準C強化宝箱も獲得。10,000C消費時、ゴブリン＋10／20／50／70／100C、トロール＋50／60／80／110／200C、ドラゴン＋100／150／200／250／300C（各20%）。以降のスピンのみ適用。宝箱倍率：×1:9.8%、×2:10%、×3:13.6%、×5:25%、×8:12%、×10:11.8%、×15:12.1%、×20:3.9%、×50:1%、×100:0.8%。',featureBounds('dwarf')],
  plinko:['ボールが12段のピンを左右に通過します。','最下段に表示されたコイン数を1球ごとに獲得します。BETに応じて表示が変わります。','全3設定で配当表還元率約90%。0 Cの着地枠もあり、全ボール合計が0Cの場合のみ1Cになります。配当上限なし。'],
  rush: ['テストコインのレートを選び、BONUSで10回のフリースピンを開始します', '6×5の盤面のどこでも、同じ宝石が8個以上あれば配当。消えたあと上から落ちてきて連鎖します',
    '魔法のオーブ（×2〜×100）が出現し、勝った連鎖の合計に倍率を適用します', '魔法の杖が3個以上で5回追加。4／5／6個以上の杖には3／5／100倍の配当（テスト版の最大120回）','1回のボーナス全体の配当は最低1C・最高50倍。還元率目標97%。'],
  fruit: ['BONUSでスキャッター3〜7個が確定し、10／12／15／20／30回のフリースピンを開始します。追加時も同じ回数です', '7×7の盤面で、同じお菓子が縦横に5個以上つながると配当。消えて落ちてきて連鎖します',
    '消えたマスには印が付き、もう一度そこで消えると倍率スポット（×2→×4→…→×128）に。上で消えたつながりの配当に倍率の合計が掛かります',
    '金のりんごが3〜7個で10／12／15／20／30フリースピン追加。フリースピン中は倍率スポットがリセットされません（テスト版の最大120回）','1回のボーナス全体の配当は最低1C・最高50倍。還元率目標97%。'],
  mine: ['テストコインのレートを選び、BONUSから直接採掘を開始。最初の採掘＋4スピン（5回）で1プレイです',
    '上のスロット枠（5×3）にアイテムが止まり、つるはしはそれぞれ真下の列のブロックを上から削ります。数字は削れる回数（1・2・3・5・7回）で、壊れたら次のブロックへ進みます',
    '強化の書：同じ列のつるはしを全部5回に。超強化の書（めったに出ない）：同じ列のつるはしを全部7回に。ダイナマイト：つるはしの後に落ちて、着地点を中心に3×3へ2ダメージ。スター：1個につきスピン+1',
    'ブロックを壊すと配当。石→石炭→鉄→金→ダイヤ→虹鉱石の順に高く、硬くなります。爆発鉱石は壊れると周り8マスに2ダメージ（連鎖）。ハテナは壊すと中身の配当が出ます',
    '掘れ具合は最後まで引き継ぎ。1列を下まで掘り切ると、その列の宝箱が開きます。宝箱は開ける前から色で倍率（青×2 → 緑×5 → 黄×8 → 赤×10）がわかります',
    '開いた宝箱の倍率は掛け算（×2 と ×4 なら ×8）で、最後に配当の合計に掛かります',
    '最終配当が0Cの場合のみ1Cになります。最大はベットの50倍です'],
};
const FEATURES = {
  gods:[['s0','天空の宝石連鎖','累積倍率でスコア増加'],['s9','15フリースピン','スキャッターで追加']],
  dogs:[['s0','MEGAWAYS','6リール・最大117,649通り'],['s6','2種類のワイルド','STICKY / RAINING']],
  train:[['s0','コインをホールド','追加ごとに3回へ戻る'],['s6','鉱山トロッコ','爆破・倍率・回収']],
  dwarf:[['s0','ドワーフのバトル','勝利でスピン追加'],['s5','宝箱の収集','コイン配当']],
  plinko:[['l1','12段のピンボード','ボールの落下を見届けよう'],['h4','着地で獲得コイン確定','テストコインのスコアに反映']],
  rush: [['h4', '8個そろえば消えて連鎖', '盤面のどこでもOK'], ['bomb', 'ボムで最大 ×100', '出たボムの合計が掛かる']],
  fruit: [['f7', '5個つながると消える', '縦横につながったら配当'], ['S', '倍率スポット ×128', '同じマスで消えるほど育つ']],
  mine: [['pick', 'つるはしで真下を掘る', '数字の回数だけ削れる'], ['H', '掘り切ると宝箱', '倍率は掛け算（×2×4＝×8）']],
};
function tiersTable(p, rate) {
  return `<table class="prize-table tier-table">${p.tiers.slice().reverse().map((t) => `<tr data-min="${t.min}"><td><span class="rk rk-${t.rank}">${t.rank}</span></td><td>${esc(t.name)}</td>
    <td class="num">${t.min ? num(Math.ceil(t.min * rate)) + '〜' : '〜'}</td></tr>`).join('')}</table>`;
}

// RUSH のパック詳細（ここからゲームを起動する）
function rushPage(p) {
  if (!p.rates.includes(rushRate)) rushRate = p.rates[0];
  $('#view').innerHTML = `
    <div class="pimg">${artHtml(p)}${p.actual_rtp !== null ? `<span class="rtp-badge">実績還元率 <b>${(p.actual_rtp * 100).toFixed(1)}%</b></span>` : ''}</div>
    <div class="detail-info">
      <div class="ptags" style="padding:0"><span class="tg red">オリジナルゲーム</span><span class="tg game-rtp">${p.game==='plinko'?'配当表RTP 約90%':'目標RTP 97%'}</span><span class="tg">テスト専用</span></div>
      <h1>${esc(p.name)}</h1>
      <div class="kv"><span>${esc(p.badge)}</span><span>${p.actual_rtp !== null ? `この端末の実績 <b>${(p.actual_rtp * 100).toFixed(1)}%</b>（${num(p.plays)}回）` : '実績データなし'}</span></div>
      <div class="kv"><span>最高スコア <b>${num(p.best)}</b></span><span>1プレイ ${num(p.rates[0])}〜${num(p.rates[p.rates.length - 1])} coin</span></div>
      ${p.today_left !== null ? `<div class="kv"><span>今日あと <b>${p.today_left}回</b></span></div>` : ''}
      <div style="display:grid;gap:8px;margin-top:12px">
        ${ME.user ? `<a class="btn" href="#play-${p.id}" ${p.locked ? 'style="pointer-events:none;opacity:.4"' : ''}>ゲームを起動<small>${p.locked ? esc(p.locked) : p.game==='mine'?'直接採掘チャレンジ':p.game==='plinko'?'ボールを1個落とす':p.game==='fruit'?'10〜30回のフリースピン':isFeature(p.game)?GAME_NOTE[p.game](p)[0]:'最初から10回のフリースピン'}</small></a>` : `<button class="btn" id="gReg">新規会員登録して遊ぶ<small>登録で${num(CFG.signup_bonus)}コイン</small></button>`}
        <a class="btn ghost" href="#play-${p.id}-demo">お試しで遊ぶ（無料・記録されません）</a>
      </div>
    </div>
    <div class="card-box"><h2>スコアと景品（ベット ${num(rushRate)} のとき）</h2>${p.game==='plinko'?plinkoInfo(12,'medium'):tiersTable(p, rushRate)}
      <p class="muted" style="margin-top:8px">景品のカードの値段＝スコアです。コインに交換するとスコア分のコイン、発送するとスコアの${Math.round(CFG.ship_rate * 100)}%が発送ポイントになります。</p></div>
    <div class="card-box"><h2>遊び方</h2>${gameInfoHtml(p.game,rushRate,p.volatility)}</div>
    ${siteFooter()}`;
  $('#gReg') && ($('#gReg').onclick = openLogin);
}

// ===== ゲーム画面（全画面・毎回読み込み） =====
let gameCtx = null; // { p, demo, credits, busy }
const SPIN_SVG = '<svg viewBox="0 0 48 48"><path d="M38 17a16 16 0 1 0 2 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M40 6v12H28" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function leaveGame() {
  if (game) { game.destroy(); game = null; }
  ZG.sfx && ZG.sfx.stopBgm();
  document.body.classList.remove('gamemode');
  gameCtx = null;
}
function plinkoInfo(rows,risk){const c=window.plinkoConfig(rows,risk);return `<p class="muted">1球 ${num(rushRate)} C · 配当表還元率 約90% · ${rows}段 / ${risk.toUpperCase()}（左右対称）</p><div class="plinko-paytable"><div class="plinko-payrow head"><span>着地枠</span><span>獲得コイン</span></div>${c.multipliers.slice(0,rows/2+1).map((m,i)=>`<div class="plinko-payrow"><span>${i===rows/2?'中央':`左右・外から${i+1}番目`}</span><b class="plinko-mult ${m>=10?'high':m>=1?'even':m>0?'low':'zero'}">${num(Math.round(rushRate*c.cents[i]/100))} C</b></div>`).join('')}</div>`;}
async function viewGame(id, demo, daily=false) {
  if (!demo && !ME.user) { location.hash = `#play-${id}-demo`; return; }
  const { pack: p } = await api('/api/packs/' + id);
  if (p.kind !== 'rush') { location.hash = '#pack-' + id; return; }
  if(daily){const d=await api('/api/daily');if(!d.available){location.hash='#bonus';return;}}
  if (!p.rates.includes(rushRate)) rushRate = p.rates[0];
  if(daily)rushRate=1000;
  document.body.classList.add('gamemode');
  const theme = ZG.THEME_OF[p.game] || 'gems';
  const normalSpeed = ZG.SPIN_TIMING.normal;
  rushSpeed = normalSpeed;
  gameCtx = { p, demo,daily, count:1,risk:'medium',rows:12,credits: demo ? (p.game==='plinko'?100000:10000000) : ME.user.coins, busy: false, win: 0 };
  $('#view').innerHTML = `
    <div class="gm theme-${theme}" id="gm">
      <canvas id="gcanvas" class="gm-canvas"></canvas>
      <div class="gm-top">
        <button class="gm-icon" id="gmBack" aria-label="もどる">✕</button>
        <div class="gm-logo">${titleHtml(p.game, 58)}</div>
        <button class="gm-icon" id="gmSound" aria-label="音">${ZG.sfx.on ? '🔊' : '🔇'}</button>
      </div>
      <div class="gm-tier" id="rTier" aria-label="現在のカードランク"></div>
      <div class="gm-mode" id="gmMode">${p.game==='mine'?'採掘チャレンジ':p.game==='plinko'?'1球あたりの獲得コイン':p.game==='train'?'貨車リスピン':'フリースピン'}</div>
      <div class="gm-demo">${daily?'DAILY BONUS · 消費0 C':demo ? 'DEMO · 記録なし' : 'FREE PLAY · テストコイン専用'}</div>
      <div class="gm-round-win" id="gmRoundWin" aria-live="polite">${p.game==='plinko'?'<div class="plinko-result-mult"><span>直近1球</span><strong id="plinkoLastCoin">—</strong></div><div class="plinko-result-pay"><span>今回の合計</span><b id="gmRoundAmount">0 C</b></div>':'<div class="round-readout"><span id="gmRoundLabel">'+(p.game==='mine'?'今回の採掘':'今回の配当')+'</span><b id="gmRoundAmount">0 C</b></div>'+(['rush','mine','gods','dogs','train','dwarf'].includes(p.game)?'<div class="round-metric" id="gmMetric" hidden><span id="gmMetricLabel"></span><strong id="gmRoundMultiplier"></strong></div>':'')}</div>
      ${['rush','fruit','gods'].includes(p.game)?'<div class="fruit-detail" id="fruitDetail" aria-label="タンブル配当明細"><span>絵柄別配当</span><div id="fruitDetailItems"></div></div>':''}
      <div class="gm-hud">
        ${p.game==='dwarf'?'<div id="dwarfBase" class="dwarf-base" hidden></div>':''}
        <div class="gm-status" id="gmStatus">プレイ待機中</div>
        <div class="gm-row">
          <div class="gm-box"><span>${demo ? 'デモ残高' : 'コイン残高'}</span><b id="hCoin">0</b></div>
          <div class="gm-box win"><span>${p.game==='mine'?'獲得見込':'累計獲得'}</span><b id="rScore">0</b></div>
          <div class="gm-box"><span>${p.game==='plinko'?'残り球数':p.game==='train'?'残りリスピン':'残りスピン'}</span><b id="rSpin">${p.game==='mine'?5:p.game==='plinko'?1:FEATURE_CONFIG[p.game]?.initial??10}</b></div>
        </div>
        ${p.game==='plinko'? `<div class="plinko-options"><div class="plinko-settings"><label>荒さ<select id="plinkoRisk"><option value="low">LOW・低変動</option><option value="medium" selected>MEDIUM・中変動</option><option value="high">HIGH・高変動</option></select></label><label class="plinko-rtp">配当表RTP<b>約90%</b></label></div><div class="plinko-label">落とす球数</div><div class="plinko-counts"><button data-count="1" class="selected">1</button><button data-count="10">10</button><button data-count="100">100</button><button data-count="custom">自由入力</button></div><input id="plinkoCustom" type="number" min="1" max="1000" value="1" inputmode="numeric" aria-label="球数" hidden><div class="plinko-cost">合計消費 <b id="plinkoCost">0 C</b></div></div>` : ''}
        <div class="gm-ctl">
          <button class="gm-icon sm" id="gmInfo" aria-label="${p.game==='plinko'?'配当一覧・遊び方':'遊び方'}"><b>ⓘ</b><small>${p.game==='plinko'?'配当表':'遊び方'}</small></button>
          <div class="gm-bet"><button class="gm-pm" id="betMinus">−</button>
            <button type="button" id="betSelect" class="gm-betv" aria-label="ベット額を選択"><span>${p.game==='plinko'?'1球の消費 C':'1回の消費 C'}</span><b id="hBet">${num(rushRate)}</b></button>
            <button class="gm-pm" id="betPlus">＋</button></div>
          <button class="gm-spin" id="rPlay" aria-label="${p.game==='plinko'?'落とす':'ボーナス開始'}">${p.game==='plinko'?'<b>落とす</b><small>DROP</small>':SPIN_SVG+'<small>BONUS</small>'}</button>
          <button class="gm-icon sm" id="gmTurbo" aria-label="速度切替"><b>⚡</b><small>NORMAL</small></button>
        </div>
      </div>
      <div class="gm-load" id="gmLoad">
        <div class="gm-load-logo">${titleHtml(p.game, 120)}</div>
        <div class="gm-load-icons">${themeIcons(theme, 56)}</div>
        <div class="gm-bar"><i id="gmBar"></i></div>
        <div class="gm-load-txt" id="gmLoadTxt">読み込み中… 0%</div>
      </div>
    </div>`;
  const setLoad = (k, txt) => { const b = $('#gmBar'); if (b) b.style.width = Math.round(k * 100) + '%'; const t = $('#gmLoadTxt'); if (t) t.textContent = `${txt || '読み込み中…'} ${Math.round(k * 100)}%`; };
  const hud = () => { $('#hCoin').textContent = num(gameCtx.credits); $('#hBet').textContent = num(rushRate); if($('#plinkoCost'))$('#plinkoCost').textContent=num(daily?0:rushRate*gameCtx.count)+' C'; };
  if(p.game==='plinko'){
    const selectors=[...document.querySelectorAll('.plinko-counts button')],input=$('#plinkoCustom');
    const setCount=v=>{gameCtx.count=Math.max(1,Math.min(1000,Math.floor(Number(v)||1)));hud();$('#rSpin').textContent=gameCtx.count;};
    selectors.forEach(b=>{b.disabled=daily;b.onclick=()=>{if(gameCtx.busy||daily)return;selectors.forEach(x=>x.classList.toggle('selected',x===b));input.hidden=b.dataset.count!=='custom';setCount(input.hidden?b.dataset.count:input.value);game?.resize();};});
    const updateBoard=()=>{if(gameCtx.busy)return;gameCtx.risk=$('#plinkoRisk').value;gameCtx.rows=12;$('#plinkoLastCoin').textContent='—';$('#gmRoundAmount').textContent='0 C';game?.configure(window.plinkoConfig(gameCtx.rows,gameCtx.risk));};$('#plinkoRisk').onchange=updateBoard;input.oninput=()=>setCount(input.value);input.onchange=()=>{input.value=gameCtx.count;};
  }
  hud();
  $('#gmBack').onclick = () => { if (gameCtx?.busy) return; location.hash = daily?'#bonus':'#pack-' + p.id; };
  $('#gmSound').onclick = () => { const on = ZG.sfx.toggle(); $('#gmSound').textContent = on ? '🔊' : '🔇'; if (on) { ZG.sfx.unlock(); ZG.sfx.bgm(theme); } else ZG.sfx.stopBgm(); };
  $('#gmTurbo').onclick = () => { const {quick,turbo}=ZG.SPIN_TIMING;rushSpeed = rushSpeed===normalSpeed?quick:rushSpeed===quick?turbo:normalSpeed; $('#gmTurbo').classList.toggle('on', rushSpeed !== normalSpeed);$('#gmTurbo small').textContent=rushSpeed===normalSpeed?'NORMAL':rushSpeed===quick?'QUICK':'TURBO';game && game.setSpeed(rushSpeed); ZG.sfx.play('click'); };
  $('#gmInfo').onclick = () => {
    const s=sheet(`<h3>${esc(p.name)} の遊び方</h3>${gameInfoHtml(p.game,rushRate,p.volatility)}${p.game==='plinko'?'<h3>着地枠の配当表</h3>'+plinkoInfo(gameCtx.rows,gameCtx.risk):''}<div class="btns"><button class="btn ghost" id="infoClose">閉じる</button></div>`);
    $('#infoClose',s).onclick=closeSheet;
  };
  const stepBet = (d) => { if (gameCtx.busy||daily) return; const i = p.rates.indexOf(rushRate); rushRate = p.rates[Math.max(0, Math.min(p.rates.length - 1, i + d))]; hud(); ZG.sfx.play('click'); setRushTier(p, 0); };
  $('#betMinus').onclick = () => stepBet(-1);
  $('#betPlus').onclick = () => stepBet(1);
  $('#betSelect').onclick=()=>{if(gameCtx.busy||daily)return;const s=sheet(`<h3>ベット額を選択</h3><div class="bet-options">${p.rates.map(v=>`<button class="${v===rushRate?'active':''}" data-bet="${v}">${num(v)} C</button>`).join('')}</div><button class="btn ghost" id="betClose">閉じる</button>`);s.querySelectorAll('[data-bet]').forEach(b=>b.onclick=()=>{if(gameCtx.busy)return;rushRate=Number(b.dataset.bet);hud();setRushTier(p,0);ZG.sfx.play('click');closeSheet();});$('#betClose',s).onclick=closeSheet;};
  if(daily){$('#betMinus').disabled=true;$('#betPlus').disabled=true;$('#betSelect').disabled=true;}

  // ---- 読み込み ----
  setLoad(0.02, 'フォント');
  if (document.fonts && document.fonts.load) {
    await Promise.race([Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('40px "Dela Gothic One"', 'あ')]).catch(() => {}), sleep(750)]);
  }
  if (!gameCtx || gameCtx.p !== p) return;
  setLoad(0.12, '画像');
  await loadThemeAssets(theme==='plinko'?'gems':theme, (k) => setLoad(0.12 + k * 0.2, '画像'),theme);
  if (!gameCtx || gameCtx.p !== p) return;
  setLoad(0.32, '背景');
  await sleep(30);
  if (game) game.destroy();
  const gameRegion = (w,h) => {
    const root=$('#gm'),bounds=root.getBoundingClientRect();
    const visibleBottom=el=>el?.getClientRects().length?el.getBoundingClientRect().bottom-bounds.top:0;
    const top=Math.ceil(Math.max(0,...['.gm-top','.gm-tier','.gm-demo','.gm-mode','#gmRoundWin','#fruitDetail'].map(s=>visibleBottom($(s))))+5);
    const bottom=$('.gm-hud')?.getBoundingClientRect().top-bounds.top;
    return {x:0,y:top,w,h:Math.max(80,(Number.isFinite(bottom)?bottom:h-140)-top)};
  };
  const showMetric=(label,value)=>{const metric=$('#gmMetric');if(!metric)return;$('#gmMetricLabel').textContent=label;$('#gmRoundMultiplier').textContent=value;metric.hidden=false;};
  const roundLabel=label=>{const el=$('#gmRoundLabel');if(el)el.textContent=label;};
  game = ZG.createGame($('#gcanvas'), { game: p.game, plinko:p.game==='plinko'?window.plinkoConfig(gameCtx.rows,gameCtx.risk):null, region: gameRegion, getRate:()=>rushRate }, {
    fmt: (v) => num(v),
    onScore: (v, speed) => { rushCountTo(v, speed); setRushTier(p, v); },
    onRoundWin: async (v, speed = rushSpeed) => {const el=$('#gmRoundWin');if(!el)return;const total=$('#rScore')?.closest('.gm-box');if(p.game!=='plinko')$('#gmRoundAmount').textContent=num(Math.round(v*100)/100)+' C';el.classList.add('settled');await sleep((v>0?320:70)*speed);el.classList.remove('settled');total?.classList.add('settled');setTimeout(()=>total?.classList.remove('settled'),350);},
    onBallLand:(v)=>{gameCtx.ballTotal=(gameCtx.ballTotal||0)+v;const el=$('#gmRoundAmount');if(el)el.textContent=num(gameCtx.ballTotal)+' C';const latest=$('#plinkoLastCoin');if(latest&&Number.isFinite(v))latest.textContent=num(v)+' C';},
    onMultiplier:(base,mult)=>{if(p.game==='rush'){roundLabel(base?'倍率適用前':'配当なし');$('#gmRoundAmount').textContent=num(base)+' C';showMetric('適用倍率','×'+num(mult));}},
    onFeatureMetric:(label,value)=>showMetric(label,value),
    onBaseUnit:unit=>{const el=$('#dwarfBase');if(el){el.hidden=false;el.textContent='宝箱×1の獲得C：'+unit.toLocaleString('ja-JP',{maximumFractionDigits:8})+' C';}},
    onSpinWin: (v) => { const el = $('#gmRoundAmount');if(el)el.textContent=num(v)+' C';roundLabel(p.game==='mine'?'今回の採掘':'今回の配当'); },
    onTumble:(groups)=>{const el=$('#fruitDetailItems');if(!el)return;for(const g of groups){const row=document.createElement('span');row.textContent=g.cells.length+'個 · '+(g.mult>1?num(g.base??g.pay)+' ×'+g.mult+' = ':'')+num(g.pay)+' C';if(p.game==='gods'){const i=Number(g.sym.slice(1)),icon=document.createElement('i');icon.style.cssText='width:24px;height:24px;background-image:url(./assets/anime/gods/atlas-v2.webp);background-size:400% 300%;background-position:'+(i%4*100/3)+'% '+(Math.floor(i/4)*50)+'%';row.prepend(icon);}else{const icon=document.createElement('img');icon.src=ZG.art.sprite(theme,g.sym,24).toDataURL();row.prepend(icon);}el.append(row);}el.scrollLeft=el.scrollWidth;},
    onSpin: (n, total) => { if(p.game==='plinko'){if(n===0){gameCtx.ballTotal=0;$('#gmRoundAmount').textContent='0 C';$('#plinkoLastCoin').textContent='—';}}else if(gameCtx.spinIndex!==n){if($('#gmRoundAmount'))$('#gmRoundAmount').textContent='0 C';roundLabel(p.game==='mine'?'今回の採掘':'今回の配当');if(p.game==='rush'&&$('#gmMetric'))$('#gmMetric').hidden=true;if($('#fruitDetailItems'))$('#fruitDetailItems').replaceChildren();} gameCtx.spinIndex=n; $('#rSpin').textContent = String(Math.max(0,total-n)); const el=$('#gmStatus'); if(el) el.textContent=p.game==='plinko'?`着地 ${n} / ${total} 球`:p.game==='train'?`リスピン ${n} 回目`:`スピン ${n} / ${total}`; },
    onRemaining: remaining => {$('#rSpin').textContent=String(Math.max(0,remaining));},
    onMode: (mode) => {const el=$('#gmMode'); if(el)el.textContent=mode==='ENTRY'?'ボーナス開始':mode==='COMPLETE'?'プレイ終了':p.game==='train'?'貨車リスピン':p.game==='mine'?'採掘チャレンジ':'フリースピン'; if(mode==='ENTRY'&&$('#gmMetric'))$('#gmMetric').hidden=true;if(mode==='COMPLETE'){$('#rSpin').textContent='0';if(p.game==='mine')roundLabel('確定獲得');} $('#gm')?.classList.toggle('bonus-mode',mode==='BONUS');},
  });
  game.setSpeed(rushSpeed);
  setLoad(0.4, '絵柄');
  await game.warm((k) => setLoad(0.4 + k * 0.55, '絵柄'));
  if (!gameCtx || gameCtx.p !== p) return;
  game.idle();
  setRushTier(p, 0);
  setLoad(1, '完了');
  await sleep(80);
  // ---- スタート画面 ----
  const feats = FEATURES[p.game || 'rush'];
  const featIcon = (id) => { if(isFeature(theme)){const i=Number(id.slice(1)),g=theme==='gods',cols=g?4:3;return `<i class="feature-sprite" style="width:64px;height:64px;background-image:url('./assets/anime/${theme}/${g||theme==='dogs'?'atlas-v2':'atlas'}.webp');background-size:${cols*100}% 300%;background-position:${i%cols*100/(cols-1)}% ${Math.floor(i/cols)*50}%"></i>`;}const th = id === 'bomb'||theme==='plinko' ? 'gems' : theme; const c = ZG.art.sprite(th, id, 64); return `<img src="${c.toDataURL()}" style="width:${64 + c.pad * 2}px;margin:-${c.pad}px" alt="">`; };
  if (!gameCtx.logo) { const lg = document.querySelector('.gm-logo'); if (lg) lg.innerHTML = titleHtml(p.game, 46); }
  if (p.game === 'mine') $('#rSpin').textContent = '5';
  if(isFeature(p.game))$('#rSpin').textContent=FEATURE_CONFIG[p.game].initial;
  $('#gmLoad').innerHTML = `
    <div class="gm-intro-kicker">ZERO ORIGINALS · FEATURE GAME</div>
    <div class="gm-load-logo">${gameCtx.logo ? `<img src="${gameCtx.logo}" alt="" style="max-height:120px;max-width:100%">` : titleHtml(p.game, 120)}</div>
    <div class="gm-intro-character" aria-hidden="true"></div>
    <div class="gm-feats">${feats.map(([id, t, sub]) => `<div class="gm-feat">${featIcon(id)}<b>${t}</b><span>${sub}</span></div>`).join('')}</div>
    <div class="gm-feat wide"><b>${(GAME_NOTE[p.game] || GAME_NOTE.rush)(p)[0]}</b><span>${(GAME_NOTE[p.game] || GAME_NOTE.rush)(p)[1]}</span></div>
    <button class="gm-start" id="gmStart">PLAY NOW <small>タップしてスタート</small></button>`;
  $('#gmStart').onclick = () => {
    ZG.sfx.unlock(); ZG.sfx.play('click');
    if (ZG.sfx.on) ZG.sfx.bgm(theme);
    try{sessionStorage.setItem('zero-intro-'+theme,'1')}catch{}
    const panel=$('#gmLoad');panel?.classList.add('hide');
    setTimeout(() => panel?.remove(), 180);
  };
  try{if(sessionStorage.getItem('zero-intro-'+theme)==='1')$('#gmLoad')?.remove()}catch{}
  $('#rPlay').onclick = () => {
    if (!gameCtx.busy) return gameSpin();
  };
  $('#gcanvas').onclick = null;
}
// public./assets/manifest.json に書かれた画像（シンボル・背景・キャラ・ロゴ）を読み込んで登録する
let manifestCache = null;
const loadedAssets = new Set();
function loadImg(src) {
  return new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
async function loadThemeAssets(theme, onProgress, logoTheme=theme) {
  try { manifestCache = manifestCache || (await (await fetch('./assets/manifest.json', { cache: 'no-cache' })).json()); } catch { manifestCache = {}; }
  const m = manifestCache[theme] || {};
  const logo = manifestCache[logoTheme]?.logo;
  const url = (f) => (f ? (/^(https?:)?\//.test(f) ? f : `./assets/${f}`) : '');
  const jobs = [];
  for (const [id, f] of Object.entries(m.symbols || {})) if (f) jobs.push(['sym', id, url(f)]);
  if (m.background) jobs.push(['bg', null, url(m.background)]);
  const ch = typeof m.character === 'string' ? { src: m.character } : m.character || {};
  if (ch.src) jobs.push(['char', null, url(ch.src)]);
  const logoSrc=logo?url(logo)+'?v='+LOGO_REV:'';
  if (logoSrc) jobs.push(['logo', null, logoSrc]);
  let done = 0;
  await Promise.all(jobs.map(async ([kind, id, src]) => {
    const img = await loadImg(src);
    done++; onProgress && onProgress(done / jobs.length);
    if (!img) { console.warn('画像を読み込めませんでした:', src); return; }
    if (kind === 'sym') { if (theme === 'mine') ZG.art.imageScale.mine = 1; ZG.art.useImage(theme, id, img, { outline: !!m.outline }); }
    else if (kind === 'bg') ZG.scene.setBackground(theme, img);
    else if (kind === 'char') ZG.scene.setCharacter(theme, img, ch);
    else if (kind === 'logo') document.querySelectorAll('.gm-logo, .gm-load-logo').forEach((el) => (el.innerHTML = `<img src="${src}" alt="${esc(gameName(gameCtx?.p?.game||logoTheme))}" style="max-height:${el.classList.contains('gm-logo') ? 63 : 120}px;max-width:100%;object-fit:contain">`));
  }));
  if (!jobs.length) onProgress && onProgress(1);
  if (logoSrc) gameCtx && (gameCtx.logo = logoSrc);
}
async function gameSpin() {
  if(!gameCtx||gameCtx.busy)return;
  const { p, demo,daily } = gameCtx;
  const count=p.game==='plinko'&&!daily?gameCtx.count:1,cost=rushRate*count;
  if (!demo && !daily && cost > gameCtx.credits) { toast('コインが足りません。ログインボーナスや広告で貯めよう'); return; }
  if (demo && cost > gameCtx.credits) {toast('お試しコインが不足しています。球数を減らしてください');return;}
  gameCtx.busy = true;
  gameCtx.spinIndex = -1;
  if($('#dwarfBase'))$('#dwarfBase').hidden=true;
  if(p.game==='plinko'&&$('#plinkoLastCoin'))$('#plinkoLastCoin').textContent='—';
  const btn = $('#rPlay');
  btn.classList.add('busy');
  $('#gmStatus').textContent = 'プレイ中';
  document.querySelectorAll('.gm-pm, #gmBack, #betSelect').forEach((b) => (b.disabled = true));
  document.querySelectorAll('.plinko-counts button,#plinkoCustom,#plinkoRisk,#plinkoRows').forEach(b=>b.disabled=true);
  try {
    if(daily&&!(await api('/api/daily')).available){location.hash='#bonus';return;}
    let strategy='battle',dogEntry=null;
    if(p.game==='train'&&!daily){strategy=await new Promise(resolve=>{const panel=document.createElement('div');panel.className='dog-choice dog-confirm';panel.innerHTML='<strong>LUCKY WAGON</strong><b>'+num(cost)+' C</b><small>開始時に開く段数を選択</small><div><button data-tier="train2">2段</button><button data-tier="train3">3段</button><button data-tier="train4">4段</button><button data-tier="">取消</button></div>';$('#gm').append(panel);panel.querySelectorAll('button').forEach(b=>b.onclick=()=>{panel.remove();resolve(b.dataset.tier)});});if(!strategy)return;}
    if(p.game==='dogs'){
      if(!daily&&!await new Promise(resolve=>{const panel=document.createElement('div');panel.className='dog-choice dog-confirm';panel.innerHTML='<strong>BUY FREE SPINS</strong><b>'+num(cost)+' C</b><small>1ゲームの消費C</small><div><button data-buy="no">取消</button><button data-buy="yes">確定</button></div>';$('#gm').append(panel);panel.querySelectorAll('button').forEach(b=>b.onclick=()=>{panel.remove();resolve(b.dataset.buy==='yes')});}))return;
      const {dogsEntry}=await import('./test-games/features.js?v=dogs');dogEntry=dogsEntry();strategy=await game.prepareDogs(dogEntry);if(!strategy)return;
    }
    const r = await api(`/api/packs/${p.id}/${daily?'daily':demo ? 'rush-demo' : 'rush'}`, { rate: rushRate,count,risk:gameCtx.risk,rows:gameCtx.rows,strategy,dogEntry });
    gameCtx.credits = demo ? gameCtx.credits - r.cost : r.coins;
    $('#hCoin').textContent = num(gameCtx.credits);
    if (!demo) setCoins(r.coins);
    $('#rScore').dataset.v = '0'; $('#rScore').dataset.displayed='0'; $('#rScore').textContent = '0';
    $('#rTier').dataset.name = ''; setRushTier(p, 0);
    await game.play(r);
    const ratio = r.score / r.rate;
    const lvl = Math.max(0,ZG.winLevel(ratio)-1);
    if (lvl&&p.game!=='dogs') await game.bigWin(lvl, r.score);
    // 結果表示より先に確定値へ同期。カウントアップ中の中間値を残さない。
    cancelAnimationFrame(scoreAnim);
    if($('#rScore')){$('#rScore').dataset.v=String(r.score);$('#rScore').dataset.displayed=String(r.score);$('#rScore').textContent=num(r.score);}
    setRushTier(p,r.score);
    if (demo) { gameCtx.credits += r.score; $('#hCoin').textContent = num(gameCtx.credits); }
    lastRush = { p, r, demo };
    showRushResult(p, r, demo);
    if (r.rank_up) setTimeout(() => toast(`🎉 会員ランクが「${r.rank_up}」に上がりました！`), 600);
    if (!demo) checkLimit(r);
  } catch (e) {
    toast(e.message);
  } finally {
    if ($('#gmStatus')) $('#gmStatus').textContent = 'プレイ終了';
    gameCtx && (gameCtx.busy = false);
    btn.classList.remove('busy');
    document.querySelectorAll('.gm-pm, #gmBack, #betSelect').forEach((b) => (b.disabled = daily&&(b.classList.contains('gm-pm')||b.id==='betSelect')));
    document.querySelectorAll('.plinko-counts button,#plinkoCustom').forEach(b=>b.disabled=daily);document.querySelectorAll('#plinkoRisk,#plinkoRows').forEach(b=>b.disabled=false);
    if (!demo) refreshMe().then(() => { if (gameCtx && !gameCtx.demo && ME.user) { gameCtx.credits = ME.user.coins; $('#hCoin') && ($('#hCoin').textContent = num(gameCtx.credits)); } });
  }
}
function setRushTier(p, score) {
  const t = tierAt(p.tiers, score, rushRate*(p.game==='plinko'&&!gameCtx?.daily?(gameCtx?.count||1):1));
  const el = $('#rTier');
  if (!el) return;
  if (el.dataset.name !== t.name) {
    const up = el.dataset.name && p.tiers.indexOf(t) > p.tiers.findIndex((x) => x.name === el.dataset.name);
    el.dataset.name = t.name;
    el.innerHTML = `<span class="rk rk-${t.rank}">${t.rank}</span><span>${esc(t.name)}</span>`;
    if (up) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
  }
  document.querySelectorAll('.tier-table tr').forEach((tr) => tr.classList.toggle('now', +tr.dataset.min === t.min));
}
// スコア表示のカウントアップ（演出と並行して動く）
let scoreAnim = null;
function rushCountTo(to, speed = rushSpeed) {
  const el = $('#rScore');
  if (!el) return;
  const from = parseFloat(el.dataset.displayed || el.dataset.v || '0');
  el.dataset.v = to;
  const show = (v) => (to < 100 && to % 1 ? (Math.round(v * 100) / 100).toFixed(2) : num(Math.round(v)));
  cancelAnimationFrame(scoreAnim);
  const t0 = performance.now(), dur = (Math.abs(to-from)<100?100:210) * speed;
  const box=el.closest('.gm-box');if(to>from){box?.classList.add('counting');clearTimeout(box?._winTimer);if(box)box._winTimer=setTimeout(()=>box.classList.remove('counting'),Math.max(280,dur+100));}
  const step = (t) => { const k = Math.min(1, (t - t0) / dur),v=from+(to-from)*(1-Math.pow(1-k,3));el.dataset.displayed=String(v);el.textContent=show(v);if(k<1)scoreAnim=requestAnimationFrame(step); };
  scoreAnim = requestAnimationFrame(step);
}
function showRushResult(p, r, demo) {
  const c = r.card;
  const ratio = r.score / r.rate;
  const col = c ? RANK_COLOR[c.rank] : '#999';
  const big = c && ['S', 'A'].includes(c.rank);
  const s = sheet(`<h3>${demo ? 'お試し結果' : `${gameName(gameCtx && gameCtx.p && gameCtx.p.game)} 結果`}</h3>
    <div class="result-score"><div class="muted">獲得コイン（確定）</div><div class="sc">${num(r.score)} <small style="font-size:14px">C</small></div>
      <div class="muted">基準消費Cの ${ratio.toFixed(2)} 倍・${r.freePlayed??r.played}${p.game==='plinko'?'球':p.game==='dwarf'?'フリースピン':'スピン'}</div></div>
    ${r.guarantee?`<p class="muted">最終配当0Cのため1Cを付与しました。</p>`:''}${r.capped?'<p class="muted">最大配当の上限に到達したため終了しました。</p>':''}
    <div class="result-breakdown"><div><span>消費</span><b>${num(r.cost)} C</b></div><div><span>獲得</span><b>${num(r.score)} C</b></div><div><span>差引</span><b class="${r.score-r.cost<0?'negative':''}">${r.score-r.cost>0?'+':''}${num(r.score-r.cost)} C</b></div></div>
    ${c ? `<div class="result-card"><div class="cardart" style="border-color:${col};background:${['S'].includes(c.rank) ? 'conic-gradient(#ff4fd8,#ffd54a,#4aa8ff,#4ee0a0,#ff4fd8)' : col}">${c.rank}</div>
      <div><div style="font-weight:900">${esc(c.name)}</div><div class="muted">カードの値段 ${num(c.value)}C</div></div></div>` : '<p class="muted" style="text-align:center">スコア0のため、カードはありません</p>'}
    ${big && !demo ? `<div style="text-align:center;margin-top:10px"><a class="share" href="${shareUrl(c)}" target="_blank" rel="noopener">𝕏 で当選報告する</a></div>` : ''}
    <div class="btns">
      ${!demo && c ? `<button class="btn gold" id="rcv">コインに交換（+${num(c.value)}）</button>
      <button class="btn blue" id="rsh">発送する（+${num(Math.floor(c.value * CFG.ship_rate))}pt）</button>
      <button class="btn ghost" id="rlater">あとで決める（獲得商品に保管）</button>` : ''}
      ${demo && !ME.user ? '<button class="btn" id="rreg">無料登録して本番をプレイ</button>' : ''}
      <button class="btn ghost" id="ragain">${r.daily?'ログインボーナスへ戻る':'もう一度プレイ'}</button>
      <button class="btn ghost" id="rclose">閉じる</button>
    </div>`);
  const back = () => { closeSheet(); if (gameCtx && !gameCtx.demo && ME.user) { gameCtx.credits = ME.user.coins; $('#hCoin') && ($('#hCoin').textContent = num(gameCtx.credits)); } };
  $('#rcv', s) && ($('#rcv', s).onclick = () => resolve('convert', [c.card_id]).then(back));
  $('#rsh', s) && ($('#rsh', s).onclick = () => resolve('ship', [c.card_id]).then(back));
  $('#rlater', s) && ($('#rlater', s).onclick = back);
  $('#rreg', s) && ($('#rreg', s).onclick = () => { closeSheet(); location.hash = '#pack-' + p.id; setTimeout(openLogin, 300); });
  $('#ragain', s).onclick = () => { closeSheet(); if(r.daily)location.hash='#bonus';else gameSpin(); };
  $('#rclose', s).onclick = back;
}
function rushRefresh(p) { if (location.hash === '#pack-' + p.id) viewPack(p.id).catch(() => {}); }

// ===== 画面：速報 =====
async function viewNews() {
  const { feed } = await api('/api/feed?limit=50');
  const ago = (t) => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'たった今' : m < 60 ? m + '分前' : m < 1440 ? Math.floor(m / 60) + '時間前' : Math.floor(m / 1440) + '日前'; };
  $('#view').innerHTML = `<div style="height:12px"></div><div class="card-box"><h2>⚡ 当選速報</h2>${feed.length ? `<ul class="news">${feed.map((f) => `<li>
      <div class="art-s" style="background:${['S', 'LO'].includes(f.rank) ? 'conic-gradient(#ff4fd8,#ffd54a,#4aa8ff,#4ee0a0,#ff4fd8)' : RANK_COLOR[f.rank]}"></div>
      <div class="t"><span class="rk rk-${f.rank}">${f.rank}</span> <b>${esc(f.name)}</b><small>${esc(f.nickname)} さん・${esc(f.pack)}・${ago(f.created_at)}</small></div></li>`).join('')}</ul>`
    : '<p class="muted">まだ当選はありません</p>'}</div>${siteFooter()}`;
}

// ===== 画面：オリパ詳細 =====
let curPack = null;
async function viewPack(id) {
  const { pack: p } = await api('/api/packs/' + id);
  curPack = p;
  if (p.kind === 'rush') return rushPage(p);
  const rows = p.prizes.map((x) => `<tr class="${x.remaining ? '' : 'gone'}">
      <td><span class="rk rk-${x.rank}">${x.rank}</span></td><td>${esc(x.name)}</td>
      <td class="num">${num(x.value)}</td><td class="num">${x.remaining}/${x.total}</td></tr>`).join('');
  const extra = [
    p.last_one ? `<tr><td><span class="rk rk-LO">LO</span></td><td>${esc(p.last_one.name)}<br><span class="muted">最後の1口を引いた人に</span></td><td class="num">${num(p.last_one.value)}</td><td class="num">1</td></tr>` : '',
    p.kiriban ? `<tr><td><span class="rk rk-KB">KB</span></td><td>${esc(p.kiriban.name)}<br><span class="muted">${p.kiriban.every}口目ごとに</span></td><td class="num">${num(p.kiriban.value)}</td><td class="num">-</td></tr>` : '',
  ].join('');
  const today = ME.stats?.today_spent || 0;
  const canAll = p.remaining > 0 && p.remaining <= p.all_max && !p.per_user_daily;
  const nextKiri = p.kiriban ? Math.ceil((p.draw_count + 1) / p.kiriban.every) * p.kiriban.every : null;
  const multi = p.per_user_daily && p.per_user_daily < 10 ? p.per_user_daily : 10;
  $('#view').innerHTML = `
    <div class="pimg">${artHtml({ ...p, top: p.prizes[0], locked: null })}${p.min_value ? `<span class="minguar">最低保証 <span class="coin-ico">C</span><b>${num(p.min_value)}</b></span>` : ''}</div>
    <div class="detail-info">
      <div class="ptags" style="padding:0">${tagsHtml(p)}</div>
      <h1>${esc(p.name)}</h1>
      <div class="pinfo" style="padding:0">
        <div class="pprice">${p.price ? `<span class="coin-ico">C</span>${num(p.price)}<small>/1回</small>` : '<span class="free">無料</span>'}</div>
        <div class="premain">残り ${num(p.remaining)} / ${num(p.total)}<div class="rbar ${barClass(p)}"><i style="width:${(p.remaining / p.total) * 100}%"></i></div></div>
      </div>
      <div class="kv"><span>${p.ev ? `総還元率 <b>${(p.ev * 100).toFixed(1)}%</b>` : '<b>ハズレなし</b>'}</span><span>第${p.round}弾</span></div>
      ${nextKiri ? `<div class="kv"><span>次のキリ番 <b>${nextKiri}口目</b></span><span>いま${p.draw_count}口目まで</span></div>` : ''}
      ${p.today_left !== null ? `<div class="kv"><span>今日あと <b>${p.today_left}口</b> 引けます</span></div>` : ''}
    </div>
    <div class="stage-wrap">
      <div class="stage" id="stage"></div>
      <div class="msg" id="msg">${p.locked ? '🔒 ' + esc(p.locked) : p.remaining ? '運試し、0円で。' : '売り切れ'}</div>
      <p class="reality" id="reality">${ME.user && p.price ? `本物のオリパなら今日だけで <b>${yen(today)}</b> 使っていた計算。実際は ¥0。` : ''}</p>
      <div style="margin-top:10px"><button class="btn ghost" id="dTry">お試しで引く（無料・記録されません）</button></div>
    </div>
    <div class="card-box"><h2>景品一覧（コイン換算値・残り）</h2>
      <table class="prize-table">${rows}${extra}</table>
      <p class="muted" style="margin-top:8px">引いたカードは1枚ずつ「コインに交換」か「発送（実物は届きません）」を選べます。発送するとコイン換算値の${Math.round(CFG.ship_rate * 100)}%が発送ポイントになり、月間ランキングに反映されます。</p>
    </div>
    <div class="cta-space"></div>
    <div class="cta-bar" id="ctaBar">
      ${!ME.user ? '<button class="btn wide" id="dReg">新規会員登録してガチャる<small>登録で' + num(CFG.signup_bonus) + 'コイン</small></button>' : `
      <button class="btn" id="d1" ${p.locked ? 'disabled' : ''}>1回ガチャる<small>${p.price ? num(p.price) + 'コイン' : '無料'}</small></button>
      <button class="btn dark" id="d10" ${p.locked || multi === 1 ? 'disabled' : ''}>${multi}連ガチャる<small>${p.price ? num(p.price * multi) + 'コイン' : '無料'}</small></button>
      ${canAll ? `<button class="btn gold wide" id="dAll" ${p.locked ? 'disabled' : ''}>全部引く（${p.remaining}口・ラストワン確定）<small>${num(p.price * p.remaining)}コイン</small></button>` : ''}`}
    </div>`;
  resetStage(p);
  $('#dReg') && ($('#dReg').onclick = openLogin);
  $('#d1') && ($('#d1').onclick = () => doDraw(p, 1));
  $('#d10') && ($('#d10').onclick = () => doDraw(p, 10));
  $('#dAll') && ($('#dAll').onclick = () => confirmAll(p));
  $('#dTry').onclick = () => tryDraw(p);
}
function lockButtons(on) {
  document.querySelectorAll('#ctaBar .btn, #dTry').forEach((b) => { if (on) b.disabled = true; });
  if (!on && curPack && location.hash === '#pack-' + curPack.id) viewPack(curPack.id).catch(() => {});
}

function frontHtml(c) {
  const col = RANK_COLOR[c.rank];
  const art = c.image ? `<img class="cart" src="${esc(c.image)}" alt="">`
    : `<div class="cart" style="background:${['S', 'LO'].includes(c.rank) ? 'conic-gradient(#ff4fd8,#ffd54a,#4aa8ff,#4ee0a0,#ff4fd8)' : `radial-gradient(circle at 35% 35%,#fff8,${col})`}"></div>`;
  return `<div class="big" style="color:${col}">${c.rank}</div>${art}<div class="nm">${esc(c.name)}</div><div class="val">${num(c.value)}C</div>`;
}

// ===== 演出 =====
// 演出中にステージをタップするとスキップ
let skipFx = false;
const fx = (ms) => (skipFx ? Promise.resolve() : sleep(ms));
const LV = [
  { cls: 'lv-blue', text: 'チャンス', aura: '#1f5bff' },
  { cls: 'lv-green', text: 'チャンスアップ！', aura: '#12b76a' },
  { cls: 'lv-red', text: '激アツ!!', aura: '#e5133a' },
  { cls: 'lv-gold', text: '金確定!?', aura: '#ffc400' },
  { cls: 'lv-rainbow', text: 'GOD', aura: null },
];
const RANK_ORDER = ['LO', 'S', 'A', 'KB', 'B', 'C', 'D'];
const bestOf = (cards) => cards.slice().sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank))[0];
function levelFor(rank) {
  const r = Math.random();
  if (rank === 'S' || rank === 'LO') return 4;
  if (rank === 'A') return r < 0.5 ? 3 : 2;
  if (rank === 'KB' || rank === 'B') return r < 0.3 ? 2 : 1;
  if (rank === 'C') return r < 0.25 ? 1 : 0;
  return r < 0.1 ? 1 : 0; // D でもたまに緑（ガセ）
}
function resetStage(p) {
  const st = $('#stage');
  if (!st) return;
  const common = '<div class="aura" id="aura"></div><div class="cutin" id="cutin"><span></span></div><div class="flash" id="flash"></div><div class="hint">演出中はタップでスキップ</div>';
  if (p.effect === 'tumble') st.innerHTML = common + `<div class="tumble"><div class="tgrid" id="tgrid"></div>
      <div class="winbar"><span class="lbl">WIN</span><span class="amt" id="winAmt">0</span><span class="mul" id="winMul"></span></div></div>`;
  else if (p.effect === 'slot') st.innerHTML = common + '<div class="reels"><div class="reel">?</div><div class="reel">?</div><div class="reel">?</div></div>';
  else st.innerHTML = common + '<div class="flip" id="flip"><div class="face back"></div><div class="face front" id="front"></div></div>';
  st.onclick = () => { if (busy) skipFx = true; };
  if (p.effect === 'tumble') { const g = newGrid(); renderGrid(g); }
}
async function cutin(lv) {
  const el = $('#cutin');
  if (!el || skipFx) return;
  el.className = 'cutin ' + LV[lv].cls;
  $('span', el).textContent = LV[lv].text;
  void el.offsetWidth;
  el.classList.add('show');
  const aura = $('#aura');
  if (LV[lv].aura) { aura.className = 'aura on'; aura.style.background = LV[lv].aura; }
  else aura.className = 'aura on rainbow';
  await fx(560);
}
async function freeze() {
  if (skipFx) return;
  let f = $('#freeze');
  if (!f) { f = document.createElement('div'); f.id = 'freeze'; f.className = 'freeze'; f.textContent = '………'; document.body.appendChild(f); }
  f.classList.add('on');
  try { navigator.vibrate && navigator.vibrate([80, 60, 200]); } catch {}
  await fx(1300);
  f.classList.remove('on');
  flash();
}
function flash() { const fl = $('#flash'); if (fl) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); } }

// --- カードめくり ---
async function playCard(best) {
  const flip = $('#flip');
  const top = levelFor(best.rank);
  $('#msg').textContent = '…';
  flip.classList.add('shake');
  for (let lv = 0; lv <= top; lv++) { if (lv === 4) await freeze(); await cutin(lv); }
  await fx(200);
  flip.classList.remove('shake');
  $('#front').style.borderColor = RANK_COLOR[best.rank];
  $('#front').innerHTML = frontHtml(best);
  flip.classList.add('on');
  await fx(700);
}

// --- 3リール ---
const SYM3 = { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', LO: '★', KB: '7' };
async function playSlot(best) {
  const els = [...document.querySelectorAll('#stage .reel')];
  const pool = ['S', 'A', 'B', 'C', 'D', '7', '★'];
  const spinning = new Set(els);
  els.forEach((e) => e.classList.add('spin'));
  const timer = setInterval(() => spinning.forEach((e) => (e.textContent = pool[Math.floor(Math.random() * pool.length)])), 60);
  const stopAt = async (i, ms) => { await fx(ms); spinning.delete(els[i]); els[i].classList.remove('spin'); els[i].textContent = SYM3[best.rank]; els[i].classList.add('stop'); };
  const top = levelFor(best.rank);
  $('#msg').textContent = '';
  await stopAt(0, 800);
  await stopAt(1, 500);
  if (top >= 2) {
    await cutin(Math.min(top, 3));
    $('#msg').innerHTML = '<span style="color:var(--red)">リーチ!!</span>';
    if (top === 4) { await fx(900); await freeze(); await cutin(4); } else await fx(1400);
  }
  await stopAt(2, top >= 2 ? 200 : 500);
  clearInterval(timer);
  await fx(500);
}

// --- 連鎖スロット（6列×5行。8個以上そろうと消えて、上から落ちてきて連鎖） ---
const TSYM = ['💎', '👑', '⭐', '🔥', '🍀', '🃏', '🔮', '🎴'];
const SCATTER = '🎁';
const COLS = 6, ROWS = 5, CELL = 49;
const rnd = (n) => Math.floor(Math.random() * n);
function countOf(g, s) { return g.filter((x) => x === s).length; }
function fixNoWin(g, keep) {
  // keep 以外の絵柄が8個以上にならないように直す
  for (const s of TSYM) {
    if (s === keep) continue;
    while (countOf(g, s) >= 8) {
      const idx = g.map((x, i) => (x === s ? i : -1)).filter((i) => i >= 0);
      const options = TSYM.filter((x) => x !== keep && countOf(g, x) < 6);
      g[idx[rnd(idx.length)]] = options[rnd(options.length)] || TSYM[0];
    }
  }
  return g;
}
function newGrid(keep) { return fixNoWin(Array.from({ length: COLS * ROWS }, () => TSYM[rnd(TSYM.length)]), keep); }
function cellsEl() { return [...document.querySelectorAll('#tgrid .cell')]; }
function renderGrid(g, dropCols) {
  const el = $('#tgrid');
  if (!el) return;
  if (el.children.length !== g.length) el.innerHTML = g.map(() => '<div class="cell"></div>').join('');
  const cells = cellsEl();
  g.forEach((s, i) => {
    const c = cells[i];
    c.className = 'cell' + (s === SCATTER ? ' scatter' : '');
    c.textContent = s;
    const col = i % COLS, row = Math.floor(i / COLS);
    if (dropCols && dropCols.has(col)) {
      c.classList.add('drop');
      if (!skipFx) setTimeout(() => c.classList.remove('drop'), 30 + col * 40 + (ROWS - row) * 25);
      else c.classList.remove('drop');
    }
  });
}
async function spinIn(g) {
  renderGrid(g, new Set([0, 1, 2, 3, 4, 5]));
  await fx(650);
}
function plantCluster(g, sym, n) {
  const idx = [...Array(g.length).keys()].filter((i) => g[i] !== sym && g[i] !== SCATTER).sort(() => Math.random() - 0.5);
  let need = Math.max(0, n - countOf(g, sym));
  for (const i of idx) { if (!need) break; g[i] = sym; need--; }
  return fixNoWin(g, sym);
}
async function countUp(to) {
  const el = $('#winAmt');
  if (!el) return;
  const from = parseFloat(el.dataset.v || '0');
  el.dataset.v = to;
  const show = (v) => (to < 100 && to % 1 ? (Math.round(v * 100) / 100).toFixed(2) : num(Math.round(v)));
  if (skipFx) { el.textContent = num(to); return; }
  const t0 = performance.now(), dur = 450;
  await new Promise((res) => {
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = num(Math.round(from + (to - from) * k));
      k < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}
// 1回の連鎖：そろった絵柄を光らせて消し、列ごとに上から補充
async function tumbleOnce(g, sym, addTo) {
  const cells = cellsEl();
  const hit = g.map((x, i) => (x === sym ? i : -1)).filter((i) => i >= 0);
  hit.forEach((i) => cells[i].classList.add('hit'));
  await fx(800);
  hit.forEach((i) => cells[i].classList.add('pop'));
  await fx(250);
  await countUp(addTo);
  // 重力：消えたマスの上にあるものが落ち、上に新しい絵柄
  const popped = new Set(hit);
  const ng = g.slice();
  const cols = new Set();
  for (let c = 0; c < COLS; c++) {
    const keep = [];
    for (let r = 0; r < ROWS; r++) { const i = r * COLS + c; if (!popped.has(i)) keep.push(g[i]); }
    if (keep.length === ROWS) continue;
    cols.add(c);
    const fresh = Array.from({ length: ROWS - keep.length }, () => TSYM[rnd(TSYM.length)]);
    [...fresh, ...keep].forEach((s, r) => (ng[r * COLS + c] = s));
  }
  return { g: ng, cols };
}
async function placeBomb(g, mult) {
  const cells = cellsEl();
  const i = rnd(g.length);
  cells[i].className = 'cell bomb';
  cells[i].textContent = '×' + mult;
  await fx(300);
  cells[i].classList.add('boom');
  flash();
  $('#winMul').textContent = '×' + mult;
  await fx(900);
}
function splitParts(total, n) {
  if (n <= 1) return [total];
  const w = Array.from({ length: n }, () => 1 + Math.random());
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.floor((total * x) / sum));
  parts[n - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}
// ひとまとまりのスピン：連鎖を tumbles 回、最後に倍率（mult>1のとき）。合計がちょうど target になる
async function tumbleSpin(target, tumbles, mult, startFrom) {
  const base = mult > 1 ? Math.max(1, Math.round(target / mult)) : target;
  const parts = splitParts(base, tumbles);
  let g = newGrid();
  let shown = startFrom;
  // 最初の当たり絵柄を仕込んで回す
  let sym = TSYM[rnd(TSYM.length)];
  g = plantCluster(g, sym, 8 + rnd(3));
  await spinIn(g);
  for (let k = 0; k < tumbles; k++) {
    shown += parts[k];
    const r = await tumbleOnce(g, sym, shown);
    g = r.g;
    if (k + 1 < tumbles) { sym = TSYM[rnd(TSYM.length)]; g = plantCluster(g, sym, 8 + rnd(2)); }
    else g = fixNoWin(g);
    renderGrid(g, r.cols);
    await fx(450);
  }
  if (mult > 1) {
    await placeBomb(g, mult);
    await countUp(startFrom + target);
    $('#winMul').textContent = '';
  } else if (shown !== startFrom + target) await countUp(startFrom + target);
  return startFrom + target;
}
async function playTumble(best) {
  const v = best.value;
  const winEl = $('#winAmt');
  winEl.dataset.v = '0'; winEl.textContent = '0'; $('#winMul').textContent = '';
  $('#msg').textContent = '';
  const lv = levelFor(best.rank);
  if (lv >= 2) await cutin(Math.min(lv, 3));
  if (best.rank === 'S' || best.rank === 'LO') {
    // スキャッター（🎁）が4つ → フリースピン
    let g = newGrid();
    const spots = [...Array(g.length).keys()].sort(() => Math.random() - 0.5).slice(0, 4);
    spots.forEach((i) => (g[i] = SCATTER));
    await spinIn(g);
    const cells = cellsEl();
    spots.forEach((i) => cells[i].classList.add('hit'));
    await fx(900);
    await freeze();
    const st = $('#stage');
    const fs = document.createElement('div');
    fs.className = 'fs-banner';
    fs.innerHTML = '<b>FREE SPINS</b><div style="margin-top:6px">フリースピン 3回</div>';
    st.appendChild(fs);
    await fx(1400);
    fs.remove();
    const a = Math.round(v * 0.3), b = Math.round(v * 0.3);
    let total = 0;
    total = await tumbleSpin(a, 1, 5, total);
    total = await tumbleSpin(b, 2, 10, total);
    total = await tumbleSpin(v - a - b, 2, 25, total);
    await cutin(4);
  } else if (best.rank === 'A') {
    await tumbleSpin(v, 2, [2, 3, 5][rnd(3)], 0);
  } else if (best.rank === 'B' || best.rank === 'KB') {
    await tumbleSpin(v, 2, 1, 0);
  } else {
    await tumbleSpin(v, 1, 1, 0);
  }
  await fx(300);
}
async function playEffect(p, best) {
  skipFx = false;
  resetStage(p);
  if (p.effect === 'tumble') await playTumble(best);
  else if (p.effect === 'slot') await playSlot(best);
  else await playCard(best);
  skipFx = false;
  $('#msg').innerHTML = `<span style="color:${RANK_COLOR[best.rank]}">${RANK_NAME[best.rank]}${['S', 'LO'].includes(best.rank) ? '！大当たり！' : ''}</span> ${esc(best.name)}`;
}

let lastDraw = null;
async function doDraw(p, count) {
  if (needLogin() || busy) return;
  busy = true;
  lockButtons(true);
  try {
    const r = await api(`/api/packs/${p.id}/draw`, { count });
    setCoins(r.coins);
    const all = [...r.results, ...(r.kiriban || []), ...(r.last_one ? [r.last_one] : [])];
    const best = bestOf(all);
    await playEffect(p, best);
    if (ME.stats) ME.stats.today_spent = r.today_spent;
    if (p.price) $('#reality').innerHTML = `本物のオリパなら今日だけで <b>${yen(r.today_spent)}</b> 使っていた計算。実際は ¥0。`;
    lastDraw = { p, best, all, cost: r.cost, drawNo: r.draw_no };
    await showResults(lastDraw);
    if (r.rank_up) setTimeout(() => toast(`🎉 会員ランクが「${r.rank_up}」に上がりました！`), 600);
    checkLimit(r);
  } catch (e) {
    toast(e.message);
    if (e.status === 402) setTimeout(() => (location.hash = '#home'), 1200);
  } finally {
    busy = false;
    refreshMe().then(() => lockButtons(false));
  }
}
function confirmAll(p) {
  if (needLogin()) return;
  const s = sheet(`<h3>全部引きますか？</h3>
    <p class="muted" style="text-align:center">残り ${p.remaining} 口をすべて引きます。<br>ラストワン賞「${esc(p.last_one?.name || '')}」も確定します。<br>使うコイン：${num(p.price * p.remaining)}</p>
    <div class="btns"><button class="btn gold" id="okA">全部引く</button><button class="btn ghost" id="ngA">やめる</button></div>`);
  $('#okA', s).onclick = () => { closeSheet(); doDraw(p, 'all'); };
  $('#ngA', s).onclick = closeSheet;
}
// お試し：サーバーには送らず、今の残り口の割合で抽選して演出だけ楽しむ
async function tryDraw(p) {
  if (busy) return;
  busy = true;
  lockButtons(true);
  try {
    const bag = [];
    p.prizes.forEach((x) => { for (let i = 0; i < x.remaining; i++) bag.push(x); });
    if (!bag.length) { toast('売り切れです'); return; }
    const pick = bag[Math.floor(Math.random() * bag.length)];
    const card = { rank: pick.rank, name: pick.name, value: pick.value, image: pick.image };
    await playEffect(p, card);
    const s = sheet(`<h3>お試し結果</h3>
      <div class="grid" style="grid-template-columns:1fr;max-width:220px;margin:0 auto"><div class="tile" style="border-color:${RANK_COLOR[card.rank]}">
      <span class="rk rk-${card.rank}">${card.rank}</span><div class="nm">${esc(card.name)}</div><div class="v">${num(card.value)}C</div></div></div>
      <p class="muted" style="text-align:center;margin-top:8px">お試しなので記録されません。</p>
      <div class="btns">${ME.user ? '' : '<button class="btn" id="tReg">無料登録して本番を引く</button>'}<button class="btn ghost" id="tOk">閉じる</button></div>`);
    $('#tOk', s).onclick = closeSheet;
    $('#tReg', s) && ($('#tReg', s).onclick = openLogin);
  } finally {
    busy = false;
    document.querySelectorAll('#ctaBar .btn, #dTry').forEach((b) => (b.disabled = false));
    if (curPack?.locked) document.querySelectorAll('#ctaBar .btn').forEach((b) => (b.disabled = true));
    if (curPack?.per_user_daily === 1 && $('#d10')) $('#d10').disabled = true;
  }
}

function shareUrl(c) {
  const text = `${CFG.site_name}で「${c.name}」（${RANK_NAME[c.rank]}）を引いた！ 0円で回せるオリパ #${CFG.site_name.replace(/\s/g, '')}`;
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(location.origin);
}
async function showResults(d) {
  const { all: cards, cost, best, drawNo } = d;
  const total = cards.reduce((s, c) => s + c.value, 0);
  const ids = cards.map((c) => c.card_id).filter(Boolean);
  const big = ['S', 'A', 'LO'].includes(best.rank);
  const s = sheet(`<h3>${cards.length}枚獲得</h3>
    <p class="muted" style="text-align:center">${drawNo ? `${drawNo[0] === drawNo[1] ? drawNo[0] : drawNo[0] + '〜' + drawNo[1]}口目・` : ''}使ったコイン ${num(cost)} → カード合計 ${num(total)}コイン相当</p>
    <div class="grid" style="margin-top:10px">${cards.map((c) => `<div class="tile pop" style="border-color:${RANK_COLOR[c.rank]}">
      <span class="rk rk-${c.rank}">${c.rank}</span><div class="nm">${esc(c.name)}</div><div class="v">${num(c.value)}C</div></div>`).join('')}</div>
    ${big ? `<div style="text-align:center;margin-top:12px"><a class="share" href="${shareUrl(best)}" target="_blank" rel="noopener">𝕏 で当選報告する</a></div>` : ''}
    <div class="btns">
      <button class="btn gold" id="cvAll">全部コインに交換（+${num(total)}）</button>
      <button class="btn blue" id="shAll">全部発送する（+${num(cards.reduce((s2, c) => s2 + Math.floor(c.value * CFG.ship_rate), 0))}pt）</button>
      <button class="btn ghost" id="later">1枚ずつ選ぶ（所持カードへ）</button>
      <button class="btn ghost" id="replay">演出をもう一度見る</button>
    </div>`);
  $('#cvAll', s).onclick = () => resolve('convert', ids).then(afterResolve);
  $('#shAll', s).onclick = () => resolve('ship', ids).then(afterResolve);
  $('#later', s).onclick = () => { closeSheet(); location.hash = '#cards'; };
  $('#replay', s).onclick = async () => {
    closeSheet();
    if (busy) return;
    busy = true;
    try { await playEffect(d.p, best); } finally { busy = false; }
    showResults(d);
  };
  // ボタンを先に有効にしてから、カードを順番に表示する
  const tiles = [...s.querySelectorAll('.tile')];
  for (const t of tiles) { await sleep(cards.length > 1 ? Math.max(20, 120 - cards.length) : 0); t.classList.add('show'); }
}
function afterResolve() {
  closeSheet();
  if (curPack && location.hash === '#pack-' + curPack.id) viewPack(curPack.id).catch(() => {});
}

async function resolve(mode, ids) {
  try {
    const r = await api('/api/cards/' + mode, { ids });
    await refreshMe();
    toast(mode === 'convert' ? `${r.count}枚を交換：+${num(r.coins)}コイン` : `${r.count}枚を発送：+${num(r.points)}発送ポイント`);
  } catch (e) { toast(e.message); }
}

function checkLimit(r) {
  if (!r.daily_limit || r.today_spent < r.daily_limit) return;
  const key = 'zo-limit-' + new Date().toDateString();
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch {}
  setTimeout(() => {
    const s = sheet(`<h3>今日の上限に届きました</h3>
      <p class="muted" style="text-align:center">本物のオリパなら、今日だけで <b style="color:var(--gold)">${yen(r.today_spent)}</b> 使っていました。<br>でも実際に払ったのは ¥0 です。<br>このまま遊んでもOK。ひと息つくのもOK。</p>
      <div class="btns"><button class="btn" id="okL">OK</button></div>`);
    $('#okL', s).onclick = closeSheet;
  }, 400);
}

// ===== 画面：所持カード =====
let cardTab = 'held';
async function viewCards() {
  if (!ME.user) { $('#view').innerHTML = loginPrompt('所持カードを見るにはログインしてください'); bindLoginPrompt(); return; }
  const { cards } = await api('/api/cards?status=' + cardTab);
  const sel = new Set();
  const label = { held: '保管中', shipped: '発送済み', converted: '交換済み' };
  $('#view').innerHTML = `
    ${brandMasthead('MY COLLECTION','獲得商品','テストプレイで獲得したカードの確認・管理', 'nav-cards')}
    <div class="tabs">${Object.keys(label).map((k) => `<button data-t="${k}" class="${k === cardTab ? 'on' : ''}">${label[k]}</button>`).join('')}</div>
    ${cardTab === 'held' && cards.length ? `<div class="selbar"><span>${cards.length}枚・タップで選択</span><button class="btn ghost" style="width:auto;padding:6px 12px;font-size:12px" id="selAll">すべて選択</button></div>` : ''}
    ${cards.length ? `<div class="cards-grid"><div class="grid">${cards.map((c) => `<div class="tile collection-tile" data-id="${c.id}" style="--card-accent:${RANK_COLOR[c.rank]}">
      ${cardTab === 'held' ? '<span class="chk">◻️</span>' : ''}<div class="collection-art"><span class="card-rarity">${esc(c.rank)}</span></div><span class="rk rk-${c.rank}">${c.rank}</span>
      <div class="nm">${esc(c.name)}</div><div class="v">${brandIcon('coin')} ${num(c.value)}C</div></div>`).join('')}</div></div>` : `<div class="empty brand-empty">${brandIcon('nav-cards')}<p>${cardTab==='held'?'獲得したカードがここに表示されます。':cardTab==='shipped'?'発送済みのカードはまだありません。':'交換済みのカードはまだありません。'}</p>${cardTab==='held'?'<a class="btn ghost" href="#home">ゲーム一覧を見る</a>':''}</div>`}
    ${cardTab === 'held' && cards.length ? `<div class="actionbar">
      <button class="btn gold" id="cv" disabled>コイン交換</button><button class="btn blue" id="sh" disabled>発送する</button></div>` : ''}`;
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { cardTab = b.dataset.t; viewCards(); }));
  if (cardTab !== 'held' || !cards.length) return;
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const update = () => {
    const list = [...sel].map((i) => byId[i]);
    const coins = list.reduce((s, c) => s + c.value, 0);
    const pts = list.reduce((s, c) => s + Math.floor(c.value * CFG.ship_rate), 0);
    $('#cv').disabled = $('#sh').disabled = !list.length;
    $('#cv').innerHTML = `コイン交換<small>+${num(coins)}C</small>`;
    $('#sh').innerHTML = `発送する<small>+${num(pts)}pt</small>`;
    document.querySelectorAll('.tile[data-id]').forEach((t) => {
      const on = sel.has(+t.dataset.id);
      t.classList.toggle('sel', on);
      $('.chk', t).textContent = on ? '✅' : '◻️';
    });
  };
  document.querySelectorAll('.tile[data-id]').forEach((t) => (t.onclick = () => {
    const id = +t.dataset.id;
    sel.has(id) ? sel.delete(id) : sel.add(id);
    update();
  }));
  $('#selAll').onclick = () => { if (sel.size === cards.length) sel.clear(); else cards.forEach((c) => sel.add(c.id)); update(); };
  $('#cv').onclick = async () => { await resolve('convert', [...sel]); viewCards(); };
  $('#sh').onclick = () => {
    const s = sheet(`<h3>発送しますか？</h3><p class="muted" style="text-align:center">実物は届きません。<br>発送すると発送ポイントになり、コインには戻せません。</p>
      <div class="btns"><button class="btn blue" id="okS">発送する</button><button class="btn ghost" id="ngS">やめる</button></div>`);
    $('#okS', s).onclick = async () => { closeSheet(); await resolve('ship', [...sel]); viewCards(); };
    $('#ngS', s).onclick = closeSheet;
  };
  update();
}

// ===== 画面：ランキング =====
async function viewRanking() {
  const r = await api('/api/ranking');
  const rewards = r.rewards.length ? `<div class="card-box"><h2>${esc(r.month.replace('-', '年'))}月の景品</h2>
    ${r.rewards.map((x) => `<div class="reward-row"><span class="row"><span class="rank-row" style="border:none;padding:0"><span class="no medal-${x.rank}">${x.rank}</span></span>位</span><b>${esc(x.prize)}</b></div>`).join('')}
    <p class="muted" style="margin-top:6px">月間の発送ポイント上位の方へプレゼント。参加は完全無料です。</p></div>` : '';
  const mine = r.mine ? `<div class="card-box between"><span>あなた</span><b>${r.mine.rank ? r.mine.rank + '位' : '圏外'}・${num(r.mine.points)}pt</b></div>` : '';
  const rows = r.rows.length ? r.rows.map((x) => `<div class="rank-row ${x.me ? 'me' : ''}">
      <span class="no medal-${x.rank}">${x.rank}</span><span>${esc(x.nickname)}</span><span class="pt">${num(x.points)}pt</span></div>`).join('')
    : '<div class="empty">まだ発送した人はいません</div>';
  const leaders=r.rows.filter(x=>x.rank>=1&&x.rank<=3).slice(0,3);
  const podium=leaders.length?`<div class="ranking-podium" aria-label="上位3位">${leaders.map(x=>`<div class="podium-place podium-${x.rank}">${brandIcon('trophy')}<strong>${x.rank}位</strong><b>${esc(x.nickname)}</b><small>${num(x.points)} pt</small></div>`).join('')}</div>`:'';
  const monthPoints=r.mine?.points||0;
  const milestones=[1000,5000,10000,50000].map((n,i)=>`<div class="milestone-row ${monthPoints>=n?'achieved':''}"><span>${num(n)} pt · 達成バッジ ${i+1}</span><b>${monthPoints>=n?'達成済み':'あと '+num(n-monthPoints)+' pt'}</b><div class="milestone-progress" role="progressbar" aria-label="達成バッジ ${i+1}" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${Math.min(n,monthPoints)}"><i style="width:${Math.min(100,monthPoints/n*100)}%"></i></div></div>`).join('');
  $('#view').innerHTML = `${brandMasthead('LEADERBOARD','ランキング',`${esc(r.month.replace('-','年'))}月・日本時間の月間発送ポイント`, 'trophy')}<div class="card-box"><h2>月間発送ポイント達成報酬（テスト）</h2><p class="muted">サンプル条件・達成バッジのみ。実物景品はありません。</p>${milestones}</div>${rewards}${podium}${mine}<div class="card-box"><h2>発送ポイントランキング（このブラウザのみ）</h2>${rows}</div>${siteFooter()}`;
}

// ===== 画面：マイページ =====
async function viewMe() {
  if (!ME.user) { $('#view').innerHTML = loginPrompt('ログインして、0円オリパをはじめよう') + siteFooter(); bindLoginPrompt(); return; }
  const u = ME.user, st = ME.stats;
  const net = st.got - st.spent;
  const claims = ME.claims.map((c) => `<div class="card-box" style="border-color:var(--gold)">
      <h2>🎉 ${esc(c.month)} ランキング ${c.rank}位</h2><p class="muted">景品：${esc(c.prize)}</p>
      ${c.status === 'pending' ? `<div style="margin-top:10px"><button class="btn gold" data-claim="${c.id}">お届け先を入力する</button></div>` : '<p class="muted" style="margin-top:6px">お届け先を受け付けました。発送までお待ちください。</p>'}
    </div>`).join('');
  $('#view').innerHTML = `${brandMasthead('MY PAGE','マイページ','会員ランク・コイン・プレイ履歴', 'nav-me')}${claims}
    <div class="card-box member-panel"><div class="member-identity">${brandIcon('rank-'+Math.max(0,Math.min(4,Number(u.tier.level)||0)),'rank-emblem')}<div><small>MEMBER RANK</small><h2 style="margin:0">${esc(u.nickname)}</h2><span class="tier tier-${u.tier.level}">${esc(u.tier.name)}</span></div></div>
      ${u.tier.next_min ? `<div class="prog"><i style="width:${Math.min(100, (u.total_spent / u.tier.next_min) * 100)}%"></i></div>
      <p class="muted" style="margin-top:4px">あと ${num(u.tier.next_min - u.total_spent)}コイン使うと「${esc(u.tier.next_name)}」</p>` : '<p class="muted" style="margin-top:4px">最高ランクです</p>'}
      <div class="ledger" style="margin-top:10px">
        <div class="stat"><b>${num(u.coins)}</b><span>コイン</span></div>
        <div class="stat"><b>${num(u.month_points)}</b><span>今月の発送pt</span></div>
      </div></div>
    ${ME.invite?.can_enter ? `<div class="card-box" style="border-color:var(--S)"><h2>招待コードをお持ちですか？</h2>
      <div class="row"><input class="field" id="invIn" maxlength="12" autocapitalize="characters" value="${esc(urlInvite)}" placeholder="例：AB3CD7EF">
      <button class="btn" style="width:100px" id="invGo">入力</button></div>
      <p class="muted" style="margin-top:6px">登録から${CFG.invite_window_hours}時間以内に入力すると +${num(CFG.invite_bonus_new)}コイン</p></div>` : ''}
    <div class="menu">
      <a href="#bonus">ログインボーナス（毎日1回無料ゲーム）</a>
      <button id="mEarn">コインを貯める</button>
      <a href="#invite">友だち招待（招待 ${ME.invite?.invited || 0}人）</a>
      <a href="#history">コイン履歴</a>
      <a href="#cards">獲得商品</a>
    </div>
    <div class="card-box"><h2>もし本物のオリパだったら</h2>
      <div class="net ${net < 0 ? 'minus' : net > 0 ? 'plus' : ''}">${net > 0 ? '+' : ''}${yen(net)}</div>
      <div class="ledger">
        <div class="stat"><b>${yen(st.spent)}</b><span>使っていたはずの額</span></div>
        <div class="stat"><b>${yen(st.got)}</b><span>引いたカードの合計</span></div>
        <div class="stat"><b>${num(st.draws)}口</b><span>回した口数</span></div>
        <div class="stat"><b>${st.spent ? Math.round((st.got / st.spent) * 100) + '%' : '-'}</b><span>あなたの還元率</span></div>
      </div>
      <p class="muted" style="margin-top:10px">${net < 0 ? `本物なら ${yen(-net)} 消えていました。そのお金は今も手元にあります。` : '実際に払ったお金は ¥0 です。'}</p></div>
    <div class="card-box"><h2>今日の「使ったつもり」上限</h2>
      <div class="row"><input class="field" id="limit" type="number" inputmode="numeric" placeholder="例：10000" value="${u.daily_limit || ''}">
      <button class="btn ghost" style="width:90px" id="saveLimit">保存</button></div>
      <p class="muted" style="margin-top:6px">本物のオリパに普段使っている額を入れると、届いたときにお知らせします（0で解除）。今日：${yen(st.today_spent)}</p></div>
    <div class="menu">
      <button id="nickBtn">ニックネーム変更</button>
      <a href="#guide">遊び方</a>
      <a href="#faq">よくある質問</a>
      <button id="logout">ログアウト</button>
    </div>
    ${siteFooter()}`;
  $('#mEarn').onclick = openEarn;
  $('#nickBtn').onclick = () => openNickname(false);
  $('#invGo') && ($('#invGo').onclick = async () => {
    try { const r = await api('/api/invite', { code: $('#invIn').value }); await refreshMe(); toast(`招待ボーナス +${num(r.amount)}コイン！`); viewMe(); }
    catch (e) { toast(e.message); }
  });
  $('#saveLimit').onclick = async () => { try { await api('/api/me', { daily_limit: $('#limit').value || 0 }); await refreshMe(); toast('保存しました'); } catch (e) { toast(e.message); } };
  $('#logout').onclick = async () => { await api('/api/auth/logout', {}); await refreshMe(); location.hash = '#home'; route(); };
  document.querySelectorAll('[data-claim]').forEach((b) => (b.onclick = () => openClaim(+b.dataset.claim)));
}

// ===== 画面：友だち招待 =====
async function viewInvite() {
  if (!ME.user) { $('#view').innerHTML = loginPrompt('ログインすると招待コードが表示されます') + siteFooter(); bindLoginPrompt(); return; }
  const inv = ME.invite;
  const link = location.origin + location.pathname + '?i=' + inv.code;
  const text = `${CFG.site_name}は0円でオリパが回せるよ！招待コード「${inv.code}」を入れると${CFG.invite_bonus_new}コインもらえる`;
  $('#view').innerHTML = `
    <div class="slide bg-high" style="aspect-ratio:auto;padding:20px;border-radius:12px;margin:12px;cursor:default">
      <h3>招待すると<br>おたがいにコイン</h3><p>招待された人 +${num(CFG.invite_bonus_new)} / 招待した人 +${num(CFG.invite_bonus_inviter)}</p><span class="deco">🤝</span></div>
    <div class="card-box"><h2>あなたの招待コード</h2>
      <div class="invite-code">${esc(inv.code)}</div>
      <div class="share-row">
        <button id="cpCode">コードをコピー</button>
        <a class="line" href="https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + link)}" target="_blank" rel="noopener">LINEで送る</a>
        <a class="x" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}" target="_blank" rel="noopener">𝕏で投稿</a>
      </div>
      <p class="muted" style="margin-top:10px">招待リンク：<span style="word-break:break-all">${esc(link)}</span></p></div>
    <div class="card-box"><h2>招待の状況</h2>
      <div class="ledger"><div class="stat"><b>${inv.invited}人</b><span>招待した人数</span></div>
      <div class="stat"><b>${inv.rewarded}人</b><span>ボーナス獲得済み</span></div></div></div>
    <div class="card-box page"><h2 style="margin-top:0">しくみ</h2><ol>
      <li>友だちが電話番号で登録し、${CFG.invite_window_hours}時間以内にあなたのコードを入力すると、友だちに +${num(CFG.invite_bonus_new)}コイン</li>
      <li>その友だちがオリパを合計${CFG.invite_required_draws}口引くと、あなたに +${num(CFG.invite_bonus_inviter)}コイン</li>
      <li>あなたがボーナスを受け取れるのは1か月に30人までです</li>
      <li>1つの電話番号につき1アカウントです。不正な招待はアカウント停止の対象になります</li></ol></div>
    ${siteFooter()}`;
  $('#cpCode').onclick = async () => {
    try { await navigator.clipboard.writeText(inv.code); toast('コピーしました'); } catch { toast('長押しでコピーしてください'); }
  };
}

// ===== 画面：コイン履歴 =====
const REASON = { earn: 'ポイ活テスト報酬', signup: '新規登録ボーナス', login_bonus: 'ログインボーナス', ad: '広告視聴', draw: 'オリパ', refund: '返却（売り切れ分）', convert: 'カード交換', admin: '運営より', invite: '招待コード入力', invite_reward: '招待ボーナス' };
async function viewHistory() {
  if (!ME.user) { $('#view').innerHTML = loginPrompt('ログインしてください'); bindLoginPrompt(); return; }
  const { history } = await api('/api/coin-history');
  const d = (t) => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
  $('#view').innerHTML = `<div style="height:12px"></div><div class="card-box"><h2>コイン履歴（最新100件）</h2>${history.length ? `<ul class="hist">${history.map((h) => `<li>
      <span>${esc(REASON[h.reason] || h.reason)}<small>${d(h.created_at)}</small></span>
      <span class="${h.amount >= 0 ? 'plus-n' : 'minus-n'}">${h.amount >= 0 ? '+' : ''}${num(h.amount)}</span></li>`).join('')}</ul>` : '<p class="muted">まだ履歴はありません</p>'}</div>`;
}

// ===== 静的ページ =====
const PAGES = {
  guide: () => `<h1>遊び方</h1>
    <h2>1. 無料で登録</h2><p>登録や個人情報の入力は不要です。無料のテストコインで遊べます。実広告・実物景品はありません。</p>
    <h2>2. 無料ゲームとコイン</h2><ul><li>ログインボーナス：7機種から1つ選び毎日1回、1,000コイン相当のゲームを消費0コインでプレイできます。</li>
      <li>ポイ活・広告：貯めるページで共通テストコインを獲得できます。換金・実物交換はできません。</li>
      <li>友だち招待：招待された人 +${num(CFG.invite_bonus_new)}・招待した人 +${num(CFG.invite_bonus_inviter)}</li>
      <li>無料プレイは日本時間0時に更新されます。</li></ul>
    <h2>3. オリパを引く</h2><p>1回引く・10連・残りが少ないときは「全部引く」。最後の1口にはラストワン賞、決まった口目にはキリ番賞があります。「お試しで引く」は記録されない練習用です。</p>
    <h2>4. 交換か発送かを選ぶ</h2><p>引いたカードは1枚ずつ選べます。<b>コインに交換</b>するとカードの価値ぶんのコインが戻ります。<b>発送</b>すると価値の${Math.round(CFG.ship_rate * 100)}%が発送ポイントになります（実物は届きません）。</p>
    <h2>5. ランキング</h2><p>月間の発送ポイントを比較するテスト機能です。テスト版では実物景品はありません。</p>
    <h2>会員ランク</h2><p>使ったコインの累計でランクが上がります。${CFG.tiers.map((t) => `${t.name}（${num(t.min)}〜）`).join(' → ')}</p>`,
  faq: () => `<h1>よくある質問</h1>
    <h2>本当にお金はかからない？</h2><p>はい。コインの購入機能はありません。ログインボーナスでは毎日1回の無料ゲームを利用できます。</p>
    <h2>コインやカードを現金にできる？</h2><p>できません。コイン・カード・発送ポイントはこのサイトの中だけで使えます。</p>
    <h2>発送したカードは届く？</h2><p>届きません。発送するとランキング用の発送ポイントになります。テスト版ではランキング景品もありません。</p>
    <h2>電話番号は何に使う？</h2><p>テスト版では電話番号・本人確認は不要です。</p>
    <h2>景品の受け取り方は？</h2><p>テスト版では実物景品の受け取りはできません。</p>
    <h2>オリパがやめられなくて困っている</h2><p>ひとりで抱えず、お住まいの都道府県の精神保健福祉センターに相談できます。マイページの「使ったつもり」上限もぜひ使ってください。</p>`,
  terms: () => `<h1>テスト版の利用条件</h1><p>本サイトは無料の動作確認用デモです。コイン・カード・発送ポイント・達成バッジは全て仮想で、購入・換金・譲渡・実物交換や発送はできません。テスト案件は実広告ではありません。データは変更・消去される場合があります。</p>`,
  privacy: () => `<h1>テスト版のデータ取扱い</h1><p>ゲーム履歴、残高、ニックネームは端末のブラウザに保存します。電話番号・住所・決済情報の入力は不要です。リセットでテストデータを消去できます。サイトの配信にはGitHub Pages、一部のフォント表示にはGoogle Fontsを使用します。</p>`,
};
function viewPage(key) {
  $('#view').innerHTML = `<div style="height:12px"></div><div class="card-box page">${PAGES[key]()}</div>${siteFooter()}`;
}
function siteFooter() {
  return `<footer class="site brand-footer"><img src="${BRAND_ASSET}logo.webp" alt="ZERO ORIPA"><div class="links">
      <a href="#guide">遊び方</a><a href="#faq">よくある質問</a><a href="#terms">利用規約</a><a href="#privacy">プライバシーポリシー</a></div>
    <small>コインは無料配布のみで、購入・換金はできません。<br>ギャンブルやオリパがやめられなくて困ったら、<br>お住まいの都道府県の「精神保健福祉センター」に相談できます。</small>
    <small style="margin-top:8px">© ${new Date().getFullYear()} ${esc(CFG.site_name)}</small></footer>`;
}
function openClaim(id) {
  const s = sheet(`<h3>景品のお届け先</h3>
    <label class="lbl">お名前</label><input class="field" id="cn" autocomplete="name">
    <label class="lbl">郵便番号</label><input class="field" id="cz" inputmode="numeric" autocomplete="postal-code" placeholder="123-4567">
    <label class="lbl">住所</label><input class="field" id="ca" autocomplete="street-address">
    <label class="lbl">電話番号</label><input class="field" id="ct" type="tel" autocomplete="tel">
    <p class="muted" style="margin-top:8px">景品の発送のためだけに使います。</p>
    <div class="btns"><button class="btn gold" id="cs">送信</button></div>`);
  $('#cs', s).onclick = async () => {
    try {
      await api('/api/claims/' + id, { name: $('#cn', s).value, zip: $('#cz', s).value, address: $('#ca', s).value, tel: $('#ct', s).value });
      closeSheet(); await refreshMe(); toast('受け付けました'); route();
    } catch (e) { toast(e.message); }
  };
}

function loginPrompt(text) {
  return `<div style="height:12px"></div><div class="card-box" style="text-align:center"><p class="muted" style="margin-bottom:12px">${esc(text)}</p><button class="btn" id="lp">ログイン / 新規登録</button></div>`;
}
function bindLoginPrompt() { $('#lp').onclick = openLogin; }


// ===== ルーター =====
async function viewDailyBonus(){
  const [{packs},d]=await Promise.all([api('/api/packs'),api('/api/daily')]);
  const games=packs.filter(p=>p.kind==='rush');
  $('#view').innerHTML=`<section class="daily-hero daily-new"><span>DAILY FREE PLAY</span><h1>ログインボーナス</h1><p>毎日1回、お好きなゲームを無料で。</p><div class="daily-ticket"><div><small>1回分の無料プレイ</small><b>1,000 <em>C相当</em></b></div><strong class="${d.available?'available':'used'}">${d.available?'利用可能':'利用済み'}</strong></div><p class="daily-balance">本日の残り <b>${d.available?'1 / 1':'0 / 1'}</b> 回</p><small>全${games.length}機種共通・日本時間0:00更新・消費0 C</small></section><div class="daily-heading"><h2>ゲームを選択</h2><span>${games.length} GAMES</span></div><div class="plist daily-games">${games.map(p=>`<a class="pcard game-card ${d.available?'':'daily-used'}" ${d.available?`href="#play-${p.id}-daily"`:'aria-disabled="true"'}><div class="pimg">${artHtml(p)}</div><div class="daily-game-name">${esc(p.name)}</div><span class="pcta">${d.available?'無料でプレイ · 0 C':'明日またプレイ可能'}</span></a>`).join('')}</div>${!d.available?'<p class="daily-next">本日の無料プレイは利用済みです。次回は日本時間0:00から。</p>':''}${siteFooter()}`;
}
async function route() {
  const h = location.hash.replace('#', '') || 'home';
  if (!h.startsWith('play-')) leaveGame();
  const tab = h.endsWith('-daily')||h==='bonus'?'earn':h.startsWith('pack-') || h.startsWith('play-') ? 'home' : h;
  document.querySelectorAll('nav.bottom a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  try {
    const pm = h.match(/^play-(\d+)(-demo|-daily)?$/);
    if (pm) return await viewGame(parseInt(pm[1], 10), pm[2]==='-demo',pm[2]==='-daily');
    if (h.startsWith('pack-')) await viewPack(parseInt(h.slice(5), 10));
    else if (h === 'cards') await viewCards();
    else if (h === 'bonus') await viewDailyBonus();
    else if (h === 'earn') await viewEarn();
    else if (h === 'news') await viewNews();
    else if (h === 'ranking') await viewRanking();
    else if (h === 'me') await viewMe();
    else if (h === 'invite') await viewInvite();
    else if (h === 'history') await viewHistory();
    else if (PAGES[h]) viewPage(h);
    else await viewHome();
  } catch (e) {
    $('#view').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}
let earnRender;
async function viewEarn(){if(!CFG.dev){location.hash='#home';return;}if(!earnRender){const {createEarnUI}=await import('./earn-ui.js?v=ui55');earnRender=createEarnUI({api,num,esc,toast,sheet,closeSheet,root:()=>$('#view'),footer:siteFooter,refreshMe});}await earnRender();}
// 演出中にページを移動されたら、演出が終わってから移動する
let pendingRoute = false;
window.addEventListener('hashchange', () => {
  if (busy||gameCtx?.busy) { pendingRoute = true; return; }
  closeSheet(); route(); window.scrollTo(0, 0);
});
setInterval(() => { if (pendingRoute && !busy&&!gameCtx?.busy) { pendingRoute = false; closeSheet(); route(); window.scrollTo(0, 0); } }, 300);

(async () => {
  CFG = await api('/api/config');
  document.title = CFG.site_name;
  $('#siteName').setAttribute('aria-label',CFG.site_name);
  await refreshMe();
  route();
})();
