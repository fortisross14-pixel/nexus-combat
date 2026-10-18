import {BRANDS,DIVISIONS,TOP_DIVISION,isTopDivision,isSecondDivision,isWorldTier,brandOf} from './constants';
import {bookCrownTie,bookChallengerLock,bookRankingTies,emptyTag,resolveTagMatch} from './doubles';
import {ageOf,clamp,overallOf} from './career';
import {Random} from './random';
import {simulateCombat,styleAdvantage,matchupOdds,type CombatResolution} from './combat';
import {addCareer,recordFight} from './archive';
import {applyBoutResult,pinChampionForm,FORM_MAX,BELT_DIVISION,BELT_REGION,CONTINENTAL_BELTS,isContinentalRound,protectedChampions,titleBrandAt,otherBrand,isDoublesRankingRound,DOUBLES_ROUND,PINNACLE_ROUND,type ContinentalBelt} from './belts';
import type {BeltId,BoutKind,Brand,Division,Fight,Fighter,LedgerEntry,PendingFight,World} from './types';

/** Four events in each of twelve months: three weekly circuit cards, then the month's big event.
    Tournaments take the big-event slot of their month. 48 events a year. */
export const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
const MARQUEES=[
 {name:'ORIGIN',label:'NOVA title night · ONYX title eliminator',title:true},
 {name:'ASCENSION',label:'ONYX title night · NOVA title eliminator',title:true},
 {name:'FIGHTOPIA',label:'NOVA title night · ONYX title eliminator',title:true},
 {name:'THE SURGE',label:'Twenty-fighter Royale',title:false},
 {name:'AFTERSHOCK',label:'ONYX title night · NOVA title eliminator',title:true},
 {name:'COLLISION',label:'The Doubles Crown',title:false},
 {name:'FAULTLINE',label:'NOVA title night · ONYX title eliminator',title:true},
 {name:'THE CRUCIBLE',label:'Grand Prix (the Olympiad every fourth year)',title:false},
 {name:'HORIZON',label:'ONYX title night · NOVA title eliminator',title:true},
 {name:'EQUINOX',label:'NOVA title night · ONYX title eliminator',title:true},
 {name:'FRONTIER',label:'ONYX title night · NOVA title eliminator',title:true},
 {name:'THE PINNACLE',label:'NOVA v ONYX unifier · Doubles Crown · Continental Supremacy',title:true}
];
export const WEEKS=4;
export const CALENDAR=MONTHS.flatMap((month,mi)=>Array.from({length:WEEKS},(_,wi)=>wi===WEEKS-1?
 {...MARQUEES[mi],month,kind:'major' as const,week:WEEKS,monthIndex:mi}:
 {name:`CIRCUIT ${String(wi+1).padStart(2,'0')}`,month,label:`${month} / Week ${wi+1}${wi===2&&mi%3===1?' · Continental title night':''}`,kind:'circuit' as const,title:false,week:wi+1,monthIndex:mi}));
export const ROUNDS_PER_YEAR=CALENDAR.length;
export const ROUND_NAMES=CALENDAR.map(e=>`${e.name} · ${e.month}${e.kind!=='major'?` W${e.week}`:''}`);
export const MONTH_OF=(round:number)=>Math.floor(round/WEEKS);
export const WEEK_OF=(round:number)=>round%WEEKS;
/** Index of the month's big event. */
export const BIG_OF=(month:number)=>month*WEEKS+WEEKS-1;
export const isBigEvent=(round:number)=>WEEK_OF(round)===WEEKS-1;
export const CLOCK=(year:number,round:number)=>year*ROUNDS_PER_YEAR+round;
/** The Surge in April; the Crucible in August, replaced by the Olympiad every fourth year. */
export const SURGE_ROUND=BIG_OF(3),OLYMPIAD_ROUND=BIG_OF(7),CRUCIBLE_ROUND=BIG_OF(7);
export const isTournamentSlot=(_year:number,round:number)=>round===SURGE_ROUND||round===CRUCIBLE_ROUND;
export const emptyRecord=()=>({wins:0,losses:0,draws:0,kos:0,submissions:0,decisions:0,streak:0,longestWinStreak:0});
export function pointsSeed(f:Fighter,year:number){return Math.round(clamp(1250+(overallOf(f,year)-72)*11+(f.condition-80)*.2,850,2050));}

/** Net wins over the last twelve months, per fighter. Circuit bouts only. */
export function recentForm(w:World):Map<string,number>{
 const now=CLOCK(w.year,w.round),form=new Map<string,number>();
 for(const y of [w.year-1,w.year])for(const e of w.ledger[y]||[]){
  if(e.t||now-CLOCK(e.y,e.e-1)>ROUNDS_PER_YEAR||!e.w)continue;
  const l=e.w===e.a?e.b:e.a;form.set(e.w,(form.get(e.w)||0)+1);form.set(l,(form.get(l)||0)-1);
 }
 return form;
}
/** Current competitive level: ability, capped recent form and ranking points. Lifetime record no longer counts. */
export function competitiveScore(f:Fighter,year:number,form=0){return overallOf(f,year)+clamp(form,-6,6)*.6+clamp((f.rankingPoints-1250)*.012,-5,6);}
/** The belt holder of a division, if it has a belt (World Crown for S-Tier, continental belts for regional Division I). */
export function divisionChampionId(w:World,d:Division):string|null{
 for(const b of BRANDS)if(TOP_DIVISION[b]===d)return w.crowns?.[b]?.championId??null;
 const belt=CONTINENTAL_BELTS.find(b=>BELT_DIVISION[b]===d);
 return belt?w.belts?.[belt]?.championId??null:null;
}
/** Ranking: a division's champion is listed as C (rank 0); contenders are ranked 1, 2, 3… behind them. */
export function rankByCompetition(w:World){
 for(const d of DIVISIONS){
  const champ=divisionChampionId(w,d);
  const list=w.fighters.filter(f=>f.status==='active'&&f.division===d).sort((a,b)=>b.rankingPoints-a.rankingPoints||b.record.wins-a.record.wins||a.id.localeCompare(b.id));
  const holder=list.find(f=>f.id===champ);
  if(holder){holder.rank=0;list.filter(f=>f!==holder).forEach((f,i)=>f.rank=i+1);}
  else list.forEach((f,i)=>f.rank=i+1);
 }
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
 return elapsed<=ROUNDS_PER_YEAR/2?200:elapsed<=ROUNDS_PER_YEAR?30:entry.count>=3?25:8;
}
/** Book a genuinely active year: most fighters make 6–8 appearances, rather than
    fighting every month or waiting for a marquee. The founding week gives everyone
    a chance to establish a record BEFORE either brand crowns its first champion. */
export function scheduleDivision(w:World,division:Division,rng:Random,index:RivalStats=buildRivalIndex(w),reserved:Set<string>=new Set()):[string,string][]{
 const now=CLOCK(w.year,w.round),week=w.round;
 const roster=w.fighters.filter(f=>f.status==='active'&&f.division===division);
 const yearFights=w.fights.filter(f=>f.year===w.year);
 const appearances=new Map<string,number>(),lastAt=new Map<string,number>();
 for(const bout of yearFights){
  for(const id of (bout.tag?[...bout.tag.teamA,...bout.tag.teamB]:[bout.fighterA,bout.fighterB])){
   appearances.set(id,(appearances.get(id)||0)+1);
   lastAt.set(id,CLOCK(bout.year,bout.roundIndex-1));
  }
 }
 // First two circuit cards together have seven bouts per 14-person division.
 // Thereafter one fresh outing approximately every seven event-weeks, with
 // one or two cards to catch up if an injury delayed a previous opportunity.
 const founding=w.year===2058&&week<=2;
 const target=founding?1:Math.min(8,1+Math.floor((week+3)/7)+(isBigEvent(week)?1:0));
 const enoughRest=(f:Fighter)=>now-(lastAt.get(f.id)??-999)>= (founding?2:4);
 const available=roster.filter(f=>f.condition>=60&&f.injuryUntil<=now&&
  !reserved.has(f.id)&&enoughRest(f)&& (appearances.get(f.id)||0)<target&&
  (appearances.get(f.id)||0)<8);
 const pairs:[string,string][]=[];
 // Opening: front-load 4, then 3 pairs so that both title nights have proven winners.
 // Later: keep cards flexible, allowing up to seven fights per division if required.
 const quota=founding&&week===0?Math.min(4,Math.floor(available.length/2)):
  founding&&week===1?7:7;
 const unpaired=new Set(available.map(f=>f.id));
 while(unpaired.size>=2&&pairs.length<quota){
  const options=available.filter(f=>unpaired.has(f.id)).sort((a,b)=>(appearances.get(a.id)||0)-(appearances.get(b.id)||0)||a.rank-b.rank);
  const f=founding?options[0]:options[rng.int(0,Math.min(options.length-1,4))];
  const ranked=options.filter(g=>g.id!==f.id).map(g=>({g,
   // A strong seed should have a fair chance to EARN that opening 1–0 record.
   score:(founding?Math.abs(Math.abs(g.rank-f.rank)-Math.floor(roster.length/2)):
    Math.abs(g.rank-f.rank)*1.4)+rivalsPenalty(f,g,w,index)+rng.float(0,founding?2:10)}))
   .sort((a,b)=>a.score-b.score);
  const opponent=ranked[0]?.g;if(!opponent)break;
  unpaired.delete(f.id);unpaired.delete(opponent.id);pairs.push([f.id,opponent.id]);
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
 const rounds=titleFight||opts.kind==='pinnacle'?5:3;
 const a=w.fighters.find(f=>f.id===idA)!,b=w.fighters.find(f=>f.id===idB)!;
 if(!a||!b||a.status!=='active'||b.status!=='active'||a.id===b.id)throw Error('Invalid fight card');
 const oldA=a.rank,oldB=b.rank,oldPointsA=a.rankingPoints,oldPointsB=b.rankingPoints,overallBeforeA=overallOf(a,w.year),overallBeforeB=overallOf(b,w.year),oddsA=matchupOdds(a,b,w.year);
 const oldShapeA=a.shape,oldShapeB=b.shape,oldCondA=a.condition,oldCondB=b.condition,oldStreakA=a.record.streak,oldStreakB=b.record.streak;
 const result=simulateCombat(a,b,w.year,rng,rounds,{record:featured||titleFight||opts.kind==='pinnacle'});
 const outcomeA=result.winnerId===null?.5:result.winnerId===a.id?1:0;
 const expectedA=1/(1+Math.pow(10,(oldPointsB-oldPointsA)/300));
 const decisive=stoppage(result.method)?(result.finishRound===1?1.25:1.12):result.method==='SD'||result.method==='MD'?.87:result.method==='DRAW'?.82:1;
 const shift=Math.round(36*decisive*(outcomeA-expectedA));
 a.rankingPoints=clamp(oldPointsA+shift,850,2050);b.rankingPoints=clamp(oldPointsB-shift,850,2050);
 // A newly arrived fighter must establish form in THIS division before championship contention.
 if(!opts.kind||!['title','interim','unification','pinnacle','contract','eliminator'].includes(opts.kind)){
  for(const fighter of [a,b]){if(!fighter.titlePath||fighter.titlePath.division!==fighter.division)fighter.titlePath={division:fighter.division,wins:0,eliminatorWins:0};}
  const victorious=[a,b].find(f=>f.id===result.winnerId);if(victorious)victorious.titlePath!.wins++;
 }
 if(opts.kind==='eliminator'){const victorious=[a,b].find(f=>f.id===result.winnerId);if(victorious){if(!victorious.titlePath||victorious.titlePath.division!==victorious.division)victorious.titlePath={division:victorious.division,wins:0,eliminatorWins:0};victorious.titlePath.eliminatorWins++;}}
 if(result.winnerId===null){a.record.draws++;b.record.draws++;a.record.streak=0;b.record.streak=0;}
 else {
  const defeated=result.winnerId===a.id?b:a;
  updateRecord(result.winnerId===a.id?a:b,defeated,result.method);
  for(const brand of BRANDS)if(w.crowns?.[brand].mandatoryId===defeated.id)w.crowns[brand].mandatoryId=null;
  if(w.titleShot?.fighterId===defeated.id)w.titleShot=null;
 }
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
 const fight:Fight={scheduledRounds:rounds,id:`bt-${w.nextFightId++}`,year:w.year,roundIndex:w.round+1,division:a.division,fighterA:a.id,fighterB:b.id,winnerId:result.winnerId,method:result.method,finishRound:result.finishRound,finishTime:result.finishTime,rounds:result.rounds,statsA:result.statsA,statsB:result.statsB,rankBeforeA:oldA,rankBeforeB:oldB,rankAfterA:0,rankAfterB:0,overallBeforeA,overallBeforeB,oddsA:+oddsA.toFixed(3),ratingDeltaA:a.rankingPoints-oldPointsA,ratingDeltaB:b.rankingPoints-oldPointsB,shapeDeltaA:a.shape-oldShapeA,shapeDeltaB:b.shape-oldShapeB,conditionDeltaA:a.condition-oldCondA,conditionDeltaB:b.condition-oldCondB,injuredIds,injuries,underdogVictory,headline,eventName:CALENDAR[w.round].name,titleFight,titleChange:false};
 if(opts.kind&&opts.belt){fight.belt=opts.belt;fight.kind=opts.kind;applyBoutResult(w,fight,win,opts.belt,opts.kind,CALENDAR[w.round].name);}
 else if(opts.kind)fight.kind=opts.kind;
 // A guaranteed title shot is spent the moment its holder fights for a title.
 if(w.titleShot&&isTitleKind(opts.kind)&&(w.titleShot.fighterId===a.id||w.titleShot.fighterId===b.id))w.titleShot=null;
 if(opts.kind==='pinnacle'&&win){
  // The Pinnacle unifier: the year's defining fight. The belts stay with their brands; the winner takes the year.
  (w.pinnacle??=[]).push({year:w.year,winnerId:win.id,loserId:loser!.id,fightId:fight.id,winnerBrand:brandOf(win.division)??undefined});
  win.fame=(win.fame||0)+160;loser!.fame=(loser!.fame||0)+30;
  w.events.push({year:w.year,type:'title',fighterId:win.id,description:`${win.name} wins the ${w.year} Pinnacle Crown, beating ${loser!.name} by ${result.method}`,fightId:fight.id});
 }
 if(opts.kind==='contract'&&win){
  const brand=brandOf(win.division);
  if(brand){w.titleShot={fighterId:win.id,brand,year:w.year};win.fame=(win.fame||0)+20;
   w.events.push({year:w.year,type:'eliminator',fighterId:win.id,description:`${win.name} wins the Pinnacle contract: a guaranteed shot at the ${brand} title`,fightId:fight.id});}
 }
 // A reigning champion is always at the top of their form.
 pinChampionForm(w);
 // Star power grows with meaningful wins.
 if(win)win.fame=(win.fame||0)+(isTopDivision(win.division)?3:isSecondDivision(win.division)?1:0)+(stoppage(result.method)?1:0)+(underdogVictory?3:0);
 recordFight(w,fight);
 if(underdogVictory&&win&&(isTopDivision(a.division)?Math.min(oddsA,1-oddsA)<.3:Math.min(oddsA,1-oddsA)<.2))w.events.push({year:w.year,type:'upset',fighterId:win.id,description:`Stunning upset: ${headline}`,fightId:fight.id});
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
type Booking={a:string;b:string;kind:BoutKind;brand?:Brand};
/** Fighters who already competed this month. */
function bookedThisMonth(w:World){
 const booked=new Set<string>(),monthStart=MONTH_OF(w.round)*WEEKS+1;
 for(let i=w.fights.length-1;i>=0;i--){const f=w.fights[i];if(f.year!==w.year||f.roundIndex<monthStart)break;if(f.tournamentId)continue;booked.add(f.fighterA);booked.add(f.fighterB);}
 return booked;
}
function availableIn(w:World,division:Division,booked:Set<string>,exclude:Set<string>=new Set()){
 const now=CLOCK(w.year,w.round);
 const last=new Map<string,number>();
 for(const bout of w.fights)if(bout.year===w.year){const at=CLOCK(bout.year,bout.roundIndex-1);for(const id of (bout.tag?[...bout.tag.teamA,...bout.tag.teamB]:[bout.fighterA,bout.fighterB]))last.set(id,at);}
 return w.fighters.filter(f=>f.status==='active'&&f.division===division&&
  f.condition>=60&&f.injuryUntil<=now&&!booked.has(f.id)&&!exclude.has(f.id)&&
  // Marquees may call back a circuit winner, but never after a bout last week.
  // A second fight requires reasonable recovery; nobody injured fights twice.
  (!last.has(f.id)||now-last.get(f.id)!>=2))
  .sort((a,b)=>a.rank-b.rank);
}

/** A new arrival starts unproven in the division. Existing saves use the stored ledger
    only for athletes without a gate; completed promotions explicitly reset it. */
export function currentDivisionWins(w:World,f:Fighter){
 if(f.titlePath?.division===f.division)return f.titlePath.wins;
 // Compatibility: years already played before this release still count for established contenders.
 let wins=0;
 for(const y of [w.year-1,w.year])for(const e of w.ledger[y]??[])if(!e.t&&e.d===f.division&&e.w===f.id)wins++;
 return wins;
}
const earnedContenderSpot=(w:World,f:Fighter)=>currentDivisionWins(w,f)>=1&&f.record.streak>0;
const eligibleTitleChallenger=(w:World,f:Fighter)=>currentDivisionWins(w,f)>=1;
const titleMerit=(w:World,f:Fighter)=>currentDivisionWins(w,f)*100+(f.record.streak>0?55:-70)+f.rankingPoints*.1+f.shape*2-f.rank;
const byTitleMerit=(w:World,a:Fighter,b:Fighter)=>titleMerit(w,b)-titleMerit(w,a);

/** A brand's title-night bout: title, interim or unification. A guaranteed title shot (won at The Pinnacle) comes first. */
function bookBrandTitle(w:World,brand:Brand,rng:Random,index:RivalStats,booked:Set<string>):Booking|null{
 const c=w.crowns![brand];
 const pool=availableIn(w,TOP_DIVISION[brand],booked);
 const ok=(id?:string|null)=>!!id&&pool.some(f=>f.id===id);
 const get=(id:string)=>pool.find(f=>f.id===id)!;
 const contenders=(...exclude:(string|null|undefined)[])=>pool.filter(f=>!exclude.includes(f.id)&&eligibleTitleChallenger(w,f)).sort((a,b)=>byTitleMerit(w,a,b));
 const shot=w.titleShot&&w.titleShot.brand===brand&&ok(w.titleShot.fighterId)&&eligibleTitleChallenger(w,get(w.titleShot.fighterId))?w.titleShot.fighterId:null;
 const next=(...exclude:(string|null|undefined)[])=>shot&&!exclude.includes(shot)?get(shot):ok(c.mandatoryId)&&!exclude.includes(c.mandatoryId)&&eligibleTitleChallenger(w,get(c.mandatoryId!))?get(c.mandatoryId!):undefined;
 if(!c.championId){
  const first=next(c.interimId)??contenders(c.interimId)[0];if(!first)return null;
  const second=contenders(first.id,c.interimId)[0];return second?{a:first.id,b:second.id,kind:'title',brand}:null;
 }
 if(ok(c.championId)){
  if(ok(c.interimId))return {a:c.championId,b:c.interimId!,kind:'unification',brand};
  const champ=get(c.championId!);
  const challenger=next(c.championId)??contenders(c.championId,c.interimId).map(f=>({f,score:f.rank*2+rivalsPenalty(champ,f,w,index)*.04+rng.float(0,2)})).sort((x,y)=>x.score-y.score)[0]?.f;
  return challenger?{a:c.championId,b:challenger.id,kind:'title',brand}:null;
 }
 // The champion cannot defend: the division keeps moving with an interim title.
 if(ok(c.interimId)){const challenger=next(c.interimId)??contenders(c.championId,c.interimId)[0];return challenger?{a:c.interimId!,b:challenger.id,kind:'interim',brand}:null;}
 const list=contenders(c.championId);
 const first=next()??list[0],second=list.find(f=>f.id!==first?.id);
 return first&&second?{a:first.id,b:second.id,kind:'interim',brand}:null;
}
/** Title eliminator: the strongest contenders (star power breaks near-ties), never champions, the mandatory challenger or a title-shot holder. */
function bookEliminator(w:World,brand:Brand,booked:Set<string>):Booking|null{
 const c=w.crowns![brand];
 const list=availableIn(w,TOP_DIVISION[brand],booked).filter(f=>![c.championId,c.interimId,c.mandatoryId,w.titleShot?.fighterId].includes(f.id)&&earnedContenderSpot(w,f));
 const first=[...list].sort((a,b)=>byTitleMerit(w,a,b))[0];
 if(!first)return null;
 const second=[...list].filter(f=>f.id!==first.id).sort((a,b)=>byTitleMerit(w,a,b))[0];
 return second?{a:first.id,b:second.id,kind:'eliminator',brand}:null;
}
/** The Pinnacle unifier: NOVA's champion against ONYX's (an interim champion or the top contender stands in). */
function bookUnifier(w:World,booked:Set<string>):Booking|null{
 const side=(b:Brand)=>{const c=w.crowns![b];const pool=availableIn(w,TOP_DIVISION[b],booked);return pool.find(f=>f.id===c.championId)??pool.find(f=>f.id===c.interimId)??pool[0];};
 const a=side('NOVA'),b=side('ONYX');
 return a&&b?{a:a.id,b:b.id,kind:'pinnacle'}:null;
}
/** The contract bout: each brand's most in-form contender (form, not ranking). The winner gets a guaranteed title shot. */
function bookContract(w:World,booked:Set<string>,exclude:Set<string>):Booking|null{
 const pick=(b:Brand)=>{const c=w.crowns![b];return availableIn(w,TOP_DIVISION[b],booked,exclude).filter(f=>f.id!==c.championId&&f.id!==c.interimId&&f.id!==w.titleShot?.fighterId)
  .sort((x,y)=>y.shape-x.shape||overallOf(y,w.year)-overallOf(x,w.year))[0];};
 const a=pick('NOVA'),b=pick('ONYX');
 return a&&b?{a:a.id,b:b.id,kind:'contract'}:null;
}
function bookContinental(w:World,belt:ContinentalBelt,index:RivalStats,rng:Random,booked:Set<string>):Booking|null{
 const b=w.belts[belt],pool=availableIn(w,BELT_DIVISION[belt],booked).filter(f=>f.region===BELT_REGION[belt]);
 const champ=pool.find(f=>f.id===b.championId);
 if(b.championId&&!champ)return null; // An unavailable continental champion simply misses this title night.
 const entrants=pool.filter(f=>earnedContenderSpot(w,f));const first=champ||entrants[0];if(!first)return null;
 const second=champ?entrants.filter(f=>f.id!==champ.id).map(f=>({f,score:f.rank*2+rivalsPenalty(champ,f,w,index)*.04+rng.float(0,2)})).sort((x,y)=>x.score-y.score)[0]?.f:entrants.find(f=>f.id!==first.id);
 return second?{a:first.id,b:second.id,kind:'title'}:null;
}
/** The month's big-event bookings, made in week one so nobody spends their monthly bout before it. */
function planMonth(w:World,rng:Random,index:RivalStats,booked:Set<string>):Booking[]{
 const big=BIG_OF(MONTH_OF(w.round));
 if(big===PINNACLE_ROUND){
  const list:Booking[]=[];const u=bookUnifier(w,booked);if(u)list.push(u);
  const c=bookContract(w,booked,new Set(u?[u.a,u.b]:[]));if(c)list.push(c);
  return list;
 }
 const brand=titleBrandAt(big);if(!brand)return [];
 const list:Booking[]=[];
 const t=bookBrandTitle(w,brand,rng,index,booked);if(t)list.push(t);
 const used=new Set([...booked,...(t?[t.a,t.b]:[])]);
 const e=bookEliminator(w,otherBrand(brand),used);if(e)list.push(e);
 return list;
}
/** Continental Supremacy: the four continental champions (or each Division I's leader), all against all. */
function bookSupremacy(w:World,reserved:Set<string>,eventName:string):PendingFight[]{
 const now=CLOCK(w.year,w.round);
 const field:Fighter[]=[];
 for(const belt of CONTINENTAL_BELTS){
  const list=w.fighters.filter(f=>f.status==='active'&&f.division===BELT_DIVISION[belt]&&f.condition>=55&&f.injuryUntil<=now&&!reserved.has(f.id)&&!field.includes(f)).sort((a,b)=>a.rank-b.rank);
  const champ=list.find(f=>f.id===w.belts[belt].championId);
  const pick=champ??list.find(f=>!reserved.has(f.id));
  if(pick)field.push(pick);
 }
 if(field.length<4)return [];
 for(const f of field)reserved.add(f.id);
 const order:[number,number][]=[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
 return order.map(([i,j])=>({fighterA:field[i].id,fighterB:field[j].id,year:w.year,roundIndex:w.round,division:field[i].division,titleFight:false,eventName,supremacy:true}));
}
const toPending=(w:World,b:Booking,eventName:string):PendingFight=>{
 const division=w.fighters.find(f=>f.id===b.a)!.division;
 const title=isTitleKind(b.kind);
 return {fighterA:b.a,fighterB:b.b,year:w.year,roundIndex:w.round,division,titleFight:title,eventName,kind:b.kind,...((title||b.kind==='eliminator')&&b.brand?{belt:b.brand as BeltId}:{})};
};
/** How many regular world-tier bouts make the main card around the event's special bouts. The rest are prelims. */
export const MAIN_CARD=4;
/** Prepare an event. Continental and regional bouts are resolved now, in the background.
    The world-tier card (both brands' S and II divisions, plus any doubles or Pinnacle bouts) stays unplayed until the event starts. */
export function prepareCircuitRound(w:World,rng:Random):void{
 if(w.pendingFight||w.pendingCard)throw Error('Complete the pending main event before advancing');
 w.tag??=emptyTag();
 recover(w,rng);rankByCompetition(w);w.lastFightIds=[];
 const month=MONTH_OF(w.round),rivals=buildRivalIndex(w);
 const slot=CALENDAR[w.round];
 if(WEEK_OF(w.round)===0){
  w.marquees=null;w.marqueeReservation=null;w.beltReservations=null;
  // Title qualification is earned on this month's circuit, not projected in week one.
  if(isContinentalRound(month*WEEKS+2)){
   const pairs:Partial<Record<BeltId,[string,string]>>={};
   for(const belt of CONTINENTAL_BELTS){const b=bookContinental(w,belt,rivals,rng,new Set());if(b)pairs[belt]=[b.a,b.b];}
   w.beltReservations={year:w.year,month,pairs};
  }
 }
 const protectedIds=protectedChampions(w);
 const plan=w.marquees&&w.marquees.year===w.year&&w.marquees.month===month?w.marquees.list:[];
 if(WEEK_OF(w.round)<WEEKS-1)for(const b of plan){protectedIds.add(b.a);protectedIds.add(b.b);}
 const nights=w.beltReservations&&w.beltReservations.year===w.year&&w.beltReservations.month===month?w.beltReservations:null;
 if(nights&&w.round<=month*WEEKS+2)for(const pair of Object.values(nights.pairs))if(pair){protectedIds.add(pair[0]);protectedIds.add(pair[1]);}
 const booked=bookedThisMonth(w);
 const reserved=new Set<string>(protectedIds);
 const specials:PendingFight[]=[],extras:PendingFight[]=[];
 if(slot.kind==='major'){
  // Plan title nights only AFTER the opening circuit has generated legitimate wins.
  // Earlier circuit bouts are allowed provided recovery and medical checks pass.
  const fit=(id:string)=>!!availableIn(w,w.fighters.find(x=>x.id===id)!.division,new Set()).find(f=>f.id===id);
  const taken=new Set<string>();
  const livePlan=plan.length?plan:planMonth(w,rng,rivals,new Set());
  for(const b of livePlan){
   let use:Booking|null=fit(b.a)&&fit(b.b)&&!taken.has(b.a)&&!taken.has(b.b)?b:null;
   // A booked fighter got hurt: rebook the same slot from who is fit tonight.
   if(!use){
    if(b.kind==='pinnacle')use=bookUnifier(w,taken);
    else if(b.kind==='contract')use=bookContract(w,taken,new Set());
    else if(b.kind==='eliminator'&&b.brand)use=bookEliminator(w,b.brand,taken);
    else if(b.brand)use=bookBrandTitle(w,b.brand,rng,rivals,taken);
   }
   if(use){taken.add(use.a);taken.add(use.b);reserved.add(use.a);reserved.add(use.b);specials.push(toPending(w,use,slot.name));}
  }
  // Re-evaluate brand title and challenger spots at the actual marquee.
  // In the founding season week 1 had no bouts yet, so an advance booking
  // would otherwise leave ORIGIN or ASCENSION with no championship.
  const titleBrand=titleBrandAt(w.round);
  if(titleBrand&&!specials.some(p=>p.titleFight&&p.belt===titleBrand)){
   const title=bookBrandTitle(w,titleBrand,rng,rivals,taken);
   if(title){taken.add(title.a);taken.add(title.b);reserved.add(title.a);reserved.add(title.b);specials.unshift(toPending(w,title,slot.name));}
  }
  if(titleBrand&&!specials.some(p=>p.kind==='eliminator')){
   const eliminator=bookEliminator(w,otherBrand(titleBrand),taken);
   if(eliminator){taken.add(eliminator.a);taken.add(eliminator.b);reserved.add(eliminator.a);reserved.add(eliminator.b);specials.push(toPending(w,eliminator,slot.name));}
  }
  if(w.round===DOUBLES_ROUND||w.round===PINNACLE_ROUND){
   // June: Doubles Crown headlines. December: the unifier remains the main
   // event and the national Crown becomes the co-main, both genuine team bouts.
   const crown=bookCrownTie(w,reserved,slot.name);
   if(w.round===PINNACLE_ROUND)specials.splice(Math.min(1,specials.length),0,...crown);
   else specials.unshift(...crown);
  }
  if(w.round===BIG_OF(4)||w.round===BIG_OF(10))specials.push(...bookChallengerLock(w,reserved,slot.name));
  if(w.round===PINNACLE_ROUND)specials.push(...bookSupremacy(w,reserved,slot.name));
 }else if(isDoublesRankingRound(w.round)){
  extras.push(...bookRankingTies(w,reserved,slot.name,()=>rng.next(),3));
 }
 // Continental title night: five-round title bouts on this card.
 if(nights&&isContinentalRound(w.round)){
  for(const belt of CONTINENTAL_BELTS){const pair=nights.pairs[belt];if(!pair)continue;
   const pool=availableIn(w,BELT_DIVISION[belt],booked);
   if(pool.some(f=>f.id===pair[0])&&pool.some(f=>f.id===pair[1]))resolveBout(w,rng,pair[0],pair[1],{belt,kind:'title'});
  }
 }
 const deferred:PendingFight[]=[];
 for(const division of DIVISIONS){const pairs=scheduleDivision(w,division,rng,rivals,reserved);
  for(const [a,b] of pairs){
   if(isWorldTier(division))deferred.push({fighterA:a,fighterB:b,year:w.year,roundIndex:w.round,division,titleFight:false,eventName:slot.name});
   else resolveBout(w,rng,a,b);
  }
 }
 // Regular bouts: S divisions before II, then the best-ranked pairings first.
 const rankOf=(id:string)=>w.fighters.find(f=>f.id===id)!.rank;
 deferred.sort((x,y)=>(isTopDivision(x.division)?0:1)-(isTopDivision(y.division)?0:1)||Math.min(rankOf(x.fighterA),rankOf(x.fighterB))-Math.min(rankOf(y.fighterA),rankOf(y.fighterB)));
 // On a marquee night, do not show only one or two contests because the normal
 // seven-per-year circuit quota happened to be met. Find medically cleared extra
 // contenders for up to four headline bouts, respecting the eight-fight annual cap.
 if(slot.kind==='major'&&specials.length+deferred.length<MAIN_CARD){
  const taken=new Set([...reserved,...deferred.flatMap(p=>[p.fighterA,p.fighterB])]);
  const appearances=new Map<string,number>();
  for(const f of w.fights)if(f.year===w.year)for(const id of (f.tag?[...f.tag.teamA,...f.tag.teamB]:[f.fighterA,f.fighterB]))appearances.set(id,(appearances.get(id)||0)+1);
  for(const division of [...BRANDS.map(b=>TOP_DIVISION[b]),...BRANDS.map(b=>`${b} II` as Division)]){
   if(specials.length+deferred.length>=MAIN_CARD)break;
   const pool=availableIn(w,division,taken).filter(f=>(appearances.get(f.id)??0)<8).sort((a,b)=>(appearances.get(a.id)??0)-(appearances.get(b.id)??0)||a.rank-b.rank);
   while(pool.length>=2&&specials.length+deferred.length<MAIN_CARD){
    const a=pool.shift()!;
    const opponents=pool.map((f,i)=>({f,i,score:rivalsPenalty(a,f,w,rivals)+Math.abs(f.rank-a.rank)*1.8+(appearances.get(f.id)??0)*2})).sort((x,y)=>x.score-y.score);
    const pick=opponents[0];if(!pick)break;
    pool.splice(pool.findIndex(f=>f.id===pick.f.id),1);
    taken.add(a.id);taken.add(pick.f.id);
    deferred.push({fighterA:a.id,fighterB:pick.f.id,year:w.year,roundIndex:w.round,division,titleFight:false,eventName:slot.name});
   }
  }
 }
 // A marquee offers four featured matches (the rest are genuine undercard bouts).
 // Supremacy's six round-robin matches and Doubles ranking matches do not displace the headliners.
 specials.forEach((p,i)=>{if(i>=MAIN_CARD)p.prelim=true;});
 const regularMain=Math.max(0,MAIN_CARD-specials.filter(p=>!p.prelim).length);
 deferred.forEach((p,i)=>{if(i>=regularMain)p.prelim=true;});
 const card=[...specials.filter(p=>!p.prelim),...deferred.filter(p=>!p.prelim),...extras.map(p=>({...p,prelim:true})),...specials.filter(p=>p.prelim),...deferred.filter(p=>p.prelim)];
 w.pendingCard=card;w.pendingFight=card[0]??null;
 rankByCompetition(w);
 const ranks=new Map(w.fighters.filter(f=>f.status==='active').map(f=>[f.id,f.rank]));
 for(const f of w.fights.slice(-w.lastFightIds.length)){f.rankAfterA=ranks.get(f.fighterA)!;f.rankAfterB=ranks.get(f.fighterB)!;}
}
/** Fights the whole prepared card: prelims first, the main event last. No winner exists before this call.
    `watch` holds card positions to keep the exchange-by-exchange broadcast for; recording never changes a result.
    Returns fight ids by card position (main event first; '' where a bout could not take place). */
export function settleCard(w:World,rng:Random,watch:ReadonlySet<number>=new Set([0])):string[]{
 const card=w.pendingCard??(w.pendingFight?[w.pendingFight]:[]);
 const ids:string[]=new Array(card.length).fill('');
 const supremacy:Fight[]=[];
 for(let i=card.length-1;i>=0;i--){
  const p=card[i];
  if(p.year!==w.year||p.roundIndex!==w.round)throw Error('Stale fight card');
  const a=w.fighters.find(f=>f.id===p.fighterA),b=w.fighters.find(f=>f.id===p.fighterB);
  if(!a||!b||a.status!=='active'||b.status!=='active')continue;
  let bout:Fight;
  if(p.tag){
   bout=resolveTagMatch(w,rng,p,watch.has(i));
  }else if(p.supremacy){
   bout=resolveTournamentBout(w,rng,p.fighterA,p.fighterB,`supremacy-${w.year}`,'Continental Supremacy',false,{record:watch.has(i),eventName:p.eventName});
   supremacy.push(bout);
  }else{
   bout=resolveBout(w,rng,p.fighterA,p.fighterB,{belt:p.belt,kind:p.kind,featured:watch.has(i)});
  }
  ids[i]=bout.id;
 }
 if(supremacy.length)settleSupremacy(w,supremacy);
 rankByCompetition(w);
 const ranks=new Map(w.fighters.filter(f=>f.status==='active').map(f=>[f.id,f.rank]));
 for(const id of ids)if(id){const bout=w.fights.find(f=>f.id===id);if(bout&&!bout.tournamentId){bout.rankAfterA=ranks.get(bout.fighterA)!;bout.rankAfterB=ranks.get(bout.fighterB)!;}}
 w.pendingFight=null;w.pendingCard=null;w.lastCardIds=ids.filter(Boolean);
 return ids;
}
/** Continental Supremacy table: 3 points a win, 1 a draw; finishes, then head-to-head, break ties. */
function settleSupremacy(w:World,bouts:Fight[]){
 const table=new Map<string,{id:string;pts:number;w:number;l:number;d:number;fin:number}>();
 const row=(id:string)=>table.get(id)??table.set(id,{id,pts:0,w:0,l:0,d:0,fin:0}).get(id)!;
 for(const f of bouts){const a=row(f.fighterA),b=row(f.fighterB);
  if(!f.winnerId){a.pts++;b.pts++;a.d++;b.d++;continue;}
  const [win,lose]=f.winnerId===f.fighterA?[a,b]:[b,a];win.pts+=3;win.w++;lose.l++;if(stoppage(f.method))win.fin++;}
 const h2h=(x:string,y:string)=>bouts.find(f=>(f.fighterA===x&&f.fighterB===y)||(f.fighterA===y&&f.fighterB===x))?.winnerId;
 const rows=[...table.values()].sort((x,y)=>y.pts-x.pts||y.fin-x.fin||(h2h(x.id,y.id)===x.id?-1:h2h(x.id,y.id)===y.id?1:0));
 const top=rows[0];const winnerId=top&&(!rows[1]||rows[1].pts<top.pts||rows[1].fin<top.fin||h2h(top.id,rows[1].id)===top.id)?top.id:null;
 (w.supremacy??=[]).push({year:w.year,winnerId,table:rows.map(({id,pts,w:wn,l,d})=>({id,pts,w:wn,l,d}))});
 const champ=winnerId?w.fighters.find(f=>f.id===winnerId):undefined;
 if(champ){champ.fame=(champ.fame||0)+45;w.events.push({year:w.year,type:'tournament',fighterId:champ.id,description:`${champ.name} wins Continental Supremacy at THE PINNACLE (${top.w}-${top.l}-${top.d})`});}
}
export function finishCircuitRound(w:World):void{
 if(w.pendingFight||w.pendingCard)throw Error('Main event unresolved');
 w.round++;
}
export function matchStyleSummary(a:Fighter,b:Fighter){const adv=styleAdvantage(a.style,b.style);return adv>0?`${a.style} has a stylistic edge`:adv<0?`${b.style} has a stylistic edge`:'Styles are relatively balanced';}

/** Special-event bouts have their own ledger and do not inflate regular circuit wins or Elo. */
export function resolveTournamentBout(w:World,rng:Random,idA:string,idB:string,tournamentId:string,stage:string,mustDecide:boolean,opts:{record?:boolean;eventName?:string}={}):Fight {
 const a=w.fighters.find(f=>f.id===idA)!,b=w.fighters.find(f=>f.id===idB)!;
 if(!a||!b||a.id===b.id)throw Error('Invalid tournament pairing');
 const overallBeforeA=overallOf(a,w.year),overallBeforeB=overallOf(b,w.year),oddsA=matchupOdds(a,b,w.year);
 const beforeA=a.condition,beforeB=b.condition;
 const scheduledRounds:2|3=tournamentId.startsWith('crucible-')?2:3;
 const result=simulateCombat(a,b,w.year,rng,scheduledRounds,{record:opts.record??true});
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
 const eventName=opts.eventName??(tournamentId.startsWith('crucible')?'THE CRUCIBLE':'WORLD COMBAT OLYMPIAD');
 const headline=winner?`${winner.name} def. ${loser!.name} · ${result.method}, R${result.finishRound}`:`${a.name} and ${b.name} draw`;
 const fight:Fight={scheduledRounds,id:`bt-${w.nextFightId++}`,year:w.year,roundIndex:w.round+1,division:a.division,fighterA:idA,fighterB:idB,winnerId:result.winnerId,method:result.method,finishRound:result.finishRound,finishTime:result.finishTime,rounds:result.rounds,statsA:result.statsA,statsB:result.statsB,
  rankBeforeA:a.rank,rankBeforeB:b.rank,rankAfterA:a.rank,rankAfterB:b.rank,overallBeforeA,overallBeforeB,oddsA:+oddsA.toFixed(3),ratingDeltaA:0,ratingDeltaB:0,shapeDeltaA:0,shapeDeltaB:0,conditionDeltaA:a.condition-beforeA,conditionDeltaB:b.condition-beforeB,injuredIds,injuries,underdogVictory:isUpset(result.winnerId,a,oddsA),headline,eventName,titleFight:false,titleChange:false,tournamentId,tournamentStage:stage};
 recordFight(w,fight);
 for(const injury of injuries)w.events.push({year:w.year,type:'injury',fighterId:injury.fighterId,description:`${injury.diagnosis} · ${injury.weeks} weeks out following ${headline}`,fightId:fight.id});
 return fight;
}
