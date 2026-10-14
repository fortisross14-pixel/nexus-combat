import {it} from 'vitest';
import {createWorld,advanceYear} from '../../src/engine/world';
import {ageOf} from '../../src/engine/career';
import {forEachLedger,LF,isWorldTitle} from '../../src/engine/archive';
import {buildLegacyView} from '../../src/engine/legacy';
import {CONTINENTAL_BELTS,topReigns} from '../../src/engine/belts';
import type {World} from '../../src/engine/types';
import {env,fmt,pct,Report} from './shared';

/** Whole-universe check: decades of seasons on several seeds. */
it('world: calibration, careers, storage and speed over decades',()=>{
 const YEARS=env('YEARS',30);const seeds=[11,2222];
 const R=new Report();
 for(const seed of seeds){
  let w:World=createWorld(seed);const times:number[]=[];
  for(let y=0;y<YEARS;y++){const t=performance.now();w=advanceYear(w);times.push(performance.now()-t);}
  const b:Record<string,[number,number,number]>={};let n=0,under=0,fin=0,r1=0,sameYear=0,champNonTitle=0;
  const pairYear=new Map<string,number>();
  forEachLedger(w,e=>{if(e.t)return;n++;
   if(['KO','TKO','SUB'].includes(e.m)){fin++;if(e.r===1)r1++;}
   if(!e.w)return;const pf=Math.max(e.o,1-e.o),favWon=(e.o>=.5)===(e.w===e.a);if(!favWon)under++;
   const k=(Math.floor(pf*10)/10).toFixed(1);(b[k]??=[0,0,0]);b[k][0]+=favWon?1:0;b[k][1]++;b[k][2]+=pf;
   const key=(e.a<e.b?e.a+e.b:e.b+e.a)+e.y;const c=(pairYear.get(key)||0)+1;pairYear.set(key,c);if(c>1)sameYear++;
   if(!(e.f&(LF.TITLE|LF.PINNACLE))&&!e.t&&[w.crowns!.NOVA,w.crowns!.ONYX,...Object.values(w.belts)].some(c=>c.reigns.some(r=>(r.fighterId===e.a||r.fighterId===e.b)&&(r.startYear<e.y||r.startYear===e.y&&r.startRound<e.e)&&(r.endYear===undefined||r.endYear>e.y||r.endYear===e.y&&(r.endRound??0)>e.e))))champNonTitle++;
  });
  R.line(`\nWORLD seed ${seed} · ${YEARS} seasons · ${n} circuit bouts`);
  for(const k of Object.keys(b).sort()){const [won,count,exp]=b[k];if(count>200)R.check(`seed ${seed} favourite ${k} bucket: shown ${fmt(pct(exp,count))}% vs actual`,pct(won,count)-pct(exp,count),-4,4,' pts');}
  R.check(`seed ${seed} underdog wins`,pct(under,n),18,32);
  R.check(`seed ${seed} finishes`,pct(fin,n),41,56); // Ambition-only signings leave slightly closer matchups in the brand divisions.
  R.check(`seed ${seed} round-1 share of finishes`,pct(r1,fin),28,50);
  const retiredYoung=w.fighters.filter(f=>f.status==='retired'&&ageOf(f,f.retiredYear!)<25).length;
  R.check(`seed ${seed} retirements before 25`,retiredYoung,0,3,'');
  R.check(`seed ${seed} same-pair rematches within a season (% of bouts)`,pct(sameYear,n),0,6);
  const json=JSON.stringify(w).length/1e6;
  R.check(`seed ${seed} save size after ${YEARS} seasons`,json,0,15,' MB');
  const late=times.slice(-5).reduce((s,x)=>s+x,0)/5;
  R.check(`seed ${seed} time per simulated season (last 5)`,late,0,1500,' ms');
  const act=w.fighters.filter(f=>f.status==='active');
  const pts=(d:string)=>{const l=act.filter(f=>f.division===d);return Math.round(l.reduce((s,f)=>s+f.rankingPoints,0)/l.length);};
  R.line(`  ranking points by division: NOVA S ${pts('NOVA S')} · ONYX S ${pts('ONYX S')} · NOVA II ${pts('NOVA II')} · Americas D1 ${pts('AMERICAS D1')} · Americas D2 ${pts('AMERICAS D2')}`);
  R.check(`seed ${seed} champions in non-title bouts`,champNonTitle,0,0,'');
  const titlesPerYear=Array.from({length:YEARS},(_,i)=>(w.ledger[2058+i]||[]).filter(isWorldTitle).length);
  R.check(`seed ${seed} fewest world title bouts in a season (both brands)`,Math.min(...titlesPerYear),6,8,'');
  R.check(`seed ${seed} Pinnacle unifiers held`,pct(w.pinnacle?.length??0,YEARS),85,100);
  R.check(`seed ${seed} doubles ties per season`,(w.tag?.ties.length??0)/YEARS,20,45,'');
  const retired=w.fighters.filter(f=>f.status==='retired').length;
  R.check(`seed ${seed} Hall of Fame share of retirees`,pct(w.hallOfFame.length,retired),2.5,8);
  const view=buildLegacyView(w);
  // Fourteen-fighter brand divisions mean more rematches, so more rivalries qualify.
  R.check(`seed ${seed} rivalries`,view.rivalries.length,15,260,'');
  const brandReigns=topReigns(w).filter(r=>r.via!=='split');const interim=(w.crowns!.NOVA.interimReigns?.length||0)+(w.crowns!.ONYX.interimReigns?.length||0),elevated=brandReigns.filter(r=>r.via==='interim').length;
  const cont=CONTINENTAL_BELTS.map(b=>`${b} ${w.belts[b].reigns.length}`).join(' · ');
  R.line(`  brand title reigns ${brandReigns.length} (avg ${fmt(brandReigns.reduce((s,r)=>s+r.defenses,0)/Math.max(1,brandReigns.length))} defenses) · interim titles ${interim} · elevated ${elevated} · continental reigns: ${cont}`);
  const top=view.fighters.sort((a,b)=>b.fame-a.fame)[0];R.line(`  top fame: ${top.fighter.name} ${top.fame} · HoF ${w.hallOfFame.length}/${retired}`);
 }
 R.finish();
});
