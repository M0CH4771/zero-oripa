import assert from 'node:assert/strict';
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../docs/test-data.json',import.meta.url),'utf8'));
globalThis.window=globalThis;
globalThis.location={origin:'https://example.test'};
const ids=[1,2,3,11,12,13,14,15];
for(const [i,id] of ids.entries()){
 const mem=new Map();
 globalThis.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
 globalThis.fetch=async()=>Response.json(fixture);
 try{await import('../docs/test-api.js?test='+i)}catch(e){if(!String(e).includes('document'))throw e;}
 const call=async(p,b)=>{const r=await fetch(p,b===undefined?undefined:{body:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
 const packList=(await call('/api/packs')).data.packs;
 assert.deepEqual(packList.filter(p=>p.kind==='rush').map(p=>p.id),ids);
 assert.ok(packList.filter(p=>p.kind==='rush').every(p=>p.min_coins===1&&p.min_mult===0));
 assert.ok(!packList.some(p=>p.tag==='daily'||p.tag==='new'));
 const slotRates=[500,1000,2000,3000,4000,5000,10000,20000,30000,50000,100000,200000,300000,400000,500000,1000000];
 for(const p of packList.filter(p=>p.kind==='rush'))assert.deepEqual(p.rates,p.game==='plinko'?[100,300,1000,3000]:slotRates);
 const initial=(await call('/api/me')).data.user.coins;
 const earnBefore=(await call('/api/earn')).data.points;
 assert.equal((await call('/api/earn/action',{action:'checkin'})).status,200);
 assert.equal((await call('/api/earn')).data.points,earnBefore+20);
 assert.equal((await call('/api/me')).data.user.coins,initial+20,'earn rewards credit shared demo balance');
 const demo=await call('/api/packs/'+id+'/rush-demo',{rate:1000,count:id===11?10:1});
 assert.equal(demo.status,200);assert.equal(demo.data.script.length,demo.data.played);
 assert.ok(demo.data.score>=1);assert.ok((demo.data.guarantee||0)<=1);
 if(id===15){assert.equal(demo.data.unit,1);assert.ok(demo.data.finalUnit>=1);for(const s of demo.data.script.filter(s=>s.battle&&s.won))assert.equal(s.upgrade.amount,s.upgrade.values[s.upgrade.selected]);}
 if(id!==11){for(const rate of slotRates){const r=await call('/api/packs/'+id+'/rush-demo',{rate,count:1});assert.equal(r.status,200);assert.equal(r.data.cost,rate);assert.ok(Number.isFinite(r.data.score));}assert.equal((await call('/api/packs/'+id+'/rush-demo',{rate:100})).status,400);}
 else assert.equal((await call('/api/packs/'+id+'/rush-demo',{rate:1000000})).status,400);
 assert.equal((await call('/api/me')).data.user.coins,initial+20);
 const normal=await call('/api/packs/'+id+'/rush',{rate:1000,count:id===11?10:1});
 assert.equal(normal.status,200);assert.equal(normal.data.coins,initial+20-normal.data.cost);
 if(id===15)assert.equal(normal.data.unit,1);
 assert.equal(normal.data.cost,id===11?10000:1000);
 assert.equal((await call('/api/me')).data.stats.today_spent,normal.data.cost);
 await call('/api/me',{daily_limit:normal.data.cost});
 assert.equal((await call('/api/packs/'+id+'/rush',{rate:1000,count:1})).status,400,'daily spending limit enforced');
 assert.equal((await call('/api/me')).data.user.coins,normal.data.coins);
 await call('/api/me',{daily_limit:0});
 const d0=await call('/api/daily');assert.equal(d0.data.available,true);
 const free=await call('/api/packs/'+id+'/daily',{rate:3000,count:100});
 assert.equal(free.status,200);assert.equal(free.data.cost,0);assert.equal(free.data.rate,1000);assert.equal(free.data.coins,normal.data.coins);
 if(id===15)assert.equal(free.data.unit,1);
 if(id===11)assert.equal(free.data.played,1);
 assert.equal((await call('/api/daily')).data.available,false);
 assert.equal((await call('/api/me')).data.user.bonus_available,false);
 assert.equal((await call('/api/packs/'+ids[(i+1)%ids.length]+'/daily',{})).status,400);
 assert.equal((await call('/api/bonus/claim',{})).status,400);
 console.log(packList.find(p=>p.id===id).name,'demo / regular / daily / shared limit passed');
}
