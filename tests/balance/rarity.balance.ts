import {it} from 'vitest';
import {createWorld,advanceYear} from '../../src/engine/world';
import {ageOf,overallOf} from '../../src/engine/career';
import {countryNamed} from '../../src/engine/names';
import {REGIONS,DIVISIONS,isTopDivision} from '../../src/engine/constants';
import {topReigns} from '../../src/engine/belts';
import type {Rarity,World} from '../../src/engine/types';
import {env,fmt,pct,Report} from './shared';

/** The population of talent over decades: rarity counts, where the elite come from, and how long they last. */
it('rarity census: targets, regions, key countries and careers',()=>{
 const YEARS=env('YEARS',50);const R=new Report();
 for(const seed of [7,4040]){
  let w:World=createWorld(seed);
  const census:Record<string,number[]>={Generational:[],Legend:[],Epic:[]};
  let genRegionsOk=0,legendRegionsOk=0,yearsSampled=0;
  const sTierMix:Record<string,number>={};
  const snapshot=(w:World)=>{
   const act=w.fighters.filter(f=>f.status==='active');
   for(const r of ['Generational','Legend','Epic'] as Rarity[])census[r].push(act.filter(f=>f.rarity===r).length);
   const gens=act.filter(f=>f.rarity==='Generational');if(new Set(gens.map(f=>f.region)).size===gens.length)genRegionsOk++;
   if(REGIONS.every(r=>act.some(f=>f.rarity==='Legend'&&f.region===r)))legendRegionsOk++;
   for(const f of act.filter(f=>isTopDivision(f.division)))sTierMix[f.rarity]=(sTierMix[f.rarity]||0)+1;
   yearsSampled++;
  };
  // Founding layout
  const act0=w.fighters;const mix=(d:string)=>['Generational','Legend','Epic','Rare','Uncommon','Common'].map(r=>`${r[0]}${act0.filter(f=>f.division===d&&f.rarity===r).length}`).join(' ');
  R.line(`\nSEED ${seed} founding · NOVA S: ${mix('NOVA S')} · ONYX S: ${mix('ONYX S')} · NOVA II: ${mix('NOVA II')} · ONYX II: ${mix('ONYX II')} · S avg OVR ${fmt(act0.filter(f=>isTopDivision(f.division)).reduce((s,f)=>s+overallOf(f,w.year),0)/28)}`);
  snapshot(w);
  for(let y=0;y<YEARS;y++){w=advanceYear(w);snapshot(w);}
  const span=(a:number[])=>`${Math.min(...a)}–${Math.max(...a)} (avg ${fmt(a.reduce((s,x)=>s+x,0)/a.length)})`;
  const inRange=(a:number[],lo:number,hi:number)=>pct(a.filter(x=>x>=lo&&x<=hi).length,a.length);
  R.line(`  active generational ${span(census.Generational)} · legends ${span(census.Legend)} · epics ${span(census.Epic)}`);
  R.check(`seed ${seed} seasons with 2–3 generational`,inRange(census.Generational,2,3),75,100);
  R.check(`seed ${seed} seasons with 7–11 legends`,inRange(census.Legend,7,11),75,100);
  R.check(`seed ${seed} seasons with 14–21 epics`,inRange(census.Epic,14,21),75,100);
  R.check(`seed ${seed} seasons with generational talents all from different regions`,pct(genRegionsOk,yearsSampled),70,100);
  R.check(`seed ${seed} seasons with a legend in every region`,pct(legendRegionsOk,yearsSampled),75,100);
  const all=w.fighters;
  const elite=(r:Rarity)=>all.filter(f=>f.rarity===r&&f.joinedYear>2058);
  const keyShare=(r:Rarity)=>pct(elite(r).filter(f=>countryNamed(f.country)?.key).length,elite(r).length);
  R.check(`seed ${seed} generational from key countries`,keyShare('Generational'),80,100);
  R.check(`seed ${seed} legends from key countries`,keyShare('Legend'),45,90);
  const byCountry=(r:Rarity)=>Object.entries(elite(r).reduce<Record<string,number>>((m,f)=>{m[f.country]=(m[f.country]||0)+1;return m;},{})).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${c} ${n}`).join(', ');
  R.line(`  new generational (${elite('Generational').length}): ${byCountry('Generational')}`);
  R.line(`  new legends (${elite('Legend').length}): ${byCountry('Legend')}`);
  const retired=(r:Rarity)=>all.filter(f=>f.rarity===r&&f.status==='retired'&&f.joinedYear>2058);
  const avgRet=(r:Rarity)=>retired(r).length?fmt(retired(r).reduce((s,f)=>s+ageOf(f,f.retiredYear!),0)/retired(r).length):'—';
  R.line(`  average retirement age · generational ${avgRet('Generational')} · legend ${avgRet('Legend')} · epic ${avgRet('Epic')} · rare ${avgRet('Rare')}`);
  R.line(`  S Division composition (both brands) (avg per season): ${Object.entries(sTierMix).map(([k,v])=>`${k} ${fmt(v/yearsSampled)}`).join(' · ')}`);
  for(const b of ['NOVA','ONYX'] as const){const champ=w.fighters.find(f=>f.id===w.crowns![b].championId);if(champ)R.check(`seed ${seed} ${b} champion form`,champ.shape,5,5,'');}
  const reigns=topReigns(w).filter(r=>r.via!=='split');const byR=(r:string)=>reigns.filter(x=>w.fighters.find(f=>f.id===x.fighterId)?.rarity===r);
  R.line(`  avg defenses per reign · generational ${fmt(byR('Generational').reduce((s,x)=>s+x.defenses,0)/Math.max(1,byR('Generational').length))} · legend ${fmt(byR('Legend').reduce((s,x)=>s+x.defenses,0)/Math.max(1,byR('Legend').length))}`);R.line(`  World titles (both brands): ${reigns.length} reigns in ${YEARS} seasons · avg ${fmt(reigns.reduce((s,r)=>s+r.defenses,0)/reigns.length)} defenses · longest ${Math.max(0,...reigns.map(r=>r.defenses))} · by rarity: ${['Generational','Legend','Epic','Rare'].map(r=>`${r} ${reigns.filter(x=>w.fighters.find(f=>f.id===x.fighterId)?.rarity===r).length}`).join(' · ')}`);
  for(const d of DIVISIONS.slice(0,4))R.line(`  ${d} avg OVR now ${fmt(w.fighters.filter(f=>f.status==='active'&&f.division===d).reduce((s,f)=>s+overallOf(f,w.year),0)/14)}`);
 }
 R.finish();
});
