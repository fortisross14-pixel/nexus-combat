import {describe,expect,it} from 'vitest';
import {simulateCombat} from '../src/engine/combat';
import {abilitiesOf} from '../src/engine/career';
import {createWorld} from '../src/engine/world';
import {SKILLS} from '../src/engine/constants';
import {Random} from '../src/engine/random';
import type {Fighter} from '../src/engine/types';

/** The game remains rating-balanced: differences here come from how the nine
 * skills are distributed, not from changing the fighter's overall rating. */
function athlete(source:Fighter,id:string,values:readonly number[],mentality:Fighter['mentality']='Cold'){
 const f=structuredClone(source);
 f.id=id;f.weight=85;f.height=182;f.reach=185;f.condition=92;f.shape=0;
 f.mentality=mentality;f.style='MMA Hybrid';f.curve=Array(28).fill(90);
 f.skillNoise=SKILLS.map(()=>0);f.skillOffsets=values.map(n=>n-90);
 return f;
}
function staminaFighter(source:Fighter,id:string,stamina:number){
 const values=SKILLS.map(s=>s==='Stamina'?stamina:(810-stamina)/8);
 return athlete(source,id,values);
}
const mean=(arr:number[])=>arr.reduce((p,v)=>p+v,0)/Math.max(1,arr.length);

describe('NEXUS combat repair — ground control & expenditure',()=>{
 it('rarely permits inferior guard submissions against a much stronger controller',()=>{
  const world=createWorld(6642),source=world.fighters[0];
  const top=athlete(source,'controller',[80,78,92,96,97,97,93,94,83]);
  const bottom=athlete(source,'defender',[90,88,92,90,88,89,89,90,94]);
  const a=abilitiesOf(top,world.year),b=abilitiesOf(bottom,world.year);
  expect(a.Submissions).toBe(97);expect(a['Ground Control']).toBe(97);
  expect(b.Submissions).toBe(88);expect(b['Ground Control']).toBe(89);
  let directGuardSub=0,topGroundExchanges=0;
  for(let i=0;i<450;i++){
   const r=simulateCombat(top,bottom,world.year,new Random(90000+i),3,{record:true});
   for(const round of r.rounds)for(const beat of round.timeline||[])if(beat.position==='Ground'&&beat.top===0)topGroundExchanges++;
   if(r.method==='SUB'&&r.winnerId===bottom.id){
    const last=r.rounds.at(-1)?.timeline?.at(-1);
    if(last?.position==='Ground'&&last.top===0)directGuardSub++;
   }
  }
  expect(topGroundExchanges).toBeGreaterThan(400);
  expect(directGuardSub).toBeLessThanOrEqual(3); // Very rare, not impossible.
 });

 it('preserves stamina in normal rounds but exposes low stamina over five',()=>{
  const world=createWorld(7728),source=world.fighters[0];
  const p80=staminaFighter(source,'80',80),p85=staminaFighter(source,'85',85);
  const p95=staminaFighter(source,'95',95),p100=staminaFighter(source,'100',100);
  const opponent85=staminaFighter(source,'opponent-85',85);
  const p90=staminaFighter(source,'90',90);
  const energy=(a:Fighter,b:Fighter,seed:number,count:number)=>{
   const byRound:number[][]=Array.from({length:5},()=>[]);
   for(let i=0;i<count;i++){
    const res=simulateCombat(a,b,world.year,new Random(seed+i),5);
    for(const r of res.rounds)byRound[r.number-1].push(r.staminaA);
   }
   return byRound.map(mean);
  };
  const low=energy(p80,opponent85,5520,220),adequate=energy(p85,opponent85,5520,220);
  const strong=energy(p95,opponent85,5520,220),elite=energy(p100,opponent85,5520,220);
  expect(adequate[2]).toBeGreaterThan(35); // 85 can complete a normal 3-rounder.
  expect(adequate[4]).toBeLessThan(40); // But five hard rounds are costly.
  expect(low[4]).toBeLessThan(adequate[4]);
  expect(strong[4]).toBeGreaterThan(adequate[4]+25);
  expect(elite[4]).toBeGreaterThan(strong[4]);
  const mid=energy(p90,opponent85,5520,220);
  expect(mid[3]).toBeGreaterThan(45); // Around 90 generally lasts four rounds.
  expect(abilitiesOf(p85,world.year).Stamina).toBe(85);
 });

 it('keeps fight results deterministic with and without broadcast recording',()=>{
  const world=createWorld(982),[a,b]=world.fighters;
  const seed=23455;
  const full=simulateCombat(a,b,world.year,new Random(seed),5,{record:true});
  const quick=simulateCombat(a,b,world.year,new Random(seed),5);
  expect([full.winnerId,full.method,full.finishRound,full.finishTime,full.statsA,full.statsB])
   .toEqual([quick.winnerId,quick.method,quick.finishRound,quick.finishTime,quick.statsA,quick.statsB]);
  expect(full.rounds.flatMap(r=>r.timeline||[]).length).toBeGreaterThan(0);
 });
});
