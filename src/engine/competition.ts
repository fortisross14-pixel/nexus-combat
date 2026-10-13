import {DIVISIONS} from './constants';
import {ageOf,clamp,overallOf} from './career';
import {Random} from './random';
import {simulateCombat,styleAdvantage,matchupOdds,type CombatResolution} from './combat';
import {addCareer,recordFight} from './archive';
import {applyBoutResult,pinChampionForm,FORM_MAX,BELT_DIVISION,BELT_REGION,CONTINENTAL_BELTS,isContinentalRound,isWorldTitleRound,protectedChampions,type ContinentalBelt} from './belts';
import type {BeltId,BoutKind,Division,Fight,Fighter,LedgerEntry,PendingFight,World} from './types';

/** Five events in each of twelve months: four weekly circuit cards plus a marquee.
    Tournament marquee slots remain part of the 60-event calendar. */
export const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
const MARQUEES=[
 {name:'ORIGIN',label:'Season opener · title eliminator',title:false},
 {name:'ASCENSION',label:'Contender trials · title eliminator',title:false},
 {name:'FIGHTOPIA',label:'World Crown night',title:true},
 {name:'AFTERSHOCK',label:'Spring showdown · title eliminator',title:false},
 {name:'FRONTIER',label:'Rising contenders · title eliminator',title:false},
 {name:'FAULTLINE',label:'World Crown night',title:true},
 {name:'THE SURGE',label:'Twenty-fighter Royale',title:false},
 {name:'HORIZON',label:'International showcase · title eliminator',title:false},
 {name:'COLLISION',label:'Autumn showcase · title eliminator',title:false},
 {name:'EQUINOX',label:'Season race · title eliminator',title:false},
 {name:'THE CRUCIBLE',label:'Grand Prix',title:false},
 {name:'THE PINNACLE',label:'The ultimate World Crown main event',title:true}
];
export const CALENDAR=MONTHS.flatMap((month,mi)=>Array.from({length:5},(_,wi)=>wi===4?
 {...MARQUEES[mi],month,kind:'major' as const,week:5,monthIndex:mi}:
 {name:`CIRCUIT ${String(wi+1).padStart(2,'0')}`,month,label:`${month} / Week ${wi+1}${wi===3&&mi%3===1?' · Continental title night':''}`,kind:'circuit' as const,title:false,week:wi+1,monthIndex:mi}));
export const ROUNDS_PER_YEAR=CALENDAR.length;
export const ROUND_NAMES=CALENDAR.map(e=>`${e.name} · ${e.month}${e.week<5?` W${e.week}`:''}`);
export const MONTH_OF=(round:number)=>Math.floor(round/5);
export const WEEK_OF=(round:number)=>round%5;
export const CLOCK=(year:number,round:number)=>year*ROUNDS_PER_YEAR+round;
export const isTournamentSlot=(year:number,round:number)=>round===34||round===54||round===39&&year%4===0;
export const emptyRecord=()=>({wins:0,losses:0,draws:0,kos:0,submissions:0,decisions:0,streak:0,longestWinStreak:0});
export function pointsSeed(f:Fighter,year:number){return Math.round(clamp(1250+(overallOf(f,year)-72)*11+(f.condition-80)*.2,850,2050));}

/** Net wins over the last twelve months (60 events), per fighter. Circuit bouts only. */
export function recentForm(w:World):Map<string,number>{
 const now=CLOCK(w.year,w.round),form=new Map<string,number>();
 for(const y of [w.year-1,w.year])for(const e of w.ledger[y]||[]){
  if(e.t||now-CLOCK(e.y,e.e-1)>60||!e.w)continue;
  const l=e.w===e.a?e.b:e.a;form.set(e.w,(form.get(e.w)||0)+1);form.set(l,(form.get(l)||0)-1);
 }
 return form;
}
/** Current competitive level: ability, capped recent form and ranking points. Lifetime record no longer counts. */
export function competitiveScore(f:Fighter,year:number,form=0){return overallOf(f,year)+clamp(form,-6,6)*.6+clamp((f.rankingPoints-1250)*.012,-5,6);}
export function rankByCompetition(w:World){
 for(const d of DIVISIONS)w.fighters.filter(f=>f.status==='active'&&f.division===d).sort((a,b)=>b.rankingPoints-a.rankingPoints||b.record.wins-a.record.wins||a.id.localeCompare(b.id)).forEach((f,i)=>f.rank=i+1);
}
type RivalStats=Map<string,{count:number;last:number}>;
const pairKey=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`;
function buildRivalIndex(w:World):RivalStats {
 const map:RivalStats=new Map();
 const add=(e:LedgerEntry)=>{const key=pairKey(e.a,e.b),entry=map.get(key),at=CLOCK(e.y,e.e-1);if(entry){entry.count++;entry.last=Math.max(entry.last,at);}else map.set(key,{count:1,last:at});};
 for(const y of [w.year-2,w.year-1,w.year])for(const e of w.ledger[y]||[])if(!e.t)add(e);
 return map;
}
/** Same pair within six months is effectively ruled out; recent and repeated pairings are discouraged. */
function rivalsPenalty(a:Fighter,b:Fighter,w:World,index:RivalStats){
 const entry=index.get(pairKey(a.id,b.id));if(!entry)return 0;
 const elapsed=CLOCK(w.year,w.round)-entry.last;
 return elapsed<=30?200:elapsed<=60?30:entry.count>=3?25:8;
}
/** A healthy fighter is allocated ONE circuit bout each month. Injured/unfit
    athletes are medically exempt; nobody is pushed into a second bout to fill a card.
    Four earlier weekly cards absorb the quota in months with special-event finales. */
export function scheduleDivision(w:World,division:Division,rng:Random,index:RivalStats=buildRivalIndex(w),reserved:Set<string>=new Set()):[string,string][]{
 const now=CLOCK(w.year,w.round),start=MONTH_OF(w.round)*5+1;
 const fought=new Set<string>();
 for(let i=w.fights.length-1;i>=0;i--){const f=w.fights[i];if(f.year!==w.year||f.roundIndex<start)break;
  fought.add(f.fighterA);fought.add(f.fighterB);
 }
 const monthlyFinale=(MONTH_OF(w.round)+1)*5-1;
 const remainingEvents=isTournamentSlot(w.year,monthlyFinale)?Math.max(1,4-WEEK_OF(w.round)):Math.max(1,5-WEEK_OF(w.round));
 const available=w.fighters.filter(f=>f.status==='active'&&f.division===division&&f.condition>=60&&f.injuryUntil<=now&&!fought.has(f.id)&&!reserved.has(f.id));
 const pairs:[string,string][]=[];
 const quota=Math.ceil(available.length/(remainingEvents*2));
 const unpaired=new Set(available.map(f=>f.id));
 while(unpaired.size>=2&&pairs.length<quota){
  const options=available.filter(f=>unpaired.has(f.id)).sort((a,b)=>a.rank-b.rank);
  // Not always #1 versus #2: distribute seeds across the division for credible movement.
  const f=options[rng.int(0,Math.min(options.length-1,4))];
  const ranked=options.filter(g=>g.id!==f.id).map(g=>({g,score:Math.abs(g.rank-f.rank)*1.4+rivalsPenalty(f,g,w,index)+rng.float(0,13)})).sort((a,b)=>a.score-b.score);
  const opponent=ranked[0]?.g;if(!opponent)break;
  unpaired.delete(f.id);unpaired.delete(opponent.id);pairs.push([f.id,opponent.id]);
 }
 // An odd-sized healthy roster can leave one eligible fighter unmatched.
 // Give that fighter a bout with a recovered athlete whose first monthly fight
 // occurred at least two event-weeks ago, rather than silently skipping them.
 const finalCircuitEvent=isTournamentSlot(w.year,monthlyFinale)?WEEK_OF(w.round)===3:WEEK_OF(w.round)===4;
 if(finalCircuitEvent&&unpaired.size===1){
  const lone=w.fighters.find(f=>f.id===[...unpaired][0])!;
  const justNow=new Set<string>();
  for(const id of w.lastFightIds){const b=w.fights.find(x=>x.id===id);if(b){justNow.add(b.fighterA);justNow.add(b.fighterB);}}
  const options=w.fighters.filter(f=>f.status==='active'&&f.division===division&&f.id!==lone.id&&
   f.condition>=65&&f.injuryUntil<=now&&!reserved.has(f.id)&&fought.has(f.id)&&!justNow.has(f.id))
   .map(f=>({f,score:Math.abs(f.rank-lone.rank)+rivalsPenalty(f,lone,w,index)*.5+rng.float(0,8)}))
   .sort((a,b)=>a.score-b.score);
  if(options[0]&&options[0].score<150)pairs.push([lone.id,options[0].f.id]);
 }
 return pairs;
}
function shapeShift(f:Fighter,opponent:Fighter,outcome:'win'|'loss'|'draw',method:Fight['method'],finishRound:number,year:number,wasStreak:number){
 if(outcome==='draw')return f.shape>0?-1:f.shape<0?1:0;
 if(outcome==='win'){let gain=1;if(method==='KO'||method==='SUB'||method==='TKO')gain+=finishRound===1?1:0;
 if(overallOf(f,year)+4<overallOf(opponent,year))gain++;if(wasStreak>=2&&f.shape<4)gain++;return Math.min(FORM_MAX-f.shape,gain);}
 let loss=wasStreak>=3?-1:wasStreak<=-2?-3:wasStreak<=-1?-2:-1;
 if((method==='KO'||method==='SUB'||method==='TKO')&&finishRound===1&&wasStreak<2)loss--;
 return Math.max(-FORM_MAX-f.shape,loss);
}
function updateRecord(winner:Fighter,loser:Fighter,method:Fight['method']){
 winner.record.wins++;winner.record.streak=Math.max(1,winner.record.streak+1);winner.record.longestWinStreak=Math.max(winner.record.longestWinStreak,winner.record.streak);
 loser.record.losses++;loser.record.streak=Math.min(-1,loser.record.streak-1);
 if(method==='KO'||method==='TKO')winner.record.kos++;else if(method==='SUB')winner.record.submissions++;else winner.record.decisions++;
}
const stoppage=(m:Fight['method'])=>m==='KO'||m==='TKO'||m==='SUB';
/** Post-fight medical. `scale` lowers the risk for short tournament bouts. */
function rollInjuries(w:World,rng:Random,a:Fighter,b:Fighter,result:CombatResolution,scale=1){
 const injuredIds:string[]=[];const injuries:NonNullable<Fight['injuries']>=[];
 for(const fighter of [a,b]){
  const lost=fighter.id===a.id?result.conditionLossA:result.conditionLossB;
  const defeated=result.winnerId!==null&&fighter.id!==result.winnerId;
  const seriousLoss=defeated&&(stoppage(result.method)||lost>=30);
  // Trauma risk attaches primarily to severe defeats. A clean win rarely injures.
  const risk=scale*(seriousLoss?clamp((result.method==='KO'||result.method==='TKO'?.065:result.method==='SUB'?.042:.019)+Math.max(0,lost-28)*.003,.012,.18):clamp((lost-22)*.00035,.0005,.009));
  if(rng.next()<risk){
   const severity=rng.next();const major=severity<.12,moderate=severity<.47;
   const weeks=major?rng.int(8,13):moderate?rng.int(4,7):rng.int(2,3);
   const diagnosis=major?(result.method==='KO'||result.method==='TKO'?'Concussion protocol':'Serious ligament injury'):moderate?(result.method==='SUB'?'Joint sprain':'Medical suspension'):'Contusion / minor strain';
   fighter.condition=rng.int(major?8:moderate?17:28,major?19:moderate?29:37);
   fighter.injuryUntil=CLOCK(w.year,w.round)+weeks;
   fighter.injuryName=diagnosis;fighter.injurySeverity=major?'major':moderate?'moderate':'minor';
   injuredIds.push(fighter.id);injuries.push({fighterId:fighter.id,diagnosis,weeks,severity:fighter.injurySeverity});
  }
 }
 return {injuredIds,injuries};
}
const methodText=(m:Fight['method'])=>m==='SUB'?'submission':m==='KO'?'knockout':m==='TKO'?'technical knockout':m==='UD'?'unanimous decision':m==='SD'?'split decision':m==='MD'?'majority decision':'draw';
/** A win the model gave less than a 35% chance. */
const isUpset=(winnerId:string|null,a:Fighter,oddsA:number)=>!!winnerId&&(winnerId===a.id?oddsA<.35:oddsA>.65);

/** All normal bouts and title fights use this identical resolution and record-keeping pipeline. */
interface BoutOptions {belt?:BeltId;kind?:BoutKind;featured?:boolean;}
const isTitleKind=(k?:BoutKind)=>k==='title'||k==='interim'||k==='unification';
function resolveBout(w:World,rng:Random,idA:string,idB:string,opts:BoutOptions={}):Fight{
 const titleFight=isTitleKind(opts.kind),featured=!!opts.featured;
 const a=w.fighters.find(f=>f.id===idA)!,b=w.fighters.find(f=>f.id===idB)!;
 if(!a||!b||a.status!=='active'||b.status!=='active'||a.id===b.id)throw Error('Invalid fight card');
 const oldA=a.rank,oldB=b.rank,oldPointsA=a.rankingPoints,oldPointsB=b.rankingPoints,overallBeforeA=overallOf(a,w.year),overallBeforeB=overallOf(b,w.year),oddsA=matchupOdds(a,b,w.year);
 const oldShapeA=a.shape,oldShapeB=b.shape,oldCondA=a.condition,oldCondB=b.condition,oldStreakA=a.record.streak,oldStreakB=b.record.streak;
 const result=simulateCombat(a,b,w.year,rng,titleFight?5:3,{record:featured||titleFight});
 const outcomeA=result.winnerId===null?.5:result.winnerId===a.id?1:0;
 const expectedA=1/(1+Math.pow(10,(oldPointsB-oldPointsA)/300));
 const decisive=stoppage(result.method)?(result.finishRound===1?1.25:1.12):result.method==='SD'||result.method==='MD'?.87:result.method==='DRAW'?.82:1;
 const shift=Math.round(36*decisive*(outcomeA-expectedA));
 a.rankingPoints=clamp(oldPointsA+shift,850,2050);b.rankingPoints=clamp(oldPointsB-shift,850,2050);
 if(result.winnerId===null){a.record.draws++;b.record.draws++;a.record.streak=0;b.record.streak=0;}
 else updateRecord(result.winnerId===a.id?a:b,result.winnerId===a.id?b:a,result.method);
 const sA=shapeShift(a,b,outcomeA===1?'win':outcomeA===0?'loss':'draw',result.method,result.finishRound,w.year,oldStreakA);
 const sB=shapeShift(b,a,outcomeA===0?'win':outcomeA===1?'loss':'draw',result.method,result.finishRound,w.year,oldStreakB);
 a.shape=clamp(a.shape+sA,-FORM_MAX,FORM_MAX);b.shape=clamp(b.shape+sB,-FORM_MAX,FORM_MAX);
 a.condition=clamp(a.condition-result.conditionLossA,0,100);b.condition=clamp(b.condition-result.conditionLossB,0,100);
 addCareer(a,result.statsA,result.statsB,result.seconds,result.kdTakenA);addCareer(b,result.statsB,result.statsA,result.seconds,result.kdTakenB);
 const {injuredIds,injuries}=rollInjuries(w,rng,a,b,result);
 const win=result.winnerId?w.fighters.find(f=>f.id===result.winnerId)!:null;
 const loser=win?(win===a?b:a):null;
 const underdogVictory=isUpset(result.winnerId,a,oddsA);
 const headline=win?`${win.name} def. ${loser!.name} · ${methodText(result.method)}, R${result.finishRound}`:`${a.name} and ${b.name} fight to a draw`;
 const fight:Fight={scheduledRounds:titleFight?5:3,id:`bt-${w.nextFightId++}`,year:w.year,roundIndex:w.round+1,division:a.division,fighterA:a.id,fighterB:b.id,winnerId:result.winnerId,method:result.method,finishRound:result.finishRound,finishTime:result.finishTime,rounds:result.rounds,statsA:result.statsA,statsB:result.statsB,rankBeforeA:oldA,rankBeforeB:oldB,rankAfterA:0,rankAfterB:0,overallBeforeA,overallBeforeB,oddsA:+oddsA.toFixed(3),ratingDeltaA:a.rankingPoints-oldPointsA,ratingDeltaB:b.rankingPoints-oldPointsB,shapeDeltaA:a.shape-oldShapeA,shapeDeltaB:b.shape-oldShapeB,conditionDeltaA:a.condition-oldCondA,conditionDeltaB:b.condition-oldCondB,injuredIds,injuries,underdogVictory,headline,eventName:CALENDAR[w.round].name,titleFight,titleChange:false};
 if(opts.kind&&opts.belt){fight.belt=opts.belt;fight.kind=opts.kind;applyBoutResult(w,fight,win,opts.belt,opts.kind,CALENDAR[w.round].name);}
 // A reigning champion is always at the top of their form.
 pinChampionForm(w);
 // Star power grows with meaningful wins.
 if(win)win.fame=(win.fame||0)+(win.division==='S-TIER'?3:win.division==='GLOBAL D2'?1:0)+(stoppage(result.method)?1:0)+(underdogVictory?3:0);
 recordFight(w,fight);
 if(underdogVictory&&win&&(a.division==='S-TIER'?Math.min(oddsA,1-oddsA)<.3:Math.min(oddsA,1-oddsA)<.2))w.events.push({year:w.year,type:'upset',fighterId:win.id,description:`Stunning upset: ${headline}`,fightId:fight.id});
 if(win&&win.record.streak===6)w.events.push({year:w.year,type:'streak',fighterId:win.id,description:`Six consecutive victories after defeating ${loser!.name}`,fightId:fight.id});
 for(const injury of injuries)w.events.push({year:w.year,type:'injury',fighterId:injury.fighterId,description:`${injury.diagnosis} · ${injury.weeks} weeks out following ${headline}`,fightId:fight.id});
 return fight;
}
/** Weekly recovery is modest. Only medically cleared fighters can be scheduled. */
export function recover(w:World,rng:Random){
 const now=CLOCK(w.year,w.round);
 for(const f of w.fighters.filter(f=>f.status==='active')){
  const age=ageOf(f,w.year);
  const rest=Math.round(clamp(rng.int(2,7)-Math.max(0,age-35)*.13,2,7));
  const ceiling=Math.round(clamp(85+rng.int(-3,9)-Math.max(0,age-35)*.5,75,96));
  f.condition=Math.min(ceiling,clamp(f.condition+rest,0,100));
  if(f.injuryUntil>now)f.condition=Math.min(f.condition,39);
  else if(f.injuryUntil&&f.injuryUntil<=now){f.injuryName=undefined;f.injurySeverity=undefined;}
 }
}
type Booking={a:string;b:string;kind?:BoutKind};
/** Fighters who already competed this month. */
function bookedThisMonth(w:World){
 const booked=new Set<string>(),monthStart=MONTH_OF(w.round)*5+1;
 for(let i=w.fights.length-1;i>=0;i--){const f=w.fights[i];if(f.year!==w.year||f.roundIndex<monthStart)break;booked.add(f.fighterA);booked.add(f.fighterB);}
 return booked;
}
function availableIn(w:World,division:Division,booked:Set<string>,exclude:Set<string>=new Set()){
 const now=CLOCK(w.year,w.round);
 return w.fighters.filter(f=>f.status==='active'&&f.division===division&&f.condition>=60&&f.injuryUntil<=now&&!booked.has(f.id)&&!exclude.has(f.id)).sort((a,b)=>a.rank-b.rank);
}
/** Best opponent near the top, avoiding stale rematches. */
function bestOpponent(w:World,a:Fighter,pool:Fighter[],index:RivalStats,rng:Random,spread=.8,rivalWeight=.12){
 return pool.filter(f=>f.id!==a.id).slice(0,8).map(f=>({f,score:Math.abs(f.rank-a.rank)*spread+rivalsPenalty(a,f,w,index)*rivalWeight+rng.float(0,3)})).sort((x,y)=>x.score-y.score)[0]?.f;
}
/** The World Crown marquee for this month: a title bout in title months, otherwise a title eliminator. */
function bookWorldMarquee(w:World,rng:Random,index:RivalStats,booked:Set<string>):Booking|null{
 const c=w.crown,slot=MONTH_OF(w.round)*5+4;
 const pool=availableIn(w,'S-TIER',booked);
 const ok=(id?:string|null)=>!!id&&pool.some(f=>f.id===id);
 const get=(id:string)=>pool.find(f=>f.id===id)!;
 const contenders=(...exclude:(string|null|undefined)[])=>pool.filter(f=>!exclude.includes(f.id));
 if(isWorldTitleRound(slot)){
  if(!c.championId){
   const first=ok(c.mandatoryId)?get(c.mandatoryId!):contenders(c.interimId)[0];if(!first)return null;
   const second=contenders(first.id,c.interimId)[0];return second?{a:first.id,b:second.id,kind:'title'}:null;
  }
  if(ok(c.championId)){
   if(ok(c.interimId))return {a:c.championId,b:c.interimId!,kind:'unification'};
   const challenger=ok(c.mandatoryId)&&c.mandatoryId!==c.championId?get(c.mandatoryId!):contenders(c.championId,c.interimId).map(f=>({f,score:f.rank*2+rivalsPenalty(get(c.championId!),f,w,index)*.04+rng.float(0,2)})).sort((x,y)=>x.score-y.score)[0]?.f;
   return challenger?{a:c.championId,b:challenger.id,kind:'title'}:null;
  }
  // The champion cannot defend: the division keeps moving with an interim title.
  if(ok(c.interimId)){const challenger=ok(c.mandatoryId)&&c.mandatoryId!==c.interimId?get(c.mandatoryId!):contenders(c.championId,c.interimId)[0];return challenger?{a:c.interimId!,b:challenger.id,kind:'interim'}:null;}
  const list=contenders(c.championId);
  const first=ok(c.mandatoryId)?get(c.mandatoryId!):list[0],second=list.find(f=>f.id!==first?.id);
  return first&&second?{a:first.id,b:second.id,kind:'interim'}:null;
 }
 // Eliminator: the strongest contenders (star power breaks near-ties), never the champions or the mandatory challenger.
 const list=contenders(c.championId,c.interimId,c.mandatoryId);
 const first=list.slice(0,4).map(f=>({f,score:f.rank-Math.min(3,(f.fame||0)/120)+rng.float(0,1.5)})).sort((x,y)=>x.score-y.score)[0]?.f;
 if(!first)return null;
 const second=bestOpponent(w,first,list,index,rng);
 return second?{a:first.id,b:second.id,kind:'eliminator'}:null;
}
function bookContinental(w:World,belt:ContinentalBelt,index:RivalStats,rng:Random,booked:Set<string>):Booking|null{
 const b=w.belts[belt],pool=availableIn(w,BELT_DIVISION[belt],booked).filter(f=>f.region===BELT_REGION[belt]);
 const champ=pool.find(f=>f.id===b.championId);
 if(b.championId&&!champ)return null; // An unavailable continental champion simply misses this title night.
 const first=champ||pool[0];if(!first)return null;
 const second=champ?pool.filter(f=>f.id!==champ.id).map(f=>({f,score:f.rank*2+rivalsPenalty(champ,f,w,index)*.04+rng.float(0,2)})).sort((x,y)=>x.score-y.score)[0]?.f:pool.find(f=>f.id!==first.id);
 return second?{a:first.id,b:second.id,kind:'title'}:null;
}
function chooseHeadliner(w:World,rng:Random,index:RivalStats,protectedIds:Set<string>):PendingFight|null{
 const slot=CALENDAR[w.round],booked=bookedThisMonth(w);
 let booking:Booking|null=null;
 if(slot.week===5){
  const planned=w.marqueeReservation;
  const pool=availableIn(w,'S-TIER',booked);
  if(planned&&planned.year===w.year&&planned.month===MONTH_OF(w.round)&&pool.some(f=>f.id===planned.a)&&pool.some(f=>f.id===planned.b))booking={a:planned.a,b:planned.b,kind:planned.kind};
  else booking=bookWorldMarquee(w,rng,index,booked);
 }
 if(!booking){
  // Weekly featured bout: two contenders, never a champion.
  const able=availableIn(w,'S-TIER',booked,protectedIds);
  const a=able[0];if(!a)return null;
  const b=bestOpponent(w,a,able,index,rng);if(!b)return null;
  booking={a:a.id,b:b.id};
 }
 return {fighterA:booking.a,fighterB:booking.b,year:w.year,roundIndex:w.round,division:'S-TIER',titleFight:isTitleKind(booking.kind),eventName:slot.name,...(booking.kind?{belt:'WORLD' as BeltId,kind:booking.kind}:{})};
}
/** Prepare the undercard, but leave the featured contest unplayed and its outcome unknown. */
export function prepareCircuitRound(w:World,rng:Random):void{
 if(w.pendingFight)throw Error('Complete the pending main event before advancing');
 recover(w,rng);rankByCompetition(w);w.lastFightIds=[];
 const month=MONTH_OF(w.round),monthFinale=month*5+4,rivals=buildRivalIndex(w);
 // Month-start bookings: the marquee pair and any continental title fights are locked in,
 // so weekly matchmaking cannot use up those fighters' one monthly appearance.
 if(WEEK_OF(w.round)===0){
  w.marqueeReservation=null;w.beltReservations=null;
  if(!isTournamentSlot(w.year,monthFinale)){const b=bookWorldMarquee(w,rng,rivals,new Set());if(b)w.marqueeReservation={year:w.year,month,a:b.a,b:b.b,kind:b.kind};}
  if(isContinentalRound(month*5+3)){
   const pairs:Partial<Record<BeltId,[string,string]>>={};
   for(const belt of CONTINENTAL_BELTS){const b=bookContinental(w,belt,rivals,rng,new Set());if(b)pairs[belt]=[b.a,b.b];}
   w.beltReservations={year:w.year,month,pairs};
  }
 }
 const protectedIds=protectedChampions(w);
 const marquee=w.marqueeReservation;
 if(marquee&&marquee.year===w.year&&marquee.month===month&&WEEK_OF(w.round)<4){protectedIds.add(marquee.a);protectedIds.add(marquee.b);}
 const nights=w.beltReservations&&w.beltReservations.year===w.year&&w.beltReservations.month===month?w.beltReservations:null;
 if(nights&&w.round<=month*5+3)for(const pair of Object.values(nights.pairs))if(pair){protectedIds.add(pair[0]);protectedIds.add(pair[1]);}
 const headline=chooseHeadliner(w,rng,rivals,protectedIds);
 w.pendingFight=headline;
 const reserved=new Set<string>(protectedIds);
 if(headline){reserved.add(headline.fighterA);reserved.add(headline.fighterB);}
 // Continental title night: five-round title bouts on this card.
 if(nights&&isContinentalRound(w.round)){
  const booked=bookedThisMonth(w);
  for(const belt of CONTINENTAL_BELTS){const pair=nights.pairs[belt];if(!pair)continue;
   const pool=availableIn(w,BELT_DIVISION[belt],booked);
   if(pool.some(f=>f.id===pair[0])&&pool.some(f=>f.id===pair[1]))resolveBout(w,rng,pair[0],pair[1],{belt,kind:'title'});
  }
 }
 for(const division of DIVISIONS){const pairs=scheduleDivision(w,division,rng,rivals,reserved);
  for(const [a,b] of pairs){if(headline&&(a===headline.fighterA||a===headline.fighterB||b===headline.fighterA||b===headline.fighterB))continue;
   resolveBout(w,rng,a,b);
  }
 }
 rankByCompetition(w);
 const ranks=new Map(w.fighters.filter(f=>f.status==='active').map(f=>[f.id,f.rank]));
 for(const f of w.fights.slice(-w.lastFightIds.length)){f.rankAfterA=ranks.get(f.fighterA)!;f.rankAfterB=ranks.get(f.fighterB)!;}
}
/** Consumes the outstanding fight. No predicted/hidden winner exists before this call. */
export function settleHeadliner(w:World,rng:Random):Fight|null{
 const pending=w.pendingFight;if(!pending)return null;
 if(pending.year!==w.year||pending.roundIndex!==w.round)throw Error('Stale fight card');
 const bout=resolveBout(w,rng,pending.fighterA,pending.fighterB,{belt:pending.belt??(pending.titleFight?'WORLD':undefined),kind:pending.kind??(pending.titleFight?'title':undefined),featured:true});
 rankByCompetition(w);bout.rankAfterA=w.fighters.find(f=>f.id===bout.fighterA)!.rank;bout.rankAfterB=w.fighters.find(f=>f.id===bout.fighterB)!.rank;
 w.pendingFight=null;return bout;
}
export function finishCircuitRound(w:World):void{
 if(w.pendingFight)throw Error('Main event unresolved');
 w.round++;
}
export function matchStyleSummary(a:Fighter,b:Fighter){const adv=styleAdvantage(a.style,b.style);return adv>0?`${a.style} has a stylistic edge`:adv<0?`${b.style} has a stylistic edge`:'Styles are relatively balanced';}

/** Special-event bouts have their own ledger and do not inflate regular circuit wins or Elo. */
export function resolveTournamentBout(w:World,rng:Random,idA:string,idB:string,tournamentId:string,stage:string,mustDecide:boolean):Fight {
 const a=w.fighters.find(f=>f.id===idA)!,b=w.fighters.find(f=>f.id===idB)!;
 if(!a||!b||a.id===b.id)throw Error('Invalid tournament pairing');
 const overallBeforeA=overallOf(a,w.year),overallBeforeB=overallOf(b,w.year),oddsA=matchupOdds(a,b,w.year);
 const beforeA=a.condition,beforeB=b.condition;
 const scheduledRounds:2|3=tournamentId.startsWith('crucible-')?2:3;
 const result=simulateCombat(a,b,w.year,rng,scheduledRounds,{record:true});
 if(mustDecide&&result.winnerId===null){
  const winner=rng.next()<oddsA?a:b;
  result.winnerId=winner.id;result.method='SD';
  result.rounds.at(-1)?.notes.push(`${winner.name} takes the mandatory sudden-death tiebreak.`);
 }
 // Reduced recovery burden, not imaginary standard MMA fights four times in one week.
 a.condition=clamp(a.condition-Math.max(3,Math.round(result.conditionLossA*.44)),0,100);
 b.condition=clamp(b.condition-Math.max(3,Math.round(result.conditionLossB*.44)),0,100);
 addCareer(a,result.statsA,result.statsB,result.seconds,result.kdTakenA);addCareer(b,result.statsB,result.statsA,result.seconds,result.kdTakenB);
 const {injuredIds,injuries}=rollInjuries(w,rng,a,b,result,.6);
 const winner=result.winnerId?w.fighters.find(f=>f.id===result.winnerId)!:null;
 const loser=winner?(winner.id===a.id?b:a):null;
 const eventName=tournamentId.startsWith('crucible')?'THE CRUCIBLE':'WORLD COMBAT OLYMPIAD';
 const headline=winner?`${winner.name} def. ${loser!.name} · ${result.method}, R${result.finishRound}`:`${a.name} and ${b.name} draw`;
 const fight:Fight={scheduledRounds,id:`bt-${w.nextFightId++}`,year:w.year,roundIndex:w.round+1,division:a.division,fighterA:idA,fighterB:idB,winnerId:result.winnerId,method:result.method,finishRound:result.finishRound,finishTime:result.finishTime,rounds:result.rounds,statsA:result.statsA,statsB:result.statsB,
  rankBeforeA:a.rank,rankBeforeB:b.rank,rankAfterA:a.rank,rankAfterB:b.rank,overallBeforeA,overallBeforeB,oddsA:+oddsA.toFixed(3),ratingDeltaA:0,ratingDeltaB:0,shapeDeltaA:0,shapeDeltaB:0,conditionDeltaA:a.condition-beforeA,conditionDeltaB:b.condition-beforeB,injuredIds,injuries,underdogVictory:isUpset(result.winnerId,a,oddsA),headline,eventName,titleFight:false,titleChange:false,tournamentId,tournamentStage:stage};
 recordFight(w,fight);
 for(const injury of injuries)w.events.push({year:w.year,type:'injury',fighterId:injury.fighterId,description:`${injury.diagnosis} · ${injury.weeks} weeks out following ${headline}`,fightId:fight.id});
 return fight;
}
