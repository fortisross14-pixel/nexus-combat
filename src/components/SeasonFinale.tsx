import {useEffect} from 'react';
import {Flag} from './Flag';
import {ArrowRight,BarChart3,CalendarDays,Crown,Flame,Medal,Sparkles,Trophy,X} from 'lucide-react';
import {Avatar} from './Avatar';
import type {World} from '../engine/types';
import {BELT_SHORT,CONTINENTAL_BELTS} from '../engine/belts';

/** Presentation-only ceremony. Awards and wins are always read from the completed simulation. */
export function SeasonFinale({world,year,onClose}:{world:World;year:number;onClose:()=>void}){
  const season=world.seasons.find(s=>s.year===year);
  const awards=world.awards.find(a=>a.year===year);
  const completedReign=world.crown.reigns.filter(r=>r.startYear<=year&&(!r.endYear||r.endYear>year||(r.endYear===year&&(r.endRound??0)>=48))).at(-1);
  const champion=world.fighters.find(f=>f.id===completedReign?.fighterId);
  const athlete=(id:string|null|undefined)=>world.fighters.find(f=>f.id===id);
  const highlights=[
    {label:'FIGHTER OF THE YEAR',id:awards?.fighterOfYear,icon:<Trophy size={17}/>},
    {label:'BREAKTHROUGH',id:awards?.breakthrough,icon:<Flame size={17}/>},
    {label:'THE CRUCIBLE CHAMPION',id:world.tournaments.find(t=>t.year===year&&t.kind==='CRUCIBLE')?.winnerId,icon:<Medal size={17}/>}
  ];
  const moments=world.iconicMoments.filter(m=>m.year===year).slice(0,2);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onClose]);
  return <div className="finale-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="finale-stage" role="dialog" aria-modal="true" aria-labelledby="finale-heading">
      <div className="finale-particles" aria-hidden="true">{Array.from({length:22},(_,i)=><i key={i} style={{'--i':i,'--x':`${(i*53)%96}%`,'--delay':`${(i*0.17)%2.7}s`} as React.CSSProperties}/>)}</div>
      <div className="finale-bar"><span><Sparkles size={15}/> NEXUS ANNUAL HONORS</span><button aria-label="Dismiss season ceremony" onClick={onClose}><X size={18}/></button></div>
      <div className="finale-main"><div className="finale-date"><CalendarDays size={17}/> THE YEAR IN COMBAT</div><div className="finale-year" aria-hidden="true">{year}</div><h2 id="finale-heading">A season becomes <em>history.</em></h2><p>The fights are decided. The records remain. The next generation is waiting.</p>
        <div className="finale-figures"><div><strong>{(season?.fights??(world.ledger[year]||[]).length).toLocaleString()}</strong><span>OFFICIAL BOUTS</span></div><div><strong>{season?.knockouts??(world.ledger[year]||[]).filter(e=>e.m==='KO'||e.m==='TKO').length}</strong><span>KNOCKOUTS</span></div><div><strong>{season?.submissions??(world.ledger[year]||[]).filter(e=>e.m==='SUB').length}</strong><span>SUBMISSIONS</span></div></div>
        <div className="finale-board"><div className="finale-honors"><div className="finale-section-tag"><Trophy size={15}/> SEASON HONORS</div>{highlights.map(item=>{const fighter=athlete(item.id);return <div className="finale-honor" key={item.label}><span>{item.icon}</span><div><small>{item.label}</small><strong>{fighter?fighter.name:'Not awarded'}</strong></div>{fighter&&<span className="finale-flag"><Flag code={fighter.flag}/></span>}</div>})}</div><div className="finale-crown"><div className="finale-section-tag"><Crown size={15}/> THE WORLD CROWN</div>{champion?<><div className="finale-champion"><Avatar fighter={champion} size={122}/></div><strong>{champion.name}</strong><small><Flag code={champion.flag}/> · {champion.style}</small></>:<><div className="finale-vacant"><Crown size={35}/></div><strong>World Crown vacant</strong><small>The next title fight awaits</small></>}</div></div>
        {(()=>{const cont=CONTINENTAL_BELTS.map(b=>({b,id:world.belts[b].reigns.filter(r=>r.startYear<=year&&(!r.endYear||r.endYear>year)).at(-1)?.fighterId})).filter(x=>x.id);return cont.length>0&&<div className="finale-moments"><span><Crown size={14}/> CONTINENTAL CHAMPIONS</span>{cont.map(x=><strong key={x.b}>{BELT_SHORT[x.b]}: {athlete(x.id)?.name}</strong>)}</div>;})()}
        {moments.length>0&&<div className="finale-moments"><span><BarChart3 size={14}/> DEFINING MOMENTS</span>{moments.map(m=><strong key={m.id}>{m.title}</strong>)}</div>}
        <button className="finale-continue" onClick={onClose}>ENTER {world.year} <ArrowRight size={18}/></button>
      </div>
      <div className="finale-bottom"><span>ONE UNIVERSE · INFINITE STORIES</span><span>OFFICIAL NEXUS CHRONICLE</span></div>
    </section>
  </div>;
}
