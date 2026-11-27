import assert from 'node:assert/strict';
import {shouldAutoPass} from './auto-pass.mjs';
import {bank} from './bank13-certified.mjs';
import {start,legal,step,cpu} from './engine13.mjs';
assert.equal(shouldAutoPass(null,[[]]),false);
assert.equal(shouldAutoPass({turn:0,finish:[]},[[]]),true);
assert.equal(shouldAutoPass({turn:0,finish:[]},[[1],[]]),false);
assert.equal(shouldAutoPass({turn:0,finish:[]},[]),false);
assert.equal(shouldAutoPass({turn:1,finish:[]},[[]]),false);
assert.equal(shouldAutoPass({turn:0,finish:[0,1,2,3]},[[]]),false);
let forced=0,manual=0;
for(let r=1;r<=4;r++)for(const x of bank.filter(x=>x.target===r).slice(0,25)){
  let s=start(x.hands,x.starter);
  while(s.finish.length<4){const moves=legal(s);if(s.turn===0){if(shouldAutoPass(s,moves)){assert.deepEqual(moves,[[]]);forced++;}else{assert(moves.some(a=>a.length));manual++;}}s=step(s,shouldAutoPass(s,moves)?[]:cpu(s));}
  assert.equal(s.finish.indexOf(0)+1,r);
}
assert(forced>0&&manual>0);console.log({games:100,forced,manual});
