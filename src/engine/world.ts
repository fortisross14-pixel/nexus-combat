import {closeLegacySeason,inductHallOfFame,initializeLegacy} from './legacy';
import {beginTournament,currentTournament,advanceTournamentBout,finishTournament,kindAt} from './tournaments';
import {ACTIVE_FIGHTERS,BRANDS,DIVISIONS,DIVISION_SIZE,REGIONS,REGION_DIVISIONS,SECOND_DIVISION,START_YEAR,TOP_DIVISION,WORLD_DIVISIONS,brandOf,isSecondDivision,isTopDivision,isWorldTier} from './constants';
import {emptyTag} from './doubles';
import {ageOf,baseOf,clamp,createFighter,foundingPlan,overallOf,planRookieRarities,regionDivision} from './career';
import {Random} from './random';
import {countryNamed} from './names';
import {competitiveScore,pointsSeed,rankByCompetition,prepareCircuitRound,settleCard,finishCircuitRound,ROUNDS_PER_YEAR,emptyRecord,recentForm,isBigEvent} from './competition';
import {closeSeasonArchive,stripTimeline,toLedger,LF} from './archive';
import {beltsHeld,BELT_DIVISION,BRAND_BELTS,CONTINENTAL_BELTS,emptyBelt,emptyBelts,FORM_MAX,pinChampionForm,protectedChampions,vacateBelt} from './belts';
import type {Brand,Fighter,Division,Rarity,Region,World,WorldEvent,SeasonSummary,CareerSnapshot,Fight,LedgerEntry} from './types';
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
  const rng=new Random(seed);const w:World={version:'0.9.0',calendar:48,ledger:{},keyFights:{},iconicMoments:[],awards:[],hallOfFame:[],tournaments:[],activeTournamentId:null,year:START_YEAR,seed,rngState:rng.state,nextId:1,fighters:[],events:[],seasons:[],round:0,nextFightId:1,fights:[],lastFightIds:[],pendingFight:null,marqueeReservation:null,crown:emptyBelt(),crowns:{NOVA:emptyBelt(),ONYX:emptyBelt()},titleShot:null,pinnacle:[],supremacy:[],tag:emptyTag(),marquees:null,belts:emptyBelts(),beltReservations:null,user:{followed:[],picks:[],pendingPick:null}};
  const names=new Set<string>();
  for(const slot of foundingPlan(rng))w.fighters.push(createFighter(rng,w.nextId++,slot.region,slot.division,slot.rarity,w.year,names,{age:slot.age}));
  w.fighters.forEach(f=>{f.rankingPoints=pointsSeed(f,w.year);});
  rankRoster(w);w.fighters.forEach(f=>record(w,f,'Founding roster'));
  w.rngState=rng.state;
  w.seasons.push(summary(w,0,0,0,0));
  return w;
}
function summary(w:World,newcomers:number,retirements:number,promotions:number,relegations:number):SeasonSummary {
 const active=w.fighters.filter(f=>f.status==='active'),tier=active.filter(f=>isTopDivision(f.division));
 let bouts=0,kos=0,subs=0;
 // Append-only fight archive is chronological; scan only the current season.
 for(let i=w.fights.length-1;i>=0&&w.fights[i].year===w.year;i--){
  const f=w.fights[i];bouts++;if(f.method==='KO'||f.method==='TKO')kos++;if(f.method==='SUB')subs++;
 }
 return {year:w.year,newcomers,retirements,promotions,relegations,fights:bouts,knockouts:kos,submissions:subs,
 averageAge:+(active.reduce((s,f)=>s+ageOf(f,w.year),0)/Math.max(1,active.length)).toFixed(1),
 sTierAverage:+(tier.reduce((s,f)=>s+overallOf(f,w.year),0)/Math.max(1,tier.length)).toFixed(1)};
}
/** Chance a continental champion chooses to step up to the global circuit. */
export function promotionAmbition(f:Fighter,year:number){
 const age=ageOf(f,year);
 if(age<=25||f.rarity==='Generational'||f.rarity==='Legend')return 1;
 if(age>=33)return f.rarity==='Epic'?.25:.03;
 const base=f.rarity==='Epic'?.65:f.rarity==='Rare'?.3:.12;
 const drive=f.mentality==='Bold'||f.mentality==='Crazy'?1.6:f.mentality==='Cold'?1:.8;
 return clamp(base*drive,0,1);
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
/** Each division's ranking points are re-centred on a fixed level every season, keeping the
    spread (and therefore the order) but stopping inflation from promotions and relegations. */
const POINT_LEVEL=(d:Division)=>isTopDivision(d)?1600:isSecondDivision(d)?1420:d.endsWith('D1')?1260:1100;
function anchorPoints(w:World){
 for(const d of DIVISIONS){const list=roster(w,d);if(!list.length)continue;
  const shift=POINT_LEVEL(d)-list.reduce((s,f)=>s+f.rankingPoints,0)/list.length;
  for(const f of list)f.rankingPoints=Math.round(clamp(f.rankingPoints+shift,850,2050));
 }
}
function ensureExact(w:World) {
  for(const d of DIVISIONS){const n=roster(w,d).length;if(n!==DIVISION_SIZE(d))throw Error(`Roster invariant: ${d} has ${n} fighters instead of ${DIVISION_SIZE(d)}`);}
  if(w.fighters.filter(f=>f.status==='active').length!==ACTIVE_FIGHTERS)throw Error(`Expected ${ACTIVE_FIGHTERS} active fighters`);
  if(w.fighters.some(f=>f.status==='active'&&isTopDivision(f.division)&&ageOf(f,w.year)<24))throw Error('Underage S Division fighter');
  for(const r of REGIONS)for(const d of REGION_DIVISIONS[r])if(roster(w,d).some(f=>f.region!==r))throw Error('Wrong regional assignment');
}
/* ───────────── The offseason Draft Room ─────────────
   The year closes (retirements, recovery), then the roster is rebuilt in the Draft Room: promotions and
   relegations between S Division and Division II of each brand, signings from the continents into the brand
   Divisions II, and the continental Division I / II ladder. Every move is recorded so it can be undone; the
   rosters are only checked when the player presses "Promotion done — spawn". New prospects then fill each
   continental Division II back to twenty. With `manager` off (fast simulation, tests) the game makes the
   same decisions itself. */
export const DRAFT_LIMITS={brandRelegations:2,brandReleases:2,continentalRelegations:3} as const;
const regionOf=(d:Division):Region|null=>REGIONS.find(r=>(REGION_DIVISIONS[r] as readonly Division[]).includes(d))??null;
const brandCount=(w:World,brand:Brand,rarity:Rarity)=>w.fighters.filter(f=>f.status==='active'&&brandOf(f.division)===brand&&f.rarity===rarity).length;
const openings=(w:World,d:Division)=>DIVISION_SIZE(d)-roster(w,d).length;
const draftMoveOf=(w:World,id:string)=>w.draft?.moves.find(m=>m.id===id);
/** Draft-style balance: elite talent goes to the brand with less of it; everyone else to the brand that needs the seat. */
export function recommendBrand(w:World,f:Fighter):Brand{
 const need=(b:Brand)=>openings(w,SECOND_DIVISION[b])+openings(w,TOP_DIVISION[b]);
 const strength=(b:Brand)=>w.fighters.filter(x=>x.status==='active'&&brandOf(x.division)===b).reduce((s,x)=>s+overallOf(x,w.year),0);
 const order=[...BRANDS].sort((a,b)=>{
  if(f.rarity==='Generational'||f.rarity==='Legend'){
   const g=brandCount(w,a,'Generational')-brandCount(w,b,'Generational');if(g)return g;
   const l=brandCount(w,a,'Legend')-brandCount(w,b,'Legend');if(l)return l;
  }
  const n=need(b)-need(a);if(n)return n;
  return strength(a)-strength(b);
 });
 return order[0];
}
/** Moves a fighter during the Draft Room, remembering where he came from (and his points) so it can be undone. */
function mv(w:World,f:Fighter,to:Division){
 const d=w.draft!;const prior=d.moves.find(m=>m.id===f.id);
 if(prior){f.rankingPoints=prior.points;f.division=prior.from;if(prior.from===to){d.moves=d.moves.filter(m=>m!==prior);return;}d.moves=d.moves.filter(m=>m!==prior);}
 d.moves.push({id:f.id,from:f.division,to,points:f.rankingPoints});
 moveDivision(w,f,to);
}
/** Where a fighter may go from the Draft Room (besides back to where he started). */
export function draftTargets(w:World,f:Fighter):Division[]{
 if(!w.draft||f.status!=='active')return [];
 const moved=draftMoveOf(w,f.id);if(moved)return [moved.from];
 const champs=protectedChampions(w),brand=brandOf(f.division),region=regionOf(f.division),age=ageOf(f,w.year);
 if(brand&&isTopDivision(f.division))return champs.has(f.id)||w.titleShot?.fighterId===f.id?[]:[SECOND_DIVISION[brand]];
 if(brand)return [...(age>=24?[TOP_DIVISION[brand]]:[]),regionDivision(f.region,1)];
 if(region&&f.division===regionDivision(region,1))return [...(w.draft.applicants.includes(f.id)?BRANDS.map(b=>SECOND_DIVISION[b]):[]),...(champs.has(f.id)?[]:[regionDivision(region,2)])];
 if(region&&age>=18)return [regionDivision(region,1)];
 return [];
}
export interface DraftCheck {division:Division;count:number;target:number;ok:boolean}
/** Division counts against their targets and how many voluntary relegations each pool has used. */
export function draftStatus(w:World){
 const d=w.draft!;
 const checks:DraftCheck[]=DIVISIONS.map(division=>{const count=roster(w,division).length,target=DIVISION_SIZE(division);
  const isD2=!isWorldTier(division)&&division.endsWith('D2');return {division,count,target,ok:isD2?count<=target:count===target};});
 const relegated=(from:(x:Division)=>boolean,to:(x:Division)=>boolean)=>d.moves.filter(m=>from(m.from)&&to(m.to));
 const used={
  brandRelegations:Object.fromEntries(BRANDS.map(b=>[b,relegated(x=>x===TOP_DIVISION[b],x=>x===SECOND_DIVISION[b]).length])) as Record<Brand,number>,
  brandReleases:Object.fromEntries(BRANDS.map(b=>[b,relegated(x=>x===SECOND_DIVISION[b],x=>!isWorldTier(x)).length])) as Record<Brand,number>,
  continentalRelegations:Object.fromEntries(REGIONS.map(r=>[r,relegated(x=>x===regionDivision(r,1),x=>x===regionDivision(r,2)).length])) as Record<Region,number>,
 };
 const over=BRANDS.some(b=>used.brandRelegations[b]>DRAFT_LIMITS.brandRelegations||used.brandReleases[b]>DRAFT_LIMITS.brandReleases)||REGIONS.some(r=>used.continentalRelegations[r]>DRAFT_LIMITS.continentalRelegations);
 return {checks,used,ok:checks.every(c=>c.ok)&&!over};
}
/** Whether a move is allowed right now (targets and relegation limits). */
export function canDraftMove(w:World,f:Fighter,to:Division){
 if(!draftTargets(w,f).includes(to))return false;
 if(draftMoveOf(w,f.id))return true;
 const {used}=draftStatus(w);const brand=brandOf(f.division),region=regionOf(f.division);
 if(brand&&isTopDivision(f.division))return used.brandRelegations[brand]<DRAFT_LIMITS.brandRelegations;
 if(brand&&!isWorldTier(to))return used.brandReleases[brand]<DRAFT_LIMITS.brandReleases;
 if(region&&to===regionDivision(region,2))return used.continentalRelegations[region]<DRAFT_LIMITS.continentalRelegations;
 return true;
}
/** Close the finished season: archive, age, recovery and retirements. */
function closeSeason(w:World,rng:Random):string[]{
 for(const brand of BRANDS){
  const c=w.crowns![brand],reign=c.reigns.at(-1);
  if(reign&&c.championId&&reign.startYear<w.year){const holder=w.fighters.find(f=>f.id===c.championId);if(holder)holder.fame=(holder.fame||0)+15;}
 }
 const keyIds=closeLegacySeason(w);
 w.seasons.push(summary(w,0,0,0,0));
 closeSeasonArchive(w,w.year,keyIds);
 w.year+=1;w.round=0;
 FORM=recentForm(w);
 const retired:string[]=[];
 for(const f of w.fighters.filter(f=>f.status==='active')){
  f.shape+=f.shape>0?-1:f.shape<0?1:0;
  const age=ageOf(f,w.year);
  const ceiling=Math.round(clamp(86+rng.int(-4,7)-Math.max(0,age-35)*.55,76,96));
  f.condition=Math.min(ceiling,clamp(f.condition+rng.int(5,13),0,100));
  if(f.injuryUntil>w.year*ROUNDS_PER_YEAR)f.condition=Math.min(f.condition,39);
  // Reigning champions are less inclined to walk away.
  if(rng.next()<retireChance(f,w.year)*(beltsHeld(w,f.id).length?.5:1)){
   f.status='retired';f.retiredYear=w.year;retired.push(f.id);
   record(w,f,'Retired from professional competition');
   event(w,f,'retirement',`Retired at age ${age} with a record of ${f.record.wins}-${f.record.losses}-${f.record.draws}`);
  }
 }
 return retired;
}
/** Opens the Draft Room. Each continental contender decides once whether he wants a brand. */
function openDraft(w:World,rng:Random,retired:string[]){
 const applicants:string[]=[],declined:string[]=[];
 const champs=new Set(CONTINENTAL_BELTS.map(b=>w.belts[b].championId).filter(Boolean));
 for(const r of REGIONS){
  const contenders=roster(w,regionDivision(r,1)).filter(f=>ageOf(f,w.year)>=21).sort((a,b)=>readiness(b,w.year)-readiness(a,w.year));
  // Only the continent's contenders (its top eight and its champion) are in a position to move up.
  contenders.forEach((f,i)=>{
   if(i>=8&&!champs.has(f.id))return;
   if(rng.next()<promotionAmbition(f,w.year))applicants.push(f.id);else declined.push(f.id);
  });
 }
 w.draft={year:w.year,retired,applicants,declined,moves:[]};
}
/** The game as brand manager: fills every gap and makes the clear-cut swaps, keeping the player's own moves. */
function autoDraft(w:World){
 const champs=()=>protectedChampions(w);
 const pick=(list:Fighter[])=>list.sort((a,b)=>readiness(b,w.year)-readiness(a,w.year))[0];
 const weakest=(list:Fighter[])=>list.sort((a,b)=>readiness(a,w.year)-readiness(b,w.year))[0];
 const free=(f:Fighter)=>!draftMoveOf(w,f.id);
 const can=(f:Fighter,to:Division)=>canDraftMove(w,f,to);
 // 1 · Each S Division is topped up from its own Division II, then the clear-cut swaps.
 for(const brand of BRANDS){
  const S=TOP_DIVISION[brand],II=SECOND_DIVISION[brand];
  while(openings(w,S)>0){const p=pick(roster(w,II).filter(f=>free(f)&&can(f,S)));if(!p)break;mv(w,p,S);}
  for(let i=0;i<DRAFT_LIMITS.brandRelegations;i++){
   const u=weakest(roster(w,S).filter(f=>free(f)&&can(f,II))),l=pick(roster(w,II).filter(f=>free(f)&&can(f,S)));
   if(!u||!l||readiness(l,w.year)<readiness(u,w.year)+2.1)break;mv(w,u,II);mv(w,l,S);
  }
 }
 const applicants=()=>REGIONS.flatMap(r=>roster(w,regionDivision(r,1))).filter(f=>free(f)&&w.draft!.applicants.includes(f.id));
 // 2 · Continental champions who applied always get a seat; the weakest same-region fighter makes way if needed.
 for(const f of applicants().filter(x=>champs().has(x.id))){
  const brand=recommendBrand(w,f),II=SECOND_DIVISION[brand];
  if(openings(w,II)<=0){const out=weakest(roster(w,II).filter(x=>free(x)&&x.region===f.region&&can(x,regionDivision(x.region,1))));if(!out)continue;mv(w,out,regionDivision(out.region,1));}
  mv(w,f,II);
 }
 // 3 · Draft: the best applicants fill the open seats, each going where the balance rules send him.
 while(BRANDS.some(b=>openings(w,SECOND_DIVISION[b])>0)){
  const f=pick(applicants());if(!f)break;
  const open=BRANDS.filter(b=>openings(w,SECOND_DIVISION[b])>0);
  const best=recommendBrand(w,f);
  mv(w,f,SECOND_DIVISION[open.includes(best)?best:open[0]]);
 }
 // Nobody applied for a seat: the best remaining continental fighter accepts a late offer.
 for(const brand of BRANDS)while(openings(w,SECOND_DIVISION[brand])>0){
  const f=pick(REGIONS.flatMap(r=>roster(w,regionDivision(r,1))).filter(x=>free(x)&&!champs().has(x.id)&&ageOf(x,w.year)>=21));if(!f)break;
  w.draft!.applicants.push(f.id);mv(w,f,SECOND_DIVISION[brand]);
 }
 // 4 · Up to two clear upgrades per brand: an applicant replaces the weakest same-region Division II fighter.
 for(const brand of BRANDS)for(let i=0;i<DRAFT_LIMITS.brandReleases;i++){
  const II=SECOND_DIVISION[brand];
  const options=REGIONS.map(r=>{const up=pick(applicants().filter(f=>f.region===r&&!champs().has(f.id)));const down=weakest(roster(w,II).filter(f=>free(f)&&f.region===r&&can(f,regionDivision(r,1))));
   return up&&down?{up,down,margin:readiness(up,w.year)-readiness(down,w.year)}:null;}).filter((x):x is {up:Fighter;down:Fighter;margin:number}=>!!x).sort((a,b)=>b.margin-a.margin);
  const o=options[0];if(!o||o.margin<2.5)break;
  mv(w,o.down,regionDivision(o.down.region,1));mv(w,o.up,II);
 }
 // 5 · Continental ladders: Division I back to twenty, then the clear-cut swaps.
 for(const r of REGIONS){
  const D1=regionDivision(r,1),D2=regionDivision(r,2);
  while(roster(w,D1).length>DIVISION_SIZE(D1)){const out=weakest(roster(w,D1).filter(f=>free(f)&&can(f,D2)));if(!out)break;mv(w,out,D2);}
  while(roster(w,D1).length<DIVISION_SIZE(D1)){const p=pick(roster(w,D2).filter(f=>free(f)&&ageOf(f,w.year)>=18));if(!p)break;mv(w,p,D1);}
  for(let i=0;i<2;i++){
   const u=weakest(roster(w,D1).filter(f=>free(f)&&can(f,D2))),l=pick(roster(w,D2).filter(f=>free(f)&&ageOf(f,w.year)>=18));
   if(!u||!l||readiness(l,w.year)<readiness(u,w.year)+2)break;mv(w,u,D2);mv(w,l,D1);
  }
 }
}
/** Closes the Draft Room: records the moves, vacates belts that left their division, spawns new prospects. */
function finishDraft(w:World,rng:Random){
 const d=w.draft!;
 for(const m of d.moves){const f=w.fighters.find(x=>x.id===m.id)!;
  if(m.from!==m.to)f.titlePath={division:m.to,wins:0,eliminatorWins:0};
  const up=tier(m.to)<tier(m.from);
  const brand=brandOf(m.to);
  const text=up?(brand&&!isWorldTier(m.from)?`Signed by ${brand} from ${m.from}`:`Promoted from ${m.from} to ${m.to}`):(isWorldTier(m.from)&&!isWorldTier(m.to)?`Returned to continental competition (${m.to})`:`Relegated from ${m.from} to ${m.to}`);
  event(w,f,up?'promotion':'relegation',text);
  const belt=CONTINENTAL_BELTS.find(b=>w.belts[b].championId===f.id);
  if(belt&&brand)vacateBelt(w,belt,`signs with ${brand}`);
 }
 // A continental Division II can only hold twenty: the weakest veterans leave the circuit.
 for(const r of REGIONS){const D2=regionDivision(r,2);
  while(roster(w,D2).length>DIVISION_SIZE(D2)){const f=roster(w,D2).sort((a,b)=>readiness(a,w.year)-readiness(b,w.year))[0];f.status='retired';f.retiredYear=w.year;record(w,f,'Released from the circuit');event(w,f,'retirement',`Released at age ${ageOf(f,w.year)} as ${D2} was full`);}
 }
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
 // A belt must never travel to another division or remain with a retired athlete.
 for(const belt of [...BRAND_BELTS,...CONTINENTAL_BELTS]){
  const b=belt==='NOVA'||belt==='ONYX'?w.crowns![belt]:w.belts[belt];
  const valid=(id?:string|null)=>{const f=w.fighters.find(x=>x.id===id);return !!f&&f.status==='active'&&f.division===BELT_DIVISION[belt];};
  if(b.interimId&&!valid(b.interimId)){const r=b.interimReigns?.at(-1);if(r&&!r.endYear){r.endYear=w.year;r.endRound=0;}b.interimId=null;}
  if(b.mandatoryId&&!valid(b.mandatoryId))b.mandatoryId=null;
  if(b.championId&&!valid(b.championId)){const holder=w.fighters.find(f=>f.id===b.championId);vacateBelt(w,belt,holder?.status==='retired'?'retires':'leaves the division');}
 }
 // A guaranteed title shot only survives while its holder is still in his brand's S Division.
 if(w.titleShot){const f=w.fighters.find(x=>x.id===w.titleShot!.fighterId);if(!f||f.status!=='active'||f.division!==TOP_DIVISION[w.titleShot.brand])w.titleShot=null;}
 pinChampionForm(w);
 // Star power fades without new achievements.
 for(const f of w.fighters)if(f.status==='active'&&f.fame)f.fame=Math.round(f.fame*.92);
 ensureExact(w);
 anchorPoints(w);
 rankRoster(w);
 inductHallOfFame(w);
 let promos=0,rels=0;
 const before=new Map(d.moves.map(m=>[m.id,m.from]));
 for(const f of w.fighters.filter(x=>x.status==='active')){
  const prior=before.get(f.id),isNew=f.joinedYear===w.year&&f.history.length===0;
  const note=isNew?'New prospect enters the professional circuit':prior&&prior!==f.division?`${prior} → ${f.division}`:`Season ${w.year} begins`;
  if(prior&&prior!==f.division){promos+=tier(f.division)<tier(prior)?1:0;rels+=tier(f.division)>tier(prior)?1:0;}
  record(w,f,note);
 }
 w.lastDraft={year:w.year,moves:d.moves.map(m=>({id:m.id,from:m.from,to:m.to})),retired:d.retired,declined:d.declined};
 w.draft=null;
 // Last entry is the current (as yet unplayed) season.
 w.seasons.push({...summary(w,count,w.fighters.filter(f=>f.retiredYear===w.year).length,promos,rels),fights:0,knockouts:0,submissions:0});
}
/** Annual roster turnover after The Pinnacle. A managed world stops in the Draft Room. */
function transitionYear(w:World,rng:Random):World {
 const retired=closeSeason(w,rng);
 openDraft(w,rng,retired);
 if(!w.manager){autoDraft(w);finishDraft(w,rng);}
 return w;
}
/* Draft Room actions for the interface: each returns a new world. */
export function draftMove(world:World,id:string,to:Division):World{
 const w=cloneWorld(world);const f=w.fighters.find(x=>x.id===id);
 if(!w.draft||!f||!canDraftMove(w,f,to))return world;
 FORM=recentForm(w);mv(w,f,to);return w;
}
/** Let the game complete what the player left open. */
export function draftAuto(world:World):World{
 if(!world.draft)return world;const w=cloneWorld(world);FORM=recentForm(w);autoDraft(w);return w;
}
/** "Promotion done — spawn": only when every division is at its size and no limit is broken. */
export function draftFinish(world:World):World{
 if(!world.draft||!draftStatus(world).ok)return world;
 const w=cloneWorld(world);const rng=new Random(w.rngState);FORM=recentForm(w);finishDraft(w,rng);w.rngState=rng.state;return w;
}
/** Fighter readiness as the Draft Room sees it (results, form and age). */
export function draftReadiness(w:World,f:Fighter){if(!FORM.size)FORM=recentForm(w);return Math.round(readiness(f,w.year)*10)/10;}
/** Older saves had one top tier (S-TIER, GLOBAL D2, one World Crown). Split it into NOVA and ONYX:
    the S Division is dealt alternately (the World Champion opens NOVA's title lineage), Division II tops
    up both S Divisions and then both II Divisions, continental Division I fills the rest, and new
    prospects replace them at the bottom. History keeps the old divisions and the World Crown lineage. */
export function splitIntoBrands(w:World):World{
 if(w.crowns)return w;
 const rng=new Random(w.rngState^0x5f3759df);
 w.crowns={NOVA:emptyBelt(),ONYX:emptyBelt()};w.tag??=emptyTag();w.pinnacle??=[];w.supremacy??=[];w.titleShot=null;w.marquees=null;w.splitYear=w.year;
 w.pendingCard=null;w.pendingFight=null;w.marqueeReservation=null;
 const champ=w.fighters.find(f=>f.id===w.crown.championId&&f.status==='active');
 const old=w.crown.reigns.at(-1);
 if(old&&!old.endYear){old.endYear=w.year;old.endRound=w.round;}
 const prevChamp=w.crown.championId;w.crown.championId=null;w.crown.interimId=null;w.crown.mandatoryId=null;
 const s=roster(w,'S-TIER').sort((a,b)=>(a.id===prevChamp?-1:b.id===prevChamp?1:a.rank-b.rank));
 s.forEach((f,i)=>{f.division=TOP_DIVISION[BRANDS[i%2]];});
 if(champ&&champ.division==='NOVA S'){w.crowns.NOVA.championId=champ.id;w.crowns.NOVA.reigns.push({fighterId:champ.id,startYear:w.year,startRound:w.round,startFightId:old?.startFightId??'',defenses:0,via:'split'});}
 const d2=()=>roster(w,'GLOBAL D2').sort((a,b)=>a.rank-b.rank);
 for(const brand of BRANDS)while(roster(w,TOP_DIVISION[brand]).length<14){const p=d2().find(f=>ageOf(f,w.year)>=24);if(!p)break;p.division=TOP_DIVISION[brand];}
 let turn=0;for(const f of d2()){const brand=BRANDS[turn++%2];if(roster(w,SECOND_DIVISION[brand]).length<14)f.division=SECOND_DIVISION[brand];else f.division=SECOND_DIVISION[BRANDS[turn%2]];}
 const keep=new Set(CONTINENTAL_BELTS.map(b=>w.belts[b].championId).filter((x):x is string=>!!x));
 for(const brand of BRANDS)while(roster(w,SECOND_DIVISION[brand]).length<14){
  const p=REGIONS.flatMap(r=>roster(w,regionDivision(r,1))).filter(f=>!keep.has(f.id)&&ageOf(f,w.year)>=21).sort((a,b)=>b.rankingPoints-a.rankingPoints)[0];if(!p)break;p.division=SECOND_DIVISION[brand];
 }
 for(const r of REGIONS){const d1=regionDivision(r,1),d2r=regionDivision(r,2);
  while(roster(w,d1).length<20){const p=roster(w,d2r).sort((a,b)=>b.rankingPoints-a.rankingPoints)[0];if(!p)break;p.division=d1;}
 }
 const names=new Set(w.fighters.map(f=>f.name));
 const slots=REGIONS.flatMap(r=>Array<Region>(Math.max(0,20-roster(w,regionDivision(r,2)).length)).fill(r));
 const rarities=planRookieRarities(w,rng,slots);
 slots.forEach((r,i)=>{const f=createFighter(rng,w.nextId++,r,regionDivision(r,2),rarities[i],w.year,names,{rookie:true});f.rankingPoints=pointsSeed(f,w.year);w.fighters.push(f);record(w,f,'New prospect enters the professional circuit');});
 for(const f of w.fighters)if(f.status==='active'&&(WORLD_DIVISIONS as readonly Division[]).includes(f.division)){
  const last=f.history.at(-1);if(last)f.history.push({...last,division:f.division,event:`Joins ${f.division} as the brands split`});
 }
 w.events.push({year:w.year,type:'anniversary',fighterId:champ?.id??w.fighters[0].id,description:'NEXUS splits into two brands, NOVA and ONYX, each with its own S Division, Division II and world title'});
 anchorPoints(w);rankRoster(w);pinChampionForm(w);
 return w;
}
/** Copy only what can change. Closed seasons, retired careers and finished tournaments are immutable and shared. */
function cloneWorld(w:World):World{
 return {...w,
  fighters:w.fighters.map(f=>f.status==='retired'?f:structuredClone(f)),
  fights:[...w.fights],ledger:{...w.ledger,[w.year]:[...(w.ledger[w.year]||[])]},keyFights:{...w.keyFights},
  events:[...w.events],seasons:[...w.seasons],awards:[...w.awards],iconicMoments:[...w.iconicMoments],hallOfFame:[...w.hallOfFame],
  tournaments:w.tournaments.map(t=>t.status==='complete'?t:structuredClone(t)),
  lastFightIds:[...w.lastFightIds],lastCardIds:w.lastCardIds&&[...w.lastCardIds],pendingFight:w.pendingFight&&{...w.pendingFight},pendingCard:w.pendingCard&&w.pendingCard.map(p=>({...p})),marqueeReservation:w.marqueeReservation&&{...w.marqueeReservation},marquees:w.marquees&&structuredClone(w.marquees),titleShot:w.titleShot&&{...w.titleShot},
  crowns:w.crowns&&structuredClone(w.crowns),tag:w.tag&&{...w.tag,ratings:{...w.tag.ratings},reigns:w.tag.reigns.map(r=>({...r,fighters:[...r.fighters]})),ties:[...w.tag.ties]},pinnacle:w.pinnacle&&[...w.pinnacle],supremacy:w.supremacy&&[...w.supremacy],
  crown:structuredClone(w.crown),belts:structuredClone(w.belts),beltReservations:w.beltReservations&&structuredClone(w.beltReservations),
  draft:w.draft&&{...w.draft,retired:[...w.draft.retired],applicants:[...w.draft.applicants],declined:[...w.draft.declined],moves:w.draft.moves.map(m=>({...m}))},
  user:w.user&&{...w.user,followed:[...w.user.followed],picks:[...w.user.picks]}};
}
/** The undercard completes now; the headliner remains genuinely unresolved. */
export const hasPendingCard=(w:World)=>!!(w.pendingCard||w.pendingFight);
export function prepareNextEvent(world:World):World {
 if(hasPendingCard(world)||world.activeTournamentId)return world;
 const w=cloneWorld(world);const rng=new Random(w.rngState);
 if(kindAt(w.year,w.round))beginTournament(w,rng);else prepareCircuitRound(w,rng);w.rngState=rng.state;
 return w;
}
/** Fights the prepared card, then moves to the next event. Returns card fight ids, main event first. */
function resolveInPlace(w:World,watch?:ReadonlySet<number>,keep?:Map<string,Fight>):string[] {
 const rng=new Random(w.rngState);
 const ids=settleCard(w,rng,watch);
 // The year may close right after this event (archiving strips the broadcast data), so keep the watched bouts now.
 if(keep&&watch)for(const i of watch){const f=w.fights.find(x=>x.id===ids[i]);if(f)keep.set(f.id,f);}
 finishCircuitRound(w);
 if(w.round>=ROUNDS_PER_YEAR){w.seasons.pop();transitionYear(w,rng);}
 else{
  const last=w.seasons[w.seasons.length-1];
  if(last&&last.year===w.year)w.seasons[w.seasons.length-1]=summary(w,last.newcomers,last.retirements,last.promotions,last.relegations);
 }
 w.rngState=rng.state;return ids;
}
/** Runs the prepared event. `watch` lists card positions the player chose to simulate live. */
export function resolveCurrentEvent(world:World,watch:number[]=[0]):{world:World;fightId:string|null;fightIds:string[];cardIds:string[];watched:Fight[]} {
 const w=cloneWorld(world);const card=w.pendingCard??(w.pendingFight?[w.pendingFight]:[]);
 const mainIsReal=!!w.pendingFight&&card.length>0;
 const keep=new Map<string,Fight>();
 const ids=resolveInPlace(w,new Set(watch),keep);
 const fightIds=watch.slice().sort((a,b)=>b-a).map(i=>ids[i]).filter(Boolean);
 return {world:w,fightId:mainIsReal?ids[0]||null:null,fightIds,cardIds:ids.filter(Boolean),watched:fightIds.map(id=>keep.get(id)).filter((f):f is Fight=>!!f)};
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
 // Fast simulation through an open Draft Room: the game decides as brand manager.
 if(w.draft){const rng=new Random(w.rngState);FORM=recentForm(w);autoDraft(w);finishDraft(w,rng);w.rngState=rng.state;return;}
 if(w.activeTournamentId||kindAt(w.year,w.round)&&!hasPendingCard(w)){
  const rng=new Random(w.rngState);
  if(!w.activeTournamentId)beginTournament(w,rng);
  finishTournament(w,rng);w.rngState=rng.state;
  const last=w.seasons.at(-1);
  if(last&&last.year===w.year)w.seasons[w.seasons.length-1]=summary(w,last.newcomers,last.retirements,last.promotions,last.relegations);
  return;
 }
 if(!hasPendingCard(w)){const rng=new Random(w.rngState);prepareCircuitRound(w,rng);w.rngState=rng.state;}
 resolveInPlace(w,new Set());
}
/** Skips every event up to the next big event of a month, then prepares it (or opens its tournament). */
export function advanceToBigEvent(world:World):World{
 const w=cloneWorld(world);
 if(w.activeTournamentId){const rng=new Random(w.rngState);finishTournament(w,rng);w.rngState=rng.state;refreshSeason(w);}
 // Already standing on an unplayed big event: play it and go to next month's.
 if(isBigEvent(w.round)&&hasPendingCard(w))advanceInPlace(w);
 let guard=0;
 while(!isBigEvent(w.round)&&guard++<ROUNDS_PER_YEAR)advanceInPlace(w);
 const rng=new Random(w.rngState);
 if(kindAt(w.year,w.round))beginTournament(w,rng);else if(!hasPendingCard(w))prepareCircuitRound(w,rng);
 w.rngState=rng.state;return w;
}
export function advanceRound(world:World):World {
 const w=cloneWorld(world);advanceInPlace(w);return w;
}
export function advanceYear(world:World):World {
 const w=cloneWorld(world),target=w.year+1;
 while(w.year<target)advanceInPlace(w);
 return w;
}
function tier(d:Division) {return isTopDivision(d)?0:isSecondDivision(d)?1:d.endsWith('D1')?2:3;}
export function advanceYears(w:World,n:number):World {const state=cloneWorld(w),target=state.year+n;while(state.year<target)advanceInPlace(state);return state;}
/** Structural check for v0.6–v0.8 saves (pre-ledger), used by the migration chain. */
function validateLegacyWorld(x:unknown):x is World {
 if(!x||typeof x!=='object')return false;const w=x as World;
 return (x as {version?:string}).version==='0.6.0'&&Array.isArray(w.iconicMoments)&&Array.isArray(w.awards)&&Array.isArray(w.hallOfFame)&&Array.isArray(w.tournaments)&&
 (w.activeTournamentId===null||typeof w.activeTournamentId==='string')&&Number.isInteger(w.round)&&w.round>=0&&w.round<60&&
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
/** A v1.6 save may be sitting on a prepared doubles card made of two 1v1 legs.
    Rebuild those two slots as one 2v2 match without wiping the card or the save. */
function upgradePendingNationalTeams(w:World){
 const card=w.pendingCard;
 if(!card?.some(p=>p.tag&&!Array.isArray(p.tag.teamA)))return;
 const output:typeof card=[];const seen=new Set<string>();
 for(const p of card){
  const legacy=p.tag&&!Array.isArray(p.tag.teamA)?p.tag:null;
  if(!legacy){output.push(p);continue;}
  if(seen.has(legacy.tie))continue;
  seen.add(legacy.tie);
  const matching=card.filter(q=>q.tag?.tie===legacy.tie);
  const squadA=matching.map(m=>m.fighterA);
  const squadB=matching.map(m=>m.fighterB);
  // The second leg is normally present. If an old save only persisted one,
  // select a fit partner from the same country rather than inventing a fighter.
  for(const [country,ids] of [[legacy.a,squadA],[legacy.b,squadB]] as const){
   if(ids.length<2){const teammate=w.fighters.find(f=>f.country===country&&f.status==='active'&&!ids.includes(f.id));if(teammate)ids.push(teammate.id);}
  }
  if(squadA.length<2||squadB.length<2)continue;
  output.push({...p,titleFight:false,tag:{tie:legacy.tie,a:legacy.a,b:legacy.b,teamA:[squadA[0],squadA[1]],teamB:[squadB[0],squadB[1]],title:legacy.title}});
 }
 w.pendingCard=output;w.pendingFight=output[0]??null;
}
/** Fill in structures added after a save was written (belts, player state). */
function ensureCurrent(w:World):World{
 w.belts??=emptyBelts();w.beltReservations??=null;
 w.user??={followed:[],picks:[],pendingPick:null};
 splitIntoBrands(w);
 w.tag??=emptyTag();w.pinnacle??=[];w.supremacy??=[];
 upgradePendingNationalTeams(w);
 // Played saves are managed: the player runs the offseason Draft Room.
 w.manager??=true;w.draft??=null;
 for(const b of [w.crown,...Object.values(w.crowns!),...Object.values(w.belts)]){b.interimId??=null;b.interimReigns??=[];b.mandatoryId??=null;}
 for(const f of w.fighters)if(f.status==='active')f.shape=clamp(f.shape,-FORM_MAX,FORM_MAX);
 for(const f of w.fighters){const country=countryNamed(f.country);if(country)f.flag=country.flag;}
 pinChampionForm(w);
 return w;
}
/* ───────────── 60 → 48 event calendar ─────────────
   Old months had four circuit cards and a big event; new months have three and a big event.
   Every stored calendar position (round, fight and ledger event index, reign boundaries,
   injury clocks) is mapped: big event → big event, fourth circuit card → third. */
const OLD_WEEKS=5,OLD_YEAR=60;
const mapRound=(r:number)=>{const m=Math.floor(r/OLD_WEEKS),wk=r%OLD_WEEKS;return m*4+(wk===4?3:Math.min(wk,2));};
const mapIndex=(i:number|undefined)=>i?mapRound(i-1)+1:i;
const mapClock=(v:number)=>v?Math.floor(v/OLD_YEAR)*ROUNDS_PER_YEAR+mapRound(v%OLD_YEAR):v;
function convertCalendar(w:World):World{
 if(w.calendar===48)return w;
 w.round=mapRound(Math.min(w.round,OLD_YEAR-1));
 for(const f of w.fighters)f.injuryUntil=mapClock(f.injuryUntil||0);
 for(const f of w.fights)f.roundIndex=mapIndex(f.roundIndex)!;
 for(const list of Object.values(w.keyFights||{}))for(const f of list)f.roundIndex=mapIndex(f.roundIndex)!;
 for(const list of Object.values(w.ledger||{}))for(const e of list)e.e=mapIndex(e.e)!;
 for(const b of [w.crown,...Object.values(w.belts||{})])for(const r of [...(b.reigns||[]),...(b.interimReigns||[])]){r.startRound=mapIndex(r.startRound)!;if(r.endRound)r.endRound=mapIndex(r.endRound);}
 if(w.pendingFight)w.pendingFight.roundIndex=w.round;
 if(w.user)w.user.pendingPick=null;
 w.calendar=48;return w;
}
export function upgradeWorld(raw:unknown):World|null {
 if(validateWorld(raw))return ensureCurrent(convertCalendar(raw));
 if(validateLegacyWorld(raw))return ensureCurrent(convertCalendar(initializeLegacy(migrateToLedger(raw))));
 const migrated=migrateV05(raw)||migrateV04(raw)||migrateV03(raw)||migrateV02(raw)||migrateLegacy(raw);
 return migrated?ensureCurrent(convertCalendar(initializeLegacy(migrateToLedger(migrated)))):null;
}
export function loadWorld():World {try{
 for(const key of [STORAGE_KEY,V05_STORAGE_KEY,V04_STORAGE_KEY,PREVIOUS_STORAGE_KEY,OLD_STORAGE_KEY,LEGACY_STORAGE_KEY]){
  const data=localStorage.getItem(key);if(!data)continue;
  const imported=upgradeWorld(JSON.parse(data));if(imported)return imported;
 }
}catch{/* Storage disabled or corrupted */}return createManagedWorld();}
/** A new universe the player runs: the season stops in the Draft Room every offseason. */
export function createManagedWorld(seed?:number):World{return {...createWorld(seed),manager:true};}

export function exportWorld(w:World){const blob=new Blob([JSON.stringify(w)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`nexus-chronicle-${w.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
