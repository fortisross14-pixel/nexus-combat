import {expect} from 'vitest';
declare const process:{env:Record<string,string|undefined>};
export const env=(key:string,fallback:number)=>Number(process.env[key]||fallback);
export const pct=(a:number,b:number)=>100*a/Math.max(1,b);
export const fmt=(x:number)=>x.toFixed(1);
/** Collects report lines and soft-fails at the end, so one run shows every metric. */
export class Report{
 lines:string[]=[];failures:string[]=[];
 line(text:string){this.lines.push(text);}
 check(label:string,value:number,min:number,max:number,unit='%'){
  const ok=value>=min&&value<=max;this.lines.push(`${ok?'✓':'✗'} ${label}: ${fmt(value)}${unit}  (target ${min}–${max}${unit})`);
  if(!ok)this.failures.push(label);
 }
 finish(){console.log(this.lines.join('\n'));expect(this.failures,`Out of target: ${this.failures.join(', ')}`).toEqual([]);}
}
