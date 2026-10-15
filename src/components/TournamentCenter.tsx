import {useMemo,useState} from 'react';
import {doublesRanking,teamOf} from '../engine/doubles';
import {overallOf} from '../engine/career';
import {ArrowRight,ChevronRight,Crown,Medal,Play,SkipForward,Swords,Trophy,Zap} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {Heading,PageHead,whenFrom} from './ui';
import {standings,currentTournament,pendingTournamentMatch,kindAt} from '../engine/tournaments';
import {CALENDAR,ROUNDS_PER_YEAR,SURGE_ROUND,OLYMPIAD_ROUND,CRUCIBLE_ROUND} from '../engine/competition';
import {forEachLedger} from '../engine/archive';
import type {Tournament,TournamentKind,World,TournamentMatch} from '../engine/types';
import './tournaments.css';
import {EventLogo,EventWordmark,identityFor,identityStyle} from './EventIdentity';
import {SurgeBroadcast} from './SurgeBroadcast';

const displayName=(k:Tournament['kind'])=>k==='OLYMPIAD'?'WORLD COMBAT OLYMPIAD':k==='CRUCIBLE'?'THE CRUCIBLE':'THE SURGE';
const fighter=(w:World,id:string)=>w.fighters.find(f=>f.id===id)!;
const stageName=(t:Tournament)=>t.kind==='SURGE'?'The Arena':t.kind==='CRUCIBLE'?['Group Matchday 1','Group Matchday 2','Group Matchday 3','Semifinals','Final'][t.stage]:['Preliminaries','Round of 32','Round of 16','Quarterfinals','Semifinals','Final'][t.stage];
function PlayerTag({world,id,onFighter,small=false}:{world:World;id:string;onFighter:(id:string)=>void;small?:boolean}){
 const f=fighter(world,id);return <button className="tr-player" onClick={()=>onFighter(id)} title={`${f.name} · ${f.style}`}><Avatar fighter={f} size={small?32:42}/><span><b><Flag code={f.flag}/>{f.name}</b><small>{f.style} · {f.record.wins}-{f.record.losses}</small></span></button>;
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
 return <div className="tr-groups">{(['A','B'] as const).map(g=><div className="tr-group" key={g}><header><span>GROUP {g}</span><small>TOP 2 ADVANCE</small></header><table><thead><tr><th>FIGHTER</th><th>P</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>{s[g].map((v,i)=><tr key={v.id}><td><button onClick={()=>onFighter(v.id)}><span className="tr-qualifier">{i+1}</span> <Flag code={fighter(world,v.id).flag}/> {fighter(world,v.id).name}</button></td><td><strong>{v.points}</strong></td><td>{v.wins}</td><td>{v.draws}</td><td>{v.losses}</td></tr>)}</tbody></table></div>)}</div>;
}
function Surge({world,t,onFighter}:{world:World;t:Tournament;onFighter:(id:string)=>void}){
 const minute=t.surgeState?.minute??0;
 const entered=t.surgeState?Object.keys(t.surgeState.fighters).length:(t.surgeMoments??[]).filter(m=>m.entrantId).length;
 const eliminated=(t.surgeMoments??[]).filter(m=>m.eliminatedId);
 const active=t.surgeActive??[];
 return <div className="tr-surge-panel"><div className="tr-surge-arena"><div className="tr-surge-ring"><div className="tr-surge-stage"><Swords size={40}/><strong>{active.length}</strong><span>FIGHTERS IN ARENA</span></div></div><div className="tr-surge-entrants"><div><span>ELAPSED</span><strong>{minute} MIN</strong></div><div><span>ENTRANTS</span><strong>{entered} / 20</strong></div><div><span>ELIMINATED</span><strong>{eliminated.length}</strong></div></div><p className="tr-surge-latest">{t.surgeState?.lastEvent??'The arena awaits its next moment.'}</p></div>
  <div className="tr-survivors"><header>STILL IN THE FIGHT</header>{active.map(id=>{const f=fighter(world,id),s=t.surgeState?.fighters[id];return <div className="surge-summary-row" key={id}><PlayerTag world={world} id={id} onFighter={onFighter} small/><small>{f.division} · {f.rarity}<br/>{s?`${minute-s.enteredAt}m · ${Math.round(s.energy)}% energy · ${Math.round(s.damage)}% damage`:''}</small></div>;})}{!active.length&&<p>No fighters yet.</p>}</div>
  <div className="tr-survivors"><header>ELIMINATION HISTORY</header>{eliminated.slice().reverse().map((m,i)=><div className="tr-elimination" key={`${m.wave}-${i}`}><span>{m.minute??m.wave}m</span><b>{fighter(world,m.eliminatedId!).name}</b><small>{m.byId?`by ${fighter(world,m.byId).name}`:'eliminated'}</small></div>)}</div></div>;
}
const KINDS:{kind:TournamentKind;round:number;blurb:string;when:string}[]=[
 {kind:'CRUCIBLE',round:CRUCIBLE_ROUND,blurb:'Eight fighters, two groups of four, then semifinals and a final. Two-round bouts.',when:'August, except Olympiad years'},
 {kind:'SURGE',round:SURGE_ROUND,blurb:'The 16 elite brand contenders and four continental champions enter every three minutes. Watch minute-by-minute survival, damage and elimination.',when:'Every April · the Royal Rumble'},
 {kind:'OLYMPIAD',round:OLYMPIAD_ROUND,blurb:'Forty contenders, single elimination, from the preliminaries to the gold medal bout.',when:'Every four years, in August'},
];
type Sub='Overview'|'Annual view'|'History';
/** Runner-up: the beaten finalist, or the last fighter eliminated from the Surge. */
const runnerUp=(t:Tournament)=>t.runnerUpId??(t.kind==='SURGE'?t.surgeMoments?.filter(m=>m.eliminatedId).at(-1)?.eliminatedId??null:null);
function nextEdition(world:World,kind:TournamentKind){
 for(let k=0;k<ROUNDS_PER_YEAR*5;k++){const abs=world.round+k,year=world.year+Math.floor(abs/ROUNDS_PER_YEAR),round=abs%ROUNDS_PER_YEAR;if(kindAt(year,round)===kind)return {year,round};}
 return null;
}
export function TournamentCenter({world,onStart,onWatch,onSkip,onSkipStage,onFinish,onFighter,onFight,onTape}:{world:World;onStart:()=>void;onWatch:()=>void;onSkip:()=>void;onSkipStage:()=>void;onFinish:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;onTape:(a:string,b:string)=>void}){
 const live=currentTournament(world);
 const dueKind=kindAt(world.year,world.round);
 const [kind,setKind]=useState<TournamentKind|'DOUBLES'>(live?.kind??dueKind??'CRUCIBLE');
 const [sub,setSub]=useState<Sub>(live&&live.kind===kind?'Annual view':'Overview');
 const [surgeViewingId,setSurgeViewingId]=useState<string|null>(null);
 const surgeViewing=surgeViewingId?world.tournaments.find(t=>t.id===surgeViewingId):null;
 const nextMatch=live?pendingTournamentMatch(live):null;
 const isTag=kind==='DOUBLES';const name=isTag?'THE DOUBLES CROWN':displayName(kind);const ident=identityFor(isTag?'COLLISION':name);
 return <div className="tr-page">
  <PageHead tag="THE PATHS TO IMMORTALITY" title="Grand" accent="Tournaments." description="The Crucible Grand Prix, the Surge Royal Rumble, the World Combat Olympiad and the country Doubles Crown. Each has its own champions and its own history."/>
  {surgeViewing&&<SurgeBroadcast world={world} t={surgeViewing} onStep={onSkip} onAdvance={onSkipStage} onFinish={onFinish} onFighter={id=>{setSurgeViewingId(null);onFighter(id)}} onClose={()=>setSurgeViewingId(null)}/>}
  {live&&<section className="tr-live panel themed" style={identityStyle(identityFor(displayName(live.kind)))}><EventLogo id={identityFor(displayName(live.kind))} size={60}/><div className="tr-live-header"><span className="tr-live-label"><span className="live-dot"/> TOURNAMENT IN PROGRESS · {live.year}</span><small>{stageName(live)} · {live.kind==='SURGE'?`${live.surgeState?.minute??0} min`:`${live.matches.filter(m=>m.fightId).length} fights completed`}</small></div><h2>{displayName(live.kind)}</h2><p>{live.kind==='SURGE'?'A new fighter enters every three minutes. Watch real-time energy, damage and eliminations inside the live arena.':'Results are revealed one bout at a time. The next round is drawn only when the current one is complete.'}</p><div className="tr-actions"><button className="btn btn-primary" onClick={live.kind==='SURGE'?()=>{setSurgeViewingId(live.id);setKind('SURGE');setSub('Annual view');}:onWatch}><Play size={17}/>{live.kind==='SURGE'?' Open live arena':' Watch next fight'}</button><button className="btn btn-secondary" onClick={onSkip}><SkipForward size={17}/>{live.kind==='SURGE'?' +1 minute':' Skip next fight'}</button><button className="btn btn-quiet" onClick={onSkipStage}><Zap size={17}/> {live.kind==='SURGE'?'Advance 5 minutes':'Simulate to next stage'}</button><button className="btn btn-quiet" onClick={onFinish}><ArrowRight size={16}/> Finish tournament</button></div>
   {nextMatch&&<div className="tr-next-fight"><span>UP NEXT · {nextMatch.stage.toUpperCase()}</span><div><PlayerTag world={world} id={nextMatch.fighterA} onFighter={onFighter}/><b>VS</b><PlayerTag world={world} id={nextMatch.fighterB} onFighter={onFighter}/></div><button className="btn btn-quiet" onClick={()=>onTape(nextMatch.fighterA,nextMatch.fighterB)}>Tale of the tape</button></div>}
  </section>}
  {!live&&dueKind&&<section className="tr-upcoming panel"><div><div className="eyebrow">THIS MONTH’S BIG EVENT</div><h2>{displayName(dueKind)} {world.year}</h2><p>The entrants are confirmed when it opens.</p></div><button className="btn btn-primary" onClick={()=>{if(dueKind==='SURGE'){setSurgeViewingId(`surge-${world.year}`);setKind('SURGE');setSub('Annual view');}onStart()}}>Open {displayName(dueKind)} <ArrowRight size={17}/></button></section>}
  <div className="tr-shell">
   <nav className="tr-vtabs" aria-label="Tournaments">{KINDS.map(k=>{const id=identityFor(displayName(k.kind));const isLive=live?.kind===k.kind;return <button key={k.kind} className={kind===k.kind?'active':''} style={identityStyle(id)} onClick={()=>{setKind(k.kind);setSub(isLive?'Annual view':'Overview');}}><EventLogo id={id} size={40}/><span><b>{displayName(k.kind).replace('WORLD COMBAT ','')}</b><small>{isLive?'LIVE NOW':k.when}</small></span><ChevronRight size={15}/></button>;})}{(()=>{const id=identityFor('COLLISION');return <button className={isTag?'active':''} style={identityStyle(id)} onClick={()=>{setKind('DOUBLES');setSub('Overview');}}><EventLogo id={id} size={40}/><span><b>DOUBLES CROWN</b><small>Country teams · June &amp; December</small></span><ChevronRight size={15}/></button>;})()}</nav>
   <div className="tr-main">
    <header className="tr-main-head themed" style={identityStyle(ident)}><EventLogo id={ident} size={52}/><div><h2 key={kind}><EventWordmark id={ident}>{name}</EventWordmark></h2><p>{isTag?'Countries with at least two fighters, represented by their two best. Each tie is #1 v #1 and #2 v #2; at 1–1, more finishes wins, then more rounds won. The crown belongs to the country.':KINDS.find(k=>k.kind===kind)!.blurb}</p></div></header>
    <div className="tr-subtabs" role="tablist">{(['Overview','Annual view','History'] as Sub[]).map(x=><button role="tab" aria-selected={sub===x} key={x} className={sub===x?'active':''} onClick={()=>setSub(x)}>{x}</button>)}</div>
    {kind==='DOUBLES'?<Doubles world={world} sub={sub} onFighter={onFighter} onFight={onFight}/>:<>
    {sub==='Overview'&&<KindOverview world={world} kind={kind} onFighter={onFighter}/>}
    {sub==='Annual view'&&<Annual world={world} kind={kind} onFighter={onFighter} onFight={onFight} nextMatchId={nextMatch?.id}/>}
    {sub==='History'&&<History world={world} kind={kind} onFighter={onFighter}/>}</>}
   </div>
  </div>
 </div>;
}
function KindOverview({world,kind,onFighter}:{world:World;kind:TournamentKind;onFighter:(id:string)=>void}){
 const done=world.tournaments.filter(t=>t.kind===kind&&t.status==='complete');
 const last=done.at(-1);const champ=last?.winnerId?world.fighters.find(f=>f.id===last.winnerId):undefined;
 const next=nextEdition(world,kind);
 const stats=useMemo(()=>{
  const titles=new Map<string,number>(),finals=new Map<string,number>(),wins=new Map<string,number>(),byStyle=new Map<string,number>(),byCountry=new Map<string,{n:number;flag:string}>();
  for(const t of done){
   if(t.winnerId){titles.set(t.winnerId,(titles.get(t.winnerId)||0)+1);const f=world.fighters.find(x=>x.id===t.winnerId);if(f){byStyle.set(f.style,(byStyle.get(f.style)||0)+1);const c=byCountry.get(f.country)??{n:0,flag:f.flag};c.n++;byCountry.set(f.country,c);}}
   for(const id of [t.winnerId,runnerUp(t)])if(id)finals.set(id,(finals.get(id)||0)+1);
   if(kind==='SURGE')for(const m of t.surgeMoments||[])if(m.byId)wins.set(m.byId,(wins.get(m.byId)||0)+1);
  }
  if(kind!=='SURGE'){const prefix=kind.toLowerCase()+'-';forEachLedger(world,e=>{if(e.t?.startsWith(prefix)&&e.w)wins.set(e.w,(wins.get(e.w)||0)+1);});}
  const top=<T,>(m:Map<string,T>,v:(x:T)=>number)=>[...m.entries()].sort((a,b)=>v(b[1])-v(a[1])).slice(0,5);
  return {titles:top(titles,x=>x),finals:top(finals,x=>x),wins:top(wins,x=>x),byStyle:top(byStyle,x=>x),byCountry:top(byCountry,x=>x.n)};
 },[world,kind]);// eslint-disable-line react-hooks/exhaustive-deps
 const f=(id:string)=>world.fighters.find(x=>x.id===id);
 const list=(title:string,rows:[string,number][],unit:string)=><div className="tr-rec"><h3>{title}</h3>{rows.length?rows.map(([id,n],i)=>{const x=f(id);return x&&<button key={id} onClick={()=>onFighter(id)}><span>{i+1}</span><Avatar fighter={x} size={30}/><b><Flag code={x.flag}/>{x.name}</b><strong>{n} {unit}</strong></button>;}):<p className="empty-msg">No editions yet.</p>}</div>;
 return <div className="tr-overview">
  <div className="tr-champ-card panel">{champ&&last?<button onClick={()=>onFighter(champ.id)}><Avatar fighter={champ} size={120}/><span><small>REIGNING CHAMPION · {last.year}</small><b><Flag code={champ.flag} size={18}/>{champ.name}</b><em>{champ.style} · {champ.country}</em>{(stats.titles.find(([id])=>id===champ.id)?.[1]??1)>1&&<em>{stats.titles.find(([id])=>id===champ.id)![1]}× winner</em>}</span></button>:<p className="empty-msg">No edition has been completed yet.</p>}
   <div className="tr-next-ed"><Medal size={14}/>{next?`Next edition: ${CALENDAR[next.round].month} ${next.year} · ${whenFrom(world,next.year,next.round)}`:''}<span>{done.length} edition{done.length===1?'':'s'} held</span></div></div>
  <div className="tr-records">
   {list('Most titles',stats.titles,'')}
   {list('Most finals',stats.finals,'')}
   {list(kind==='SURGE'?'Most eliminations':'Most bout wins',stats.wins,'')}
   <div className="tr-rec"><h3>Titles by style</h3>{stats.byStyle.length?stats.byStyle.map(([s,n])=><div key={s} className="tr-bar"><span>{s}</span><i style={{width:`${n/stats.byStyle[0][1]*100}%`}}/><b>{n}</b></div>):<p className="empty-msg">No editions yet.</p>}</div>
   <div className="tr-rec"><h3>Titles by country</h3>{stats.byCountry.length?stats.byCountry.map(([c,v])=><div key={c} className="tr-bar"><span><Flag code={v.flag}/>{c}</span><i style={{width:`${v.n/stats.byCountry[0][1].n*100}%`}}/><b>{v.n}</b></div>):<p className="empty-msg">No editions yet.</p>}</div>
  </div>
 </div>;
}
function Annual({world,kind,onFighter,onFight,nextMatchId}:{world:World;kind:TournamentKind;onFighter:(id:string)=>void;onFight:(id:string)=>void;nextMatchId?:string}){
 const editions=world.tournaments.filter(t=>t.kind===kind).slice().reverse();
 const [id,setId]=useState<string>('');
 const t=editions.find(x=>x.id===id)??editions[0];
 if(!t)return <p className="panel empty-msg">This tournament has not been held yet.</p>;
 return <div className="tr-annual">
  <div className="tr-annual-bar"><label>EDITION <select className="v13-select" value={t.id} onChange={e=>setId(e.target.value)}>{editions.map(x=><option key={x.id} value={x.id}>{x.year}{x.status==='active'?' · live':''}</option>)}</select></label>{t.status==='complete'&&t.winnerId&&<span className="tr-annual-win"><Trophy size={14}/> Winner: <b>{world.fighters.find(f=>f.id===t.winnerId)?.name}</b></span>}</div>
  {t.kind==='SURGE'?<Surge world={world} t={t} onFighter={onFighter}/>:<>
   {t.kind==='CRUCIBLE'&&<Groups world={world} t={t} onFighter={onFighter}/>}
   <div className="tr-stage-grid">{Array.from(new Set(t.matches.map(m=>m.stage))).map(st=><section className="tr-stage" key={st}><h3>{st.toUpperCase()}</h3><div>{t.matches.filter(m=>m.stage===st).map(m=><BoutTile key={m.id} m={m} world={world} onFighter={onFighter} onFight={onFight} active={m.id===nextMatchId}/>)}</div></section>)}</div>
  </>}
 </div>;
}
function History({world,kind,onFighter}:{world:World;kind:TournamentKind;onFighter:(id:string)=>void}){
 const done=world.tournaments.filter(t=>t.kind===kind&&t.status==='complete').slice().reverse();
 const f=(id?:string|null)=>id?world.fighters.find(x=>x.id===id):undefined;
 if(!done.length)return <p className="panel empty-msg">No completed editions yet.</p>;
 return <section className="panel tr-history"><Heading eyebrow={`${done.length} EDITIONS`} title="Roll of honour"/>
  <div className="tr-history-head"><span>YEAR</span><span>CHAMPION</span><span>{kind==='SURGE'?'LAST ELIMINATED':'RUNNER-UP'}</span></div>
  {done.map(t=>{const w=f(t.winnerId),r=f(runnerUp(t));return <div key={t.id} className="tr-history-row"><span className="tr-year">{t.year}</span>
   {w?<button onClick={()=>onFighter(w.id)}><Avatar fighter={w} size={34}/><span><b><Flag code={w.flag}/>{w.name}</b><small>{w.style}</small></span><Crown size={14} className="tr-gold"/></button>:<span/>}
   {r?<button onClick={()=>onFighter(r.id)}><Avatar fighter={r} size={34}/><span><b><Flag code={r.flag}/>{r.name}</b><small>{r.style}</small></span></button>:<span className="dim">—</span>}</div>;})}
 </section>;
}

/** Country doubles: champion nation, ranking, the year's ties and the lineage of country reigns. */
function Doubles({world,sub,onFighter,onFight}:{world:World;sub:Sub;onFighter:(id:string)=>void;onFight:(id:string)=>void}){
 const tag=world.tag;
 const ranking=useMemo(()=>doublesRanking(cloneTag(world)),[world]);
 const years=useMemo(()=>[...new Set((tag?.ties??[]).map(t=>t.year))].sort((a,b)=>b-a),[tag]);
 const [year,setYear]=useState<number>(years[0]??world.year);
 const flagOf=(c:string)=>world.fighters.find(f=>f.country===c)?.flag;
 const fighter=(id:string)=>world.fighters.find(f=>f.id===id);
 const champ=tag?.champion,reign=tag?.reigns.at(-1);
 const team=champ?teamOf(world,champ):null;
 const Nation=({c}:{c:string})=><span className="tg-nation"><Flag code={flagOf(c)}/>{c}</span>;
 if(sub==='Overview')return <div className="tg-overview">
  <section className={`panel tg-champ ${champ?'':'vacant'}`}>{champ?<><div className="eyebrow">DOUBLES CROWN CHAMPIONS</div><h3><Flag code={flagOf(champ)} size={22}/>{champ}</h3><p>{reign&&!reign.endYear?`Since ${CALENDAR[Math.max(0,reign.startRound-1)]?.month??''} ${reign.startYear} · ${reign.defenses} defense${reign.defenses===1?'':'s'}`:''}</p>
   <div className="tg-team">{(team??[]).map(f=><button key={f.id} onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={64}/><b>{f.name}</b><small>{f.division} · {overallOf(f,world.year)} OVR</small></button>)}</div>
   {reign&&<p className="tg-note">Honoured in this reign: {reign.fighters.map(id=>fighter(id)?.name).filter(Boolean).join(', ')}</p>}</>:<><div className="eyebrow">DOUBLES CROWN</div><h3>Vacant</h3><p>The top two ranked countries meet for it in June.</p></>}</section>
  <section className="panel tg-ranking"><Heading eyebrow={`${ranking.length} NATIONS`} title="Doubles ranking"/>
   <div className="tg-rank-list">{ranking.slice(0,24).map((r,i)=>{const t=teamOf(world,r.country);return <div key={r.country} className={`tg-rank ${r.country===champ?'champ':''}`}><span className="tg-pos">{r.country===champ?'C':i+(champ?0:1)}</span><Nation c={r.country}/><span className="tg-pair">{t?t.map(f=>f.name.split(' ').at(-1)).join(' · '):'no fit pair'}</span><b>{r.rating}</b></div>;})}</div>
  </section>
 </div>;
 if(sub==='Annual view'){
  const ties=(tag?.ties??[]).filter(t=>t.year===year).slice().reverse();
  return <div className="tg-annual">
   <label className="cal-year">SEASON<select value={year} onChange={e=>setYear(Number(e.target.value))}>{(years.length?years:[world.year]).map(y=><option key={y} value={y}>{y}</option>)}</select></label>
   {ties.length===0&&<p className="empty-msg">No ties played this season yet. Ranking ties run on the second weekly card of most months.</p>}
   {ties.map(t=><section key={t.id} className={`panel tg-tie ${t.title?'title':''}`}><div className="tg-tie-head"><span>{CALENDAR[t.round]?.month} · {t.title?'DOUBLES CROWN TIE':'RANKING TIE'}</span><b>{t.winner?<><Flag code={flagOf(t.winner)}/>{t.winner} win</>:'Drawn'}</b></div>
    <div className="tg-tie-teams"><Nation c={t.a}/><i>v</i><Nation c={t.b}/></div>
    {t.legs.map((l,i)=>{const a=fighter(l.a),b=fighter(l.b);return <button key={l.fightId} className="tg-leg" onClick={()=>onFight(l.fightId)}><small>#{i+1}</small><span className={l.w===l.a?'won':l.w?'lost':''}>{a?.name}</span><i>vs</i><span className={l.w===l.b?'won':l.w?'lost':''}>{b?.name}</span></button>;})}
   </section>)}
  </div>;
 }
 const reigns=(tag?.reigns??[]).slice().reverse();
 return <div className="tr-history panel">
  <div className="tr-history-head"><span>FROM</span><span>COUNTRY</span><span>DEFENSES · FIGHTERS</span></div>
  {reigns.map(r=><div key={r.startTie} className="tr-history-row"><span className="tr-year">{r.startYear}{r.endYear?`–${r.endYear}`:"–now"}</span><span><Nation c={r.country}/></span><span>{r.defenses} · {r.fighters.map(id=>fighter(id)?.name.split(' ').at(-1)).filter(Boolean).join(', ')}</span></div>)}
  {!reigns.length&&<p className="empty-msg">No Doubles Crown has been awarded yet.</p>}
 </div>;
}
/** doublesRanking may seed missing ratings; work on a shallow copy so rendering never mutates the world. */
const cloneTag=(w:World):World=>({...w,tag:w.tag?{...w.tag,ratings:{...w.tag.ratings}}:{ratings:{},champion:null,reigns:[],ties:[]}});
