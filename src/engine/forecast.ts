import {simulateCombat} from './combat';
import {Random} from './random';
import {clamp} from './career';
import {STAT} from './combat';
import type {Fighter,LedgerEntry,World} from './types';
import {fighterLedger} from './archive';

export interface MethodSplit {ko:number;sub:number;dec:number;}
export interface Forecast {winA:number;winB:number;draw:number;a:MethodSplit;b:MethodSplit;samples:number;}
/** Fight chances from simulated "what-if" bouts on a private random stream.
    Never touches the world RNG, so it can never change or reveal the official result. */
export function forecastBout(a:Fighter,b:Fighter,year:number,rounds:2|3|5=3,samples=300):Forecast{
 let seed=year*7919;for(const ch of a.id+b.id)seed=(seed*31+ch.charCodeAt(0))|0;
 const rng=new Random(seed||1);
 const out={winA:0,winB:0,draw:0,a:{ko:0,sub:0,dec:0},b:{ko:0,sub:0,dec:0}};
 for(let i=0;i<samples;i++){
  const r=simulateCombat(a,b,year,rng,rounds);
  if(!r.winnerId){out.draw++;continue;}
  const side=r.winnerId===a.id?out.a:out.b;if(r.winnerId===a.id)out.winA++;else out.winB++;
  if(r.method==='KO'||r.method==='TKO')side.ko++;else if(r.method==='SUB')side.sub++;else side.dec++;
 }
 const p=(n:number)=>n/samples;
 return {winA:p(out.winA),winB:p(out.winB),draw:p(out.draw),a:{ko:p(out.a.ko),sub:p(out.a.sub),dec:p(out.a.dec)},b:{ko:p(out.b.ko),sub:p(out.b.sub),dec:p(out.b.dec)},samples};
}

export interface TapeStats {fights:number;sigPerMin:number;sigAccuracy:number;damageTakenPerFight:number;tdPer15:number;tdAccuracy:number;tdDefense:number;kdPerFight:number;subPerFight:number;avgMinutes:number;}
/** Per-fight career averages from the lifetime totals kept on each fighter. */
export function tapeStats(f:Fighter):TapeStats|null{
 const c=f.career;if(!c||!c.fights)return null;
 const minutes=Math.max(1,c.seconds/60);
 return {fights:c.fights,sigPerMin:c.s[STAT.SIGL]/minutes,sigAccuracy:c.s[STAT.SIG]?c.s[STAT.SIGL]/c.s[STAT.SIG]:0,damageTakenPerFight:c.dmgTaken/c.fights,
  tdPer15:c.s[STAT.TDL]/minutes*15,tdAccuracy:c.s[STAT.TD]?c.s[STAT.TDL]/c.s[STAT.TD]:0,tdDefense:c.oppTd?clamp(1-c.oppTdLanded/c.oppTd,0,1):1,
  kdPerFight:c.s[STAT.KD]/c.fights,subPerFight:c.s[STAT.SUBA]/c.fights,avgMinutes:minutes/c.fights};
}
/** Last circuit results, newest first: W / L / D with method. */
export function recentResults(w:World,id:string,count=5){
 return fighterLedger(w,id).filter(e=>!e.t).slice(0,count).map(e=>({entry:e,result:e.w===null?'D':e.w===id?'W':'L' as 'W'|'L'|'D'}));
}
export function headToHead(w:World,a:string,b:string):LedgerEntry[]{return fighterLedger(w,a).filter(e=>e.a===b||e.b===b);}
export function finishRates(f:Fighter){const r=f.record,wins=Math.max(1,r.wins);return {ko:r.kos/wins,sub:r.submissions/wins,dec:r.decisions/wins};}
