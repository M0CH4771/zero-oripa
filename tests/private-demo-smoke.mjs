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
 assert.ok(!packList.some(p=>p.tag==='daily'||p.tag==='new'));
 const initial=(await call('/api/me')).data.user.coins;
 const earnBefore=(await call('/api/earn')).data.points;
 assert.equal((await call('/api/earn/action',{action:'checkin'})).status,200);
 assert.equal((await call('/api/earn')).data.points,earnBefore+20);
 assert.equal((await call('/api/me')).data.user.coins,initial+20,'earn rewards credit shared demo balance');
 const demo=await call('/api/packs/'+id+'/rush-demo',{rate:1000,count:id===11?10:1});
 assert.equal(demo.status,200);assert.equal(demo.data.script.length,demo.data.played);
 assert.equal((await call('/api/me')).data.user.coins,initial+20);
 const normal=await call('/api/packs/'+id+'/rush',{rate:1000,count:id===11?10:1});
 assert.equal(normal.status,200);assert.equal(normal.data.coins,initial+20-normal.data.cost);
 assert.equal(normal.data.cost,id===11?10000:1000);
 const d0=await call('/api/daily');assert.equal(d0.data.available,true);
 const free=await call('/api/packs/'+id+'/daily',{rate:3000,count:100});
 assert.equal(free.status,200);assert.equal(free.data.cost,0);assert.equal(free.data.rate,1000);assert.equal(free.data.coins,normal.data.coins);
 if(id===11)assert.equal(free.data.played,1);
 assert.equal((await call('/api/daily')).data.available,false);
 assert.equal((await call('/api/me')).data.user.bonus_available,false);
 assert.equal((await call('/api/packs/'+ids[(i+1)%ids.length]+'/daily',{})).status,400);
 assert.equal((await call('/api/bonus/claim',{})).status,400);
 console.log(packList.find(p=>p.id===id).name,'demo / regular / daily / shared limit passed');
}
