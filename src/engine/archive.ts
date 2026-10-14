import {CALENDAR} from './competition';
import {STAT_LENGTH} from './combat';
import type {CareerStats,Fight,Fighter,LedgerEntry,StatLine,World} from './types';
import {isTopBelt} from './belts';

/** Bit flags on ledger entries. */
export const LF={TITLE:1,CHANGE:2,UPSET:4,KEY:8,CLOSE:16,INTERIM:32,ELIMINATOR:64,PINNACLE:128,CONTRACT:256} as const;
/** A world-level title bout: a brand title (NOVA, ONYX) or the pre-split World Crown; title, interim or unification. */
export const isWorldTitle=(e:LedgerEntry)=>!!(e.f&LF.TITLE)&&(!e.bt||isTopBelt(e.bt));
export const isPinnacleBout=(e:LedgerEntry)=>!!(e.f&LF.PINNACLE);

export function toLedger(f:Fight):LedgerEntry{
 const flags=(f.titleFight?LF.TITLE:0)|(f.titleChange?LF.CHANGE:0)|(f.underdogVictory?LF.UPSET:0)|(f.method==='SD'||f.method==='MD'||f.method==='DRAW'?LF.CLOSE:0)|(f.kind==='interim'||f.kind==='unification'?LF.INTERIM:0)|(f.kind==='eliminator'?LF.ELIMINATOR:0)|(f.kind==='pinnacle'?LF.PINNACLE:0)|(f.kind==='contract'?LF.CONTRACT:0);
 const e:LedgerEntry={i:f.id,y:f.year,e:f.roundIndex,d:f.division,a:f.fighterA,b:f.fighterB,w:f.winnerId,m:f.method,r:f.finishRound,o:Math.round(f.oddsA*1000)/1000,f:flags};
 if(f.tournamentId){e.t=f.tournamentId;e.s=f.tournamentStage;}
 if(f.titleFight)e.bt=f.belt||'WORLD';
 return e;
}
/** Record a freshly resolved bout in the current season and the permanent ledger. */
export function recordFight(w:World,f:Fight){
 w.fights.push(f);w.lastFightIds.push(f.id);
 (w.ledger[f.year]??=[]).push(toLedger(f));
}
const years=(w:World)=>Object.keys(w.ledger).map(Number).sort((a,b)=>a-b);
/** Every ledger entry, oldest first. */
export function forEachLedger(w:World,fn:(e:LedgerEntry)=>void){for(const y of years(w))for(const e of w.ledger[y])fn(e);}
export function ledgerCount(w:World){let n=0;for(const y of years(w))n+=w.ledger[y].length;return n;}
export function ledgerFor(w:World,predicate:(e:LedgerEntry)=>boolean):LedgerEntry[]{const out:LedgerEntry[]=[];forEachLedger(w,e=>{if(predicate(e))out.push(e);});return out;}
const idNumber=(id:string)=>Number(id.slice(3));
export function findLedger(w:World,id:string):LedgerEntry|undefined{
 if(!id.startsWith('bt-'))return undefined;const n=idNumber(id);
 for(const y of years(w)){const list=w.ledger[y];if(!list.length)continue;
  if(n<idNumber(list[0].i)||n>idNumber(list[list.length-1].i))continue;
  let lo=0,hi=list.length-1;while(lo<=hi){const mid=(lo+hi)>>1,v=idNumber(list[mid].i);if(v===n)return list[mid];if(v<n)lo=mid+1;else hi=mid-1;}
 }
 return undefined;
}
export function eventNameOf(e:{e:number;t?:string}){return e.t&&!e.t.startsWith('tag')&&!e.t.startsWith('supremacy')?(e.t.startsWith('crucible')?'THE CRUCIBLE':e.t.startsWith('olympiad')?'WORLD COMBAT OLYMPIAD':'THE SURGE'):CALENDAR[e.e-1]?.name||'CIRCUIT';}
const methodText=(m:LedgerEntry['m'])=>m==='SUB'?'submission':m==='KO'?'knockout':m==='TKO'?'technical knockout':m==='UD'?'unanimous decision':m==='SD'?'split decision':m==='MD'?'majority decision':'draw';
export function headlineOf(w:World,e:LedgerEntry){
 const name=(id:string)=>w.fighters.find(f=>f.id===id)?.name||'Unknown';
 if(!e.w)return `${name(e.a)} and ${name(e.b)} fight to a draw`;
 return `${name(e.w)} def. ${name(e.w===e.a?e.b:e.a)} · ${methodText(e.m)}, R${e.r}`;
}
/** A display-ready Fight built from a ledger row, used once detailed data has been archived. */
export function expandLedger(w:World,e:LedgerEntry):Fight{
 return {id:e.i,year:e.y,roundIndex:e.e,division:e.d,fighterA:e.a,fighterB:e.b,winnerId:e.w,method:e.m,finishRound:e.r,finishTime:'',rounds:[],
  rankBeforeA:0,rankBeforeB:0,rankAfterA:0,rankAfterB:0,overallBeforeA:0,overallBeforeB:0,oddsA:e.o,ratingDeltaA:0,ratingDeltaB:0,shapeDeltaA:0,shapeDeltaB:0,conditionDeltaA:0,conditionDeltaB:0,
  injuredIds:[],underdogVictory:!!(e.f&LF.UPSET),headline:headlineOf(w,e),eventName:eventNameOf(e),titleFight:!!(e.f&LF.TITLE),titleChange:!!(e.f&LF.CHANGE),belt:e.bt,kind:e.f&LF.PINNACLE?'pinnacle':e.f&LF.CONTRACT?'contract':e.f&LF.ELIMINATOR?'eliminator':e.f&LF.INTERIM?'interim':e.f&LF.TITLE?'title':undefined,tournamentId:e.t,tournamentStage:e.s,archived:true};
}
/** Best available version of a fight: full detail this season, key-fight detail, or the ledger summary. */
export function getFight(w:World,id:string|null|undefined):Fight|undefined{
 if(!id)return undefined;
 for(let i=w.fights.length-1;i>=0;i--)if(w.fights[i].id===id)return w.fights[i];
 const e=findLedger(w,id);if(!e)return undefined;
 const key=w.keyFights[e.y]?.find(f=>f.id===id);
 return key||expandLedger(w,e);
}
/** All bouts of one fighter (summaries), newest first. */
export function fighterLedger(w:World,id:string){return ledgerFor(w,e=>e.a===id||e.b===id).reverse();}

/* ───────────── Season close: keep only what history needs ───────────── */
const KEY_STAGES=new Set(['Semifinal','Final']);
export function closeSeasonArchive(w:World,year:number,extraKeyIds:Iterable<string>){
 const keep=new Set(extraKeyIds);
 for(const f of w.fights)if(f.year===year&&(f.titleFight||f.kind==='pinnacle'||f.kind==='contract'||f.tournamentStage&&(KEY_STAGES.has(f.tournamentStage)||f.tournamentStage.startsWith('Doubles Crown'))))keep.add(f.id);
 w.keyFights={...w.keyFights,[year]:w.fights.filter(f=>f.year===year&&keep.has(f.id)).map(stripTimeline)};
 if(w.ledger[year])w.ledger={...w.ledger,[year]:w.ledger[year].map(e=>keep.has(e.i)?{...e,f:e.f|LF.KEY}:e)};
 w.fights=w.fights.filter(f=>f.year!==year);
}
export function stripTimeline(f:Fight):Fight{return {...f,rounds:f.rounds.map(r=>{const {timeline:_t,...rest}=r;return rest;})};}

/* ───────────── Career statistics ───────────── */
export const emptyCareer=():CareerStats=>({fights:0,seconds:0,s:Array(STAT_LENGTH).fill(0),kdTaken:0,oppTd:0,oppTdLanded:0,dmgTaken:0});
export function addCareer(f:Fighter,own:StatLine,opp:StatLine,seconds:number,kdTaken:number){
 const c=f.career??=emptyCareer();
 c.fights++;c.seconds+=seconds;own.forEach((v,i)=>{c.s[i]+=v;});c.kdTaken+=kdTaken;c.oppTd+=opp[6];c.oppTdLanded+=opp[7];c.dmgTaken+=opp[11];
}
