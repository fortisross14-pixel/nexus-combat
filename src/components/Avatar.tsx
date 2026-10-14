import {useId} from 'react';
import type {Fighter, Style} from '../engine/types';

const spriteAtlasUrl = new URL('../assets/portrait-sprites-v2.svg', import.meta.url).href;

interface Props {fighter:Fighter;size?:number;className?:string;}

type RaceKey='asian'|'lightbrown'|'black'|'darkbrown'|'white';

const BODY_BY_STYLE:Record<Style,number>={
  Boxing:4,
  Kickboxing:0,
  'Muay Thai':4,
  Karate:3,
  Taekwondo:3,
  'Freestyle Wrestling':2,
  'Greco-Roman Wrestling':2,
  Judo:3,
  'Brazilian Jiu-Jitsu':3,
  Sambo:2,
  Sumo:4,
  'MMA Hybrid':1,
};
const HAIR_COLORS=['#17181f','#3c2920','#815732','#bc9657'];
const EMBLEMS=['#c96f78','#c6a163','#67a8b5','#7799d0','#a8bb8a'];

const absInt=(n:number|undefined,fallback=0)=>Number.isFinite(n)?Math.abs(Math.trunc(n!)):fallback;
const mod=(n:number,m:number)=>((n%m)+m)%m;
const hash=(str:string,seed=2166136261)=>{
  let h=seed>>>0;
  for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619)>>>0;
  return h>>>0;
};

function pickRace(fighter:Fighter):RaceKey{
  const s=absInt(fighter.appearance?.skin);
  const h=hash(`${fighter.id}:${fighter.region}:${fighter.country}`)%100;
  switch(fighter.region){
    case 'APAC': return (['asian','asian','lightbrown','darkbrown','white'] as RaceKey[])[(s+h)%5];
    case 'Africa': return (['black','darkbrown','black','lightbrown','darkbrown'] as RaceKey[])[(s+h)%5];
    case 'Europe & Middle East': return (['white','lightbrown','darkbrown','white','lightbrown'] as RaceKey[])[(s+h)%5];
    case 'Americas': default: return (['white','lightbrown','black','darkbrown','asian'] as RaceKey[])[(s+h)%5];
  }
}

export function Avatar({fighter,size=58,className=''}:Props){
  const id=useId().replace(/:/g,'');
  const race=pickRace(fighter);
  const appearance=fighter.appearance;
  const signature=hash(fighter.id);
  const face=mod(absInt(appearance?.face)+mod(signature,4),4);
  const ears=mod(absInt(appearance?.expression)+mod(signature,2),2);
  const hair=mod(absInt(appearance?.hairStyle)*4 + mod(hash(`${fighter.id}:hairset`),4),40);
  const hairColor=HAIR_COLORS[mod(absInt(appearance?.hair)+mod(signature,4),HAIR_COLORS.length)];
  const eyes=mod(absInt(appearance?.expression)*3 + mod(hash(`${fighter.id}:eyes`),12),12);
  const brows=mod(absInt(appearance?.face)*2 + mod(hash(`${fighter.id}:brows`),12),12);
  const nose=mod(absInt(appearance?.face)+mod(hash(`${fighter.id}:nose`),3),3);
  const mouth=mod(absInt(appearance?.expression)*2 + mod(hash(`${fighter.id}:mouth`),5),5);
  const beard=mod(absInt(appearance?.facialHair)+mod(hash(`${fighter.id}:beard`),12),12);
  const accessoryBase=appearance?.scar ? 2 + mod(signature,2) : (appearance?.accessory===2 ? 0 : appearance?.accessory===3 ? 1 : appearance?.accessory===4 ? 4 : -1);
  const emblem=EMBLEMS[mod(signature,EMBLEMS.length)];
  const elite=fighter.rarity==='Generational'||fighter.rarity==='Legend'||fighter.rarity==='Epic';
  const body=BODY_BY_STYLE[fighter.style];
  const ref=(key:string)=>`${spriteAtlasUrl}#${key}`;
  const useLayer=(key:string, extra?:{style?:{color?:string}})=><use key={key} href={ref(key)} width="180" height="200" {...extra}/>;

  return <svg className={`avatar ${className}`} width={size} height={size} viewBox="0 0 180 200" role="img" aria-label={`${fighter.name} portrait`}>
    <defs>
      <linearGradient id={`portrait-bg-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#293e4c"/><stop offset=".52" stopColor="#1a2b37"/><stop offset="1" stopColor="#101824"/>
      </linearGradient>
      <clipPath id={`portrait-clip-${id}`}><rect width="180" height="200" rx="11"/></clipPath>
    </defs>
    <g clipPath={`url(#portrait-clip-${id})`}>
      <rect width="180" height="200" fill={`url(#portrait-bg-${id})`}/>
      <path d="M-8 178L123 -4M42 208L198 62" stroke={emblem} strokeOpacity=".08" strokeWidth="7"/>
      <circle cx="90" cy="85" r="67" fill="none" stroke="#8fb9bf" strokeOpacity=".11" strokeWidth="1.2"/>
      {useLayer(`body-${race}-${body}`)}
      {useLayer(`head-${race}-${face}`)}
      {useLayer(`ears-${race}-${ears}`)}
      {useLayer(`eyes-${eyes}`)}
      {useLayer(`brows-${brows}`,{style:{color:hairColor}})}
      {useLayer(`nose-${race}-${nose}`)}
      {useLayer(`mouth-${race}-${mouth}`)}
      {beard!==0 && useLayer(`beard-${beard}`,{style:{color:hairColor}})}
      {useLayer(`hair-${hair}`,{style:{color:hairColor}})}
      {accessoryBase>=0 && useLayer(`accessory-${accessoryBase}`)}
      <ellipse cx="90" cy="104" rx="32" ry="43" fill="#08121a" opacity=".04"/>
      {elite&&<><path d="M12 18V10H20M160 10H168V18M12 182H54M126 182H168" stroke={emblem} strokeWidth="2" strokeOpacity=".55" fill="none"/></>}
      <path d="M1 184H179" stroke="#d7e7ea" strokeOpacity=".16"/>
      <rect x="0" y="184" width="180" height="16" fill="#121b25" fillOpacity=".68"/>
      <text x="90" y="195" fontSize="6.9" fill="#dbe7e8" opacity=".84" textAnchor="middle" letterSpacing="1.1" fontWeight="600">{fighter.nickname.toUpperCase().slice(0,20)}</text>
    </g>
  </svg>;
}
