import './nexus-refinements.css';
import {useEffect,useState} from 'react';
import {rankText} from './ui';
import {Flag} from './Flag';
import {ArrowRight,ChevronRight,Clock3,Crown,FastForward,Pause,Play,SkipForward,Trophy,Volume2,X,Zap} from 'lucide-react';
import {Avatar} from './Avatar';
import type {BeltId,CrownReign,Fight,World} from '../engine/types';
import {STAT} from '../engine/combat';
import {actionLabel,actionSentence} from './actionText';
import {BELT_NAMES,BELT_SHORT,CONTINENTAL_BELTS,beltState,isBrandBelt,isTopBelt,TITLE_MONTHS} from '../engine/belts';
import {MONTHS} from '../engine/competition';
import {reignDuration} from '../engine/legacy';
import {EventLogo,identityFor,identityStyle} from './EventIdentity';
import './pass2.css';

/** Lineage of every belt: the World Crown (with interim titles) and the four continental belts. */
export function CrownLineage({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
 const [belt,setBelt]=useState<BeltId>('NOVA');
 const athlete=(id:string)=>world.fighters.find(f=>f.id===id);
 const c=beltState(world,belt);
 const rows=(list:CrownReign[],label:string)=>list.slice().reverse().map((reign,i)=>{const f=athlete(reign.fighterId);if(!f)return null;const isCurrent=!reign.endYear;const days=reignDuration(world,reign);return <button onClick={()=>onFighter(f.id)} key={`${label}-${reign.startFightId}-${i}`} className={`reign-row ${isCurrent?'reign-current':''}`}><div className="reign-avatar"><Avatar fighter={f} size={48}/></div><div><strong>{f.name} {isCurrent&&<span className="reign-current-label">{label}</span>}</strong><small><Flag code={f.flag}/> · {reign.startYear} – {isCurrent?'Present':reign.endYear} · {reign.defenses} defense{reign.defenses===1?'':'s'}{reign.via==='split'?' · carried over at the brand split':reign.via?' · elevated from interim':''}</small></div><div className="reign-days"><b>{days}</b><small>DAYS</small></div><ChevronRight size={15}/></button>;});
 return <section className="panel crown-panel"><div className="section-heading"><div><div className="eyebrow">CHAMPIONSHIP ARCHIVE</div><h2>{BELT_NAMES[belt]} lineage</h2></div><Crown size={20}/></div>
  <div className="belt-tabs">{(['NOVA','ONYX',...CONTINENTAL_BELTS,...(world.crown.reigns.length?['WORLD']:[])] as BeltId[]).map(b=><button key={b} className={b===belt?'active':''} onClick={()=>setBelt(b)}>{BELT_SHORT[b]}</button>)}</div>
  {c.reigns.length===0?<div className="chronicle-empty">{isBrandBelt(belt)?`The ${belt} World Title is vacant. It is contested on ${TITLE_MONTHS[belt].map(m=>MONTHS[m]).join(', ')} title nights.`:'This belt is vacant. Continental titles are contested on the third weekly card of February, May, August and November.'}</div>:
  <div className="reign-ledger">{rows(c.reigns,'CHAMPION')}</div>}
  {(c.interimReigns?.length||0)>0&&<><div className="belt-subhead">INTERIM TITLE HISTORY</div><div className="reign-ledger">{rows(c.interimReigns!,'INTERIM')}</div></>}
 </section>;
}
const sumLines=(lines:(number[]|undefined)[])=>lines.reduce<number[]>((acc,l)=>{if(l)l.forEach((v,i)=>{acc[i]=(acc[i]||0)+v;});return acc;},[]);
const mmss=(sec:number)=>`${Math.floor(sec/60)}:${String(Math.round(sec%60)).padStart(2,'0')}`;
/** Real seconds a floating caption stays on screen. Playback runs at 12 simulated seconds per real second at 1×. */
const BUBBLE_LIFE=1.7;
function hash(text:string){let h=7;for(const ch of text)h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h);}
export function boutBanner(fight:Fight){
 const belt=fight.belt?BELT_SHORT[fight.belt]:'World Crown';
 if(fight.kind==='pinnacle')return 'THE PINNACLE · NOVA v ONYX UNIFIER';
 if(fight.kind==='contract')return 'TITLE-SHOT CONTRACT';
 if(fight.tournamentId?.startsWith('tag-'))return 'DOUBLES CROWN · COUNTRY TIE';
 if(fight.tournamentId?.startsWith('supremacy-'))return 'CONTINENTAL SUPREMACY';
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
 const liveIdent=identityFor(fight.eventName,!!fight.belt&&!isTopBelt(fight.belt));
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
 const playA=world.fighters.find(f=>f.id===liveBeat?.activeA)??a,playB=world.fighters.find(f=>f.id===liveBeat?.activeB)??b;
 const shownNote=finished?(fight.headline||'Final decision confirmed'):latestAction?actionSentence(latestAction,playA.name,playB.name):visibleNotes.at(-1)||'Both fighters circle, measure distance and look for the opening.';
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
 const bubbles=finished?[]:allActs.filter(x=>x.t<=local&&local-x.t<=windowSim).slice(-7);
 const winner=world.fighters.find(f=>f.id===fight.winnerId);
 const moveNextRound=()=>{const next=roundStart+lengths[round];setElapsed(Math.min(total,next));setPlaying(next<total)};
 const phase=finished?'finish':currentPosition.toLowerCase().replace('-','');
 const statRow=(label:string,x:string,y:string)=><><span className="ls-a">{x}</span><small>{label}</small><span className="ls-b">{y}</span></>;
 return <div className="live-backdrop premium-live-backdrop"><section className="live-broadcast premium-broadcast" role="dialog" aria-modal="true" aria-label={`Live fight broadcast: ${fight.tag?`${fight.tag.a} versus ${fight.tag.b}`:`${a.name} versus ${b.name}`}`} >
  <header className="broadcast-header themed-header" style={identityStyle(liveIdent)}><div className="broadcast-network"><EventLogo id={liveIdent} size={30}/><span className="broadcast-onair"><span className="live-dot"/> ON AIR</span><span>NEXUS // GLOBAL FIGHT NETWORK</span><small>{fight.eventName||'CIRCUIT NIGHT'} · {fight.year}</small></div><button onClick={onComplete} aria-label="Leave broadcast and save fight result"><X size={19}/></button></header>
  {fight.tag&&<div className="tag-live-teams">{([[fight.tag.a,fight.tag.teamA],[fight.tag.b,fight.tag.teamB]] as const).map(([country,ids])=><div key={country} className="tag-live-team"><div className="tag-live-country"><Flag code={world.fighters.find(f=>f.id===ids[0])?.flag}/><b>{country}</b></div><div className="tag-live-players">{ids.map(id=>{const f=world.fighters.find(x=>x.id===id);return f?<span key={id}>{f.name}</span>:null;})}</div></div>)}</div>}
  <div className="broadcast-banner"><span>{boutBanner(fight)}</span><strong>{finished?'OFFICIAL RESULT':`ROUND ${round+1} / ${fight.scheduledRounds||3}`}</strong><span className="broadcast-big-clock">{finished?fight.method:clock}</span></div>
  <div className="broadcast-matchup"><div className="broadcast-contender contender-a"><div className="broadcast-avatar"><Avatar fighter={playA} size={160}/></div><span className="broadcast-flag"><Flag code={a.flag}/> {a.country}</span><h2>{playA.name}</h2><span className="broadcast-specialty">{playA.style} · {rankText(fight.rankBeforeA)}</span><div className="energy-caption">ENERGY <strong>{finished?roundData.staminaA:energyA}%</strong></div><div className="broadcast-bar"><i style={{width:`${finished?roundData.staminaA:energyA}%`}}/></div></div>
  <div className="broadcast-arena"><div className="arena-backlights"/><div className="arena-badge">{finished?'FIGHT COMPLETE':`${currentPosition} EXCHANGE`}</div><div className={`arena-surface phase-${phase} ${playing?'in-motion':'paused'} ${finished&&stopped?'finish-flash':''}`}><div className="arena-floor"/><div className="arena-grid"/><div className="arena-athlete arena-attacker"><Avatar fighter={playA} size={105}/></div><div className="arena-hit"><Zap size={23}/></div><div className="arena-athlete arena-defender"><Avatar fighter={playB} size={105}/></div></div>
   <div className="arena-bubbles" aria-live="polite">{bubbles.map((act,i)=>{const h=hash(`${round}-${act.t}-${act.k}-${i}`);const left=act.c==='finish'?50:act.by===0?18+h%24:58+h%24;return <span key={`${round}-${act.t}-${act.k}-${act.by}`} className={`action-bubble cat-${act.c} side-${act.by===0?'a':'b'}`} style={{left:`${left}%`,marginBottom:act.c==='finish'?0:(h%3)*16}}>{actionLabel(act.k)}</span>;})}</div>
   {finished?<div className="arena-finished-label">OFFICIAL RESULT</div>:<div className="arena-score"><span>{strikesA}<small>SIG. STRIKES</small></span><strong>{scoreA} <i>—</i> {scoreB}</strong><span>{strikesB}<small>SIG. STRIKES</small></span></div>}</div>
  <div className="broadcast-contender contender-b"><div className="broadcast-avatar"><Avatar fighter={playB} size={160}/></div><span className="broadcast-flag"><Flag code={b.flag}/> {b.country}</span><h2>{playB.name}</h2><span className="broadcast-specialty">{playB.style} · {rankText(fight.rankBeforeB)}</span><div className="energy-caption">ENERGY <strong>{finished?roundData.staminaB:energyB}%</strong></div><div className="broadcast-bar alt"><i style={{width:`${finished?roundData.staminaB:energyB}%`}}/></div></div></div>
  {finished&&<div className="nexus-result-summary" role="status"><Crown size={23}/><div><span>WINNER · {fight.method} · ROUND {fight.finishRound} · {fight.finishTime}</span><strong>{fight.tag?(fight.tag.winner??'DRAW'):winner?.name??'DRAW'}</strong>{fight.titleChange&&<small>NEW {fight.belt?BELT_SHORT[fight.belt].toUpperCase():'WORLD'} CHAMPION</small>}</div></div>}
  <div className="nexus-energy-hud" aria-label="Live fighter energy"><div><b>{fight.tag?fight.tag.a:playA.name}</b><span>ENERGY {Math.round(finished?roundData.staminaA:energyA)}%</span><meter min="0" max="100" value={Math.max(0,Math.min(100,finished?roundData.staminaA:energyA))}/></div><div><b>{fight.tag?fight.tag.b:playB.name}</b><span>ENERGY {Math.round(finished?roundData.staminaB:energyB)}%</span><meter min="0" max="100" value={Math.max(0,Math.min(100,finished?roundData.staminaB:energyB))}/></div></div>
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
