import {abilitiesOf,ageOf,clamp,overallOf} from './career';
import {Random} from './random';
import type {ActionCategory,ExchangeBeat,Fighter,FightAction,FightMethod,FightPosition,Mentality,RoundReport,Skill,StatLine,Style} from './types';

/* ───────────────────────────── Tuning ─────────────────────────────
   The displayed win chance is a logistic curve on a rating-point "edge":
   updated for action-based fatigue: approximately a 3-point edge gives 62%,
   a 6-point edge 72%, a 10-point edge 83%, and a 16-point edge 93%.
   Calibration is monitored by the combat balance suite. */
export const ODDS_SCALE=6.2;
/** Exchange-contest sensitivity to a one-point skill difference. */
const K=32;
/** Fight-night form: hidden good/bad-night roll, in rating points. */
const FORM_SD=5.8;
/** Each favourable style matchup is worth this many rating points. */
export const STYLE_EDGE=3;
const EXCHANGES=12;
const EX_SECONDS=300/EXCHANGES;

/** Stat array layout shared by rounds, fights and careers. */
export const STAT={STR:0,STRL:1,SIG:2,SIGL:3,POW:4,POWL:5,TD:6,TDL:7,SUBA:8,KD:9,CTRL:10,DMG:11} as const;
export const STAT_LENGTH=12;
export const emptyStats=():StatLine=>Array(STAT_LENGTH).fill(0);

/* A balanced "rock-paper-scissors" table: each style (except MMA Hybrid) has two
   favourable and two unfavourable matchups, all worth the same edge, so no style
   is better on average. */
const MATCHUPS:readonly (readonly [Style,Style])[]=[
 ['Freestyle Wrestling','Boxing'],['Greco-Roman Wrestling','Boxing'],['Boxing','Karate'],['Boxing','Sumo'],
 ['Muay Thai','Kickboxing'],['Sambo','Kickboxing'],['Kickboxing','Brazilian Jiu-Jitsu'],['Kickboxing','Sumo'],
 ['Muay Thai','Brazilian Jiu-Jitsu'],['Judo','Muay Thai'],['Karate','Muay Thai'],['Karate','Greco-Roman Wrestling'],
 ['Taekwondo','Karate'],['Taekwondo','Sambo'],['Freestyle Wrestling','Taekwondo'],['Judo','Taekwondo'],
 ['Brazilian Jiu-Jitsu','Freestyle Wrestling'],['Sambo','Freestyle Wrestling'],['Greco-Roman Wrestling','Sambo'],['Sumo','Greco-Roman Wrestling'],
 ['Sumo','Judo'],['Brazilian Jiu-Jitsu','Judo']
];
/** Small per-style trims that cancel structural engine biases (measured by the balance suite),
    so the matchup table above is the only systematic style effect. */
export const STYLE_TRIM:Partial<Record<Style,number>>={'Boxing':-0.3,'Kickboxing':2.3,'Muay Thai':2.8,'Karate':0.4,'Taekwondo':-2.9,'Freestyle Wrestling':-1.6,'Greco-Roman Wrestling':-1.3,'Judo':-1.0,'Brazilian Jiu-Jitsu':-0.4,'Sambo':-0.4,'Sumo':-2.4,'MMA Hybrid':4.8};
export function styleAdvantage(a:Style,b:Style):number{
 if(a===b)return 0;
 for(const [strong,weak] of MATCHUPS){if(strong===a&&weak===b)return STYLE_EDGE;if(strong===b&&weak===a)return -STYLE_EDGE;}
 return 0;
}
function sizeEdge(a:Fighter,b:Fighter){return clamp((a.weight-b.weight)*.045,-3,3);}
function conditionPenalty(f:Fighter){return f.condition<40?-12:f.condition<60?-5:f.condition<75?-1.5:0;}
function conditionEdge(a:Fighter,b:Fighter){return (a.condition-b.condition)*.05+conditionPenalty(a)-conditionPenalty(b);}
/** Rating-point edge of A over B, before fight-night form. */
export function matchupEdge(a:Fighter,b:Fighter,year:number){
 return overallOf(a,year)-overallOf(b,year)+styleAdvantage(a.style,b.style)+sizeEdge(a,b)+conditionEdge(a,b);
}
/** Engine-only correction; not part of the displayed odds because it just cancels engine bias. */
const trim=(a:Fighter,b:Fighter)=>(STYLE_TRIM[a.style]||0)-(STYLE_TRIM[b.style]||0);
export function matchupOdds(a:Fighter,b:Fighter,year:number):number{
 return clamp(1/(1+Math.exp(-matchupEdge(a,b,year)/ODDS_SCALE)),.02,.98);
}
export interface OddsBreakdown {rating:number;style:number;size:number;condition:number;total:number;chance:number;}
export function oddsBreakdown(a:Fighter,b:Fighter,year:number):OddsBreakdown{
 const rating=overallOf(a,year)-overallOf(b,year),style=styleAdvantage(a.style,b.style);
 const total=matchupEdge(a,b,year);
 return {rating,style,size:sizeEdge(a,b),condition:conditionEdge(a,b),total,chance:matchupOdds(a,b,year)};
}

/** Combat mentality is an actual tactical rule-set, not a cosmetic badge.
    Energy factor scales every action cost; impact scales landed-strike damage.
    Defence changes shot avoidance and positional contests. */
export const MENTALITY_EFFECTS:Record<Mentality,{volume:number;powerShare:number;energyFactor:number;impact:number;defense:number;exposure:number;summary:string}>={
 Conservative:{volume:-1.05,powerShare:-.06,energyFactor:.77,impact:.92,defense:2.0,exposure:.92,summary:'Measured pace · saves stamina · stronger defence · fewer finishes'},
 Strategist:{volume:-.15,powerShare:0,energyFactor:.91,impact:1,defense:.7,exposure:1,summary:'Adapts rhythm · efficient exchanges · improves later in the fight'},
 Bold:{volume:.55,powerShare:.08,energyFactor:1.12,impact:1.11,defense:-.4,exposure:1.10,summary:'Presses forward · more power · higher fatigue and counter risk'},
 Crazy:{volume:1.35,powerShare:.12,energyFactor:1.34,impact:1.25,defense:-1.8,exposure:1.20,summary:'Violent bursts · major damage and finish potential · burns out quickly'},
 Cold:{volume:0,powerShare:.02,energyFactor:.96,impact:1.02,defense:1.1,exposure:.97,summary:'Composed defence · clinical timing · efficient finishes'},
};
/* ───────────────────────────── Combatants ───────────────────────────── */
type Sk=Record<Skill,number>;
interface Combatant {
 f:Fighter;idx:0|1;sk:Sk;bonus:number;energy:number;damage:number;rocked:number;
 round:StatLine;total:StatLine;kdTaken:number;
 grappleIntent:number;kickShare:number;powerShare:number;volume:number;power:number;chin:number;
 energyFactor:number;impact:number;defense:number;
}
const logit=(p:number)=>Math.log(p/(1-p));
const sigmoid=(x:number)=>1/(1+Math.exp(-x));
function gaussian(rng:Random){const u=Math.max(1e-9,rng.next()),v=rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
/** High stamina makes sustained work markedly cheaper. A 100-stamina fighter uses
    about half the energy of an 85-stamina fighter for the same workload; a 70
    stamina fighter uses more than twice as much. */
function enduranceCost(stamina:number){return clamp(Math.exp((85-stamina)/20),.45,2.6);}
/** Fatigue first erodes effectiveness, then becomes punishing once a fighter is
    running on fumes. It affects offense AND the ability to defend submissions. */
function eff(c:Combatant,s:Skill){
 const tired=100-c.energy;
 const fatigue=tired*.12+Math.max(0,55-c.energy)*.16+Math.max(0,30-c.energy)*.20;
 return c.sk[s]+c.bonus+((s==='Defense'||s==='Footwork')?c.defense:0)-fatigue-c.damage*.09-(c.rocked?12:0);
}
/** Probability that X's offensive skill beats Y's defensive skill, around a base rate. */
function contest(x:number,y:number,base:number,shift=0){return sigmoid(logit(base)+(x-y)/K+shift);}

function makeCombatant(f:Fighter,idx:0|1,year:number,bonus:number):Combatant{
 const sk=abilitiesOf(f,year);
 const grapplePref=(sk.Takedowns+sk.Clinch)/2-(sk.Hands+sk.Kicks)/2;
 const age=ageOf(f,year),mind=MENTALITY_EFFECTS[f.mentality]??MENTALITY_EFFECTS.Strategist;
 return {f,idx,sk,bonus,energy:100,damage:0,rocked:0,round:emptyStats(),total:emptyStats(),kdTaken:0,
  grappleIntent:clamp(.1+grapplePref*.016,.05,.4),
  kickShare:clamp(.32+(sk.Kicks-sk.Hands)*.02,.1,.7),
  powerShare:clamp(.24+mind.powerShare,.12,.50),
  volume:mind.volume,energyFactor:mind.energyFactor,impact:mind.impact,defense:mind.defense,
  power:clamp(.72+(Math.max(sk.Hands,sk.Kicks)-60)*.008+(f.weight-85)*.004,.6,1.5),
  chin:clamp(1.18-(sk.Defense-70)*.01-(f.weight-85)*.002+Math.max(0,age-33)*.035+(mind.exposure-1)*.9,.55,1.7)};
}

/* ───────────────────────────── Strike catalogue ───────────────────────────── */
const PUNCHES:[string,number,boolean][]=[['cross',30,false],['hook',28,true],['uppercut',14,true],['overhand',10,true],['body-shot',18,false]];
const KICKS:[string,number,boolean][]=[['leg-kick',44,false],['body-kick',30,false],['head-kick',20,true],['spinning-kick',6,true]];
function pickWeighted(rng:Random,list:[string,number,boolean][],boost?:(k:string)=>number){
 let total=0;for(const [k,w] of list)total+=w*(boost?boost(k):1);let roll=rng.next()*total;
 for(const item of list){roll-=item[1]*(boost?boost(item[0]):1);if(roll<=0)return item;}return list[list.length-1];
}
const SUBS_TOP=['kimura','arm-triangle','armbar','americana'],SUBS_BACK=['rnc','rnc','body-triangle-choke'],SUBS_GUARD=['triangle','armbar','guillotine','omoplata','heel-hook'];

/* ───────────────────────────── Simulation ───────────────────────────── */
export interface CombatResolution {winnerId:string|null;method:FightMethod;finishRound:number;finishTime:string;rounds:RoundReport[];conditionLossA:number;conditionLossB:number;statsA:StatLine;statsB:StatLine;damageA:number;damageB:number;kdTakenA:number;kdTakenB:number;seconds:number;}
export interface CombatOptions {/** Keep the exchange-by-exchange broadcast data (main events and tournaments). */record?:boolean;}

export function simulateCombat(a:Fighter,b:Fighter,year:number,rng:Random,roundLimit:2|3|5=3,opts:CombatOptions={}):CombatResolution{
 if(a.id===b.id)throw Error('Fighter cannot compete against themselves');
 const record=opts.record??false;
 // Fight-level edges (style, size, condition) plus hidden fight-night form.
 const edge=matchupEdge(a,b,year)-(overallOf(a,year)-overallOf(b,year))+trim(a,b);
 const formSd=(f:Fighter)=>FORM_SD*(f.mentality==='Crazy'?1.45:f.mentality==='Cold'?.75:1);
 const formA=gaussian(rng)*formSd(a),formB=gaussian(rng)*formSd(b);
 const x=makeCombatant(a,0,year,formA+edge/2),y=makeCombatant(b,1,year,formB-edge/2);
 const both=[x,y] as const;const other=(c:Combatant)=>c===x?y:x;
 // Three judges, each with their own leaning toward striking, grappling or damage.
 const judges=[0,1,2].map(()=>({strike:1+rng.float(-.3,.3),grapple:1+rng.float(-.35,.35),damage:1+rng.float(-.3,.3)}));
 const rounds:RoundReport[]=[];
 let winnerId=null as string|null,method='UD' as FightMethod,finishRound:number=roundLimit,finishTime='5:00',seconds=0;
 const cardTotals=judges.map(()=>[0,0]);

 for(let r=1;r<=roundLimit&&!winnerId;r++){
  x.round=emptyStats();y.round=emptyStats();x.rocked=0;y.rocked=0;
  let pos:FightPosition='Stand-up',top:Combatant|null=null,gpos=0;
  const timeline:ExchangeBeat[]=[];
  const notes:string[]=r===1?[`${a.name}: ${a.mentality} — ${MENTALITY_EFFECTS[a.mentality]?.summary??'adaptive fighter'}.`,`${b.name}: ${b.mentality} — ${MENTALITY_EFFECTS[b.mentality]?.summary??'adaptive fighter'}.`]:[];
  const roundDamage=[x.damage,y.damage];
  const lateBonus=(c:Combatant)=>c.f.mentality==='Strategist'&&r>=2?1.5:0;
  for(let ex=0;ex<EXCHANGES&&!winnerId;ex++){
   const acts:FightAction[]=[];
   const start=ex*EX_SECONDS;
   const act=(by:Combatant,k:string,c:ActionCategory)=>{if(record)acts.push({t:0,by:by.idx,k,c});};
   const note=(text:string)=>{if(notes.length<4)notes.push(text);};
   const finish=(w:Combatant,m:FightMethod,k:string)=>{
    winnerId=w.f.id;method=m;finishRound=r;
    const sec=Math.min(299,Math.floor(start+EX_SECONDS*(.35+rng.next()*.6)));
    finishTime=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;seconds+=sec;
    act(w,k,'finish');
    const l=other(w);
    note(m==='SUB'?`${w.f.name} locks it in — ${l.f.name} taps out!`:m==='KO'?`${w.f.name} lands the knockout blow! ${l.f.name} is out cold.`:`${w.f.name} unloads until the referee waves it off!`);
   };
   // Workload is charged for every strike, takedown and positional struggle, not
   // just once per exchange. Heavier bodies have a small additional cost.
   const spend=(c:Combatant,load:number)=>{
    const weight=1+Math.max(0,c.f.weight-95)*.004;
    c.energy=clamp(c.energy-load*enduranceCost(c.sk.Stamina)*weight*.88*c.energyFactor,2,100);
   };
   const dealt=(att:Combatant,def:Combatant,amount:number)=>{
    def.damage+=amount;spend(def,amount*.045);
    att.round[STAT.DMG]+=amount;att.total[STAT.DMG]+=amount;
   };
   const stat=(c:Combatant,i:number,n=1)=>{c.round[i]+=n;c.total[i]+=n;};

   /** One fighter's striking flurry. Returns true if the fight ended. */
   const flurry=(att:Combatant,def:Combatant,count:number,mode:'range'|'clinch'|'ground'):boolean=>{
    for(let s=0;s<count;s++){
     let key:string,isPower:boolean,dmg:number,sig=true;
     if(mode==='range'){
      if(rng.next()<.34){key='jab';isPower=false;sig=false;dmg=.45;}
      else if(rng.next()<att.kickShare){const k=pickWeighted(rng,KICKS,k=>k==='spinning-kick'&&(att.f.style==='Taekwondo'||att.f.style==='Karate'||att.f.mentality==='Crazy')?3:1);key=k[0];isPower=k[2]||rng.next()<att.powerShare*.5;dmg=key==='leg-kick'?1:1.4;}
      else{const p=pickWeighted(rng,PUNCHES);key=p[0];isPower=p[2]&&rng.next()<att.powerShare*2.2;dmg=1.3;}
     }else if(mode==='clinch'){const roll=rng.next();key=roll<.42?'knee':roll<.68?'elbow':roll<.85?'uppercut':'short-punch';isPower=key!=='short-punch'&&rng.next()<att.powerShare*1.3;dmg=key==='knee'?1.5:1.25;if(key==='short-punch')sig=rng.next()<.5;}
     else{key=rng.next()<.3?'gnp-elbow':'gnp';isPower=gpos>=3&&rng.next()<.35;dmg=1.1+gpos*.2;}
     const strikeSkill=mode==='ground'?eff(att,'Ground Control'):mode==='clinch'?(eff(att,'Clinch')+eff(att,'Hands'))/2:key.includes('kick')?eff(att,'Kicks'):eff(att,'Hands');
     const defense=mode==='ground'?(eff(def,'Defense')+eff(def,'Ground Control'))/2:mode==='clinch'?(eff(def,'Defense')+eff(def,'Clinch'))/2:(eff(def,'Defense')*.7+eff(def,'Footwork')*.3);
     const base=(key==='jab'?.5:isPower?.3:.4)+(mode==='ground'?.12+gpos*.04:0)+(def.rocked?.15:0);
     // Throwing costs energy even when the blow misses. Defending sustained
     // combinations also has a measurable (but smaller) energy demand.
     spend(att,isPower?.62:key==='jab'?.23:.36);
     spend(def,mode==='ground'?.28:mode==='clinch'?.22:.18);
     stat(att,STAT.STR);if(sig)stat(att,STAT.SIG);if(isPower)stat(att,STAT.POW);
     if(rng.next()>=contest(strikeSkill+lateBonus(att),defense+lateBonus(def),clamp(base,.08,.85)))continue;
     stat(att,STAT.STRL);if(sig)stat(att,STAT.SIGL);if(isPower)stat(att,STAT.POWL);
     const hurt=dmg*(isPower?1.8:1)*att.power*(sig?1:.4)*att.impact;dealt(att,def,hurt);
     if(sig)act(att,key,'strike');
     if(!isPower)continue;
     // Knockdowns come from clean power shots; accumulated damage and a rocked state make them likelier.
     const kd=clamp(.049*att.power*def.chin*(1+def.damage/38)*(def.rocked?2.2:1)*(key==='head-kick'||key==='spinning-kick'?1.6:1)*(mode==='ground'?.45:1),0,.6);
     if(rng.next()<kd){
      stat(att,STAT.KD);def.kdTaken++;def.rocked=2;dealt(att,def,6);
      const instant=clamp(.16+def.damage/220+(key==='head-kick'||key==='spinning-kick'?.12:0)+(att.f.mentality==='Cold'?.05:0),.1,.55);
      if(rng.next()<instant){finish(att,'KO','ko');return true;}
      act(att,mode==='ground'?'rocked':'knockdown','impact');
      note(`${att.f.name} ${mode==='ground'?'rocks':'drops'} ${def.f.name} with ${key.startsWith('gnp')?'ground strikes':`a ${key.replace(/-/g,' ')}`}!`);
      // Follow-up: the referee is watching closely.
      const pounce=clamp(.23*att.power+(att.f.mentality==='Cold'?.08:0)+(att.f.mentality==='Bold'?.05:0)+def.damage/300-(def.sk.Defense-70)*.004,.08,.6);
      if(rng.next()<pounce){finish(att,'TKO','tko');return true;}
     }else if(def.rocked&&rng.next()<clamp(.1*att.power+def.damage/400,0,.35)){finish(att,'TKO','tko');return true;}
     else if(def.damage>86&&rng.next()<(def.damage-86)*.012){finish(att,'TKO','tko');return true;}
    }
    return false;
   };
   const trySub=(att:Combatant,def:Combatant,name:string,base:number,bottomAttack=false):boolean=>{
    stat(att,STAT.SUBA);
    spend(att,1.15); // Isometric grip fighting and submission entries are costly.
    spend(def,.90);
    const positionalEdge=eff(att,'Ground Control')-eff(def,'Ground Control');
    // Being underneath a superior controller greatly reduces the chance of
    // securing the final grip/angle. Guard submissions are still possible,
    // especially against a top player with weak submission defense.
    const positionalShift=bottomAttack?clamp(positionalEdge*.065-.55,-1.65,.35):clamp(positionalEdge*.026,-.4,.5);
    const p=contest(eff(att,'Submissions'),eff(def,'Submissions')*.5+eff(def,'Ground Control')*.5,
      base, positionalShift+def.damage*.004+(def.energy<28?.16:0));
    if(rng.next()<p){
     if(bottomAttack)note(`${att.f.name} catches ${def.f.name} in a rare submission counter from guard.`);
     finish(att,'SUB','tap');return true;
    }
    act(att,`${name}-att`,'sub');act(def,`${name}-esc`,'sub');
    if(rng.next()<.35)note(`${att.f.name} threatens a ${name.replace(/-/g,' ')}, but ${def.f.name} escapes.`);
    return false;
   };

   if(pos==='Stand-up'){
    const r0=rng.next(),gx=x.grappleIntent*(x.rocked?.5:1),gy=y.grappleIntent*(y.rocked?.5:1);
    // A rocked opponent invites a dive on top.
    const shooter=r0<gx+(y.rocked?.15:0)?x:r0<gx+gy+(y.rocked?.15:0)+(x.rocked?.15:0)?y:null;
    if(shooter){
     const def=other(shooter);
     const wantsClinch=shooter.sk.Clinch>shooter.sk.Takedowns+3||rng.next()<.25;
     if(wantsClinch){
      if(rng.next()<contest(eff(shooter,'Clinch'),eff(def,'Footwork'),.62)){pos='Clinch';top=shooter;act(shooter,'clinch','grapple');}
      else{flurry(def,shooter,1+rng.int(0,2),'range');}
      spend(shooter,1);spend(def,.6);
     }else{
      stat(shooter,STAT.TD);
      if(rng.next()<contest(eff(shooter,'Takedowns'),eff(def,'Takedowns')*.5+eff(def,'Footwork')*.5,.37,def.rocked?.8:0)){
       stat(shooter,STAT.TDL);pos='Ground';top=shooter;gpos=rng.next()<.3?1:0;act(shooter,'takedown','grapple');
       if(rng.next()<.25)note(`${shooter.f.name} drives through for a takedown.`);
      }else{act(def,'td-stuffed','grapple');if(rng.next()<.4)flurry(def,shooter,1+rng.int(0,1),'range');}
      spend(shooter,1.6);spend(def,.9);
     }
    }else{
     // A badly fatigued fighter protects themself and has less output late.
     const vol=(c:Combatant)=>Math.max(1,Math.round(2.2+rng.next()*2.6+c.volume-
       (c.energy<55?1:0)-(c.energy<32?1:0)-(c.rocked?1:0)));
     // Whoever wins the timing exchange throws first.
     const first=rng.next()<contest(eff(x,'Footwork'),eff(y,'Footwork'),.5)?x:y;
     if(!flurry(first,other(first),vol(first),'range'))flurry(other(first),first,vol(other(first)),'range');
     spend(x,.5);spend(y,.5);
    }
   }else if(pos==='Clinch'){
    const ctrl=rng.next()<contest(eff(x,'Clinch'),eff(y,'Clinch'),.5)?x:y,opp=other(ctrl);
    stat(ctrl,STAT.CTRL,Math.round(EX_SECONDS*.5));
    const roll=rng.next();
    if(roll<.26+Math.max(0,opp.sk.Footwork-ctrl.sk.Clinch)*.01){pos='Stand-up';top=null;act(opp,'clinch-break','grapple');flurry(opp,ctrl,1,'range');}
    else if(roll<.26+ctrl.grappleIntent*.9){
     stat(ctrl,STAT.TD);
     if(rng.next()<contest((eff(ctrl,'Clinch')+eff(ctrl,'Takedowns'))/2,(eff(opp,'Clinch')+eff(opp,'Takedowns'))/2,.48)){
      stat(ctrl,STAT.TDL);pos='Ground';top=ctrl;gpos=rng.next()<.45?1:0;act(ctrl,ctrl.sk.Clinch>ctrl.sk.Takedowns?'throw':'trip','grapple');
      if(rng.next()<.3)note(`${ctrl.f.name} hits a beautiful ${ctrl.sk.Clinch>ctrl.sk.Takedowns?'throw':'trip'} from the clinch.`);
     }else act(opp,'td-stuffed','grapple');
     spend(ctrl,1.4);spend(opp,1);
    }else{
     if(!flurry(ctrl,opp,1+rng.int(1,3),'clinch'))flurry(opp,ctrl,rng.int(0,2),'clinch');
     spend(ctrl,1);spend(opp,1);
    }
   }else{
    const t=top!,bot=other(t);
    stat(t,STAT.CTRL,EX_SECONDS);
    // Bottom fighter: sweep, scramble up, or attack from guard.
    // Full guard permits a counter; bottom submissions become increasingly
    // implausible in half-guard and impossible under side control, mount or back.
    const positionalDefense=eff(t,'Ground Control')*.8+eff(t,'Takedowns')*.2;
    const bottomMobility=eff(bot,'Ground Control')*.63+eff(bot,'Footwork')*.25+eff(bot,'Stamina')*.12;
    const escapeBase=[.31,.235,.16,.07,.045][gpos]??.033;
    const escape=contest(bottomMobility,positionalDefense,escapeBase);
    const guardPressure=clamp(.35+(
      eff(bot,'Submissions')*.5+eff(bot,'Ground Control')*.5-
      eff(t,'Ground Control')*.65-eff(t,'Submissions')*.35)*.034,.035,1.15);
    const guardChance=gpos<=1?
      clamp(.012+(bot.sk.Submissions-80)*.0019,.003,.067)*guardPressure*(gpos===1?.3:1):0;
    const guardSub=rng.next()<guardChance;
    if(guardSub){
     // A rare direct submission from guard. If it fails, the top player remains
     // in control and may advance position on the following exchange.
     trySub(bot,t,rng.pick(SUBS_GUARD),gpos===1?.055:.082,true);
     spend(bot,.8);spend(t,.35);
    }else if(rng.next()<escape){
     const sweepChance=clamp(.23+(bottomMobility-positionalDefense)*.012,.09,.48);
     if(rng.next()<sweepChance){top=bot;gpos=0;act(bot,'sweep','grapple');}
     else{pos='Stand-up';top=null;gpos=0;act(bot,'stand-up','grapple');}
     spend(bot,1.65+gpos*.24);spend(t,.60);
    }else{
     // Top control creates the route to mount/back, high-percentage attacks,
     // and sustained pressure. Submissions require achieving position first.
     const subChance=gpos>=2?clamp(.04+gpos*.028+(t.sk.Submissions-72)*.0035+
       (eff(t,'Ground Control')-eff(bot,'Ground Control'))*.002,.018,.30)*.55:0;
     if(rng.next()<subChance)trySub(t,bot,gpos===4?rng.pick(SUBS_BACK):rng.pick(SUBS_TOP),gpos===4?.24:gpos===3?.17:.10);
     else if(gpos<3&&rng.next()<contest(eff(t,'Ground Control'),eff(bot,'Ground Control'),.35)){
      gpos++;
      if(gpos===2&&rng.next()<.25){gpos=4;act(t,'back-take','grapple');}
      else act(t,gpos===1?'half-guard':gpos===2?'guard-pass':'mount','grapple');
      if(gpos>=3&&rng.next()<.4)note(`${t.f.name} ${gpos===4?'takes the back':'climbs to full mount'}.`);
     }
     if(!winnerId)flurry(t,bot,1+rng.int(0,1)+(gpos>=2?1:0),'ground');
     spend(t,.6);spend(bot,1.15+gpos*.22);
    }
   }
   // Baseline exertion and distance-management cost every exchange, even
   // without attacks. Ground escapes and busy flurries add costs above this.
   spend(x,.45);spend(y,.45);
   if(ex===8)for(const c of both){
    if(c.f.mentality==='Crazy'&&c.energy<44&&notes.length<4)notes.push(`${c.f.name}'s reckless pace is draining the tank.`);
    if(c.f.mentality==='Conservative'&&c.energy>70&&notes.length<4)notes.push(`${c.f.name} is preserving energy with a measured defence.`);
   }
   if(!winnerId){x.rocked=Math.max(0,x.rocked-1);y.rocked=Math.max(0,y.rocked-1);}
   if(record){
    const span=winnerId?Math.max(1,Number(finishTime.split(':')[0])*60+Number(finishTime.split(':')[1])-start):EX_SECONDS;
    acts.forEach((item,i)=>{item.t=Math.round(start+span*(i+1)/(acts.length+1));});
    timeline.push({elapsed:winnerId?start+span:Math.round(start+EX_SECONDS),position:pos,top:top?top.idx:undefined,acts,sa:[...x.round],sb:[...y.round],staminaA:Math.round(x.energy),staminaB:Math.round(y.energy),damageA:Math.round(x.damage),damageB:Math.round(y.damage)});
   }
  }
  if(!winnerId)seconds+=300;
  // Judges score each round from what actually happened in it.
  const dmgA=x.damage-roundDamage[0],dmgB=y.damage-roundDamage[1];
  const perf=(s:StatLine,dmgDealt:number,j:typeof judges[number])=>
   j.strike*(s[STAT.SIGL]*1+(s[STAT.STRL]-s[STAT.SIGL])*.25+s[STAT.POWL]*.8)+j.grapple*(s[STAT.TDL]*2.2+s[STAT.CTRL]/25*1.1+s[STAT.SUBA]*1.6)+j.damage*(s[STAT.KD]*7+dmgDealt*.25);
  const cards=judges.map((j,ji)=>{
   const diff=perf(x.round,dmgB,j)-perf(y.round,dmgA,j)+rng.float(-6,6);
   let sa=10,sb=10;
   const dominance=(s:StatLine,dmg:number)=>s[STAT.KD]>=1&&dmg>18||dmg>34;
   if(Math.abs(diff)<.35){/* 10-10 */}
   else if(diff>0){sb=diff>36&&dominance(x.round,dmgB)||diff>66?8:9;}
   else{sa=-diff>36&&dominance(y.round,dmgA)||-diff>66?8:9;}
   if(!winnerId){cardTotals[ji][0]+=sa;cardTotals[ji][1]+=sb;}
   return [sa,sb] as [number,number];
  });
  const med=(i:0|1)=>cards.map(c=>c[i]).sort((p,q)=>p-q)[1];
  // A stopped round is never scored by the judges.
  rounds.push({number:r,scoreA:winnerId?10:med(0),scoreB:winnerId?10:med(1),...(winnerId?{}:{cards}),a:x.round.map(Math.round),b:y.round.map(Math.round),staminaA:Math.round(x.energy),staminaB:Math.round(y.energy),notes,...(record?{timeline}:{})});
  if(!winnerId){
   // One-minute corner recovery: higher stamina recovers modestly more, but
   // it cannot erase the cost of an unsustainably aggressive pace.
   for(const c of both)c.energy=clamp(c.energy+5.5+c.sk.Stamina*.07,2,100);
   x.damage*=.92;y.damage*=.92;
  }
 }
 if(!winnerId){
  // Unscored rounds of a finished fight never reach the cards; a decision uses all rounds.
  const votes=cardTotals.map(([p,q])=>p>q?1:p<q?-1:0);
  const forA=votes.filter(v=>v===1).length,forB=votes.filter(v=>v===-1).length;
  if(forA>=2||forB>=2){
   winnerId=forA>forB?a.id:b.id;
   method=forA===3||forB===3?'UD':(forA===2&&forB===1)||(forB===2&&forA===1)?'SD':'MD';
  }else method='DRAW';
 }
 const stopped=method==='KO'||method==='TKO'||method==='SUB';
 const loss=(c:Combatant,lost:boolean)=>clamp(Math.round(6+c.damage*.3+(stopped&&lost?11:0)+rounds.length*1.1),6,57);
 return {winnerId,method,finishRound,finishTime,rounds,conditionLossA:loss(x,winnerId===b.id),conditionLossB:loss(y,winnerId===a.id),
  statsA:x.total.map(v=>Math.round(v)),statsB:y.total.map(v=>Math.round(v)),damageA:Math.round(x.damage),damageB:Math.round(y.damage),kdTakenA:x.kdTaken,kdTakenB:y.kdTaken,seconds};
}
