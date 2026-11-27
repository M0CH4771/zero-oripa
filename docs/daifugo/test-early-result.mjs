import assert from 'node:assert/strict';
import {playerRank,revivalOrder} from './early-result.mjs';
import {bank} from './bank13-certified.mjs';
import {start,step,cpu,legal} from './engine13.mjs';
assert.equal(playerRank(null),null);
assert.equal(playerRank({finish:[],good:[1,0],bad:[]}),2);
assert.equal(playerRank({finish:[],good:[],bad:[0]}),4);
assert.equal(playerRank({finish:[],good:[],bad:[1,0]}),3);
let checked=0,skipped=0,penalties=0;
for(let r=1;r<=4;r++)for(const x of bank.filter(x=>x.target===r).slice(0,100))for(let policy=0;policy<3;policy++){
 let s=start(x.hands,x.starter),early=null;
 while(s.finish.length!==4){const p=s.turn;let a=cpu(s,p===0?policy:0);if(policy===2&&p===0&&s.h[0].length===1&&legal(s).some(m=>m.length))a=legal(s).find(m=>m.length);s=step(s,a);if(early===null&&playerRank(s)!==null){early=s;if(s.finish.length!==4)skipped++;if(s.bad.includes(0))penalties++;}}
 assert(early);const copy=JSON.stringify(early);assert.equal(playerRank(early),s.finish.indexOf(0)+1);assert.deepEqual(revivalOrder(early),s.finish);assert.equal(JSON.stringify(early),copy);checked++;
}
assert(skipped>0);console.log({checked,earlyEnd:skipped,penalties});
