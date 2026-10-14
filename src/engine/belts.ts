import type {BeltId,BoutKind,Brand,CrownState,Division,Fight,Fighter,Region,World} from './types';
import {BRANDS} from './constants';

export type ContinentalBelt=Exclude<BeltId,'WORLD'|Brand>;
export const BRAND_BELTS:readonly Brand[]=['NOVA','ONYX'];
export const isBrandBelt=(b?:BeltId|null):b is Brand=>b==='NOVA'||b==='ONYX';
/** A world-level title: either brand title, or the pre-split World Crown. */
export const isTopBelt=(b?:BeltId|null)=>b==='NOVA'||b==='ONYX'||b==='WORLD';
export const CONTINENTAL_BELTS:readonly ContinentalBelt[]=['AMERICAS','EUROPE','AFRICA','APAC'];
export const REGION_BELT:Record<Region,ContinentalBelt>={Americas:'AMERICAS','Europe & Middle East':'EUROPE',Africa:'AFRICA',APAC:'APAC'};
export const BELT_REGION:Record<ContinentalBelt,Region>={AMERICAS:'Americas',EUROPE:'Europe & Middle East',AFRICA:'Africa',APAC:'APAC'};
export const BELT_DIVISION:Record<BeltId,Division>={NOVA:'NOVA S',ONYX:'ONYX S',WORLD:'S-TIER',AMERICAS:'AMERICAS D1',EUROPE:'EUROPE D1',AFRICA:'AFRICA D1',APAC:'APAC D1'};
export const BELT_NAMES:Record<BeltId,string>={NOVA:'NOVA World Title',ONYX:'ONYX World Title',WORLD:'World Crown (before the split)',AMERICAS:'Americas Continental Belt',EUROPE:'Europe & Middle East Continental Belt',AFRICA:'Africa Continental Belt',APAC:'APAC Continental Belt'};
export const BELT_SHORT:Record<BeltId,string>={NOVA:'NOVA title',ONYX:'ONYX title',WORLD:'World Crown',AMERICAS:'Americas belt',EUROPE:'Europe belt',AFRICA:'Africa belt',APAC:'APAC belt'};

/* ───────────── Calendar ─────────────
   48 events a year, four per month (three circuit cards, then the big event).
   Big events: a title night for one brand (with a title eliminator for the other) in eight months,
   THE SURGE in April, the Doubles Crown in June, THE CRUCIBLE (or the Olympiad) in August and THE PINNACLE in December.
   Continental title nights: the third circuit card of Feb, May, Aug and Nov. */
const BIG=(month:number)=>month*4+3;
export const TITLE_MONTHS:Record<Brand,readonly number[]>={NOVA:[0,2,6,9],ONYX:[1,4,8,10]};
export const DOUBLES_MONTH=5,PINNACLE_MONTH=11;
export const PINNACLE_ROUND=BIG(PINNACLE_MONTH),DOUBLES_ROUND=BIG(DOUBLES_MONTH);
/** The brand whose world title is on the line at this event, if any. */
export function titleBrandAt(round:number):Brand|null{
 for(const b of BRANDS)if(TITLE_MONTHS[b].some(m=>BIG(m)===round))return b;
 return null;
}
export const otherBrand=(b:Brand):Brand=>b==='NOVA'?'ONYX':'NOVA';
export const WORLD_TITLE_ROUNDS=[...TITLE_MONTHS.NOVA,...TITLE_MONTHS.ONYX].map(BIG).sort((a,b)=>a-b);
export const CONTINENTAL_ROUNDS=[6,18,30,42] as const;
export const isWorldTitleRound=(round:number)=>titleBrandAt(round)!==null;
export const isContinentalRound=(round:number)=>(CONTINENTAL_ROUNDS as readonly number[]).includes(round);
/** Doubles ranking ties: the second circuit card of every month except June and December. */
export const isDoublesRankingRound=(round:number)=>round%4===1&&Math.floor(round/4)!==DOUBLES_MONTH&&Math.floor(round/4)!==PINNACLE_MONTH;

/** Form (shape) runs from -5 to +5 around the annual base. */
export const FORM_MAX=5;
/** Belt holders are always at the top of their form: +5 on top of their base, visible in their rating and the odds. */
export function pinChampionForm(w:World){
 for(const id of [...BRAND_BELTS.map(b=>w.crowns?.[b]?.championId),...CONTINENTAL_BELTS.map(b=>w.belts[b].championId)]){const f=id&&w.fighters.find(x=>x.id===id);if(f)f.shape=FORM_MAX;}
}
export const emptyBelt=():CrownState=>({championId:null,reigns:[],interimId:null,interimReigns:[],mandatoryId:null});
export const emptyBelts=():World['belts']=>({AMERICAS:emptyBelt(),EUROPE:emptyBelt(),AFRICA:emptyBelt(),APAC:emptyBelt()});
export function beltState(w:World,belt:BeltId):CrownState{return belt==='WORLD'?w.crown:isBrandBelt(belt)?w.crowns![belt]:w.belts[belt];}
/** Every world-level reign: the pre-split World Crown and both brand titles. */
export function topReigns(w:World){return [...w.crown.reigns,...BRAND_BELTS.flatMap(b=>w.crowns?.[b]?.reigns??[])];}
/** Belts a fighter currently holds (full titles only). */
export function beltsHeld(w:World,id:string):BeltId[]{
 const out:BeltId[]=[];for(const b of BRAND_BELTS)if(w.crowns?.[b]?.championId===id)out.push(b);
 for(const b of CONTINENTAL_BELTS)if(w.belts[b].championId===id)out.push(b);
 return out;
}
export const isInterimChampion=(w:World,id:string)=>BRAND_BELTS.some(b=>w.crowns?.[b]?.interimId===id);
/** Champions only compete in title bouts. */
export function protectedChampions(w:World):Set<string>{
 const ids=new Set<string>();
 for(const id of [...BRAND_BELTS.flatMap(b=>[w.crowns?.[b]?.championId,w.crowns?.[b]?.interimId]),...CONTINENTAL_BELTS.map(b=>w.belts[b].championId)])if(id)ids.add(id);
 return ids;
}

const event=(w:World,type:World['events'][number]['type'],fighterId:string,description:string,fightId?:string)=>w.events.push({year:w.year,type,fighterId,description,fightId});
/** Apply the outcome of a title, interim, unification or eliminator bout. Mutates belt state and fame. */
export function applyBoutResult(w:World,fight:Fight,winner:Fighter|null,belt:BeltId,kind:BoutKind,eventName:string){
 const b=beltState(w,belt),name=BELT_SHORT[belt],world=isTopBelt(belt);
 b.interimReigns??=[];
 const at={year:w.year,round:w.round+1};
 if(!winner)return;
 const fame=(n:number)=>{winner.fame=(winner.fame||0)+n;};
 if(kind==='eliminator'){
  b.mandatoryId=winner.id;fame(12);
  event(w,'eliminator',winner.id,`${winner.name} wins the title eliminator at ${eventName} and becomes the mandatory challenger`,fight.id);
  return;
 }
 if(b.mandatoryId===fight.fighterA||b.mandatoryId===fight.fighterB)b.mandatoryId=null;
 const endReign=(list:typeof b.reigns)=>{const r=list.at(-1);if(r&&!r.endYear){r.endYear=at.year;r.endRound=at.round;r.endFightId=fight.id;}};
 if(kind==='interim'){
  if(b.interimId===winner.id){b.interimReigns.at(-1)!.defenses++;fame(14);event(w,'defense',winner.id,`Retains the interim ${name} at ${eventName}: ${fight.headline}`,fight.id);}
  else{endReign(b.interimReigns);b.interimReigns.push({fighterId:winner.id,startYear:at.year,startRound:at.round,startFightId:fight.id,defenses:0});b.interimId=winner.id;fame(45);
   event(w,'interim',winner.id,`${winner.name} wins the interim ${name} at ${eventName} by ${fight.method}`,fight.id);}
  return;
 }
 if(kind==='unification'){
  endReign(b.interimReigns);b.interimId=null;
  if(b.championId===winner.id){b.reigns.at(-1)!.defenses++;fame(40);event(w,'defense',winner.id,`Unifies the ${name} at ${eventName}: ${fight.headline}`,fight.id);return;}
 }
 if(b.championId===winner.id){
  b.reigns.at(-1)!.defenses++;fame(world?32:15);
  event(w,'defense',winner.id,`Successful ${name} defense at ${eventName}: ${fight.headline}`,fight.id);
  return;
 }
 endReign(b.reigns);
 b.championId=winner.id;b.reigns.push({fighterId:winner.id,startYear:at.year,startRound:at.round,startFightId:fight.id,defenses:0});
 fight.titleChange=true;
 fame(world?90+(kind==='unification'?30:0):40);
 event(w,'title',winner.id,`${winner.name} captures the ${BELT_NAMES[belt]} at ${eventName} by ${fight.method}`,fight.id);
}
/** End a reign without a fight (retirement, promotion, leaving the division). An interim champion is elevated. */
export function vacateBelt(w:World,belt:BeltId,reason:string){
 const b=beltState(w,belt);b.interimReigns??=[];
 const holder=w.fighters.find(f=>f.id===b.championId);
 const reign=b.reigns.at(-1);if(reign&&!reign.endYear){reign.endYear=w.year;reign.endRound=0;}
 if(holder)event(w,'vacancy',holder.id,`${holder.name} ${reason} — the ${BELT_SHORT[belt]} is vacant`);
 b.championId=null;
 const interim=b.interimReigns.at(-1);
 const interimHolder=w.fighters.find(f=>f.id===b.interimId);
 if(interim&&interimHolder&&interimHolder.status==='active'&&interimHolder.division===BELT_DIVISION[belt]){
  interim.endYear=w.year;interim.endRound=0;
  b.championId=interimHolder.id;b.reigns.push({fighterId:interimHolder.id,startYear:w.year,startRound:0,startFightId:interim.startFightId,defenses:0,via:'interim'});
  event(w,'title',interimHolder.id,`${interimHolder.name} is elevated from interim to full ${BELT_SHORT[belt]} champion`);
 }
 b.interimId=null;
}
