import {useEffect,useRef} from 'react';

/** Open dialogs, newest last. Only the top one answers Escape and Tab. */
const stack:HTMLElement[]=[];
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const visible=(e:HTMLElement)=>e.offsetParent!==null||getComputedStyle(e).position==='fixed';

/**
 * Modal behaviour for a dialog element: moves focus inside on open, keeps Tab inside,
 * closes on Escape (topmost dialog only) and returns focus to the opener on close.
 */
export function useDialog<T extends HTMLElement=HTMLElement>(onClose?:()=>void){
 const ref=useRef<T>(null);
 const close=useRef(onClose);close.current=onClose;
 // Read during the first render, before React's autoFocus can move focus into the dialog.
 const openerRef=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement as HTMLElement|null);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const opener=openerRef.current;
  stack.push(node);
  if(!node.hasAttribute('tabindex'))node.setAttribute('tabindex','-1');
  const preferred=node.querySelector<HTMLElement>('[data-autofocus]');
  if(preferred)preferred.focus({preventScroll:true});
  else if(!node.contains(document.activeElement))node.focus({preventScroll:true});
  const onKey=(event:KeyboardEvent)=>{
   if(stack[stack.length-1]!==node)return;
   if(event.key==='Escape'&&close.current){event.preventDefault();close.current();return;}
   if(event.key!=='Tab')return;
   const items=[...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
   if(!items.length){event.preventDefault();node.focus();return;}
   const first=items[0],last=items[items.length-1],active=document.activeElement;
   if(event.shiftKey&&(active===first||active===node||!node.contains(active))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(active===last||!node.contains(active))){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',onKey);
  return()=>{
   document.removeEventListener('keydown',onKey);
   const i=stack.lastIndexOf(node);if(i>=0)stack.splice(i,1);
   if(opener&&opener.isConnected)opener.focus({preventScroll:true});
  };
 },[]);
 return ref;
}
