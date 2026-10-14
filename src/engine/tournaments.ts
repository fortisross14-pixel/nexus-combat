import {abilitiesOf,ageOf,clamp,overallOf} from './career';
import {Random} from './random';
import {TOP_DIVISION,SECOND_DIVISION} from './constants';
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
  // The twenty Royale berths include eligible S-Tier fighters and fit Global D2 reserves
  // if a contender is medically suspended; never force an injured athlete into the arena.
  participants=[...ranked(w,'top'),...ranked(w,'second'),...w.fighters.filter(f=>f.status==='active'&&f.division.endsWith('D1')).sort((a,b)=>b.rankingPoints-a.rankingPoints)].filter(f=>eligible(f)&&f.injuryUntil<=now).slice(0,20).map(f=>f.id);
  if(participants.length<20)throw Error('Not enough medically cleared Royale entrants');
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
  t.surgeOrder=rng.shuffle([...participants]);t.surgeActive=[];t.surgeMoments=[];
 }
 w.tournaments.push(t);w.activeTournamentId=t.id;w.lastFightIds=[];
 return t;
}
export function currentTournament(w:World):Tournament|null{return w.tournaments.find(t=>t.id===w.activeTournamentId)||null;}
export function pendingTournamentMatch(t:Tournament):TournamentMatch|null{
 if(t.kind==='SURGE'||t.status==='complete')return null;
 return t.matches.find(m=>m.winnerId===null&&!m.fightId)||null;
}
function groupStandings(t:Tournament,group:'A'|'B'){
 const groupMembers=t.participants.filter((_,i)=>group==='A'?[0,3,4,7].includes(i):[1,2,5,6].includes(i));
 const stats=groupMembers.map((id,i)=>({id,points:0,wins:0,losses:0,draws:0,finishes:0,seed:i}));
 for(const m of t.matches.filter(m=>m.group===group&&m.fightId)){
  for(const entry of stats.filter(x=>x.id===m.fighterA||x.id===m.fighterB)){
   if(m.winnerId===entry.id){entry.points+=3;entry.wins++;}
   else if(m.winnerId===null){entry.points++;entry.draws++;}
   else entry.losses++;
  }
 }
 return stats.sort((a,b)=>b.points-a.points||b.wins-a.wins||a.losses-b.losses||a.seed-b.seed);
}
export function standings(t:Tournament){return {A:groupStandings(t,'A'),B:groupStandings(t,'B')};}
function seeded32(ids:string[]):[string,string][]{
 // True seeded bracket order (1 vs 32, 16 vs 17, 8 vs 25 etc.)
 const order=[1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22];
 return Array.from({length:16},(_,i)=>[ids[order[i*2]-1],ids[order[i*2+1]-1]] as [string,string]);
}
function ensureNextStage(t:Tournament){
 if(t.status==='complete'||t.kind==='SURGE')return;
 const stage=t.kind==='CRUCIBLE'?(t.stage<3?`Group MD${t.stage+1}`:t.stage===3?'Semifinal':'Final'):
  ['Prelim','Round of 32','Round of 16','Quarterfinal','Semifinal','Final'][t.stage];
 if(t.matches.filter(m=>m.stage===stage).some(m=>!m.fightId))return;
 if(t.kind==='CRUCIBLE'){
  if(t.stage<2){t.stage++;return;}
  if(t.stage===2){const s=standings(t);makeMatches(t,'Semifinal',[[s.A[0].id,s.B[1].id],[s.B[0].id,s.A[1].id]]);t.stage=3;return;}
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
  m.winnerId=winner.id;m.fightId=`walkover-${m.id}`;ensureNextStage(t);
  if(t.winnerId!==null)awardWinner(w,t);
  return null;
 }
 const fight=resolveTournamentBout(w,rng,m.fighterA,m.fighterB,t.id,m.stage,t.kind==='OLYMPIAD'||!m.stage.startsWith('Group'));
 // Overnight short-format recovery between tournament bouts, still leaving stamina meaningful.
 for(const fighter of [a,b])if(fighter.injuryUntil<=CLOCK(w.year,w.round))fighter.condition=Math.min(Math.max(fighter.condition,86),fighter.condition+3);
 m.fightId=fight.id;m.winnerId=fight.winnerId;
 // Tournament matches don't generate regular ranking-point inflation or artificially add wins to circuit records.
 ensureNextStage(t);
 if(t.winnerId!==null)awardWinner(w,t);
 return fight.id;
}
function surgeStrength(f:Fighter,w:World,activeTurns:number){
 const sk=abilitiesOf(f,w.year),age=ageOf(f,w.year);
 return overallOf(f,w.year)*.20+sk.Stamina*.25+sk.Clinch*.16+sk.Footwork*.10+sk.Defense*.10+
  clamp((f.weight-80)*.09,-2,7)+(f.mentality==='Strategist'?4.5:f.mentality==='Cold'?2:f.mentality==='Crazy'?-2:0)-activeTurns*1.3-Math.max(0,age-37)*.6;
}
function advanceSurge(w:World,rng:Random,t:Tournament){
 const order=t.surgeOrder!,moments=t.surgeMoments!,active=t.surgeActive!;
 let entrantId:string|null=null,eliminatedId:string|null=null,byId:string|null=null;
 if(moments.length<order.length){entrantId=order[moments.length];active.push(entrantId);}
 // Dynamic attrition. Early entrants are exposed longer. Nobody wins before all twenty have entered.
 if((moments.length>=order.length&&active.length>1)||(active.length>=4&&(active.length>=7||moments.length>4&&rng.next()<.43))){
  const values=active.map(id=>{const f=w.fighters.find(x=>x.id===id)!;const joinedAt=order.indexOf(id);return {id,score:surgeStrength(f,w,moments.length-joinedAt)+rng.float(-19,19)};}).sort((a,b)=>a.score-b.score);
  eliminatedId=values[0].id;
  const other=active.filter(id=>id!==eliminatedId).map(id=>({id,score:surgeStrength(w.fighters.find(f=>f.id===id)!,w,1)+rng.float(-6,6)})).sort((a,b)=>b.score-a.score);
  byId=other[0]?.id||null;
  active.splice(active.indexOf(eliminatedId),1);
 }
 moments.push({wave:moments.length+1,entrantId,eliminatedId,byId,remaining:[...active]});
 if(moments.length>=order.length&&active.length===1){t.winnerId=active[0];t.runnerUpId=eliminatedId??undefined;t.status='complete';}
}
/** Resolves all matches while retaining only the already-earned bracket outcomes and records. */
export function finishTournament(w:World,rng:Random){
 let guard=0;
 while(currentTournament(w)&&guard++<90)advanceTournamentBout(w,rng);
 if(currentTournament(w))throw Error('Tournament failed to finish');
}
