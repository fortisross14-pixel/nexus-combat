import {useMemo,useState} from 'react';
import {rankText} from './ui';
import {Flag} from './Flag';
import {Crown,Search,Star,X} from 'lucide-react';
import {Avatar} from './Avatar';
import type {Fighter,World} from '../engine/types';
import {ageOf,baseOf,overallOf} from '../engine/career';
import {oddsBreakdown,styleAdvantage} from '../engine/combat';
import {forecastBout,headToHead,recentResults,tapeStats,finishRates} from '../engine/forecast';
import {beltsHeld,BELT_SHORT} from '../engine/belts';
import {headlineOf,eventNameOf} from '../engine/archive';
import './pass2.css';

const pct=(x:number)=>`${Math.round(x*100)}%`;
const one=(x:number)=>x.toFixed(1);
type Row={label:string;a:string;b:string;better?:'a'|'b'|null};
function compare(label:string,a:number,b:number,format:(x:number)=>string,higherIsBetter=true):Row{
 const better=Math.abs(a-b)<1e-9?null:(a>b)===higherIsBetter?'a':'b';return {label,a:format(a),b:format(b),better};
}
/** Side-by-side comparison, fight chances and history for any two fighters. */
export function TaleOfTheTape({world,a,b,rounds=3,onFighter,onFight,compact=false}:{world:World;a:Fighter;b:Fighter;rounds?:2|3|5;onFighter?:(id:string)=>void;onFight?:(id:string)=>void;compact?:boolean}){
 const year=world.year;
 const forecast=useMemo(()=>forecastBout(a,b,year,rounds),[a,b,year,rounds]);
 const odds=oddsBreakdown(a,b,year);
 const sa=tapeStats(a),sb=tapeStats(b),fa=finishRates(a),fb=finishRates(b);
 const formA=recentResults(world,a.id),formB=recentResults(world,b.id);
 const h2h=headToHead(world,a.id,b.id);
 const beltsA=beltsHeld(world,a.id),beltsB=beltsHeld(world,b.id);
 const rows:Row[]=[
  {label:'Record',a:`${a.record.wins}-${a.record.losses}-${a.record.draws}`,b:`${b.record.wins}-${b.record.losses}-${b.record.draws}`,better:null},
  compare('Overall',overallOf(a,year),overallOf(b,year),String),
  {label:'Base · form',a:`${baseOf(a,year)} · ${a.shape>=0?'+':''}${a.shape}`,b:`${baseOf(b,year)} · ${b.shape>=0?'+':''}${b.shape}`,better:null},
  compare('Condition',a.condition,b.condition,String),
  {label:'Rank',a:a.status==='active'?`${rankText(a.rank)} ${a.division}`:'Retired',b:b.status==='active'?`${rankText(b.rank)} ${b.division}`:'Retired',better:null},
  compare('Age',ageOf(a,year),ageOf(b,year),String,false),
  compare('Height',a.height,b.height,x=>`${x} cm`),
  compare('Reach',a.reach,b.reach,x=>`${x} cm`),
  compare('Weight',a.weight,b.weight,x=>`${x} kg`),
  {label:'Style',a:a.style,b:b.style,better:styleAdvantage(a.style,b.style)>0?'a':styleAdvantage(a.style,b.style)<0?'b':null},
  {label:'Mentality',a:a.mentality,b:b.mentality,better:null},
  compare('Star power',a.fame||0,b.fame||0,x=>String(Math.round(x))),
 ];
 const statRows:Row[]=sa&&sb?[
  compare('Sig. strikes landed / min',sa.sigPerMin,sb.sigPerMin,one),
  compare('Striking accuracy',sa.sigAccuracy,sb.sigAccuracy,pct),
  compare('Takedowns / 15 min',sa.tdPer15,sb.tdPer15,one),
  compare('Takedown accuracy',sa.tdAccuracy,sb.tdAccuracy,pct),
  compare('Takedown defence',sa.tdDefense,sb.tdDefense,pct),
  compare('Knockdowns / fight',sa.kdPerFight,sb.kdPerFight,x=>x.toFixed(2)),
  compare('Submission attempts / fight',sa.subPerFight,sb.subPerFight,x=>x.toFixed(2)),
  compare('Damage absorbed / fight',sa.damageTakenPerFight,sb.damageTakenPerFight,x=>String(Math.round(x)),false),
 ]:[];
 const finishRows:Row[]=[
  {label:'Wins by KO / TKO',a:pct(fa.ko),b:pct(fb.ko),better:null},{label:'Wins by submission',a:pct(fa.sub),b:pct(fb.sub),better:null},{label:'Wins by decision',a:pct(fa.dec),b:pct(fb.dec),better:null},
 ];
 const factor=(label:string,v:number)=>Math.abs(v)<.05?null:<li key={label}><span>{label}</span><b className={v>0?'tape-a':'tape-b'}>{v>0?a.name.split(' ').at(-1):b.name.split(' ').at(-1)} +{one(Math.abs(v))}</b></li>;
 const Side=({f,belts,form}:{f:Fighter;belts:ReturnType<typeof beltsHeld>;form:ReturnType<typeof recentResults>})=><button className="tape-side" onClick={()=>onFighter?.(f.id)}>
  <Avatar fighter={f} size={compact?84:112}/><strong>{f.name}</strong><small><Flag code={f.flag}/> {f.country} · {f.style}</small>
  {belts.length>0&&<span className="tape-belts">{belts.map(bt=><i key={bt}><Crown size={11}/> {BELT_SHORT[bt]}</i>)}</span>}
  <span className="tape-form">{form.length?form.map((x,i)=><i key={i} className={`form-${x.result}`} title={headlineOf(world,x.entry)}>{x.result}</i>):<em>No bouts yet</em>}</span>
 </button>;
 return <div className={`tape ${compact?'tape-compact':''}`}>
  <div className="tape-head"><Side f={a} belts={beltsA} form={formA}/><div className="tape-title"><span>TALE OF THE TAPE</span><strong>VS</strong><small>{rounds} rounds</small></div><Side f={b} belts={beltsB} form={formB}/></div>
  <section className="tape-chances"><div className="tape-section-label">FIGHT CHANCES <small>{forecast.samples} simulated what-if bouts · the real result is not decided yet</small></div>
   <div className="tape-bar"><i className="tape-a-fill" style={{width:pct(forecast.winA)}}>{pct(forecast.winA)}</i>{forecast.draw>.005&&<i className="tape-draw-fill" style={{width:pct(forecast.draw)}}/>}<i className="tape-b-fill" style={{width:pct(forecast.winB)}}>{pct(forecast.winB)}</i></div>
   <div className="tape-methods">{([[a,forecast.a],[b,forecast.b]] as const).map(([f,m],i)=><div key={f.id} className={i?'right':''}><small>{f.name.split(' ').at(-1)} wins by</small><span>KO/TKO <b>{pct(m.ko)}</b></span><span>Submission <b>{pct(m.sub)}</b></span><span>Decision <b>{pct(m.dec)}</b></span></div>)}</div>
   <div className="tape-factors"><span>What tilts it (rating points):</span><ul>{[factor('Rating',odds.rating),factor('Style matchup',odds.style),factor('Size',odds.size),factor('Condition',odds.condition)]}</ul></div>
  </section>
  <section className="tape-table">{[...rows,...(compact?[]:finishRows),...statRows].map(r=><div className="tape-row" key={r.label}><span className={r.better==='a'?'tape-better':''}>{r.a}</span><small>{r.label}</small><span className={r.better==='b'?'tape-better':''}>{r.b}</span></div>)}
   {!statRows.length&&<p className="tape-note">Career fight statistics appear once both fighters have competed under the new engine.</p>}</section>
  <section className="tape-h2h"><div className="tape-section-label">HEAD TO HEAD <small>{h2h.length?`${h2h.filter(e=>e.w===a.id).length}–${h2h.filter(e=>e.w===b.id).length}${h2h.some(e=>!e.w)?` · ${h2h.filter(e=>!e.w).length} draw`:''}`:'First meeting'}</small></div>
   {h2h.slice(0,6).map(e=><button key={e.i} onClick={()=>onFight?.(e.i)}><b>{e.y}</b><span>{headlineOf(world,e)}</span><small>{eventNameOf(e)}</small></button>)}</section>
 </div>;
}
/** Pick any opponent and compare. */
export function CompareDialog({world,fighter,onClose,onFighter,onFight,initialOpponent=null,rounds=3}:{world:World;fighter:Fighter;onClose:()=>void;onFighter:(id:string)=>void;onFight:(id:string)=>void;initialOpponent?:string|null;rounds?:2|3|5}){
 const [query,setQuery]=useState('');
 const [otherId,setOtherId]=useState<string|null>(initialOpponent);
 const options=useMemo(()=>world.fighters.filter(f=>f.id!==fighter.id&&f.status==='active'&&`${f.name} ${f.country} ${f.style} ${f.division}`.toLowerCase().includes(query.toLowerCase()))
  .sort((x,y)=>(x.division===fighter.division?0:1)-(y.division===fighter.division?0:1)||x.rank-y.rank).slice(0,40),[world,fighter,query]);
 const other=world.fighters.find(f=>f.id===otherId);
 return <div className="tape-backdrop" onClick={onClose}><section className="tape-dialog" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Compare fighters">
  <header><span><Star size={14}/> COMPARE · {fighter.name}</span><button onClick={onClose} aria-label="Close comparison"><X size={19}/></button></header>
  {!other?<div className="tape-picker"><label><Search size={16}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find an opponent by name, nation, style or division"/></label>
   <div className="tape-options">{options.map(f=><button key={f.id} onClick={()=>setOtherId(f.id)}><Avatar fighter={f} size={38}/><span><b>{f.name}</b><small><Flag code={f.flag}/> {f.division} {rankText(f.rank)} · {f.style}</small></span><em>{overallOf(f,world.year)}</em></button>)}</div></div>
  :<><button className="tape-change" onClick={()=>setOtherId(null)}>← Choose another opponent</button><TaleOfTheTape world={world} a={fighter} b={other} rounds={rounds} onFighter={id=>{onClose();onFighter(id);}} onFight={onFight}/></>}
 </section></div>;
}
