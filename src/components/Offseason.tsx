import {useMemo,useState} from 'react';
import {ArrowDownRight,ArrowUpRight,Award,Sparkles,TrendingDown,TrendingUp,UserMinus,UserPlus} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {Heading,PageHead,RarityPill} from './ui';
import {ageOf,baseOf,overallOf} from '../engine/career';
import {START_YEAR,RARITY_COLORS,isTopDivision,isSecondDivision} from '../engine/constants';
import {CONTINENTAL_BELTS,topReigns} from '../engine/belts';
import type {Fighter,World} from '../engine/types';
import './offseason.css';

const RARITY_ORDER=['Generational','Legend','Epic','Rare','Uncommon','Common'];

/** Everything that changed between two seasons: who left, who arrived, who moved, who grew. */
export function Offseason({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
 const years=Array.from({length:world.year-START_YEAR},(_,i)=>world.year-i);
 const [year,setYear]=useState(years[0]??world.year);
 const data=useMemo(()=>{
  const retired=world.fighters.filter(f=>f.retiredYear===year).sort((a,b)=>RARITY_ORDER.indexOf(a.rarity)-RARITY_ORDER.indexOf(b.rarity)||(b.fame||0)-(a.fame||0));
  const rookies=year>START_YEAR?world.fighters.filter(f=>f.joinedYear===year).sort((a,b)=>RARITY_ORDER.indexOf(a.rarity)-RARITY_ORDER.indexOf(b.rarity)||baseOf(b,year)-baseOf(a,year)):[];
  const moves=world.events.filter(e=>e.year===year&&(e.type==='promotion'||e.type==='relegation'));
  const hof=world.hallOfFame.filter(h=>h.inductedYear===year);
  const active=world.fighters.filter(f=>f.joinedYear<year&&(f.status==='active'||(f.retiredYear??0)>year));
  const delta=active.map(f=>({f,d:baseOf(f,year)-baseOf(f,year-1)}));
  const up=[...delta].sort((a,b)=>b.d-a.d).slice(0,8),down=[...delta].sort((a,b)=>a.d-b.d).slice(0,8);
  return {retired,rookies,moves,hof,up,down};
 },[world,year]);
 const f=(id:string)=>world.fighters.find(x=>x.id===id);
 if(world.year===START_YEAR)return <><PageHead tag="BETWEEN SEASONS" title="The" accent="Offseason." description="Retirements, new prospects, promotions and development appear here once the first season is complete."/><div className="panel empty-msg">Finish the {START_YEAR} season to see the first offseason.</div></>;
 return <div className="os-page">
  <PageHead tag="BETWEEN SEASONS" title="The" accent="Offseason." description="Who walked away, who arrived, who moved between divisions and whose ability grew or faded over the winter." end={<label className="cal-year">OFFSEASON<select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y-1} → {y}</option>)}</select></label>}/>
  <div className="os-counts">
   <div><UserMinus size={18}/><b>{data.retired.length}</b><small>RETIRED</small></div>
   <div><UserPlus size={18}/><b>{data.rookies.length}</b><small>NEW PROSPECTS</small></div>
   <div><ArrowUpRight size={18}/><b>{data.moves.filter(m=>m.type==='promotion').length}</b><small>PROMOTIONS</small></div>
   <div><ArrowDownRight size={18}/><b>{data.moves.filter(m=>m.type==='relegation').length}</b><small>RELEGATIONS</small></div>
   <div><Award size={18}/><b>{data.hof.length}</b><small>HALL OF FAME</small></div>
  </div>
  {data.hof.length>0&&<section className="panel os-hof"><Heading eyebrow={`CLASS OF ${year}`} title="Hall of Fame inductees"/>{data.hof.map(h=>{const x=f(h.fighterId);return x&&<button key={h.fighterId} onClick={()=>onFighter(x.id)}><Avatar fighter={x} size={70}/><span><b><Flag code={x.flag}/>{x.name}</b><small>{x.style} · {x.joinedYear}–{x.retiredYear??'active'} · {x.record.wins}-{x.record.losses}-{x.record.draws}</small><em>{h.reason}</em></span><strong>{h.score}<small>LEGACY</small></strong></button>;})}</section>}
  <section className="panel"><Heading eyebrow={`${data.retired.length} CAREERS ENDED`} title="Retired"/>
   {data.retired.length?<div className="table-wrap"><table className="os-table"><thead><tr><th>FIGHTER</th><th>RARITY</th><th>YEARS ACTIVE</th><th>PEAK</th><th>RECORD</th><th>TITLES</th><th>FAME</th></tr></thead><tbody>{data.retired.map(x=>{const peak=x.history.reduce((m,h)=>h.overall>m.overall?h:m,x.history[0]);const best=x.history.reduce((m,h)=>tierOf(h.division)<tierOf(m.division)||(tierOf(h.division)===tierOf(m.division)&&h.rank<m.rank)?h:m,x.history[0]);
    const crowns=topReigns(world).filter(r=>r.fighterId===x.id&&r.via!=='split').length,cont=CONTINENTAL_BELTS.reduce((n,b)=>n+world.belts[b].reigns.filter(r=>r.fighterId===x.id).length,0),tour=world.tournaments.filter(t=>t.winnerId===x.id).length;
    return <tr key={x.id} onClick={()=>onFighter(x.id)} className="table-row-action"><td><div className="table-fighter"><Avatar fighter={x} size={38}/><div className="table-fighter-text"><strong>{x.name}</strong><small><Flag code={x.flag}/>{x.country} · {x.style} · retired at {ageOf(x,year)}</small></div></div></td><td><RarityPill rarity={x.rarity}/></td><td>{x.joinedYear}–{year-1}<small className="os-sub">{year-x.joinedYear} seasons</small></td><td><b>{peak?.overall}</b><small className="os-sub">{best?`${best.division} ${best.rank===0?'C':`#${best.rank}`}`:''}</small></td><td>{x.record.wins}-{x.record.losses}-{x.record.draws}<small className="os-sub">{x.record.kos} KO · {x.record.submissions} SUB</small></td><td>{crowns+cont+tour?<span className="os-titles">{crowns>0&&<i>{crowns}× World title</i>}{cont>0&&<i>{cont}× Cont.</i>}{tour>0&&<i>{tour}× Tourn.</i>}</span>:<span className="dim">—</span>}</td><td><b>{x.fame||0}</b></td></tr>;})}</tbody></table></div>:<p className="empty-msg">Nobody retired this offseason.</p>}
  </section>
  <section className="panel"><Heading eyebrow={`${data.rookies.length} DEBUTS`} title="New prospects" end={<span className="os-legend">{RARITY_ORDER.map(r=>{const n=data.rookies.filter(x=>x.rarity===r).length;return n>0&&<span key={r} style={{color:RARITY_COLORS[r as Fighter['rarity']]}}>{n} {r}</span>;})}</span>}/>
   <div className="os-rookies">{data.rookies.map(x=><button key={x.id} className={`os-rookie rarity-${x.rarity.toLowerCase()}`} onClick={()=>onFighter(x.id)}><Avatar fighter={x} size={56}/><span><b><Flag code={x.flag}/>{x.name}</b><small>{x.style} · Age {ageOf(x,year)} · {x.region}</small><RarityPill rarity={x.rarity}/></span><strong>{overallOf(x,world.year)}<small>OVR</small></strong></button>)}{!data.rookies.length&&<p className="empty-msg">No new fighters joined.</p>}</div>
  </section>
  <div className="os-two">
   <section className="panel"><Heading eyebrow="ANNUAL ASSESSMENT" title="Promotions and relegations"/>
    <div className="os-moves">{data.moves.map((m,i)=>{const x=f(m.fighterId);return x&&<button key={`${m.fighterId}-${i}`} onClick={()=>onFighter(x.id)}><span className={m.type==='promotion'?'up':'down'}>{m.type==='promotion'?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}</span><Avatar fighter={x} size={30}/><span className="os-move-text"><b><Flag code={x.flag}/>{x.name}</b><small>{m.description}</small></span></button>;})}{!data.moves.length&&<p className="empty-msg">No division changes.</p>}</div>
   </section>
   <section className="panel"><Heading eyebrow="DEVELOPMENT" title="Ability changes over the winter"/>
    <div className="os-dev"><Mover title="Fastest improving" icon={<TrendingUp size={15}/>} rows={data.up} onFighter={onFighter} year={year}/><Mover title="Largest declines" icon={<TrendingDown size={15}/>} rows={data.down} onFighter={onFighter} year={year}/></div>
   </section>
  </div>
  <p className="os-note"><Sparkles size={14}/> Base ability follows each fighter’s private career curve; it changes once a year, at the turn of the season.</p>
 </div>;
}
const tierOf=(d:string)=>isTopDivision(d)?0:isSecondDivision(d)?1:d.endsWith('D1')?2:3;
function Mover({title,icon,rows,onFighter,year}:{title:string;icon:React.ReactNode;rows:{f:Fighter;d:number}[];onFighter:(id:string)=>void;year:number}){
 return <div className="os-mover"><h3>{icon}{title}</h3>{rows.map(({f,d})=><button key={f.id} onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={30}/><span><b><Flag code={f.flag}/>{f.name}</b><small>Age {ageOf(f,year)} · base {baseOf(f,year)}</small></span><strong className={d>0?'positive':d<0?'negative':'dim'}>{d>0?'+':''}{d}</strong></button>)}</div>;
}
