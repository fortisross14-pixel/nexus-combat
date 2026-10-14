import {useMemo,useState} from 'react';
import {ArrowRight,ChevronRight,Crown,Medal,Swords,Trophy} from 'lucide-react';
import {Flag} from './Flag';
import {PageHead,whenFrom} from './ui';
import {CALENDAR,MONTHS,MONTH_OF,WEEKS,BIG_OF} from '../engine/competition';
import {isContinentalRound,isWorldTitleRound,BELT_SHORT} from '../engine/belts';
import {eventNameAt,kindAt} from '../engine/tournaments';
import {EventLogo,identityFor} from './EventIdentity';
import {REGIONS} from '../engine/constants';
import type {Division,LedgerEntry,World} from '../engine/types';
import './calendar.css';

type Scope='World tier'|'Continental'|'All';
const REGION_OF=(d:Division)=>d.startsWith('AMERICAS')?'Americas':d.startsWith('EUROPE')?'Europe & Middle East':d.startsWith('AFRICA')?'Africa':d.startsWith('APAC')?'APAC':null;
const DIV_LABEL=(d:Division)=>d==='S-TIER'?'S Division':d==='GLOBAL D2'?'Division II':d.endsWith('D1')?'Division I':'Division II';

/** What is decided at a calendar slot. */
export function stakesAt(year:number,i:number):{label:string;kind:'world'|'continental'|'eliminator'|'tournament'}|null{
 const t=kindAt(year,i);
 if(t)return {label:t==='OLYMPIAD'?'OLYMPIAD':t==='CRUCIBLE'?'GRAND PRIX':'ROYALE',kind:'tournament'};
 if(isWorldTitleRound(i))return {label:'WORLD CROWN',kind:'world'};
 if(isContinentalRound(i))return {label:'CONTINENTAL TITLES',kind:'continental'};
 if(CALENDAR[i].kind==='major')return {label:'TITLE ELIMINATOR',kind:'eliminator'};
 return null;
}

export function FightCalendar({world,onPrepare,onFighter,onFight,onTournaments}:{world:World;onPrepare:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;onTournaments:()=>void}){
 const years=useMemo(()=>[...new Set([...Object.keys(world.ledger).map(Number),world.year])].sort((a,b)=>b-a),[world.ledger,world.year]);
 const [year,setYear]=useState(world.year);
 const [month,setMonth]=useState(MONTH_OF(world.round));
 const [scope,setScope]=useState<Scope>('World tier');
 const [open,setOpen]=useState<number|null>(null);
 const ledger=world.ledger[year]||[];
 const isCurrent=year===world.year;
 const name=(id:string)=>world.fighters.find(f=>f.id===id);
 const keyDates=Array.from({length:12},(_,m)=>BIG_OF(m)).map(i=>({i,stakes:stakesAt(year,i)})).filter(x=>x.stakes&&x.stakes.kind!=='eliminator');
 const continental=CALENDAR.map((_,i)=>i).filter(i=>isContinentalRound(i));
 return <section className="cal-page">
  <PageHead tag="OFFICIAL NEXUS SCHEDULE" title="Fight" accent="Calendar." description="Four events a month: three weekly cards and the month’s big event. World Crown nights in March, June and December; continental title nights on the third week of February, May, August and November." end={<label className="cal-year">SEASON<select value={year} onChange={e=>{setYear(Number(e.target.value));setOpen(null);}}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>}/>
  <div className="cal-months" role="tablist">{MONTHS.map((m,i)=>{const done=!isCurrent||i<MONTH_OF(world.round);const now=isCurrent&&i===MONTH_OF(world.round);return <button role="tab" aria-selected={month===i} key={m} className={`${month===i?'active':''} ${now?'now':''} ${done&&isCurrent?'done':''}`} onClick={()=>{setMonth(i);setOpen(null);}}>{m}{stakesAt(year,BIG_OF(i))?.kind==='world'&&<Crown size={11}/>}{stakesAt(year,BIG_OF(i))?.kind==='tournament'&&<Trophy size={11}/>}</button>;})}</div>
  <div className="cal-layout">
   <div className="cal-events">
    <div className="cal-scope">{(['World tier','Continental','All'] as Scope[]).map(s=><button key={s} className={scope===s?'active':''} onClick={()=>setScope(s)}>{s}</button>)}</div>
    {Array.from({length:WEEKS},(_,w)=>month*WEEKS+w).map(i=>{
     const e=CALENDAR[i];const special=eventNameAt(year,i);const ident=identityFor(special||e.name,isContinentalRound(i));const stakes=stakesAt(year,i);
     const played=!isCurrent||i<world.round;const next=isCurrent&&i===world.round;
     const rows=ledger.filter(x=>x.e===i+1);
     const shown=rows.filter(x=>scope==='All'||(scope==='World tier'?(x.d==='S-TIER'||x.d==='GLOBAL D2'):(x.d!=='S-TIER'&&x.d!=='GLOBAL D2')));
     const t=world.tournaments.find(x=>x.year===year&&kindAt(year,i)===x.kind);
     const expanded=open===i||next;
     return <article key={i} className={`cal-event ${e.kind==='major'?'major':''} ${next?'next':''} ${played?'played':''}`}>
      <button className="cal-event-head" onClick={()=>setOpen(open===i?null:i)}>
       <span className="cal-date"><small>{e.month}</small><b>{e.kind==='major'?'★':`W${e.week}`}</b></span>
       {e.kind==='major'||isContinentalRound(i)?<EventLogo id={ident} size={36}/>:<span className="cal-logo-gap"/>}
       <span className="cal-title"><strong>{special||e.name}</strong><small>{e.kind==='major'?(special?'Tournament':e.label):isContinentalRound(i)?'Weekly card · continental title night':'Weekly card'}</small></span>
       {stakes&&<span className={`cal-stake ${stakes.kind}`}>{stakes.kind==='tournament'?<Trophy size={11}/>:<Crown size={11}/>}{stakes.label}</span>}
       <span className="cal-status">{played?`${rows.length} bouts`:next?(world.pendingCard||world.pendingFight?'CARD READY':'NEXT'):isCurrent?whenFrom(world,year,i):'—'}</span>
       <ChevronRight size={15} className={`cal-chevron ${expanded?'open':''}`}/>
      </button>
      {expanded&&<div className="cal-event-body">
       {next&&<div className="cal-next"><span>{special?'The tournament opens here.':world.pendingCard||world.pendingFight?'The card is set. Choose which fights to watch.':'Prepare the event to reveal its card.'}</span><button className="btn btn-primary" onClick={special?onTournaments:onPrepare}>{special?'Open tournament':world.pendingCard||world.pendingFight?'Go to the event':'Prepare the event'} <ArrowRight size={15}/></button></div>}
       {!played&&!next&&<Upcoming world={world} year={year} i={i}/>}
       {played&&t&&<button className="cal-tournament" onClick={onTournaments}><Medal size={16}/><span>{t.winnerId?<><b>{name(t.winnerId)?.name}</b> wins the {year} {special}</>:'Tournament in progress'}</span><ArrowRight size={14}/></button>}
       {played&&!t&&<Results rows={shown} world={world} scope={scope} onFight={onFight} onFighter={onFighter}/>}
       {played&&!t&&shown.length===0&&<p className="cal-empty">{rows.length?`No ${scope.toLowerCase()} bouts on this card. Switch the filter above.`:'No bouts recorded.'}</p>}
      </div>}
     </article>;})}
   </div>
   <aside className="cal-side panel">
    <div className="eyebrow">{year} · KEY DATES</div>
    {keyDates.map(({i,stakes})=><div key={i} className={`cal-key ${isCurrent&&i<world.round?'past':''}`}><span>{CALENDAR[i].month}</span><b>{eventNameAt(year,i)||CALENDAR[i].name}</b><em className={stakes!.kind}>{stakes!.label}</em></div>)}
    <div className="eyebrow cal-side-sub">CONTINENTAL TITLE NIGHTS</div>
    {continental.map(i=><div key={i} className={`cal-key ${isCurrent&&i<world.round?'past':''}`}><span>{CALENDAR[i].month}</span><b>Week {CALENDAR[i].week}</b><em className="continental">4 BELTS</em></div>)}
   </aside>
  </div>
 </section>;
}
function Upcoming({world,year,i}:{world:World;year:number;i:number}){
 const f=(id:string)=>world.fighters.find(x=>x.id===id);
 const month=MONTH_OF(i);
 const res=world.marqueeReservation;
 const booked=CALENDAR[i].kind==='major'&&res&&res.year===year&&res.month===month?res:null;
 const nights=isContinentalRound(i)&&world.beltReservations&&world.beltReservations.year===year&&world.beltReservations.month===month?world.beltReservations:null;
 if(booked){const a=f(booked.a),b=f(booked.b);return <div className="cal-booked"><span className="eyebrow">MAIN EVENT BOOKED</span>{a&&b&&<b><Flag code={a.flag}/>{a.name} <i>vs</i> <Flag code={b.flag}/>{b.name}</b>}<small>{booked.kind==='title'?'World Crown':booked.kind==='eliminator'?'Title eliminator':booked.kind==='unification'?'Unification':booked.kind==='interim'?'Interim title':'Main event'}</small></div>;}
 if(nights)return <div className="cal-booked"><span className="eyebrow">TITLE FIGHTS BOOKED</span>{Object.entries(nights.pairs).map(([belt,pair])=>pair&&<b key={belt}>{BELT_SHORT[belt as keyof typeof BELT_SHORT]}: {f(pair[0])?.name} <i>vs</i> {f(pair[1])?.name}</b>)}</div>;
 return <p className="cal-empty">{CALENDAR[i].kind==='major'?'The main event is booked at the start of the month.':'Cards are made the week of the event.'}</p>;
}
function Results({rows,world,scope,onFight,onFighter}:{rows:LedgerEntry[];world:World;scope:Scope;onFight:(id:string)=>void;onFighter:(id:string)=>void}){
 const f=(id:string)=>world.fighters.find(x=>x.id===id);
 const groups=new Map<string,LedgerEntry[]>();
 for(const r of [...rows].sort((a,b)=>Number(!!b.bt)-Number(!!a.bt))){
  const key=r.bt&&r.bt!=='WORLD'?'Continental titles':r.d==='S-TIER'?'S Division':r.d==='GLOBAL D2'?'Division II':`${REGION_OF(r.d)} · ${DIV_LABEL(r.d)}`;
  (groups.get(key)??groups.set(key,[]).get(key)!).push(r);
 }
 const order=['S Division','Division II','Continental titles',...REGIONS.flatMap(rg=>[`${rg} · Division I`,`${rg} · Division II`])];
 return <div className="cal-results">{order.filter(k=>groups.has(k)).map(k=><div key={k} className="cal-group"><div className="cal-group-head">{k}<small>{groups.get(k)!.length}</small></div>
  {groups.get(k)!.slice(0,scope==='All'&&!k.startsWith('S')&&!k.startsWith('Division II')&&!k.startsWith('Continental')?6:40).map(r=>{const a=f(r.a),b=f(r.b),w=r.w;return <div key={r.i} className="cal-bout">
   <button className={w===r.a?'won':w?'lost':''} onClick={()=>a&&onFighter(a.id)}><Flag code={a?.flag}/>{a?.name}</button><i>vs</i><button className={w===r.b?'won':w?'lost':''} onClick={()=>b&&onFighter(b.id)}><Flag code={b?.flag}/>{b?.name}</button>
   <button className="cal-method" onClick={()=>onFight(r.i)}>{r.bt&&<Crown size={11}/>}{r.m} · R{r.r}<Swords size={11}/></button></div>;})}
 </div>)}</div>;
}
