import {describe,expect,it} from 'vitest';
import {draftAuto,draftFinish,draftMove,draftStatus,draftTargets,canDraftMove,recommendBrand,hasPendingCard,advanceToBigEvent,advanceRound,advanceYear,advanceYears,createWorld,prepareNextEvent,resolveCurrentEvent,resolveTournamentAction,resolveTournamentStage,upgradeWorld,validateWorld,migrateV05} from '../src/engine/world';
import {CALENDAR,ROUNDS_PER_YEAR,CLOCK} from '../src/engine/competition';
import {kindAt} from '../src/engine/tournaments';
import {abilitiesOf,ageOf,baseOf,overallOf} from '../src/engine/career';
import {simulateCombat,styleAdvantage} from '../src/engine/combat';
import {Random} from '../src/engine/random';
import {DIVISIONS,STYLES,SKILLS,REGIONS,REGION_DIVISIONS,ACTIVE_FIGHTERS,DIVISION_SIZE,BRANDS,TOP_DIVISION,isTopDivision,isWorldTier} from '../src/engine/constants';
import {buildLegacyView} from '../src/engine/legacy';
import {findLedger,ledgerCount,ledgerFor,LF,isWorldTitle} from '../src/engine/archive';
import {CONTINENTAL_BELTS,BELT_DIVISION,protectedChampions,topReigns,titleBrandAt,WORLD_TITLE_ROUNDS,isBrandBelt} from '../src/engine/belts';
import type {World} from '../src/engine/types';

const active=(w:World)=>w.fighters.filter(f=>f.status==='active');
function rosterInvariant(w:World){
 expect(validateWorld(w)).toBe(true);
 expect(active(w)).toHaveLength(ACTIVE_FIGHTERS);
 for(const d of DIVISIONS){const n=DIVISION_SIZE(d),list=active(w).filter(f=>f.division===d);expect(list,`${w.year} ${d}`).toHaveLength(n);expect(new Set(list.map(f=>f.rank)).size).toBe(n);}
 for(const r of REGIONS)for(const d of REGION_DIVISIONS[r])expect(active(w).filter(f=>f.division===d).every(f=>f.region===r)).toBe(true);
 expect(active(w).filter(f=>isTopDivision(f.division)).every(f=>ageOf(f,w.year)>=24)).toBe(true);
 for(const b of BRANDS){const c=w.crowns![b].championId;expect(c===null||active(w).some(f=>f.id===c&&f.division===TOP_DIVISION[b])).toBe(true);}
 if(w.titleShot)expect(active(w).find(f=>f.id===w.titleShot!.fighterId)?.division).toBe(TOP_DIVISION[w.titleShot.brand]);
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
  expect(CALENDAR[3].name).toBe('ORIGIN');
  expect(CALENDAR[23].name).toBe('COLLISION');
  expect(CALENDAR[47].name).toBe('THE PINNACLE');
  expect(kindAt(2058,15)).toBe('SURGE');
  expect(kindAt(2058,31)).toBe('CRUCIBLE');
  expect(kindAt(2060,31)).toBe('OLYMPIAD');
  expect(kindAt(2058,43)).toBe(null);
  // Four title nights per brand, alternating months, none in April, June, August or December.
  expect(WORLD_TITLE_ROUNDS.map(titleBrandAt)).toEqual(['NOVA','ONYX','NOVA','ONYX','NOVA','ONYX','NOVA','ONYX']);
  expect(WORLD_TITLE_ROUNDS).toEqual([3,7,11,19,27,35,39,43]);
 });
 it('generates 216 distinct careers, six development patterns, nine centered skills',()=>{
  const w=createWorld(41);rosterInvariant(w);
  expect(new Set(w.fighters.map(f=>f.name)).size).toBe(ACTIVE_FIGHTERS);
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
 it('crowns NOVA at Origin, alternates brand title nights and closes the year at The Pinnacle',()=>{
  let w=createWorld(88);
  for(let i=0;i<3;i++)w=advanceRound(w);
  expect(w.round).toBe(3);expect(w.crowns!.NOVA.championId).toBeNull();
  w=prepareNextEvent(w);expect(w.pendingFight?.titleFight).toBe(true);expect(w.pendingFight?.belt).toBe('NOVA');
  // The other brand books an eliminator on the same night.
  expect(w.pendingCard?.[1]?.kind).toBe('eliminator');
  w=resolveCurrentEvent(w).world;
  expect(w.crowns!.NOVA.reigns).toHaveLength(1);
  expect(w.crowns!.NOVA.reigns[0].startFightId).toBe(w.fights.find(f=>f.titleChange&&f.belt==='NOVA')?.id);
  for(let i=4;i<48;i++)w=advanceRound(w);
  expect(w.year).toBe(2059);expect(w.round).toBe(0);
  expect(w.ledger[2058].filter(isWorldTitle).map(e=>`${e.e}:${e.bt}`)).toEqual(['4:NOVA','8:ONYX','12:NOVA','20:ONYX','28:NOVA','36:ONYX','40:NOVA','44:ONYX']);
  expect(ledgerFor(w,e=>isWorldTitle(e)&&!!(e.f&LF.CHANGE)).length).toBe(topReigns(w).filter(r=>!r.via).length);
  // The Pinnacle: one unifier between the brand champions and one title-shot contract.
  const pinnacle=w.ledger[2058].filter(e=>e.e===48&&!!(e.f&LF.PINNACLE));
  expect(pinnacle).toHaveLength(1);
  expect(w.pinnacle?.[0]?.year).toBe(2058);
  expect(w.ledger[2058].filter(e=>e.e===48&&!!(e.f&LF.CONTRACT))).toHaveLength(1);
  expect(w.supremacy?.[0]?.table.length).toBe(4);
  // Title fights stay in detail after the season closes; minute-by-minute data does not.
  expect(w.keyFights[2058].filter(f=>f.titleFight&&isBrandBelt(f.belt))).toHaveLength(8);
  expect(w.keyFights[2058].every(f=>f.rounds.every(r=>!r.timeline))).toBe(true);
  expect(w.fights).toHaveLength(0);
  rosterInvariant(w);
 });
 it('plays back every watched fight of The Pinnacle, even across the year change',()=>{
  let w=createWorld(9);for(let i=0;i<12&&!(w.round===47&&w.pendingCard);i++)w=advanceToBigEvent(w);
  expect(w.round).toBe(47);
  const r=resolveCurrentEvent(w,[0,1]);
  expect(r.world.year).toBe(2059);
  expect(r.watched).toHaveLength(2);
  expect(r.watched.every(f=>f.rounds.every(x=>x.timeline?.length))).toBe(true);
 });
 it('runs a country doubles ranking and crowns a nation in June',()=>{
  const w=advanceYear(createWorld(512));
  const tag=w.tag!;
  expect(tag.ties.filter(t=>t.year===2058&&!t.title).length).toBeGreaterThan(15);
  const crown=tag.ties.filter(t=>t.title);expect(crown.map(t=>t.round)).toEqual([23,47]);
  for(const t of tag.ties){expect(t.legs).toHaveLength(2);for(const l of t.legs){
   expect(w.fighters.find(f=>f.id===l.a)!.country).toBe(t.a);expect(w.fighters.find(f=>f.id===l.b)!.country).toBe(t.b);}}
  expect(tag.champion).not.toBeNull();
  expect(tag.reigns.at(-1)!.country).toBe(tag.champion);
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
 it('runs 15-match Crucibles, annual Surges and a 39-match Olympiad in place of the Crucible',()=>{
  const w=advanceYears(createWorld(331),3);
  const g=w.tournaments.filter(t=>t.kind==='CRUCIBLE');expect(g).toHaveLength(2);
  expect(g.every(t=>t.matches.length===15&&t.status==='complete')).toBe(true);
  const r=w.tournaments.filter(t=>t.kind==='SURGE');expect(r).toHaveLength(3);
  expect(r.every(t=>t.surgeMoments?.filter(m=>m.entrantId).length===20&&t.surgeMoments?.filter(m=>m.eliminatedId).length===19)).toBe(true);
  const o=w.tournaments.filter(t=>t.kind==='OLYMPIAD');expect(o).toHaveLength(1);
  expect(o[0].matches).toHaveLength(39);expect(o[0].participants).toHaveLength(40);
  expect(o[0].matches.filter(m=>m.stage==='Prelim')).toHaveLength(8);
 });
 it('does not reveal tournament future bracket results before advancing',()=>{
  let w=createWorld(45);for(let i=0;i<31;i++)w=advanceRound(w);
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
   const reigns=topReigns(w);
   expect(reigns.length).toBeGreaterThan(8);
   expect(w.pinnacle?.length).toBeGreaterThanOrEqual(18);
   expect(reigns.every(r=>{const e=findLedger(w,r.startFightId);return !!e&&e.w===r.fighterId&&(r.via==='interim'||!!(e.f&LF.CHANGE));})).toBe(true);
   expect(ledgerFor(w,e=>!!(e.f&LF.UPSET)).length).toBeGreaterThan(500);
   // Twenty seasons stay small: every bout survives as a compact ledger row.
   expect(JSON.stringify(w).length).toBeLessThan(12_000_000);
   expect(w.events.filter(e=>e.type==='injury').length).toBeGreaterThan(200);
   expect(w.awards.length).toBe(20);
   expect(w.tournaments.filter(t=>t.status==='complete').length).toBe(40);
   const byRarity=new Map<string,number>();for(const r of reigns){const f=w.fighters.find(f=>f.id===r.fighterId)!;byRarity.set(f.rarity,(byRarity.get(f.rarity)||0)+1);}
   expect([...byRarity.values()].reduce((a,b)=>a+b,0)).toBe(reigns.length);
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
 it('stages each brand title on its own nights and never puts a champion in a non-title bout',()=>{
  const w=advanceYears(createWorld(1357),12);
  for(let y=2058;y<2070;y++){
   const titles=w.ledger[y].filter(isWorldTitle);
   expect(titles.length,`${y}`).toBeGreaterThanOrEqual(6);
   expect(titles.every(e=>titleBrandAt(e.e-1)===e.bt),`${y}`).toBe(true);
   expect(titles.every(e=>e.d===TOP_DIVISION[e.bt as 'NOVA'|'ONYX']),`${y}`).toBe(true);
  }
  // Holding any belt means fighting only for belts (tournaments aside).
  const holding=(id:string,y:number,e:number)=>[w.crowns!.NOVA,w.crowns!.ONYX,...Object.values(w.belts)].some(b=>b.reigns.some(r=>r.fighterId===id&&(r.startYear<y||r.startYear===y&&r.startRound<e)&&(r.endYear===undefined||r.endYear>y||r.endYear===y&&(r.endRound??0)>e)));
  const offenders=ledgerFor(w,e=>!e.t&&!(e.f&(LF.TITLE|LF.PINNACLE))&&(holding(e.a,e.y,e.e)||holding(e.b,e.y,e.e)));
  expect(offenders).toHaveLength(0);
 });
 it('crowns continental champions on title nights and lets the ambitious ones sign with a brand',()=>{
  const w=advanceYears(createWorld(97),6);rosterInvariant(w);
  for(const belt of CONTINENTAL_BELTS){
   const b=w.belts[belt];
   expect(b.reigns.length,belt).toBeGreaterThan(0);
   const nights=ledgerFor(w,e=>e.bt===belt);
   expect(nights.every(e=>[7,19,31,43].includes(e.e)&&e.d===BELT_DIVISION[belt])).toBe(true);
   if(b.championId){const holder=w.fighters.find(f=>f.id===b.championId)!;expect(holder.division).toBe(BELT_DIVISION[belt]);}
  }
  expect(w.events.some(e=>e.type==='vacancy'&&/signs with (NOVA|ONYX)/.test(e.description))).toBe(true);
  expect(w.events.some(e=>e.type==='eliminator')).toBe(true);
  for(const id of protectedChampions(w))expect(w.fighters.find(f=>f.id===id)!.status).toBe('active');
 });
});

describe('NEXUS v1.5 — the offseason Draft Room',()=>{
 const toDecember=(seed:number)=>{let w:World={...createWorld(seed),manager:true};while(!(w.round===47&&hasPendingCard(w)))w=w.round===47?prepareNextEvent(w):advanceRound(w);return resolveCurrentEvent(w,[]).world;};
 it('stops a managed world in the Draft Room with retirements and applicants',()=>{
  const w=toDecember(616);
  expect(w.year).toBe(2059);expect(w.draft).toBeTruthy();
  expect(w.draft!.retired.length).toBeGreaterThan(0);
  expect(w.draft!.retired.every(id=>w.fighters.find(f=>f.id===id)!.status==='retired')).toBe(true);
  expect(w.draft!.applicants.every(id=>w.fighters.find(f=>f.id===id)!.division.endsWith('D1'))).toBe(true);
  expect(draftStatus(w).ok).toBe(false);
  expect(draftFinish(w)).toBe(w);
 });
 it('applies, limits and undoes moves, then spawns once every division is full',()=>{
  let w=toDecember(616);
  const nova=w.fighters.filter(f=>f.status==='active'&&f.division==='NOVA S'&&draftTargets(w,f).length).sort((a,b)=>b.rank-a.rank);
  w=draftMove(w,nova[0].id,'NOVA II');w=draftMove(w,nova[1].id,'NOVA II');
  expect(w.draft!.moves).toHaveLength(2);
  expect(canDraftMove(w,nova[2],'NOVA II')).toBe(false);
  w=draftMove(w,nova[1].id,'NOVA S');
  expect(w.draft!.moves).toHaveLength(1);
  expect(w.fighters.find(f=>f.id===nova[1].id)!.division).toBe('NOVA S');
  const auto=draftAuto(w);expect(draftStatus(auto).ok).toBe(true);
  const done=draftFinish(auto);
  expect(done.draft).toBeNull();
  expect(done.fighters.find(f=>f.id===nova[0].id)!.division).toBe('NOVA II');
  expect(done.lastDraft?.moves.some(m=>m.id===nova[0].id)).toBe(true);
  rosterInvariant(done);
  // Only fighters who applied were signed from the continents.
  const signed=done.lastDraft!.moves.filter(m=>m.from.endsWith('D1')&&isWorldTier(m.to));
  expect(signed.length).toBeGreaterThan(0);
  expect(signed.every(m=>auto.draft!.applicants.includes(m.id))).toBe(true);
 });
 it('sends a new generational talent to the brand that has fewer',()=>{
  const w=toDecember(616);
  const gen=w.fighters.find(f=>f.status==='active'&&f.rarity==='Generational')!;
  const count=(b:'NOVA'|'ONYX')=>w.fighters.filter(f=>f.status==='active'&&f.rarity==='Generational'&&f.division.startsWith(b)).length;
  const expected=count('NOVA')<count('ONYX')?'NOVA':count('ONYX')<count('NOVA')?'ONYX':null;
  if(expected)expect(recommendBrand(w,{...gen})).toBe(expected);
 });
 it('fast simulation decides the Draft Room itself',()=>{
  const w=advanceYears({...createWorld(616),manager:true},3);
  expect(w.year).toBe(2061);
  // advanceYears stops right as the year turns, with the room open; the next step resolves it.
  const next=advanceRound(w);expect(next.draft).toBeFalsy();rosterInvariant(next);
 });
});
