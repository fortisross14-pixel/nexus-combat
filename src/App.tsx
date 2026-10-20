import {BrandLogo} from './components/BrandLogo';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {rankText} from './components/ui';
import {Flag} from './components/Flag';
import {Activity,ArrowDownRight,ArrowRight,ArrowUpRight,BarChart3,BookOpen,CalendarClock,ChevronDown,Clock3,Crown,Download,FileClock,Filter,Globe2,Info,LayoutDashboard,Menu,Plus,RefreshCcw,Search,Medal,Shield,Star,Swords,TrendingUp,Upload,Users, X, Zap} from 'lucide-react';
import {Avatar} from './components/Avatar';
import {useDialog} from './components/useDialog';
import {BoardNum,Lamp,Meter,ModuleHead} from './components/board';
import {brandStyle,rankLine,titlesOf} from './components/Bout';
import {CareerPlot} from './components/CareerPlot';
import './components/scout.css';
import {CombatDesk,FightReport,FighterRecord} from './components/CombatDesk';
import {buildLegacyView} from './engine/legacy';
import {getFight,ledgerCount,ledgerFor,isWorldTitle} from './engine/archive';
import {recentResults} from './engine/forecast';
import {makePick,settlePick,toggleFollow,userOf,pickStats} from './engine/user';
import {beltsHeld,BELT_SHORT,CONTINENTAL_BELTS,BRAND_BELTS,isInterimChampion,topReigns} from './engine/belts';
import {doublesHonors} from './engine/doubles';
import './components/legacy.css';
import './components/tournaments.css';
import './components/surge-broadcast.css';
import {eventNameAt,kindAt} from './engine/tournaments';
import {LiveFight} from './components/LiveArena';
import {EventNight} from './components/EventNight';
import {UniverseHub} from './components/UniverseHub';
import './components/complete-pass.css';
import './components/calendar.css';
import {Overview} from './components/Overview';
import './components/divisions.css';
import './components/offseason.css';
import './components/draft-room.css';
import './components/sim-rail.css';
import './components/live-arena.css';
import {CALENDAR,ROUNDS_PER_YEAR} from './engine/competition';
import {CareerChart} from './components/Charts';
import {MENTAL_DESCRIPTIONS,RARITY_COLORS,REGIONS,SKILLS,START_YEAR,STYLES,STYLE_DESCRIPTIONS} from './engine/constants';
import {abilitiesOf,ageOf,baseOf,conditionLabel,overallOf} from './engine/career';
import {draftMove,draftAuto,draftFinish,createManagedWorld,advanceYears,advanceToBigEvent,hasPendingCard,prepareNextEvent,resolveCurrentEvent,resolveTournamentAction,resolveTournamentStage,resolveWholeTournament,exportWorld,loadWorld,upgradeWorld} from './engine/world';
import {readWorldDatabase,storeWorldDatabase,readUniverseSlots,queueUniverseSlot,queueDeleteUniverseSlot} from './engine/persistence';
import type {Fight,Division,Fighter,World,Rarity,WorldEvent} from './engine/types';

// Screens off the first view load on demand; their stylesheets are imported above in the original order.
const CompareDialog=lazy(()=>import('./components/TaleOfTheTape').then(m=>({default:m.CompareDialog})));
const LegacyCenter=lazy(()=>import('./components/LegacyCenter').then(m=>({default:m.LegacyCenter})));
const FighterLegacyPanel=lazy(()=>import('./components/LegacyCenter').then(m=>({default:m.FighterLegacyPanel})));
const CareerChronicle=lazy(()=>import('./components/LegacyCenter').then(m=>({default:m.CareerChronicle})));
const TournamentCenter=lazy(()=>import('./components/TournamentCenter').then(m=>({default:m.TournamentCenter})));
const SeasonFinale=lazy(()=>import('./components/SeasonFinale').then(m=>({default:m.SeasonFinale})));
const WorldChronicle=lazy(()=>import('./components/WorldChronicle').then(m=>({default:m.WorldChronicle})));
const FightCalendar=lazy(()=>import('./components/Calendar').then(m=>({default:m.FightCalendar})));
const Divisions=lazy(()=>import('./components/Divisions').then(m=>({default:m.Divisions})));
const Offseason=lazy(()=>import('./components/Offseason').then(m=>({default:m.Offseason})));
const DraftRoom=lazy(()=>import('./components/DraftRoom').then(m=>({default:m.DraftRoom})));
const PageLoading=()=><div className="page-loading" role="status">Loading…</div>;
type Page='Dashboard'|'Statistics'|'Event Calendar'|'Tournaments'|'Fight Night'|'Fight Center'|'Divisions'|'Fighters'|'Offseason'|'World History';
type ProfileTab='Overview'|'Development'|'Fight Record'|'Career'|'Legacy';
const compact=(n:number)=>new Intl.NumberFormat('en-US').format(n);
function Rating({n,color=true}:{n:number;color?:boolean}){return <span className={`rating-num ${color?(n>=90?'eliterating':n>=80?'strongrating':n>=70?'normalrating':'lowrating'):''}`}>{n}</span>;}
function Badge({rarity}:{rarity:Rarity}){return <span className="rarity-pill" style={{'--rare':RARITY_COLORS[rarity]} as React.CSSProperties}><i/>{rarity}</span>}
function SectionHeading({eyebrow,title,end}:{eyebrow?:string;title:string;end?:React.ReactNode}){return <div className="section-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{end}</div>}
function Stat({label,value,icon,detail}:{label:string;value:string|number;icon:React.ReactNode;detail?:string}){return <div className="stat-tile"><div className="stat-icon">{icon}</div><div><span className="stat-label">{label}</span><div className="stat-value">{value}</div>{detail&&<small>{detail}</small>}</div></div>}
function NewWorldDialog({onCancel,onCreate}:{onCancel:()=>void;onCreate:(seed:number)=>void}){const [seed,setSeed]=useState(String(20582058));const ref=useDialog<HTMLDivElement>(onCancel);return <div className="overlay" onClick={onCancel}><div className="dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="new-world-title" onClick={e=>e.stopPropagation()}><div className="dialog-top"><h2 id="new-world-title">Initialize new universe</h2><button className="icon-button" aria-label="Cancel" onClick={onCancel}><X size={18}/></button></div><p>Regenerate the founding 2058 roster. The current world will be overwritten on this device—export it first if you wish to keep it.</p><label htmlFor="seed">WORLD SEED</label><input id="seed" className="text-input" value={seed} onChange={e=>setSeed(e.target.value)} type="number"/><div className="dialog-actions"><button className="btn btn-quiet" onClick={onCancel}>Cancel</button><button className="btn btn-danger" onClick={()=>onCreate(Number(seed)||20582058)}>Create world <ArrowRight size={16}/></button></div></div></div>}
export function App(){
  const [world,setWorld]=useState<World>(()=>loadWorld());
  const [universeOpen,setUniverseOpen]=useState(true);const [activeSlot,setActiveSlot]=useState<number|null>(null);
  const [slots,setSlots]=useState<(World|null)[]>([null,null,null]);
  const [page,setPage]=useState<Page>('Dashboard');
  const [selectedId,setSelectedId]=useState<string|null>(null);const [selectedFightId,setSelectedFightId]=useState<string|null>(null);const [profileTab,setProfileTab]=useState<ProfileTab>('Overview');
  const [division,setDivision]=useState<Division>('NOVA S');const [search,setSearch]=useState('');const [filterStyle,setFilterStyle]=useState('All styles');
  const [filterRegion,setFilterRegion]=useState('All regions');const [showAll,setShowAll]=useState(false);const [visibleFighters,setVisibleFighters]=useState(80);const [resetOpen,setResetOpen]=useState(false);
  const [staged,setStaged]=useState<{world:World;fightId:string|null}|null>(null);
  /** An event that has been fought, with the bouts the player chose to watch queued for playback. */
  const [playback,setPlayback]=useState<{world:World;queue:Fight[];index:number;mainId:string|null}|null>(null);
  const [compareId,setCompareId]=useState<string|null>(null);const [compareWith,setCompareWith]=useState<string|null>(null);const [followedOnly,setFollowedOnly]=useState(false);
  useEffect(()=>setVisibleFighters(80),[search,filterStyle,filterRegion,showAll]);
  const [menuOpen,setMenuOpen]=useState(false);const [finaleYear,setFinaleYear]=useState<number|null>(null);const previousYear=useRef<number|null>(null);const [toast,setToast]=useState('');const [hydrated,setHydrated]=useState(false);const importRef=useRef<HTMLInputElement|null>(null);
  // Restore ALL slots before displaying the hub. Recover the legacy main save if the
  // old localStorage slots were silently lost to quota limits.
  useEffect(()=>{let current=true;(async()=>{
    try{
      const [savedSlots,legacyMain]=await Promise.all([readUniverseSlots(),readWorldDatabase()]);
      if(!current)return;
      const restored=savedSlots.slice();
      for(let i=0;i<3;i++)if(!restored[i]){
        try{const raw=localStorage.getItem(`nexus-universe-${i}`);if(raw)restored[i]=upgradeWorld(JSON.parse(raw));}catch{/* oversized/corrupt legacy slot */}
      }
      if(legacyMain&&!restored.some(w=>w&&w.seed===legacyMain.seed&&w.year>=legacyMain.year)){
        const free=restored.findIndex(w=>!w);
        if(free>=0){restored[free]=legacyMain;await queueUniverseSlot(free,legacyMain);}
        else setToast('Recovered an older main save. Export your universes before making changes.');
      }
      for(let i=0;i<3;i++)if(restored[i]&&!savedSlots[i])await queueUniverseSlot(i,restored[i]!);
      if(!current)return;
      setSlots(restored);
      const first=restored.find(w=>w!==null);
      if(first){setWorld(first);previousYear.current=first.year;}
    }catch(e){if(current)setToast('Unable to restore browser saves. Do not create a new world; check browser storage settings.');}
    finally{if(current)setHydrated(true);}
  })();return()=>{current=false;};},[]);
  // Save immediately after every state change. No 450ms debounce that can be lost
  // on refresh, and never save the unselected placeholder universe.
  useEffect(()=>{if(!hydrated||activeSlot===null)return;
    setSlots(old=>old.map((w,i)=>i===activeSlot?world:w));
    void queueUniverseSlot(activeSlot,world).catch(()=>setToast('SAVE FAILED — export a JSON backup now.'));
    void storeWorldDatabase(world).catch(()=>{/* Slots are authoritative; main is legacy recovery. */});
  },[world,hydrated,activeSlot]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3800);return()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{if(!hydrated)return;if(previousYear.current!==null&&world.year>previousYear.current)setFinaleYear(world.year-1);previousYear.current=world.year;},[world.year,hydrated]);
  const needLegacy=page==='Statistics'||!!selectedId;
  const legacy=useMemo(()=>needLegacy?buildLegacyView(world):null,[world,needLegacy]);
  const active=useMemo(()=>world.fighters.filter(f=>f.status==='active'),[world]);

  
  const selected=selectedId?world.fighters.find(f=>f.id===selectedId):undefined;
  const selectedFight=selectedFightId?getFight(world,selectedFightId):undefined;
  
  const openUniverse=(slot:number)=>{if(!hydrated)return;const saved=slots[slot];if(saved){previousYear.current=saved.year;setWorld(saved);setActiveSlot(slot);setUniverseOpen(false);return;}createUniverse(slot);};
  const createUniverse=(slot:number)=>{if(!hydrated)return;const fresh=createManagedWorld(20582058+slot*7919);previousYear.current=fresh.year;setSlots(old=>old.map((x,i)=>i===slot?fresh:x));setWorld(fresh);setActiveSlot(slot);setUniverseOpen(false);void queueUniverseSlot(slot,fresh).catch(()=>setToast('SAVE FAILED — export a JSON backup now.'));};
  const deleteUniverse=(slot:number)=>{try{localStorage.removeItem(`nexus-universe-${slot}`);}catch{}setSlots(old=>old.map((x,i)=>i===slot?null:x));void queueDeleteUniverseSlot(slot).catch(()=>setToast('Could not delete saved universe.'));};
  const navigate=(p:Page)=>{setPage(p);setMenuOpen(false);window.scrollTo({top:0,behavior:'smooth'});};
  const openProfile=(id:string)=>{setSelectedId(id);setProfileTab('Overview');};
  const busy=!hydrated||!!staged||!!playback;
  /** While the offseason Draft Room is open the calendar waits for the brand manager. */
  const toDraft=()=>{navigate('Offseason');setToast('The Draft Room is open: set promotions and relegations, then spawn the new prospects');};
  const simulate=(n:number)=>{if(busy)return;if(world.draft){toDraft();return;}const next=advanceYears(world,n);setWorld(next);if(next.draft){navigate('Offseason');setToast(`Season ${next.year-1} complete · the Draft Room is open`);return;}setToast(`${n===1?'Season':`${n} seasons`} simulated to the end · every fight resolved`);};
  const onDraftMove=(id:string,to:Division)=>setWorld(old=>draftMove(old,id,to));
  const onDraftAuto=()=>{setWorld(old=>draftAuto(old));setToast('The game filled the remaining seats');};
  const onDraftFinish=()=>{const next=draftFinish(world);if(next===world)return;setWorld(next);setToast(`Promotions done · ${next.fighters.filter(f=>f.joinedYear===next.year&&f.status==='active').length} new prospects spawned for ${next.year}`);};
  const onManager=(on:boolean)=>setWorld(old=>({...old,manager:on}));
  /** Go to the next event: open the prepared card, the running tournament, or prepare the next card. */
  const prepareEvent=()=>{if(busy)return;if(world.draft){toDraft();return;}
    if(world.activeTournamentId||kindAt(world.year,world.round)){if(!world.activeTournamentId)setWorld(old=>prepareNextEvent(old));navigate('Tournaments');return;}
    if(!hasPendingCard(world))setWorld(old=>prepareNextEvent(old));
    navigate('Fight Night');};
  const simulateToBig=()=>{if(busy)return;if(world.draft){toDraft();return;}const next=advanceToBigEvent(world);setWorld(next);navigate(next.activeTournamentId?'Tournaments':'Fight Night');setToast(`Skipped to ${eventNameAt(next.year,next.round)||CALENDAR[next.round].name} · ${CALENDAR[next.round].month} ${next.year}`);};
  const commitEvent=(r:{world:World;mainId:string|null})=>{setWorld(settlePick(r.world,getFight(r.world,r.mainId)));setPlayback(null);navigate(r.world.draft?'Offseason':'Fight Night');};
  const startEvent=(watch:number[])=>{if(busy||!hasPendingCard(world))return;const r=resolveCurrentEvent(world,watch);
    if(r.watched.length)setPlayback({world:r.world,queue:r.watched,index:0,mainId:r.fightId});else commitEvent({world:r.world,mainId:r.fightId});};
  const nextInQueue=()=>{if(!playback)return;if(playback.index+1<playback.queue.length)setPlayback({...playback,index:playback.index+1});else commitEvent(playback);};
  const nextTournament=()=>{if(!hydrated||staged||!world.activeTournamentId)return;const result=resolveTournamentAction(world);setWorld(result.world);};
  const watchTournament=()=>{if(!hydrated||staged||!world.activeTournamentId)return;const result=resolveTournamentAction(world);if(result.fightId)setStaged(result);else setWorld(result.world);};
  const skipTournamentStage=()=>{if(!hydrated||staged||!world.activeTournamentId)return;setWorld(old=>resolveTournamentStage(old));};
  const finishTournament=()=>{if(!hydrated||staged||!world.activeTournamentId)return;setWorld(old=>resolveWholeTournament(old));setToast('Tournament concluded · champion and legacy honors recorded');};
  const finishWatching=()=>{if(!staged)return;setWorld(staged.fightId?settlePick(staged.world,getFight(staged.world,staged.fightId)):staged.world);setStaged(null);setPage(getFight(staged.world,staged.fightId)?.tournamentId?'Tournaments':'Fight Night');};
  const importFile=async(file?:File)=>{if(!file)return;try{const data:unknown=JSON.parse(await file.text());const imported=upgradeWorld(data);if(!imported)throw Error('Not a compatible NEXUS world save.');previousYear.current=imported.year;setFinaleYear(null);setWorld(imported);setSelectedId(null);setToast('World save imported successfully');}catch(e){setToast(e instanceof Error?e.message:'Unable to read save file');}};
  const startNew=(seed:number)=>{previousYear.current=START_YEAR;setFinaleYear(null);setWorld(createManagedWorld(seed));setStaged(null);setSelectedId(null);setResetOpen(false);setPage('Dashboard');setToast('New 2058 founding universe created');};
  const navGroups:{heading:string;items:{name:Page;label:string;icon:React.ReactNode}[]}[]=[
    {heading:'THE CIRCUIT',items:[{name:'Dashboard',label:'Overview',icon:<LayoutDashboard size={19}/>},{name:'Event Calendar',label:'Calendar',icon:<CalendarClock size={19}/>},{name:'Fight Night',label:'Fight Night',icon:<Swords size={19}/>},{name:'Tournaments',label:'Tournaments',icon:<Medal size={19}/>}]},
    {heading:'SCOUT & EXPLORE',items:[{name:'Divisions',label:'Divisions',icon:<Shield size={19}/>},{name:'Fighters',label:'Fighter Database',icon:<Users size={19}/>},{name:'Fight Center',label:'Fight Archive',icon:<BookOpen size={19}/>}]},
    {heading:'THE CHRONICLE',items:[{name:'Statistics',label:'Statistics',icon:<BarChart3 size={19}/>},{name:'Offseason',label:'Offseason',icon:<Activity size={19}/>},{name:'World History',label:'World History',icon:<FileClock size={19}/>}]}];
  if(universeOpen&&!hydrated)return <div className="game-loading"><strong>RESTORING SAVED UNIVERSES…</strong></div>;
  if(universeOpen)return <UniverseHub slots={slots} onOpen={openUniverse} onCreate={createUniverse} onDelete={deleteUniverse}/>;
  const slotNow=CALENDAR[world.round];
  return <div className={`nx-app ${!hydrated?'app-loading':''}`}>
    {menuOpen&&<div className="nx-scrim" onClick={()=>setMenuOpen(false)}/>}
    <aside className={`nx-rail ${menuOpen?'is-open':''}`} aria-label="Game navigation">
      <div className="nx-rail-brand"><BrandLogo brand="NEXUS" size={40}/><span><strong>NEXUS</strong><small>Combat Chronicle</small></span><button className="nx-icon nx-rail-close" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div>
      <nav className="nx-nav" aria-label="Primary navigation">{navGroups.map(group=><div className="nx-nav-group" key={group.heading}><span className="nx-nav-label">{group.heading}</span>{group.items.map(item=><button key={item.name} aria-current={page===item.name?'page':undefined} className="nx-nav-item" onClick={()=>navigate(item.name)}>{item.icon}<span>{item.label}</span></button>)}</div>)}</nav>
      <dl className="nx-rail-meta"><div><dt>Universe seed</dt><dd>{world.seed}</dd></div><div><dt>Active athletes</dt><dd>{active.length}</dd></div><div><dt>Build</dt><dd>v1.7.0 · saved locally</dd></div></dl>
    </aside>
    <main className="nx-main">
      <header className="nx-top"><button className="nx-icon nx-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={22}/></button>
        <div className="nx-when">{world.draft?<button className="nx-draft" onClick={()=>navigate('Offseason')}><Lamp tone="amber"/>Offseason<span className="nx-draft-more"> · draft room open</span></button>:<><strong>{slotNow?.month||'January'}</strong><span>{slotNow?.kind==='major'?'Big event':`Week ${slotNow?.week}`}</span></>}</div>
        <div className="nx-sim" role="group" aria-label="Simulation"><button className="nx-btn nx-btn-lead" onClick={prepareEvent}><Zap size={16}/><span>Next event</span></button><button className="nx-btn" onClick={simulateToBig}><Crown size={16}/><span>Next big event</span></button><button className="nx-btn" onClick={()=>simulate(1)} title="Simulate the rest of this season"><CalendarClock size={16}/><span>Sim year</span></button></div>
        <div className="nx-year"><span className="nx-year-label">Year</span><BoardNum value={world.year}/></div>
        <div className="nx-tools"><button className="nx-icon" onClick={()=>exportWorld(world)} title="Export world save" aria-label="Export world save"><Download size={18}/></button><button className="nx-icon" onClick={()=>importRef.current?.click()} title="Import world save" aria-label="Import world save"><Upload size={18}/></button><button className="nx-icon" onClick={()=>setResetOpen(true)} title="New universe" aria-label="New universe"><RefreshCcw size={18}/></button></div></header>
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/>
      <div className="nx-content"><Suspense fallback={<PageLoading/>}>
        {page==='Dashboard'&&<>
          <Overview world={world} onFighter={openProfile} onFight={setSelectedFightId} onEvent={prepareEvent} onNav={p=>{if(p==='Divisions')setDivision('NOVA S');navigate(p);}}/>
          <FollowedPanel world={world} onFighter={openProfile}/>
        </>}
        {page==='Event Calendar'&&<FightCalendar world={world} onPrepare={prepareEvent} onFighter={openProfile} onFight={setSelectedFightId} onTournaments={()=>{if(kindAt(world.year,world.round)&&!world.activeTournamentId)setWorld(old=>prepareNextEvent(old));navigate('Tournaments');}}/>}
        {page==='Tournaments'&&<TournamentCenter onTape={(a,b)=>{setCompareId(a);setCompareWith(b);}} world={world} onStart={prepareEvent} onWatch={watchTournament} onSkip={nextTournament} onSkipStage={skipTournamentStage} onFinish={finishTournament} onFighter={openProfile} onFight={setSelectedFightId}/>}
        
        {page==='Fight Night'&&<EventNight world={world} onPick={id=>setWorld(old=>makePick(old,id))} onPrepare={prepareEvent} onTournament={prepareEvent} onStart={startEvent} onFighter={openProfile} onFight={setSelectedFightId} onTape={(a,b)=>{setCompareId(a);setCompareWith(b);}}/>}
        {page==='Fight Center'&&<CombatDesk world={world} onSimRound={prepareEvent} onSimYear={()=>simulate(1)} onSelect={openProfile} onFight={setSelectedFightId}/> }
        {page==='Divisions'&&<Divisions world={world} division={division} setDivision={setDivision} onFighter={openProfile}/>}
        {page==='Fighters'&&<>
          <PageTop tag="ATHLETE ARCHIVE" title="Fighter" accent="Database." description="Discover every active competitor and retired veteran. Open a profile to examine development, martial art specialization and their full fight record and year-by-year career history."/>
          <div className="fighter-toolbar"><label className="search-field"><Search size={18}/><input type="search" placeholder="Search by name, nation, style..." value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="select-holder"><Filter size={16}/><select value={filterStyle} onChange={e=>setFilterStyle(e.target.value)}><option>All styles</option>{STYLES.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={15}/></label><label className="select-holder"><Globe2 size={16}/><select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)}><option>All regions</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select><ChevronDown size={15}/></label><label className="toggle-retired"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/><span>Include retired</span></label><label className="toggle-retired"><input type="checkbox" checked={followedOnly} onChange={e=>setFollowedOnly(e.target.checked)}/><span>Followed only</span></label></div>
          {(()=>{const followedSet=new Set(userOf(world).followed);const list=world.fighters.filter(f=>(!followedOnly||followedSet.has(f.id))&&(showAll||followedOnly||f.status==='active')&&(filterStyle==='All styles'||f.style===filterStyle)&&(filterRegion==='All regions'||f.region===filterRegion)&&`${f.name} ${f.nickname} ${f.country} ${f.style} ${f.mentality}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.status.localeCompare(b.status)||overallOf(b,world.year)-overallOf(a,world.year));return <><div className="results-line"><span><strong>{list.length}</strong> MATCHING FIGHTERS · {Math.min(list.length,visibleFighters)} SHOWN</span><span>SELECT A FIGHTER TO EXPLORE THEIR CAREER <ArrowRight size={13}/></span></div><div className="fighter-grid">{list.slice(0,visibleFighters).map(f=><button key={f.id} className={`fighter-card rarity-${f.rarity.toLowerCase()}`} onClick={()=>openProfile(f.id)}><div className="fighter-card-top"><Badge rarity={f.rarity}/><span className="fighter-card-rating"><Rating n={overallOf(f,world.year)}/></span></div><div className="fighter-card-portrait"><Avatar fighter={f} size={147}/></div><div className="fighter-card-bottom"><strong>{f.name}</strong><span><Flag code={f.flag}/> {f.country} <span className="tiny-sep">/</span> {f.status==='active'?f.division:'RETIRED'}</span><div><small>{f.style} · {f.mentality}</small><span>{ageOf(f, f.retiredYear||world.year)}Y <ArrowRight size={14}/></span></div></div></button>)}</div>{list.length>visibleFighters&&<div className="fighter-load-more"><span>Showing {visibleFighters} of {list.length} athletes</span><button className="btn btn-secondary" onClick={()=>setVisibleFighters(n=>n+80)}>Show 80 more <ChevronDown size={16}/></button></div>}{list.length===0&&<div className="panel empty-msg">No matching fighters. Adjust your search or filters.</div>}</>})()}
        </>}
        {page==='Statistics'&&legacy&&<LegacyCenter world={world} view={legacy} onFighter={openProfile} onFight={setSelectedFightId}/>}
        {page==='Offseason'&&(world.draft?<DraftRoom world={world} onFighter={openProfile} onMove={onDraftMove} onAuto={onDraftAuto} onFinish={onDraftFinish} onManager={onManager}/>:<Offseason world={world} onFighter={openProfile}/>)}
        {page==='World History'&&<WorldChronicle world={world} onFighter={openProfile}/>} 
      </Suspense></div>
    </main>
    {compareId&&world.fighters.find(f=>f.id===compareId)&&<Suspense fallback={null}><CompareDialog world={world} fighter={world.fighters.find(f=>f.id===compareId)!} initialOpponent={compareWith} onClose={()=>{setCompareId(null);setCompareWith(null);}} onFighter={openProfile} onFight={setSelectedFightId}/></Suspense>}
    {selected&&legacy&&<Profile followed={userOf(world).followed.includes(selected.id)} onFollow={()=>setWorld(old=>toggleFollow(old,selected.id))} onCompare={()=>setCompareId(selected.id)} fighter={selected} world={world} year={world.year} tab={profileTab} setTab={setProfileTab} onFight={setSelectedFightId} onFighter={openProfile} legacy={legacy} onClose={()=>setSelectedId(null)}/>}
    {selectedFight&&<FightReport key={selectedFight.id} fight={selectedFight} world={world} onClose={()=>setSelectedFightId(null)} onFighter={openProfile}/>}
    {staged&&staged.fightId&&<LiveFight key={staged.fightId} fight={getFight(staged.world,staged.fightId)!} world={staged.world} onComplete={finishWatching}/>}
    {playback&&playback.queue[playback.index]&&<><LiveFight key={playback.queue[playback.index].id} fight={playback.queue[playback.index]} world={playback.world} onComplete={nextInQueue}/>{playback.queue.length>1&&<div className="queue-pill">LIVE FIGHT {playback.index+1} OF {playback.queue.length}</div>}</>}
    {finaleYear!==null&&!staged&&!playback&&<Suspense fallback={null}><SeasonFinale key={finaleYear} world={world} year={finaleYear} onClose={()=>setFinaleYear(null)}/></Suspense>}
    <nav className="nx-dock" aria-label="Quick navigation">{([{name:'Dashboard',label:'Home',icon:<LayoutDashboard size={19}/>},{name:'Event Calendar',label:'Calendar',icon:<CalendarClock size={19}/>},{name:'Fight Night',label:'Fight Night',icon:<Swords size={19}/>},{name:'Fighters',label:'Fighters',icon:<Users size={19}/>} ] as {name:Page;label:string;icon:React.ReactNode}[]).map(item=><button key={item.name} aria-current={page===item.name?'page':undefined} onClick={()=>navigate(item.name)}>{item.icon}<span>{item.label}</span></button>)}</nav>
    {resetOpen&&<NewWorldDialog onCancel={()=>setResetOpen(false)} onCreate={startNew}/>}
    {!hydrated&&<div className="game-loading"><div className="logo-glyph"><span>N</span></div><strong>RESTORING YOUR NEXUS UNIVERSE</strong></div>}
    {toast&&<div className="toast"><Info size={16}/>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}
  </div>;
}
/** The player's corner: followed fighters, their latest news, and the pick'em record. */
function FollowedPanel({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
  const user=userOf(world);const stats=pickStats(user);
  const fighters=user.followed.map(id=>world.fighters.find(f=>f.id===id)).filter((f):f is Fighter=>!!f);
  const followedSet=new Set(user.followed);const news=world.events.filter(e=>followedSet.has(e.fighterId)).slice(-6).reverse();
  return <div className="hm-grid hm-corner">
    <section className="bd" aria-labelledby="corner-title"><ModuleHead id="corner-title" title="Your corner" code={`${fighters.length} followed`}/>
      {fighters.length===0?<p className="bd-note">Open any fighter and press <b>Follow</b> to track their bouts, belts, injuries and retirement here.</p>:
      <table className="bd-table"><thead><tr><th scope="col">Fighter</th><th scope="col">Standing</th><th scope="col" className="num">Last bout</th></tr></thead><tbody>{fighters.slice(0,8).map(f=>{const last=recentResults(world,f.id,1)[0];const injured=f.injuryUntil>world.year*ROUNDS_PER_YEAR+world.round;return <tr key={f.id}>
        <td><button className="bd-link" onClick={()=>onFighter(f.id)}><Flag code={f.flag}/>{f.name}</button>{beltsHeld(world,f.id).length>0&&<small className="is-title">{beltsHeld(world,f.id).map(b=>BELT_SHORT[b]).join(' · ')}</small>}</td>
        <td>{f.status==='active'?`${f.division} ${rankText(f.rank)}`:'Retired'}<small>{f.record.wins}-{f.record.losses}-{f.record.draws}{injured?' · injured':''}</small></td>
        <td className="num">{last?<span className="hm-last"><Lamp tone={last.result==='W'?'win':last.result==='L'?'loss':'off'}/>{last.entry.m} · {last.entry.y}</span>:<span className="is-muted">No bouts yet</span>}</td></tr>;})}</tbody></table>}
      {news.length>0&&<ol className="bd-feed">{news.map((e,i)=><li key={`${e.year}-${i}`}><button className="bd-link" onClick={()=>onFighter(e.fighterId)}>{world.fighters.find(f=>f.id===e.fighterId)?.name}</button><span>{e.description}</span><time>{e.year}</time></li>)}</ol>}
    </section>
    <section className="bd" aria-labelledby="picks-title"><ModuleHead id="picks-title" title="Pick'em · main-event calls"/>
      <dl className="hm-picks"><div><dt>Picks</dt><dd><BoardNum value={stats.made}/></dd></div><div><dt>Correct</dt><dd><BoardNum value={`${Math.round(stats.accuracy*100)}%`} tone="win"/></dd></div><div><dt>Streak</dt><dd><BoardNum value={stats.streak}/></dd></div><div><dt>Best</dt><dd><BoardNum value={stats.best}/></dd></div><div><dt>Upsets called</dt><dd><BoardNum value={stats.upsets} tone="title"/></dd></div></dl>
      <p className="bd-note">Before every main event on Fight Night, call the winner. Calls are scored when the result is revealed; correct picks on the underdog count as upsets called.</p>
      {user.picks.length>0&&<ol className="bd-feed">{user.picks.slice(-5).reverse().map(p=>{const fight=getFight(world,p.fightId);return fight&&<li key={p.fightId}><Lamp tone={p.correct?'win':p.correct===false?'loss':'off'} label={p.correct?'Correct':p.correct===false?'Wrong':'Draw'}/><span><b>{world.fighters.find(f=>f.id===p.pick)?.name}</b> · {fight.headline}</span><time>{Math.round(p.odds*100)}%</time></li>;})}</ol>}
    </section></div>;
}
function PageTop({tag,title,accent,description}:{tag:string;title:string;accent:string;description:string}){return <div className="page-title"><div><div className="eyebrow">{tag}</div><h1>{title} <span>{accent}</span></h1><p>{description}</p></div></div>}
function HistoryIcon({type}:{type:WorldEvent['type']}){return type==='promotion'?<ArrowUpRight size={17}/>:type==='relegation'?<ArrowDownRight size={17}/>:type==='retirement'?<Clock3 size={17}/>:<Plus size={17}/>}
export function HistoryPage({world,onSelect}:{world:World;onSelect:(id:string)=>void}){
  const [eventFilter,setEventFilter]=useState('All');const [limit,setLimit]=useState(40);
  const followed=new Set(userOf(world).followed);const list=world.events.filter(e=>eventFilter==='All'||eventFilter==='Followed'?(eventFilter==='All'||followed.has(e.fighterId)):e.type===eventFilter.toLowerCase()).slice().reverse().slice(0,limit);
  const totalBouts=ledgerCount(world);
  return <><PageTop tag="THE PERMANENT RECORD" title="World" accent="Chronicle." description="Championship dynasties, Grand Prix victories, Royale triumphs and Olympiad medals—alongside the rises and falls of every fighter."/>
    <div className="stat-grid history-stats"><Stat label="YEARS CHRONICLED" value={world.year-START_YEAR+1} detail={`${START_YEAR} to ${world.year}`} icon={<Clock3 size={18}/>}/><Stat label="TOTAL FIGHTERS" value={compact(world.fighters.length)} detail="Including retired" icon={<Users size={18}/>}/><Stat label="RETIRED CAREERS" value={world.fighters.filter(f=>f.status==='retired').length} icon={<BookOpen size={18}/>}/><Stat label="OFFICIAL FIGHTS" value={compact(totalBouts)} icon={<FileClock size={18}/>}/><Stat label="GRAND TOURNAMENT TITLES" value={world.tournaments.filter(t=>t.status==='complete').length} icon={<Medal size={18}/>}/></div>
    <div className="dashboard-columns"><div className="panel"><SectionHeading eyebrow="ANNUAL EVOLUTION" title="Seasons"/><div className="seasons-list">{world.seasons.slice().reverse().map(s=><div key={s.year} className="season-row"><span className="season-year">{s.year}</span><div><strong>{s.year===START_YEAR?'Founding of NEXUS':'The competitive circuit evolves'}</strong><small>{s.fights||0} bouts · {s.newcomers} prospects · {s.retirements} retired · {s.promotions} promoted · {s.relegations} relegated</small></div><strong className="season-overall">{s.sTierAverage.toFixed(1)}<small> AVG S</small></strong></div>)}</div></div>
    <div className="panel"><SectionHeading eyebrow="ARCHIVE OF TRANSITIONS" title="Event ledger" end={<span className="subtle-tag">{world.events.length} TOTAL</span>}/><div className="ledger-filters">{['All','Followed','Iconic','Tournament','Title','Defense','Interim','Eliminator','Vacancy','Upset','Injury','Streak','Promotion','Relegation','Retirement','Debut'].map(k=><button key={k} className={eventFilter===k?'active':''} onClick={()=>{setEventFilter(k);setLimit(40)}}>{k}</button>)}</div><div className="ledger-list">{list.length===0?<p className="empty-msg">The founding season has no transitions yet. Simulate a year to begin the chronicle.</p>:list.map((e,i)=><button onClick={()=>onSelect(e.fighterId)} className="ledger-event" key={`${e.fighterId}-${e.year}-${i}`}><div className={`feed-mark ${e.type}`}><HistoryIcon type={e.type}/></div><div><strong>{world.fighters.find(f=>f.id===e.fighterId)?.name}</strong><small>{e.description}</small></div><time>{e.year}</time></button>)}</div>{list.length===limit&&<button className="btn btn-quiet load-more" onClick={()=>setLimit(n=>n+50)}>Load older events <ChevronDown size={16}/></button>}</div></div></>;
}
function Profile({fighter:f,world,year,tab,setTab,onFight,onFighter,legacy,onClose,followed,onFollow,onCompare}:{fighter:Fighter;world:World;year:number;tab:ProfileTab;setTab:(t:ProfileTab)=>void;onFight:(id:string)=>void;onFighter:(id:string)=>void;legacy:ReturnType<typeof buildLegacyView>;onClose:()=>void;followed:boolean;onFollow:()=>void;onCompare:()=>void}){
  const active=f.status==='active';const age=ageOf(f,active?year:f.retiredYear||year);const observedYear=active?year:f.retiredYear||year;
  const base=baseOf(f,observedYear);const overall=overallOf(f,observedYear);const skills=abilitiesOf(f,observedYear);
  const fighterReigns=topReigns(world).filter(reign=>reign.fighterId===f.id);const countedReigns=fighterReigns.filter(r=>r.via!=='split');const successfulDefenses=fighterReigns.reduce((n,reign)=>n+reign.defenses,0);const pinnacles=(world.pinnacle??[]).filter(p=>p.winnerId===f.id);const tagReigns=doublesHonors(world,f.id);const supremacies=(world.supremacy??[]).filter(x=>x.winnerId===f.id);
  const maxReached=Math.max(...f.history.map(h=>h.overall));const yearsActive=f.history.length;
  const dialogRef=useDialog<HTMLElement>(onClose);
  const titles=titlesOf(world,f);const tourneyWins=world.tournaments.filter(t=>t.winnerId===f.id);
  const cont=CONTINENTAL_BELTS.flatMap(b=>world.belts[b].reigns.filter(r=>r.fighterId===f.id).map(r=>({b,r})));
  const honors:{label:string;detail:string}[]=[
   ...(fighterReigns.length?[{label:`${countedReigns.length||fighterReigns.length}× world champion`,detail:`${[...new Set(fighterReigns.map(r=>world.crown.reigns.includes(r)?'World Crown':BRAND_BELTS.find(b=>world.crowns?.[b]?.reigns.includes(r))??''))].join(' · ')} · ${successfulDefenses} successful defenses · ${ledgerFor(world,e=>isWorldTitle(e)&&e.w===f.id).length} title-fight wins`}]:[]),
   ...(pinnacles.length?[{label:`${pinnacles.length}× Pinnacle crown`,detail:pinnacles.map(p=>`${p.year} · beat ${world.fighters.find(x=>x.id===p.loserId)?.name??''}`).join(' · ')}]:[]),
   ...(tourneyWins.length?[{label:`${tourneyWins.length}× tournament champion`,detail:`${tourneyWins.map(t=>`${t.year} ${t.kind==='OLYMPIAD'?'Olympiad Gold':t.kind==='CRUCIBLE'?'Crucible GP':'Surge Royale'}`).join(' · ')} · ${f.fame||0} prestige`}]:[]),
   ...(tagReigns.length?[{label:`Doubles crown · ${f.country}`,detail:tagReigns.map(r=>`${r.startYear}${r.endYear?`–${r.endYear}`:'–present'} (${r.defenses} def.)`).join(' · ')}]:[]),
   ...(supremacies.length?[{label:`${supremacies.length}× continental supremacy`,detail:supremacies.map(x=>x.year).join(' · ')}]:[]),
   ...(cont.length?[{label:`${cont.length}× continental champion`,detail:cont.map(x=>`${BELT_SHORT[x.b]} ${x.r.startYear}${x.r.defenses?` (${x.r.defenses} def.)`:''}`).join(' · ')}]:[])];
  const standing=[...titles,...(isInterimChampion(world,f.id)?['Interim champion']:[]),...(world.titleShot?.fighterId===f.id?['Guaranteed title shot']:[]),...(active&&world.tag?.champion===f.country?['Doubles crown nation']:[])];
  const injured=f.injuryUntil>year*ROUNDS_PER_YEAR+world.round;
  return <div className="sr-backdrop" onClick={onClose}><section ref={dialogRef} className="sr" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Fighter profile: ${f.name}`} style={brandStyle(f)}>
    <div className="sr-bar"><span className="sr-bar-id">Scouting report · <b>{f.id.toUpperCase()}</b> · {observedYear}</span><button className="bd-btn" aria-pressed={followed} onClick={onFollow}><Star size={15} fill={followed?'currentColor':'none'}/>{followed?'Following':'Follow'}</button>{active&&<button className="bd-btn" onClick={onCompare}><Swords size={15}/>Compare</button>}<button className="nx-icon" aria-label="Close fighter profile" onClick={onClose}><X size={20}/></button></div>
    <header className="sr-head">
      <div className="sr-portrait"><Avatar fighter={f} size={168}/></div>
      <div className="sr-ident">
        <h2>{f.name}</h2>
        <span className="sr-rank">{active&&f.rank===0&&<Lamp tone="title"/>}{rankLine(f)}<span className="sr-rarity" style={{color:RARITY_COLORS[f.rarity]}}>{f.rarity}</span></span>
        <p className="sr-nick">“{f.nickname}”</p>
        <p className="sr-line"><Flag code={f.flag}/> {f.country} · {f.style} · {f.mentality} · Age {age}</p>
        {standing.length>0&&<p className="sr-titles">{standing.join(' · ')}</p>}
      </div>
      <dl className="sr-board">
        <div><dt>Overall</dt><dd><BoardNum value={overall} size="xl"/></dd></div>
        <div><dt>Official record</dt><dd className="sr-record"><BoardNum value={f.record.wins} size="l" tone="win"/><span aria-hidden="true">-</span><BoardNum value={f.record.losses} size="l" tone="loss"/><span aria-hidden="true">-</span><BoardNum value={f.record.draws} size="l" tone="dim"/></dd></div>
      </dl>
    </header>
    <dl className="sr-metrics">
      <div><dt>Base</dt><dd>{base}</dd></div>
      <div><dt>Shape</dt><dd className={f.shape>=0?'is-up':'is-down'}>{f.shape>=0?'+':''}{f.shape}</dd></div>
      <div className="sr-cond"><dt>Condition <span>{conditionLabel(f.condition)}</span></dt><dd><b>{f.condition}</b><Meter value={f.condition} segments={25} tone={f.condition<60?'loss':undefined} label="Condition"/></dd></div>
    </dl>
    <div className="sr-tabs" role="tablist" aria-label="Profile sections">{(['Overview','Development','Fight Record','Career','Legacy'] as ProfileTab[]).map(t=><button role="tab" aria-selected={tab===t} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    <div className="sr-body" role="tabpanel" aria-label={tab}>{tab==='Overview'&&<>
        {injured&&<p className="sr-alert"><Lamp tone="loss"/><span><strong>Medically suspended: {f.injuryName||'Injury'}</strong> · {Math.max(1,f.injuryUntil-(world.year*ROUNDS_PER_YEAR+world.round))} event-weeks remaining. The fighter cannot be booked before medical clearance.</span></p>}
        {f.condition>=40&&f.condition<60&&!injured&&<p className="sr-alert"><Lamp tone="amber"/><span>Recovery required — condition {f.condition}/100. Cleared for future scheduling once condition reaches 60.</span></p>}
        <div className="sr-cols">
          <section className="sr-sec" aria-labelledby="sr-abil"><h3 id="sr-abil">Abilities <span>average {overall}</span></h3>
            <ul className="sr-abilities">{SKILLS.map(sk=><li key={sk}><span>{sk}</span><Meter value={skills[sk]} label={sk}/><b>{skills[sk]}</b></li>)}</ul>
            <p className="sr-fine">Style modifiers are balanced to average the displayed rating. Physical condition changes readiness, not the stored base score.</p>
          </section>
          <section className="sr-sec" aria-labelledby="sr-phys"><h3 id="sr-phys">Physical</h3>
            <dl className="sr-spec"><div><dt>Nationality</dt><dd><Flag code={f.flag}/> {f.country}</dd></div><div><dt>Height</dt><dd>{f.height} cm</dd></div><div><dt>Weight</dt><dd>{f.weight} kg</dd></div><div><dt>Reach</dt><dd>{f.reach} cm</dd></div><div><dt>Mentality</dt><dd>{f.mentality}</dd></div><div><dt>Pro circuit since</dt><dd>{f.joinedYear}</dd></div></dl>
            <h3 className="sr-sub">Scout’s notes · {f.style} · {f.mentality}</h3>
            <p className="sr-notes">{STYLE_DESCRIPTIONS[f.style]} {MENTAL_DESCRIPTIONS[f.mentality]}</p>
            {(()=>{const ranked=[...SKILLS].sort((x,y)=>skills[y]-skills[x]);return <dl className="sr-sw"><div><dt>Strengths</dt><dd>{ranked.slice(0,3).map(k=>`${k} ${skills[k]}`).join(' · ')}</dd></div><div><dt>Weaknesses</dt><dd>{ranked.slice(-2).reverse().map(k=>`${k} ${skills[k]}`).join(' · ')}</dd></div></dl>;})()}
          </section>
        </div>
        <section className="sr-sec" aria-labelledby="sr-plot"><h3 id="sr-plot">Career · every bout</h3><CareerPlot world={world} id={f.id} name={f.name}/></section>
        {honors.length>0&&<section className="sr-sec" aria-labelledby="sr-hon"><h3 id="sr-hon">Honours</h3><ul className="sr-honors">{honors.map(h=><li key={h.label}><b>{h.label}</b><span>{h.detail}</span></li>)}</ul></section>}
      </>}
      {tab==='Development'&&<><div className="profile-section-head">CAREER TRAJECTORY <span>YEAR {observedYear}</span></div><CareerChart fighter={f} year={observedYear}/><div className="career-metrics"><div><span>CAREER SHAPE</span><strong>{f.archetype}</strong></div><div><span>HIGHEST RECORDED OVR</span><strong>{maxReached}</strong></div><div><span>YEARS DOCUMENTED</span><strong>{yearsActive}</strong></div></div><div className="profile-section-head space-top">WHAT THE RATINGS MEAN</div><div className="explain-cards"><div><TrendingUp size={17}/><strong>Annual base</strong><span>Innate career trajectory. Advances annually and can fall with age.</span></div><div><Zap size={17}/><strong>Shape</strong><span>Recent results, streaks and quality of finishes drive confidence independently of base.</span></div><div><Activity size={17}/><strong>Condition</strong><span>Damage, injury and recovery determine readiness between circuits.</span></div></div></>}
      {tab==='Fight Record'&&<FighterRecord fighter={f} world={world} onFight={onFight}/>}
      {tab==='Career'&&<Suspense fallback={<PageLoading/>}><CareerChronicle world={world} fighter={f} onFight={onFight}/></Suspense>}
      {tab==='Legacy'&&<Suspense fallback={<PageLoading/>}><FighterLegacyPanel world={world} view={legacy} fighter={f} onFighter={onFighter} onFight={onFight}/></Suspense>}
    </div><div className="sr-foot"><Lamp tone={active?'win':'off'}/>{active?'Active competitor':'Retired veteran'}<button className="bd-btn bd-btn-quiet" onClick={onClose}>Close profile<X size={15}/></button></div>
  </section></div>;
}
