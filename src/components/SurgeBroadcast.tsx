import {useEffect,useRef,useState} from 'react';
import {ArrowDownUp,Pause,Play,SkipForward,FastForward,X,Shield,Activity,Timer,Users,ChevronRight,Trophy} from 'lucide-react';
import {overallOf} from '../engine/career';
import {brandOf,RARITY_COLORS} from '../engine/constants';
import type {World,Tournament,SurgeFighterState} from '../engine/types';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import './surge-broadcast.css';

type Sort='minutes'|'damage'|'energy'|'overall';
const score=(s:SurgeFighterState,key:Sort,minute:number,overall:number)=>key==='minutes'?minute-s.enteredAt:key==='damage'?s.damage:key==='energy'?s.energy:overall;
const clock=(min:number)=>`${Math.floor(min/60).toString().padStart(2,'0')}:${(min%60).toString().padStart(2,'0')}`;

export function SurgeBroadcast({world,t,onStep,onAdvance,onFinish,onFighter,onClose}:{world:World;t:Tournament;onStep:()=>void;onAdvance:()=>void;onFinish:()=>void;onFighter:(id:string)=>void;onClose:()=>void}){
 const [playing,setPlaying]=useState(false);
 const [speed,setSpeed]=useState(1);
 const [sort,setSort]=useState<Sort>('minutes');
 const [descending,setDescending]=useState(true);
 const callback=useRef(onStep);
 useEffect(()=>{callback.current=onStep},[onStep]);
 useEffect(()=>{if(!playing||t.status==='complete')return;const timer=window.setInterval(()=>callback.current(),speed===1?950:speed===2?480:215);return()=>window.clearInterval(timer)},[playing,speed,t.status]);
 useEffect(()=>{if(t.status==='complete')setPlaying(false)},[t.status]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[onClose]);
 const state=t.surgeState;
 const minute=state?.minute??0;
 const participants=t.surgeOrder??t.participants;
 const entered=state?Object.keys(state.fighters).length:t.surgeMoments?.filter(m=>m.entrantId).length??0;
 const active=t.surgeActive??[];
 const eliminated=entered-active.length;
 const idToFighter=new Map(world.fighters.map(f=>[f.id,f]));
 const survivors=active.map(id=>{
  const f=idToFighter.get(id)!;
  return {f,state:state?.fighters[id]??{enteredAt:0,energy:100,damage:0,eliminations:0},overall:overallOf(f,world.year)};
 }).sort((a,b)=>(score(b.state,sort,minute,b.overall)-score(a.state,sort,minute,a.overall))*(descending?1:-1));
 const highlights=(t.surgeMoments??[]).filter(m=>m.eliminatedId||m.entrantId).slice(-12).reverse();
 const eliminations=(t.surgeMoments??[]).filter(m=>m.eliminatedId).slice().reverse();
 const champ=t.winnerId?idToFighter.get(t.winnerId):null;
 const nextMinute=(entered<20?Math.max(3,(entered-1)*3):null);
 const sortBy=(key:Sort)=>{if(sort===key)setDescending(!descending);else{setSort(key);setDescending(true)}};
 const sortHead=(key:Sort,label:string)=><button className={sort===key?'selected':''} onClick={()=>sortBy(key)} aria-label={`Sort fighters by ${label}`} aria-sort={sort===key?(descending?'descending':'ascending'):undefined}>{label}<ArrowDownUp size={12}/></button>;
 return <div className="surge-shade" role="dialog" aria-modal="true" aria-label="The Surge live broadcast">
  <div className="surge-broadcast">
   <div className="surge-broadcast-head"><div><span className="surge-live-dot"/> NEXUS BROADCAST · {t.year} <strong>THE SURGE / LIVE ARENA</strong></div><button className="surge-close" onClick={onClose} aria-label="Close broadcast"><X size={22}/></button></div>
   <div className="surge-scoreboard">
    <div className="surge-time"><span>ELAPSED TIME</span><strong>{clock(minute)}</strong><small>NEW FIGHTER EVERY 03:00</small></div>
    <div><Users size={19}/><span>IN THE RING</span><strong>{active.length}</strong></div>
    <div><Shield size={19}/><span>ELIMINATED</span><strong>{eliminated}</strong></div>
    <div><Activity size={19}/><span>ENTRANTS</span><strong>{entered}<em> / 20</em></strong></div>
    <div className="surge-next"><Timer size={19}/><span>NEXT ENTRY</span><strong>{nextMinute===null?'ALL IN':clock(nextMinute)}</strong></div>
   </div>
   <div className="surge-broadcast-main">
    <div className="surge-left">
     <div className="surge-arena-hero"><div className="surge-ring-surface"><div className="surge-ring-outline"><span>NEXUS</span><div className="surge-ring-portraits">{active.slice(-4).map(id=>{const f=idToFighter.get(id)!;return <div key={id} title={f.name}><Avatar fighter={f} size={37}/></div>})}</div><strong>{t.status==='complete'?'CHAMPION CROWNED':`${active.length} IN THE ARENA`}</strong></div></div><div className="surge-current-call"><small>{t.status==='complete'?'THE SURGE IS COMPLETE':`MINUTE ${minute} · LIVE COMMENTARY`}</small><strong>{champ?`${champ.name} wins The Surge!`:state?.lastEvent??'The opening fighters are ready.'}</strong><span>{t.status==='complete'?'A new chapter in NEXUS history.':nextMinute===null?'All twenty fighters have entered. Who survives?':`Next entrant scheduled at ${clock(nextMinute)}.`}</span></div></div>
     <div className="surge-controls"><button className="btn btn-primary" onClick={()=>setPlaying(!playing)} disabled={t.status==='complete'}>{playing?<><Pause size={17}/> Pause</>:<><Play size={17}/> {minute===0?'Simulate live':'Resume'}</>}</button><div className="surge-speed" role="group" aria-label="Playback speed">{[1,2,4].map(n=><button key={n} className={speed===n?'active':''} onClick={()=>setSpeed(n)}>{n}×</button>)}</div><button className="btn btn-secondary" disabled={t.status==='complete'} onClick={()=>{setPlaying(false);onStep()}}><SkipForward size={16}/> +1 min</button><button className="btn btn-secondary" disabled={t.status==='complete'} onClick={()=>{setPlaying(false);onAdvance()}}><FastForward size={16}/> +5 min</button><button className="btn btn-quiet" disabled={t.status==='complete'} onClick={()=>{setPlaying(false);onFinish()}}>Finish</button></div>
     <div className="surge-table-wrap"><div className="surge-table-title"><strong>FIGHTERS STILL IN THE ARENA</strong><span>Click a column to sort · damage 0–100</span></div><div className="surge-overflow"><table className="surge-fighters"><thead><tr><th>FIGHTER</th><th>BRAND</th><th>RARITY</th><th>{sortHead('overall','OVR')}</th><th>{sortHead('minutes','MIN')}</th><th>{sortHead('energy','ENERGY')}</th><th>{sortHead('damage','DAMAGE')}</th></tr></thead><tbody>{survivors.map(({f,state:s,overall})=><tr key={f.id}><td><button className="surge-person" onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={37}/><span><b><Flag code={f.flag}/>{f.name}</b><small>{f.style} · {f.mentality}</small></span><ChevronRight size={12}/></button></td><td><b className={`surge-brand ${brandOf(f.division)?.toLowerCase()??'continental'}`}>{brandOf(f.division)??f.division.replace(' D1','')}</b></td><td><span className="surge-rarity" style={{color:RARITY_COLORS[f.rarity]}}>● {f.rarity}</span></td><td className="surge-num"><strong>{overall}</strong></td><td className="surge-num">{minute-s.enteredAt}m</td><td><div className="surge-meter"><span>{Math.round(s.energy)}%</span><i><b style={{width:`${s.energy}%`,background:s.energy<30?'#ea7468':s.energy<55?'#e8ae66':'#61c9b2'}}/></i></div></td><td><div className="surge-meter"><span>{Math.round(s.damage)}%</span><i><b style={{width:`${s.damage}%`,background:s.damage>70?'#f27269':s.damage>40?'#e9ae6c':'#77b0dd'}}/></i></div></td></tr>)}</tbody></table></div></div>
    </div>
    <aside className="surge-right"><div className="surge-feed"><h3>ELIMINATION FEED <small>{eliminated} OUT</small></h3>{eliminations.length?eliminations.map((m,i)=><div className="surge-feed-item" key={`${m.wave}-${i}`}><time>{clock(m.minute??Math.max(0,m.wave*3-3))}</time><span><b>{idToFighter.get(m.eliminatedId!)?.name}</b><small>{m.byId?`Eliminated by ${idToFighter.get(m.byId)?.name}`:'Eliminated'} · {state?.fighters[m.eliminatedId!]?.damage?.toFixed(0)??'?'}% damage</small></span></div>):<p>The arena is ready. Eliminations will appear here as they happen.</p>}</div><div className="surge-feed arrivals"><h3>RECENT ARRIVALS <small>{entered}/20</small></h3>{highlights.filter(x=>x.entrantId).slice(0,7).map((m,i)=><div className="surge-feed-item" key={`entry-${i}-${m.wave}`}><time>{clock(m.minute??0)}</time><span><b>{idToFighter.get(m.entrantId!)?.name}</b><small>Entered · {idToFighter.get(m.entrantId!)?.division}</small></span></div>)}</div>{champ&&<div className="surge-winner"><Trophy size={22}/><strong>THE SURGE CHAMPION</strong><button onClick={()=>onFighter(champ.id)}><Avatar fighter={champ} size={62}/><span>{champ.name}<small>{champ.rarity} · {champ.style}</small></span></button></div>}</aside>
   </div>
  </div>
 </div>;
}
