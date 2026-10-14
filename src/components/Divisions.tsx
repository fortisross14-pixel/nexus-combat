import {useMemo} from 'react';
import {ChevronRight,Crown,Flame,Hexagon,Shield,Timer,Trophy} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {Heading,PageHead,RankTag,RarityPill,BeltChips} from './ui';
import {DIVISIONS,DIVISION_NAMES,REGIONS,BRANDS,BRAND_INFO,TOP_DIVISION,SECOND_DIVISION,brandOf,isTopDivision,isWorldTier} from '../engine/constants';
import {ageOf,overallOf} from '../engine/career';
import {forEachLedger} from '../engine/archive';
import {reignDuration} from '../engine/legacy';
import {CLOCK,divisionChampionId} from '../engine/competition';
import {BELT_DIVISION,beltState,isBrandBelt,otherBrand} from '../engine/belts';
import type {BeltId,Division,Fighter,World} from '../engine/types';
import './divisions.css';

const beltOf=(d:Division):BeltId|null=>(Object.keys(BELT_DIVISION) as BeltId[]).find(b=>BELT_DIVISION[b]===d)??null;
const streakText=(s:number)=>s>0?`W${s}`:s<0?`L${-s}`:'—';

/** All-time records inside one division, from the permanent ledger. */
function divisionRecords(world:World,d:Division){
 const wins=new Map<string,number>(),finishes=new Map<string,number>(),run=new Map<string,number>(),best=new Map<string,number>();
 forEachLedger(world,e=>{
  if(e.d!==d||e.t)return;
  for(const id of [e.a,e.b]){
   if(e.w===id){wins.set(id,(wins.get(id)||0)+1);if(e.m==='KO'||e.m==='TKO'||e.m==='SUB')finishes.set(id,(finishes.get(id)||0)+1);const r=(run.get(id)||0)+1;run.set(id,r);if(r>(best.get(id)||0))best.set(id,r);}
   else run.set(id,0);
  }
 });
 const top=(m:Map<string,number>)=>[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const belt=beltOf(d);
 const reigns=belt?[...beltState(world,belt).reigns].map(r=>({id:r.fighterId,days:reignDuration(world,r),defenses:r.defenses,current:!r.endYear,start:r.startYear})).sort((a,b)=>b.days-a.days).slice(0,5):[];
 return {wins:top(wins),finishes:top(finishes),streaks:top(best),reigns};
}

export function Divisions({world,division,setDivision,onFighter}:{world:World;division:Division;setDivision:(d:Division)=>void;onFighter:(id:string)=>void}){
 const roster=world.fighters.filter(f=>f.status==='active'&&f.division===division).sort((a,b)=>a.rank-b.rank);
 const champ=roster.find(f=>f.id===divisionChampionId(world,division));
 const ranked=roster.filter(f=>f!==champ);
 const contenders=ranked.slice(0,4),rest=ranked.slice(4);
 const rec=useMemo(()=>divisionRecords(world,division),[world,division]);
 const f=(id:string)=>world.fighters.find(x=>x.id===id);
 const belt=beltOf(division);
 const now=CLOCK(world.year,world.round);
 const brand=brandOf(division);
 const desc=brand&&isTopDivision(division)?`${brand}'s top flight. Fourteen fighters, no weight classes; the ${brand} World Title lives here and is defended four times a year. Its champion meets the ${otherBrand(brand)} champion in the Pinnacle unifier.`:brand?`${brand}'s Division II: fourteen fighters fighting to move up into the ${brand} S Division. They share event nights with the other brand but only fight their own.`:division.endsWith('D1')?'The continental top flight. Its champion holds the continental belt and is promoted to the world tier at season end.':'The continental entry level, where new prospects start.';
 return <>
  <PageHead tag="THE HIERARCHY" title="Division" accent="Standings." description="Champion first, then the four contenders, then the rest of the ladder. Rankings move after every bout."/>
  <div className="division-layout"><div className="division-selector">{BRANDS.map(b=><div key={b} className="brand-section" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}><div className="eyebrow brand-eyebrow">{b} <small>{BRAND_INFO[b].tagline}</small></div>{[TOP_DIVISION[b],SECOND_DIVISION[b]].map(d=><button key={d} className={division===d?'active':''} onClick={()=>setDivision(d)}><Shield size={16}/><span>{isTopDivision(d)?'S Division':'Division II'}</span><ChevronRight size={14}/></button>)}</div>)}<div className="eyebrow division-divider">CONTINENTAL</div>{REGIONS.map((region,i)=><div key={region} className="region-section"><div className="region-heading"><span className="region-index">0{i+1}</span> {region.toUpperCase()}</div>{DIVISIONS.filter(d=>d.startsWith(region==='Europe & Middle East'?'EUROPE':region.toUpperCase())&&!isWorldTier(d)).map(d=><button key={d} className={division===d?'active':''} onClick={()=>setDivision(d)}><Hexagon size={14}/><span>{d.endsWith('D1')?'Division I':'Division II'}</span><ChevronRight size={14}/></button>)}</div>)}</div>
  <div className="division-main dv-main">
   <div className="panel dv-intro"><div><div className="eyebrow">{world.year} · {roster.length} FIGHTERS</div><h2>{DIVISION_NAMES[division]}</h2><p>{desc}</p></div><div className="dv-avg"><b>{Math.round(roster.reduce((s,x)=>s+overallOf(x,world.year),0)/Math.max(1,roster.length))}</b><small>AVG OVR</small></div></div>
   {belt&&<section className={`panel dv-champ ${champ?'':'vacant'}`}>{champ?<button onClick={()=>onFighter(champ.id)}><Avatar fighter={champ} size={128}/><span className="dv-champ-text"><span className="dv-c"><Crown size={14}/> C · {isBrandBelt(belt)?`${belt} WORLD CHAMPION`:'CONTINENTAL CHAMPION'}</span><b><Flag code={champ.flag} size={18}/>{champ.name}</b><small>“{champ.nickname}” · {champ.style} · Age {ageOf(champ,world.year)}</small><span className="dv-champ-stats"><span><b>{overallOf(champ,world.year)}</b>OVR</span><span><b>{champ.record.wins}-{champ.record.losses}-{champ.record.draws}</b>RECORD</span><span><b>{beltState(world,belt).reigns.at(-1)?.defenses??0}</b>DEFENSES</span><span><b>{streakText(champ.record.streak)}</b>STREAK</span></span><RarityPill rarity={champ.rarity}/></span></button>:<div className="dv-vacant"><Crown size={22}/> The {isBrandBelt(belt)?`${belt} World Title`:'continental belt'} is vacant. The top contenders fight for it on the next title night.</div>}</section>}
   <section className="dv-contenders">{contenders.map(x=><button key={x.id} className="panel dv-contender" onClick={()=>onFighter(x.id)}><span className="dv-num">{x.rank}</span><Avatar fighter={x} size={76}/><b><Flag code={x.flag}/>{x.name}<BeltChips world={world} id={x.id}/></b><small>{x.style} · Age {ageOf(x,world.year)}</small><span className="dv-mini"><span><b>{overallOf(x,world.year)}</b> OVR</span><span><b>{x.record.wins}-{x.record.losses}</b></span><span className={x.record.streak>0?'positive':x.record.streak<0?'negative':''}>{streakText(x.record.streak)}</span></span>{belt&&beltState(world,belt).mandatoryId===x.id&&<em>NEXT IN LINE</em>}</button>)}</section>
   <section className="panel table-panel"><Heading eyebrow="THE REST OF THE LADDER" title={`Ranks ${contenders.length+1}–${ranked.length}`}/>
    <div className="table-wrap"><table className="fighter-table dv-table"><thead><tr><th>RANK</th><th>FIGHTER</th><th>STYLE</th><th className="optional-col">AGE</th><th>OVR</th><th>W–L–D</th><th>STREAK</th><th className="optional-col">COND.</th></tr></thead><tbody>{rest.map(x=><tr key={x.id} onClick={()=>onFighter(x.id)} className="table-row-action" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onFighter(x.id);}}><td className="place-cell">{x.rank}</td><td><div className="table-fighter"><Avatar fighter={x} size={38}/><div className="table-fighter-text"><strong>{x.name}</strong><small><Flag code={x.flag}/>{x.country} · {x.rarity}</small></div></div></td><td className="style-td">{x.style}</td><td className="optional-col">{ageOf(x,world.year)}</td><td><b>{overallOf(x,world.year)}</b></td><td>{x.record.wins}-{x.record.losses}-{x.record.draws}</td><td className={x.record.streak>0?'positive':x.record.streak<0?'negative':'dim'}>{streakText(x.record.streak)}</td><td className="optional-col">{x.injuryUntil>now?<span className="negative">Injured</span>:x.condition}</td></tr>)}</tbody></table></div>
   </section>
   <section className="dv-records">
    <RecordList title="Most wins" icon={<Trophy size={15}/>} rows={rec.wins.map(([id,n])=>({f:f(id),value:`${n} W`}))} onFighter={onFighter}/>
    {belt?<RecordList title="Longest reigns" icon={<Crown size={15}/>} rows={rec.reigns.map(r=>({f:f(r.id),value:`${r.days} d`,sub:`${r.start} · ${r.defenses} def.${r.current?' · current':''}`}))} onFighter={onFighter} empty="No champion yet."/>:<RecordList title="Most finishes" icon={<Timer size={15}/>} rows={rec.finishes.map(([id,n])=>({f:f(id),value:`${n}`}))} onFighter={onFighter}/>}
    <RecordList title="Best win streaks" icon={<Flame size={15}/>} rows={rec.streaks.map(([id,n])=>({f:f(id),value:`${n} in a row`}))} onFighter={onFighter}/>
   </section>
  </div></div>
 </>;
}
function RecordList({title,icon,rows,onFighter,empty='No bouts yet.'}:{title:string;icon:React.ReactNode;rows:{f?:Fighter;value:string;sub?:string}[];onFighter:(id:string)=>void;empty?:string}){
 return <div className="panel dv-record"><div className="dv-record-head">{icon}<b>{title}</b><small>ALL TIME IN THIS DIVISION</small></div>
  {rows.filter(r=>r.f).map((r,i)=><button key={r.f!.id} onClick={()=>onFighter(r.f!.id)}><span className="dv-rec-n">{i+1}</span><Avatar fighter={r.f!} size={30}/><span className="dv-rec-name"><b><Flag code={r.f!.flag}/>{r.f!.name}</b>{(r.sub||r.f!.status==='retired')&&<small>{r.sub??''}{r.f!.status==='retired'?`${r.sub?' · ':''}retired`:''}</small>}</span><strong>{r.value}</strong></button>)}
  {rows.length===0&&<p className="empty-msg">{empty}</p>}</div>;
}
export {RankTag};
