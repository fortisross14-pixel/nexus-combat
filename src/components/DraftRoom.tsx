import {useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,Check,CircleSlash,Crown,RotateCcw,Sparkles,Star,UserMinus,Wand2} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {PageHead,RarityPill} from './ui';
import {ageOf,overallOf} from '../engine/career';
import {BRANDS,BRAND_INFO,DIVISION_SIZE,REGIONS,REGION_DIVISIONS,SECOND_DIVISION,TOP_DIVISION,brandOf,isTopDivision,isWorldTier} from '../engine/constants';
import {CONTINENTAL_BELTS,BELT_SHORT,protectedChampions} from '../engine/belts';
import {DRAFT_LIMITS,canDraftMove,draftReadiness,draftStatus,draftTargets,recommendBrand} from '../engine/world';
import type {Division,Fighter,Region,World} from '../engine/types';
import './draft-room.css';

type Tab='Brands'|'Continental signings'|'Continental ladder'|'Retired';
const short=(d:Division)=>d.endsWith(' S')?`${d.slice(0,4)} S`:d.endsWith(' II')?`${d.slice(0,4)} II`:d.replace('EUROPE','EUR').replace('AMERICAS','AMER').replace(' D',' D');
const regionShort=(r:Region)=>r==='Europe & Middle East'?'Europe & ME':r;

/** The offseason as brand manager: promotions and relegations for every division, signings from the
    continents, then "Promotion done — spawn" fills each continental Division II with new prospects. */
export function DraftRoom({world,onFighter,onMove,onAuto,onFinish,onManager}:{world:World;onFighter:(id:string)=>void;onMove:(id:string,to:Division)=>void;onAuto:()=>void;onFinish:()=>void;onManager:(on:boolean)=>void}){
 const draft=world.draft!;
 const [tab,setTab]=useState<Tab>('Brands');
 const status=useMemo(()=>draftStatus(world),[world]);
 const champs=useMemo(()=>protectedChampions(world),[world]);
 const moved=useMemo(()=>new Map(draft.moves.map(m=>[m.id,m])),[draft.moves]);
 const roster=(d:Division)=>world.fighters.filter(f=>f.status==='active'&&f.division===d);
 const byReady=(list:Fighter[])=>list.map(f=>({f,r:draftReadiness(world,f)})).sort((a,b)=>b.r-a.r);
 const check=(d:Division)=>status.checks.find(c=>c.division===d)!;
 const issues=status.checks.filter(c=>!c.ok);
 const Row=({f,actions,note}:{f:Fighter;actions?:React.ReactNode;note?:React.ReactNode})=>{
  const m=moved.get(f.id);
  return <div className={`dr-row ${m?'moved':''} ${m&&isUp(m.from,m.to)?'up':m?'down':''}`}>
   <button className="dr-who" onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={34}/><span><b><Flag code={f.flag}/>{f.name}{champs.has(f.id)&&<Crown size={11} className="dr-crown"/>}{world.titleShot?.fighterId===f.id&&<em className="dr-tag">SHOT</em>}</b>
    <small>{f.style} · {ageOf(f,world.year)} yrs · {f.record.wins}-{f.record.losses}{m?<> · <i>{m.from===f.division?'':`from ${short(m.from)}`}</i></>:note?<> · {note}</>:null}</small></span></button>
   <span className={`dr-rar r-${f.rarity.toLowerCase()}`} title={f.rarity}>{f.rarity[0]}</span>
   <span className="dr-num"><b>{overallOf(f,world.year)}</b><small>OVR</small></span>
   <span className="dr-num"><b>{Math.round(draftReadiness(world,f))}</b><small>READY</small></span>
   <span className="dr-actions">{m?<button className="dr-btn undo" onClick={()=>onMove(f.id,m.from)}><RotateCcw size={13}/> Undo</button>:actions}</span>
  </div>;
 };
 const act=(f:Fighter,to:Division,label:React.ReactNode,kind:'up'|'down'|'brand',extra?:string)=>{
  if(!draftTargets(world,f).includes(to))return null;
  const ok=canDraftMove(world,f,to);
  return <button key={to} className={`dr-btn ${kind} ${extra??''}`} disabled={!ok} title={ok?undefined:'Relegation limit reached'} onClick={()=>onMove(f.id,to)}>{label}</button>;
 };
 const counter=(d:Division)=>{const c=check(d);return <span className={`dr-count ${c.ok?'ok':'off'}`}>{c.count}/{c.target}</span>;};
 return <div className="dr-page">
  <PageHead tag={`OFFSEASON ${draft.year-1} → ${draft.year} · BRAND MANAGER`} title="Draft" accent="Room." description="READY combines rating, recent results and age: the number the game itself uses to judge who is ready. Set promotions and relegations until every brand division has 14 fighters and every continental Division I has 20. Continental Division II keeps the gaps: new prospects spawn there when you are done."
   end={<label className="dr-manage"><input type="checkbox" checked={world.manager!==false} onChange={e=>onManager(e.target.checked)}/> I run the offseason</label>}/>
  <section className="panel dr-status">
   <div className="dr-status-grid">
    {BRANDS.map(b=><div key={b} className="dr-sg brand" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}><small>{b}</small>
     <span>S {counter(TOP_DIVISION[b])}</span><span>II {counter(SECOND_DIVISION[b])}</span>
     <em>Relegations {status.used.brandRelegations[b]}/{DRAFT_LIMITS.brandRelegations} · Releases {status.used.brandReleases[b]}/{DRAFT_LIMITS.brandReleases}</em></div>)}
    {REGIONS.map(r=>{const [d1,d2]=REGION_DIVISIONS[r];const room=DIVISION_SIZE(d2)-roster(d2).length;return <div key={r} className="dr-sg"><small>{regionShort(r)}</small>
     <span>D1 {counter(d1)}</span><span>D2 <span className={`dr-count ${check(d2).ok?'ok':'off'}`}>{roster(d2).length}</span></span>
     <em>{room>0?`${room} prospect${room===1?'':'s'} will spawn`:room<0?'Over twenty: promote or relegate less':'Full'}</em></div>;})}
   </div>
   <div className="dr-status-actions">
    <span className={status.ok?'dr-ready':'dr-todo'}>{status.ok?<><Check size={15}/> Every division is full. Ready to spawn.</>:<>{issues.length} division{issues.length===1?'':'s'} not ready: {issues.slice(0,4).map(c=>`${short(c.division)} ${c.count}/${c.target}`).join(' · ')}{issues.length>4?' …':''}</>}</span>
    <button className="btn btn-secondary" onClick={onAuto}><Wand2 size={15}/> Let the game decide the rest</button>
    <button className="btn btn-primary" disabled={!status.ok} onClick={onFinish}><Sparkles size={15}/> Promotion done — spawn</button>
   </div>
  </section>
  <nav className="dr-tabs" role="tablist">{(['Brands','Continental signings','Continental ladder','Retired'] as Tab[]).map(t=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}{t==='Retired'&&<small>{draft.retired.length}</small>}{t==='Continental signings'&&<small>{draft.applicants.filter(id=>world.fighters.find(f=>f.id===id)?.division.endsWith('D1')).length}</small>}</button>)}</nav>

  {tab==='Brands'&&<div className="dr-brands">{BRANDS.map(b=>{const S=TOP_DIVISION[b],II=SECOND_DIVISION[b];
   const elite=(r:Fighter['rarity'])=>world.fighters.filter(f=>f.status==='active'&&brandOf(f.division)===b&&f.rarity===r).length;
   return <section key={b} className="panel dr-brand" style={{'--brand':BRAND_INFO[b].color} as React.CSSProperties}>
    <header><h2>{b}</h2><span className="dr-elite">{elite('Generational')} generational · {elite('Legend')} legends · {elite('Epic')} epics</span></header>
    <div className="dr-cols">
     <div><div className="dr-col-head">S DIVISION {counter(S)}<small>Relegate up to {DRAFT_LIMITS.brandRelegations} to Division II</small></div>
      {byReady(roster(S)).map(({f})=><Row key={f.id} f={f} actions={act(f,II,<><ArrowDown size={13}/> II</>,'down')}/>)}</div>
     <div><div className="dr-col-head">DIVISION II {counter(II)}<small>Promote to S (24+) · release up to {DRAFT_LIMITS.brandReleases} to their continent</small></div>
      {byReady(roster(II)).map(({f})=><Row key={f.id} f={f} actions={<>{act(f,S,<><ArrowUp size={13}/> S</>,'up')}{act(f,`${REGION_DIVISIONS[f.region][0]}` as Division,<><ArrowDown size={13}/> {short(REGION_DIVISIONS[f.region][0])}</>,'down')}</>}/>)}</div>
    </div>
   </section>;})}</div>}

  {tab==='Continental signings'&&<>
   <p className="dr-help">Only fighters who want to move up are here. Pick the brand: the <Star size={12}/> marks the draft pick that keeps the brands balanced (generational talent to the brand with fewer, then legends, then the brand that needs the seat).</p>
   <div className="dr-regions">{REGIONS.map(r=>{const D1=REGION_DIVISIONS[r][0];
    const signed=draft.moves.filter(m=>m.from===D1&&isWorldTier(m.to)).map(m=>world.fighters.find(f=>f.id===m.id)!).filter(Boolean);
    const apps=byReady(roster(D1).filter(f=>draft.applicants.includes(f.id))).slice(0,10);
    const declined=draft.declined.map(id=>world.fighters.find(f=>f.id===id)!).filter(f=>f&&f.status==='active'&&f.division===D1);
    return <section key={r} className="panel dr-region"><header><h3>{regionShort(r)}</h3><span>{apps.length} applicant{apps.length===1?'':'s'}{signed.length?` · ${signed.length} signed`:''}</span></header>
     {signed.map(f=><Row key={f.id} f={f}/>)}
     {apps.map(({f})=>{const pickBrand=recommendBrand(world,f);return <Row key={f.id} f={f} note={beltOf(world,f.id)??undefined} actions={BRANDS.map(b=>act(f,SECOND_DIVISION[b],<>{b===pickBrand&&<Star size={11} fill="currentColor"/>}{b}</>,'brand',`b-${b.toLowerCase()} ${b===pickBrand?'pick':''}`))}/>;})}
     {!apps.length&&!signed.length&&<p className="dr-empty">Nobody here wants to move up this year.</p>}
     {declined.length>0&&<div className="dr-declined"><small><CircleSlash size={12}/> DECLINED</small>{declined.slice(0,5).map(f=><button key={f.id} onClick={()=>onFighter(f.id)}><Flag code={f.flag}/>{f.name}<i>{declineReason(world,f)}</i></button>)}</div>}
    </section>;})}</div>
  </>}

  {tab==='Continental ladder'&&<div className="dr-regions">{REGIONS.map(r=>{const [D1,D2]=REGION_DIVISIONS[r];
   const d1=byReady(roster(D1));const d2=byReady(roster(D2));
   const movedD1=d1.filter(x=>moved.has(x.f.id)),movedD2=d2.filter(x=>moved.has(x.f.id));
   return <section key={r} className="panel dr-region"><header><h3>{regionShort(r)}</h3><span>Relegations {status.used.continentalRelegations[r]}/{DRAFT_LIMITS.continentalRelegations}</span></header>
    <div className="dr-col-head">DIVISION I {counter(D1)}<small>Weakest first: relegate to make room</small></div>
    {[...movedD1,...d1.filter(x=>!moved.has(x.f.id)).slice(-6).reverse()].map(({f})=><Row key={f.id} f={f} actions={act(f,D2,<><ArrowDown size={13}/> D2</>,'down')}/>)}
    <div className="dr-col-head">DIVISION II <span className="dr-count ok">{roster(D2).length}</span><small>Best first: promote to Division I (18+)</small></div>
    {[...movedD2,...d2.filter(x=>!moved.has(x.f.id)).slice(0,6)].map(({f})=><Row key={f.id} f={f} actions={act(f,D1,<><ArrowUp size={13}/> D1</>,'up')}/>)}
   </section>;})}</div>}

  {tab==='Retired'&&<section className="panel dr-retired"><header className="dr-col-head"><UserMinus size={14}/> {draft.retired.length} CAREERS ENDED THIS OFFSEASON</header>
   <div className="dr-retired-grid">{groupRetired(world,draft.retired).map(([d,list])=><div key={d}><div className="dr-col-head">{d}<small>{list.length} left</small></div>
    {list.map(f=><button key={f.id} className="dr-ret" onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={30}/><span><b><Flag code={f.flag}/>{f.name}</b><small>Age {ageOf(f,f.retiredYear??world.year)} · {f.record.wins}-{f.record.losses}-{f.record.draws}</small></span><RarityPill rarity={f.rarity}/></button>)}</div>)}</div>
  </section>}
 </div>;
}
const tierOf=(d:Division)=>isTopDivision(d)?0:isWorldTier(d)?1:d.endsWith('D1')?2:3;
const isUp=(from:Division,to:Division)=>tierOf(to)<tierOf(from);
function beltOf(w:World,id:string){const b=CONTINENTAL_BELTS.find(x=>w.belts[x].championId===id);return b?`${BELT_SHORT[b]} champion`:null;}
function declineReason(w:World,f:Fighter){
 const age=ageOf(f,w.year);const belt=beltOf(w,f.id);
 if(belt)return age>=33?`stays home to defend the ${belt.replace(' champion','')}`:`keeps the ${belt.replace(' champion','')}`;
 if(age>=33)return 'happy at home at this stage';
 return 'not ready to leave home';
}
function groupRetired(w:World,ids:string[]):[string,Fighter[]][]{
 const order=['NOVA S','ONYX S','NOVA II','ONYX II',...REGIONS.flatMap(r=>REGION_DIVISIONS[r])];
 const by=new Map<string,Fighter[]>();
 for(const id of ids){const f=w.fighters.find(x=>x.id===id);if(f)(by.get(f.division)??by.set(f.division,[]).get(f.division)!).push(f);}
 return [...by.entries()].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
}
