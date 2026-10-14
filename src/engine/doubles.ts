import {overallOf} from './career';
import type {Fighter,PendingFight,TagState,TagTie,World} from './types';

/* ───────────── Country doubles ─────────────
   Every country with at least two active fighters (any division, any brand) is ranked.
   A country is represented by its two best fit fighters. A tie is two legs: the #1s, then the #2s;
   at 1–1 the side with more finishes wins, then more rounds won. The title belongs to the country:
   the reign continues whoever fights for it. Ranking ties run on the second weekly card of most
   months; the crown is contested in June and at The Pinnacle. */

export const emptyTag=():TagState=>({ratings:{},champion:null,reigns:[],ties:[]});
const now=(w:World)=>w.year*48+w.round;
const fit=(w:World,f:Fighter)=>f.status==='active'&&f.condition>=60&&f.injuryUntil<=now(w);

export function countryRoster(w:World){
 const by=new Map<string,Fighter[]>();
 for(const f of w.fighters)if(f.status==='active')(by.get(f.country)??by.set(f.country,[]).get(f.country)!).push(f);
 return by;
}
/** Countries with at least two active fighters. */
export function eligibleCountries(w:World){return [...countryRoster(w).entries()].filter(([,l])=>l.length>=2).map(([c])=>c);}
/** The country's two best fit fighters, skipping anyone already booked this event. */
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
/** Ranking table: eligible countries by rating, champion first. */
export function doublesRanking(w:World){
 const list=eligibleCountries(w).map(c=>({country:c,rating:ratingOf(w,c)})).sort((a,b)=>b.rating-a.rating);
 const champ=w.tag?.champion;
 return champ?[...list.filter(x=>x.country===champ),...list.filter(x=>x.country!==champ)]:list;
}
const flagOf=(w:World,country:string)=>w.fighters.find(f=>f.country===country)?.flag??'';
function legs(w:World,tie:{id:string;a:string;b:string;title:boolean},ta:[Fighter,Fighter],tb:[Fighter,Fighter],eventName:string):PendingFight[]{
 return [0,1].map(i=>({fighterA:ta[i].id,fighterB:tb[i].id,year:w.year,roundIndex:w.round,division:ta[i].division,titleFight:false,eventName,
  tag:{tie:tie.id,leg:(i+1) as 1|2,a:tie.a,b:tie.b,title:tie.title}}));
}
/** The crown tie: the champion country against the best-ranked challenger (or the top two for a vacant crown). */
export function bookCrownTie(w:World,reserved:Set<string>,eventName:string):PendingFight[]{
 const ranking=doublesRanking(w).map(x=>x.country);
 const usable=ranking.filter(c=>teamOf(w,c,reserved));
 const champ=w.tag!.champion&&usable.includes(w.tag!.champion)?w.tag!.champion:null;
 const a=champ??usable[0];const b=usable.find(c=>c!==a);
 if(!a||!b)return [];
 const tie={id:`tie-${w.year}-${w.round}-c`,a,b,title:true};
 const ta=teamOf(w,a,reserved)!,tb=teamOf(w,b,reserved)!;
 for(const f of [...ta,...tb])reserved.add(f.id);
 return legs(w,tie,ta,tb,eventName);
}
/** Ranking ties: countries are paired with others close in the ranking, avoiding rematches from the last year. */
export function bookRankingTies(w:World,reserved:Set<string>,eventName:string,rnd:()=>number,count=3):PendingFight[]{
 const ranking=doublesRanking(w).map(x=>x.country).filter(c=>c!==w.tag!.champion);
 const recent=new Set(w.tag!.ties.filter(t=>t.year>=w.year-1).map(t=>[t.a,t.b].sort().join('|')));
 const out:PendingFight[]=[];const used=new Set<string>();
 // Start from a random point near the top so the whole field gets ties over a season.
 const order=ranking.map((c,i)=>({c,k:i+rnd()*8})).sort((x,y)=>x.k-y.k).map(x=>x.c);
 for(const a of order){
  if(out.length>=count*2)break;if(used.has(a))continue;
  const ta=teamOf(w,a,reserved);if(!ta)continue;
  const ia=ranking.indexOf(a);
  const b=ranking.filter(c=>c!==a&&!used.has(c)&&!recent.has([a,c].sort().join('|'))&&Math.abs(ranking.indexOf(c)-ia)<=6).find(c=>teamOf(w,c,new Set([...reserved,...ta.map(f=>f.id)])));
  if(!b)continue;
  const tb=teamOf(w,b,new Set([...reserved,...ta.map(f=>f.id)]))!;
  const tie={id:`tie-${w.year}-${w.round}-${out.length/2}`,a,b,title:false};
  used.add(a);used.add(b);for(const f of [...ta,...tb])reserved.add(f.id);
  out.push(...legs(w,tie,ta,tb,eventName));
 }
 return out;
}
/** Settles one tie from its two leg results. Updates ratings and the crown. */
export function settleTie(w:World,def:{tie:string;a:string;b:string;title:boolean},results:{fightId:string;a:string;b:string;w:string|null;finish:boolean;rounds:[number,number]}[]){
 const tag=w.tag!;
 const winsA=results.filter(r=>r.w&&r.w===r.a).length,winsB=results.filter(r=>r.w&&r.w===r.b).length;
 let winner:string|null=winsA>winsB?def.a:winsB>winsA?def.b:null;
 if(!winner){
  const finA=results.filter(r=>r.w===r.a&&r.finish).length,finB=results.filter(r=>r.w===r.b&&r.finish).length;
  const rdA=results.reduce((s,r)=>s+r.rounds[0],0),rdB=results.reduce((s,r)=>s+r.rounds[1],0);
  winner=finA>finB?def.a:finB>finA?def.b:rdA>rdB?def.a:rdB>rdA?def.b:null;
 }
 const ra=ratingOf(w,def.a),rb=ratingOf(w,def.b);
 const ea=1/(1+Math.pow(10,(rb-ra)/400)),sa=winner===def.a?1:winner===def.b?0:.5,k=def.title?40:30;
 tag.ratings[def.a]=Math.round(ra+k*(sa-ea));tag.ratings[def.b]=Math.round(rb-k*(sa-ea));
 const tie:TagTie={id:def.tie,year:w.year,round:w.round,a:def.a,b:def.b,title:def.title,legs:results.map(r=>({fightId:r.fightId,a:r.a,b:r.b,w:r.w})),winner};
 tag.ties.push(tie);
 const fighters=results.flatMap(r=>[r.a,r.b]).filter(id=>w.fighters.find(f=>f.id===id)?.country===winner);
 if(def.title&&winner){
  const champ=tag.champion,reign=tag.reigns.at(-1);
  if(champ===winner&&reign&&!reign.endYear){reign.defenses++;for(const id of fighters)if(!reign.fighters.includes(id))reign.fighters.push(id);
   w.events.push({year:w.year,type:'defense',fighterId:fighters[0]??results[0].a,description:`${flagOf(w,winner)} ${winner} retain the Doubles Crown against ${def.b===winner?def.a:def.b}`});}
  else{
   if(reign&&!reign.endYear){reign.endYear=w.year;reign.endRound=w.round+1;}
   tag.reigns.push({country:winner,startYear:w.year,startRound:w.round+1,defenses:0,fighters,startTie:def.tie});tag.champion=winner;
   w.events.push({year:w.year,type:'title',fighterId:fighters[0]??results[0].a,description:`${winner} win the Doubles Crown, beating ${def.a===winner?def.b:def.a}`});
  }
  for(const id of fighters){const f=w.fighters.find(x=>x.id===id);if(f)f.fame=(f.fame||0)+18;}
 }
 return tie;
}
/** Country reigns a fighter took part in. */
export function doublesHonors(w:World,id:string){return (w.tag?.reigns??[]).filter(r=>r.fighters.includes(id));}
