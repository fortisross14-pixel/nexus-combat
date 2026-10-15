import {describe,it,expect} from 'vitest';
import {createWorld,prepareNextEvent,resolveTournamentAction,resolveWholeTournament,upgradeWorld} from '../src/engine/world';
import {SURGE_ROUND} from '../src/engine/competition';
import {BRANDS,TOP_DIVISION,REGIONS,REGION_DIVISIONS} from '../src/engine/constants';
import type {World,Tournament} from '../src/engine/types';

const begin=(seed:number):World=>{
 const w=createWorld(seed);w.round=SURGE_ROUND;return prepareNextEvent(w);
};
const last=(w:World)=>w.tournaments.at(-1)! as Tournament;

describe('The Surge live minute-by-minute Royale',()=>{
 it('books eight athletes per brand and all four continental slots',()=>{
  const w=begin(2201),t=last(w);
  expect(t.kind).toBe('SURGE');expect(t.participants).toHaveLength(20);
  for(const b of BRANDS)expect(t.participants.filter(id=>w.fighters.find(f=>f.id===id)!.division===TOP_DIVISION[b])).toHaveLength(8);
  for(const r of REGIONS)expect(t.participants.filter(id=>w.fighters.find(f=>f.id===id)!.division===REGION_DIVISIONS[r][0])).toHaveLength(1);
  expect(new Set(t.participants).size).toBe(20);
 });
 it('admits two opening fighters and one new fighter every three minutes',()=>{
  const finished=resolveWholeTournament(begin(5511)),t=last(finished),s=t.surgeState!;
  const starts=t.surgeMoments!.filter(m=>m.entrantId).map(m=>m.minute);
  expect(starts).toEqual([0,0,...Array.from({length:18},(_,i)=>(i+1)*3)]);
  expect(s.minute).toBeGreaterThanOrEqual(54);
  expect(t.surgeMoments?.filter(m=>m.eliminatedId)).toHaveLength(19);
  expect(Object.keys(s.fighters)).toHaveLength(20);
  expect(t.winnerId).toBeTruthy();
  for(const fighter of Object.values(s.fighters)){
   expect(fighter.energy).toBeGreaterThanOrEqual(0);expect(fighter.energy).toBeLessThanOrEqual(100);
   expect(fighter.damage).toBeGreaterThanOrEqual(0);expect(fighter.damage).toBeLessThanOrEqual(100);
  }
 });
 it('produces identical outcomes watching every minute and skipping the entire event',()=>{
  const start=begin(7005),fast=resolveWholeTournament(start);
  let slow=start;let guard=0;
  while(slow.activeTournamentId&&guard++<400)slow=resolveTournamentAction(slow).world;
  expect(guard).toBeLessThan(400);
  expect(last(slow)).toEqual(last(fast));
  expect(slow.rngState).toBe(fast.rngState);
 });
 it('can restore a mid-Surge save without replaying already-revealed eliminations',()=>{
  let w=begin(8906);
  for(let i=0;i<23;i++)w=resolveTournamentAction(w).world;
  const old=last(w).surgeMoments!.filter(m=>m.eliminatedId).length;
  const restored=upgradeWorld(JSON.parse(JSON.stringify(w)))!;
  expect(last(restored).surgeState?.minute).toBe(23);
  expect(last(restored).surgeMoments?.filter(m=>m.eliminatedId)).toHaveLength(old);
  const final=resolveWholeTournament(restored);
  expect(last(final).status).toBe('complete');
 });
 it('does not guarantee victory to the last four entrants',()=>{
  const winningPositions=Array.from({length:32},(_,i)=>{
   const w=resolveWholeTournament(begin(30000+i*13));const t=last(w);
   return t.surgeOrder!.indexOf(t.winnerId!);
  });
  expect(winningPositions.some(x=>x<10)).toBe(true);
  expect(winningPositions.some(x=>x>=10&&x<16)).toBe(true);
 });
});
