import assert from 'node:assert/strict';
import {createEarnState,earnAction,earnView,OFFERS} from '../docs/earn.js';
let s=createEarnState(),now=Date.parse('2026-11-24T00:00:00+09:00');
assert.equal(earnView(s,now).points,0);
assert.throws(()=>earnAction(s,'approve','app',now));
for(const o of OFFERS){earnAction(s,'start',o.id,now);assert.throws(()=>earnAction(s,'start',o.id,now));earnAction(s,'submit',o.id,now);assert.equal(earnView(s,now).pending,o.points);earnAction(s,o.id==='shop'?'reject':'approve',o.id,now);assert.throws(()=>earnAction(s,'approve',o.id,now));}
assert.equal(earnView(s,now).points,OFFERS.filter(o=>o.id!=='shop').reduce((n,o)=>n+o.points,0));
earnAction(s,'checkin',null,now);assert.throws(()=>earnAction(s,'checkin',null,now));assert.throws(()=>earnAction(s,'mission',null,now));
for(let i=0;i<10;i++){const {token}=earnAction(s,'video-start',null,now);assert.throws(()=>earnAction(s,'video-claim',token,now));now+=3000;earnAction(s,'video-claim',token,now);assert.throws(()=>earnAction(s,'video-claim',token,now));}
assert.throws(()=>earnAction(s,'video-start',null,now));earnAction(s,'mission',null,now);assert.throws(()=>earnAction(s,'mission',null,now));earnAction(s,'invite',null,now);assert.throws(()=>earnAction(s,'invite',null,now));
const before=s.points;now+=86400000;s=JSON.parse(JSON.stringify(s));assert.equal(earnView(s,now).day.videos,0);earnAction(s,'checkin',null,now);assert.equal(s.points,before+20);assert.equal(earnView(s,now).pending,0);
console.log('Earn: all 7 offer statuses, denied/replay, video limits, daily rollover, missions and persistence passed');
