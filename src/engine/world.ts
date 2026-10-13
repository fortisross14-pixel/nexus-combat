import {closeLegacySeason,inductHallOfFame,initializeLegacy} from './legacy';
import {beginTournament,currentTournament,advanceTournamentBout,finishTournament,kindAt} from './tournaments';
import {DIVISIONS,REGIONS,REGION_DIVISIONS,START_YEAR} from './constants';
import {ageOf,baseOf,clamp,createFighter,foundingPlan,overallOf,planRookieRarities,regionDivision} from './career';
import {Random} from './random';
import {countryNamed} from './names';
import {competitiveScore,pointsSeed,rankByCompetition,prepareCircuitRound,settleHeadliner,finishCircuitRound,ROUNDS_PER_YEAR,emptyRecord,recentForm} from './competition';
import {closeSeasonArchive,stripTimeline,toLedger,LF} from './archive';
import {beltsHeld,BELT_DIVISION,CONTINENTAL_BELTS,emptyBelt,emptyBelts,FORM_MAX,pinChampionForm,protectedChampions,vacateBelt} from './belts';
import type {Fighter,Division,Region,World,WorldEvent,SeasonSummary,CareerSnapshot,Fight,LedgerEntry} from './types';
export const STORAGE_KEY='nexus-combat-chronicle-v06';
export const V05_STORAGE_KEY='nexus-combat-chronicle-v05';
export const V04_STORAGE_KEY='nexus-combat-chronicle-v04';
export const PREVIOUS_STORAGE_KEY='nexus-combat-chronicle-v03';
export const OLD_STORAGE_KEY='nexus-combat-chronicle-v02';
export const LEGACY_STORAGE_KEY='nexus-combat-chronicle-v01';
const roster=(w:World,d:Division)=>w.fighters.filter(f=>f.status==='active'&&f.division===d);
/** Recent twelve-month form, refreshed at each annual assessment. */
let FORM=new Map<string,number>();
const readiness=(f:Fighter,year:number)=>competitiveScore(f,year,FORM.get(f.id)||0)-(ageOf(f,year)>35?(ageOf(f,year)-35)*1.25:0)+(ageOf(f,year)<24?-2:0);
function record(w:World,f:Fighter,event:string){const snapshot:CareerSnapshot={year:w.year,age:ageOf(f,w.year),division:f.division,base:baseOf(f,w.year),shape:f.shape,overall:overallOf(f,w.year),condition:f.condition,rank:f.rank,event,wins:f.record.wins,losses:f.record.losses,rankingPoints:f.rankingPoints};f.history.push(snapshot);}
function rankRoster(w:World) {rankByCompetition(w);}
function event(w:World,f:Fighter,type:WorldEvent['type'],description:string) {w.events.push({year:w.year,type,fighterId:f.id,description});}
export function createWorld(seed:number=20582058):World {
  const rng=new Random(seed);const w:World={version:'0.9.0',ledger:{},keyFights:{},iconicMoments:[],awards:[],hallOfFame:[],tournaments:[],activeTournamentId:null,year:START_YEAR,seed,rngState:rng.state,nextId:1,fighters:[],events:[],seasons:[],round:0,nextFightId:1,fights:[],lastFightIds:[],pendingFight:null,marqueeReservation:null,crown:emptyBelt(),belts:emptyBelts(),beltReservations:null,user:{followed:[],picks:[],pendingPick:null}};
  const names=new Set<string>();
  for(const slot of foundingPlan(rng))w.fighters.push(createFighter(rng,w.nextId++,slot.region,slot.division,slot.rarity,w.year,names,{age:slot.age}));
  w.fighters.forEach(f=>{f.rankingPoints=pointsSeed(f,w.year);});
  rankRoster(w);w.fighters.forEach(f=>record(w,f,'Founding roster'));
  w.rngState=rng.state;
  w.seasons.push(summary(w,0,0,0,0));
  return w;
}
function summary(w:World,newcomers:number,retirements:number,promotions:number,relegations:number):SeasonSummary {
 const active=w.fighters.filter(f=>f.status==='active'),tier=roster(w,'S-TIER');
 let bouts=0,kos=0,subs=0;
 // Append-only fight archive is chronological; scan only the current season.
 for(let i=w.fights.length-1;i>=0&&w.fights[i].year===w.year;i--){
  const f=w.fights[i];bouts++;if(f.method==='KO'||f.method==='TKO')kos++;if(f.method==='SUB')subs++;
 }
 return {year:w.year,newcomers,retirements,promotions,relegations,fights:bouts,knockouts:kos,submissions:subs,
 averageAge:+(active.reduce((s,f)=>s+ageOf(f,w.year),0)/Math.max(1,active.length)).toFixed(1),
 sTierAverage:+(tier.reduce((s,f)=>s+overallOf(f,w.year),0)/Math.max(1,tier.length)).toFixed(1)};
}
function retireChance(f:Fighter,year:number) {
  const age=ageOf(f,year);if(age>=45)return 1;
  const baseline=age<32?0:age<=34?0.012:age<=36?0.035:age===37?0.085:age===38?0.14:age===39?0.22:age===40?0.39:age===41?0.62:age===42?0.75:0.9;
  // Veterans far below their former peak are more likely to walk away; prospects are not.
  // Generational and legendary fighters enjoy long careers.
  const elite=age<=41?(f.rarity==='Generational'?.45:f.rarity==='Legend'?.65:1):1;
  // Fighters who have fallen well below their peak walk away sooner; the elite decline slowly, so they last.
  const fallen=age>=31?clamp((f.potential-baseOf(f,year)-6)*.018,0,.3):0;
  return clamp((baseline+fallen+(age>=30&&f.potential-baseOf(f,year)>18?0.07:0))*elite,0,1);
}
/** Moving divisions pulls ranking points halfway toward the new division's level. */
function moveDivision(w:World,f:Fighter,target:Division){
 const mean=(d:Division)=>{const list=roster(w,d).filter(x=>x.id!==f.id);return list.length?list.reduce((s,x)=>s+x.rankingPoints,0)/list.length:f.rankingPoints;};
 const from=mean(f.division),to=mean(target);
 f.rankingPoints=Math.round(clamp(to+(f.rankingPoints-from)*.5,850,2050));f.division=target;
}
function promote(w:World,f:Fighter,target:Division,description:string) {moveDivision(w,f,target);event(w,f,'promotion',description);}
function demote(w:World,f:Fighter,target:Division,description:string) {moveDivision(w,f,target);event(w,f,'relegation',description);}
function fill(w:World,target:Division,source:Division,minAge:number) {
  while(roster(w,target).length<20){
    const candidates=roster(w,source).filter(f=>ageOf(f,w.year)>=minAge).sort((a,b)=>readiness(b,w.year)-readiness(a,w.year));
    const pick=candidates[0];if(!pick)break;
    promote(w,pick,target,`Promoted from ${source} to ${target} to fill an opening`);
  }
}
function bestFromRegional(w:World) {
  return REGIONS.flatMap(r=>roster(w,regionDivision(r,1))).filter(f=>ageOf(f,w.year)>=21).sort((a,b)=>readiness(b,w.year)-readiness(a,w.year))[0];
}
function swap(w:World,upper:Division,lower:Division,slots:number,minAge:number,margin:number){
  const swapped=new Set<string>();
  for(let i=0;i<slots;i++){
    const champions=protectedChampions(w);
    const u=roster(w,upper).filter(f=>!swapped.has(f.id)&&!champions.has(f.id)).sort((a,b)=>readiness(a,w.year)-readiness(b,w.year))[0];
    const l=roster(w,lower).filter(f=>!swapped.has(f.id)&&ageOf(f,w.year)>=minAge).sort((a,b)=>readiness(b,w.year)-readiness(a,w.year))[0];
    if(!u||!l||readiness(l,w.year)<readiness(u,w.year)+margin)break;
    const currentUpper=u.division,currentLower=l.division;
    demote(w,u,currentLower,`Reassigned from ${currentUpper} after annual assessment`);
    promote(w,l,currentUpper,`Promoted from ${currentLower} on annual talent assessment`);
    swapped.add(u.id);swapped.add(l.id);
  }
}
function swapRegionalGlobal(w:World,slots:number) {
  // Exchange only athletes from the SAME home region. This keeps both continents
  // and all ten divisions at their required fixed capacities without cross-region shuffling.
  const used=new Set<string>();
  for(let i=0;i<slots;i++){
    const potential=REGIONS.map(r=>{
      const upper=roster(w,'GLOBAL D2').filter(f=>f.region===r&&!used.has(f.id)).sort((a,b)=>readiness(a,w.year)-readiness(b,w.year))[0];
      const lower=roster(w,regionDivision(r,1)).filter(f=>!used.has(f.id)&&ageOf(f,w.year)>=21).sort((a,b)=>readiness(b,w.year)-readiness(a,w.year))[0];
      return upper&&lower?{upper,lower,margin:readiness(lower,w.year)-readiness(upper,w.year)}:null;
    }).filter((x):x is {upper:Fighter;lower:Fighter;margin:number}=>Boolean(x));
    potential.sort((a,b)=>b.margin-a.margin);
    const pick=potential[0];if(!pick||pick.margin<2.5)break;
    const {upper,lower}=pick;
    demote(w,upper,regionDivision(upper.region,1),'Returned to continental competition after annual assessment');
    promote(w,lower,'GLOBAL D2','Promoted to the global circuit following annual talent assessment');
    used.add(upper.id);used.add(lower.id);
  }
}
/** Each division's ranking points are re-centred on a fixed level every season, keeping the
    spread (and therefore the order) but stopping inflation from promotions and relegations. */
const POINT_LEVEL=(d:Division)=>d==='S-TIER'?1600:d==='GLOBAL D2'?1420:d.endsWith('D1')?1260:1100;
function anchorPoints(w:World){
 for(const d of DIVISIONS){const list=roster(w,d);if(!list.length)continue;
  const shift=POINT_LEVEL(d)-list.reduce((s,f)=>s+f.rankingPoints,0)/list.length;
  for(const f of list)f.rankingPoints=Math.round(clamp(f.rankingPoints+shift,850,2050));
 }
}
function ensureExact(w:World) {
  for(const d of DIVISIONS){if(roster(w,d).length!==20)throw Error(`Roster invariant: ${d} has ${roster(w,d).length} fighters instead of 20`);}
  if(w.fighters.filter(f=>f.status==='active').length!==200)throw Error('Expected 200 active fighters');
  if(roster(w,'S-TIER').some(f=>ageOf(f,w.year)<24))throw Error('Underage S-Tier fighter');
  for(const r of REGIONS)for(const d of REGION_DIVISIONS[r])if(roster(w,d).some(f=>f.region!==r))throw Error('Wrong regional assignment');
}
/** Annual roster turnover follows the completed fourth combat circuit. */
function transitionYear(world:World,rng:Random):World {
  const w=world;
  const beginning=new Map(w.fighters.filter(f=>f.status==='active').map(f=>[f.id,f.division]));
  // Close the completed season before age and division change.
  const currentReign=w.crown.reigns.at(-1);
  if(currentReign&&w.crown.championId&&currentReign.startYear<w.year){
   const holder=w.fighters.find(f=>f.id===w.crown.championId);
   if(holder)holder.fame=(holder.fame||0)+15; // Retaining the World Crown across a full season.
  }
  const keyIds=closeLegacySeason(w);
  w.seasons.push(summary(w,0,0,0,0));
  closeSeasonArchive(w,w.year,keyIds);
  w.year+=1;w.round=0;
  FORM=recentForm(w);
  for(const f of w.fighters.filter(f=>f.status==='active')){
    f.shape+=f.shape>0?-1:f.shape<0?1:0;
    // December-to-March recovery is limited, especially for older athletes.
    const age=ageOf(f,w.year);
    const ceiling=Math.round(clamp(86+rng.int(-4,7)-Math.max(0,age-35)*.55,76,96));
    f.condition=Math.min(ceiling,clamp(f.condition+rng.int(5,13),0,100));
    if(f.injuryUntil>w.year*60)f.condition=Math.min(f.condition,39);
    // Reigning champions are less inclined to walk away.
    if(rng.next()<retireChance(f,w.year)*(beltsHeld(w,f.id).length?.5:1)) {
      f.status='retired';f.retiredYear=w.year;
      record(w,f,'Retired from professional competition');
      event(w,f,'retirement',`Retired at age ${age} with a record of ${f.record.wins}-${f.record.losses}-${f.record.draws}`);
    }
  }
  // Continental champions earn promotion to the global circuit and relinquish their belt.
  for(const belt of CONTINENTAL_BELTS){
   const holder=w.fighters.find(f=>f.id===w.belts[belt].championId);
   if(!holder||holder.status!=='active'||holder.division!==BELT_DIVISION[belt]||ageOf(holder,w.year)<21)continue;
   const out=roster(w,'GLOBAL D2').filter(f=>f.region===holder.region&&!protectedChampions(w).has(f.id)).sort((a,b)=>readiness(a,w.year)-readiness(b,w.year))[0];
   // Promotion needs an open place: a same-region swap or a vacancy on the global circuit.
   if(!out&&roster(w,'GLOBAL D2').length>=20)continue;
   vacateBelt(w,belt,'is promoted to the global circuit');
   if(out)demote(w,out,BELT_DIVISION[belt],'Returned to continental competition to make room for a continental champion');
   promote(w,holder,'GLOBAL D2',`Promoted to the global circuit as ${belt.charAt(0)+belt.slice(1).toLowerCase()} continental champion`);
  }
  fill(w,'S-TIER','GLOBAL D2',24);
  while(roster(w,'GLOBAL D2').length<20){const p=bestFromRegional(w);if(!p)break;promote(w,p,'GLOBAL D2','Advanced from continental Division I to the global circuit');}
  for(const r of REGIONS)fill(w,regionDivision(r,1),regionDivision(r,2),18);
  const names=new Set(w.fighters.map(f=>f.name));let count=0;
  const slots=REGIONS.flatMap(r=>Array<Region>(Math.max(0,20-roster(w,regionDivision(r,2)).length)).fill(r));
  const rarities=planRookieRarities(w,rng,slots);
  slots.forEach((r,i)=>{
    const division=regionDivision(r,2);
    const fighter=createFighter(rng,w.nextId++,r,division,rarities[i],w.year,names,{rookie:true});
    fighter.rankingPoints=pointsSeed(fighter,w.year);
    w.fighters.push(fighter);count++;
    const tag=fighter.rarity==='Generational'?' — a generational talent':fighter.rarity==='Legend'?' — a future legend in the making':'';
    event(w,fighter,'debut',`New prospect from ${fighter.country} joins ${division}${tag}`);
  });
  swap(w,'S-TIER','GLOBAL D2',3,24,2.1);
  for(const r of REGIONS)swap(w,regionDivision(r,1),regionDivision(r,2),2,18,2);
  swapRegionalGlobal(w,2);
  // A belt must never travel to another division or remain with a retired athlete.
  for(const belt of ['WORLD',...CONTINENTAL_BELTS] as const){
   const b=belt==='WORLD'?w.crown:w.belts[belt];
   const valid=(id?:string|null)=>{const f=w.fighters.find(x=>x.id===id);return !!f&&f.status==='active'&&f.division===BELT_DIVISION[belt];};
   if(b.interimId&&!valid(b.interimId)){const r=b.interimReigns?.at(-1);if(r&&!r.endYear){r.endYear=w.year;r.endRound=0;}b.interimId=null;}
   if(b.mandatoryId&&!valid(b.mandatoryId))b.mandatoryId=null;
   if(b.championId&&!valid(b.championId)){const holder=w.fighters.find(f=>f.id===b.championId);vacateBelt(w,belt,holder?.status==='retired'?'retires':'leaves the division');}
  }
  pinChampionForm(w);
  // Star power fades without new achievements.
  for(const f of w.fighters)if(f.status==='active'&&f.fame)f.fame=Math.round(f.fame*.92);
  ensureExact(w);
  anchorPoints(w);
  rankRoster(w);
  inductHallOfFame(w);
  let promos=0,rels=0;
  for(const f of w.fighters.filter(x=>x.status==='active')){
    const prior=beginning.get(f.id);
    const changed=prior&&prior!==f.division;
    const note=!prior?'New prospect enters the professional circuit':changed?`${prior} → ${f.division}`:`Season ${w.year} begins`;
    if(changed){promos+=tier(f.division)<tier(prior)?1:0;rels+=tier(f.division)>tier(prior)?1:0;}
    record(w,f,note);
  }
  // Last entry is the current (as yet unplayed) season.
  w.seasons.push({...summary(w,count,w.fighters.filter(f=>f.retiredYear===w.year).length,promos,rels),fights:0,knockouts:0,submissions:0});
  return w;
}
/** Copy only what can change. Closed seasons, retired careers and finished tournaments are immutable and shared. */
function cloneWorld(w:World):World{
 return {...w,
  fighters:w.fighters.map(f=>f.status==='retired'?f:structuredClone(f)),
  fights:[...w.fights],ledger:{...w.ledger,[w.year]:[...(w.ledger[w.year]||[])]},keyFights:{...w.keyFights},
  events:[...w.events],seasons:[...w.seasons],awards:[...w.awards],iconicMoments:[...w.iconicMoments],hallOfFame:[...w.hallOfFame],
  tournaments:w.tournaments.map(t=>t.status==='complete'?t:structuredClone(t)),
  lastFightIds:[...w.lastFightIds],pendingFight:w.pendingFight&&{...w.pendingFight},marqueeReservation:w.marqueeReservation&&{...w.marqueeReservation},
  crown:structuredClone(w.crown),belts:structuredClone(w.belts),beltReservations:w.beltReservations&&structuredClone(w.beltReservations),
  user:w.user&&{...w.user,followed:[...w.user.followed],picks:[...w.user.picks]}};
}
/** The undercard completes now; the headliner remains genuinely unresolved. */
export function prepareNextEvent(world:World):World {
 if(world.pendingFight||world.activeTournamentId)return world;
 const w=cloneWorld(world);const rng=new Random(w.rngState);
 if(kindAt(w.year,w.round))beginTournament(w,rng);else prepareCircuitRound(w,rng);w.rngState=rng.state;
 return w;
}
/** Resolves and commits the featured fight, then moves to the next event. */
function resolveInPlace(w:World):string|null {
 const rng=new Random(w.rngState);
 const fight=settleHeadliner(w,rng);
 finishCircuitRound(w);
 if(w.round>=ROUNDS_PER_YEAR){w.seasons.pop();transitionYear(w,rng);}
 else{
  const last=w.seasons[w.seasons.length-1];
  if(last&&last.year===w.year)w.seasons[w.seasons.length-1]=summary(w,last.newcomers,last.retirements,last.promotions,last.relegations);
 }
 w.rngState=rng.state;return fight?.id||null;
}
export function resolveCurrentEvent(world:World):{world:World;fightId:string|null} {
 const w=cloneWorld(world);return {world:w,fightId:resolveInPlace(w)};
}
function refreshSeason(w:World):void{
 const last=w.seasons.at(-1);
 if(last&&last.year===w.year)w.seasons[w.seasons.length-1]=summary(w,last.newcomers,last.retirements,last.promotions,last.relegations);
}
/** Step one special-event matchup/wave, without generating outcomes for future rounds. */
export function resolveTournamentAction(world:World):{world:World;fightId:string|null}{
 const w=cloneWorld(world),rng=new Random(w.rngState);
 const fightId=advanceTournamentBout(w,rng);w.rngState=rng.state;refreshSeason(w);
 return {world:w,fightId};
}
export function resolveTournamentStage(world:World,waves=5):World{
 const w=cloneWorld(world),t=currentTournament(w);if(!t)throw Error('No active tournament');
 const stage=t.stage,rng=new Random(w.rngState);
 if(t.kind==='SURGE'){
  for(let i=0;i<waves&&currentTournament(w);i++)advanceTournamentBout(w,rng);
 }else{
  while(currentTournament(w)&&t.stage===stage)advanceTournamentBout(w,rng);
 }
 w.rngState=rng.state;refreshSeason(w);return w;
}
export function resolveWholeTournament(world:World):World{
 const w=cloneWorld(world),rng=new Random(w.rngState);
 if(!currentTournament(w))throw Error('No active tournament');
 finishTournament(w,rng);w.rngState=rng.state;refreshSeason(w);return w;
}
/** Mutate a private copy in bulk; do not clone a growing multi-decade archive every single event. */
function advanceInPlace(w:World):void {
 if(w.activeTournamentId||kindAt(w.year,w.round)&&!w.pendingFight){
  const rng=new Random(w.rngState);
  if(!w.activeTournamentId)beginTournament(w,rng);
  finishTournament(w,rng);w.rngState=rng.state;
  const last=w.seasons.at(-1);
  if(last&&last.year===w.year)w.seasons[w.seasons.length-1]=summary(w,last.newcomers,last.retirements,last.promotions,last.relegations);
  return;
 }
 if(!w.pendingFight){const rng=new Random(w.rngState);prepareCircuitRound(w,rng);w.rngState=rng.state;}
 resolveInPlace(w);
}
export function advanceRound(world:World):World {
 const w=cloneWorld(world);advanceInPlace(w);return w;
}
export function advanceYear(world:World):World {
 const w=cloneWorld(world),target=w.year+1;
 while(w.year<target)advanceInPlace(w);
 return w;
}
function tier(d:Division) {return d==='S-TIER'?0:d==='GLOBAL D2'?1:d.endsWith('D1')?2:3;}
export function advanceYears(w:World,n:number):World {const state=cloneWorld(w),target=state.year+n;while(state.year<target)advanceInPlace(state);return state;}
/** Structural check for v0.6–v0.8 saves (pre-ledger), used by the migration chain. */
function validateLegacyWorld(x:unknown):x is World {
 if(!x||typeof x!=='object')return false;const w=x as World;
 return (x as {version?:string}).version==='0.6.0'&&Array.isArray(w.iconicMoments)&&Array.isArray(w.awards)&&Array.isArray(w.hallOfFame)&&Array.isArray(w.tournaments)&&
 (w.activeTournamentId===null||typeof w.activeTournamentId==='string')&&Number.isInteger(w.round)&&w.round>=0&&w.round<ROUNDS_PER_YEAR&&
 Number.isInteger(w.nextFightId)&&Array.isArray(w.fights)&&!!w.crown&&Array.isArray(w.crown.reigns)&&
 (w.pendingFight===null||!!w.pendingFight&&typeof w.pendingFight.fighterA==='string')&&
 Number.isInteger(w.year)&&Number.isInteger(w.rngState)&&Number.isInteger(w.nextId)&&
 Array.isArray(w.fighters)&&Array.isArray(w.events)&&Array.isArray(w.seasons)&&w.fighters.length>=200&&
 w.fighters.every(f=>typeof f.id==='string'&&Array.isArray(f.history)&&Array.isArray(f.curve)&&f.curve.length===28);
}
export function validateWorld(x:unknown):x is World {
 if(!x||typeof x!=='object')return false;const w=x as World;
 return w.version==='0.9.0'&&!!w.ledger&&typeof w.ledger==='object'&&!!w.keyFights&&typeof w.keyFights==='object'&&
 validateLegacyWorld({...w,version:'0.6.0'});
}
/** v0.6–v0.8 → v0.9: every bout becomes a ledger row; title fights, tournament knockouts and
    award/iconic bouts of past seasons are kept in detail; all minute-by-minute data is dropped. */
export function migrateToLedger(old:World):World{
 const w={...old,version:'0.9.0',ledger:{} as Record<number,LedgerEntry[]>,keyFights:{} as Record<number,Fight[]>} as unknown as World;
 const keep=new Set<string>();
 for(const a of old.awards)for(const id of [a.fightOfYear,a.knockoutOfYear,a.submissionOfYear,a.upsetOfYear])if(id)keep.add(id);
 for(const m of old.iconicMoments)if(m.fightId)keep.add(m.fightId);
 const current:Fight[]=[];
 for(const f of old.fights){
  const e=toLedger(f);
  const key=f.year<old.year&&(keep.has(f.id)||f.titleFight||f.tournamentStage==='Semifinal'||f.tournamentStage==='Final');
  if(key){e.f|=LF.KEY;(w.keyFights[f.year]??=[]).push(stripTimeline(f));}
  (w.ledger[f.year]??=[]).push(e);
  if(f.year===old.year)current.push(stripTimeline(f));
 }
 w.fights=current;
 return w;
}
/** Old eight-card saves migrate to their nearest v0.6 monthly major-event slots.
    Fights and all trophy winners remain UNCHANGED; only their calendar coordinates
    and medical recovery deadlines are converted. */
const legacyRounds=[4,14,24,29,34,44,54,59];
function oldSlot(round:number){return legacyRounds[Math.max(0,Math.min(7,round))];}
function convertOldClock(value:number){const year=Math.floor(value/8),r=value-year*8;return year*60+oldSlot(r);}
function migrateEightRound(w:World):World{
 const previous=w.round;const currentTournament=w.tournaments.find(t=>t.id===w.activeTournamentId);
 w.marqueeReservation=null;
 w.round=currentTournament?.kind==='SURGE'?34:currentTournament?.kind==='CRUCIBLE'?54:currentTournament?.kind==='OLYMPIAD'?39:oldSlot(previous);
 // When an eight-card event is complete the next old round advances to its own v0.6 slot.
 w.fighters.forEach(f=>{f.injuryUntil=f.injuryUntil?convertOldClock(f.injuryUntil):0;f.injuryName=undefined;f.injurySeverity=undefined;});
 w.fights.forEach(f=>{f.roundIndex=oldSlot(Math.max(0,f.roundIndex-1))+1;});
 w.crown.reigns.forEach(r=>{r.startRound=oldSlot(Math.max(0,r.startRound-1))+1;if(r.endRound)r.endRound=oldSlot(Math.max(0,r.endRound-1))+1;});
 if(w.pendingFight){w.pendingFight.roundIndex=w.round;w.pendingFight.eventName='LEGACY FEATURE';}
 return w;
}
export function migrateV02(raw:unknown):World|null {
 if(!raw||typeof raw!=='object')return null;const old=raw as Omit<Partial<World>,'version'>&{version?:string};
 if(old.version!=='0.2.0'||!Array.isArray(old.fighters)||!Array.isArray(old.fights)||!Number.isInteger(old.year)||!Number.isInteger(old.round))return null;
 const oldRound=old.round!;
 const w={...old,version:'0.6.0',iconicMoments:[],awards:[],hallOfFame:[],tournaments:[],activeTournamentId:null,
 round:oldSlot(oldRound*2),pendingFight:null,marqueeReservation:null,crown:{championId:null,reigns:[]},
 fighters:old.fighters.map(f=>({...f,fame:0,injuryName:undefined,injurySeverity:undefined,injuryUntil:f.injuryUntil?convertOldClock(f.injuryUntil*2):0})),
 fights:old.fights.map(f=>({...f,roundIndex:oldSlot((f.roundIndex-1)*2)+1,eventName:'LEGACY CIRCUIT',titleFight:false,titleChange:false}))} as unknown as World;
 return validateLegacyWorld(w)?w:null;
}
export function migrateLegacy(raw:unknown):World|null {
 if(!raw||typeof raw!=='object')return null;const old=raw as Omit<Partial<World>,'version'>&{version?:string};
 if(old.version!=='0.1.0'||!Array.isArray(old.fighters)||!Array.isArray(old.seasons)||!Array.isArray(old.events)||!Number.isInteger(old.year))return null;
 const w={...old,version:'0.6.0',iconicMoments:[],awards:[],hallOfFame:[],tournaments:[],activeTournamentId:null,round:0,nextFightId:1,fights:[],lastFightIds:[],pendingFight:null,marqueeReservation:null,crown:{championId:null,reigns:[]},fighters:old.fighters.map(f=>({...f,fame:0,record:emptyRecord(),rankingPoints:pointsSeed(f,old.year!),injuryUntil:0}))} as unknown as World;
 rankRoster(w);return validateLegacyWorld(w)?w:null;
}
export function migrateV03(raw:unknown):World|null {
 if(!raw||typeof raw!=='object')return null;const old=raw as Omit<Partial<World>,'version'>&{version?:string};
 if(old.version!=='0.3.0'||!Array.isArray(old.fighters)||!Array.isArray(old.fights))return null;
 const w={...structuredClone(old),version:'0.6.0',iconicMoments:[],awards:[],hallOfFame:[],tournaments:[],activeTournamentId:null,fighters:old.fighters.map(f=>({...f,fame:0}))} as unknown as World;
 return validateLegacyWorld(migrateEightRound(w))?w:null;
}
export function migrateV04(raw:unknown):World|null {
 if(!raw||typeof raw!=='object'||(raw as {version?:string}).version!=='0.4.0')return null;
 const w={...structuredClone(raw as World),version:'0.6.0',iconicMoments:[],awards:[],hallOfFame:[]} as unknown as World;
 return validateLegacyWorld(migrateEightRound(w))?w:null;
}
export function migrateV05(raw:unknown):World|null {
 if(!raw||typeof raw!=='object'||(raw as {version?:string}).version!=='0.5.0')return null;
 const w={...structuredClone(raw as World),version:'0.6.0'} as unknown as World;
 return validateLegacyWorld(migrateEightRound(w))?w:null;
}
/** Fill in structures added after a save was written (belts, player state). */
function ensureCurrent(w:World):World{
 w.belts??=emptyBelts();w.beltReservations??=null;
 w.user??={followed:[],picks:[],pendingPick:null};
 for(const b of [w.crown,...Object.values(w.belts)]){b.interimId??=null;b.interimReigns??=[];b.mandatoryId??=null;}
 for(const f of w.fighters)if(f.status==='active')f.shape=clamp(f.shape,-FORM_MAX,FORM_MAX);
 for(const f of w.fighters){const country=countryNamed(f.country);if(country)f.flag=country.flag;}
 pinChampionForm(w);
 return w;
}
export function upgradeWorld(raw:unknown):World|null {
 if(validateWorld(raw))return ensureCurrent(raw);
 if(validateLegacyWorld(raw))return ensureCurrent(initializeLegacy(migrateToLedger(raw)));
 const migrated=migrateV05(raw)||migrateV04(raw)||migrateV03(raw)||migrateV02(raw)||migrateLegacy(raw);
 return migrated?ensureCurrent(initializeLegacy(migrateToLedger(migrated))):null;
}
export function loadWorld():World {try{
 for(const key of [STORAGE_KEY,V05_STORAGE_KEY,V04_STORAGE_KEY,PREVIOUS_STORAGE_KEY,OLD_STORAGE_KEY,LEGACY_STORAGE_KEY]){
  const data=localStorage.getItem(key);if(!data)continue;
  const imported=upgradeWorld(JSON.parse(data));if(imported)return imported;
 }
}catch{/* Storage disabled or corrupted */}return createWorld();}

export function exportWorld(w:World){const blob=new Blob([JSON.stringify(w)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`nexus-chronicle-${w.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
