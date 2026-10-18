import {abilitiesOf,clamp,overallOf} from './career';
import {emptyStats,MENTALITY_EFFECTS,STAT,styleAdvantage} from './combat';
import {addCareer,recordFight} from './archive';
import type {Fighter,Fight,PendingFight,TagState,TagTie,World,RoundReport,StatLine,ExchangeBeat} from './types';
import {Random} from './random';

/* A Doubles bout is ONE 2v2 tag match, never two unrelated 1v1 fights.
   Partners take turns in the arena, tag out to recover, and share one result.
   National titles and rankings belong to countries, not individual fighters. */
export const emptyTag=():TagState=>({ratings:{},champion:null,reigns:[],ties:[]});
const now=(w:World)=>w.year*48+w.round;
const fit=(w:World,f:Fighter)=>f.status==='active'&&f.condition>=60&&f.injuryUntil<=now(w);
export function countryRoster(w:World){
 const by=new Map<string,Fighter[]>();
 for(const f of w.fighters)if(f.status==='active')(by.get(f.country)??by.set(f.country,[]).get(f.country)!).push(f);
 return by;
}
export function eligibleCountries(w:World){return [...countryRoster(w).entries()].filter(([,l])=>l.length>=2).map(([c])=>c);}
export function teamOf(w:World,country:string,exclude:Set<string>=new Set()):[Fighter,Fighter]|null{
 const list=w.fighters.filter(f=>f.country===country&&fit(w,f)&&!exclude.has(f.id)).sort((a,b)=>overallOf(b,w.year)-overallOf(a,w.year));
 return list.length>=2?[list[0],list[1]]:null;
}
export function ratingOf(w:World,country:string){
 const tag=w.tag!;
 if(tag.ratings[country]===undefined){
  const top=w.fighters.filter(f=>f.country===country&&f.status==='active').sort((a,b)=>overallOf(b,w.year)-overallOf(a,w.year)).slice(0,2);
  const avg=top.reduce((s,f)=>s+overallOf(f,w.year),0)/Math.max(1,top.length);
  tag.ratings[country]=Math.round(1500+(avg-75)*8);
 }
 return tag.ratings[country];
}
export function doublesRanking(w:World){
 const list=eligibleCountries(w).map(country=>({country,rating:ratingOf(w,country)})).sort((a,b)=>b.rating-a.rating);
 const champ=w.tag?.champion;
 return champ?[...list.filter(x=>x.country===champ),...list.filter(x=>x.country!==champ)]:list;
}
const flagOf=(w:World,country:string)=>w.fighters.find(f=>f.country===country)?.flag??'';
function makeMatch(w:World,id:string,a:string,b:string,ta:[Fighter,Fighter],tb:[Fighter,Fighter],eventName:string,title:boolean,challengerLock=false):PendingFight{
 return {fighterA:ta[0].id,fighterB:tb[0].id,division:ta[0].division,year:w.year,roundIndex:w.round,titleFight:false,eventName,
  tag:{tie:id,a,b,teamA:[ta[0].id,ta[1].id],teamB:[tb[0].id,tb[1].id],title,challengerLock}};
}
/** A nation's previously earned challenger-lock is honored unless it lacks a healthy squad. */
export function bookCrownTie(w:World,reserved:Set<string>,eventName:string):PendingFight[]{
 const usable=doublesRanking(w).map(x=>x.country).filter(c=>teamOf(w,c,reserved));
 const champ=w.tag!.champion&&usable.includes(w.tag!.champion)?w.tag!.champion:null;
 const locked=w.tag!.lockedChallenger?.forRound===w.round&&usable.includes(w.tag!.lockedChallenger.country)?w.tag!.lockedChallenger.country:null;
 const a=champ??locked??usable[0],b=champ?(locked&&locked!==champ?locked:usable.find(c=>c!==champ)):
  (locked?usable.find(c=>c!==locked):usable.find(c=>c!==a));
 if(!a||!b||a===b)return [];
 const ta=teamOf(w,a,reserved)!,tb=teamOf(w,b,reserved)!;
 for(const f of [...ta,...tb])reserved.add(f.id);
 return [makeMatch(w,`tie-${w.year}-${w.round}-c`,a,b,ta,tb,eventName,true)];
}
/** May and November: countries fight to secure the next Doubles Crown challenger berth. */
export function bookChallengerLock(w:World,reserved:Set<string>,eventName:string):PendingFight[]{
 const ranked=doublesRanking(w).map(x=>x.country).filter(c=>c!==w.tag!.champion&&teamOf(w,c,reserved));
 const a=ranked[0],b=ranked.find(c=>c!==a);
 if(!a||!b)return [];
 const ta=teamOf(w,a,reserved)!,tb=teamOf(w,b,reserved)!;
 for(const f of [...ta,...tb])reserved.add(f.id);
 return [makeMatch(w,`tie-${w.year}-${w.round}-lock`,a,b,ta,tb,eventName,false,true)];
}
/** A ranking match is a single 2v2 bout with two fighters from each country. */
export function bookRankingTies(w:World,reserved:Set<string>,eventName:string,rnd:()=>number,count=3):PendingFight[]{
 const ranking=doublesRanking(w).map(x=>x.country).filter(c=>c!==w.tag!.champion);
 const recent=new Set(w.tag!.ties.filter(t=>t.year>=w.year-1).map(t=>[t.a,t.b].sort().join('|')));
 const out:PendingFight[]=[],used=new Set<string>();
 const order=ranking.map((c,i)=>({c,k:i+rnd()*8})).sort((x,y)=>x.k-y.k).map(x=>x.c);
 for(const a of order){
  if(out.length>=count||used.has(a))continue;
  const ta=teamOf(w,a,reserved);if(!ta)continue;
  const ia=ranking.indexOf(a);
  const b=ranking.filter(c=>c!==a&&!used.has(c)&&!recent.has([a,c].sort().join('|'))&&Math.abs(ranking.indexOf(c)-ia)<=6)
   .find(c=>teamOf(w,c,new Set([...reserved,...ta.map(f=>f.id)])));
  if(!b)continue;
  const tb=teamOf(w,b,new Set([...reserved,...ta.map(f=>f.id)]))!;
  used.add(a);used.add(b);for(const f of [...ta,...tb])reserved.add(f.id);
  out.push(makeMatch(w,`tie-${w.year}-${w.round}-${out.length}`,a,b,ta,tb,eventName,false));
 }
 return out;
}

const sum=(arr:StatLine[])=>arr.reduce((acc,line)=>{line.forEach((v,i)=>{acc[i]+=v;});return acc;},emptyStats());
/** One continuous team contest. Tags are legal throughout each round, with separate
    energy, damage and skills for each of the four competitors. */
export function resolveTagMatch(w:World,rng:Random,p:PendingFight,record:boolean):Fight{
 const spec=p.tag!;
 const teams:[Fighter,Fighter][]= [spec.teamA.map(id=>w.fighters.find(f=>f.id===id)!) as [Fighter,Fighter],spec.teamB.map(id=>w.fighters.find(f=>f.id===id)!) as [Fighter,Fighter]];
 if(teams.flat().some(f=>!f||f.status!=='active'))throw Error('Missing Doubles teammate');
 const fighters=[...teams[0],...teams[1]];
 if(new Set(fighters.map(f=>f.id)).size!==4)throw Error('Duplicate Doubles fighter');
 const energy=[100,100,100,100],damage=[0,0,0,0],stats=fighters.map(()=>emptyStats());
 const conditions=fighters.map(f=>f.condition);
 const active:[number,number]=[0,2];
 const rounds:RoundReport[]=[],roundsLimit=spec.title?5:3;
 const points=[0,0];let winner:0|1|null=null,method:Fight['method']='UD',finishRound=roundsLimit,finishTime='5:00';
 let timeSpent=0;
 for(let round=1;round<=roundsLimit;round++){
  const rs=[emptyStats(),emptyStats()];const notes:string[]=[],timeline:ExchangeBeat[]=[];let scores=[0,0];
  for(let tick=0;tick<12;tick++){
   const elapsed=tick*25;
   const acts:NonNullable<ExchangeBeat['acts']>=[];
   for(const t of [0,1] as const){
    const cur=active[t],partner=t*2+(cur===t*2?1:0);
    if((energy[cur]<56||damage[cur]>35||rng.next()<.08)&&energy[partner]>energy[cur]-15){
     active[t]=partner;energy[partner]=Math.min(100,energy[partner]+1.5);
     const text=`TAG! ${fighters[cur].name} hands off to ${fighters[partner].name} for ${t===0?spec.a:spec.b}.`;
     notes.push(text);acts.push({t:elapsed+2,by:t,k:`tag:${fighters[partner].name}`,c:'grapple'});
    }
   }
   for(const side of (rng.next()<.5?[0,1]:[1,0]) as (0|1)[]){
    const i=active[side],j=active[1-side],att=fighters[i],def=fighters[j];
    const offense=abilitiesOf(att,w.year),defense=abilitiesOf(def,w.year);
    const mentality=MENTALITY_EFFECTS[att.mentality]??MENTALITY_EFFECTS.Strategist;
    const tired=(100-energy[i])*.14+damage[i]*.09;
    const edge=(overallOf(att,w.year)-overallOf(def,w.year)+styleAdvantage(att.style,def.style)-tired+((100-energy[j])*.14+damage[j]*.09))/16;
    const chance=clamp(.48+edge*.15,.13,.86);
    const n=rng.int(1,2)+(rng.next()<.35?1:0);
    stats[i][STAT.STR]+=n;rs[side][STAT.STR]+=n;
    const landed=Array.from({length:n},()=>rng.next()<chance).filter(Boolean).length;
    stats[i][STAT.STRL]+=landed;stats[i][STAT.SIG]+=n;stats[i][STAT.SIGL]+=landed;
    rs[side][STAT.STRL]+=landed;rs[side][STAT.SIG]+=n;rs[side][STAT.SIGL]+=landed;
    const hit=landed*(3.3+Math.max(0,offense.Hands-70)*.06)*mentality.impact;
    damage[j]+=hit*.60;scores[side]+=hit;stats[i][STAT.DMG]+=hit;rs[side][STAT.DMG]+=hit;
    energy[i]=clamp(energy[i]-((2+n*1.7)*mentality.energyFactor)*Math.exp((80-offense.Stamina)/32),2,100);
    if(landed)acts.push({t:elapsed+15,by:side,k:rng.next()<.3?'hook':'cross',c:'strike'});
    if(landed&&rng.next()<.065){stats[i][STAT.KD]++;rs[side][STAT.KD]++;scores[side]+=10;acts.push({t:elapsed+20,by:side,k:'knockdown',c:'impact'});}
    const finChance=landed>0&&damage[j]>32?(damage[j]-30)*.0007*Math.max(.45,mentality.impact):0;
    const subChance=(offense.Submissions-defense.Defense>4&&rng.next()<.07)?clamp((offense.Submissions-defense.Defense)*.002,0,.06):0;
    if(rng.next()<finChance+subChance){
     winner=side;method=rng.next()<(subChance/(finChance+subChance))?'SUB':rng.next()<.5?'KO':'TKO';
     finishRound=round;finishTime=`${Math.floor((elapsed+25)/60)}:${String((elapsed+25)%60).padStart(2,'0')}`;
     acts.push({t:elapsed+24,by:side,k:method==='SUB'?'tap':method==='KO'?'ko':'tko',c:'finish'});
     notes.push(`${att.name} finishes ${def.name}! ${spec[side===0?'a':'b']} take the tag-team match.`);
     break;
    }
   }
   timeSpent+=25;
   if(record)timeline.push({elapsed:elapsed+25,position:'Stand-up',activeA:fighters[active[0]].id,activeB:fighters[active[1]].id,acts,sa:[...rs[0]],sb:[...rs[1]],staminaA:Math.round(energy[active[0]]),staminaB:Math.round(energy[active[1]]),damageA:Math.round(damage[active[0]]),damageB:Math.round(damage[active[1]])});
   if(winner!==null)break;
   for(const i of [0,1,2,3])if(!active.includes(i))energy[i]=clamp(energy[i]+3.6,2,100);
  }
  if(winner===null){const margin=scores[0]-scores[1];points[margin>=0?0:1]++;
   for(const i of [0,1,2,3])energy[i]=clamp(energy[i]+5,2,100);
  }
  rounds.push({number:round,scoreA:winner!==null?10:scores[0]>=scores[1]?10:9,scoreB:winner!==null?10:scores[1]>scores[0]?10:9,
   a:rs[0].map(Math.round),b:rs[1].map(Math.round),staminaA:Math.round(energy[active[0]]),staminaB:Math.round(energy[active[1]]),
   notes:notes.length?notes:[`Round ${round}: ${spec.a} and ${spec.b} trade tags and scoring attacks.`],...(record?{timeline}:{})});
  if(winner!==null)break;
 }
 if(winner===null){winner=points[0]===points[1]?null:points[0]>points[1]?0:1;method=winner===null?'DRAW':'UD';}
 const winCountry=winner===null?null:winner===0?spec.a:spec.b;
 // Every teammate participated. Award realistic physical wear and individual career stats,
 // but not four fake 1v1 wins/losses in the singles rankings.
 for(let i=0;i<4;i++){
  const f=fighters[i],loss=clamp(Math.round(4+(100-energy[i])*.21+damage[i]*.15),5,36);
  f.condition=clamp(f.condition-loss,0,100);
  addCareer(f,stats[i],stats[(i+2)%4],Math.floor(timeSpent/2),0);
  if(winCountry===f.country)f.fame=(f.fame||0)+(spec.title?18:spec.challengerLock?5:2);
 }
 const oddsA=clamp(1/(1+Math.exp(-(teams[0].reduce((s,f)=>s+overallOf(f,w.year),0)-teams[1].reduce((s,f)=>s+overallOf(f,w.year),0))/15)),.05,.95);
 const leadA=teams[0][0],leadB=teams[1][0];
 const fight:Fight={id:`bt-${w.nextFightId++}`,year:w.year,roundIndex:w.round+1,division:leadA.division,fighterA:leadA.id,fighterB:leadB.id,winnerId:winner===null?null:teams[winner][0].id,
  method,finishRound,finishTime,rounds,scheduledRounds:roundsLimit,statsA:sum([stats[0],stats[1]]),statsB:sum([stats[2],stats[3]]),
  rankBeforeA:leadA.rank,rankBeforeB:leadB.rank,rankAfterA:leadA.rank,rankAfterB:leadB.rank,overallBeforeA:overallOf(leadA,w.year),overallBeforeB:overallOf(leadB,w.year),
  oddsA,ratingDeltaA:0,ratingDeltaB:0,shapeDeltaA:0,shapeDeltaB:0,conditionDeltaA:leadA.condition-conditions[0],conditionDeltaB:leadB.condition-conditions[2],
  injuredIds:[],underdogVictory:winner!==null&&(winner===0?oddsA<.35:oddsA>.65),headline:`${winCountry??`${spec.a} and ${spec.b}`} ${winCountry?'win':'draw'} the ${spec.title?'Doubles Crown':spec.challengerLock?'challenger lock':'Doubles ranking'} tag match · ${method}`,eventName:p.eventName,
  titleFight:false,titleChange:false,tournamentId:`tag-${w.year}`,tournamentStage:spec.title?'Doubles Crown':spec.challengerLock?'Doubles Challenger Lock':'Doubles Ranking',tag:{...spec,winner:winCountry}};
 recordFight(w,fight);
 settleTagMatch(w,fight);
 return fight;
}

/** National Elo, challenger locks and the one true country championship result. */
export function settleTagMatch(w:World,fight:Fight){
 const def=fight.tag!;const tag=w.tag!;const winner=def.winner??null;
 const ra=ratingOf(w,def.a),rb=ratingOf(w,def.b);
 const ea=1/(1+Math.pow(10,(rb-ra)/400)),sa=winner===def.a?1:winner===def.b?0:.5,k=def.title?40:def.challengerLock?35:30;
 tag.ratings[def.a]=Math.round(ra+k*(sa-ea));tag.ratings[def.b]=Math.round(rb-k*(sa-ea));
 const tie:TagTie={id:def.tie,year:w.year,round:w.round,a:def.a,b:def.b,title:def.title,legs:[],winner,matchFightId:fight.id,teams:[def.teamA,def.teamB],challengerLock:def.challengerLock};
 tag.ties.push(tie);
 if(def.challengerLock&&winner){tag.lockedChallenger={country:winner,year:w.year,round:w.round,forRound:w.round+4};
  w.events.push({year:w.year,type:'eliminator',fighterId:winner===def.a?def.teamA[0]:def.teamB[0],description:`${flagOf(w,winner)} ${winner} win the Doubles Crown challenger lock.`,fightId:fight.id});}
 if(def.title&&winner){
  const fighters=winner===def.a?def.teamA:def.teamB;
  const champ=tag.champion,reign=tag.reigns.at(-1);
  if(champ===winner&&reign&&!reign.endYear){reign.defenses++;for(const id of fighters)if(!reign.fighters.includes(id))reign.fighters.push(id);
   w.events.push({year:w.year,type:'defense',fighterId:fighters[0],description:`${flagOf(w,winner)} ${winner} retain the Doubles Crown against ${winner===def.a?def.b:def.a}`,fightId:fight.id});}
  else{
   if(reign&&!reign.endYear){reign.endYear=w.year;reign.endRound=w.round+1;}
   tag.reigns.push({country:winner,startYear:w.year,startRound:w.round+1,defenses:0,fighters:[...fighters],startTie:def.tie});tag.champion=winner;
   w.events.push({year:w.year,type:'title',fighterId:fighters[0],description:`${flagOf(w,winner)} ${winner} win the Doubles Crown against ${winner===def.a?def.b:def.a}`,fightId:fight.id});
  }
  tag.lockedChallenger=undefined;
 }
 return tie;
}
/** Older saves' historical two-leg ties are preserved in their existing format. */
export function doublesHonors(w:World,id:string){return (w.tag?.reigns??[]).filter(r=>r.fighters.includes(id));}
