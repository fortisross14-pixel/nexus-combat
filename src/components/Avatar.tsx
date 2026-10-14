import {useId} from 'react';
import type {Fighter,Style} from '../engine/types';
import {NAME_POOLS,type NamePool} from '../engine/names';
import manifest from '../assets/portraits/manifest.json';

/* ─────────────────────────────────────────────────────────────────────────────
   Fighter portraits, built from a library of illustrated parts.
   Heads, eyes, noses, mouths, hairstyles, facial hair and outfits are separate
   transparent images on one 360×400 canvas (src/assets/portraits). Skin tone,
   hair colour, eye colour and kit colour are applied with SVG colour matrices,
   so each part ships once. Every choice is deterministic per fighter and follows
   their heritage (surname and country).
   ───────────────────────────────────────────────────────────────────────────── */

interface Props {fighter:Fighter;size?:number;className?:string;}
type LayerInfo={x:number;y:number;w:number;h:number;lum?:number};
const LAYERS=manifest.layers as Record<string,LayerInfo>;
const SKIN_REF=manifest.skinRef as [number,number,number];
const URLS=Object.fromEntries(Object.entries(import.meta.glob('../assets/portraits/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>)
 .map(([path,url])=>[path.split('/').pop()!.replace('.webp',''),url]));

const hash=(text:string)=>{let h=2166136261>>>0;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;return h>>>0;};
const pick=(weights:readonly number[],roll:number)=>{const total=weights.reduce((a,b)=>a+b,0);let r=(roll%10007)/10007*total;for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}return weights.length-1;};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
type RGB=[number,number,number];
const mix=(a:RGB,b:RGB,t:number):RGB=>[0,1,2].map(i=>Math.round(a[i]*(1-t)+b[i]*t)) as RGB;

/* ───────────── Palettes ───────────── */
const SKINS:RGB[]=[[247,214,190],[240,196,160],[232,178,135],[222,158,110],[200,138,92],[165,108,72],[125,80,54],[92,60,42]];
const HAIR:RGB[]=[[28,24,26],[58,40,32],[98,64,42],[146,102,62],[204,164,102],[156,72,40]];
const GREY:RGB=[150,148,146];
const IRIS:RGB[]=[[92,58,36],[56,38,28],[70,120,170],[90,122,72]];
const KIT={red:[200,40,50],blue:[40,70,170],navy:[32,44,96],black:[30,30,34],green:[30,120,80],gold:[200,150,40],white:[238,238,242],royal:[44,84,190]} satisfies Record<string,RGB>;

/* ───────────── Heritage ───────────── */
type Family='north'|'west'|'south'|'latin'|'brazil'|'caribbean'|'usa'|'mena'|'southasia'|'eastasia'|'seasia'|'central'|'africa'|'pacific';
const SKIN_W:Record<Family,number[]>={
 north:[3,4,2,1,0,0,0,0],west:[2,4,3,1,.3,0,0,0],south:[1,3,4,2,.6,0,0,0],latin:[.3,1.5,3,3,2,1,.3,0],brazil:[.5,1.5,2,3,2,2,1,.6],caribbean:[0,.3,1,2,2,3,3,2],
 usa:[2,3,2,1.5,1,1.5,1.5,1],mena:[0,.8,2.5,3.5,3,1,0,0],southasia:[0,0,.5,1.5,3,3,2,.5],eastasia:[1.5,4,3,1.5,.5,0,0,0],seasia:[0,.5,1.5,3,3,1.5,0,0],
 central:[.5,2,3,3,1,0,0,0],africa:[0,0,0,0,.4,2,4,4],pacific:[0,0,.5,2,3,2.5,.8,0]};
/** Hair colour weights: black, dark brown, brown, light brown, blond, ginger. */
const DARK=[7,3,.5,0,0,0];
const HAIR_W:Record<Family,number[]>={north:[1,3,3,2,2.5,.8],west:[1.5,3,3,1.5,1.5,.5],south:[3,4,2,.6,.4,.1],latin:[5,4,1,.2,.1,0],brazil:[5,4,1.5,.3,.3,.1],caribbean:DARK,
 usa:[3,3,2,1,1,.4],mena:DARK,southasia:DARK,eastasia:[8,2,0,0,0,0],seasia:DARK,central:DARK,africa:[9,1,0,0,0,0],pacific:DARK};
const IRIS_W:Record<Family,number[]>={north:[2,1,4,2],west:[3,2,2,1.5],south:[4,3,1,1],latin:[5,4,.4,.4],brazil:[5,4,.6,.6],caribbean:[5,5,0,0],usa:[4,3,2,1],mena:[5,5,.3,.5],
 southasia:[5,5,0,0],eastasia:[3,7,0,0],seasia:[4,6,0,0],central:[5,4,.3,.4],africa:[4,6,0,0],pacific:[5,5,0,0]};
/** Hairstyles: 0 curly top fade · 1 big curls · 2 swept quiff · 3 spiky · 4 undercut · 5 buzz · 6 wavy · 7 top knot · 8 shaved. */
const STYLE_W={textured:[18,14,0,0,2,16,0,3,10],general:[3,6,10,12,12,14,10,4,7],straight:[0,0,6,18,16,12,6,6,4]} as const;
/** Facial hair: none · stubble · short beard · full beard · goatee. */
const BEARD_W={young:[20,4,.5,0,.5],light:[22,5,1,.3,1],full:[18,6,3,2,3],heavy:[11,6,5,5,4]} as const;

const POOL_FAMILY:Partial<Record<NamePool,Family>>={russian:'north',slavic:'north',german:'north',nordic:'north',dutch:'north',afrikaans:'north',irish:'north',french:'west',italian:'south',greek:'south',
 arabic:'mena',turkish:'mena',persian:'mena',georgian:'mena',indian:'southasia',japanese:'eastasia',chinese:'eastasia',korean:'eastasia',thai:'seasia',vietnamese:'seasia',indonesian:'seasia',filipino:'seasia',
 kazakh:'central',mongolian:'central',nigerian:'africa',southern:'africa',ghanaian:'africa',westafrican:'africa',eastafrican:'africa',central:'africa',maori:'pacific'};
const COUNTRY_FAMILY:Record<string,Family>={'United States':'usa',Mexico:'latin',Brazil:'brazil',Canada:'west',Argentina:'south',Cuba:'caribbean',Colombia:'latin',Peru:'latin',Venezuela:'latin',Ecuador:'latin',Chile:'latin','Dominican Republic':'caribbean','Puerto Rico':'caribbean','Costa Rica':'latin',Jamaica:'africa',
 England:'north',Spain:'south',Portugal:'south',Australia:'north','New Zealand':'north','South Africa':'africa',Nigeria:'africa',Cameroon:'africa',Ghana:'africa',Senegal:'africa',Mali:'africa',Kenya:'africa',Tanzania:'africa','DR Congo':'africa',Angola:'africa',Mozambique:'africa',
 Morocco:'mena',Egypt:'mena',Algeria:'mena',Tunisia:'mena',Turkey:'mena',Iran:'mena',Lebanon:'mena',Georgia:'mena',India:'southasia',Japan:'eastasia',China:'eastasia','South Korea':'eastasia',Mongolia:'central',Kazakhstan:'central',Thailand:'seasia',Vietnam:'seasia',Philippines:'seasia',Indonesia:'seasia'};
const SURNAMES=(Object.entries(NAME_POOLS) as [NamePool,{last:readonly string[]}][]).flatMap(([pool,p])=>p.last.map(last=>[last,pool] as const)).sort((a,b)=>b[0].length-a[0].length);
export function familyOf(f:Fighter):Family{
 const name=` ${f.name.replace(/ \d+$/,'')}`;
 const pool=SURNAMES.find(([last])=>name.endsWith(` ${last}`))?.[1];
 const byCountry=COUNTRY_FAMILY[f.country];
 // English, Spanish and Portuguese surnames are shared across continents: the country decides.
 if(pool==='english'||pool==='spanish'||pool==='portuguese')return byCountry||(pool==='english'?'north':'south');
 if(pool&&POOL_FAMILY[pool])return POOL_FAMILY[pool]!;
 return byCountry||(f.region==='Africa'?'africa':f.region==='APAC'?'eastasia':'west');
}

/* ───────────── Kit by discipline ───────────── */
type Kit='gi'|'rash'|'tank'|'singlet'|'bare';
function kitOf(style:Style,roll:number):{kit:Kit;color:RGB}{
 const c=(list:RGB[])=>list[roll%list.length];
 switch(style){
  case 'Judo':case 'Brazilian Jiu-Jitsu':return {kit:'gi',color:c([KIT.white,KIT.white,KIT.royal,KIT.black])};
  case 'Karate':case 'Taekwondo':return {kit:'gi',color:KIT.white};
  case 'Sambo':return {kit:'gi',color:c([KIT.red,KIT.royal])};
  case 'Freestyle Wrestling':case 'Greco-Roman Wrestling':return {kit:'singlet',color:c([KIT.navy,KIT.red,KIT.green,KIT.black])};
  case 'MMA Hybrid':return {kit:'rash',color:c([KIT.black,KIT.black,KIT.navy,KIT.red])};
  case 'Sumo':return {kit:'bare',color:KIT.white};
  case 'Muay Thai':return roll%2?{kit:'bare',color:KIT.white}:{kit:'tank',color:c([KIT.red,KIT.blue,KIT.black])};
  default:return {kit:'tank',color:c([KIT.red,KIT.blue,KIT.black,KIT.green,KIT.gold,KIT.white])};
 }
}

interface Look {head:number;eye:number;nose:number;mouth:number;hair:number;beard:number;skin:RGB;hairColor:RGB;iris:RGB;kit:Kit;kitColor:RGB;}
const cache=new Map<string,Look>();
function lookOf(f:Fighter):Look{
 const a=f.appearance;const key=`${f.id}|${f.name}|${f.country}|${f.style}|${f.history?.length??0}`;
 const hit=cache.get(key);if(hit)return hit;
 const r=(part:string)=>hash(`${f.id}:${f.name}:${part}`);
 const fam=familyOf(f);
 const age=f.history?.at(-1)?.age??(f.retiredYear?f.retiredYear-f.birthYear:28);
 let hairColor=HAIR[pick(HAIR_W[fam],r('haircolour'))];
 if(age>=34)hairColor=mix(hairColor,GREY,clamp((age-33)*.08,0,.7));
 const texture=fam==='africa'||fam==='caribbean'?'textured':fam==='eastasia'||fam==='seasia'||fam==='central'?'straight':'general';
 let hair=pick(STYLE_W[texture],r('hairstyle')+(a?.hairStyle??0)*131);
 if(f.style==='Sumo')hair=7;
 if(age>=37&&hair!==7&&r('recede')%3===0)hair=r('older')%2?5:8;
 const beardBand=age<22?'young':fam==='eastasia'||fam==='seasia'?'light':fam==='mena'||fam==='southasia'?'heavy':'full';
 const beard=pick(BEARD_W[beardBand],r('beard')+(a?.facialHair??0)*97);
 const heavy=f.weight>=96;
 const {kit,color}=kitOf(f.style,r('kit'));
 // Expression nudges the mouth: 0 smile line · 1 closed · 2 full lips · 3 grin.
 const mouth=((a?.expression??0)+r('mouth'))%4;
 const look:Look={head:heavy?2:r('head')%3,eye:r('eye')%4,nose:r('nose')%4,mouth,hair,beard:beard-1,
  skin:SKINS[pick(SKIN_W[fam],r('skin'))],hairColor,iris:IRIS[pick(IRIS_W[fam],r('iris'))],kit,kitColor:color};
 cache.set(key,look);if(cache.size>3000)cache.delete(cache.keys().next().value!);
 return look;
}

/* ───────────── Colour matrices ───────────── */
const n=(v:number)=>Number(v.toFixed(4));
/** Multiply skin by tone/reference: shading and line work keep their relative depth. */
const skinMatrix=(c:RGB)=>`${n(c[0]/SKIN_REF[0])} 0 0 0 0 0 ${n(c[1]/SKIN_REF[1])} 0 0 0 0 0 ${n(c[2]/SKIN_REF[2])} 0 0 0 0 0 1 0`;
/** Tint a greyscale luminance layer: lighter colours get gentler contrast so blond never looks metallic. */
function tintMatrix(c:RGB,lum:number){
 const k=.9-.62*((c[0]+c[1]+c[2])/3/255);
 const row=(v:number)=>`${n(v*k/lum)} 0 0 0 ${n(v/255*(1-k))}`;
 return `${row(c[0])} ${row(c[1])} ${row(c[2])} 0 0 0 1 0`;
}

function Layer({name,filter}:{name:string;filter?:string}){
 const L=LAYERS[name],url=URLS[name];if(!L||!url)return null;
 return <image href={url} x={L.x} y={L.y} width={L.w} height={L.h} filter={filter?`url(#${filter})`:undefined} preserveAspectRatio="none"/>;
}

export function Avatar({fighter,size=58,className=''}:Props){
 const uid=`av${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
 const L=lookOf(fighter);
 const accent=['#d5787a','#d7b37a','#70b9c7','#8ea9eb','#a2c49c'][hash(fighter.id)%5];
 const elite=fighter.rarity==='Generational'||fighter.rarity==='Legend'||fighter.rarity==='Epic';
 const kitLayer=L.kit==='bare'?null:`${L.kit}_cloth`;
 const hairName=L.hair<8?`hair${L.hair}`:null,beardName=L.beard>=0?`beard${L.beard}`:null;
 const f=(id:string)=>`${uid}-${id}`;
 const ci='sRGB';
 return <svg className={`avatar ${className}`} width={size} height={size} viewBox="0 0 360 400" role="img" aria-label={`${fighter.name}, ${fighter.style}, illustrated portrait`}>
  <defs>
   <linearGradient id={f('bg')} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#2b4453"/><stop offset=".6" stopColor="#1b2c39"/><stop offset="1" stopColor="#111a26"/></linearGradient>
   <clipPath id={f('card')}><rect width="360" height="400" rx="22"/></clipPath>
   <filter id={f('skin')} colorInterpolationFilters={ci}><feColorMatrix type="matrix" values={skinMatrix(L.skin)}/></filter>
   {hairName&&<filter id={f('hair')} colorInterpolationFilters={ci}><feColorMatrix type="matrix" values={tintMatrix(L.hairColor,LAYERS[hairName].lum??100)}/></filter>}
   {beardName&&<filter id={f('beard')} colorInterpolationFilters={ci}><feColorMatrix type="matrix" values={tintMatrix(L.hairColor,LAYERS[beardName].lum??100)}/></filter>}
   <filter id={f('iris')} colorInterpolationFilters={ci}><feColorMatrix type="matrix" values={tintMatrix(L.iris,LAYERS[`irisL${L.eye}`]?.lum??100)}/></filter>
   {kitLayer&&<filter id={f('kit')} colorInterpolationFilters={ci}><feColorMatrix type="matrix" values={tintMatrix(L.kitColor,LAYERS[kitLayer]?.lum??100)}/></filter>}
  </defs>
  <g clipPath={`url(#${f('card')})`}>
   <rect width="360" height="400" fill={`url(#${f('bg')})`}/>
   <circle cx="180" cy="170" r="150" fill={accent} opacity=".08"/>
   <Layer name={`${L.kit}_skin`} filter={f('skin')}/>
   {kitLayer&&<><Layer name={kitLayer} filter={f('kit')}/><Layer name={`${L.kit}_trim`}/></>}
   <Layer name={`head${L.head}`} filter={f('skin')}/>
   <Layer name={`nose${L.nose}`} filter={f('skin')}/>
   <Layer name={`mouth${L.mouth}`} filter={f('skin')}/>
   <Layer name={`eyeL${L.eye}`}/><Layer name={`irisL${L.eye}`} filter={f('iris')}/>
   <Layer name={`eyeR${L.eye}`}/><Layer name={`irisR${L.eye}`} filter={f('iris')}/>
   {beardName&&<Layer name={beardName} filter={f('beard')}/>}
   {hairName&&<Layer name={hairName} filter={f('hair')}/>}
   {elite&&<path d="M24 36V20H40M320 20H336V36M24 362H108M252 362H336" stroke={accent} strokeWidth="4" strokeOpacity=".6" fill="none"/>}
   <path d="M2 368H358" stroke="#d7e7ea" strokeOpacity=".16" strokeWidth="2"/>
   <rect x="0" y="368" width="360" height="32" fill="#121b25" fillOpacity=".74"/>
   <text x="180" y="390" fontSize="14" fill="#dbe7e8" opacity=".86" textAnchor="middle" letterSpacing="2.2" fontWeight="600">{fighter.nickname.toUpperCase().slice(0,22)}</text>
  </g>
 </svg>;
}
