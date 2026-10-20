import {useMemo} from 'react';
import {BrandLogo} from './BrandLogo';
import {ArrowRight,CalendarClock,Swords} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {whenFrom} from './ui';
import {LastEvent,boutTags} from './EventNight';
import {BoardNum,Lamp,ModuleHead} from './board';
import {Corner,Staff,rankLine} from './Bout';
import {CALENDAR,MONTH_OF,ROUNDS_PER_YEAR,BIG_OF,SURGE_ROUND,OLYMPIAD_ROUND,CRUCIBLE_ROUND} from '../engine/competition';
import {BELT_NAMES,CONTINENTAL_BELTS,isContinentalRound,titleBrandAt,PINNACLE_ROUND,DOUBLES_ROUND} from '../engine/belts';
import {BRANDS,BRAND_INFO,TOP_DIVISION} from '../engine/constants';
import {eventNameAt,kindAt} from '../engine/tournaments';
import {reignDuration} from '../engine/legacy';
import {overallOf} from '../engine/career';
import {forecastBout,recentResults} from '../engine/forecast';
import {EventLogo,identityFor,identityStyle} from './EventIdentity';
import type {BeltId,Brand,CrownState,TournamentKind,World} from '../engine/types';
import './home.css';

/** First calendar slot from now (this event included) that matches. */
function nextSlot(world:World,match:(year:number,round:number)=>boolean){
 for(let k=0;k<ROUNDS_PER_YEAR*4;k++){const abs=world.round+k,year=world.year+Math.floor(abs/ROUNDS_PER_YEAR),round=abs%ROUNDS_PER_YEAR;if(match(year,round))return {year,round};}
 return null;
}
const TOURNEY:{kind:TournamentKind;name:string;round:number;cadence:string}[]=[
 {kind:'SURGE',name:'The Surge',round:SURGE_ROUND,cadence:'Every April'},
 {kind:'OLYMPIAD',name:'Olympiad',round:OLYMPIAD_ROUND,cadence:'Every 4 years · August'},
 {kind:'CRUCIBLE',name:'The Crucible',round:CRUCIBLE_ROUND,cadence:'August · except Olympiad years'}];
const slotName=(year:number,round:number)=>eventNameAt(year,round)||CALENDAR[round].name;
const dateText=(at:{year:number;round:number}|null)=>at?`${CALENDAR[at.round].month} ${at.year}`:'';

export function Overview({world,onFighter,onFight,onEvent,onNav}:{world:World;onFighter:(id:string)=>void;onFight:(id:string)=>void;onEvent:()=>void;onNav:(page:'Event Calendar'|'Tournaments'|'Divisions'|'Fight Night')=>void}){
 const f=(id?:string|null)=>id?world.fighters.find(x=>x.id===id):undefined;
 const slot=CALENDAR[world.round];const special=eventNameAt(world.year,world.round);
 const ident=identityFor(special||slot.name,isContinentalRound(world.round));
 const card=world.pendingCard??(world.pendingFight?[world.pendingFight]:null);
 // The bout to highlight: the prepared main event, or the main event already booked for this month's big event.
 const res=world.marquees,first=res&&res.year===world.year&&res.month===MONTH_OF(world.round)?res.list[0]:undefined;
 const booked=card?.[0]?{a:card[0].fighterA,b:card[0].fighterB,kind:card[0].kind,title:card[0].titleFight,brand:card[0].belt as string|undefined,at:{year:world.year,round:world.round}}:
  first?{a:first.a,b:first.b,kind:first.kind,title:first.kind==='title',brand:first.brand as string|undefined,at:{year:world.year,round:BIG_OF(res!.month)}}:null;
 const ba=f(booked?.a),bb=f(booked?.b);
 const titleLabel=(k?:string,title?:boolean)=>k==='pinnacle'?'The Pinnacle unifier':k==='contract'?'Title-shot contract':k==='unification'?`${booked?.brand??''} title unification`:k==='interim'?`Interim ${booked?.brand??''} title`:title||k==='title'?`${booked?.brand??''} world title`:k==='eliminator'?'Title eliminator':'';
 const fiveRounds=!!booked&&(booked.title||booked.kind==='pinnacle'||booked.kind==='unification'||booked.kind==='interim');
 const chance=useMemo(()=>ba&&bb?forecastBout(ba,bb,world.year,fiveRounds?5:3,160).winA:null,[ba?.id,bb?.id,world.year,fiveRounds]);// eslint-disable-line react-hooks/exhaustive-deps
 const nextCont=nextSlot(world,(_,r)=>isContinentalRound(r));
 const nextPinnacle=nextSlot(world,(_,r)=>r===PINNACLE_ROUND),nextDoubles=nextSlot(world,(_,r)=>r===DOUBLES_ROUND||r===PINNACLE_ROUND);
 const lastPinnacle=world.pinnacle?.at(-1);const pw=f(lastPinnacle?.winnerId),pl=f(lastPinnacle?.loserId);
 const tagChamp=world.tag?.champion;const tagReign=world.tag?.reigns.at(-1);
 const shot=world.titleShot?f(world.titleShot.fighterId):undefined;
 const tb=titleBrandAt(world.round);
 const context=tb?`${tb} title on the line`:world.round===PINNACLE_ROUND?'NOVA v ONYX':world.round===DOUBLES_ROUND?'The Doubles Crown':isContinentalRound(world.round)?'Continental titles':'';
 const when=whenFrom(world,world.year,world.round);
 const actionLabel=world.activeTournamentId?'Continue tournament':card?'Go to the event':special?'Open tournament':'Prepare the event';
 const mainSlot=booked&&booked.at.round!==world.round?`Main event · ${slotName(booked.at.year,booked.at.round)}, ${CALENDAR[booked.at.round].month}`:'Main event';
 const tags=ba&&bb?boutTags(world,ba,bb,{kind:booked!.kind,titleFight:!!booked!.title,division:ba.division}).slice(0,3):[];

 return <div className="hm">
  <section className="hm-next" style={identityStyle(ident)} aria-labelledby="hm-next-title">
   <div className="hm-event">
    <EventLogo id={ident} size={64}/>
    <h1 id="hm-next-title">{special||slot.name}</h1>
    <p className="hm-event-meta">{slot.month} {world.year} · {slot.kind==='major'?'Monthly big event':`Week ${slot.week}`}{context&&<> · <b>{context}</b></>}</p>
    <p className="hm-event-tag">{ident.tagline}</p>
   </div>
   <div className="hm-bout">
    {ba&&bb?<>
     <div className="bout">
      <Corner f={ba} world={world} side="a" size={104} onFighter={onFighter}/>
      <Staff slot={mainSlot} what={titleLabel(booked!.kind,booked!.title)||undefined} rounds={fiveRounds?5:3} chance={chance}/>
      <Corner f={bb} world={world} side="b" size={104} onFighter={onFighter}/>
     </div>
     {tags.length>0&&<p className="bout-notes">{tags.map(t=><span key={t.text} className={t.hot?'is-hot':''}>{t.text}</span>)}</p>}
    </>:<p className="hm-bout-empty">{special?'A tournament takes this month’s big event. Entrants are confirmed when it opens.':'The card is made on fight week. Prepare the event to see who fights.'}</p>}
   </div>
   <div className="hm-go">
    {(()=>{const m=when.match(/(\d+)\s+(\w+)/);return m?<span className="hm-go-count"><BoardNum value={m[1]} size="l" tone="amber"/><strong className="hm-go-unit">{m[2]}</strong></span>:<strong className="hm-go-when">{when}</strong>;})()}
    <span className="hm-go-label"><Lamp tone="amber"/>Fight night</span>
    <button className="bd-btn bd-btn-next hm-go-main" onClick={onEvent}><Swords size={17}/>{actionLabel}<ArrowRight size={16}/></button>
    <button className="bd-btn" onClick={()=>onNav('Event Calendar')}><CalendarClock size={16}/>Calendar</button>
   </div>
  </section>

  <section className="hm-titles" aria-label="World titles">
   {BRANDS.map(b=><WorldTitle key={b} world={world} brand={b} state={world.crowns![b]} next={nextSlot(world,(_,r)=>titleBrandAt(r)===b)} onFighter={onFighter}/>)}
  </section>

  <section className="hm-crowns" aria-label="Crowns and contracts">
   <button className="hm-crown" onClick={()=>onNav('Fight Night')}>
    <span className="hm-crown-name">Pinnacle crown</span>
    {pw?<span className="hm-crown-holder"><Avatar fighter={pw} size={44}/><span><b><Flag code={pw.flag}/>{pw.name}</b><small>{lastPinnacle!.year}{pl?` · beat ${pl.name}`:''}</small></span></span>:<span className="hm-crown-holder is-open"><b>Not yet awarded</b><small>NOVA v ONYX in December</small></span>}
    <span className="hm-crown-next">Next · {dateText(nextPinnacle)}</span>
   </button>
   <button className="hm-crown" onClick={()=>onNav('Tournaments')}>
    <span className="hm-crown-name">Doubles crown</span>
    {tagChamp?<span className="hm-crown-holder"><span><b><Flag code={world.fighters.find(x=>x.country===tagChamp)?.flag}/>{tagChamp}</b><small>{tagReign&&!tagReign.endYear?`Since ${tagReign.startYear} · ${tagReign.defenses} defense${tagReign.defenses===1?'':'s'}`:'Country teams'}</small></span></span>:<span className="hm-crown-holder is-open"><b>Vacant</b><small>Country teams, 2 v 2</small></span>}
    <span className="hm-crown-next">Next crown tie · {dateText(nextDoubles)}</span>
   </button>
   <button className="hm-crown" onClick={()=>shot&&onFighter(shot.id)} disabled={!shot}>
    <span className="hm-crown-name">Guaranteed title shot</span>
    {shot?<span className="hm-crown-holder"><Avatar fighter={shot} size={44}/><span><b><Flag code={shot.flag}/>{shot.name}</b><small>{rankLine(shot)}</small></span></span>:<span className="hm-crown-holder is-open"><b>Unclaimed</b><small>Won in the contract bout at The Pinnacle</small></span>}
    <span className="hm-crown-next">{shot?`Cashes in at the next ${world.titleShot!.brand} title night`:'Contract bout · The Pinnacle'}</span>
   </button>
  </section>

  <section className="bd hm-standings" aria-labelledby="hm-standings">
    <ModuleHead id="hm-standings" title="Standings · S divisions" end={<button className="bd-btn bd-btn-quiet" onClick={()=>onNav('Divisions')}>All divisions<ArrowRight size={14}/></button>}/>
    <div className="hm-standings-cols">{BRANDS.map(b=><table key={b} className="bd-table hm-ladder" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}>
     <caption><BrandLogo brand={b} size={26}/>{b} S</caption>
     <thead><tr><th scope="col">Rank</th><th scope="col">Fighter</th><th scope="col" className="hm-form-col">Form</th><th scope="col" className="num">Record</th><th scope="col" className="num">OVR</th></tr></thead>
     <tbody>{world.fighters.filter(x=>x.status==='active'&&x.division===TOP_DIVISION[b]).sort((x,y)=>x.rank-y.rank).slice(0,6).map(x=><tr key={x.id}>
      <td className="hm-rank">{x.rank===0?<span className="is-champ">C</span>:x.rank}</td>
      <td><button className="bd-link" onClick={()=>onFighter(x.id)}><Flag code={x.flag}/>{x.name}</button></td>
      <td className="hm-form-col"><Form world={world} id={x.id}/></td>
      <td className="num">{x.record.wins}-{x.record.losses}-{x.record.draws}</td>
      <td className="num"><b>{overallOf(x,world.year)}</b></td></tr>)}</tbody>
    </table>)}</div>
  </section>

  <div className="hm-grid">
   <LastEvent world={world} onFight={onFight} onFighter={onFighter}/>
   <div className="hm-stack">
   <section className="bd" aria-labelledby="hm-belts">
    <ModuleHead id="hm-belts" title="Continental belts" code={nextCont?`Next defense night · ${dateText(nextCont)}`:undefined}/>
    <table className="bd-table">
     <thead><tr><th scope="col">Belt</th><th scope="col">Champion</th><th scope="col" className="num">Defenses</th><th scope="col" className="num">Reign</th></tr></thead>
     <tbody>{CONTINENTAL_BELTS.map(b=><BeltRow key={b} world={world} belt={b} state={world.belts[b]} onFighter={onFighter}/>)}</tbody>
    </table>
   </section>
   <section className="bd hm-tourneys" aria-labelledby="hm-tourneys">
    <ModuleHead id="hm-tourneys" title="Tournaments" end={<button className="bd-btn bd-btn-quiet" onClick={()=>onNav('Tournaments')}>Brackets<ArrowRight size={14}/></button>}/>
    <table className="bd-table">
     <thead><tr><th scope="col">Event</th><th scope="col">Next</th><th scope="col">Last winner</th></tr></thead>
     <tbody>{TOURNEY.map(t=>{const at=nextSlot(world,(y,r)=>r===t.round&&kindAt(y,r)===t.kind);const last=world.tournaments.filter(x=>x.kind===t.kind&&x.status==='complete').at(-1);const live=world.tournaments.find(x=>x.id===world.activeTournamentId&&x.kind===t.kind);const champ=f(last?.winnerId);const tid=identityFor(t.kind==='OLYMPIAD'?'WORLD COMBAT OLYMPIAD':t.name.toUpperCase());
      return <tr key={t.kind}>
       <td><span className="hm-tourney"><EventLogo id={tid} size={30}/><span><b>{t.name}</b><small>{t.cadence}</small></span></span></td>
       <td>{live?<span className="is-live"><Lamp tone="amber"/>In progress</span>:at?<span>{dateText(at)}<small>{whenFrom(world,at.year,at.round)}</small></span>:'—'}</td>
       <td>{champ?<button className="bd-link" onClick={()=>onFighter(champ.id)}><Flag code={champ.flag}/>{champ.name}<small>{last!.year}</small></button>:<span className="is-muted">No winner yet</span>}</td>
      </tr>;})}</tbody>
    </table>
   </section>
   </div>
  </div>
 </div>;
}

/** Last five results as lamps, oldest first. */
function Form({world,id}:{world:World;id:string}){
 const last=recentResults(world,id,5).reverse();
 if(!last.length)return <span className="is-muted">—</span>;
 return <span className="form" role="img" aria-label={`Last ${last.length}: ${last.map(r=>r.result).join(' ')}`}>{last.map((r,i)=><Lamp key={i} tone={r.result==='W'?'win':r.result==='L'?'loss':'off'}/>)}</span>;
}

/** A brand's world title: the champion, and how long and how well they have held it. */
function WorldTitle({world,brand,state,next,onFighter}:{world:World;brand:Brand;state:CrownState;next:{year:number;round:number}|null;onFighter:(id:string)=>void}){
 const champ=world.fighters.find(x=>x.id===state.championId);
 const interim=world.fighters.find(x=>x.id===state.interimId);
 const mandatory=world.fighters.find(x=>x.id===state.mandatoryId);
 const reign=state.reigns.at(-1);const current=reign&&!reign.endYear?reign:undefined;
 return <article className="hm-title" style={{'--brand':BRAND_INFO[brand].color} as React.CSSProperties} aria-labelledby={`title-${brand}`}>
  <header className="hm-title-head"><BrandLogo brand={brand} size={34}/><h2 id={`title-${brand}`}>{brand} world title</h2><span>{BRAND_INFO[brand].tagline}</span></header>
  {champ?<div className="hm-title-body">
   <button className="hm-title-champ" onClick={()=>onFighter(champ.id)}>
    <Avatar fighter={champ} size={112}/>
    <span><strong>{champ.name}</strong><span className="hm-title-label"><Lamp tone="title"/>Champion{current?` since ${current.startYear}`:''}</span><small><Flag code={champ.flag}/>{champ.country} · {champ.style}</small><small>{champ.record.wins}-{champ.record.losses}-{champ.record.draws} · OVR {overallOf(champ,world.year)}</small></span>
   </button>
   <dl className="hm-title-figs">
    <div><dt>Days as champion</dt><dd><BoardNum value={current?reignDuration(world,current):0} size="l" tone="title"/></dd></div>
    <div><dt>Defenses</dt><dd><BoardNum value={current?.defenses??0} size="l"/></dd></div>
    <div><dt>Since</dt><dd><BoardNum value={current?.startYear??'—'} size="l" tone="dim"/></dd></div>
   </dl>
  </div>:<div className="hm-title-body is-vacant"><div className="hm-title-vacant"><strong className="hm-vacant">Vacant</strong><p>{next?`The first ${brand} champion is crowned at ${slotName(next.year,next.round)}, ${dateText(next)}.`:`The ${brand} title has no holder.`}</p></div></div>}
  <footer className="hm-title-foot">
   {interim&&<span>Interim <button className="bd-link" onClick={()=>onFighter(interim.id)}>{interim.name}</button></span>}
   {mandatory&&<span>Next challenger <button className="bd-link" onClick={()=>onFighter(mandatory.id)}>{mandatory.name}</button></span>}
   <span>Next title fight · {next?`${slotName(next.year,next.round)}, ${dateText(next)} · ${whenFrom(world,next.year,next.round)}`:'—'}</span>
  </footer>
 </article>;
}

function BeltRow({world,belt,state,onFighter}:{world:World;belt:BeltId;state:CrownState;onFighter:(id:string)=>void}){
 const champ=world.fighters.find(x=>x.id===state.championId);
 const reign=state.reigns.at(-1);const current=reign&&!reign.endYear?reign:undefined;
 return <tr>
  <th scope="row">{BELT_NAMES[belt].replace(' Continental Belt','')}</th>
  <td>{champ?<button className="bd-link" onClick={()=>onFighter(champ.id)}><Flag code={champ.flag}/>{champ.name}</button>:<span className="is-muted">Vacant</span>}</td>
  <td className="num">{current?.defenses??'—'}</td>
  <td className="num">{current?`${reignDuration(world,current)} d`:'—'}</td>
 </tr>;
}
