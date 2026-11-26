/* Shared presentation only. No game math or account mutation. */
(function(root){
 const meta=Object.freeze({
  rush:{name:'RUSH',logo:'gems',accent:'#ba8aff',unit:'スピン'},fruit:{name:'FRUITS',logo:'fruit',accent:'#ffa4cc',unit:'スピン'},mine:{name:'MINE',logo:'mine',accent:'#efbd79',unit:'スピン'},gods:{name:'GODS',logo:'gods',accent:'#c0a4ff',unit:'スピン'},dogs:{name:'DOGS',logo:'dogs',accent:'#e8c393',unit:'スピン'},dwarf:{name:'DWARF',logo:'dwarf',accent:'#8dd9b2',unit:'フリースピン'},plinko:{name:'PLINKO',logo:'plinko',accent:'#8fe3f5',unit:'球'},tropical:{name:'HIBISCUS',logo:'tropical',accent:'#83dce5',unit:'スピン'},train:{name:'TRAIN',logo:'train',accent:'#e5b86e',unit:'リスピン'}
 });
 const fmt=n=>Number(n??0).toLocaleString('ja-JP',{maximumFractionDigits:2});
 const text=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const timing=Object.freeze({normal:1,quick:.5,turbo:.25,reel:1100,pause:200});
 const speedName=n=>n===timing.normal?'NORMAL':n===timing.quick?'QUICK':'TURBO';
 const nextSpeed=n=>n===timing.normal?timing.quick:n===timing.quick?timing.turbo:timing.normal;
 const result=(game,{score=0,cost=0,played=0,base=cost}={})=>{
  const m=meta[game]||meta.rush,ratio=base>0?fmt(score/base)+'倍':'—',logo=m.logo==='tropical'?'logo103.webp':'logo.webp';
  return '<section class="zero-result" style="--zero-accent:'+m.accent+'"><img class="zero-result-logo" src="./assets/anime/'+m.logo+'/'+logo+'" alt="ZERO '+m.name+'"><span class="zero-result-kicker">PLAY COMPLETE</span><div class="zero-result-value"><span>獲得コイン（確定）</span><strong>'+fmt(score)+'<small> C</small></strong></div><div class="zero-result-stats"><div><span>消化'+m.unit+'</span><b>'+fmt(played)+'</b></div><div><span>消費C比</span><b>'+text(ratio)+'</b></div><div><span>消費C</span><b>'+fmt(cost)+'</b></div></div></section>';
 };
 root.ZEROGameUI=Object.freeze({meta,timing,speedName,nextSpeed,result});
})(globalThis);