import assert from 'node:assert/strict';
import {bank} from './bank13.mjs';
import {start,legal,step,shape,forbidden,simulate} from './engine13.mjs';
assert.equal(bank.length,200);
assert.equal(shape([0,4,8]).type,'run');assert.equal(shape([0,5,8]),null);
for(const r of [1,2,3,4]){const p=bank.filter(x=>x.target===r);assert.equal(p.length,50);assert.equal(new Set(p.map(x=>x.family)).size,50);for(const x of p){assert.equal(new Set(x.hands.flat()).size,52);for(const h of x.hands)assert.equal(h.length,13);assert(!legal(start(x.hands,x.starter)).some(a=>!a.length));for(let i=0;i<3;i++){const a=simulate(x.hands,x.starter,i);assert.equal(a.rank,r);assert.equal(a.penalties,0);if(r===3)assert(a.close<=2);if(r===4)assert(a.remaining>=1&&a.remaining<=2);}}}
console.log('200 deals / 600 matches');
