import type {BeltId,BoutKind,CrownState,Division,Fight,Fighter,Region,World} from './types';

export type ContinentalBelt=Exclude<BeltId,'WORLD'>;
export const CONTINENTAL_BELTS:readonly ContinentalBelt[]=['AMERICAS','EUROPE','AFRICA','APAC'];
export const REGION_BELT:Record<Region,ContinentalBelt>={Americas:'AMERICAS','Europe & Middle East':'EUROPE',Africa:'AFRICA',APAC:'APAC'};
export const BELT_REGION:Record<ContinentalBelt,Region>={AMERICAS:'Americas',EUROPE:'Europe & Middle East',AFRICA:'Africa',APAC:'APAC'};
export const BELT_DIVISION:Record<BeltId,Division>={WORLD:'S-TIER',AMERICAS:'AMERICAS D1',EUROPE:'EUROPE D1',AFRICA:'AFRICA D1',APAC:'APAC D1'};
export const BELT_NAMES:Record<BeltId,string>={WORLD:'World Crown',AMERICAS:'Americas Continental Belt',EUROPE:'Europe & Middle East Continental Belt',AFRICA:'Africa Continental Belt',APAC:'APAC Continental Belt'};
export const BELT_SHORT:Record<BeltId,string>={WORLD:'World Crown',AMERICAS:'Americas belt',EUROPE:'Europe belt',AFRICA:'Africa belt',APAC:'APAC belt'};

/* ───────────── Calendar ─────────────
   48 events a year, four per month (three circuit cards, then the big event).
   World Crown: FIGHTOPIA (Mar), FAULTLINE (Jun) and THE PINNACLE (Dec), every year.
   Continental title nights: the third circuit card of Feb, May, Aug and Nov. */
export const WORLD_TITLE_ROUNDS=[11,23,47] as const;
export const CONTINENTAL_ROUNDS=[6,18,30,42] as const;
export const isWorldTitleRound=(round:number)=>(WORLD_TITLE_ROUNDS as readonly number[]).includes(round);
export const isContinentalRound=(round:number)=>(CONTINENTAL_ROUNDS as readonly number[]).includes(round);

/** Form (shape) runs from -5 to +5 around the annual base. */
export const FORM_MAX=5;
/** Belt holders are always at the top of their form: +5 on top of their base, visible in their rating and the odds. */
export function pinChampionForm(w:World){
 for(const id of [w.crown.championId,...CONTINENTAL_BELTS.map(b=>w.belts[b].championId)]){const f=id&&w.fighters.find(x=>x.id===id);if(f)f.shape=FORM_MAX;}
}
export const emptyBelt=():CrownState=>({championId:null,reigns:[],interimId:null,interimReigns:[],mandatoryId:null});
export const emptyBelts=():World['belts']=>({AMERICAS:emptyBelt(),EUROPE:emptyBelt(),AFRICA:emptyBelt(),APAC:emptyBelt()});
export function beltState(w:World,belt:BeltId):CrownState{return belt==='WORLD'?w.crown:w.belts[belt];}
/** Belts a fighter currently holds (full titles only). */
export function beltsHeld(w:World,id:string):BeltId[]{
 const out:BeltId[]=[];if(w.crown.championId===id)out.push('WORLD');
 for(const b of CONTINENTAL_BELTS)if(w.belts[b].championId===id)out.push(b);
 return out;
}
export const isInterimChampion=(w:World,id:string)=>w.crown.interimId===id;
/** Champions only compete in title bouts. */
export function protectedChampions(w:World):Set<string>{
 const ids=new Set<string>();
 for(const id of [w.crown.championId,w.crown.interimId,...CONTINENTAL_BELTS.map(b=>w.belts[b].championId)])if(id)ids.add(id);
 return ids;
}

const event=(w:World,type:World['events'][number]['type'],fighterId:string,description:string,fightId?:string)=>w.events.push({year:w.year,type,fighterId,description,fightId});
/** Apply the outcome of a title, interim, unification or eliminator bout. Mutates belt state and fame. */
export function applyBoutResult(w:World,fight:Fight,winner:Fighter|null,belt:BeltId,kind:BoutKind,eventName:string){
 const b=beltState(w,belt),name=BELT_SHORT[belt],world=belt==='WORLD';
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
 fame(world?(eventName==='THE PINNACLE'?120:90)+(kind==='unification'?30:0):40);
 event(w,'title',winner.id,`${winner.name} captures the ${world?'NEXUS World Crown':BELT_NAMES[belt]} at ${eventName} by ${fight.method}`,fight.id);
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
