import {describe,it,expect} from 'vitest';
import {createWorld,advanceRound,prepareNextEvent,resolveCurrentEvent,upgradeWorld} from '../src/engine/world';
import {simulateCombat,MENTALITY_EFFECTS,STAT} from '../src/engine/combat';
import {Random} from '../src/engine/random';
import {TOP_DIVISION} from '../src/engine/constants';


describe('NEXUS 1.6 founding season and fight-night identity',()=>{
 it('crowns fighters who have won circuit bouts, not 0–0 rookies',()=>{
  let w=createWorld(88);
  for(let i=0;i<3;i++)w=advanceRound(w);
  const opening=prepareNextEvent(w);
  const title=opening.pendingCard?.find(f=>f.kind==='title'&&f.belt==='NOVA');
  expect(title).toBeTruthy();
  const eliminator=opening.pendingCard?.find(f=>f.kind==='eliminator'&&f.belt==='ONYX');
  expect(eliminator).toBeTruthy();
  for(const p of [title!,eliminator!])for(const id of [p.fighterA,p.fighterB]){
   const fighter=opening.fighters.find(x=>x.id===id)!;
   expect(fighter.record.wins).toBeGreaterThanOrEqual(1);
   expect(fighter.record.streak).toBeGreaterThan(0);
   expect(fighter.condition).toBeGreaterThanOrEqual(60);
  }
  const settled=resolveCurrentEvent(opening).world;
  expect(settled.crowns!.NOVA.championId).toBeTruthy();
 });
 it('holds both inaugural brand title fights on their scheduled nights',()=>{
  for(const seed of [1,9,88,187]){
   let w=createWorld(seed);
   for(let i=0;i<48;i++)w=advanceRound(w);
   const titled=(w.ledger[2058]??[]).filter(e=>e.bt==='NOVA'||e.bt==='ONYX');
   expect(titled.map(e=>`${e.e}:${e.bt}`)).toEqual(['4:NOVA','8:ONYX','12:NOVA','20:ONYX','28:NOVA','36:ONYX','40:NOVA','44:ONYX']);
   const opener=titled.find(e=>e.e===4)!;
   expect(opener.d).toBe(TOP_DIVISION.NOVA);
   const second=titled.find(e=>e.e===8)!;
   expect(second.d).toBe(TOP_DIVISION.ONYX);
  }
 });
 it('preserves fight history and mentalities through the existing save-upgrade path',()=>{
  let w=createWorld(250);
  for(let i=0;i<5;i++)w=advanceRound(w);
  const copy=upgradeWorld(JSON.parse(JSON.stringify(w)));
  expect(copy).not.toBeNull();
  expect(copy?.seed).toBe(w.seed);
  expect(copy?.ledger).toEqual(w.ledger);
  expect(copy?.crowns).toEqual(w.crowns);
  expect(copy?.fighters.map(f=>f.mentality)).toEqual(w.fighters.map(f=>f.mentality));
 });
});

describe('fight mentality is a mechanical attribute',()=>{
 it('Conservative saves energy while Crazy deals heavier damage across identical seeds',()=>{
  const w=createWorld(312);
  const fighter=w.fighters[0],opponent=w.fighters[1];
  let crazyEnergy=0,conservativeEnergy=0,crazyDamage=0,conservativeDamage=0;
  for(let seed=1;seed<=35;seed++){
   const crazy={...fighter,mentality:'Crazy' as const};
   const conservative={...fighter,mentality:'Conservative' as const};
   const c=simulateCombat(crazy,opponent,w.year,new Random(seed),3);
   const d=simulateCombat(conservative,opponent,w.year,new Random(seed),3);
   crazyEnergy+=c.rounds[0].staminaA;conservativeEnergy+=d.rounds[0].staminaA;
   crazyDamage+=c.statsA[STAT.DMG];conservativeDamage+=d.statsA[STAT.DMG];
  }
  expect(conservativeEnergy).toBeGreaterThan(crazyEnergy+100);
  expect(crazyDamage).toBeGreaterThan(conservativeDamage);
  expect(MENTALITY_EFFECTS.Crazy.energyFactor).toBeGreaterThan(1);
  expect(MENTALITY_EFFECTS.Conservative.energyFactor).toBeLessThan(1);
 });
});
