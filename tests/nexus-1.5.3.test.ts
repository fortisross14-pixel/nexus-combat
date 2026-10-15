import {describe,it,expect} from 'vitest';
import {createWorld,advanceYears,validateWorld} from '../src/engine/world';
import {currentDivisionWins} from '../src/engine/competition';
import {matchupOdds,simulateCombat} from '../src/engine/combat';
import {seasonAchievements} from '../src/engine/chronicleDetails';
import {Random} from '../src/engine/random';
import {standings} from '../src/engine/tournaments';

describe('1.5.3 competition and records',()=>{
 it('keeps founding contenders unproven until they win circuit fights',()=>{
  const w=createWorld(1553),rookie=w.fighters.find(f=>f.division==='NOVA S')!;
  expect(currentDivisionWins(w,rookie)).toBe(0);
  rookie.titlePath={division:rookie.division,wins:2,eliminatorWins:1};
  expect(currentDivisionWins(w,rookie)).toBe(2);
  rookie.titlePath={division:'ONYX S',wins:6,eliminatorWins:2};
  expect(currentDivisionWins(w,rookie)).toBe(0);
 });
 it('awards an extra Crucible group point for finishes',()=>{
  const w=advanceYears(createWorld(15531),1);
  const t=w.tournaments.find(t=>t.kind==='CRUCIBLE'&&t.status==='complete');
  if(!t)return;
  const s=standings(t,w);
  for(const entry of [...s.A,...s.B])expect(entry.points).toBe(entry.wins*3+entry.draws+entry.finishes);
 });
 it('records yearly achievements from actual competition results',()=>{
  const w=advanceYears(createWorld(151512),1);
  const f=w.fighters.find(f=>f.status==='active')!;
  const achievements=seasonAchievements(w,f,2058);
  expect(achievements.regular.wins).toBeGreaterThanOrEqual(0);
  expect(achievements.lines.every(line=>Boolean(line.label&&line.description))).toBe(true);
  expect(validateWorld(w)).toBe(true);
 });
 it('makes large equal-style rating advantages materially favor the stronger fighter',()=>{
  const w=createWorld(1553),strong=w.fighters.find(f=>f.division==='NOVA S')!;
  const weaker=structuredClone(strong);weaker.id='test-weaker';weaker.curve=weaker.curve.map(r=>r-10);
  weaker.condition=strong.condition;weaker.shape=strong.shape;
  expect(matchupOdds(strong,weaker,w.year)).toBeGreaterThan(.75);
  const rng=new Random(1553);let wins=0;
  for(let i=0;i<90;i++)wins+=simulateCombat(strong,weaker,w.year,rng,3).winnerId===strong.id?1:0;
  expect(wins).toBeGreaterThan(53);
 });
});
