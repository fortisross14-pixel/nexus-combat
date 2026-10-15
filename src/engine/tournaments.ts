import {getFight} from './archive';
import {abilitiesOf,ageOf,clamp} from './career';
import {Random} from './random';
import {TOP_DIVISION,SECOND_DIVISION,BRANDS,REGIONS,REGION_DIVISIONS} from './constants';
import {resolveTournamentBout,CLOCK,SURGE_ROUND,OLYMPIAD_ROUND,CRUCIBLE_ROUND} from './competition';
import {FORM_MAX,pinChampionForm} from './belts';
import type {Fighter,World,Tournament,TournamentKind,TournamentMatch} from './types';

export const isOlympiadYear=(year:number)=>year%4===0;
export function kindAt(year:number,round:number):TournamentKind|null{
 if(round===SURGE_ROUND)return 'SURGE';
 // August: the Olympiad every fourth year, the Crucible otherwise.
 if(round===OLYMPIAD_ROUND&&isOlympiadYear(year))return 'OLYMPIAD';
 return round===CRUCIBLE_ROUND?'CRUCIBLE':null;
}
export const eventNameAt=(year:number,round:number)=>kindAt(year,round)==='OLYMPIAD'?'WORLD COMBAT OLYMPIAD':kindAt(year,round)==='SURGE'?'THE SURGE':kindAt(year,round)==='CRUCIBLE'?'THE CRUCIBLE':null;
export function nextTournamentKind(w:World):TournamentKind|null{return kindAt(w.year,w.round);}
const match=(t:Tournament,stage:string,a:string,b:string,group?:'A'|'B'):TournamentMatch=>({id:`${t.id}-m${t.matches.length+1}`,stage,fighterA:a,fighterB:b,winnerId:null,...(group?{group}:{})});
const eligible=(f:Fighter)=>f.status==='active'&&f.condition>=60;
/** Both brands' top (or second) divisions, interleaved by rank: NOVA #1, ONYX #1, NOVA #2… champions first. */
const ranked=(w:World,tier:'top'|'second')=>{
 const lists=(['NOVA','ONYX'] as const).map(b=>w.fighters.filter(f=>f.status==='active'&&f.division===(tier==='top'?TOP_DIVISION[b]:SECOND_DIVISION[b])).sort((a,c)=>a.rank-c.rank));
 const out:Fighter[]=[];for(let i=0;i<Math.max(...lists.map(l=>l.length));i++)for(const l of lists)if(l[i])out.push(l[i]);
 return out;
};
function makeMatches(t:Tournament,stage:string,pairs:[string,string][],group?:'A'|'B'){
 for(const [a,b] of pairs)t.matches.push(match(t,stage,a,b,group));
}
function groupRounds(ids:string[]):[string,string][][]{
 return [ [[ids[0],ids[3]],[ids[1],ids[2]]],[[ids[0],ids[2]],[ids[3],ids[1]]],[[ids[0],ids[1]],[ids[2],ids[3]]] ];
}
/** All participants and the opening stage are chosen when an event starts; future results and brackets are NOT precomputed. */
export function beginTournament(w:World,rng:Random):Tournament{
 const kind=nextTournamentKind(w);if(!kind)throw Error('No tournament this event');
 if(w.activeTournamentId)throw Error('A tournament is already active');
 // A tournament occupies a calendar slot just like a regular fight card, so participants
 // also receive realistic recovery between events, without curing active injuries.
 const now=CLOCK(w.year,w.round);
 for(const f of w.fighters.filter(f=>f.status==='active')){
  const ceiling=Math.round(clamp(83+rng.int(-4,7)-Math.max(0,ageOf(f,w.year)-35)*.65,68,95));
  f.condition=Math.min(ceiling,clamp(f.condition+rng.int(3,7),0,100));
  if(f.injuryUntil>now)f.condition=Math.min(39,f.condition);
 }
 let participants:string[];
 if(kind==='CRUCIBLE'){
  participants=[...ranked(w,'top'),...ranked(w,'second')].filter(f=>eligible(f)&&f.injuryUntil<=now).slice(0,8).map(f=>f.id);
  if(participants.length<8)throw Error('Not enough medically cleared Grand Prix entrants');
 }else if(kind==='OLYMPIAD'){
  // Forty medically cleared athletes: the global divisions first, then the best continental fighters as alternates.
  const cleared=(f:Fighter)=>eligible(f)&&f.injuryUntil<=now;
  const alternates=w.fighters.filter(f=>f.status==='active'&&f.division.endsWith('D1')).sort((a,b)=>b.rankingPoints-a.rankingPoints);
  participants=[...ranked(w,'top'),...ranked(w,'second'),...alternates].filter(cleared).slice(0,40).map(f=>f.id);
  if(participants.length<40)throw Error('Not enough medically cleared Olympiad entrants');
 }else{
  // 8 from each brand: its champion and seven ranked contenders. Four continental
  // champions complete the twenty. Medically unavailable holders are replaced by
  // the next fit athlete in their own division/region, with no duplicate invitations.
  const ids:string[]=[];
  const fit=(f:Fighter)=>eligible(f)&&f.injuryUntil<=now;
  const add=(list:Fighter[],limit:number)=>{
   for(const f of list){if(ids.length>=limit)break;if(fit(f)&&!ids.includes(f.id))ids.push(f.id);}
  };
  for(const brand of BRANDS){
   const roster=w.fighters.filter(f=>f.status==='active'&&f.division===TOP_DIVISION[brand]).sort((a,b)=>a.rank-b.rank);
   const holder=w.crowns?.[brand]?.championId;
   const prioritized=[...roster.filter(f=>f.id===holder),...roster.filter(f=>f.id!==holder),
     ...w.fighters.filter(f=>f.status==='active'&&f.division===SECOND_DIVISION[brand]).sort((a,b)=>a.rank-b.rank)];
   add(prioritized,ids.length+8);
  }
  for(const [i,region] of REGIONS.entries()){
   const belt=(['AMERICAS','EUROPE','AFRICA','APAC'] as const)[i];
   const champion=w.belts[belt]?.championId;
   const candidates=w.fighters.filter(f=>f.status==='active'&&f.division===REGION_DIVISIONS[region][0]).sort((a,b)=>a.rank-b.rank);
   add([...candidates.filter(f=>f.id===champion),...candidates.filter(f=>f.id!==champion)],ids.length+1);
  }
  if(ids.length!==20)throw Error('Not enough medically cleared Royale entrants');
  participants=ids;
 }
 const t:Tournament={id:`${kind.toLowerCase()}-${w.year}`,kind,year:w.year,status:'active',participants,matches:[],stage:0,winnerId:null};
 if(kind==='CRUCIBLE'){
  // Ranked seeding spreads favorites between groups. Three round-robin matchdays.
  const a=[participants[0],participants[3],participants[4],participants[7]];
  const b=[participants[1],participants[2],participants[5],participants[6]];
  const ga=groupRounds(a),gb=groupRounds(b);
  for(let day=0;day<3;day++){
   makeMatches(t,`Group MD${day+1}`,ga[day],'A');makeMatches(t,`Group MD${day+1}`,gb[day],'B');
  }
 }else if(kind==='OLYMPIAD'){
  // Seeds #25–40 enter a preliminary round. The top 24 wait in the round of 32.
  makeMatches(t,'Prelim',Array.from({length:8},(_,i)=>[participants[24+i],participants[39-i]] as [string,string]));
 }else{
  t.surgeOrder=rng.shuffle([...participants]);
  t.surgeActive=t.surgeOrder.slice(0,2);
  t.surgeMoments=t.surgeActive.map((id,i)=>({wave:i+1,minute:0,entrantId:id,eliminatedId:null,byId:null,remaining:t.surgeActive!.slice(0,i+1),message:`Opening entrant ${i+1}`}));
  t.surgeState={minute:0,fighters:Object.fromEntries(t.surgeActive.map(id=>[id,{enteredAt:0,energy:100,damage:0,eliminations:0}])),lastEvent:'The opening two fighters enter the arena.'};
 }
 w.tournaments.push(t);w.activeTournamentId=t.id;w.lastFightIds=[];
 return t;
}
export function currentTournament(w:World):Tournament|null{return w.tournaments.find(t=>t.id===w.activeTournamentId)||null;}
export function pendingTournamentMatch(t:Tournament):TournamentMatch|null{
 if(t.kind==='SURGE'||t.status==='complete')return null;
 return t.matches.find(m=>m.winnerId===null&&!m.fightId)||null;
}
function groupStandings(t:Tournament,group:'A'|'B',world?:World){
 const groupMembers=t.participants.filter((_,i)=>group==='A'?[0,3,4,7].includes(i):[1,2,5,6].includes(i));
 const stats=groupMembers.map((id,i)=>({id,points:0,wins:0,losses:0,draws:0,finishes:0,seed:i}));
 for(const m of t.matches.filter(m=>m.group===group&&m.fightId)){
  for(const entry of stats.filter(x=>x.id===m.fighterA||x.id===m.fighterB)){
   if(m.winnerId===entry.id){entry.points+=3;entry.wins++;if(['KO','TKO','SUB'].includes(m.finishMethod??(world&&m.fightId?getFight(world,m.fightId)?.method:'')??'')){entry.points++;entry.finishes++;}}
   else if(m.winnerId===null){entry.points++;entry.draws++;}
   else entry.losses++;
  }
 }
 return stats.sort((a,b)=>b.points-a.points||b.wins-a.wins||a.losses-b.losses||a.seed-b.seed);
}
export function standings(t:Tournament,world?:World){return {A:groupStandings(t,'A',world),B:groupStandings(t,'B',world)};}
function seeded32(ids:string[]):[string,string][]{
 // True seeded bracket order (1 vs 32, 16 vs 17, 8 vs 25 etc.)
 const order=[1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22];
 return Array.from({length:16},(_,i)=>[ids[order[i*2]-1],ids[order[i*2+1]-1]] as [string,string]);
}
function ensureNextStage(t:Tournament,world:World){
 if(t.status==='complete'||t.kind==='SURGE')return;
 const stage=t.kind==='CRUCIBLE'?(t.stage<3?`Group MD${t.stage+1}`:t.stage===3?'Semifinal':'Final'):
  ['Prelim','Round of 32','Round of 16','Quarterfinal','Semifinal','Final'][t.stage];
 if(t.matches.filter(m=>m.stage===stage).some(m=>!m.fightId))return;
 if(t.kind==='CRUCIBLE'){
  if(t.stage<2){t.stage++;return;}
  if(t.stage===2){const s=standings(t,world);makeMatches(t,'Semifinal',[[s.A[0].id,s.B[1].id],[s.B[0].id,s.A[1].id]]);t.stage=3;return;}
  if(t.stage===3){const semifinal=t.matches.filter(m=>m.stage==='Semifinal');makeMatches(t,'Final',[[semifinal[0].winnerId!,semifinal[1].winnerId!]]);t.stage=4;return;}
  const final=t.matches.find(m=>m.stage==='Final')!;t.winnerId=final.winnerId;t.runnerUpId=final.winnerId===final.fighterA?final.fighterB:final.fighterA;t.status='complete';return;
 }
 if(t.stage===0){
  const qualifiers=t.matches.filter(m=>m.stage==='Prelim').map(m=>m.winnerId!);
  makeMatches(t,'Round of 32',seeded32([...t.participants.slice(0,24),...qualifiers]));t.stage=1;return;
 }
 if(t.stage<=4){
  const current=['Prelim','Round of 32','Round of 16','Quarterfinal','Semifinal','Final'][t.stage];
  const next=['Prelim','Round of 32','Round of 16','Quarterfinal','Semifinal','Final'][t.stage+1];
  const prior=t.matches.filter(m=>m.stage===current);
  makeMatches(t,next,Array.from({length:prior.length/2},(_,i)=>[prior[2*i].winnerId!,prior[2*i+1].winnerId!]));t.stage++;return;
 }
 const final=t.matches.find(m=>m.stage==='Final')!;t.winnerId=final.winnerId;t.runnerUpId=final.winnerId===final.fighterA?final.fighterB:final.fighterA;t.status='complete';
}
function awardWinner(w:World,t:Tournament){
 if(!t.winnerId)throw Error('Completed tournament has no winner');
 const winner=w.fighters.find(f=>f.id===t.winnerId)!;
 const fame=t.kind==='OLYMPIAD'?150:t.kind==='CRUCIBLE'?100:85;
 winner.fame=(winner.fame||0)+fame;winner.shape=clamp(winner.shape+2,-FORM_MAX,FORM_MAX);pinChampionForm(w);
 if(t.runnerUpId){const finalist=w.fighters.find(f=>f.id===t.runnerUpId);if(finalist){finalist.fame=(finalist.fame||0)+Math.round(fame*.22);}}
 const title=t.kind==='OLYMPIAD'?'World Combat Olympiad GOLD':t.kind==='CRUCIBLE'?'Crucible Grand Prix':'Surge Royale';
 w.events.push({year:w.year,type:'tournament',fighterId:winner.id,description:`${winner.name} wins the ${w.year} ${title}!`});
 w.activeTournamentId=null;
 // The Surge remains an ANNUAL event. Olympiad years add a separate August competition,
 // rather than replacing the Royale. Both therefore have their own winner every year.
 w.round++;
}
/** Resolves only the NEXT announced matchup. Watch and Skip call the identical deterministic function. */
export function advanceTournamentBout(w:World,rng:Random):string|null{
 const t=currentTournament(w);if(!t||t.status!=='active')throw Error('No active tournament');
 if(t.kind==='SURGE'){advanceSurge(w,rng,t);if(t.winnerId!==null)awardWinner(w,t);return null;}
 const m=pendingTournamentMatch(t);if(!m)throw Error('No pending tournament matchup');
 const a=w.fighters.find(f=>f.id===m.fighterA)!,b=w.fighters.find(f=>f.id===m.fighterB)!;
 if(a.condition<40||b.condition<40||a.injuryUntil>CLOCK(w.year,w.round)||b.injuryUntil>CLOCK(w.year,w.round)){
  // Explicit medical withdrawal; no imaginary fight, no damage to regular records.
  const now=CLOCK(w.year,w.round),fit=(f:Fighter)=>f.condition>=40&&f.injuryUntil<=now;
  const winner=fit(a)?a:fit(b)?b:t.participants.indexOf(a.id)<t.participants.indexOf(b.id)?a:b;
  m.winnerId=winner.id;m.fightId=`walkover-${m.id}`;ensureNextStage(t,w);
  if(t.winnerId!==null)awardWinner(w,t);
  return null;
 }
 const fight=resolveTournamentBout(w,rng,m.fighterA,m.fighterB,t.id,m.stage,t.kind==='OLYMPIAD'||!m.stage.startsWith('Group'));
 // Overnight short-format recovery between tournament bouts, still leaving stamina meaningful.
 for(const fighter of [a,b])if(fighter.injuryUntil<=CLOCK(w.year,w.round))fighter.condition=Math.min(Math.max(fighter.condition,86),fighter.condition+3);
 m.fightId=fight.id;m.winnerId=fight.winnerId;m.finishMethod=fight.method;
 // Tournament matches don't generate regular ranking-point inflation or artificially add wins to circuit records.
 ensureNextStage(t,w);
 if(t.winnerId!==null)awardWinner(w,t);
 return fight.id;
}
/** Restore an open Royale from pre-v1.5.2 saves, preserving its published eliminations. */
function ensureSurgeState(t:Tournament){
 if(t.surgeState)return t.surgeState;
 const moments=t.surgeMoments??[],order=t.surgeOrder??[],entered=new Map<string,number>();
 // Legacy Royale added a fighter each wave; approximate the broadcast clock while
 // preserving its entrants, eliminations and winner history.
 for(let i=0;i<moments.length;i++)if(moments[i].entrantId)entered.set(moments[i].entrantId!,Math.max(0,(i-1)*3));
 const minute=Math.max(0,(Math.min(order.length,moments.length)-2)*3)+Math.max(0,moments.length-order.length);
 const eliminated=new Map<string,{at:number;by:string|null}>();
 for(let i=0;i<moments.length;i++)if(moments[i].eliminatedId)eliminated.set(moments[i].eliminatedId!,{at:Math.min(minute,Math.max(0,(i-1)*3)),by:moments[i].byId});
 const fighters:NonNullable<Tournament['surgeState']>['fighters']={};
 for(const [id,enteredAt] of entered){const elapsed=Math.max(0,(eliminated.get(id)?.at??minute)-enteredAt);
  fighters[id]={enteredAt,energy:clamp(100-elapsed*1.4,8,100),damage:clamp(elapsed*.9,0,98),eliminations:moments.filter(m=>m.byId===id).length,...(eliminated.has(id)?{eliminatedAt:eliminated.get(id)!.at,eliminatedBy:eliminated.get(id)!.by}:{})};
 }
 t.surgeState={minute,fighters,lastEvent:'Resumed from the previous Royale save.'};return t.surgeState;
}
const surgeAbility=(f:Fighter,w:World)=>{
 const sk=abilitiesOf(f,w.year);
 return {sk,defense:sk.Defense*.37+sk.Footwork*.23+sk.Clinch*.23+sk.Takedowns*.17,
  offense:sk.Clinch*.32+sk.Takedowns*.24+sk.Hands*.16+sk.Stamina*.14+sk.Footwork*.14,
  survival:(f.mentality==='Strategist'?7:f.mentality==='Cold'?2:f.mentality==='Crazy'?-2:0)+clamp((f.weight-82)*.035,-2,3)};
};
/** Simulate precisely one minute; all published state is generated here, not by UI playback. */
function advanceSurge(w:World,rng:Random,t:Tournament){
 const state=ensureSurgeState(t),order=t.surgeOrder!,active=t.surgeActive!,moments=t.surgeMoments!;
 state.minute++;const minute=state.minute;
 let entrantId:string|null=null,eliminatedId:string|null=null,byId:string|null=null;
 // Initial two enter at 0:00; #3 at 3:00, #4 at 6:00, ... #20 at 54:00.
 if(minute%3===0&&Object.keys(state.fighters).length<order.length){
  entrantId=order[Object.keys(state.fighters).length];
  state.fighters[entrantId]={enteredAt:minute,energy:100,damage:0,eliminations:0};active.push(entrantId);
 }
 const lookup=new Map(w.fighters.map(f=>[f.id,f]));
 const abilities=new Map(active.map(id=>[id,surgeAbility(lookup.get(id)!,w)]));
 const recent=active.length;
 const pressure=clamp((recent-2)/9,0,1);
 // Effort, absorbing blows and repeatedly escaping bad positions drain energy.
 for(const id of active){
  const f=lookup.get(id)!,a=abilities.get(id)!,s=state.fighters[id];
  const stamina=a.sk.Stamina;const strategy=f.mentality==='Strategist';
  const effort=clamp(rng.float(.56,1.32)+(f.mentality==='Bold'?.22:f.mentality==='Crazy'?.34:strategy?-.21:0),.26,1.65);
  const targeted=clamp(rng.float(.3,1.15)+pressure*.34+(s.damage/100)*.16,.15,1.75);
  const staminaFactor=clamp(1.60-(stamina-70)*.021,.84,1.85);
  // Fighters aren't trading blows every minute of a 20-person melee. Clever
  // survivors hide, circle, recover and choose their exchanges selectively.
  const exposure=clamp(rng.float(.30,.95)+(strategy?-.19:0)+(f.mentality==='Crazy'?.15:0),.08,1.25);
  const exertion=(.35+effort*.60+targeted*.28+pressure*.25)*staminaFactor*exposure;
  const recovery=(strategy&&rng.next()<.34?.32:0)+(stamina>=95&&exposure<.40?.14:0);
  s.energy=+clamp(s.energy-exertion+recovery,0,100).toFixed(1);
  const defensiveReduction=clamp((a.defense-68)*.011,0,.32);
  const incoming=(.25+targeted*.88+pressure*.60)*(1-defensiveReduction)*(strategy?.65:1)*exposure;
  const exhausted=s.energy<24?1.35:s.energy<45?1.1:1;
  const impact=rng.next()<.07? rng.float(2,7)*(strategy?.57:1):0;
  s.damage=+clamp(s.damage+incoming*exhausted*rng.float(.68,1.25)+impact,0,100).toFixed(1);
 }
 // The longer the fight, the higher the attrition; new arrivals get less damage,
 // but are never granted guaranteed survival. The simulation does not predetermine a winner.
 if(active.length>1){
  const allEntered=Object.keys(state.fighters).length===order.length;
  const chance=allEntered?clamp(.30+(minute-54)*.018,.30,.85):
    active.length>=9?.48:active.length>=6?.36:active.length>=4?.23:.055;
  if(rng.next()<chance){
   const scores=active.map(id=>{
    const a=abilities.get(id)!,s=state.fighters[id];
    const protectedAbility=(a.defense*.55+a.sk.Stamina*.22+a.offense*.23);
    // Damage/fatigue matter, but a tactical elite survivor can overcome a
    // longer exposure. Randomness gives every fighter an upset possibility.
    const danger=(s.damage*.27+(100-s.energy)*.22+(94-protectedAbility)*1.38-a.survival*1.55+
      Math.max(0,minute-s.enteredAt-30)*.017+rng.float(-24,24));
    return {id,danger};
   }).sort((a,b)=>b.danger-a.danger);
   // Strong pressure tends to expose the weakest, but random finishes persist.
   eliminatedId=scores[rng.next()<.60?0:Math.min(scores.length-1,rng.int(0,Math.min(5,scores.length-1)))].id;
   const defeated=state.fighters[eliminatedId];
   const options=active.filter(id=>id!==eliminatedId).map(id=>{
    const a=abilities.get(id)!,s=state.fighters[id];
    return {id,score:a.offense*.52+a.sk.Stamina*.14+a.survival*.5+s.energy*.14-s.damage*.16+rng.float(-28,28)};
   }).sort((a,b)=>b.score-a.score);
   byId=options[rng.next()<.72?0:rng.int(0,Math.min(options.length-1,2))]?.id??null;
   defeated.eliminatedAt=minute;defeated.eliminatedBy=byId;
   if(byId)state.fighters[byId].eliminations++;
   active.splice(active.indexOf(eliminatedId),1);
  }
 }
 let message=entrantId?`${lookup.get(entrantId)?.name} enters the arena at ${minute}:00.`:'The action continues around the arena.';
 if(eliminatedId)message=`${lookup.get(eliminatedId)?.name} eliminated${byId?` by ${lookup.get(byId)?.name}`:''} at ${minute}:00.${entrantId?` ${lookup.get(entrantId)?.name} also enters.`:''}`;
 state.lastEvent=message;
 moments.push({wave:moments.length+1,minute,entrantId,eliminatedId,byId,remaining:[...active],message});
 if(Object.keys(state.fighters).length>=20&&active.length===1){t.winnerId=active[0];t.runnerUpId=eliminatedId??undefined;t.status='complete';}
}
/** Resolves all matches while retaining only the already-earned bracket outcomes and records. */
export function finishTournament(w:World,rng:Random){
 let guard=0;
 while(currentTournament(w)&&guard++<400)advanceTournamentBout(w,rng);
 if(currentTournament(w))throw Error('Tournament failed to finish');
}
