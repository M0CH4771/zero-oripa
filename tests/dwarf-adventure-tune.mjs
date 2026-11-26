// Payout-only model for the proposed adventure mode (virtual test credits).
// Battle-symbol trigger is an independent event on each spin; zero spins forces a battle.
const N=Number(process.argv[2]||100000),p=Number(process.argv[3]||.03),trigger=Number(process.argv[4]||1/12),maxSpins=100;
const values=[1,3,5,10,30,50,100],weights=(process.argv[5]||'40,30,10,10,8,1.5,.5').split(',').map(Number),syms=[4,7,5,8,16,17,18,20],linePay=[20,3,7,5,.5,.4,.3,.2],lines=[[0,1,2],[3,4,5],[6,7,8],[0,4,8],[2,4,6]];
const tiers=[['shield','smallClock','glove','whetstone','shard'],['sword','gold','clock'],['magic','pickaxe','sage'],['crown','evolution','blast'],['relic','revive']];
const rarity=[[70,25,4,1,0],[45,35,15,4,1],[20,30,30,15,5]],actions=[[1,2,-1,-2],[1,2,-1,-3],[1,2,-1,-4]],actionWeights=[[3185,3185,1815,1815],[3103,3103,1897,1897],[2790,2790,2210,2210]];
const rng=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296},rand=rng(0x9e3779b9);
const pick=(w,r=rand)=>{let t=r()*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++)if((t-=w[i])<0)return i;return w.length-1};
const board=new Int8Array(9),stats={sum:0,low:0,loss:0,cap:0,max:0,spins:0,battles:0,wins:0,items:0,forced:0,chestSpins:0,chests:0,enemy:[0,0,0],enemyWins:[0,0,0],itemCounts:Object.fromEntries(tiers.flat().map(k=>[k,0]))};
for(let i=0;i<N;i++){
 let unit=100,remaining=10,played=0,payout=0,shield=0,glove=0,whetstone=0,sword=0,pickaxe=false,sage=false,evolution=0,blast=0,revive=0;
 while(remaining>0&&played<maxSpins&&payout<500000){
  remaining--;played++;let raw=0,count=0,all=blast>0;if(all)blast--;
  const chance=all?1:Math.min(1,p*(pickaxe?1.5:1));
  for(let j=0;j<9;j++){if(rand()<chance){board[j]=8;raw+=values[evolution+pick(weights.slice(evolution))];count++;}else board[j]=pick(syms);}
  for(const [a,b,c] of lines)if(board[a]<8&&board[a]===board[b]&&board[a]===board[c])raw+=linePay[board[a]];
  stats.chests+=count;stats.chestSpins+=count>0;payout+=raw*unit;
  if(payout>=500000||played>=maxSpins)break;
  const early=rand()<trigger;if(remaining>0&&!early)continue;
  stats.battles++;stats.forced+=remaining===0;const monster=Math.floor(rand()*3);stats.enemy[monster]++;
  let hp=4,enemy=Math.max(1,monster+3-whetstone),boost=sword;whetstone=sword=0;pickaxe=false;
  while(hp>0&&enemy>0){const a=actions[monster][pick(actionWeights[monster])];if(a>0){enemy-=a+boost+(glove?1:0);if(glove)glove--;}else if(shield)shield--;else hp+=a;}
  let won=enemy<=0;if(!won&&revive){revive--;won=true;}
  if(!won)continue;
  stats.wins++;stats.enemyWins[monster]++;remaining+=5+Math.floor(rand()*6);
  const tier=pick(rarity[monster].map((w,j)=>sage&&j<2?0:w));sage=false;
  const pool=tiers[tier].filter(k=>k!=='evolution'||evolution<3),item=pool[Math.floor(rand()*pool.length)];stats.items++;stats.itemCounts[item]++;
  switch(item){case'shield':shield++;break;case'smallClock':remaining+=2;break;case'glove':glove++;break;case'whetstone':whetstone++;break;case'shard':unit*=1.1;break;case'sword':sword++;break;case'gold':unit+=50;break;case'clock':remaining+=5;break;case'magic':unit*=1.5;break;case'pickaxe':pickaxe=true;break;case'sage':sage=true;break;case'crown':unit*=2;break;case'evolution':evolution++;break;case'blast':blast++;break;case'relic':unit*=3;break;case'revive':revive++;break;}
 }
 payout=Math.max(1,Math.min(500000,Math.floor(payout)));stats.sum+=payout;stats.low+=payout<1000;stats.loss+=payout<10000;stats.cap+=payout===500000;stats.max=Math.max(stats.max,payout);stats.spins+=played;
}
console.log(JSON.stringify({N,p,trigger,baseChestSpin:1-(1-p)**9,rtp:stats.sum/N/100,low:stats.low/N,loss:stats.loss/N,cap:stats.cap,max:stats.max/10000,avgSpins:stats.spins/N,avgBattles:stats.battles/N,battleWin:stats.wins/stats.battles,avgItems:stats.items/N,actualChestSpin:stats.chestSpins/stats.spins,forced:stats.forced/stats.battles,enemyWins:stats.enemyWins.map((v,i)=>v/stats.enemy[i]),itemShare:Object.fromEntries(Object.entries(stats.itemCounts).map(([k,v])=>[k,v/stats.items]))}));
