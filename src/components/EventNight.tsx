import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,ChevronRight,Crown,Eye,Flame,Play,SkipForward,Swords,Trophy} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {BeltChips,RankTag,Heading} from './ui';
import {CALENDAR,ROUNDS_PER_YEAR,isBigEvent} from '../engine/competition';
import {BRAND_INFO,brandOf,divisionLabel,isTopDivision,isWorldTier} from '../engine/constants';
import {overallOf} from '../engine/career';
import {getFight} from '../engine/archive';
import {forecastBout,headToHead} from '../engine/forecast';
import {BELT_SHORT,isContinentalRound,titleBrandAt,otherBrand,DOUBLES_ROUND} from '../engine/belts';
import {eventNameAt,kindAt} from '../engine/tournaments';
import {pickKey,pickStats,userOf} from '../engine/user';
import {EventLogo,EventWordmark,identityFor,identityStyle} from './EventIdentity';
import type {Fight,Fighter,PendingFight,World} from '../engine/types';
import './event-night.css';

const divisionName=(d:string)=>divisionLabel(d);
/** Brand badge (NOVA / ONYX) for a division. */
export function BrandTag({division}:{division:string}){
 const b=brandOf(division);if(!b)return null;
 return <span className="brand-tag" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}>{b}</span>;
}

/** What makes a bout worth watching: history between them, streaks, ranks. */
export function boutTags(world:World,a:Fighter,b:Fighter,p?:Pick<PendingFight,'kind'|'titleFight'|'division'|'tag'|'supremacy'>):{text:string;hot?:boolean}[]{
 const tags:{text:string;hot?:boolean}[]=[];
 if(p?.kind==='pinnacle')tags.push({text:'The winner takes the year',hot:true});
 else if(p?.kind==='contract')tags.push({text:'Winner gets a guaranteed title shot',hot:true});
 else if(p?.kind==='unification')tags.push({text:'Unification',hot:true});
 else if(p?.kind==='interim')tags.push({text:'Interim title',hot:true});
 else if(p?.titleFight)tags.push({text:'Title fight',hot:true});
 else if(p?.kind==='eliminator')tags.push({text:'Title eliminator · winner gets the next shot',hot:true});
 if(p?.tag)tags.push({text:p.tag.title?`Doubles Crown · ${p.tag.a} v ${p.tag.b}`:`Doubles ranking · ${p.tag.a} v ${p.tag.b}`,hot:p.tag.title});
 if(world.titleShot&&(world.titleShot.fighterId===a.id||world.titleShot.fighterId===b.id)&&!p?.titleFight)tags.push({text:`${(world.titleShot.fighterId===a.id?a:b).name.split(' ').at(-1)} holds a guaranteed title shot`});
 const h2h=headToHead(world,a.id,b.id).filter(e=>!e.t);
 if(h2h.length){
  const wa=h2h.filter(e=>e.w===a.id).length,wb=h2h.filter(e=>e.w===b.id).length;
  const lead=wa===wb?`series tied ${wa}-${wb}`:`${(wa>wb?a:b).name.split(' ').at(-1)} leads ${Math.max(wa,wb)}-${Math.min(wa,wb)}`;
  tags.push({text:h2h.length===1?`Rematch · ${lead}`:h2h.length===2?`Trilogy · ${lead}`:`Rivalry · ${h2h.length} meetings · ${lead}`,hot:h2h.length>=2});
 }
 for(const f of [a,b])if(f.record.streak>=3)tags.push({text:`${f.name.split(' ').at(-1)} on a ${f.record.streak}-fight win streak`});
 for(const f of [a,b])if(f.record.streak<=-3)tags.push({text:`${f.name.split(' ').at(-1)} has lost ${-f.record.streak} straight`});
 if(p&&isTopDivision(p.division)&&!p.tag&&!p.supremacy&&a.rank>0&&b.rank>0&&a.rank<=5&&b.rank<=5&&!p.titleFight)tags.push({text:'Top-5 clash'});
 return tags;
}
function Corner({f,world,side,onFighter}:{f:Fighter;world:World;side:'a'|'b';onFighter:(id:string)=>void}){
 return <button className={`card-corner corner-${side}`} onClick={()=>onFighter(f.id)}>
  <Avatar fighter={f} size={74}/>
  <span className="cc-text"><span className="cc-rank"><BrandTag division={f.division}/><RankTag rank={f.rank}/><small>{brandOf(f.division)?(isTopDivision(f.division)?'S':'II'):divisionName(f.division)}</small></span><b>{f.name}</b><small><Flag code={f.flag}/>{f.country} · {f.style}</small><small className="cc-record">{f.record.wins}-{f.record.losses}-{f.record.draws} · OVR {overallOf(f,world.year)}</small><span className="cc-belts"><BeltChips world={world} id={f.id}/></span></span>
 </button>;
}
function ChanceBar({a,b,chance}:{a:Fighter;b:Fighter;chance:number}){
 const pa=Math.round(chance*100);
 return <div className="chance"><div className="chance-nums"><b>{pa}%</b><small>WIN CHANCE</small><b>{100-pa}%</b></div><div className="chance-bar" aria-label={`${a.name} ${pa}%, ${b.name} ${100-pa}%`}><i style={{width:`${pa}%`}}/></div></div>;
}
function headerFor(p:PendingFight,i:number){
 const slot=i===0?'MAIN EVENT':i===1?'CO-MAIN EVENT':`BOUT ${i+1}`;
 const brand=p.belt??brandOf(p.division)??'';
 const what=p.kind==='pinnacle'?'THE PINNACLE UNIFIER · NOVA v ONYX · 5 ROUNDS':
  p.kind==='contract'?'TITLE-SHOT CONTRACT · NOVA v ONYX · 3 ROUNDS':
  p.kind==='unification'?`${brand} WORLD TITLE UNIFICATION · 5 ROUNDS`:
  p.kind==='interim'?`INTERIM ${brand} WORLD TITLE · 5 ROUNDS`:
  p.titleFight?`${brand} WORLD TITLE · 5 ROUNDS`:
  p.kind==='eliminator'?`${brand} TITLE ELIMINATOR · 3 ROUNDS`:
  p.tag?`DOUBLES${p.tag.title?' CROWN':' RANKING'} · ${p.tag.a.toUpperCase()} v ${p.tag.b.toUpperCase()} · LEG ${p.tag.leg}`:
  p.supremacy?'CONTINENTAL SUPREMACY · ALL AGAINST ALL · 3 ROUNDS':
  `${divisionName(p.division).toUpperCase()} · 3 ROUNDS`;
 return `${slot} · ${what}`;
}

/** The event screen: the world-tier card, a Skip/Simulate choice per bout, then Start event. */
export function EventNight({world,onStart,onPrepare,onTournament,onFighter,onFight,onTape,onPick}:{world:World;onStart:(watch:number[])=>void;onPrepare:()=>void;onTournament:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;onTape:(a:string,b:string)=>void;onPick:(id:string)=>void}){
 const card=world.pendingCard??(world.pendingFight?[world.pendingFight]:null);
 const key=`${world.year}-${world.round}`;
 const [watch,setWatch]=useState<Set<number>>(new Set());
 useEffect(()=>setWatch(new Set()),[key]);
 const slot=CALENDAR[world.round];
 const special=eventNameAt(world.year,world.round);
 const ident=identityFor(special||slot.name,isContinentalRound(world.round));
 const fighter=(id:string)=>world.fighters.find(f=>f.id===id)!;
 const main=card?card.filter(p=>!p.prelim):[];const prelims=card?card.filter(p=>p.prelim):[];
 const chances=useMemo(()=>main.map(p=>forecastBout(fighter(p.fighterA),fighter(p.fighterB),world.year,p.titleFight||p.kind==='pinnacle'?5:3,160).winA),[key,card?.length]);// eslint-disable-line react-hooks/exhaustive-deps
 const user=userOf(world);const stats=pickStats(user);const myPick=user.pendingPick?.key===pickKey(world.year,world.round)?user.pendingPick.pick:null;
 const toggle=(i:number,on:boolean)=>setWatch(old=>{const next=new Set(old);if(on)next.add(i);else next.delete(i);return next;});
 const tb=titleBrandAt(world.round);
 const eyebrow=slot.name==='THE PINNACLE'?'THE BIGGEST NIGHT OF THE YEAR · NOVA v ONYX':tb?`${tb} TITLE NIGHT · ${otherBrand(tb)} TITLE ELIMINATOR`:world.round===DOUBLES_ROUND?'THE DOUBLES CROWN':isBigEvent(world.round)?'MONTHLY BIG EVENT':`${slot.month} · WEEK ${slot.week}`;
 const hero=<section className="night-hero themed en-hero" style={identityStyle(ident)}><div className="eyebrow">{eyebrow}</div><div className="hero-brand" key={special||slot.name}><EventLogo id={ident} size={70}/><h1><EventWordmark id={ident}>{special||slot.name}</EventWordmark></h1></div><p className="ev-tagline">{ident.tagline}</p><p>{slot.month} {world.year} · Event {world.round+1} of {ROUNDS_PER_YEAR} · NOVA and ONYX</p></section>;

 if(!card){
  const tournamentNext=!!kindAt(world.year,world.round)||!!world.activeTournamentId;
  return <div className="event-night">{hero}
   <section className="panel en-next"><div><div className="eyebrow">UP NEXT</div><h2>{special||slot.name}</h2><p>{tournamentNext?'This month’s big event is a tournament. Brackets and entrants are revealed when it opens.':'Prepare the event to see its world-tier card. Continental and regional divisions fight in the background; their results are in the Calendar.'}</p></div>
    {tournamentNext?<button className="btn btn-primary" onClick={onTournament}><Trophy size={16}/> Open {special||'tournament'} <ArrowRight size={16}/></button>:<button className="btn btn-primary" onClick={onPrepare}><Swords size={16}/> Prepare the card <ArrowRight size={16}/></button>}</section>
   <LastEvent world={world} onFight={onFight} onFighter={onFighter}/>
  </div>;
 }
 const liveCount=watch.size;
 return <div className="event-night">{hero}
  <section className="en-card">
   <Heading eyebrow="WORLD-TIER CARD" title="Tonight’s fights" end={<div className="en-bulk"><button onClick={()=>setWatch(new Set(main.map((_,i)=>i)))}>Simulate all</button><button onClick={()=>setWatch(new Set())}>Skip all</button></div>}/>
   {main.map((p,i)=>{const a=fighter(p.fighterA),b=fighter(p.fighterB);const live=watch.has(i);const tags=boutTags(world,a,b,p);
    return <article key={`${p.fighterA}-${p.fighterB}`} className={`card-bout ${i===0?'is-main':''} ${live?'is-live':''}`}>
     <header><span>{(p.titleFight||p.kind)&&<Crown size={13}/>} {headerFor(p,i)}</span><span className="cb-mode">{live?'SIMULATE LIVE':'SKIP TO RESULT'}</span></header>
     <div className="cb-body"><Corner f={a} world={world} side="a" onFighter={onFighter}/><div className="cb-mid"><span className="cb-vs">VS</span><ChanceBar a={a} b={b} chance={chances[i]??.5}/></div><Corner f={b} world={world} side="b" onFighter={onFighter}/></div>
     {tags.length>0&&<div className="cb-tags">{tags.map(t=><span key={t.text} className={t.hot?'hot':''}>{t.hot&&<Flame size={11}/>}{t.text}</span>)}</div>}
     <footer><div className="cb-toggle" role="radiogroup" aria-label="Skip or simulate this fight"><button role="radio" aria-checked={!live} className={!live?'on':''} onClick={()=>toggle(i,false)}><SkipForward size={14}/> Skip</button><button role="radio" aria-checked={live} className={live?'on live':''} onClick={()=>toggle(i,true)}><Eye size={14}/> Simulate</button></div>
      {i===0&&<div className="cb-pick"><span>YOUR PICK</span>{[a,b].map(f=><button key={f.id} className={myPick===f.id?'chosen':''} onClick={()=>onPick(f.id)}>{myPick===f.id?'✓ ':''}{f.name.split(' ').at(-1)}</button>)}</div>}
      <button className="cb-tape" onClick={()=>onTape(a.id,b.id)}>Tale of the tape <ChevronRight size={14}/></button></footer>
    </article>;})}
   {prelims.length>0&&<div className="en-prelims"><div className="eyebrow">ALSO ON THE CARD · RESULTS AFTER THE EVENT</div>{prelims.map(p=>{const a=fighter(p.fighterA),b=fighter(p.fighterB);return <div key={`${p.fighterA}-${p.fighterB}`}><span><Flag code={a.flag}/>{a.name} <RankTag rank={a.rank}/></span><i>vs</i><span><Flag code={b.flag}/>{b.name} <RankTag rank={b.rank}/></span><small>{divisionName(p.division)}</small></div>;})}</div>}
   {main.length===0&&<p className="empty-msg">No world-tier fighters were fit to fight this week. Start the event to move on.</p>}
  </section>
  <div className="en-startbar"><span>{liveCount?`${liveCount} fight${liveCount===1?'':'s'} to simulate live · ${main.length-liveCount} skipped`:'All fights skipped: you will go straight to the results'}{stats.made>0&&<small> · Picks {stats.correct}/{stats.made}</small>}</span><button className="btn btn-primary" onClick={()=>onStart([...watch].sort((x,y)=>x-y))}><Play size={16} fill="currentColor"/> Start event</button></div>
 </div>;
}

/** Results of the most recent event's world-tier card. */
export function LastEvent({world,onFight,onFighter}:{world:World;onFight:(id:string)=>void;onFighter:(id:string)=>void}){
 const ids=world.lastCardIds??world.lastFightIds;
 const fights=ids.map(id=>getFight(world,id)).filter((f):f is Fight=>!!f&&isWorldTier(f.division)&&!f.tournamentId);
 if(!fights.length)return null;
 // Saved card order is main event first; older saves fall back to title fights first.
 const ordered=world.lastCardIds?fights:[...fights].sort((x,y)=>Number(!!y.titleFight||!!y.kind)-Number(!!x.titleFight||!!x.kind)||(isTopDivision(x.division)?0:1)-(isTopDivision(y.division)?0:1)||Math.min(x.rankBeforeA,x.rankBeforeB)-Math.min(y.rankBeforeA,y.rankBeforeB));
 const name=`${fights[0].eventName||'Last event'} · ${fights[0].year}`;
 const other=world.lastCardIds?0:world.lastFightIds.length-fights.length;
 return <section className="panel en-results"><Heading eyebrow="LAST EVENT · RESULTS" title={name} end={<span className="subtle-tag">{fights.length} WORLD-TIER BOUTS{other>0?` · ${other} CONTINENTAL IN THE CALENDAR`:''}</span>}/>
  {ordered.map((f,i)=>{const a=world.fighters.find(x=>x.id===f.fighterA)!,b=world.fighters.find(x=>x.id===f.fighterB)!;const w=f.winnerId;
   return <div key={f.id} className={`res-row ${i===0?'is-main':''}`}><button className={`res-side ${w===a.id?'won':w?'lost':''}`} onClick={()=>onFighter(a.id)}><Avatar fighter={a} size={40}/><span><b><Flag code={a.flag}/>{a.name}</b><small>{w===a.id?'WIN':w?'LOSS':'DRAW'} · {f.rankBeforeA===0?'C':`#${f.rankBeforeA}`}</small></span></button>
    <button className="res-mid" onClick={()=>onFight(f.id)}><b>{f.method}</b><small>R{f.finishRound} · {f.finishTime}</small>{f.titleChange&&<em><Crown size={11}/> NEW {f.belt?BELT_SHORT[f.belt].toUpperCase():'CHAMPION'}</em>}{f.underdogVictory&&!f.titleChange&&<em>UPSET</em>}<span>Report <ChevronRight size={12}/></span></button>
    <button className={`res-side right ${w===b.id?'won':w?'lost':''}`} onClick={()=>onFighter(b.id)}><span><b><Flag code={b.flag}/>{b.name}</b><small>{w===b.id?'WIN':w?'LOSS':'DRAW'} · {f.rankBeforeB===0?'C':`#${f.rankBeforeB}`}</small></span><Avatar fighter={b} size={40}/></button></div>;})}
 </section>;
}
