import type {CSSProperties,ReactNode} from 'react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {BoardNum,Lamp} from './board';
import {overallOf} from '../engine/career';
import {beltsHeld,BELT_SHORT,isBrandBelt} from '../engine/belts';
import {brandOf,BRAND_INFO,divisionLabel} from '../engine/constants';
import type {Fighter,World} from '../engine/types';

/** "#3 · NOVA S" or "Champion · ONYX S". */
export function rankLine(f:Fighter){
 const b=brandOf(f.division);
 const div=b?`${b} ${f.division.endsWith(' S')?'S':'II'}`:divisionLabel(f.division);
 if(f.status!=='active')return 'Retired';
 return f.rank===0?`Champion · ${div}`:`#${f.rank} · ${div}`;
}
export const brandStyle=(f:Fighter):CSSProperties|undefined=>{const b=brandOf(f.division);return b?{'--brand':BRAND_INFO[b].color} as CSSProperties:undefined;};
export const titlesOf=(world:World,f:Fighter)=>beltsHeld(world,f.id).map(b=>isBrandBelt(b)?`${b} world champion`:`${BELT_SHORT[b]} champion`);

/** One corner of a bout. Corner A sits left of the staff, corner B mirrors it on the right. */
export function Corner({f,world,side,size=96,onFighter,children}:{f:Fighter;world:World;side:'a'|'b';size?:number;onFighter:(id:string)=>void;children?:ReactNode}){
 const titles=titlesOf(world,f);
 return <div className={`corner corner-${side}`} style={brandStyle(f)}>
  <button className="corner-id" onClick={()=>onFighter(f.id)}>
   <span className="corner-portrait"><Avatar fighter={f} size={size}/></span>
   <span className="corner-text">
    <strong className="corner-name">{f.name}</strong>
    <span className="corner-rank">{f.rank===0&&f.status==='active'&&<Lamp tone="title"/>}{rankLine(f)}</span>
    <span className="corner-nation"><Flag code={f.flag}/>{f.country}</span>
    <span className="corner-style">{f.style} · {f.mentality}</span>
    {titles.length>0&&<span className="corner-titles">{titles.join(' · ')}</span>}
   </span>
  </button>
  <dl className="corner-stats">
   <div><dt>Record</dt><dd>{f.record.wins}-{f.record.losses}-{f.record.draws}</dd></div>
   <div><dt>OVR</dt><dd><BoardNum value={overallOf(f,world.year)} size="s"/></dd></div>
  </dl>
  {children}
 </div>;
}

/** The centre staff between two corners: everything the bout shares. */
export function Staff({slot,what,rounds,chance,children}:{slot:string;what?:string;rounds?:number;chance?:number|null;children?:ReactNode}){
 const pa=chance==null?null:Math.round(chance*100);
 return <div className="staff">
  <span className="staff-slot">{slot}</span>
  {what&&<span className="staff-what">{what}</span>}
  <span className="staff-vs" aria-hidden="true">VS</span>
  {rounds&&<span className="staff-rounds">{rounds} rounds</span>}
  {pa!=null&&<div className="staff-odds" role="img" aria-label={`Win chance: ${pa}% to ${100-pa}%`}><span>{pa}%</span><i><b style={{width:`${pa}%`}}/></i><span>{100-pa}%</span></div>}
  {children}
 </div>;
}
