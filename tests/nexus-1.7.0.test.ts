import {describe,it,expect} from 'vitest';
import {advanceRound,createWorld,prepareNextEvent,upgradeWorld} from '../src/engine/world';
import {getFight,fighterLedger} from '../src/engine/archive';
import {CALENDAR,MAIN_CARD} from '../src/engine/competition';
import {PINNACLE_ROUND,DOUBLES_ROUND} from '../src/engine/belts';
import type {PendingFight} from '../src/engine/types';

describe('NEXUS 1.7 real national 2v2 and restored marquee cards',()=>{
 it('uses one tag match for four teammates, not two singles legs',()=>{
  let w=createWorld(512);for(let i=0;i<=23;i++)w=advanceRound(w);
  const crown=w.tag!.ties.find(t=>t.year===2058&&t.title)!;
  expect(crown.round).toBe(DOUBLES_ROUND);
  expect(crown.matchFightId).toBeTruthy();expect(crown.teams).toHaveLength(2);
  expect(crown.legs).toHaveLength(0);
  const four=[...crown.teams![0],...crown.teams![1]];
  expect(new Set(four).size).toBe(4);
  const f=getFight(w,crown.matchFightId)!;
  expect(f.tag?.teamA).toEqual(crown.teams![0]);expect(f.tag?.teamB).toEqual(crown.teams![1]);
  expect(f.tag?.winner).toBe(crown.winner);
  expect(f.tournamentStage).toBe('Doubles Crown');
  for(const id of four)expect(fighterLedger(w,id).some(e=>e.i===f.id)).toBe(true);
  // Doubles competition must NEVER mint fake singles victories.
  expect(f.titleFight).toBe(false);
  const rows=w.ledger[2058].filter(e=>e.tag?.tie===crown.id);
  expect(rows).toHaveLength(1);
 });
 it('locks a national challenger before June and November and honors the berth',()=>{
  let w=createWorld(9);for(let i=0;i<48;i++)w=advanceRound(w);
  for(const [qualifier,title] of [[19,23],[43,47]]){
   const lock=w.tag!.ties.find(t=>t.round===qualifier&&t.challengerLock)!;
   const crown=w.tag!.ties.find(t=>t.round===title&&t.title)!;
   expect(lock.winner).toBeTruthy();expect(crown).toBeTruthy();
   expect([crown.a,crown.b]).toContain(lock.winner);
  }
 });
 it('books four featured fights at every regular monthly marquee',()=>{
  for(const seed of [1,9,88,512]){
   let w=createWorld(seed);
   for(let i=0;i<48;i++){
    if(CALENDAR[i].kind==='major'&&i!==15&&i!==31){
     w=prepareNextEvent(w);
     const featured=w.pendingCard?.filter(p=>!p.prelim)??[];
     expect(featured.length,`${seed} @ event ${i+1}`).toBe(MAIN_CARD);
     if(i===DOUBLES_ROUND){expect(featured[0].tag?.title).toBe(true);expect(featured.filter(p=>!p.tag).length).toBeGreaterThan(1);}
     if(i===PINNACLE_ROUND){expect(featured[0].kind).toBe('pinnacle');expect(featured[1].tag?.title).toBe(true);}
    }
    w=advanceRound(w);
   }
  }
 });
 it('preserves legacy pending two-leg cards across the save upgrade',()=>{
  let w=createWorld(777);for(let i=0;i<DOUBLES_ROUND;i++)w=advanceRound(w);
  w=prepareNextEvent(w);
  const tag=w.pendingCard!.find(x=>x.tag?.title)!;
  const a=tag.tag!.teamA,b=tag.tag!.teamB;
  const oldLegs=[0,1].map(i=>({
   ...tag,fighterA:a[i],fighterB:b[i],tag:{tie:tag.tag!.tie,a:tag.tag!.a,b:tag.tag!.b,title:true,leg:(i+1) as 1|2},titleFight:false
  }) as unknown as PendingFight);
  const old=w.pendingCard!.flatMap(x=>x===tag?oldLegs:[x]);
  const saved=JSON.parse(JSON.stringify({...w,pendingCard:old,pendingFight:old[0]}));
  const migrated=upgradeWorld(saved)!;
  const national=migrated.pendingCard!.filter(x=>x.tag?.tie===tag.tag!.tie);
  expect(national).toHaveLength(1);expect(national[0].tag?.teamA).toEqual(a);expect(national[0].tag?.teamB).toEqual(b);
  expect(JSON.parse(JSON.stringify(migrated)).pendingCard.length).toBe(old.length-1);
 });
});
