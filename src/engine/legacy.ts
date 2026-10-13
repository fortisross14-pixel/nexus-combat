import type {Fighter,Fight,World,SeasonAwards,IconicMoment,HallInductee,LedgerEntry} from './types';
import {ageOf} from './career';
import {START_YEAR} from './constants';
import {LF,expandLedger,forEachLedger,eventNameOf,isWorldTitle} from './archive';
import {CONTINENTAL_BELTS} from './belts';
import {STAT} from './combat';

export interface FighterLegacy {fighter:Fighter;wins:number;losses:number;draws:number;kos:number;subs:number;winPct:number;defenses:number;reigns:number;titleDays:number;crucibles:number;surges:number;golds:number;upsets:number;eliteWins:number;greatness:number;fame:number;
 /** Continental belt reigns and defenses. */beltReigns:number;beltDefenses:number;}
export interface Rivalry {a:string;b:string;meetings:number;winsA:number;winsB:number;draws:number;titleFights:number;closeFights:number;lastYear:number;score:number;fightIds:string[];
 /** World Crown meetings and meetings on the global circuit (S-Tier, Global D2 or any title). */worldTitleFights:number;eliteMeetings:number;}
export interface LegacyView {fighters:FighterLegacy[];rivalries:Rivalry[];byFighter:Map<string,FighterLegacy>;}
const key=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`;
const isFinish=(m:LedgerEntry['m'])=>m==='KO'||m==='TKO'||m==='SUB';
// A title reign is timed by the 60-slot calendar (five cards per month).
function dateIndex(year:number,round:number){return Math.round(year*365.2425+(Math.max(0,round-1)/60)*365.2425);}
export function reignDuration(w:World,reign:World['crown']['reigns'][number]){
 return Math.max(0,dateIndex(reign.endYear??w.year,reign.endRound??Math.max(1,w.round))-dateIndex(reign.startYear,reign.startRound));
}
const blank=(fighter:Fighter):FighterLegacy=>({fighter,wins:0,losses:0,draws:0,kos:0,subs:0,winPct:0,defenses:0,reigns:0,titleDays:0,crucibles:0,surges:0,golds:0,upsets:0,eliteWins:0,greatness:0,fame:fighter.fame||0,beltReigns:0,beltDefenses:0});
const greatness=(x:FighterLegacy,streak=0)=>Math.round(x.wins*1.2+x.kos*.65+x.subs*.8+x.defenses*20+x.reigns*36+x.titleDays/40+x.crucibles*42+x.surges*30+x.golds*75+x.eliteWins*1.4+x.upsets*2.5+streak*1.4+x.beltReigns*12+x.beltDefenses*5);
export function buildLegacyView(w:World):LegacyView {
 const rivalMap=new Map<string,Rivalry>();
 const byFighter=new Map<string,FighterLegacy>();
 for(const fighter of w.fighters){const x=blank(fighter);x.wins=fighter.record.wins;x.losses=fighter.record.losses;x.draws=fighter.record.draws;x.kos=fighter.record.kos;x.subs=fighter.record.submissions;x.winPct=100*x.wins/Math.max(1,x.wins+x.losses+x.draws);byFighter.set(fighter.id,x);}
 for(const reign of w.crown.reigns){const x=byFighter.get(reign.fighterId);if(x){x.reigns++;x.defenses+=reign.defenses;x.titleDays+=reignDuration(w,reign);}}
 for(const belt of CONTINENTAL_BELTS)for(const reign of w.belts[belt].reigns){const x=byFighter.get(reign.fighterId);if(x){x.beltReigns++;x.beltDefenses+=reign.defenses;}}
 for(const t of w.tournaments){if(t.status!=='complete'||!t.winnerId)continue;const x=byFighter.get(t.winnerId);if(!x)continue;if(t.kind==='CRUCIBLE')x.crucibles++;if(t.kind==='SURGE')x.surges++;if(t.kind==='OLYMPIAD')x.golds++;}
 forEachLedger(w,e=>{
  const k=key(e.a,e.b),ordered=e.a<e.b?[e.a,e.b]:[e.b,e.a];
  let r=rivalMap.get(k);if(!r){r={a:ordered[0],b:ordered[1],meetings:0,winsA:0,winsB:0,draws:0,titleFights:0,closeFights:0,lastYear:e.y,score:0,fightIds:[],worldTitleFights:0,eliteMeetings:0};rivalMap.set(k,r);}
  r.meetings++;r.lastYear=Math.max(r.lastYear,e.y);r.fightIds.push(e.i);
  if(e.w===r.a)r.winsA++;else if(e.w===r.b)r.winsB++;else r.draws++;
  if(e.f&LF.TITLE)r.titleFights++;if(e.f&LF.CLOSE)r.closeFights++;
  if(isWorldTitle(e))r.worldTitleFights++;if(e.f&LF.TITLE||e.d==='S-TIER'||e.d==='GLOBAL D2'||e.s==='Final'||e.s==='Semifinal')r.eliteMeetings++;
  if(e.t)return;
  const victor=e.w?byFighter.get(e.w):undefined;
  if(victor){if(e.f&LF.UPSET)victor.upsets++;if(isWorldTitle(e)||e.d==='S-TIER')victor.eliteWins++;}
 });
 // A real rivalry has stakes and two-way history: a title rematch, or a long series both sides have won with close fights.
 const rivalries=[...rivalMap.values()].filter(r=>{const both=r.winsA>0&&r.winsB>0;
   return r.worldTitleFights>=2||r.worldTitleFights>=1&&r.eliteMeetings>=3&&both||r.titleFights>=3&&both||r.eliteMeetings>=5&&Math.min(r.winsA,r.winsB)>=2&&r.closeFights>=2;})
  .map(r=>({...r,score:r.meetings*4+r.eliteMeetings*3+r.worldTitleFights*14+(r.titleFights-r.worldTitleFights)*5+r.closeFights*4+Math.min(r.winsA,r.winsB)*8})).sort((a,b)=>b.score-a.score||b.lastYear-a.lastYear);
 const fighters=[...byFighter.values()];for(const x of fighters)x.greatness=greatness(x,x.fighter.record.longestWinStreak);
 return {fighters,rivalries,byFighter};
}
const best=<T,>(list:T[],score:(x:T)=>number)=>{let top:T|undefined,s=-Infinity;for(const x of list){const v=score(x);if(v>s){s=v;top=x;}}return top;};
export function calculateAwards(w:World,year:number):SeasonAwards{
 const bouts=(w.ledger[year]||[]).filter(e=>!e.t);
 const detail=new Map<string,Fight>();for(const f of w.fights)if(f.year===year)detail.set(f.id,f);
 const t=w.tournaments.filter(t=>t.year===year&&t.status==='complete');
 const scores=new Map<string,number>();
 for(const e of bouts){if(!e.w)continue;const bonus=isWorldTitle(e)?20:e.f&LF.TITLE?8:e.d==='S-TIER'?7:e.d==='GLOBAL D2'?3:0;
  scores.set(e.w,(scores.get(e.w)||0)+10+bonus+(e.f&LF.UPSET?10:0)+(isFinish(e.m)?3:0));}
 for(const event of t)if(event.winnerId)scores.set(event.winnerId,(scores.get(event.winnerId)||0)+(event.kind==='OLYMPIAD'?60:event.kind==='CRUCIBLE'?42:28));
 const sorted=[...scores.entries()].sort((a,b)=>b[1]-a[1]);
 const standout=(fn:(id:string)=>boolean)=>sorted.find(([id])=>fn(id))?.[0]||null;
 const stage=(e:LedgerEntry)=>(isWorldTitle(e)?40:e.f&LF.TITLE?14:0)+(e.d==='S-TIER'?25:e.d==='GLOBAL D2'?8:0);
 const underdog=(e:LedgerEntry)=>e.w?(e.w===e.a?1-e.o:e.o):0;
 const knockout=best(bouts.filter(e=>e.m==='KO'||e.m==='TKO'),e=>stage(e)+(e.r===1?24:0)+(e.f&LF.UPSET?25:0)+(e.m==='KO'?6:0));
 const submission=best(bouts.filter(e=>e.m==='SUB'),e=>stage(e)+(e.f&LF.UPSET?20:0)+(e.r===1?15:0));
 const upset=best(bouts.filter(e=>e.f&LF.UPSET),e=>underdog(e)*65+(isWorldTitle(e)?70:e.f&LF.TITLE?20:0)+(e.d==='S-TIER'?30:0));
 // Fight of the Year rewards drama: knockdowns on both sides, close cards and late finishes.
 const drama=(e:LedgerEntry)=>{const f=detail.get(e.i);const kdA=f?.statsA?.[STAT.KD]||0,kdB=f?.statsB?.[STAT.KD]||0;
  return stage(e)*.9+(e.f&LF.CLOSE?23:0)+(kdA&&kdB?30:0)+(kdA+kdB)*4+(isFinish(e.m)&&e.r>=3?14:0)+(e.f&LF.UPSET?12:0)+(f?.statsA&&f.statsB?Math.min(20,(f.statsA[STAT.SIGL]+f.statsB[STAT.SIGL])/6):0);};
 const fightOfYear=best(bouts,drama);
 return {year,fighterOfYear:sorted[0]?.[0]??null,breakthrough:standout(id=>{const fighter=w.fighters.find(f=>f.id===id);return !!fighter&&fighter.joinedYear>=year-2&&fighter.joinedYear>START_YEAR&&ageOf(fighter,year)<=26&&id!==sorted[0]?.[0];}),fightOfYear:fightOfYear?.i??null,knockoutOfYear:knockout?.i??null,submissionOfYear:submission?.i??null,upsetOfYear:upset?.i??null};
}
function selectIconics(w:World,year:number):IconicMoment[]{
 const candidate:IconicMoment[]=[];const fighters=new Map(w.fighters.map(f=>[f.id,f]));
 const add=(id:string,category:IconicMoment['category'],score:number,title:string,description:string,subjectIds:string[],fightId?:string)=>candidate.push({id:`iconic-${year}-${id}`,year,category,score,title,description,subjectIds,fightId});
 const wins=(w.ledger[year]||[]).filter(e=>!e.t&&e.w);
 for(const e of wins.filter(e=>e.f&LF.CHANGE&&isWorldTitle(e))){
  const winner=fighters.get(e.w!)!,loser=fighters.get(e.w===e.a?e.b:e.a)!;
  const reign=w.crown.reigns.find(r=>r.endFightId===e.i);const oldDefenses=reign?.defenses||0;
  if(oldDefenses>=4)add(e.i,'Dynasty',90+oldDefenses*5,'A dynasty falls',`${winner.name} ends ${loser.name}'s reign after ${oldDefenses} successful World Crown defenses.`,[winner.id,loser.id],e.i);
  if(ageOf(winner,year)>=37)add(`${e.i}-veteran`,'Comeback',82+ageOf(winner,year)-37,'One last crown',`${winner.name} captures the World Crown at age ${ageOf(winner,year)}, when most fighters have already left the global elite.`,[winner.id],e.i);
  if((e.o<.25&&e.w===e.a)||(e.o>.75&&e.w===e.b))add(`${e.i}-upset`,'Upset',92,'The impossible title upset',`${winner.name} shocks favorite ${loser.name} for the World Crown.`,[winner.id,loser.id],e.i);
 }
 const yearT=w.tournaments.filter(t=>t.year===year&&t.status==='complete');
 const gp=yearT.find(t=>t.kind==='CRUCIBLE'),surge=yearT.find(t=>t.kind==='SURGE'),gold=yearT.find(t=>t.kind==='OLYMPIAD');
 const champion=w.crown.reigns.filter(r=>r.startYear<=year&&(r.endYear===undefined||r.endYear>=year)).at(-1)?.fighterId;
 if(gp&&gp.winnerId===champion)add('grand-slam','Double',80,'The champion conquers The Crucible',`${fighters.get(champion!)?.name} claims the World Crown and the season's Grand Prix honors.`,[champion!]);
 if(gold){const winner=fighters.get(gold.winnerId!)!;const won=gold.matches.filter(m=>m.fightId&&!m.fightId.startsWith('walkover')).filter(m=>m.winnerId===winner.id).length;
  if(won>=5&&winner.division!=='S-TIER')add('olympiad-outsider','Olympiad',86,'The Olympiad outsider',`${winner.name}, from ${winner.division}, conquers a global knockout bracket featuring the world's elite.`,[winner.id]);}
 if(surge?.winnerId&&surge.surgeOrder&&surge.surgeOrder.indexOf(surge.winnerId)>=0&&surge.surgeOrder.indexOf(surge.winnerId)<=2)add('surge-endurance','Surge',74,'Surviving from the opening bell',`${fighters.get(surge.winnerId)?.name} wins The Surge despite entering among its first three fighters.`,[surge.winnerId]);
 const topUpsets=wins.filter(e=>e.f&LF.UPSET&&e.d==='S-TIER'&&Math.min(e.o,1-e.o)<.15);
 for(const e of topUpsets){const win=fighters.get(e.w!)!;add(`upset-${e.i}`,'Upset',65+(isWorldTitle(e)?20:0)+Math.round((.15-Math.min(e.o,1-e.o))*50),'A shock felt across NEXUS',`${win.name} defeats a heavily favored elite contender by ${e.m} at ${eventNameOf(e)}.`,[win.id,e.w===e.a?e.b:e.a],e.i);}
 // Only historically significant stories survive. Never create filler moments.
 const seen=new Set<string>();return candidate.filter(c=>{const k=`${c.category}-${c.subjectIds[0]}`;if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.score-a.score).slice(0,4);
}
/** Awards and iconic moments for the season. Returns the bouts history should keep in detail. */
export function closeLegacySeason(w:World):string[] {
 const year=w.year;
 if(!w.awards.some(a=>a.year===year))w.awards.push(calculateAwards(w,year));
 if(!w.iconicMoments.some(m=>m.year===year)){
  const moments=selectIconics(w,year);w.iconicMoments.push(...moments);
  for(const m of moments)w.events.push({year,type:'iconic',fighterId:m.subjectIds[0],description:`${m.title}: ${m.description}`,fightId:m.fightId});
 }
 const award=w.awards.find(a=>a.year===year);
 return [award?.fightOfYear,award?.knockoutOfYear,award?.submissionOfYear,award?.upsetOfYear,...w.iconicMoments.filter(m=>m.year===year).map(m=>m.fightId)].filter((x):x is string=>!!x);
}
/** Selective: a handful of retirees per decade. At most two inductees per class. */
export const HOF_THRESHOLD=280;
export function inductHallOfFame(w:World):void {
 const view=buildLegacyView(w);const inducted=new Set(w.hallOfFame.map(h=>h.fighterId));
 // A threshold plus minimum time retired keeps it selective rather than a retirement list.
 const eligible=view.fighters.filter(x=>x.fighter.status==='retired'&&x.fighter.retiredYear!==undefined&&w.year-x.fighter.retiredYear>=2&&!inducted.has(x.fighter.id)&&
 (x.greatness>=HOF_THRESHOLD&&(x.reigns>0||x.golds>0||x.crucibles>=2)||x.greatness>=HOF_THRESHOLD*1.6))
 .sort((a,b)=>b.greatness-a.greatness).slice(0,2);
 for(const x of eligible){const reason=x.reigns?`${x.reigns} World Crown reign${x.reigns===1?'':'s'}`:x.golds?`${x.golds} Olympiad gold medal${x.golds===1?'':'s'}`:x.crucibles?`${x.crucibles} Crucible championship${x.crucibles===1?'':'s'}`:x.beltReigns?`${x.beltReigns} continental title reign${x.beltReigns===1?'':'s'} · ${x.wins} wins`:`${x.wins} career wins`;
 w.hallOfFame.push({fighterId:x.fighter.id,inductedYear:w.year,score:x.greatness,reason});}
}
export function initializeLegacy(w:World):World {
 w.iconicMoments=w.iconicMoments||[];w.awards=w.awards||[];w.hallOfFame=w.hallOfFame||[];
 // Completed seasons of imported versions can be awarded retroactively, but iconic
 // moments aren't backfilled (the older save didn't record those editorial milestones).
 for(let y=START_YEAR;y<w.year;y++)if(!w.awards.some(a=>a.year===y))w.awards.push(calculateAwards(w,y));
 return w;
}
export function honorList(w:World,id:string){return {awards:w.awards.filter(a=>a.fighterOfYear===id||a.breakthrough===id),iconics:w.iconicMoments.filter(m=>m.subjectIds.includes(id)),hall:w.hallOfFame.find(h=>h.fighterId===id)||null};}
export function careerSeasons(w:World,id:string){const indexed=new Map<number,{wins:number;losses:number;draws:number;kos:number;subs:number;titleWins:number;notableFights:Fight[]}>();
 forEachLedger(w,e=>{if(e.t||e.a!==id&&e.b!==id)return;
  if(!indexed.has(e.y))indexed.set(e.y,{wins:0,losses:0,draws:0,kos:0,subs:0,titleWins:0,notableFights:[]});
  const row=indexed.get(e.y)!;if(e.w===id){row.wins++;if(e.m==='KO'||e.m==='TKO')row.kos++;if(e.m==='SUB')row.subs++;if(e.f&LF.TITLE)row.titleWins++;}else if(e.w===null)row.draws++;else row.losses++;
  row.notableFights.push(expandLedger(w,e));
 });return indexed;
}
export function legacyLeader(view:LegacyView,field:keyof Omit<FighterLegacy,'fighter'>,minFights=0){return view.fighters.filter(x=>x.wins+x.losses+x.draws>=minFights).sort((a,b)=>Number(b[field])-Number(a[field])||b.greatness-a.greatness);}
export function hallOfFameEntries(w:World):Array<HallInductee & {fighter:Fighter}>{return w.hallOfFame.map(h=>({...h,fighter:w.fighters.find(f=>f.id===h.fighterId)!})).filter(h=>h.fighter).sort((a,b)=>b.inductedYear-a.inductedYear);}

/** Period leaderboards are recalculated from real event archives, never current ratings. */
export function periodLeaderboards(w:World,from:number,to:number):FighterLegacy[]{
 const grouped=new Map<string,FighterLegacy>();
 for(const fighter of w.fighters)grouped.set(fighter.id,blank(fighter));
 for(let y=from;y<=to;y++)for(const e of w.ledger[y]||[]){if(e.t)continue;
  const a=grouped.get(e.a),b=grouped.get(e.b);if(!a||!b)continue;
  if(!e.w){a.draws++;b.draws++;continue;}
  const win=e.w===e.a?a:b,loss=win===a?b:a;
  win.wins++;loss.losses++;
  if(e.m==='KO'||e.m==='TKO')win.kos++;if(e.m==='SUB')win.subs++;
  if(isWorldTitle(e)&&!(e.f&LF.CHANGE)&&!(e.f&LF.INTERIM))win.defenses++;
  if(e.f&LF.UPSET)win.upsets++;
  if(isWorldTitle(e)||e.d==='S-TIER')win.eliteWins++;
 }
 for(const t of w.tournaments){if(t.year<from||t.year>to||t.status!=='complete'||!t.winnerId)continue;
  const entry=grouped.get(t.winnerId);if(!entry)continue;
  if(t.kind==='CRUCIBLE')entry.crucibles++;if(t.kind==='SURGE')entry.surges++;if(t.kind==='OLYMPIAD')entry.golds++;
 }
 for(const belt of CONTINENTAL_BELTS)for(const r of w.belts[belt].reigns){const x=grouped.get(r.fighterId);if(x&&r.startYear>=from&&r.startYear<=to)x.beltReigns++;}
 for(const r of w.crown.reigns){const x=grouped.get(r.fighterId);if(!x)continue;
  if(r.startYear>=from&&r.startYear<=to)x.reigns++;
  // Date overlap of the title tenure with the requested interval. Estimates use calendar slots.
  const a=Math.max(dateIndex(r.startYear,r.startRound),dateIndex(from,1));
  const b=Math.min(dateIndex(r.endYear??w.year,r.endRound??Math.max(1,w.round)),dateIndex(to+1,1));
  x.titleDays+=Math.max(0,b-a);
 }
 return [...grouped.values()].map(x=>{
  const total=x.wins+x.losses+x.draws;
  x.winPct=total?100*x.wins/total:0;
  x.greatness=greatness(x);
  return x;
 });
}
