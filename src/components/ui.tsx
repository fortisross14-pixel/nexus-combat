import type {CSSProperties,ReactNode} from 'react';
import {Crown} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {RARITY_COLORS} from '../engine/constants';
import {BELT_SHORT,beltsHeld,isInterimChampion} from '../engine/belts';
import {CALENDAR,MONTH_OF,ROUNDS_PER_YEAR} from '../engine/competition';
import type {Fighter,Rarity,World} from '../engine/types';

/** C for a division's champion, otherwise #n. */
export const rankText=(rank:number)=>rank===0?'C':`#${rank}`;
export function RankTag({rank,division}:{rank:number;division?:string}){
 return <span className={`rank-tag ${rank===0?'is-champ':''}`}>{rank===0?<><Crown size={10}/>C</>:`#${rank}`}{division&&<small>{division}</small>}</span>;
}
export function RarityPill({rarity}:{rarity:Rarity}){return <span className="rarity-pill" style={{'--rare':RARITY_COLORS[rarity]} as CSSProperties}><i/>{rarity}</span>;}
export function PageHead({tag,title,accent,description,end}:{tag:string;title:string;accent:string;description?:string;end?:ReactNode}){
 return <div className="page-title v13-head"><div><div className="eyebrow">{tag}</div><h1>{title} <span>{accent}</span></h1>{description&&<p>{description}</p>}</div>{end}</div>;
}
export function Heading({eyebrow,title,end}:{eyebrow?:string;title:string;end?:ReactNode}){
 return <div className="section-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{end}</div>;
}
export function BeltChips({world,id}:{world:World;id:string}){
 return <>{beltsHeld(world,id).map(b=><span key={b} className="belt-chip"><Crown size={10}/>{BELT_SHORT[b]}</span>)}{isInterimChampion(world,id)&&<span className="belt-chip">INTERIM</span>}{world.titleShot?.fighterId===id&&<span className="belt-chip shot">TITLE SHOT</span>}</>;
}
/** One-line fighter identity used across lists. */
export function FighterLine({f,world,onFighter,sub,size=40,right}:{f:Fighter;world:World;onFighter:(id:string)=>void;sub?:ReactNode;size?:number;right?:ReactNode}){
 return <button className="fighter-line" onClick={()=>onFighter(f.id)}><Avatar fighter={f} size={size}/><span className="fl-text"><b><Flag code={f.flag}/>{f.name}<BeltChips world={world} id={f.id}/></b><small>{sub??`${f.style} · ${f.record.wins}-${f.record.losses}-${f.record.draws}`}</small></span>{right&&<span className="fl-right">{right}</span>}</button>;
}
/** "in 3 weeks", "next month", "in 5 months", across the year boundary. */
export function whenFrom(world:World,year:number,round:number){
 const diff=(year-world.year)*ROUNDS_PER_YEAR+round-world.round;
 if(diff<=0)return 'this week';
 if(diff<4)return `in ${diff} week${diff===1?'':'s'}`;
 const months=Math.round(diff/4);
 return months<=1?'next month':`in ${months} months`;
}
export const dateOf=(year:number,round:number)=>`${CALENDAR[round].month} ${year}`;
export const monthName=(round:number)=>['January','February','March','April','May','June','July','August','September','October','November','December'][MONTH_OF(round)];
