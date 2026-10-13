import type {Fight,UserState,World} from './types';

/** Player-only state (follows and picks). Pure helpers: they return a new world and never touch the simulation. */
export const userOf=(w:World):UserState=>w.user??{followed:[],picks:[],pendingPick:null};
export const pickKey=(year:number,round:number)=>`${year}-${round}`;
export function toggleFollow(w:World,id:string):World{
 const u=userOf(w),on=u.followed.includes(id);
 return {...w,user:{...u,followed:on?u.followed.filter(x=>x!==id):[...u.followed,id]}};
}
export function makePick(w:World,fighterId:string):World{
 const u=userOf(w);return {...w,user:{...u,pendingPick:{key:pickKey(w.year,w.round),pick:fighterId}}};
}
/** Settle the pending pick against the main event that was just resolved. */
export function settlePick(w:World,fight:Fight|undefined):World{
 const u=userOf(w);const pending=u.pendingPick;
 if(!pending)return w;
 if(!fight||pending.key!==pickKey(fight.year,fight.roundIndex-1)||(pending.pick!==fight.fighterA&&pending.pick!==fight.fighterB))return {...w,user:{...u,pendingPick:null}};
 const odds=pending.pick===fight.fighterA?fight.oddsA:1-fight.oddsA;
 return {...w,user:{...u,pendingPick:null,picks:[...u.picks,{fightId:fight.id,pick:pending.pick,correct:fight.winnerId===null?null:fight.winnerId===pending.pick,odds,year:fight.year}]}};
}
export function pickStats(u:UserState){
 const decided=u.picks.filter(p=>p.correct!==null);
 let streak=0,best=0,run=0;
 for(const p of decided){run=p.correct?run+1:0;best=Math.max(best,run);}
 for(let i=decided.length-1;i>=0&&decided[i].correct;i--)streak++;
 const correct=decided.filter(p=>p.correct).length;
 return {made:u.picks.length,correct,accuracy:decided.length?correct/decided.length:0,streak,best,upsets:decided.filter(p=>p.correct&&p.odds<.5).length,last:u.picks.at(-1)};
}
