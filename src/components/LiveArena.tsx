import './nexus-refinements.css';
import {useEffect,useState} from 'react';
import {useDialog} from './useDialog';
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
import './live-board.css';
import {BoardNum,Lamp,Meter} from './board';
import {brandStyle} from './Bout';

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
 const dialogRef=useDialog<HTMLElement>(onComplete);
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
 const nameA=fight.tag?fight.tag.a:playA.name,nameB=fight.tag?fight.tag.b:playB.name;
 const enA=Math.round(finished?roundData.staminaA:energyA),enB=Math.round(finished?roundData.staminaB:energyB);
 const stats:{label:string;a:number;b:number;ta?:string;tb?:string}[]=[
  {label:'Sig. strikes',a:v(totA,STAT.SIGL),b:v(totB,STAT.SIGL),ta:`${v(totA,STAT.SIGL)}/${v(totA,STAT.SIG)}`,tb:`${v(totB,STAT.SIGL)}/${v(totB,STAT.SIG)}`},
  {label:'Total strikes',a:v(totA,STAT.STRL),b:v(totB,STAT.STRL),ta:`${v(totA,STAT.STRL)}/${v(totA,STAT.STR)}`,tb:`${v(totB,STAT.STRL)}/${v(totB,STAT.STR)}`},
  {label:'Power shots',a:v(totA,STAT.POWL),b:v(totB,STAT.POWL),ta:`${v(totA,STAT.POWL)}/${v(totA,STAT.POW)}`,tb:`${v(totB,STAT.POWL)}/${v(totB,STAT.POW)}`},
  {label:'Takedowns',a:v(totA,STAT.TDL),b:v(totB,STAT.TDL),ta:`${v(totA,STAT.TDL)}/${v(totA,STAT.TD)}`,tb:`${v(totB,STAT.TDL)}/${v(totB,STAT.TD)}`},
  {label:'Sub. attempts',a:v(totA,STAT.SUBA),b:v(totB,STAT.SUBA)},
  {label:'Knockdowns',a:v(totA,STAT.KD),b:v(totB,STAT.KD)},
  {label:'Control',a:v(totA,STAT.CTRL),b:v(totB,STAT.CTRL),ta:mmss(v(totA,STAT.CTRL)),tb:mmss(v(totB,STAT.CTRL))}];
 const showStats=totA.length>0||totB.length>0||timeline.length>0;
 const corner=(p:typeof a,side:'a'|'b',flagOf:typeof a,rank:number,energy:number)=><div className={`lv-corner lv-${side}`} style={brandStyle(p)}>
  <span className="lv-portrait"><Avatar fighter={p} size={150}/></span>
  <div className="lv-id"><h2>{p.name}</h2><span className="lv-rank">{rankText(rank)} · {p.style}</span><span className="lv-nation"><Flag code={flagOf.flag}/>{flagOf.country}</span></div>
  <div className="lv-energy"><span>Energy <b>{energy}%</b></span><Meter value={energy} segments={20} tone={energy<30?'loss':undefined} label={`${p.name} energy`}/></div>
 </div>;
 return <div className="lv-shade"><section ref={dialogRef} className="lv" style={identityStyle(liveIdent)} role="dialog" aria-modal="true" aria-label={`Live fight broadcast: ${fight.tag?`${fight.tag.a} versus ${fight.tag.b}`:`${a.name} versus ${b.name}`}`}>
  <header className="lv-top"><EventLogo id={liveIdent} size={34}/><span className="lv-event"><b>{fight.eventName||'Circuit night'}</b> · {fight.year}</span><span className={`lv-onair ${finished?'is-off':''}`}><Lamp tone={finished?'off':'amber'}/>{finished?'Final':'Live'}</span><span className={`lv-banner ${fight.titleFight||fight.kind?'is-title':''}`}>{boutBanner(fight)}</span><button className="nx-icon" onClick={onComplete} aria-label="Leave broadcast and save fight result"><X size={20}/></button></header>
  {fight.tag&&<div className="lv-tag">{([[fight.tag.a,fight.tag.teamA],[fight.tag.b,fight.tag.teamB]] as const).map(([country,ids])=><div key={country}><b><Flag code={world.fighters.find(f=>f.id===ids[0])?.flag}/>{country}</b><span>{ids.map(id=>world.fighters.find(x=>x.id===id)?.name).filter(Boolean).join(' / ')}</span></div>)}</div>}
  <div className="lv-board">
   {corner(playA,'a',a,fight.rankBeforeA,enA)}
   <div className="lv-clock">
    <span className="lv-round">{finished?'Official result':`Round ${round+1} of ${fight.scheduledRounds||3}`}</span>
    <BoardNum value={finished?fight.method:clock} size="xl" tone={finished?'title':'amber'}/>
    {!finished&&<div className="lv-score" aria-label={`Points after completed rounds: ${scoreA} to ${scoreB}`}><BoardNum value={scoreA} size="l"/><span aria-hidden="true">–</span><BoardNum value={scoreB} size="l"/></div>}
    {!finished&&<span className="lv-score-label">Points · completed rounds</span>}
    {finished&&<span className="lv-score-label">Round {fight.finishRound} · {fight.finishTime}</span>}
   </div>
   {corner(playB,'b',b,fight.rankBeforeB,enB)}
  </div>
  <div className="lv-stage">
   <span className="lv-position">{finished?'Fight complete':`${currentPosition.toLowerCase()} exchange`}</span>
   <div className={`arena-surface phase-${phase} ${playing?'in-motion':'paused'} ${finished&&stopped?'finish-flash':''}`}><div className="arena-athlete arena-attacker"><Avatar fighter={playA} size={96}/></div><div className="arena-hit"><Zap size={22}/></div><div className="arena-athlete arena-defender"><Avatar fighter={playB} size={96}/></div></div>
   <div className="arena-bubbles" aria-live="polite">{bubbles.map((act,i)=>{const h=hash(`${round}-${act.t}-${act.k}-${i}`);const left=act.c==='finish'?50:act.by===0?18+h%24:58+h%24;return <span key={`${round}-${act.t}-${act.k}-${act.by}`} className={`action-bubble cat-${act.c} side-${act.by===0?'a':'b'}`} style={{left:`${left}%`,marginBottom:act.c==='finish'?0:(h%3)*16}}>{actionLabel(act.k)}</span>;})}</div>
   <div className="lv-sig"><span><BoardNum value={strikesA} size="m"/><small>Sig. strikes</small></span><span><BoardNum value={strikesB} size="m"/><small>Sig. strikes</small></span></div>
  </div>
  {finished&&<div className="lv-result" role="status"><span className="lv-result-label"><Lamp tone="title"/>Winner · {fight.method} · round {fight.finishRound} · {fight.finishTime}</span><strong>{fight.tag?(fight.tag.winner??'Draw'):winner?.name??'Draw'}</strong>{fight.titleChange&&<span className="lv-result-title">New {fight.belt?BELT_SHORT[fight.belt]:'World'} champion</span>}</div>}
  <p className="lv-call" key={`${round}-${latestAction?.t??Math.floor(local/60)}-${finished}`}><Volume2 size={16}/><span>{shownNote}{finished&&fight.titleChange?` The ${fight.belt?BELT_SHORT[fight.belt]:'World Crown'} has changed hands.`:''}</span></p>
  {showStats&&<table className="lv-stats"><caption className="sr-only">Live fight statistics</caption><thead><tr><th scope="col" className="lv-sa">{nameA}</th><th scope="col">Live fight stats</th><th scope="col" className="lv-sb">{nameB}</th></tr></thead><tbody>
   {stats.map(r=>{const max=Math.max(1,r.a,r.b);return <tr key={r.label}><td className="lv-sa"><span className="lv-bar"><i style={{width:`${r.a/max*100}%`}}/></span><b>{r.ta??r.a}</b></td><th scope="row">{r.label}</th><td className="lv-sb"><b>{r.tb??r.b}</b><span className="lv-bar"><i style={{width:`${r.b/max*100}%`}}/></span></td></tr>;})}
   <tr className="lv-damage"><td className="lv-sa"><span className="lv-bar"><i style={{width:`${Math.min(100,damageA)}%`}}/></span><b>{damageA}</b></td><th scope="row">Damage taken</th><td className="lv-sb"><b>{damageB}</b><span className="lv-bar"><i style={{width:`${Math.min(100,damageB)}%`}}/></span></td></tr>
  </tbody></table>}
  <div className="lv-timeline">
   <span className="lv-tl-label"><Clock3 size={15}/>{finished?'Final':`R${round+1} · minute ${minute}`}</span>
   <ol className="lv-minutes" aria-label="Current round, minute by minute">{[0,1,2,3,4].map(i=><li key={i} className={`${local>=i*60?'is-reached':''} ${Math.floor(local/60)===i&&!finished?'is-now':''}`}><span>{i+1}</span><i><b style={{width:`${Math.max(0,Math.min(100,(local-i*60)/60*100))}%`}}/></i></li>)}</ol>
   <ol className="lv-rounds" aria-label="Rounds">{fight.rounds.map((r,i)=><li key={r.number} className={i===round?'is-now':i<round?'is-past':''}><Lamp tone={i===round&&!finished?'amber':'off'}/>R{r.number}{i<round&&r.cards?<small>{r.scoreA}-{r.scoreB}</small>:null}</li>)}</ol>
  </div>
  <footer className="lv-controls"><div className="lv-transport" role="group" aria-label="Playback"><button className="bd-btn" onClick={()=>setPlaying(v=>!v)} disabled={finished} aria-label={playing?'Pause fight':'Resume fight'}>{playing?<Pause size={16}/>:<Play size={16}/>}{playing?'Pause':'Play'}</button><button className="bd-btn" onClick={()=>setSpeed(v=>v===1?2:v===2?4:1)} disabled={finished} title="Change playback speed"><Zap size={16}/>{speed}×</button><button className="bd-btn" onClick={moveNextRound} disabled={finished}><SkipForward size={16}/>Next round</button><button className="bd-btn" onClick={()=>{setElapsed(total);setPlaying(false)}} disabled={finished}><FastForward size={16}/>Skip result</button></div>
   {finished?<button className="bd-btn bd-btn-next lv-confirm" onClick={onComplete}><Trophy size={16}/>Confirm result<ArrowRight size={16}/></button>:<span className="lv-note">Replay of the official simulation · no spoilers · {Math.floor(elapsed/60)} min elapsed</span>}</footer>
 </section></div>;
}
