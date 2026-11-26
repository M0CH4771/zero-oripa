import assert from 'node:assert/strict';
import {dwarfAdventureStream,DWARF_ITEMS} from '../docs/test-games/dwarf-adventure.js';
let seed=0x9e3779b9;
const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
const N=Number(process.argv[2]||100000),rate=10000;
const totals={rtp:0,low:0,loss:0,spins:0,battles:0,items:0,cap:0,max:0},seen=new Set,encounters={Goblin:0,Troll:0,Dragon:0};
for(let i=0;i<N;i++){
 const it=dwarfAdventureStream({rate,rand}),entry=it.next().value;
 assert.equal(entry.unit,100);let n,ledger=0,triggered=false;
 while(!(n=it.next()).done){
  const s=n.value;ledger+=s.win;
  if(s.battle){assert.ok(triggered);triggered=false;totals.battles++;encounters[s.monster]++;assert.equal(s.heroMax,5);
   for(const a of s.actions){assert.ok(a.attacker==='hero'||a.attacker==='enemy');assert.ok(Number.isInteger(a.damage)&&a.damage>=1&&a.damage<=5);assert.equal(a.roll,a.attacker==='hero'?a.damage:-a.damage);assert.ok(a.heroHP>=0&&a.heroHP<=5);}
   if(s.won){assert.equal(s.awarded,({Goblin:5,Troll:10,Dragon:20})[s.monster]);assert.ok(s.reward);totals.items++;seen.add(s.reward.key);}
   else assert.equal(s.reward,null);
  }else{assert.equal(s.grid.length,9);triggered=s.battleTriggered;if(s.activated.includes('blast'))assert.equal(s.chests.length,9);else if(s.battleTriggered)assert.deepEqual(s.grid.slice(3,6),['S','S','S']);assert.ok(s.chests.every(c=>c.value>=s.inventory.minimum));}
  assert.ok(s.inventory.minimum<=10);assert.ok(s.freePlayed<=100);
 }
 const r=n.value;assert.equal(r.score,Math.max(1,ledger));assert.ok(r.score<=rate*50);
 totals.rtp+=r.score/rate;totals.low+=r.score<rate*.1;totals.loss+=r.score<rate;totals.spins+=r.freePlayed;totals.cap+=r.capped;totals.max=Math.max(r.score/rate,totals.max);
}
assert.equal(seen.size,DWARF_ITEMS.length);
for(const [enemy,p] of Object.entries({Goblin:.5,Troll:.3,Dragon:.2}))assert.ok(Math.abs(encounters[enemy]/totals.battles-p)<.01);
console.log({N,rtp:totals.rtp/N*100,low:totals.low/N*100,loss:totals.loss/N*100,avgSpins:totals.spins/N,avgBattles:totals.battles/N,avgItems:totals.items/N,max:totals.max,cap:totals.cap,encounters:Object.fromEntries(Object.entries(encounters).map(([k,v])=>[k,v/totals.battles*100]))});
