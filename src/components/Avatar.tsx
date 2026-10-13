import {useId} from 'react';
import spriteAtlasUrl from '../assets/portrait-sprites.svg?url';
import type {Fighter, Style} from '../engine/types';

interface Props {fighter:Fighter;size?:number;className?:string;}

/** The portrait library contains independent, transparent, hand-illustrated sprites.
 * Each layer is referenced from the same SVG asset, cached across all fighter cards.
 * Saved ProfileAppearance values are unchanged: existing saves retain their faces.
 */
const outfits:Record<Style,number>={
  Boxing:0, Kickboxing:1, 'Muay Thai':2, Karate:3, Taekwondo:4,
  'Freestyle Wrestling':5, 'Greco-Roman Wrestling':6, Judo:7,
  'Brazilian Jiu-Jitsu':8, Sambo:9, Sumo:10, 'MMA Hybrid':11
};
const palette=['#b75b6e','#c7a464','#6cadbb','#789cd6','#a6bc8b'];
const number=(n:number|undefined,fallback=0)=>Number.isFinite(n)?Math.abs(Math.trunc(n!)):fallback;
const hash=(str:string,seed=2166136261)=>{
  let h=seed>>>0;
  for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),16777619)>>>0;}
  return h>>>0;
};

export function Avatar({fighter,size=58,className=''}:Props){
  const id=useId().replace(/:/g,'');
  const a=fighter.appearance;
  const identity=hash(fighter.id);
  const face=number(a?.face)%6;
  const skin=number(a?.skin)%8;
  const tone=number(a?.hair)%7;
  // Respect the saved hair and face identity, then use a second deterministic
  // variation to expand the original ten hairstyles into twenty illustrated sets.
  const hair=number(a?.hairStyle)%10+(hash(`${fighter.id}:hair`)%2)*10;
  const eye=(number(a?.face)*2+hash(`${fighter.id}:eyes`)%3)%12;
  const iris=hash(`${fighter.id}:iris`)%5;
  const brow=(number(a?.expression)*3+hash(`${fighter.id}:brow`)%3)%12;
  const nose=(number(a?.face)+hash(`${fighter.id}:nose`)%4)%8;
  const mouth=(number(a?.expression)*3+hash(`${fighter.id}:mouth`)%3)%12;
  const beard=(number(a?.facialHair)+(hash(`${fighter.id}:beard`)%2)*4)%10;
  const detail=a?.scar?1+(identity%2):(number(a?.accessory)===2?3:number(a?.accessory)===3?4:0);
  const emblem=palette[identity%palette.length];
  const elite=fighter.rarity==='Generational'||fighter.rarity==='Legend'||fighter.rarity==='Epic';
  const reference=(name:string)=>`${spriteAtlasUrl}#${name}`;
  const layer=(key:string)=> <use key={key} href={reference(key)} width="180" height="200"/>;

  return <svg className={`avatar ${className}`} width={size} height={size} viewBox="0 0 180 200" role="img" aria-label={`${fighter.name}, ${fighter.style}, layered illustrated portrait`}>
    <defs>
      <linearGradient id={`portrait-bg-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#253743"/><stop offset=".55" stopColor="#1a2b37"/><stop offset="1" stopColor="#111925"/>
      </linearGradient>
      <clipPath id={`portrait-clip-${id}`}><rect width="180" height="200" rx="11"/></clipPath>
    </defs>
    <g clipPath={`url(#portrait-clip-${id})`}>
      <rect width="180" height="200" fill={`url(#portrait-bg-${id})`}/>
      <circle cx="90" cy="84" r="68" fill="none" stroke="#9ec4ca" strokeOpacity=".1" strokeWidth="1.2"/>
      <path d="M-10 174L130 0M24 210L200 12" stroke={emblem} strokeOpacity=".08" strokeWidth="7"/>
      {layer(`outfit-${outfits[fighter.style]}-${skin}`)}
      {layer(`head-${face}-${skin}`)}
      {layer(`eyes-${eye}-${iris}`)}
      {layer(`brows-${brow}-${tone}`)}
      {layer(`nose-${nose}-${skin}`)}
      {layer(`beard-${beard}-${tone}`)}
      {layer(`mouth-${mouth}-${skin}`)}
      {layer(`hair-${hair}-${tone}`)}
      {detail>0&&layer(`detail-${detail}`)}
      {elite&&<><path d="M12 181H55M125 181H168" stroke={emblem} strokeWidth="2" strokeOpacity=".5"/><path d="M12 20V11H21M159 11H168V20" stroke={emblem} strokeWidth="2" strokeOpacity=".54" fill="none"/></>}
      <path d="M1 184H179" stroke="#c9e5ed" strokeOpacity=".16"/>
      <rect x="0" y="184" width="180" height="16" fill="#121b25" fillOpacity=".68"/>
      <text x="90" y="195" fontSize="6.9" fill="#dbe7e8" opacity=".84" textAnchor="middle" letterSpacing="1.1" fontWeight="600">{fighter.nickname.toUpperCase().slice(0,20)}</text>
    </g>
  </svg>;
}
