// Private prototype only. No real ads, external tracking, money or prizes.
export const OFFERS = [
  {id:'app',category:'アプリ',icon:'📱',title:'アプリをインストール',detail:'初回起動まで（サンプル）',points:300,provider:'SKYFLAG'},
  {id:'game',category:'ゲーム',icon:'🎮',title:'ゲームのミッション達成',detail:'指定レベル到達（サンプル）',points:1200,provider:'MyChips'},
  {id:'register',category:'会員登録',icon:'📝',title:'無料会員登録',detail:'新規登録完了（サンプル）',points:500,provider:'AD WALL'},
  {id:'survey',category:'アンケート',icon:'📊',title:'簡単アンケート',detail:'回答完了（サンプル）',points:80,provider:'GMOリサーチ&AI'},
  {id:'shop',category:'ショッピング',icon:'🛍️',title:'ネットショッピング',detail:'購入承認のイメージ（実購入不要）',points:600,provider:'AD WALL'},
  {id:'trial',category:'無料体験',icon:'🎁',title:'サービス無料体験',detail:'登録条件達成のイメージ（実登録不要）',points:400,provider:'AD WALL'},
  {id:'receipt',category:'レシート',icon:'🧾',title:'レシートミッション',detail:'対象レシート登録のイメージ（提出不要）',points:100,provider:'選定中'},
];
export const dateKey=(now=Date.now())=>new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Tokyo'});
export function createEarnState(){return {points:0,offers:{},history:[],days:{},video:null,invite:false};}
function day(s,now){return s.days[dateKey(now)]??=( {videos:0,checkin:false,mission:false} );}
function award(s,points,label,now){s.points+=points;s.history.unshift({points,label,at:now});}
export function earnView(s,now=Date.now()){const d=day(s,now);return {points:s.points,offers:OFFERS.map(o=>({...o,status:s.offers[o.id]||'available'})),history:s.history.slice(0,100),day:{...d},invite:s.invite,videoLimit:10,videoPoints:10,videoSeconds:3,checkinPoints:20,missionPoints:50,invitePoints:300,pending:OFFERS.filter(o=>s.offers[o.id]==='pending').reduce((n,o)=>n+o.points,0)};}
export function earnAction(s,action,id,now=Date.now()){
 const d=day(s,now),o=OFFERS.find(x=>x.id===id);
 switch(action){
 case 'video-start':if(d.videos>=10)throw Error('本日の視聴上限です');s.video={id:crypto.randomUUID(),at:now,date:dateKey(now)};return {token:s.video.id,seconds:3};
 case 'video-claim':if(!s.video||s.video.id!==id||s.video.date!==dateKey(now)||now-s.video.at<3000||d.videos>=10)throw Error('視聴完了を確認できません');s.video=null;d.videos++;award(s,10,'テスト動画視聴',now);break;
 case 'start':if(!o||s.offers[id])throw Error('開始できない案件です');s.offers[id]='started';break;
 case 'submit':if(!o||s.offers[id]!=='started')throw Error('開始済みの案件を選択してください');s.offers[id]='pending';break;
 case 'approve':case 'reject':if(!o||s.offers[id]!=='pending')throw Error('承認待ちの案件を選択してください');s.offers[id]=action==='approve'?'approved':'rejected';if(action==='approve')award(s,o.points,o.title,now);break;
 case 'checkin':if(d.checkin)throw Error('本日は受取済みです');d.checkin=true;award(s,20,'デイリーチェックイン',now);break;
 case 'mission':if(d.mission||!d.checkin||d.videos<3)throw Error('ミッション条件を確認してください');d.mission=true;award(s,50,'デイリーミッション',now);break;
 case 'invite':if(s.invite)throw Error('テスト招待は受取済みです');s.invite=true;award(s,300,'テスト友だち招待',now);break;
 default:throw Error('未対応の操作です');
 }
 return earnView(s,now);
}
