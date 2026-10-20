import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';

const DIGITS='0123456789';
const reduced=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A lit board numeral (Doto dot-matrix). When its value changes while on screen,
 * the digits roll through the board and settle left to right, like an arena board relighting.
 * Screen readers get the final value only.
 */
export function BoardNum({value,size='m',tone,className='',style}:{value:string|number;size?:'s'|'m'|'l'|'xl';tone?:'amber'|'win'|'loss'|'title'|'dim';className?:string;style?:CSSProperties}){
 const text=String(value);
 const [shown,setShown]=useState(text);
 const last=useRef(text);
 useEffect(()=>{
  if(last.current===text)return;
  last.current=text;
  if(reduced()){setShown(text);return;}
  let frame=0;
  const settleAt=(i:number)=>4+i*2;
  const end=settleAt(text.length);
  const timer=window.setInterval(()=>{
   frame++;
   if(frame>=end){setShown(text);window.clearInterval(timer);return;}
   setShown(text.split('').map((c,i)=>/\d/.test(c)&&frame<settleAt(i)?DIGITS[Math.floor(Math.random()*10)]:c).join(''));
  },42);
  return()=>window.clearInterval(timer);
 },[text]);
 return <span className={`bn bn-${size} ${tone?`bn-${tone}`:''} ${className}`} style={style}><span className="sr-only">{text}</span><span aria-hidden="true">{shown}</span></span>;
}

/** A small status lamp. The colour carries one meaning each: next, win, loss, title. */
export function Lamp({tone,label}:{tone:'amber'|'win'|'loss'|'title'|'off';label?:string}){
 return <i className={`lamp lamp-${tone}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}/>;
}

/** Module header strip: the module's name, and an optional catalog code or action on the right. */
export function ModuleHead({title,code,end,as:Tag='h2',id}:{title:ReactNode;code?:ReactNode;end?:ReactNode;as?:'h2'|'h3';id?:string}){
 return <header className="bd-head"><Tag id={id}>{title}</Tag>{code&&<span className="bd-code">{code}</span>}{end&&<span className="bd-end">{end}</span>}</header>;
}

/** Segmented lamp meter (0-100) used for abilities and condition. */
export function Meter({value,segments=20,tone,label}:{value:number;segments?:number;tone?:'win'|'loss'|'amber';label:string}){
 const lit=Math.round(Math.max(0,Math.min(100,value))/100*segments);
 return <span className={`meter ${tone?`meter-${tone}`:''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
  {Array.from({length:segments},(_,i)=><i key={i} className={i<lit?'on':''}/>)}
 </span>;
}
