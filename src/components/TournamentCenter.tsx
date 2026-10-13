import {useState} from 'react';
import {ArrowRight,CalendarDays,ChevronRight,Crown,Medal,Play,SkipForward,Swords,Trophy,Zap} from 'lucide-react';
import {Avatar} from './Avatar';
import {eventNameAt,kindAt,nextTournamentKind,standings,currentTournament,pendingTournamentMatch} from '../engine/tournaments';
import {CALENDAR} from '../engine/competition';
import type {Tournament,World,TournamentMatch} from '../engine/types';
import './tournaments.css';
import {EventLogo,EventWordmark,IDENTITIES,identityFor,identityStyle} from './EventIdentity';

const displayName=(k:Tournament['kind'])=>k==='OLYMPIAD'?'WORLD COMBAT OLYMPIAD':k==='CRUCIBLE'?'THE CRUCIBLE':'THE SURGE';
const fighter=(w:World,id:string)=>w.fighters.find(f=>f.id===id)!;
const stageName=(t:Tournament)=>t.kind==='SURGE'?'The Arena':t.kind==='CRUCIBLE'?['Group Matchday 1','Group Matchday 2','Group Matchday 3','Semifinals','Final'][t.stage]:['Preliminaries','Round of 32','Round of 16','Quarterfinals','Semifinals','Final'][t.stage];
function PlayerTag({world,id,onFighter,small=false}:{world:World;id:string;onFighter:(id:string)=>void;small?:boolean}){
 const f=fighter(world,id);return <button className="tr-player" onClick={()=>onFighter(id)} title={`${f.name} · ${f.style}`}><Avatar fighter={f} size={small?32:42}/><span><b>{f.flag} {f.name}</b><small>{f.style} · {f.record.wins}-{f.record.losses}</small></span></button>;
}
function BoutTile({world,m,onFighter,onFight,active}:{world:World;m:TournamentMatch;onFighter:(id:string)=>void;onFight:(id:string)=>void;active:boolean}){
 const done=!!m.fightId;
 return <div className={`tr-match ${done?'completed':''} ${active?'upcoming':''}`}>
  <div className="tr-match-heading"><span>{m.group?`GROUP ${m.group} · `:''}{m.stage}</span>{done?<span>{m.fightId?.startsWith('walkover-')?'MEDICAL ADVANCE':'FINAL'}</span>:<span>NOT PLAYED</span>}</div>
  <div className="tr-competitors"><PlayerTag world={world} id={m.fighterA} onFighter={onFighter} small/><span className="tr-versus">VS</span><PlayerTag world={world} id={m.fighterB} onFighter={onFighter} small/></div>
  {done?<div className="tr-match-result"><Crown size={14}/><b>{m.winnerId?fighter(world,m.winnerId).name:'DRAW'}</b><span>{m.fightId?.startsWith('walkover-')?'Medical walkover':'Winner'} </span>{m.fightId&&!m.fightId.startsWith('walkover-')&&<button onClick={()=>onFight(m.fightId!)}>Fight report <ChevronRight size={13}/></button>}</div>:<div className="tr-unplayed"><span className="tr-unplayed-dot"/> Result unknown</div>}
 </div>;
}
function Groups({world,t,onFighter}:{world:World;t:Tournament;onFighter:(id:string)=>void}){
 const s=standings(t);
 return <div className="tr-groups">{(['A','B'] as const).map(g=><div className="tr-group" key={g}><header><span>GROUP {g}</span><small>TOP 2 ADVANCE</small></header><table><thead><tr><th>FIGHTER</th><th>P</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>{s[g].map((v,i)=><tr key={v.id}><td><button onClick={()=>onFighter(v.id)}><span className="tr-qualifier">{i+1}</span> {fighter(world,v.id).flag} {fighter(world,v.id).name}</button></td><td><strong>{v.points}</strong></td><td>{v.wins}</td><td>{v.draws}</td><td>{v.losses}</td></tr>)}</tbody></table></div>)}</div>;
}
function Surge({world,t,onFighter}:{world:World;t:Tournament;onFighter:(id:string)=>void}){
 const latest=t.surgeMoments?.at(-1);const inside=t.surgeActive||[];const entered=t.surgeMoments?.length||0;
 return <div className="tr-surge-panel"><div className="tr-surge-arena"><div className="tr-surge-ring"><div className="tr-surge-stage"><Swords size={40}/><strong>{inside.length}</strong><span>FIGHTERS IN ARENA</span></div></div><div className="tr-surge-entrants"><div><span>ENTRANTS REVEALED</span><strong>{entered} / 20</strong></div><div><span>ELIMINATED</span><strong>{20-(t.surgeOrder?.length||20)+entered-inside.length}</strong></div></div>{latest&&<div className="tr-surge-latest"><span>WAVE {latest.wave}</span><b>{latest.entrantId?`${fighter(world,latest.entrantId).name} enters the arena`: 'The arena closes in'}</b>{latest.eliminatedId&&<small>{fighter(world,latest.eliminatedId).name} eliminated {latest.byId?`by ${fighter(world,latest.byId).name}`:''}</small>}</div>}</div>
 <div className="tr-survivors"><header>STILL IN THE FIGHT</header>{inside.length?inside.map(id=><PlayerTag key={id} world={world} id={id} onFighter={onFighter} small/>):<p>Entrants appear one at a time. Nobody's elimination or victory is decided yet.</p>}</div>
 <div className="tr-survivors"><header>ELIMINATION HISTORY</header>{(t.surgeMoments||[]).filter(m=>m.eliminatedId).slice().reverse().slice(0,12).map(m=><div className="tr-elimination" key={m.wave}><span>#{m.wave}</span><b>{fighter(world,m.eliminatedId!).name}</b><small>{m.byId?`eliminated by ${fighter(world,m.byId).name}`:'eliminated'}</small></div>)}</div></div>;
}
function TrophyArchive({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
 const archive=world.tournaments.filter(t=>t.status==='complete').slice().reverse();
 return <section className="panel tr-archive"><div className="section-heading"><div><div className="eyebrow">THE CHRONICLE ARCHIVE</div><h2>Winners across the eras</h2></div><span className="subtle-tag">{archive.length} TITLES</span></div>{archive.length===0?<p className="empty-msg">The first tournaments are yet to be contested.</p>:<div className="tr-archive-grid">{archive.slice(0,90).map(t=><button key={t.id} className="tr-archive-item" onClick={()=>onFighter(t.winnerId!)}><span>{t.kind==='OLYMPIAD'?'✦':t.kind==='CRUCIBLE'?'◆':'⚡'} {t.year} · {displayName(t.kind)}</span><div><Avatar fighter={fighter(world,t.winnerId!)} size={44}/><strong>{fighter(world,t.winnerId!).flag} {fighter(world,t.winnerId!).name}</strong><Trophy size={18}/></div></button>)}</div>}</section>;
}
/** The next special event on the calendar, this season or next. */
function nextSpecial(world:World){
 for(let r=world.round;r<60;r++){const k=kindAt(world.year,r);if(k)return {kind:k,year:world.year,month:CALENDAR[r].month};}
 return {kind:'SURGE' as const,year:world.year+1,month:CALENDAR[34].month};
}
export function TournamentCenter({world,onStart,onWatch,onSkip,onSkipStage,onFinish,onFighter,onFight,onTape}:{world:World;onStart:()=>void;onWatch:()=>void;onSkip:()=>void;onSkipStage:()=>void;onFinish:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;onTape:(a:string,b:string)=>void}){
 const t=currentTournament(world);const nextKind=nextTournamentKind(world);const slot=nextKind?displayName(nextKind):eventNameAt(world.year,world.round);const nextMatch=t?pendingTournamentMatch(t):null;
 const [historyType,setHistoryType]=useState<'all'|'CRUCIBLE'|'SURGE'|'OLYMPIAD'>('all');
 const past=world.tournaments.filter(x=>historyType==='all'||x.kind===historyType).slice().reverse();
 const [selectedPast,setSelectedPast]=useState<string>('');
 const selected=t||past.find(x=>x.id===selectedPast)||past[0]||null;
 return <div className="tr-page">
  <div className="page-title"><div><div className="eyebrow"><span className="live-dot"/> THE THREE PATHS TO IMMORTALITY</div><h1>Grand <span>Tournaments.</span></h1><p>Fight for the Grand Prix, survive the twenty-entrant Royale, or win the quadrennial Olympiad. Brackets reveal only completed results.</p></div></div>
  <div className="tr-event-tiles"><div className="tr-event-tile crucible themed" style={identityStyle(IDENTITIES['THE CRUCIBLE'])}><EventLogo id={IDENTITIES['THE CRUCIBLE']} size={52}/><span><Trophy size={20}/> NOVEMBER</span><strong><EventWordmark id={IDENTITIES['THE CRUCIBLE']}>THE CRUCIBLE</EventWordmark></strong><em className="ev-tagline">{IDENTITIES['THE CRUCIBLE'].tagline}</em><small>8 fighters · 2 groups · Semifinals & final</small></div><div className="tr-event-tile surge themed" style={identityStyle(IDENTITIES['THE SURGE'])}><EventLogo id={IDENTITIES['THE SURGE']} size={52}/><span><Swords size={20}/> JULY</span><strong><EventWordmark id={IDENTITIES['THE SURGE']}>THE SURGE</EventWordmark></strong><em className="ev-tagline">{IDENTITIES['THE SURGE'].tagline}</em><small>20 entrants · Annual arena eliminations</small></div><div className="tr-event-tile olympiad themed" style={identityStyle(IDENTITIES['WORLD COMBAT OLYMPIAD'])}><EventLogo id={IDENTITIES['WORLD COMBAT OLYMPIAD']} size={52}/><span><Medal size={20}/> EVERY 4 YEARS</span><strong><EventWordmark id={IDENTITIES['WORLD COMBAT OLYMPIAD']}>WORLD OLYMPIAD</EventWordmark></strong><em className="ev-tagline">{IDENTITIES['WORLD COMBAT OLYMPIAD'].tagline}</em><small>40 contenders · 39 knockout matches</small></div></div>
  {t&&<section className="tr-live panel themed" style={identityStyle(identityFor(displayName(t.kind)))}><EventLogo id={identityFor(displayName(t.kind))} size={60}/><div className="tr-live-header"><span className="tr-live-label"><span className="live-dot"/> TOURNAMENT IN PROGRESS · {t.year}</span><small>{stageName(t)} · {t.kind==='SURGE'?`${t.surgeMoments?.length||0} waves`: `${t.matches.filter(m=>m.fightId).length} fights completed`}</small></div><h2>{displayName(t.kind)}</h2><p>{t.kind==='SURGE'?'A new entrant or elimination is revealed each wave. Strategic survival and stamina determine the winner.':'Results are revealed individually. The next bracket round is created only after the current round is complete.'}</p><div className="tr-actions"><button className="btn btn-primary" onClick={onWatch}><Play size={17}/>{t.kind==='SURGE'?' Reveal next wave':' Watch next fight'}</button><button className="btn btn-secondary" onClick={onSkip}><SkipForward size={17}/>{t.kind==='SURGE'?' Next wave':' Skip next fight'}</button><button className="btn btn-quiet" onClick={onSkipStage}><Zap size={17}/> {t.kind==='SURGE'?'Advance 5 waves':'Simulate to next stage'}</button><button className="btn btn-quiet" onClick={onFinish}><ArrowRight size={16}/> Finish tournament</button></div>
  {nextMatch&&<div className="tr-next-fight"><span>UP NEXT · {nextMatch.stage.toUpperCase()}</span><div><PlayerTag world={world} id={nextMatch.fighterA} onFighter={onFighter}/><b>VS</b><PlayerTag world={world} id={nextMatch.fighterB} onFighter={onFighter}/></div><button className="btn btn-quiet" onClick={()=>onTape(nextMatch.fighterA,nextMatch.fighterB)}>Tale of the tape</button></div>}
  </section>}
  {!t&&<section className="tr-upcoming panel"><div><div className="eyebrow"><CalendarDays size={15}/> {world.year} CIRCUIT · ROUND {world.round+1}</div><h2>{slot||`Next major competition: ${displayName(nextSpecial(world).kind)}`}</h2><p>{slot?'A marquee competition is waiting. Enter it to reveal the qualified fighters and first fixtures.':`The tournament circuit follows the official event calendar. Next up: ${displayName(nextSpecial(world).kind)} in ${nextSpecial(world).month} ${nextSpecial(world).year}.`}</p></div>{slot?<button className="btn btn-primary" onClick={onStart}>Enter {slot} <ArrowRight size={17}/></button>:<span className="tr-season-caption">Use Event Calendar or advance the circuit to arrive at the next tournament</span>}</section>}
  {selected&&<><div className="tr-section-title"><span>EVENT PROGRESSION</span><strong>{displayName(selected.kind)} · {selected.year}</strong>{!t&&<select aria-label="Choose recorded tournament" value={selected.id} onChange={e=>setSelectedPast(e.target.value)}>{past.map(x=><option key={x.id} value={x.id}>{x.year} · {displayName(x.kind)}</option>)}</select>}</div>
  {selected.kind==='SURGE'?<Surge world={world} t={selected} onFighter={onFighter}/>:<>
   {selected.kind==='CRUCIBLE'&&<Groups world={world} t={selected} onFighter={onFighter}/>}
   <div className="tr-stage-grid">{Array.from(new Set(selected.matches.map(m=>m.stage))).map(st=><section className="tr-stage" key={st}><h3>{st.toUpperCase()}</h3><div>{selected.matches.filter(m=>m.stage===st).map(m=><BoutTile key={m.id} m={m} world={world} onFighter={onFighter} onFight={onFight} active={m.id===nextMatch?.id}/>)}</div></section>)}</div>
   </>}
   {selected.status==='complete'&&selected.winnerId&&<div className="tr-champion"><Medal size={28}/><div><span>{selected.year} {displayName(selected.kind)} CHAMPION</span><PlayerTag world={world} id={selected.winnerId} onFighter={onFighter}/></div></div>}
  </>}
  <div className="tr-history-filters">{(['all','CRUCIBLE','SURGE','OLYMPIAD'] as const).map(x=><button key={x} className={historyType===x?'active':''} onClick={()=>{setHistoryType(x);setSelectedPast('')}}>{x==='all'?'All history':displayName(x)}</button>)}</div>
  <TrophyArchive world={world} onFighter={onFighter}/>
 </div>;
}
