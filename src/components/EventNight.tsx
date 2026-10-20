import {BrandLogo} from './BrandLogo';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,ChevronRight,Eye,Play,SkipForward,Swords,Trophy} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {BoardNum,Lamp,ModuleHead} from './board';
import {Corner,Staff,brandStyle} from './Bout';
import {CALENDAR,ROUNDS_PER_YEAR,isBigEvent} from '../engine/competition';
import {BRAND_INFO,brandOf,divisionLabel,isTopDivision,isWorldTier} from '../engine/constants';
import {overallOf} from '../engine/career';
import {getFight} from '../engine/archive';
import {forecastBout,headToHead} from '../engine/forecast';
import {BELT_SHORT,isContinentalRound,titleBrandAt,otherBrand,DOUBLES_ROUND} from '../engine/belts';
import {eventNameAt,kindAt} from '../engine/tournaments';
import {pickKey,pickStats,userOf} from '../engine/user';
import {EventLogo,identityFor,identityStyle} from './EventIdentity';
import type {Fight,Fighter,PendingFight,World} from '../engine/types';
import './event-board.css';

const divisionName=(d:string)=>divisionLabel(d);
/** Brand badge (NOVA / ONYX) for a division. */
export function BrandTag({division}:{division:string}){
 const b=brandOf(division);if(!b)return null;
 return <span className="brand-tag" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}><BrandLogo brand={b} size={21}/>{b}</span>;
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
 if(p?.tag)tags.push({text:p.tag.title?'Doubles Crown · 2v2 tag championship':p.tag.challengerLock?'Challenger lock · winner books next crown night':'Doubles ranking · 2v2 team fight',hot:p.tag.title||p.tag.challengerLock});
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

/** Slot, stakes and length of a bout on the card. */
function boutMeta(p:PendingFight,i:number):{slot:string;what:string;rounds?:number}{
 const slot=i===0?'Main event':i===1?'Co-main event':`Bout ${i+1}`;
 const brand=p.belt??brandOf(p.division)??'';
 if(p.kind==='pinnacle')return {slot,what:'The Pinnacle unifier · NOVA v ONYX',rounds:5};
 if(p.kind==='contract')return {slot,what:'Title-shot contract · NOVA v ONYX',rounds:3};
 if(p.kind==='unification')return {slot,what:`${brand} world title unification`,rounds:5};
 if(p.kind==='interim')return {slot,what:`Interim ${brand} world title`,rounds:5};
 if(p.titleFight)return {slot,what:`${brand} world title`,rounds:5};
 if(p.kind==='eliminator')return {slot,what:`${brand} title eliminator`,rounds:3};
 if(p.tag)return {slot,what:`Doubles${p.tag.title?' crown':p.tag.challengerLock?' challenger lock':' ranking'} · tag team 2 v 2`};
 if(p.supremacy)return {slot,what:'Continental supremacy · all against all',rounds:3};
 return {slot,what:divisionName(p.division),rounds:3};
}

function TagSide({world,country,ids,onFighter,side}:{world:World;country:string;ids:[string,string];onFighter:(id:string)=>void;side:'a'|'b'}){
 const athletes=ids.map(id=>world.fighters.find(f=>f.id===id)).filter((f):f is Fighter=>!!f);
 return <div className={`ev-tag corner-${side}`}>
  <strong className="ev-tag-nation"><Flag code={athletes[0]?.flag}/>{country}</strong>
  {athletes.map((f,i)=><button key={f.id} className="ev-tag-fighter" onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={52}/><span><b>{f.name}</b><small>{i===0?'Starter':'Tag partner'} · {f.style} · {overallOf(f,world.year)} OVR · {f.condition}% fit</small></span></button>)}
 </div>;
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
 const chances=useMemo(()=>main.map(p=>p.tag?null:forecastBout(fighter(p.fighterA),fighter(p.fighterB),world.year,p.titleFight||p.kind==='pinnacle'?5:3,160).winA),[key,card?.length]);// eslint-disable-line react-hooks/exhaustive-deps
 const user=userOf(world);const stats=pickStats(user);const myPick=user.pendingPick?.key===pickKey(world.year,world.round)?user.pendingPick.pick:null;
 const toggle=(i:number,on:boolean)=>setWatch(old=>{const next=new Set(old);if(on)next.add(i);else next.delete(i);return next;});
 const tb=titleBrandAt(world.round);
 const billing=slot.name==='THE PINNACLE'?'The biggest night of the year · NOVA v ONYX':tb?`${tb} title night · ${otherBrand(tb)} title eliminator`:world.round===DOUBLES_ROUND?'The Doubles Crown':isBigEvent(world.round)?'Monthly big event':`Week ${slot.week}`;
 const titleFights=main.filter(p=>p.titleFight||p.kind==='pinnacle'||p.kind==='unification'||p.kind==='interim'||p.tag?.title).length;

 const head=<header className="ev-head">
  <EventLogo id={ident} size={88}/>
  <div className="ev-head-text">
   <h1>{special||slot.name}</h1>
   <p className="ev-tagline">{ident.tagline}</p>
   <p className="ev-meta"><b>{billing}</b> · {slot.month} {world.year} · Event {world.round+1} of {ROUNDS_PER_YEAR}</p>
  </div>
  <div className="ev-head-side">
   <span className="ev-brands"><BrandLogo brand="NOVA" size={48}/><BrandLogo brand="ONYX" size={48}/></span>
   {card&&<dl className="ev-figs"><div><dt>Bouts</dt><dd><BoardNum value={main.length+prelims.length}/></dd></div><div><dt>Title fights</dt><dd><BoardNum value={titleFights} tone={titleFights?'title':'dim'}/></dd></div></dl>}
  </div>
 </header>;

 if(!card){
  const tournamentNext=!!kindAt(world.year,world.round)||!!world.activeTournamentId;
  return <div className="ev" style={identityStyle(ident)}>{head}
   <section className="ev-upnext" aria-labelledby="ev-upnext">
    <h2 id="ev-upnext"><Lamp tone="amber"/>Up next</h2>
    <p>{tournamentNext?'This month’s big event is a tournament. Brackets and entrants are revealed when it opens.':'Prepare the event to see its world-tier card. Continental and regional divisions fight in the background; their results are in the Calendar.'}</p>
    {tournamentNext?<button className="bd-btn bd-btn-next" onClick={onTournament}><Trophy size={16}/>Open {special||'tournament'}<ArrowRight size={16}/></button>:<button className="bd-btn bd-btn-next" onClick={onPrepare}><Swords size={16}/>Prepare the card<ArrowRight size={16}/></button>}
   </section>
   <LastEvent world={world} onFight={onFight} onFighter={onFighter}/>
  </div>;
 }
 const liveCount=watch.size;
 return <div className="ev" style={identityStyle(ident)}>{head}
  <section className="ev-card" aria-labelledby="ev-card-title">
   <div className="ev-card-head"><h2 id="ev-card-title">Tonight’s card</h2><span className="bd-code">World tier · {main.length} bout{main.length===1?'':'s'}</span>
    <div className="ev-bulk" role="group" aria-label="All bouts"><button className="bd-btn" onClick={()=>setWatch(new Set(main.map((_,i)=>i)))}><Eye size={15}/>Simulate all</button><button className="bd-btn" onClick={()=>setWatch(new Set())}><SkipForward size={15}/>Skip all</button></div></div>
   <ol className="ev-bouts">{main.map((p,i)=>{const a=fighter(p.fighterA),b=fighter(p.fighterB);const live=watch.has(i);const tags=boutTags(world,a,b,p);const meta=boutMeta(p,i);
    const mode=<div className="ev-mode" role="radiogroup" aria-label={`${meta.slot}: skip or simulate`}>
     <button role="radio" aria-checked={!live} onClick={()=>toggle(i,false)}><SkipForward size={14}/>Skip</button>
     <button role="radio" aria-checked={live} className="is-sim" onClick={()=>toggle(i,true)}><Eye size={14}/>Simulate</button>
    </div>;
    const pick=(f:Fighter)=>i===0&&!p.tag?<button className="ev-pick" aria-pressed={myPick===f.id} onClick={()=>onPick(f.id)}>{myPick===f.id?'Your pick':`Pick ${f.name.split(' ').at(-1)}`}</button>:null;
    return <li key={`${p.fighterA}-${p.fighterB}`} className={`ev-bout ${i===0?'is-main':'is-compact'} ${live?'is-live':''}`}>
     {p.tag?<div className="bout"><TagSide world={world} country={p.tag.a} ids={p.tag.teamA} onFighter={onFighter} side="a"/><Staff slot={meta.slot} what={meta.what}>{mode}</Staff><TagSide world={world} country={p.tag.b} ids={p.tag.teamB} onFighter={onFighter} side="b"/></div>:
      <div className="bout"><Corner f={a} world={world} side="a" size={i===0?176:64} onFighter={onFighter}>{pick(a)}</Corner><Staff slot={meta.slot} what={meta.what} rounds={meta.rounds} chance={chances[i]}>{mode}</Staff><Corner f={b} world={world} side="b" size={i===0?176:64} onFighter={onFighter}>{pick(b)}</Corner></div>}
     {(tags.length>0||!p.tag)&&<footer className="ev-bout-foot">{tags.length>0&&<p className="bout-notes">{tags.map(t=><span key={t.text} className={t.hot?'is-hot':''}>{t.text}</span>)}</p>}{!p.tag&&<button className="bd-btn bd-btn-quiet" onClick={()=>onTape(a.id,b.id)}>Tale of the tape<ChevronRight size={14}/></button>}</footer>}
    </li>;})}</ol>
   {prelims.length>0&&<section className="bd ev-prelims" aria-labelledby="ev-prelims"><ModuleHead id="ev-prelims" as="h3" title="Also on the card" code="Results after the event"/>
    <ol className="ev-under">{prelims.map((p,k)=>{const a=fighter(p.fighterA),b=fighter(p.fighterB);
     const side=(x:Fighter,team:string|undefined,ids:string[]|undefined,cls:string)=>p.tag?<span className={`ev-under-side ${cls}`}><b><Flag code={x.flag}/>{team}</b><small>{ids!.map(id=>fighter(id).name).join(' / ')}</small></span>:<button className={`ev-under-side ${cls}`} style={brandStyle(x)} onClick={()=>onFighter(x.id)}><b><Flag code={x.flag}/>{x.name}</b><small>{x.rank===0?'Champion':`#${x.rank}`}</small></button>;
     return <li key={`${p.fighterA}-${p.fighterB}`}>{side(a,p.tag?.a,p.tag?.teamA,'is-a')}<span className="ev-under-staff"><b>Bout {main.length+k+1}</b><small>{p.tag?'2v2 tag':divisionName(p.division)}</small></span>{side(b,p.tag?.b,p.tag?.teamB,'is-b')}</li>;})}</ol></section>}
   {main.length===0&&<p className="ev-empty">No world-tier fighters were fit to fight this week. Start the event to move on.</p>}
  </section>
  <div className="ev-start" role="region" aria-label="Start the event">
   <p><b>{liveCount?`${liveCount} fight${liveCount===1?'':'s'} to simulate live`:'All fights skipped'}</b><span>{liveCount?` · ${main.length-liveCount} skipped`:' · you will go straight to the results'}</span>{stats.made>0&&<span className="ev-start-picks">Picks {stats.correct}/{stats.made}</span>}</p>
   <button className="bd-btn bd-btn-next" onClick={()=>onStart([...watch].sort((x,y)=>x-y))}><Play size={16} fill="currentColor"/>Start event</button>
  </div>
 </div>;
}

function ResultSide({f,won,lost,rank,side,onFighter}:{f:Fighter;won:boolean;lost:boolean;rank:number;side:'a'|'b';onFighter:(id:string)=>void}){
 return <button className={`rs-side rs-${side} ${won?'is-won':lost?'is-lost':''}`} style={brandStyle(f)} onClick={()=>onFighter(f.id)}>
  <Lamp tone={won?'win':lost?'loss':'off'} label={won?'Win':lost?'Loss':'Draw'}/>
  <span><b><Flag code={f.flag}/>{f.name}</b><small>{won?'Win':lost?'Loss':'Draw'} · {rank===0?'Champion':`#${rank}`}</small></span>
 </button>;
}

/** Results of the most recent event's world-tier card. */
export function LastEvent({world,onFight,onFighter}:{world:World;onFight:(id:string)=>void;onFighter:(id:string)=>void}){
 const ids=world.lastCardIds??world.lastFightIds;
 const fights=ids.map(id=>getFight(world,id)).filter((f):f is Fight=>!!f&&(isWorldTier(f.division)||!!f.tag)&&(!f.tournamentId||!!f.tag));
 if(!fights.length)return null;
 // Saved card order is main event first; older saves fall back to title fights first.
 const ordered=world.lastCardIds?fights:[...fights].sort((x,y)=>Number(!!y.titleFight||!!y.kind)-Number(!!x.titleFight||!!x.kind)||(isTopDivision(x.division)?0:1)-(isTopDivision(y.division)?0:1)||Math.min(x.rankBeforeA,x.rankBeforeB)-Math.min(y.rankBeforeA,y.rankBeforeB));
 const name=`${fights[0].eventName||'Last event'} · ${fights[0].year}`;
 const other=world.lastCardIds?0:world.lastFightIds.length-fights.length;
 return <section className="bd rs" aria-labelledby="rs-title"><ModuleHead id="rs-title" title={<>Results · {name}</>} code={`${fights.length} world-tier bout${fights.length===1?'':'s'}${other>0?` · ${other} continental in the Calendar`:''}`}/>
  <ol className="rs-list">{ordered.map((f,i)=>{const a=world.fighters.find(x=>x.id===f.fighterA)!,b=world.fighters.find(x=>x.id===f.fighterB)!;const w=f.winnerId;
   if(f.tag){const t=f.tag;return <li key={f.id} className={`rs-row ${i===0?'is-main':''}`}>
    <span className={`rs-side rs-a ${t.winner===t.a?'is-won':t.winner?'is-lost':''}`}><Lamp tone={t.winner===t.a?'win':t.winner?'loss':'off'} label={t.winner===t.a?'Win':t.winner?'Loss':'Draw'}/><span><b><Flag code={a.flag}/>{t.a}</b><small>{t.teamA.map(id=>world.fighters.find(x=>x.id===id)?.name).join(' / ')}</small></span></span>
    <button className="rs-mid" onClick={()=>onFight(f.id)}><b>{f.method}</b><small>2v2 tag · R{f.finishRound}</small><span className="rs-report">Team report<ChevronRight size={12}/></span></button>
    <span className={`rs-side rs-b ${t.winner===t.b?'is-won':t.winner?'is-lost':''}`}><Lamp tone={t.winner===t.b?'win':t.winner?'loss':'off'} label={t.winner===t.b?'Win':t.winner?'Loss':'Draw'}/><span><b><Flag code={b.flag}/>{t.b}</b><small>{t.teamB.map(id=>world.fighters.find(x=>x.id===id)?.name).join(' / ')}</small></span></span>
   </li>;}
   return <li key={f.id} className={`rs-row ${i===0?'is-main':''}`}>
    <ResultSide f={a} won={w===a.id} lost={!!w&&w!==a.id} rank={f.rankBeforeA} side="a" onFighter={onFighter}/>
    <button className="rs-mid" onClick={()=>onFight(f.id)}><b>{f.method}</b><small>R{f.finishRound} · {f.finishTime}</small>{f.titleChange&&<em>New {f.belt?BELT_SHORT[f.belt]:'champion'}</em>}{f.underdogVictory&&!f.titleChange&&<em className="is-upset">Upset</em>}<span className="rs-report">Report<ChevronRight size={12}/></span></button>
    <ResultSide f={b} won={w===b.id} lost={!!w&&w!==b.id} rank={f.rankBeforeB} side="b" onFighter={onFighter}/>
   </li>;})}</ol>
 </section>;
}
