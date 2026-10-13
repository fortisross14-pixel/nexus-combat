import {useEffect,useState} from 'react';
import {ArrowRight,ChevronRight,Clock3,Crown,FastForward,Pause,Play,SkipForward,Swords,Trophy,Volume2,X,Zap} from 'lucide-react';
import {Avatar} from './Avatar';
import {eventNameAt} from '../engine/tournaments';
import {CALENDAR,ROUNDS_PER_YEAR} from '../engine/competition';
import {overallOf} from '../engine/career';
import type {BeltId,CrownReign,Fight,World} from '../engine/types';
import {getFight} from '../engine/archive';
import {STAT} from '../engine/combat';
import {actionLabel,actionSentence} from './actionText';
import {BELT_NAMES,BELT_SHORT,CONTINENTAL_BELTS,beltState,beltsHeld,isContinentalRound,isWorldTitleRound} from '../engine/belts';
import {reignDuration} from '../engine/legacy';
import {pickKey,pickStats,userOf} from '../engine/user';
import {TaleOfTheTape} from './TaleOfTheTape';
import {EventLogo,EventWordmark,identityFor,identityStyle} from './EventIdentity';
import './pass2.css';

/** Lineage of every belt: the World Crown (with interim titles) and the four continental belts. */
export function CrownLineage({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
 const [belt,setBelt]=useState<BeltId>('WORLD');
 const athlete=(id:string)=>world.fighters.find(f=>f.id===id);
 const c=beltState(world,belt);
 const rows=(list:CrownReign[],label:string)=>list.slice().reverse().map((reign,i)=>{const f=athlete(reign.fighterId);if(!f)return null;const isCurrent=!reign.endYear;const days=reignDuration(world,reign);return <button onClick={()=>onFighter(f.id)} key={`${label}-${reign.startFightId}-${i}`} className={`reign-row ${isCurrent?'reign-current':''}`}><div className="reign-avatar"><Avatar fighter={f} size={48}/></div><div><strong>{f.name} {isCurrent&&<span className="reign-current-label">{label}</span>}</strong><small>{f.flag} · {reign.startYear} – {isCurrent?'Present':reign.endYear} · {reign.defenses} defense{reign.defenses===1?'':'s'}{reign.via?' · elevated from interim':''}</small></div><div className="reign-days"><b>{days}</b><small>DAYS</small></div><ChevronRight size={15}/></button>;});
 return <section className="panel crown-panel"><div className="section-heading"><div><div className="eyebrow">CHAMPIONSHIP ARCHIVE</div><h2>{BELT_NAMES[belt]} lineage</h2></div><Crown size={20}/></div>
  <div className="belt-tabs">{(['WORLD',...CONTINENTAL_BELTS] as BeltId[]).map(b=><button key={b} className={b===belt?'active':''} onClick={()=>setBelt(b)}>{BELT_SHORT[b]}</button>)}</div>
  {c.reigns.length===0?<div className="chronicle-empty">{belt==='WORLD'?`The World Crown is vacant. It is contested at FIGHTOPIA, FAULTLINE and THE PINNACLE.`:'This belt is vacant. Continental titles are contested on the fourth circuit card of February, May, August and November.'}</div>:
  <div className="reign-ledger">{rows(c.reigns,'CHAMPION')}</div>}
  {(c.interimReigns?.length||0)>0&&<><div className="belt-subhead">INTERIM TITLE HISTORY</div><div className="reign-ledger">{rows(c.interimReigns!,'INTERIM')}</div></>}
 </section>;
}
/** What is at stake on each calendar slot this season. */
export function slotStakes(year:number,i:number):{label:string;kind:'world'|'continental'|'eliminator'}|null{
 if(isWorldTitleRound(i))return {label:'WORLD CROWN',kind:'world'};
 if(isContinentalRound(i))return {label:'CONTINENTAL TITLES',kind:'continental'};
 if(CALENDAR[i].week===5&&!eventNameAt(year,i))return {label:'TITLE ELIMINATOR',kind:'eliminator'};
 return null;
}
export function EventCalendar({world,onPrepare,onFighter}:{world:World;onPrepare:()=>void;onFighter:(id:string)=>void}){
 const holder=world.fighters.find(f=>f.id===world.crown.championId);
 const interim=world.fighters.find(f=>f.id===world.crown.interimId);
 const next=CALENDAR[world.round];const special=eventNameAt(world.year,world.round);
 const nextIdent=identityFor(special||next.name,isContinentalRound(world.round));
 return <><div className="page-title"><div><div className="eyebrow"><span className="live-dot"/> THE NEXUS GLOBAL SCHEDULE</div><h1>Fight <span>Calendar.</span></h1><p>Sixty cards a year: four weekly cards and one marquee event per month. The World Crown is on the line in March, June and December; continental belts in February, May, August and November.</p></div></div>
 <div className="calendar-top"><div className="calendar-feature themed" style={identityStyle(nextIdent)}><div className="eyebrow">NEXT LIVE EVENT · {world.year}</div><div className="hero-brand left"><EventLogo id={nextIdent} size={58}/><h2><EventWordmark id={nextIdent}>{special||next.name}</EventWordmark></h2></div><p className="ev-tagline">{nextIdent.tagline}</p><p>{special==='WORLD COMBAT OLYMPIAD'?'Quadrennial 40-fighter championship':next.label} · {next.month} {world.year}</p><button className="btn btn-primary" onClick={onPrepare}>{world.pendingFight||world.activeTournamentId?'Enter the event':'Simulate to event'} <ArrowRight size={17}/></button></div><div className="calendar-champion"><Crown size={30}/><span>CURRENT WORLD CHAMPION</span>{holder?<button onClick={()=>onFighter(holder.id)}><Avatar fighter={holder} size={62}/><strong>{holder.name}</strong><small>{holder.flag} · {holder.style}</small></button>:<strong>VACANT</strong>}{interim&&<small>Interim champion: {interim.name}</small>}</div></div>
 <div className="calendar-layout"><section className="panel"><div className="section-heading"><div><div className="eyebrow">OFFICIAL SEASON CALENDAR</div><h2>{world.year} Fight Circuit</h2></div><span className="subtle-tag">60 EVENTS · 12 MONTHS</span></div><div className="events-list">{CALENDAR.map((e,i)=>{const stakes=slotStakes(world.year,i);return <div className={`event-row ${i===world.round?'event-next':''} ${i<world.round?'event-done':''}`} key={i}><div className="event-index">{String(i+1).padStart(2,'0')}</div><div className="event-month">{e.month}</div>{(()=>{const id=identityFor(eventNameAt(world.year,i)||e.name,isContinentalRound(i));return id.key==='CIRCUIT'?<span className="event-logo-spacer"/>:<EventLogo id={id} size={30}/>;})()}<div className="event-details"><strong>{eventNameAt(world.year,i)||e.name}</strong><small>{eventNameAt(world.year,i)?i===34?'Annual twenty-fighter Royale':i===39?'Quadrennial 40-fighter championship':'Annual eight-fighter Grand Prix':e.label}</small></div><div className="event-tags">{stakes&&<span className={`event-title-mark ${stakes.kind}`}><Crown size={12}/> {stakes.label}</span>}<span className="event-status">{i<world.round?'COMPLETED':i===world.round?(world.pendingFight?'MAIN EVENT PENDING':world.activeTournamentId?'TOURNAMENT LIVE':'NEXT EVENT'):'UPCOMING'}</span></div></div>;})}</div><div className="calendar-phase-note">Four circuit nights plus one major event take place each month. The Surge runs in July, the Olympiad in August of every fourth year, The Crucible in November. Marquee nights without a title on the line are title eliminators: the winner becomes the mandatory challenger.</div></section><CrownLineage world={world} onFighter={onFighter}/></div>
 </>;
}
export function FightNight({world,onPrepare,onWatch,onSkip,onFighter,onFight,onPick}:{world:World;onPrepare:()=>void;onWatch:()=>void;onSkip:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;onPick:(id:string)=>void}){
 const pending=world.pendingFight,slot=CALENDAR[world.round];const a=world.fighters.find(f=>f.id===pending?.fighterA),b=world.fighters.find(f=>f.id===pending?.fighterB);
 const [showTape,setShowTape]=useState(true);
 const lastResults=world.lastFightIds.map(id=>getFight(world,id)).filter((x):x is Fight=>Boolean(x)).slice().reverse();
 const user=userOf(world);const stats=pickStats(user);const myPick=user.pendingPick?.key===pickKey(world.year,world.round)?user.pendingPick.pick:null;
 const lastPick=stats.last;const lastPickFight=lastPick&&!pending?getFight(world,lastPick.fightId):undefined;
 const header=pending?.kind==='eliminator'?'TITLE ELIMINATOR · THREE ROUNDS · WINNER BECOMES MANDATORY CHALLENGER':pending?.kind==='interim'?'INTERIM WORLD CROWN · FIVE ROUNDS':pending?.kind==='unification'?'WORLD CROWN UNIFICATION · FIVE ROUNDS':pending?.titleFight?'WORLD CROWN · FIVE ROUNDS':'FEATURED MAIN EVENT · THREE ROUNDS';
 const beltOf=(id:string)=>beltsHeld(world,id);
 const ident=identityFor(eventNameAt(world.year,world.round)||slot.name,isContinentalRound(world.round));
 return <div className="fight-night"><div className="night-topline"><span><span className="live-dot"/> NEXUS BROADCAST NETWORK</span><strong>{slot.month} {world.year} · EVENT {world.round+1}/{ROUNDS_PER_YEAR}</strong></div><section className="night-hero themed" style={identityStyle(ident)}><div className="eyebrow">{slot.name==='THE PINNACLE'?'THE BIGGEST NIGHT OF THE YEAR':isWorldTitleRound(world.round)?'WORLD CROWN NIGHT':isContinentalRound(world.round)?'CONTINENTAL TITLE NIGHT':slot.week===5?'TITLE ELIMINATOR NIGHT':'NEXUS GLOBAL CIRCUIT'}</div><div className="hero-brand"><EventLogo id={ident} size={78}/><h1><EventWordmark id={ident}>{eventNameAt(world.year,world.round)||slot.name}</EventWordmark></h1></div><p className="ev-tagline">{ident.tagline}</p><p>{slot.label} · {world.year}</p><div className="night-progress">{CALENDAR.filter((_,i)=>Math.floor(i/5)===Math.floor(world.round/5)).map((e,i)=><span key={i} className={i<=world.round%5?'active':''} title={e.name}/>)}</div></section>
 {!pending?<div className="panel night-await"><Swords size={32}/><h2>Next event awaits</h2><p>The entire card will run automatically except the featured fight. That result stays hidden until you decide to watch or skip.</p>{lastPick&&lastPickFight&&<p className={`pick-result ${lastPick.correct?'good':lastPick.correct===false?'bad':''}`}>Your last pick: {world.fighters.find(f=>f.id===lastPick.pick)?.name} — {lastPick.correct?'correct!':lastPick.correct===false?'missed.':'draw.'} ({stats.correct}/{stats.made} correct · streak {stats.streak})</p>}<button className="btn btn-primary" onClick={onPrepare}>Simulate to {slot.name} <ArrowRight size={17}/></button></div>:
 <section className="panel night-headliner"><div className="night-headline-header"><span><Crown size={15}/> {header}</span><span>UNPLAYED · RESULT UNKNOWN</span></div><div className="night-faceoff">{[a,b].map((f,i)=>f&&<div className="night-fighter" key={f.id}><button aria-label={`Open ${f.name}`} onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={145}/></button><div className="night-fighter-nation">{f.flag} {f.country}</div><h2>{f.name}{beltOf(f.id).map(bt=><span key={bt} className="belt-chip"><Crown size={10}/>{BELT_SHORT[bt]}</span>)}{world.crown.interimId===f.id&&<span className="belt-chip">INTERIM</span>}</h2><span>{f.style} · {f.mentality}</span><div className="night-attributes"><b>{overallOf(f,world.year)}</b><small>OVR</small><b>{f.condition}</b><small>FIT</small><b>#{f.rank}</b><small>RANK</small></div>{i===0&&<div className="night-vs">VS</div>}</div>)}</div>
  {a&&b&&<div className="pick-panel"><span>YOUR PICK · WHO WINS?</span><div className="pick-buttons">{[a,b].map(f=><button key={f.id} className={myPick===f.id?'chosen':''} onClick={()=>onPick(f.id)}>{myPick===f.id?'✓ ':''}{f.name}</button>)}</div><div className="pick-stats"><span><b>{stats.made}</b>picks</span><span><b>{Math.round(stats.accuracy*100)}%</b>correct</span><span><b>{stats.streak}</b>streak</span><span><b>{stats.best}</b>best streak</span><span><b>{stats.upsets}</b>upsets called</span></div></div>}
  <div className="night-actions"><button className="btn btn-primary" onClick={onWatch}><Play size={17} fill="currentColor"/> WATCH LIVE FIGHT</button><button className="btn btn-secondary" onClick={onSkip}><SkipForward size={17}/> Skip to result</button></div><div className="night-disclaimer">No winner has been calculated yet. Both actions use the same combat engine and save-compatible RNG stream.</div>
  <div className="night-tape-toggle"><button className="btn btn-quiet" onClick={()=>setShowTape(v=>!v)}>{showTape?'Hide':'Show'} tale of the tape</button></div>
  {showTape&&a&&b&&<div className="night-tape"><TaleOfTheTape world={world} a={a} b={b} rounds={pending.titleFight?5:3} onFighter={onFighter} onFight={onFight} compact/></div>}
 </section>}
 <section className="panel night-undercard"><div className="section-heading"><div><div className="eyebrow">{pending?'COMPLETED UNDERCARD':'RECENT RESULTS'}</div><h2>Event results</h2></div><span className="subtle-tag">{lastResults.length} BOUTS</span></div><div className="night-bout-list">{lastResults.slice(0,40).map(f=><button onClick={()=>onFight(f.id)} key={f.id}><span className="night-method">{f.method}</span><strong>{f.headline}</strong>{f.titleFight&&<span className="belt-chip"><Crown size={10}/>{f.belt?BELT_SHORT[f.belt]:'World Crown'}</span>}<small>{f.division}</small><ChevronRight size={15}/></button>)}{lastResults.length===0&&<p className="empty-msg">No undercard fights yet. Enter the next event to start the competition.</p>}</div></section>
 </div>;
}
const sumLines=(lines:(number[]|undefined)[])=>lines.reduce<number[]>((acc,l)=>{if(l)l.forEach((v,i)=>{acc[i]=(acc[i]||0)+v;});return acc;},[]);
const mmss=(sec:number)=>`${Math.floor(sec/60)}:${String(Math.round(sec%60)).padStart(2,'0')}`;
/** Real seconds a floating caption stays on screen. Playback runs at 12 simulated seconds per real second at 1×. */
const BUBBLE_LIFE=1.7;
function hash(text:string){let h=7;for(const ch of text)h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h);}
export function boutBanner(fight:Fight){
 const belt=fight.belt?BELT_SHORT[fight.belt]:'World Crown';
 if(fight.kind==='eliminator')return 'TITLE ELIMINATOR';
 if(fight.kind==='interim')return `INTERIM ${belt.toUpperCase()}`;
 if(fight.kind==='unification')return `${belt.toUpperCase()} · UNIFICATION`;
 if(fight.titleFight)return `${belt.toUpperCase()} · CHAMPIONSHIP`;
 return fight.tournamentId?`${fight.eventName} · ${fight.tournamentStage}`:'FEATURED MAIN EVENT';
}
/** Minute-by-minute replay: timeline comes exclusively from stored Fight/RoundReport.
 * Playback never re-simulates or alters the combat result. */
export function LiveFight({fight,world,onComplete}:{fight:Fight;world:World;onComplete:()=>void}){
 const a=world.fighters.find(f=>f.id===fight.fighterA)!,b=world.fighters.find(f=>f.id===fight.fighterB)!;
 const liveIdent=identityFor(fight.eventName,!!fight.belt&&fight.belt!=='WORLD');
 const stopped=['KO','TKO','SUB'].includes(fight.method);
 const finishParts=fight.finishTime.split(':').map(Number);
 const lastRoundSeconds=stopped?Math.max(1,Math.min(300,(finishParts[0]||0)*60+(finishParts[1]||0))):300;
 const lengths=fight.rounds.map((_,i)=>i===fight.rounds.length-1?lastRoundSeconds:300);
 const total=lengths.reduce((sum,n)=>sum+n,0);
 const [elapsed,setElapsed]=useState(0);const [playing,setPlaying]=useState(true);const [speed,setSpeed]=useState<1|2|4>(1);
 useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setElapsed(t=>Math.min(total,t+2.4*speed)),200);return()=>window.clearInterval(timer)},[playing,speed,total]);
 useEffect(()=>{if(elapsed>=total&&playing)setPlaying(false)},[elapsed,total,playing]);
 const finished=elapsed>=total;
 let round=0,roundStart=0;
 for(let i=0;i<lengths.length;i++){if(elapsed>=roundStart+lengths[i]&&i<lengths.length-1){roundStart+=lengths[i];round=i+1;}else break;}
 const local=Math.min(lengths[round],Math.max(0,elapsed-roundStart));
 const roundData=fight.rounds[round];const fraction=local/lengths[round];
 const minute=Math.min(5,Math.floor(local/60)+1);
 const remaining=Math.max(0,300-local);const clock=`${Math.floor(remaining/60)}:${String(Math.floor(remaining%60)).padStart(2,'0')}`;
 const completed=fight.rounds.slice(0,round);
 const scoreA=completed.reduce((n,r)=>n+r.scoreA,0),scoreB=completed.reduce((n,r)=>n+r.scoreB,0);
 const safeNotes=roundData.notes.filter(n=>!(/taps out|finishes the fight|referee|out cold|locks it in/i.test(n)));
 const visibleNotes=finished?roundData.notes:safeNotes.slice(0,Math.min(safeNotes.length,Math.max(1,Math.floor(local/60)+1)));
 const timeline=roundData.timeline||[];
 const exchange=timeline.filter(item=>item.elapsed<=local).at(-1);
 const allActs=timeline.flatMap(beat=>beat.acts);
 const shownActs=finished?allActs:allActs.filter(x=>x.t<=local);
 const latestAction=shownActs.at(-1);
 const liveBeat=timeline.find(beat=>beat.elapsed>=local)||exchange;
 const shownNote=finished?(fight.headline||'Final decision confirmed'):latestAction?actionSentence(latestAction,a.name,b.name):visibleNotes.at(-1)||'Both fighters circle, measure distance and look for the opening.';
 const currentPosition=liveBeat?liveBeat.position.toUpperCase():/submission|ground|top control|position|tap out/i.test(shownNote)?'GROUND':/clinch|throw|boundary/i.test(shownNote)?'CLINCH':'STAND-UP';
 const previousRound=round>0?fight.rounds[round-1]:null;
 const stamina=(end:number,start:number)=>Math.round(start+(end-start)*fraction);
 const energyA=exchange?.staminaA??stamina(roundData.staminaA,previousRound?Math.min(100,previousRound.staminaA+11):100);
 const energyB=exchange?.staminaB??stamina(roundData.staminaB,previousRound?Math.min(100,previousRound.staminaB+11):100);
 // Running fight statistics: completed rounds plus the current round so far.
 const partial=(line:number[]|undefined)=>line?line.map(v=>Math.round(v*fraction)):undefined;
 const nowA=finished?roundData.a:exchange?exchange.sa:(timeline.length?undefined:partial(roundData.a));
 const nowB=finished?roundData.b:exchange?exchange.sb:(timeline.length?undefined:partial(roundData.b));
 const totA=sumLines([...completed.map(r=>r.a),nowA]),totB=sumLines([...completed.map(r=>r.b),nowB]);
 const v=(line:number[],i:number)=>Math.round(line[i]||0);
 const strikesA=v(totA,STAT.SIGL),strikesB=v(totB,STAT.SIGL);
 const prevBeat=previousRound?.timeline?.at(-1);
 const damageA=finished?(timeline.at(-1)?.damageA??0):exchange?.damageA??Math.round((prevBeat?.damageA??0)*.92);
 const damageB=finished?(timeline.at(-1)?.damageB??0):exchange?.damageB??Math.round((prevBeat?.damageB??0)*.92);
 // Floating captions: actions from the last ~1.7 real seconds of playback.
 const windowSim=BUBBLE_LIFE*12*speed;
 const bubbles=finished?allActs.filter(x=>x.c==='finish'):allActs.filter(x=>x.t<=local&&local-x.t<=windowSim).slice(-7);
 const winner=world.fighters.find(f=>f.id===fight.winnerId);
 const moveNextRound=()=>{const next=roundStart+lengths[round];setElapsed(Math.min(total,next));setPlaying(next<total)};
 const phase=finished?'finish':currentPosition.toLowerCase().replace('-','');
 const statRow=(label:string,x:string,y:string)=><><span className="ls-a">{x}</span><small>{label}</small><span className="ls-b">{y}</span></>;
 return <div className="live-backdrop premium-live-backdrop"><section className="live-broadcast premium-broadcast" role="dialog" aria-modal="true" aria-label={`Live fight broadcast: ${a.name} versus ${b.name}`}>
  <header className="broadcast-header themed-header" style={identityStyle(liveIdent)}><div className="broadcast-network"><EventLogo id={liveIdent} size={30}/><span className="broadcast-onair"><span className="live-dot"/> ON AIR</span><span>NEXUS // GLOBAL FIGHT NETWORK</span><small>{fight.eventName||'CIRCUIT NIGHT'} · {fight.year}</small></div><button onClick={onComplete} aria-label="Leave broadcast and save fight result"><X size={19}/></button></header>
  <div className="broadcast-banner"><span>{boutBanner(fight)}</span><strong>{finished?'OFFICIAL RESULT':`ROUND ${round+1} / ${fight.scheduledRounds||3}`}</strong><span className="broadcast-big-clock">{finished?fight.method:clock}</span></div>
  <div className="broadcast-matchup"><div className="broadcast-contender contender-a"><div className="broadcast-avatar"><Avatar fighter={a} size={160}/></div><span className="broadcast-flag">{a.flag} {a.country}</span><h2>{a.name}</h2><span className="broadcast-specialty">{a.style} · #{fight.rankBeforeA}</span><div className="energy-caption">ENERGY <strong>{finished?roundData.staminaA:energyA}%</strong></div><div className="broadcast-bar"><i style={{width:`${finished?roundData.staminaA:energyA}%`}}/></div></div>
  <div className="broadcast-arena"><div className="arena-backlights"/><div className="arena-badge">{finished?'FIGHT COMPLETE':`${currentPosition} EXCHANGE`}</div><div className={`arena-surface phase-${phase} ${playing?'in-motion':'paused'} ${finished&&stopped?'finish-flash':''}`}><div className="arena-floor"/><div className="arena-grid"/><div className="arena-athlete arena-attacker"><Avatar fighter={a} size={105}/></div><div className="arena-hit"><Zap size={23}/></div><div className="arena-athlete arena-defender"><Avatar fighter={b} size={105}/></div></div>
   <div className="arena-bubbles" aria-live="polite">{bubbles.map((act,i)=>{const h=hash(`${round}-${act.t}-${act.k}-${i}`);const left=act.c==='finish'?50:act.by===0?18+h%24:58+h%24;return <span key={`${round}-${act.t}-${act.k}-${act.by}`} className={`action-bubble cat-${act.c} side-${act.by===0?'a':'b'}`} style={{left:`${left}%`,marginBottom:act.c==='finish'?0:(h%3)*16}}>{actionLabel(act.k)}</span>;})}</div>
   {finished?<div className="arena-outcome"><Crown size={24}/><b>{winner?winner.name:'DRAW'}</b><span>{winner?'VICTOR':'NO WINNER'} · {fight.method} · ROUND {fight.finishRound} / {fight.finishTime}</span>{fight.titleChange&&<small>NEW {fight.belt?BELT_SHORT[fight.belt].toUpperCase():'WORLD'} CHAMPION</small>}</div>:<div className="arena-score"><span>{strikesA}<small>SIG. STRIKES</small></span><strong>{scoreA} <i>—</i> {scoreB}</strong><span>{strikesB}<small>SIG. STRIKES</small></span></div>}</div>
  <div className="broadcast-contender contender-b"><div className="broadcast-avatar"><Avatar fighter={b} size={160}/></div><span className="broadcast-flag">{b.flag} {b.country}</span><h2>{b.name}</h2><span className="broadcast-specialty">{b.style} · #{fight.rankBeforeB}</span><div className="energy-caption">ENERGY <strong>{finished?roundData.staminaB:energyB}%</strong></div><div className="broadcast-bar alt"><i style={{width:`${finished?roundData.staminaB:energyB}%`}}/></div></div></div>
  {(totA.length>0||totB.length>0||timeline.length>0)&&<div className="live-stats"><div className="ls-head"><span>{a.name.split(' ').at(-1)?.toUpperCase()}</span><span>LIVE FIGHT STATS</span><span>{b.name.split(' ').at(-1)?.toUpperCase()}</span></div>
   {statRow('Sig. strikes',`${v(totA,STAT.SIGL)}/${v(totA,STAT.SIG)}`,`${v(totB,STAT.SIGL)}/${v(totB,STAT.SIG)}`)}
   {statRow('Total strikes',`${v(totA,STAT.STRL)}/${v(totA,STAT.STR)}`,`${v(totB,STAT.STRL)}/${v(totB,STAT.STR)}`)}
   {statRow('Power shots',`${v(totA,STAT.POWL)}/${v(totA,STAT.POW)}`,`${v(totB,STAT.POWL)}/${v(totB,STAT.POW)}`)}
   {statRow('Takedowns',`${v(totA,STAT.TDL)}/${v(totA,STAT.TD)}`,`${v(totB,STAT.TDL)}/${v(totB,STAT.TD)}`)}
   {statRow('Sub. attempts',String(v(totA,STAT.SUBA)),String(v(totB,STAT.SUBA)))}
   {statRow('Knockdowns',String(v(totA,STAT.KD)),String(v(totB,STAT.KD)))}
   {statRow('Control',mmss(v(totA,STAT.CTRL)),mmss(v(totB,STAT.CTRL)))}
   <span className="ls-a"><span className="damage-meter right"><div><i style={{width:`${Math.min(100,damageA)}%`}}/></div>{damageA}</span></span><small>Damage taken</small><span className="ls-b"><span className="damage-meter"><div><i style={{width:`${Math.min(100,damageB)}%`}}/></div>{damageB}</span></span>
  </div>}
  <div className="broadcast-timeline"><div className="timeline-heading"><span><Clock3 size={15}/> MINUTE-BY-MINUTE</span><strong>{finished?'FINAL':`R${round+1} · MINUTE ${minute}`}</strong></div><div className="minute-segments" aria-label="Current round progression">{[0,1,2,3,4].map(i=><div key={i} className={`minute-segment ${local>=i*60?'minute-reached':''} ${Math.floor(local/60)===i&&!finished?'minute-now':''}`}><span>0{i+1}</span><div><i style={{width:`${Math.max(0,Math.min(100,(local-i*60)/60*100))}%`}}/></div></div>)}</div><div className="timeline-rounds">{fight.rounds.map((r,i)=><span key={r.number} className={i===round?'active':i<round?'past':''}>ROUND {r.number}{i<round&&r.cards?` · ${r.scoreA}-${r.scoreB}`:''}</span>)}</div></div>
  <div className="broadcast-commentary premium-commentary"><div className="eyebrow"><Volume2 size={15}/> {finished?'OFFICIAL RESULT':'LIVE COMBAT INTELLIGENCE'}</div><p key={`${round}-${latestAction?.t??Math.floor(local/60)}-${finished}`} className="commentary-active">{shownNote}{finished&&fight.titleChange?` The ${fight.belt?BELT_SHORT[fight.belt]:'World Crown'} has changed hands.`:''}</p><div className="commentary-stats"><span>ROUND {round+1}</span><span>{v(totA,STAT.TDL)} / {v(totB,STAT.TDL)} TAKEDOWNS</span><span>{Math.floor(elapsed/60)} MINUTES ELAPSED</span></div></div>
  <footer className="broadcast-controls premium-controls"><div className="transport-controls"><button onClick={()=>setPlaying(v=>!v)} disabled={finished} aria-label={playing?'Pause fight':'Resume fight'}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':'Play'}</button><button onClick={()=>setSpeed(v=>v===1?2:v===2?4:1)} disabled={finished} title="Change playback speed"><Zap size={16}/> {speed}×</button><button onClick={moveNextRound} disabled={finished}><SkipForward size={17}/> Next round</button><button onClick={()=>{setElapsed(total);setPlaying(false)}} disabled={finished}><FastForward size={17}/> Skip result</button></div>{finished?<button className="broadcast-finish" onClick={onComplete}><Trophy size={17}/> CONFIRM RESULT <ArrowRight size={17}/></button>:<div className="broadcast-playback-caption">Replay of the official simulation · No spoilers</div>}</footer>
 </section></div>;
}
