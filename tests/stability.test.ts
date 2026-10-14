import {describe,it,expect} from 'vitest';
import {CALENDAR,ROUNDS_PER_YEAR} from '../src/engine/competition';
import {createWorld,advanceYears,prepareNextEvent,resolveCurrentEvent,upgradeWorld} from '../src/engine/world';
import {eventNameAt,kindAt} from '../src/engine/tournaments';
import {ageOf} from '../src/engine/career';
import {DIVISIONS,DIVISION_SIZE,ACTIVE_FIGHTERS,isTopDivision} from '../src/engine/constants';
import {ledgerCount} from '../src/engine/archive';

/** v0.8 is a stabilization release: its calendar name and presentation fixes
    cannot create nonexistent tournaments or damage serialized careers. */
describe('NEXUS v0.8 — final stabilization',()=>{
 it('does not advertise an Olympiad during an ordinary August',()=>{
  expect(ROUNDS_PER_YEAR).toBe(48);
  expect(CALENDAR[35].name).toBe('HORIZON');
  expect(kindAt(2058,31)).toBe('CRUCIBLE');
  expect(eventNameAt(2058,31)).toBe('THE CRUCIBLE');
  expect(kindAt(2060,31)).toBe('OLYMPIAD');
  expect(eventNameAt(2060,31)).toBe('WORLD COMBAT OLYMPIAD');
  expect(kindAt(2061,31)).toBe('CRUCIBLE');
 });
 it('retains identical main-event results for watch and skip',()=>{
  const prepared=prepareNextEvent(createWorld(822));
  expect(prepared.pendingFight).toBeTruthy();
  const a=resolveCurrentEvent(prepared);
  const b=resolveCurrentEvent(JSON.parse(JSON.stringify(prepared)));
  expect(a).toEqual(b);
 });
 it('preserves division integrity, medical clearance and fight archives after five years',()=>{
  const world=advanceYears(createWorld(883),5);
  const active=world.fighters.filter(f=>f.status==='active');
  expect(active).toHaveLength(ACTIVE_FIGHTERS);
  for(const division of DIVISIONS)expect(active.filter(f=>f.division===division)).toHaveLength(DIVISION_SIZE(division));
  expect(active.filter(f=>isTopDivision(f.division)).every(f=>ageOf(f,world.year)>=24)).toBe(true);
  expect(ledgerCount(world)).toBeGreaterThan(5000);
  expect(world.awards).toHaveLength(5);
  expect(world.tournaments.filter(t=>t.status==='complete')).toHaveLength(10);
  expect(world.crowns!.NOVA.reigns.length+world.crowns!.ONYX.reigns.length).toBeGreaterThan(1);
  expect(world.pinnacle).toHaveLength(5);
 });
 it('loads previous browser saves without modifying fight winners, titles or awards',()=>{
  const original=advanceYears(createWorld(773),2);
  const restored=upgradeWorld(JSON.parse(JSON.stringify(original)));
  expect(restored).not.toBeNull();
  expect(restored?.ledger).toEqual(original.ledger);
  expect(restored?.crowns).toEqual(original.crowns);
  expect(restored?.tag).toEqual(original.tag);
  expect(restored?.awards).toEqual(original.awards);
 });
});
