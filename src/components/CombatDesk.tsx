import {eventNameAt} from '../engine/tournaments';
import {isTopBelt} from '../engine/belts';
import {rankText} from './ui';
import {Flag} from './Flag';
import {Fragment,useMemo,useState,type RefObject} from 'react';
import {useDialog} from './useDialog';
import {Activity,ArrowRight,BarChart3,ChevronRight,Clock3,Flame,ShieldAlert,Swords,Trophy, X,Zap} from 'lucide-react';
import {Avatar} from './Avatar';
import {DIVISIONS,DIVISION_NAMES} from '../engine/constants';
import {styleAdvantage} from '../engine/combat';
import {ROUND_NAMES} from '../engine/competition';
import type {Division,Fight,Fighter,LedgerEntry,World} from '../engine/types';
import {fighterLedger,forEachLedger,getFight} from '../engine/archive';
import {STAT} from '../engine/combat';
import {BELT_SHORT} from '../engine/belts';
import {boutBanner} from './LiveArena';
import {EventLogo,identityFor} from './EventIdentity';
import './pass2.css';
const methodColor=(m:Fight['method'])=>m==='KO'||m==='TKO'?'ko':m==='SUB'?'sub':m==='DRAW'?'draw':'decision';
const formatted=(n:number)=>n>0?`+${n}`:String(n);
const clock=(sec:number)=>`${Math.floor(sec/60)}:${String(Math.round(sec%60)).padStart(2,'0')}`;
/** One line of round statistics. Supports new stat arrays and legacy (≤0.8) round fields. */
function RoundStats({r}:{r:Fight['rounds'][number]}){
 if(r.a&&r.b){const a=r.a,b=r.b;return <small>SIG. STRIKES {a[STAT.SIGL]}/{a[STAT.SIG]} – {b[STAT.SIGL]}/{b[STAT.SIG]} · TAKEDOWNS {a[STAT.TDL]}/{a[STAT.TD]} – {b[STAT.TDL]}/{b[STAT.TD]} · KNOCKDOWNS {a[STAT.KD]}–{b[STAT.KD]} · CONTROL {clock(a[STAT.CTRL])}–{clock(b[STAT.CTRL])} · ENERGY {r.staminaA} / {r.staminaB}</small>;}
 return <small>STRIKES {r.strikesA??0}–{r.strikesB??0} · GRAPPLING {r.grapplingA??0}–{r.grapplingB??0} · ENERGY {r.staminaA} / {r.staminaB}</small>;
}
/** Totals and per-round breakdown from the stored stat lines. */
function FightStats({fight,a,b}:{fight:Fight;a:Fighter;b:Fighter}){
 const A=fight.statsA,B=fight.statsB;
 if(!A||!B)return <p className="empty-msg">Detailed statistics are not available for bouts recorded before v0.9.</p>;
 const rows:[string,(s:number[])=>string][]=[['Sig. strikes',s=>`${s[STAT.SIGL]} of ${s[STAT.SIG]}`],['Sig. accuracy',s=>s[STAT.SIG]?`${Math.round(100*s[STAT.SIGL]/s[STAT.SIG])}%`:'—'],['Total strikes',s=>`${s[STAT.STRL]} of ${s[STAT.STR]}`],['Power shots',s=>`${s[STAT.POWL]} of ${s[STAT.POW]}`],['Takedowns',s=>`${s[STAT.TDL]} of ${s[STAT.TD]}`],['Sub. attempts',s=>String(s[STAT.SUBA])],['Knockdowns',s=>String(s[STAT.KD])],['Control time',s=>clock(s[STAT.CTRL])],['Damage dealt',s=>String(s[STAT.DMG])]];
 return <div className="report-stats"><span className="rs-a">{a.name}</span><small>TOTALS</small><span className="rs-b">{b.name}</span>
  {rows.map(([label,f])=><Fragment key={label}><span className="rs-a">{f(A)}</span><small>{label}</small><span className="rs-b">{f(B)}</span></Fragment>)}
  {fight.rounds.filter(r=>r.a&&r.b).map(r=><Fragment key={r.number}><div className="rs-head">ROUND {r.number}</div>{rows.filter(([l])=>l!=='Sig. accuracy'&&l!=='Damage dealt').map(([label,f])=><Fragment key={label}><span className="rs-a">{f(r.a!)}</span><small>{label}</small><span className="rs-b">{f(r.b!)}</span></Fragment>)}</Fragment>)}
 </div>;
}
/** A tag fight is reported by nation and both teammates, not by its first two starters. */
function NationalTagReport({fight,world,onClose,onFighter,dialogRef}:{fight:Fight;world:World;onClose:()=>void;onFighter:(id:string)=>void;dialogRef:RefObject<HTMLElement>}){
 const t=fight.tag!;
 const sides=([ [t.a,t.teamA],[t.b,t.teamB] ] as const);
 return <div className="combat-backdrop" onClick={onClose}><section ref={dialogRef} className="combat-modal" role="dialog" aria-modal="true" aria-label="National tag-team match report" onClick={e=>e.stopPropagation()}>
  <div className="combat-modal-head"><span><EventLogo id={identityFor(fight.eventName)} size={26}/> NEXUS · COUNTRY DOUBLES · {fight.year}</span><button onClick={onClose} aria-label="Close fight report"><X size={20}/></button></div>
  <div className="tag-report-head"><small>{t.title?'DOUBLES CROWN CHAMPIONSHIP':t.challengerLock?'CHALLENGER LOCK · NEXT CROWN TITLE SHOT':'NATIONAL RANKING · TAG TEAM'}</small><h2>One match. Two nations. Four fighters.</h2>
   <div className="tag-report-teams">{sides.map(([country,ids])=><div key={country} className={`tag-report-nation ${t.winner===country?'tag-victor':''}`}>
    <h3><Flag code={world.fighters.find(f=>f.id===ids[0])?.flag} size={22}/>{country}</h3>
    {ids.map(id=>{const f=world.fighters.find(x=>x.id===id);return f?<button key={id} onClick={()=>{onClose();onFighter(id);}}><Avatar fighter={f} size={48}/><span><b>{f.name}</b><small>{f.style} · {f.mentality} · {f.division}</small></span></button>:null;})}
   </div>)}</div>
   <div className="tag-report-outcome"><Trophy size={18}/><strong>{t.winner?`${t.winner} WIN`: 'DRAW'}</strong><span>{fight.method} · Round {fight.finishRound}{fight.finishTime?` · ${fight.finishTime}`:''}</span></div>
  </div>
  <div className="fight-report-body"><div className="section-heading"><div className="eyebrow">TAG MATCH COMMENTARY</div><h2>Round by round</h2></div>
   {fight.rounds.length?fight.rounds.map(r=><div key={r.number} className="round-report"><div className="round-report-number">ROUND <strong>{r.number}</strong></div><div className="round-report-detail">{r.notes.map((note,i)=><p key={i}>{note}</p>)}<RoundStats r={r}/></div></div>):<div className="round-report"><p>{fight.headline}. Detailed exchanges are archived after the season.</p></div>}
   <div className="tag-report-footnote">Doubles results award one team win, and never add artificial individual singles victories. Both partners accumulate fatigue and career experience.</div>
  </div>
 </section></div>;
}
export function FightReport({fight,world,onClose,onFighter}:{fight:Fight;world:World;onClose:()=>void;onFighter:(id:string)=>void}){
 const [view,setView]=useState<'Commentary'|'Stats'|'Scorecard'>('Commentary');
 const dialogRef=useDialog<HTMLElement>(onClose);
 if(fight.tag)return <NationalTagReport fight={fight} world={world} onClose={onClose} onFighter={onFighter} dialogRef={dialogRef}/>;
 const a=world.fighters.find(f=>f.id===fight.fighterA),b=world.fighters.find(f=>f.id===fight.fighterB);if(!a||!b)return null;
 const aWon=fight.winnerId===a.id,bWon=fight.winnerId===b.id;
 const decision=fight.method==='UD'||fight.method==='SD'||fight.method==='MD'||fight.method==='DRAW';
 const judgeTotals=[0,1,2].map(j=>fight.rounds.filter(r=>r.cards).reduce((s,r)=>[s[0]+r.cards![j][0],s[1]+r.cards![j][1]],[0,0]));
 const hasCards=fight.rounds.some(r=>r.cards);
 const ptsA=fight.rounds.reduce((s,r)=>s+r.scoreA,0),ptsB=fight.rounds.reduce((s,r)=>s+r.scoreB,0);
 return <div className="combat-backdrop" onClick={onClose}><section ref={dialogRef} className="combat-modal" onClick={e=>e.stopPropagation()} aria-label="Fight report" role="dialog" aria-modal="true">
  <div className="combat-modal-head"><span><EventLogo id={identityFor(fight.eventName,!!fight.belt&&!isTopBelt(fight.belt))} size={26}/><span className="live-dot"/> NEXUS FIGHT ARCHIVE <strong>· {fight.year} / {fight.eventName||ROUND_NAMES[fight.roundIndex-1]}</strong></span><button onClick={onClose} aria-label="Close fight report"><X size={21}/></button></div>
  <div className="fight-report-banner"><div className="fight-report-topline">{fight.titleFight||fight.kind==='eliminator'?`${boutBanner(fight)} · `:''}{DIVISION_NAMES[fight.division]} <span>OFFICIAL RESULT · {Math.round(fight.oddsA*100)}% / {Math.round((1-fight.oddsA)*100)}% PRE-FIGHT CHANCE</span></div><div className="combat-vs">
    <button className={`fight-athlete ${aWon?'victor':''}`} onClick={()=>{onClose();onFighter(a.id);}}><Avatar fighter={a} size={115}/><strong>{a.name}</strong><small><Flag code={a.flag}/> {a.style} · {a.mentality}</small>{!fight.archived&&<span>{rankText(fight.rankBeforeA)} · {fight.overallBeforeA} OVR</span>}</button>
    <div className="combat-center-mark"><div className="versus">VS</div><div className={`finish-badge ${methodColor(fight.method)}`}>{fight.method==='DRAW'?'DRAW':fight.method}</div><strong>{fight.method==='DRAW'?'NO WINNER':(aWon?a:b).name.split(' ').at(-1)?.toUpperCase()}</strong><small>{decision?'JUDGES’ DECISION':`ROUND ${fight.finishRound}${fight.finishTime?` · ${fight.finishTime}`:''}`}</small></div>
    <button className={`fight-athlete ${bWon?'victor':''}`} onClick={()=>{onClose();onFighter(b.id);}}><Avatar fighter={b} size={115}/><strong>{b.name}</strong><small><Flag code={b.flag}/> {b.style} · {b.mentality}</small>{!fight.archived&&<span>{rankText(fight.rankBeforeB)} · {fight.overallBeforeB} OVR</span>}</button>
  </div>{fight.titleChange&&<div className="underdog-ribbon"><Trophy size={15}/> NEW {fight.belt?BELT_SHORT[fight.belt].toUpperCase():'WORLD CROWN'} CHAMPION</div>}{fight.underdogVictory&&<div className="underdog-ribbon"><Flame size={15}/> UPSET · UNDERDOG VICTORY</div>}</div>
  {fight.archived?<div className="fight-report-body"><div className="round-report"><div className="round-report-detail"><p>{fight.headline}.</p><small>This bout is kept in the permanent ledger. Round-by-round detail is archived at the end of each season except for title fights, tournament finals and award-winning bouts.</small></div></div></div>:<>
  <div className="fight-report-metrics"><div><small>RANK BEFORE → AFTER</small><strong>{fight.rankBeforeA} → {fight.rankAfterA}</strong><b>{fight.rankBeforeB} → {fight.rankAfterB}</b></div><div><small>RANKING POINTS</small><strong className={fight.ratingDeltaA>0?'positive':'negative'}>{formatted(fight.ratingDeltaA)}</strong><b className={fight.ratingDeltaB>0?'positive':'negative'}>{formatted(fight.ratingDeltaB)}</b></div><div><small>SHAPE CHANGE</small><strong className={fight.shapeDeltaA>0?'positive':'negative'}>{formatted(fight.shapeDeltaA)}</strong><b className={fight.shapeDeltaB>0?'positive':'negative'}>{formatted(fight.shapeDeltaB)}</b></div><div><small>CONDITION IMPACT</small><strong className="negative">{formatted(fight.conditionDeltaA)}</strong><b className="negative">{formatted(fight.conditionDeltaB)}</b></div></div>
  <div className="fight-report-tabs">{(['Commentary','Stats','Scorecard'] as const).map(t=><button key={t} className={view===t?'active':''} onClick={()=>setView(t)}>{t}</button>)}</div>
  <div className="fight-report-body">{view==='Stats'?<FightStats fight={fight} a={a} b={b}/>:view==='Commentary'?<>{fight.rounds.map(r=><div className="round-report" key={r.number}><div className="round-report-number">ROUND <strong>{r.number}</strong></div><div className="round-report-detail">{r.notes.length>0?r.notes.map((n,i)=><p key={i}>{n}</p>):<p>A tactical round with no single defining moment.</p>}<RoundStats r={r}/></div></div>)}</>:
   <table className="fight-scorecard"><thead><tr><th>ROUND</th>{hasCards?[0,1,2].map(j=><th key={j} colSpan={2}>JUDGE {j+1}</th>):<><th>{a.name.split(' ').at(-1)}</th><th>{b.name.split(' ').at(-1)}</th></>}</tr>{hasCards&&<tr><th/>{[0,1,2].flatMap(j=>[<th key={`a${j}`}>{a.name.split(' ').at(-1)}</th>,<th key={`b${j}`}>{b.name.split(' ').at(-1)}</th>])}</tr>}</thead>
   <tbody>{fight.rounds.map(r=><tr key={r.number}><td>R{r.number}</td>{hasCards?(r.cards?r.cards.flatMap((c,j)=>[<td key={`a${j}`}>{c[0]}</td>,<td key={`b${j}`}>{c[1]}</td>]):[<td key="stop" colSpan={6}>Stopped · not scored</td>]):<><td>{r.scoreA}</td><td>{r.scoreB}</td></>}</tr>)}
   <tr className="score-total"><td>TOTAL</td>{hasCards?judgeTotals.flatMap((t,j)=>[<td key={`a${j}`}>{t[0]}</td>,<td key={`b${j}`}>{t[1]}</td>]):<><td>{ptsA}</td><td>{ptsB}</td></>}</tr></tbody></table>}
   {fight.injuredIds.length>0&&<div className="medical-alert"><ShieldAlert size={17}/> Post-fight medical suspension: {fight.injuries?.length?fight.injuries.map(i=>`${world.fighters.find(f=>f.id===i.fighterId)?.name}: ${i.diagnosis} (${i.weeks} weeks)`).join(' · '):fight.injuredIds.map(id=>world.fighters.find(f=>f.id===id)?.name).join(', ')}</div>}</div></>}
 </section></div>
}
export function CombatDesk({world,onSimRound,onSimYear,onSelect,onFight}:{world:World;onSimRound:()=>void;onSimYear:()=>void;onSelect:(id:string)=>void;onFight:(id:string)=>void}){
 const [division,setDivision]=useState<Division|'ALL'>('NOVA S');const [method,setMethod]=useState<string>('ALL');const [scope,setScope]=useState<'Latest'|'Year'|'All-time'>('Latest');
 const fights=useMemo(()=>{
  const ok=(e:LedgerEntry)=>(division==='ALL'||e.d===division)&&(method==='ALL'||e.m===method);
  const out:Fight[]=[];
  if(scope==='Latest'){for(const id of world.lastFightIds){const f=getFight(world,id);if(f&&(division==='ALL'||f.division===division)&&(method==='ALL'||f.method===method))out.push(f);}return out.reverse().slice(0,120);}
  const years=Object.keys(world.ledger).map(Number).filter(y=>scope==='All-time'||y===world.year).sort((p,q)=>q-p);
  for(const y of years){const list=world.ledger[y];for(let i=list.length-1;i>=0&&out.length<120;i--)if(ok(list[i]))out.push(getFight(world,list[i].i)!);if(out.length>=120)break;}
  return out;
 },[world,division,method,scope]);
 const totals=useMemo(()=>{let all=0,ko=0,subs=0;forEachLedger(world,e=>{all++;if(e.m==='KO'||e.m==='TKO')ko++;if(e.m==='SUB')subs++;});return {all,ko,subs};},[world]);
 const roundFights=world.ledger[world.year]?.length||0;
 const completed=totals.all;const ko=totals.ko;const subs=totals.subs;
 const top=['NOVA S','ONYX S'].flatMap(d=>world.fighters.filter(f=>f.status==='active'&&f.division===d).sort((a,b)=>a.rank-b.rank).slice(0,3));
 const lastRoundName=world.pendingFight?`${eventNameAt(world.year,world.round)||ROUND_NAMES[world.round]} · main event pending`:world.round===0&&completed>0?'Previous season completed':world.round===0?'Founding season':`${eventNameAt(world.year,world.round-1)||ROUND_NAMES[world.round-1]} completed`;
 return <>
  <div className="page-title"><div><div className="eyebrow"><span className="live-dot"/> NEXUS MATCH CONTROL</div><h1>Combat <span>Center.</span></h1><p>Every bout is calculated exchange by exchange. Victories, method, opposition and recovery shape the world hierarchy.</p></div></div>
  <div className="combat-hero"><div><div className="eyebrow">THE {world.year} COMPETITIVE SEASON</div><h2>{world.round===0?'Awaiting the first bell':lastRoundName}</h2><p>Next up: <strong>{eventNameAt(world.year,world.round)||ROUND_NAMES[world.round]}</strong>. Forty-eight events a year (three weekly cards and one big event a month), with rankings recalculated after every card. The undercard runs first. Every featured fight remains unplayed until you watch it live or skip it on Fight Night.</p><div className="combat-hero-buttons"><button className="btn btn-primary" onClick={onSimRound}><Zap size={17}/> Go to next event <ArrowRight size={16}/></button><button className="btn btn-secondary" onClick={onSimYear}><Clock3 size={16}/> Fast sim season</button></div><div className="circuit-progress">{ROUND_NAMES.filter((_,i)=>Math.floor(i/4)===Math.floor(world.round/4)).map((name,i)=><div className={i<world.round%4?'complete':i===world.round%4?'current':''} key={name}><span/>{name.split(' · ')[0]}</div>)}</div></div><div className="combat-hero-stats"><span>WORLD FIGHTS</span><strong>{completed.toLocaleString()}</strong><small>{roundFights} bouts this season</small></div></div>
  <div className="combat-stat-strip"><div><Swords size={18}/><small>RECORDED BOUTS</small><strong>{completed.toLocaleString()}</strong></div><div><Flame size={18}/><small>KO / TKO</small><strong>{ko.toLocaleString()}</strong><span>{completed?Math.round(ko/completed*100):0}% of fights</span></div><div><Activity size={18}/><small>SUBMISSIONS</small><strong>{subs.toLocaleString()}</strong><span>{completed?Math.round(subs/completed*100):0}% of fights</span></div><div><Trophy size={18}/><small>COMPETITION YEAR</small><strong>{world.year}</strong><span>{lastRoundName}</span></div></div>
  <div className="combat-layout"><div className="combat-results panel"><div className="section-heading"><div><div className="eyebrow">REAL FIGHT RESULTS</div><h2>Official fight ledger</h2></div><span className="subtle-tag">{fights.length} SHOWN</span></div>
   <div className="combat-controls"><select aria-label="Select division" value={division} onChange={e=>setDivision(e.target.value as Division|'ALL')}><option value="ALL">All divisions</option>{DIVISIONS.map(d=><option value={d} key={d}>{DIVISION_NAMES[d]}</option>)}</select><select aria-label="Select result" value={method} onChange={e=>setMethod(e.target.value)}><option value="ALL">All methods</option>{['KO','TKO','SUB','UD','SD','MD','DRAW'].map(x=><option key={x}>{x}</option>)}</select><div className="scope-switch">{(['Latest','Year','All-time'] as const).map(t=><button className={scope===t?'active':''} key={t} onClick={()=>setScope(t)}>{t}</button>)}</div></div>
   <div className="combat-list">{fights.length===0?<div className="combat-empty"><Swords size={30}/><strong>No results in this view</strong><span>Simulate a circuit or change the division and timeframe filters.</span></div>:fights.map(f=>{const a=world.fighters.find(x=>x.id===f.fighterA)!,b=world.fighters.find(x=>x.id===f.fighterB)!;const winner=f.winnerId===a.id?a:f.winnerId===b.id?b:null;const loser=winner?(winner===a?b:a):null;return <button className="bout-row" key={f.id} onClick={()=>onFight(f.id)}><span className={`bout-method ${methodColor(f.method)}`}>{f.method}</span><span className="bout-fighters"><strong>{winner?winner.name:`${a.name} / ${b.name}`}</strong><small>{winner?`def. ${loser!.name}`:'Draw'} · {f.division} · {f.year}/{f.roundIndex}</small></span>{f.underdogVictory&&<span className="upset-tag">UPSET</span>}<span className="bout-round">{f.method==='UD'||f.method==='SD'||f.method==='MD'||f.method==='DRAW'?'DECISION':`R${f.finishRound}${f.finishTime?` · ${f.finishTime}`:''}`}</span><ChevronRight size={17}/></button>})}</div>
  </div><aside className="combat-sidebar"><div className="panel"><div className="section-heading"><div><div className="eyebrow">NOVA · ONYX</div><h2>Top of both brands</h2></div></div><p className="panel-intro">Ordered by performance-adjusted ranking points, not potential or raw ability.</p><div className="combat-contenders">{top.map(f=><button key={f.id} onClick={()=>onSelect(f.id)}><span>{rankText(f.rank)}</span><Avatar fighter={f} size={40}/><span className="contender-detail"><strong>{f.name}</strong><small><Flag code={f.flag}/> {f.record.wins}-{f.record.losses}-{f.record.draws} · {f.style} · {f.mentality}</small></span><b>{Math.round(f.rankingPoints)}</b></button>)}</div></div>
  <div className="panel"><div className="section-heading"><div><div className="eyebrow">MATCHUP INTELLIGENCE</div><h2>Styles create danger</h2></div><BarChart3 size={18}/></div><p className="panel-intro">A stylistic edge is only part of the picture. Overall talent, physical reach, condition and mentality all influence each exchange.</p><div className="style-examples">{[['Freestyle Wrestling','Boxing'],['Brazilian Jiu-Jitsu','Freestyle Wrestling'],['Kickboxing','Sumo']] .map(([a,b])=><div key={a}><b>{a}</b><span>EDGE +{styleAdvantage(a as Fighter['style'],b as Fighter['style']).toFixed(1)}</span><small>vs {b}</small></div>)}</div></div></aside></div>
 </>;
}
export function FighterRecord({fighter,world,onFight}:{fighter:Fighter;world:World;onFight:(id:string)=>void}){
 const all=useMemo(()=>fighterLedger(world,fighter.id).map(e=>getFight(world,e.i)!),[fighter.id,world]);
 const bouts=all.filter(f=>!f.tournamentId),special=all.filter(f=>!!f.tournamentId);
 const r=fighter.record;const finish=(r.kos+r.submissions);const winPct=(r.wins+r.losses+r.draws)>0?Math.round(r.wins/(r.wins+r.losses+r.draws)*100):0;
 return <><div className="profile-section-head">CAREER PERFORMANCE <span>{fighter.status==='retired'?'RETIRED':'ACTIVE'} · RANK {rankText(fighter.rank)}</span></div><div className="record-grid"><div><small>CAREER RECORD</small><strong>{r.wins}-{r.losses}-{r.draws}</strong></div><div><small>WIN RATE</small><strong>{winPct}%</strong></div><div><small>KO / TKO</small><strong>{r.kos}</strong></div><div><small>SUBMISSIONS</small><strong>{r.submissions}</strong></div><div><small>FINISHES</small><strong>{finish}</strong></div><div><small>LONGEST WIN STREAK</small><strong>{r.longestWinStreak}</strong></div></div><div className="profile-section-head space-top">OFFICIAL FIGHT HISTORY <span>{bouts.length} BOUTS</span></div><div className="profile-bout-list">{bouts.length===0?<p className="empty-msg">No competitive bouts recorded yet. Simulate the next circuit to begin this fighter’s fight history.</p>:bouts.map(b=>{const opponent=world.fighters.find(f=>f.id===(b.fighterA===fighter.id?b.fighterB:b.fighterA))!;const result=b.winnerId===null?'D':b.winnerId===fighter.id?'W':'L';return <button key={b.id} onClick={()=>onFight(b.id)}><span className={`result-letter ${result}`}>{result}</span><span><strong>{opponent.name}</strong><small>{b.year} · {b.eventName||b.division} · {b.titleFight?'WORLD CROWN · ':''}{b.method} R{b.finishRound}{b.titleChange?' · NEW CHAMPION':''}</small></span><ChevronRight size={16}/></button>})}</div><div className="profile-section-head space-top">SPECIAL TOURNAMENT BOUTS <span>{special.length} BOUTS · OUTSIDE REGULAR RECORD</span></div><div className="profile-bout-list">{special.length===0?<p className="empty-msg">No Grand Prix or Olympiad contests recorded.</p>:special.slice(0,75).map(b=>{const opponent=world.fighters.find(f=>f.id===(b.fighterA===fighter.id?b.fighterB:b.fighterA))!;return <button key={b.id} onClick={()=>onFight(b.id)}><span className={`result-letter ${b.winnerId===fighter.id?'W':b.winnerId===null?'D':'L'}`}>{b.winnerId===fighter.id?'W':b.winnerId===null?'D':'L'}</span><span><strong>{opponent.name}</strong><small>{b.year} · {b.eventName} · {b.tournamentStage} · {b.method} R{b.finishRound}</small></span><ChevronRight size={16}/></button>})}</div></>;
}
