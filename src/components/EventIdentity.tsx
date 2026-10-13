import type {CSSProperties,ReactNode} from 'react';

/** Visual identity for every recurring event: colours, tagline, wordmark style and an emblem. */
export interface EventIdentity {key:string;title:string;tagline:string;primary:string;secondary:string;ink:string;bg:string;italic?:boolean;tracking:number;}
const ID=(key:string,title:string,tagline:string,primary:string,secondary:string,bg:string,tracking=1,italic=false,ink='#ffffff'):EventIdentity=>({key,title,tagline,primary,secondary,bg,tracking,italic,ink});
export const IDENTITIES:Record<string,EventIdentity>={
 'ORIGIN':ID('ORIGIN','ORIGIN','Where every season begins','#ffb347','#ff6a3d','#2a1206',6),
 'ASCENSION':ID('ASCENSION','ASCENSION','The climb to contention','#3fe0cc','#2a8cff','#062a33',3),
 'FIGHTOPIA':ID('FIGHTOPIA','FIGHTOPIA','The world comes to fight','#3ddc84','#f2c14e','#06251a',2),
 'AFTERSHOCK':ID('AFTERSHOCK','AFTERSHOCK','You feel it after the bell','#b07cff','#ff5fd2','#170b2e',1,true),
 'FRONTIER':ID('FRONTIER','FRONTIER','New ground. New names.','#8fd16a','#e3c48a','#13200d',4),
 'FAULTLINE':ID('FAULTLINE','FAULTLINE','Where empires crack','#ff4d5e','#ffb199','#26070c',2,true),
 'THE SURGE':ID('THE SURGE','THE SURGE','Twenty enter. One remains.','#3fa9ff','#ffe14d','#061733',1,true),
 'HORIZON':ID('HORIZON','HORIZON','Look further','#ff8a65','#9c6bff','#1f0f2e',8),
 'COLLISION':ID('COLLISION','COLLISION','Two forces. One outcome.','#ff5252','#4d8dff','#110c1e',2,true),
 'EQUINOX':ID('EQUINOX','EQUINOX','Balance breaks tonight','#dfe6ea','#7b86ff','#0f1330',7),
 'THE CRUCIBLE':ID('THE CRUCIBLE','THE CRUCIBLE','Forged under pressure','#ff7a1a','#ffcf5a','#250b00',2),
 'THE PINNACLE':ID('THE PINNACLE','THE PINNACLE','The summit of the sport','#ffd34d','#fff3c4','#0b0a07',5,false,'#fff7dc'),
 'WORLD COMBAT OLYMPIAD':ID('WORLD COMBAT OLYMPIAD','OLYMPIAD','Every four years, the world','#5b84ff','#ffd34d','#08133d',4),
 'CONTINENTAL':ID('CONTINENTAL','CONTINENTAL NIGHT','Four belts. One night.','#5fb3d9','#c9e9f7','#082031',3),
 'CIRCUIT':ID('CIRCUIT','CIRCUIT NIGHT','The weekly grind','#81e6c8','#5aa7c7','#0a1c29',2),
};
export function identityFor(name:string|undefined|null,continental=false):EventIdentity{
 if(continental)return IDENTITIES.CONTINENTAL;
 if(!name)return IDENTITIES.CIRCUIT;
 return IDENTITIES[name]||(name.startsWith('CIRCUIT')?IDENTITIES.CIRCUIT:IDENTITIES.CIRCUIT);
}
/** CSS custom properties for themed containers. */
export const identityStyle=(id:EventIdentity):CSSProperties=>({'--ev-primary':id.primary,'--ev-secondary':id.secondary,'--ev-bg':id.bg,'--ev-ink':id.ink} as CSSProperties);

/** Emblem artwork per event, drawn on a 64×64 grid. */
function Emblem({id}:{id:EventIdentity}):ReactNode{
 const p=id.primary,s=id.secondary;
 switch(id.key){
  case 'ORIGIN':return <><path d="M10 42h44" stroke={s} strokeWidth="3" strokeLinecap="round"/><path d="M18 42a14 14 0 0 1 28 0" fill={p}/>{[-60,-30,0,30,60].map(a=><line key={a} x1="32" y1="22" x2="32" y2="12" stroke={p} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 32 42)`}/>)}<path d="M16 49h32M22 55h20" stroke={s} strokeWidth="2.5" strokeLinecap="round" opacity=".7"/></>;
  case 'ASCENSION':return <>{[0,1,2].map(i=><path key={i} d={`M14 ${46-i*12}l18-14 18 14`} fill="none" stroke={i===2?s:p} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={1-i*.18}/>)}</>;
  case 'FIGHTOPIA':return <><circle cx="32" cy="32" r="20" fill="none" stroke={p} strokeWidth="3.5"/><ellipse cx="32" cy="32" rx="9" ry="20" fill="none" stroke={p} strokeWidth="2.5"/><path d="M12 32h40M16 22h32M16 42h32" stroke={p} strokeWidth="2" opacity=".75"/><path d="M32 4l3.2 6.6 7.2 1-5.2 5 1.3 7.1L32 20.4l-6.5 3.3 1.3-7.1-5.2-5 7.2-1z" fill={s}/></>;
  case 'AFTERSHOCK':return <><circle cx="32" cy="32" r="24" fill="none" stroke={p} strokeWidth="2.5" opacity=".55"/><path d="M8 34h10l4-12 6 24 5-30 6 26 4-10h13" fill="none" stroke={s} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/></>;
  case 'FRONTIER':return <><path d="M6 50l16-24 9 12 9-18 18 30z" fill={p}/><path d="M22 26l-4 6h8zM40 20l-4 7h8z" fill={s}/><path d="M40 20V8" stroke={s} strokeWidth="2.5"/><path d="M40 8l10 3-10 3z" fill={s}/></>;
  case 'FAULTLINE':return <><path d="M32 6l22 13v26L32 58 10 45V19z" fill="none" stroke={p} strokeWidth="3.5" strokeLinejoin="round"/><path d="M34 8l-8 14 9 6-10 12 8 6-4 10" fill="none" stroke={s} strokeWidth="3" strokeLinejoin="round"/></>;
  case 'THE SURGE':return <><path d="M6 44c8-8 14 8 22 0s14 8 22 0 8-4 8-4" fill="none" stroke={p} strokeWidth="3.5" strokeLinecap="round"/><path d="M36 6L20 34h11l-5 22 18-30H33z" fill={s} stroke={id.bg} strokeWidth="1.5" strokeLinejoin="round"/></>;
  case 'HORIZON':return <><circle cx="32" cy="36" r="14" fill={p}/><rect x="6" y="36" width="52" height="22" fill={id.bg}/><path d="M6 36h52" stroke={s} strokeWidth="3"/>{[42,47,52].map((y,i)=><path key={y} d={`M${12+i*5} ${y}h${40-i*10}`} stroke={p} strokeWidth="2.5" strokeLinecap="round" opacity={.8-i*.2}/>)}</>;
  case 'COLLISION':return <><path d="M4 32h18l-8-10M4 32h18l-8 10" fill="none" stroke={p} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M60 32H42l8-10M60 32H42l8 10" fill="none" stroke={s} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 18l3 9 9-3-6 8 6 8-9-3-3 9-3-9-9 3 6-8-6-8 9 3z" fill="#fff"/></>;
  case 'EQUINOX':return <><circle cx="32" cy="32" r="22" fill={s}/><path d="M32 10a22 22 0 0 1 0 44z" fill={p}/><circle cx="32" cy="32" r="22" fill="none" stroke={p} strokeWidth="2.5"/><path d="M32 4v6M32 54v6" stroke={p} strokeWidth="2.5"/></>;
  case 'THE CRUCIBLE':return <><path d="M14 30h36l-5 18a6 6 0 0 1-6 4H25a6 6 0 0 1-6-4z" fill={p}/><path d="M22 56h20" stroke={p} strokeWidth="3" strokeLinecap="round"/><path d="M32 6c6 7 9 11 5 18 4-2 5-5 5-5 2 7-3 11-10 11s-11-5-9-11c1-3 3-4 3-4 0 4 2 5 4 5-4-6 0-10 2-14z" fill={s}/></>;
  case 'THE PINNACLE':return <><path d="M4 56L32 18l28 38z" fill="none" stroke={p} strokeWidth="3.5" strokeLinejoin="round"/><path d="M20 20l4-12 8 8 8-8 4 12z" fill={s} stroke={p} strokeWidth="2" strokeLinejoin="round"/><path d="M24 44l8-11 8 11" fill="none" stroke={p} strokeWidth="2.5" opacity=".7"/></>;
  case 'WORLD COMBAT OLYMPIAD':return <>{[-1,1].map(side=><g key={side} transform={side<0?'':'translate(64 0) scale(-1 1)'}>{[0,1,2,3,4].map(i=><ellipse key={i} cx={14+i*1.2} cy={46-i*8} rx="4.5" ry="2.4" fill={s} transform={`rotate(${-40+i*12} ${14+i*1.2} ${46-i*8})`}/>)}<path d="M20 54C8 44 8 24 18 12" fill="none" stroke={s} strokeWidth="2"/></g>)}<path d="M32 18l4 8.5 9.3 1.3-6.8 6.5 1.6 9.2L32 39l-8.3 4.5 1.6-9.2-6.8-6.5 9.3-1.3z" fill={p}/></>;
  case 'CONTINENTAL':return <><path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="none" stroke={p} strokeWidth="3.5" strokeLinejoin="round"/><path d="M32 8v50M11 30h42" stroke={p} strokeWidth="2.5"/><circle cx="22" cy="20" r="3.2" fill={s}/><circle cx="42" cy="20" r="3.2" fill={s}/><circle cx="22" cy="40" r="3.2" fill={s}/><circle cx="42" cy="40" r="3.2" fill={s}/></>;
  default:return <><path d="M32 8l20 12v24L32 56 12 44V20z" fill="none" stroke={p} strokeWidth="3.5" strokeLinejoin="round"/><circle cx="32" cy="32" r="8" fill="none" stroke={s} strokeWidth="3"/></>;
 }
}
/** Round badge with the event's emblem. */
export function EventLogo({id,size=44,title}:{id:EventIdentity;size?:number;title?:string}){
 return <svg className="event-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title||`${id.title} emblem`}>
  <circle cx="32" cy="32" r="31" fill={id.bg} stroke={id.primary} strokeOpacity=".55" strokeWidth="1.5"/>
  <g transform="translate(6.4 6.4) scale(.8)"><Emblem id={id}/></g>
 </svg>;
}
/** Event name set in the event's own wordmark style. */
export function EventWordmark({id,children,className=''}:{id:EventIdentity;children?:ReactNode;className?:string}){
 return <span className={`event-wordmark ${className}`} style={{letterSpacing:`${id.tracking/22}em`,fontStyle:id.italic?'italic':'normal',background:`linear-gradient(90deg,${id.ink},${id.primary} 55%,${id.secondary})`,WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>{children??id.title}</span>;
}
