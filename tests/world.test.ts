import {describe,expect,it} from 'vitest';
import {advanceRound,advanceYear,advanceYears,createWorld,prepareNextEvent,resolveCurrentEvent,resolveTournamentAction,resolveTournamentStage,upgradeWorld,validateWorld,migrateV05} from '../src/engine/world';
import {CALENDAR,ROUNDS_PER_YEAR,CLOCK} from '../src/engine/competition';
import {kindAt} from '../src/engine/tournaments';
import {abilitiesOf,ageOf,baseOf,overallOf} from '../src/engine/career';
import {simulateCombat,styleAdvantage} from '../src/engine/combat';
import {Random} from '../src/engine/random';
import {DIVISIONS,STYLES,SKILLS,REGIONS,REGION_DIVISIONS} from '../src/engine/constants';
import {buildLegacyView} from '../src/engine/legacy';
import {findLedger,ledgerCount,ledgerFor,LF,isWorldTitle} from '../src/engine/archive';
import {CONTINENTAL_BELTS,BELT_DIVISION,protectedChampions} from '../src/engine/belts';
import type {World} from '../src/engine/types';

const active=(w:World)=>w.fighters.filter(f=>f.status==='active');
function rosterInvariant(w:World){
 expect(validateWorld(w)).toBe(true);
 expect(active(w)).toHaveLength(200);
 for(const d of DIVISIONS){const list=active(w).filter(f=>f.division===d);expect(list,`${w.year} ${d}`).toHaveLength(20);expect(new Set(list.map(f=>f.rank)).size).toBe(20);}
 for(const r of REGIONS)for(const d of REGION_DIVISIONS[r])expect(active(w).filter(f=>f.division===d).every(f=>f.region===r)).toBe(true);
 expect(active(w).filter(f=>f.division==='S-TIER').every(f=>ageOf(f,w.year)>=24)).toBe(true);
 expect(w.crown.championId===null||active(w).some(f=>f.id===w.crown.championId&&f.division==='S-TIER')).toBe(true);
 expect(new Set(w.fighters.map(f=>f.id)).size).toBe(w.fighters.length);
}

describe('NEXUS v0.6 — calendar, medical system, title longevity and rarity',()=>{
 it('sets four events every month: three circuit cards, then the big event',()=>{
  expect(ROUNDS_PER_YEAR).toBe(48);
  expect(CALENDAR).toHaveLength(48);
  for(let m=0;m<12;m++){
   const cards=CALENDAR.slice(m*4,m*4+4);
   expect(cards.slice(0,3).every(c=>c.kind==='circuit')).toBe(true);
   expect(cards[3].kind).toBe('major');
   expect(new Set(cards.map(c=>c.month)).size).toBe(1);
  }
  expect(CALENDAR[11].name).toBe('FIGHTOPIA');
  expect(CALENDAR[23].name).toBe('FAULTLINE');
  expect(CALENDAR[47].name).toBe('THE PINNACLE');
  expect(kindAt(2058,27)).toBe('SURGE');
  expect(kindAt(2058,31)).toBe(null);
  expect(kindAt(2060,31)).toBe('OLYMPIAD');
  expect(kindAt(2058,43)).toBe('CRUCIBLE');
 });
 it('generates 200 distinct careers, six development patterns, nine centered skills',()=>{
  const w=createWorld(41);rosterInvariant(w);
  expect(new Set(w.fighters.map(f=>f.name)).size).toBe(200);
  expect(new Set(w.fighters.map(f=>f.style)).size).toBe(STYLES.length);
  for(const f of w.fighters.slice(0,20)){
   expect(overallOf(f,w.year)).toBe(baseOf(f,w.year)+f.shape);
   expect(SKILLS.reduce((sum,k)=>sum+abilitiesOf(f,w.year)[k],0)).toBe(9*overallOf(f,w.year));
  }
 });
 it('prepares an unplayed headliner and makes watch/skip exactly deterministic',()=>{
  const w=createWorld(331),orig=JSON.stringify(w);
  const prepared=prepareNextEvent(w);expect(JSON.stringify(w)).toBe(orig);
  expect(prepared.pendingFight).not.toBeNull();
  const pending=prepared.pendingFight!;
  expect(prepared.fights.every(f=>f.fighterA!==pending.fighterA&&f.fighterB!==pending.fighterA)).toBe(true);
  expect(prepareNextEvent(prepared)).toBe(prepared);
  const a=resolveCurrentEvent(prepared),b=resolveCurrentEvent(JSON.parse(JSON.stringify(prepared)) as World);
  expect(a).toEqual(b);expect(a.world.round).toBe(1);
  expect(a.world.fights.find(f=>f.id===a.fightId)).toBeDefined();
 });
 it('inaugurates the Crown at Fightopia and defends at Faultline and The Pinnacle',()=>{
  let w=createWorld(88);
  for(let i=0;i<11;i++)w=advanceRound(w);
  expect(w.round).toBe(11);expect(w.crown.championId).toBeNull();
  w=prepareNextEvent(w);expect(w.pendingFight?.titleFight).toBe(true);
  w=resolveCurrentEvent(w).world;
  expect(w.crown.reigns).toHaveLength(1);
  expect(w.crown.reigns[0].startFightId).toBe(w.fights.find(f=>f.titleChange&&f.belt==='WORLD')?.id);
  for(let i=12;i<48;i++)w=advanceRound(w);
  expect(w.year).toBe(2059);expect(w.round).toBe(0);
  expect(w.ledger[2058].filter(isWorldTitle).map(e=>e.e)).toEqual([12,24,48]);
  expect(ledgerFor(w,e=>isWorldTitle(e)&&!!(e.f&LF.CHANGE)).length).toBe(w.crown.reigns.filter(r=>!r.via).length);
  // Title fights stay in detail after the season closes; minute-by-minute data does not.
  expect(w.keyFights[2058].filter(f=>f.titleFight&&f.belt==='WORLD')).toHaveLength(3);
  expect(w.keyFights[2058].every(f=>f.rounds.every(r=>!r.timeline))).toBe(true);
  expect(w.fights).toHaveLength(0);
  rosterInvariant(w);
 });
 it('gives about one standard circuit appearance per medically available fighter per month',()=>{
  const w=advanceYear(createWorld(120));
  const bouts=w.ledger[2058].filter(e=>!e.t);
  expect(bouts.length).toBeGreaterThan(950);expect(bouts.length).toBeLessThan(1300);
  for(let month=0;month<12;month++){
   const monthBouts=bouts.filter(e=>Math.floor((e.e-1)/4)===month);
   expect(monthBouts.length).toBeGreaterThan(65);
   expect(monthBouts.length).toBeLessThanOrEqual(115);
  }
  for(const f of w.fighters.filter(f=>f.joinedYear===2058)){
   const count=bouts.filter(b=>b.a===f.id||b.b===f.id).length;
   expect(count).toBeLessThanOrEqual(15); // Injury exemptions and occasional makeup fights.
  }
 });
 it('links medical suspensions to real injuries and measures them in weeks',()=>{
  let w=advanceYears(createWorld(87),2);for(let i=0;i<47;i++)w=advanceRound(w);
  const injured=w.fights.filter(f=>f.injuries?.length);
  expect(injured.length).toBeGreaterThan(20);
  for(const bout of injured){
   for(const injury of bout.injuries||[]){
    expect(bout.injuredIds).toContain(injury.fighterId);
    expect(injury.weeks).toBeGreaterThanOrEqual(2);
    expect(injury.weeks).toBeLessThanOrEqual(13);
    expect(['minor','moderate','major']).toContain(injury.severity);
    expect(injury.diagnosis.length).toBeGreaterThan(5);
   }
  }
  const allInjuries=injured.flatMap(b=>b.injuries!.map(i=>({bout:b,injury:i})));
  expect(allInjuries.filter(x=>x.bout.winnerId!==x.injury.fighterId).length/allInjuries.length).toBeGreaterThan(.85);
 });
 it('keeps all twelve style interactions antisymmetric and fight outcomes seeded',()=>{
  const w=createWorld(31),a=w.fighters[0],b=w.fighters[2];
  expect(simulateCombat(a,b,w.year,new Random(997))).toEqual(simulateCombat(a,b,w.year,new Random(997)));
  for(const style of STYLES)for(const other of STYLES)expect(Math.abs(styleAdvantage(style,other)+styleAdvantage(other,style))).toBeLessThan(0.000001);
 });
 it('runs 15-match Crucibles, annual Surges and quadrennial 39-match Olympiads',()=>{
  const w=advanceYears(createWorld(331),3);
  const g=w.tournaments.filter(t=>t.kind==='CRUCIBLE');expect(g).toHaveLength(3);
  expect(g.every(t=>t.matches.length===15&&t.status==='complete')).toBe(true);
  const r=w.tournaments.filter(t=>t.kind==='SURGE');expect(r).toHaveLength(3);
  expect(r.every(t=>t.surgeMoments?.filter(m=>m.entrantId).length===20&&t.surgeMoments?.filter(m=>m.eliminatedId).length===19)).toBe(true);
  const o=w.tournaments.filter(t=>t.kind==='OLYMPIAD');expect(o).toHaveLength(1);
  expect(o[0].matches).toHaveLength(39);expect(o[0].participants).toHaveLength(40);
  expect(o[0].matches.filter(m=>m.stage==='Prelim')).toHaveLength(8);
 });
 it('does not reveal tournament future bracket results before advancing',()=>{
  let w=createWorld(45);for(let i=0;i<43;i++)w=advanceRound(w);
  w=prepareNextEvent(w);const gp=w.tournaments.at(-1)!;
  expect(gp.kind).toBe('CRUCIBLE');expect(gp.matches).toHaveLength(12);
  expect(gp.matches.every(m=>!m.fightId)).toBe(true);
  const a=resolveTournamentAction(w),b=resolveTournamentAction(JSON.parse(JSON.stringify(w)) as World);
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(a.world.tournaments.at(-1)?.winnerId).toBeNull();
  const next=resolveTournamentStage(a.world);
  expect(next.tournaments.at(-1)?.stage).toBe(1);
 });
 it('maintains histories and championship rarity ledger for decades',()=>{
  for(const seed of [35,87]){
   const w=advanceYears(createWorld(seed),20);rosterInvariant(w);
   expect(ledgerCount(w)).toBeGreaterThan(19500);
   const view=buildLegacyView(w);
   expect(view.fighters.length).toBe(w.fighters.length);
   expect(w.crown.reigns.length).toBeGreaterThan(8);
   expect(w.crown.reigns.every(r=>{const e=findLedger(w,r.startFightId);return !!e&&e.w===r.fighterId&&(r.via==='interim'||!!(e.f&LF.CHANGE));})).toBe(true);
   expect(ledgerFor(w,e=>!!(e.f&LF.UPSET)).length).toBeGreaterThan(500);
   // Twenty seasons stay small: every bout survives as a compact ledger row.
   expect(JSON.stringify(w).length).toBeLessThan(12_000_000);
   expect(w.events.filter(e=>e.type==='injury').length).toBeGreaterThan(200);
   expect(w.awards.length).toBe(20);
   expect(w.tournaments.filter(t=>t.status==='complete').length).toBe(45);
   const byRarity=new Map<string,number>();for(const r of w.crown.reigns){const f=w.fighters.find(f=>f.id===r.fighterId)!;byRarity.set(f.rarity,(byRarity.get(f.rarity)||0)+1);}
   expect([...byRarity.values()].reduce((a,b)=>a+b,0)).toBe(w.crown.reigns.length);
  }
 });
 it('migrates older saved worlds without changing historical winners',()=>{
  const w=advanceRound(createWorld(81));const raw=JSON.parse(JSON.stringify(w));
  raw.version='0.5.0';raw.round=0;raw.fights.forEach((f:{roundIndex:number})=>f.roundIndex=1);
  delete raw.ledger;delete raw.keyFights;delete raw.calendar;
  const migrated=upgradeWorld(raw)!;
  expect(validateWorld(migrated)).toBe(true);
  expect(migrated.round).toBe(3);
  expect(migrated.fights.map(f=>f.winnerId)).toEqual(w.fights.map(f=>f.winnerId));
  expect(migrated.ledger[2058].map(e=>e.w)).toEqual(w.fights.map(f=>f.winnerId));
  expect(migrateV05(raw)).not.toBeNull();
  expect(upgradeWorld(w)).toBe(w);
 });
 it('does not mutate the input, including the RNG stream when advancing a season',()=>{
  const w=createWorld(75),saved=JSON.stringify(w);
  const a=advanceYears(w,2),b=advanceYears(JSON.parse(saved) as World,2);
  expect(JSON.stringify(w)).toBe(saved);
  expect(a).toEqual(b);
  expect(CLOCK(a.year,a.round)).toBe(CLOCK(2060,0));
 });
});


describe('NEXUS v0.7 — broadcast timeline compatibility',()=>{
 it('records real chronological exchanges without affecting official bout data',()=>{
  const w=createWorld(77077),a=w.fighters[0],b=w.fighters[21];
  const first=simulateCombat(a,b,w.year,new Random(99117),3,{record:true});
  const second=simulateCombat(a,b,w.year,new Random(99117),3,{record:true});
  expect(first).toEqual(second);
  for(const round of first.rounds){
   expect(round.timeline?.length).toBeGreaterThan(0);
   for(let i=1;i<(round.timeline?.length||0);i++)expect(round.timeline![i].elapsed).toBeGreaterThanOrEqual(round.timeline![i-1].elapsed);
   const last=round.timeline!.at(-1)!;
   expect(last.sa.map(Math.round)).toEqual(round.a);
   expect(last.sb.map(Math.round)).toEqual(round.b);
   for(const beat of round.timeline!)for(const act of beat.acts)expect(['strike','grapple','sub','impact','finish']).toContain(act.c);
  }
 });
 it('retains old-world save compatibility with optional minute timelines',()=>{
  const world=createWorld(10012);
  const advanced=advanceYear(world);
  for(const bout of advanced.fights)for(const round of bout.rounds)delete round.timeline;
  const restored=upgradeWorld(JSON.parse(JSON.stringify(advanced)));
  expect(restored).not.toBeNull();
  expect(restored?.fights).toHaveLength(advanced.fights.length);
  expect(restored?.version).toBe('0.9.0');
 });
});

describe('NEXUS v0.9 — combat engine and archive',()=>{
 it('recording the broadcast never changes the result',()=>{
  const w=createWorld(4242);
  for(let i=0;i<40;i++){
   const a=w.fighters[i],b=w.fighters[199-i];
   const plain=simulateCombat(a,b,w.year,new Random(1000+i),i%2?3:5);
   const recorded=simulateCombat(a,b,w.year,new Random(1000+i),i%2?3:5,{record:true});
   expect(recorded.winnerId).toBe(plain.winnerId);expect(recorded.method).toBe(plain.method);
   expect(recorded.statsA).toEqual(plain.statsA);expect(recorded.statsB).toEqual(plain.statsB);
   expect(recorded.rounds.map(r=>r.cards)).toEqual(plain.rounds.map(r=>r.cards));
  }
 });
 it('keeps fight statistics coherent and decides with three judges',()=>{
  const w=createWorld(31337);const methods=new Set<string>();
  for(let i=0;i<400;i++){
   const r=simulateCombat(w.fighters[i%200],w.fighters[(i*7+3)%200],w.year,new Random(i+1),3);
   if(w.fighters[i%200].id===w.fighters[(i*7+3)%200].id)continue;
   methods.add(r.method);
   for(const s of [r.statsA,r.statsB]){expect(s[1]).toBeLessThanOrEqual(s[0]);expect(s[3]).toBeLessThanOrEqual(s[2]);expect(s[7]).toBeLessThanOrEqual(s[6]);expect(s[3]).toBeLessThanOrEqual(s[1]);}
   const stopped=['KO','TKO','SUB'].includes(r.method);
   r.rounds.forEach((round,i)=>{if(stopped&&i===r.rounds.length-1)expect(round.cards).toBeUndefined();else expect(round.cards).toHaveLength(3);});
  }
  for(const m of ['KO','TKO','SUB','UD','SD'])expect(methods.has(m)).toBe(true);
 });
 it('lets no prospect retire young and records career statistics',()=>{
  const w=advanceYears(createWorld(2468),8);
  const young=w.fighters.filter(f=>f.status==='retired'&&ageOf(f,f.retiredYear!)<30);
  expect(young).toHaveLength(0);
  const veteran=w.fighters.find(f=>f.status==='active'&&(f.career?.fights||0)>20)!;
  expect(veteran.career!.s[1]).toBeGreaterThan(0);
  expect(veteran.career!.seconds).toBeGreaterThan(0);
 });
});

describe('NEXUS v0.9 — belts and title schedule',()=>{
 it('stages World Crown fights every March, June and December and never puts a champion in a non-title bout',()=>{
  const w=advanceYears(createWorld(1357),12);
  for(let y=2058;y<2070;y++){
   const titles=w.ledger[y].filter(isWorldTitle);
   expect(titles.length,`${y}`).toBeGreaterThanOrEqual(2);
   expect(titles.every(e=>[12,24,48].includes(e.e)),`${y}`).toBe(true);
  }
  // Holding any belt means fighting only for belts (tournaments aside).
  const holding=(id:string,y:number,e:number)=>[w.crown,...Object.values(w.belts)].some(b=>b.reigns.some(r=>r.fighterId===id&&(r.startYear<y||r.startYear===y&&r.startRound<e)&&(r.endYear===undefined||r.endYear>y||r.endYear===y&&(r.endRound??0)>e)));
  const offenders=ledgerFor(w,e=>!e.t&&!(e.f&LF.TITLE)&&(holding(e.a,e.y,e.e)||holding(e.b,e.y,e.e)));
  expect(offenders).toHaveLength(0);
 });
 it('crowns continental champions on title nights and promotes them at season end',()=>{
  const w=advanceYears(createWorld(97),6);rosterInvariant(w);
  for(const belt of CONTINENTAL_BELTS){
   const b=w.belts[belt];
   expect(b.reigns.length,belt).toBeGreaterThan(0);
   const nights=ledgerFor(w,e=>e.bt===belt);
   expect(nights.every(e=>[7,19,31,43].includes(e.e)&&e.d===BELT_DIVISION[belt])).toBe(true);
   if(b.championId){const holder=w.fighters.find(f=>f.id===b.championId)!;expect(holder.division).toBe(BELT_DIVISION[belt]);}
  }
  expect(w.events.some(e=>e.type==='vacancy'&&e.description.includes('promoted to the global circuit'))).toBe(true);
  expect(w.events.some(e=>e.type==='eliminator')).toBe(true);
  for(const id of protectedChampions(w))expect(w.fighters.find(f=>f.id===id)!.status).toBe('active');
 });
});
