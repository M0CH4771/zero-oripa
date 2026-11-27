// Nonredeemable demo reward distribution; all random choices made before play.
export const WEIGHTS=[1600,2000,3572,2828];
export const MULTIPLIERS=[[2,3,4,5],[1.5],[.3],[.01]];
export const RTP=WEIGHTS.reduce((sum,w,i)=>sum+w*MULTIPLIERS[i].reduce((a,v)=>a+v,0)/MULTIPLIERS[i].length,0)/10000;
export function drawReward(rand=Math.random){let n=rand()*10000,rank=1;while(rank<4&&n>=WEIGHTS[rank-1]){n-=WEIGHTS[rank-1];rank++;}let m=MULTIPLIERS[rank-1];return {rank,mult:m[Math.floor(rand()*m.length)]};}
