import {ArrowRight,CalendarClock,Crown,Medal,Swords} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {Heading,FighterLine,RankTag,whenFrom} from './ui';
import {LastEvent,boutTags} from './EventNight';
import {CALENDAR,MONTH_OF,ROUNDS_PER_YEAR,BIG_OF,SURGE_ROUND,OLYMPIAD_ROUND,CRUCIBLE_ROUND} from '../engine/competition';
import {BELT_NAMES,CONTINENTAL_BELTS,isContinentalRound,isWorldTitleRound} from '../engine/belts';
import {eventNameAt,kindAt} from '../engine/tournaments';
import {reignDuration} from '../engine/legacy';
import {overallOf} from '../engine/career';
import {EventLogo,identityFor} from './EventIdentity';
import type {BeltId,CrownState,TournamentKind,World} from '../engine/types';
import './overview.css';

/** First calendar slot from now (this event included) that matches. */
function nextSlot(world:World,match:(year:number,round:number)=>boolean){
 for(let k=0;k<ROUNDS_PER_YEAR*4;k++){const abs=world.round+k,year=world.year+Math.floor(abs/ROUNDS_PER_YEAR),round=abs%ROUNDS_PER_YEAR;if(match(year,round))return {year,round};}
 return null;
}
const TOURNEY:{kind:TournamentKind;name:string;round:number}[]=[{kind:'SURGE',name:'THE SURGE',round:SURGE_ROUND},{kind:'OLYMPIAD',name:'WORLD COMBAT OLYMPIAD',round:OLYMPIAD_ROUND},{kind:'CRUCIBLE',name:'THE CRUCIBLE',round:CRUCIBLE_ROUND}];

export function Overview({world,onFighter,onFight,onEvent,onNav}:{world:World;onFighter:(id:string)=>void;onFight:(id:string)=>void;onEvent:()=>void;onNav:(page:'Event Calendar'|'Tournaments'|'Divisions'|'Fight Night')=>void}){
 const f=(id?:string|null)=>id?world.fighters.find(x=>x.id===id):undefined;
 const slot=CALENDAR[world.round];const special=eventNameAt(world.year,world.round);
 const ident=identityFor(special||slot.name,isContinentalRound(world.round));
 const card=world.pendingCard??(world.pendingFight?[world.pendingFight]:null);
 // The bout to highlight: the prepared main event, or the main event already booked for this month's big event.
 const res=world.marqueeReservation;
 const booked=card?.[0]?{a:card[0].fighterA,b:card[0].fighterB,kind:card[0].kind,title:card[0].titleFight,at:{year:world.year,round:world.round}}:
  res&&res.year===world.year&&res.month===MONTH_OF(world.round)?{a:res.a,b:res.b,kind:res.kind,title:res.kind==='title',at:{year:world.year,round:BIG_OF(res.month)}}:null;
 const ba=f(booked?.a),bb=f(booked?.b);
 const titleLabel=(k?:string,title?:boolean)=>k==='unification'?'World Crown unification':k==='interim'?'Interim World Crown':title||k==='title'?'World Crown':k==='eliminator'?'Title eliminator':'';
 const nextWorld=nextSlot(world,(_,r)=>isWorldTitleRound(r));
 const nextCont=nextSlot(world,(_,r)=>isContinentalRound(r));
 const sTier=world.fighters.filter(x=>x.status==='active'&&x.division==='S-TIER').sort((a,b)=>a.rank-b.rank);
 return <div className="ov-page">
  <div className="ov-top">
   <section className="panel ov-next themed-soft">
    <div className="ov-next-head"><EventLogo id={ident} size={54}/><div><div className="eyebrow">NEXT EVENT · {whenFrom(world,world.year,world.round).toUpperCase()}</div><h2>{special||slot.name}</h2><small>{slot.month} {world.year} · {slot.kind==='major'?'Monthly big event':`Week ${slot.week}`}{isWorldTitleRound(world.round)?' · World Crown on the line':isContinentalRound(world.round)?' · Continental titles':''}</small></div></div>
    {ba&&bb?<div className="ov-highlight"><div className="eyebrow">{booked!.at.round===world.round?'MAIN EVENT':`MAIN EVENT OF ${(eventNameAt(booked!.at.year,booked!.at.round)||CALENDAR[booked!.at.round].name)} · ${CALENDAR[booked!.at.round].month}`} {titleLabel(booked!.kind,booked!.title)?` · ${titleLabel(booked!.kind,booked!.title).toUpperCase()}`:''}</div>
     <div className="ov-vs">{[ba,bb].map((x,i)=><button key={x.id} className={`ov-vs-side ${i?'right':''}`} onClick={()=>onFighter(x.id)}><Avatar fighter={x} size={86}/><span><RankTag rank={x.rank}/><b>{x.name}</b><small><Flag code={x.flag}/>{x.style} · OVR {overallOf(x,world.year)}</small></span></button>)}<span className="ov-vs-mark">VS</span></div>
     <div className="ov-tags">{boutTags(world,ba,bb,{kind:booked!.kind,titleFight:!!booked!.title,division:'S-TIER'}).slice(0,3).map(t=><span key={t.text} className={t.hot?'hot':''}>{t.text}</span>)}</div></div>
     :<p className="ov-muted">{special?'A tournament takes this month’s big event. Entrants are confirmed when it opens.':'The card is made on fight week. Prepare the event to see who fights.'}</p>}
    <div className="ov-actions"><button className="btn btn-primary" onClick={onEvent}><Swords size={16}/> {world.activeTournamentId?'Continue tournament':card?'Go to the event':special?'Open tournament':'Prepare the event'} <ArrowRight size={15}/></button><button className="btn btn-quiet" onClick={()=>onNav('Event Calendar')}><CalendarClock size={15}/> Calendar</button></div>
   </section>
   <section className="panel ov-crown">
    <BeltCard world={world} belt="WORLD" state={world.crown} next={nextWorld} onFighter={onFighter} big/>
   </section>
  </div>
  <section className="ov-belts">{CONTINENTAL_BELTS.map(b=><div className="panel" key={b}><BeltCard world={world} belt={b} state={world.belts[b]} next={nextCont} onFighter={onFighter}/></div>)}</section>
  <section className="ov-tournaments">{TOURNEY.map(t=>{const at=nextSlot(world,(y,r)=>r===t.round&&kindAt(y,r)===t.kind);const last=world.tournaments.filter(x=>x.kind===t.kind&&x.status==='complete').at(-1);const tid=identityFor(t.name);const live=world.tournaments.find(x=>x.id===world.activeTournamentId&&x.kind===t.kind);const champ=f(last?.winnerId);
   return <button key={t.kind} className="panel ov-tourney" onClick={()=>onNav('Tournaments')}><EventLogo id={tid} size={44}/><span className="ov-t-text"><small>{t.kind==='OLYMPIAD'?'EVERY 4 YEARS · AUGUST':t.kind==='SURGE'?'EVERY JULY':'EVERY NOVEMBER'}</small><b>{t.name.replace('WORLD COMBAT ','')}</b><em>{live?'IN PROGRESS':at?`${CALENDAR[at.round].month} ${at.year} · ${whenFrom(world,at.year,at.round)}`:''}</em></span><span className="ov-t-champ">{champ?<><Avatar fighter={champ} size={38}/><span><small>{last!.year} WINNER</small><b><Flag code={champ.flag}/>{champ.name}</b></span></>:<small>No winner yet</small>}</span></button>;})}</section>
  <div className="ov-columns">
   <LastEvent world={world} onFight={onFight} onFighter={onFighter}/>
   <section className="panel ov-standings"><Heading eyebrow="S DIVISION" title="Top of the world" end={<button className="text-link" onClick={()=>onNav('Divisions')}>Standings <ArrowRight size={14}/></button>}/>
    {sTier.slice(0,8).map(x=><FighterLine key={x.id} f={x} world={world} onFighter={onFighter} size={36} right={<><RankTag rank={x.rank}/> <span className="ov-ovr">{overallOf(x,world.year)}</span></>}/>)}
   </section>
  </div>
 </div>;
}
function BeltCard({world,belt,state,next,onFighter,big=false}:{world:World;belt:BeltId;state:CrownState;next:{year:number;round:number}|null;onFighter:(id:string)=>void;big?:boolean}){
 const champ=world.fighters.find(x=>x.id===state.championId);
 const interim=world.fighters.find(x=>x.id===state.interimId);
 const mandatory=world.fighters.find(x=>x.id===state.mandatoryId);
 const reign=state.reigns.at(-1);
 const nextText=next?`${eventNameAt(next.year,next.round)||CALENDAR[next.round].name} · ${CALENDAR[next.round].month} ${next.year} · ${whenFrom(world,next.year,next.round)}`:'';
 return <div className={`belt-card ${big?'big':''}`}>
  <div className="belt-card-head"><Crown size={big?20:15}/><span><small>{big?'THE WORLD CROWN':'CONTINENTAL BELT'}</small><b>{big?'World Champion':BELT_NAMES[belt].replace(' Continental Belt','')}</b></span></div>
  {champ?<button className="belt-holder" onClick={()=>onFighter(champ.id)}><Avatar fighter={champ} size={big?110:58}/><span><b><Flag code={champ.flag}/>{champ.name}</b><small>{champ.style} · {champ.record.wins}-{champ.record.losses}-{champ.record.draws}</small>{reign&&!reign.endYear&&<small>Champion since {reign.startYear} · {reign.defenses} defense{reign.defenses===1?'':'s'} · {reignDuration(world,reign)} days</small>}</span></button>:<div className="belt-vacant">VACANT</div>}
  {(interim||mandatory)&&<div className="belt-extra">{interim&&<span>Interim: <b>{interim.name}</b></span>}{mandatory&&<span>Next challenger: <b>{mandatory.name}</b></span>}</div>}
  <div className="belt-next"><Medal size={12}/> Next title fight: {nextText}</div>
 </div>;
}
