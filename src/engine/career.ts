import {ARCHETYPES,MENTALITIES,SKILLS,STYLES,STYLE_OFFSETS,REGIONS,REGION_DIVISIONS,START_YEAR,BRANDS,TOP_DIVISION,SECOND_DIVISION,isTopDivision,isSecondDivision} from './constants';
import {countriesIn,NAME_POOLS,type Country} from './names';
import {Random} from './random';
import type {Fighter,Rarity,Archetype,Region,Style,Division,Skill,ProfileAppearance,World} from './types';
export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export const ageOf=(fighter:Fighter,year:number)=>year-fighter.birthYear;
export const baseOf=(fighter:Fighter,year:number)=>fighter.curve[clamp(ageOf(fighter,year)-18,0,fighter.curve.length-1)];
export const overallOf=(fighter:Fighter,year:number)=>clamp(baseOf(fighter,year)+fighter.shape,30,100);
export function abilitiesOf(fighter:Fighter,year:number):Record<Skill,number>{
  // Shape affects all nine effective skills equally; the skill mean remains exactly the displayed overall.
  const target=overallOf(fighter,year);
  const raw=SKILLS.map((_,i)=>target+fighter.skillOffsets[i]+fighter.skillNoise[i]);
  const values=raw.map(x=>clamp(Math.round(x),1,100));
  let gap=target*9-values.reduce((a,b)=>a+b,0);
  // Conserve the 9-skill arithmetic average, including at the 1/100 boundaries.
  let pass=0;
  while(gap!==0&&pass++<1500){
    const order=SKILLS.map((_,i)=>i).sort((a,b)=> gap>0 ? (values[a]-raw[a])-(values[b]-raw[b]) : (values[b]-raw[b])-(values[a]-raw[a]));
    let moved=false;
    for(const i of order){if(gap>0&&values[i]<100){values[i]++;gap--;moved=true;}else if(gap<0&&values[i]>1){values[i]--;gap++;moved=true;}if(gap===0)break;}
    if(!moved)break;
  }
  return Object.fromEntries(SKILLS.map((s,i)=>[s,values[i]])) as Record<Skill,number>;
}
export const conditionLabel=(c:number)=>c<40?'INJURED':c<60?'FRAGILE':c<80?'FIT':c<90?'VERY GOOD':'PEAK';
export const regionDivision=(r:Region,tier:1|2):Division=>REGION_DIVISIONS[r][tier-1];
const nicknames=['The Vanguard','Iron Pulse','The Wraith','Ghostline','The Tempest','Obsidian','The Architect','Red Horizon','The Wolf','Blackout','The Avalanche','The Cipher','Thunderstrike','The Nomad','No Mercy','The Titan','The Phantom','The Anvil','Wildfire','The Monolith','Nightfall','The Comet','The Viper','The Sentinel','The Hammer','The Oracle','The Hurricane','Stonewall','The Matador','Quicksilver','The Samurai','Iron Will','The Butcher','Night Train','The Hammerhead','Silent Storm','The Jaguar','Rampage','The Diamond','Bulldozer','The Eagle','Lights Out','The Professor','Mountain','The Shark','Cyclone','The Bull','Black Mamba','The Prodigy','Thunder','The Rock','Zen','The Ghost','Kingpin','The Machine','Little Tiger','The Reaper','Ironclad','The Viking','Sandstorm','The Pharaoh','Tsunami','The Spartan','Hurricane Heart','The Natural','Juggernaut'];
/* Peak ranges by rarity. Generational talents peak around 95 and legends around 92;
   with a maximum +5 of form that is 100 and 97 at their very best. */
export const PEAK_RANGES:Record<Rarity,[number,number]>={Generational:[94,96],Legend:[90,93],Epic:[85,88],Rare:[79,83],Uncommon:[72,77],Common:[64,73]};
/** Population targets for active fighters at any moment. */
export const RARITY_TARGETS={Generational:[2,3],Legend:[8,10],Epic:[15,20]} as const;
function profile(rng:Random):ProfileAppearance {return {skin:rng.int(0,7),hair:rng.int(0,6),hairStyle:rng.int(0,9),facialHair:rng.int(0,5),face:rng.int(0,5),expression:rng.int(0,3),accessory:rng.int(0,8),scar:rng.next()<0.13};}
function planAge(rng:Random,division:Division):number {
  if(isTopDivision(division))return rng.int(26,36);
  if(isSecondDivision(division))return rng.int(23,38);
  if(division.endsWith('D1'))return rng.int(22,38);
  return rng.int(18,39);
}
/** The elite have long careers: a plateau at the top and a slow decline. Everyone else gets a random shape. */
const LONG_CAREER:readonly Archetype[]=['Classical Prime','Durable Veteran','Early Phenomenon','Late Bloomer','Classical Prime'];
function archetypeFor(rng:Random,rarity:Rarity):Archetype{return rarity==='Generational'||rarity==='Legend'?rng.pick(LONG_CAREER):rng.pick(ARCHETYPES);}
function curveFor(rng:Random,rarity:Rarity,archetype:Archetype):number[] {
  const [lo,hi]=PEAK_RANGES[rarity];const peak=rng.int(lo,hi);
  const elite=rarity==='Generational'?1:rarity==='Legend'?.6:0;
  const peakAge = archetype==='Early Phenomenon'?rng.int(24,28):archetype==='Classical Prime'?rng.int(27,31):archetype==='Late Bloomer'?rng.int(31,34):archetype==='Shooting Star'?rng.int(26,32):archetype==='Durable Veteran'?rng.int(28,32):rng.int(26,34);
  const plateau=Math.round(elite*3+(rarity==='Legend'?.5:0)); // years held at the top
  const growth=rng.float(0.75,1.05),decline=rng.float(0.8,1.25)*(1-elite*.45);
  const swings=Array.from({length:25},()=>rng.float(-2.5,2.5));
  return Array.from({length:28},(_,i)=>{
    const age=i+18;let rating=peak;
    if(age<peakAge){const d=peakAge-age;rating-=Math.pow(d,1.18)*growth*1.62;}
    else if(age<=peakAge+plateau){rating-=(age-peakAge)*.25;}
    else {const d=age-peakAge-plateau;rating-=plateau*.25+Math.pow(d,1.34)*decline*(archetype==='Durable Veteran'?0.46:archetype==='Late Bloomer'?0.74:archetype==='Shooting Star'?1.85:1.05);}
    if(archetype==='Shooting Star'&&age>=peakAge-1&&age<=peakAge+1)rating+=2;
    if(archetype==='Volatile Talent')rating+=(age%5===0?3:-1.2)+(swings[Math.min(i,24)]||0)*0.8;
    if(archetype==='Durable Veteran'&&age>peakAge+2&&age<peakAge+8)rating+=2;
    // Nobody exceeds the ceiling of their rarity.
    return clamp(Math.round(rating),37,hi);
  });
}
const styleWeights=(region:Region):readonly (readonly [Style,number])[]=>STYLES.map(s=>[s, s==='MMA Hybrid'?10:s==='Sumo'?(region==='APAC'?7:1):s==='Judo'&&region==='APAC'?10:s==='Muay Thai'&&region==='APAC'?10:s==='Boxing'&&region==='Americas'?13:s==='Brazilian Jiu-Jitsu'&&region==='Americas'?12:s==='Sambo'&&region==='Europe & Middle East'?9:6] as const);
/** Key countries produce almost all generational talents and most legends; anyone can come from anywhere. */
const KEY_SHARE:Partial<Record<Rarity,number>>={Generational:.95,Legend:.75,Epic:.62};
export function pickCountry(rng:Random,region:Region,rarity:Rarity):Country{
  const all=countriesIn(region),share=KEY_SHARE[rarity];
  const pool=share===undefined?all:rng.next()<share?all.filter(c=>c.key):all.filter(c=>!c.key);
  return rng.weighted(pool.map(c=>[c,c.weight] as const));
}
function pickName(rng:Random,country:Country,existing:Set<string>,id:number){
  let name='',tries=0;
  do{const hh=rng.weighted(country.heritages.map(x=>[x,x.weight] as const));name=`${rng.pick(NAME_POOLS[hh.first].first)} ${rng.pick(NAME_POOLS[hh.last].last)}`;tries++;}while(existing.has(name)&&tries<60);
  if(existing.has(name))name=`${name} ${id}`;
  existing.add(name);return name;
}
export type AgeMode='prime'|'declining'|[number,number];
export interface CreateOptions {rookie?:boolean;age?:AgeMode;country?:Country;}
export function createFighter(rng:Random,id:number,region:Region,division:Division,rarity:Rarity,year:number,existingNames:Set<string>,opts:CreateOptions={}):Fighter {
  const country=opts.country??pickCountry(rng,region,rarity);
  const name=pickName(rng,country,existingNames,id);
  const style=rng.weighted(styleWeights(region));const archetype=archetypeFor(rng,rarity);
  const curve=curveFor(rng,rarity,archetype);
  const peakAge=18+curve.indexOf(Math.max(...curve));
  let age=opts.rookie?rng.int(18,21):planAge(rng,division);
  const mode=opts.age??(isTopDivision(division)?'prime':undefined);
  if(Array.isArray(mode))age=rng.int(mode[0],mode[1]);
  else if(mode==='declining')age=clamp(peakAge+rng.int(4,6),30,37);
  else if(mode==='prime'){
    // Established fighters near their actual peak (the S-Tier minimum age is 24).
    const ages=Array.from({length:13},(_,i)=>i+24).filter(a=>curve[a-18]>=Math.max(...curve)-3);
    age=ages.length?rng.pick(ages):Array.from({length:13},(_,i)=>i+24).sort((a,b)=>curve[b-18]-curve[a-18])[0];
  }
  if(isTopDivision(division))age=Math.max(24,age);
  const offsets=[...STYLE_OFFSETS[style]];const mean=offsets.reduce((a,b)=>a+b,0)/9;
  const noise=SKILLS.map(()=>rng.int(-3,3));const noiseMean=noise.reduce((a,b)=>a+b,0)/9;
  let weight=Math.round(style==='Sumo'?rng.float(125,185):style.includes('Wrestling')||style==='Sambo'?rng.float(82,112):rng.float(65,102));
  if(style==='Brazilian Jiu-Jitsu')weight=rng.int(68,105);
  const height=Math.round(style==='Sumo'?rng.float(177,202):rng.float(166,201));
  const f:Fighter={fame:0,id:`nx-${id}`,name,nickname:rng.pick(nicknames),country:country.name,flag:country.flag,region,birthYear:year-age,height,weight,reach:Math.round(height+rng.int(-5,13)),style,mentality:rng.pick(MENTALITIES),archetype,rarity,appearance:profile(rng),potential:Math.max(...curve),curve,skillOffsets:offsets.map(v=>Math.round((v-mean)*100)/100),skillNoise:noise.map(v=>Math.round((v-noiseMean)*100)/100),shape:rng.int(-2,2),condition:rng.int(68,94),division,rank:0,status:'active',joinedYear:year,history:[],rankingPoints:1250,record:{wins:0,losses:0,draws:0,kos:0,submissions:0,decisions:0,streak:0,longestWinStreak:0},injuryUntil:0};
  return f;
}
export function rankDivision(world:World,division:Division):Fighter[]{return world.fighters.filter(f=>f.status==='active'&&f.division===division).sort((a,b)=>a.rank-b.rank);}
export function regionRoster(world:World,region:Region):Fighter[]{return world.fighters.filter(f=>f.status==='active'&&f.region===region);}

/* ───────────── Founding universe ─────────────
   The two brands' S divisions (28 places): two generational fighters, six legends, twelve epics and eight rares at their peak.
   Their II divisions (28): a declining legend, a young legend, three epics, fourteen rares and nine uncommons.
   Each rarity group is dealt alternately to NOVA and ONYX so the brands start even.
   Continental divisions: a rising generational talent, two young legends, a few young epics, the rest rare and below.
   The three generational fighters come from three different regions; every region has at least two legends. */
export interface FoundingSlot {division:Division;region:Region;rarity:Rarity;age?:AgeMode;}
export function foundingPlan(rng:Random):FoundingSlot[]{
  const order=rng.shuffle([...REGIONS]);
  const top:Omit<FoundingSlot,'division'>[]=[],second:Omit<FoundingSlot,'division'>[]=[];
  const add=(list:Omit<FoundingSlot,'division'>[],rarity:Rarity,region:Region,age?:AgeMode)=>list.push({region,rarity,age});
  add(top,'Generational',order[0],'prime');add(top,'Generational',order[1],'prime');
  const legendRegions=[order[2],order[3],order[0],order[1],order[2],order[3],order[0],order[1],order[2],order[3]];
  for(let i=0;i<6;i++)add(top,'Legend',legendRegions[i],'prime');
  add(second,'Legend',legendRegions[6],'declining');add(second,'Legend',legendRegions[7],[21,23]);
  const cycle=(i:number)=>REGIONS[i%4];
  for(let i=0;i<12;i++)add(top,'Epic',cycle(i),'prime');
  for(let i=0;i<8;i++)add(top,'Rare',cycle(i+3),'prime');
  for(let i=0;i<3;i++)add(second,'Epic',cycle(i+1),i<2?[21,24]:undefined);
  for(let i=0;i<14;i++)add(second,'Rare',cycle(i+2));
  for(let i=0;i<9;i++)add(second,'Uncommon',cycle(i),i<3?'prime':undefined);
  // Deal each list alternately: same rarity mix on both brands, a coin flip deciding who picks first.
  const deal=(list:Omit<FoundingSlot,'division'>[],tier:'top'|'second'):FoundingSlot[]=>{
    const first=rng.next()<.5?0:1;
    return list.map((x,i)=>({...x,division:(tier==='top'?TOP_DIVISION:SECOND_DIVISION)[BRANDS[(i+first)%2]]}));
  };
  const slots=[...deal(top,'top'),...deal(second,'second')];
  const d1Special:FoundingSlot[]=[{division:regionDivision(order[2],1),region:order[2],rarity:'Generational',age:[19,20]},
   {division:regionDivision(legendRegions[8],1),region:legendRegions[8],rarity:'Legend',age:[19,22]},{division:regionDivision(legendRegions[9],1),region:legendRegions[9],rarity:'Legend',age:[19,22]}];
  // Continental divisions: specials first, then a shuffled bag dealt so each division has exactly twenty.
  const epicD1=rng.shuffle([...REGIONS]).slice(0,2),epicD2=rng.pick(REGIONS);
  const regional:FoundingSlot[]=[...d1Special,...epicD1.map(r=>({division:regionDivision(r,1),region:r,rarity:'Epic' as Rarity,age:[19,22] as AgeMode})),{division:regionDivision(epicD2,2),region:epicD2,rarity:'Epic',age:[18,19]}];
  const d1Bag=rng.shuffle([...Array<Rarity>(20).fill('Rare'),...Array<Rarity>(30).fill('Uncommon'),...Array<Rarity>(25).fill('Common')]);
  const d2Bag=rng.shuffle([...Array<Rarity>(6).fill('Rare'),...Array<Rarity>(33).fill('Uncommon'),...Array<Rarity>(40).fill('Common')]);
  for(const r of REGIONS)for(const tier of [1,2] as const){
    const division=regionDivision(r,tier),have=regional.filter(x=>x.division===division).length,bag=tier===1?d1Bag:d2Bag;
    for(let i=have;i<20;i++)regional.push({division,region:r,rarity:bag.pop()!});
  }
  return [...slots,...regional];
}

/* ───────────── Annual intake ─────────────
   New prospects keep the population near its targets: 2–3 generational talents (in different regions
   where possible), 8–10 legends (every region represented), 15–20 epics. */
export function planRookieRarities(w:World,rng:Random,slots:Region[]):Rarity[]{
  const active=w.fighters.filter(f=>f.status==='active');
  const count=(r:Rarity)=>active.filter(f=>f.rarity===r).length;
  const out:(Rarity|null)[]=slots.map(()=>null);
  const place=(rarity:Rarity,preferred:Region[]):Region|null=>{
    for(const region of [...preferred,...REGIONS]){const i=slots.findIndex((s,j)=>s===region&&!out[j]);if(i>=0){out[i]=rarity;return region;}}
    return null;
  };
  const gens=count('Generational');
  const genRegions=new Set(active.filter(f=>f.rarity==='Generational').map(f=>f.region));
  // Below two generational talents the gap is filled at once; at two, a 25% chance of a third,
  // so two generationals rarely arrive in the same class. They go to regions without one, the fewer legends the better.
  const genSpawns=gens<2?2-gens:gens===2?(rng.next()<.25?1:0):0;
  const legendsIn=(r:Region)=>active.filter(f=>f.rarity==='Legend'&&f.region===r).length;
  for(let i=0;i<genSpawns;i++){
    const open=REGIONS.filter(r=>!genRegions.has(r)).map(r=>({r,k:legendsIn(r)+rng.next()*.9})).sort((a,b)=>a.k-b.k).map(x=>x.r);
    const placed=place('Generational',open);if(placed)genRegions.add(placed);
  }
  const legends=count('Legend');
  const legendSpawns=legends<6?2:legends<8?1+(rng.next()<.4?1:0):legends<10?(rng.next()<.3?1:0):0;
  for(let i=0;i<legendSpawns;i++){
    const byRegion=REGIONS.map(r=>({r,n:active.filter(f=>f.rarity==='Legend'&&f.region===r).length+out.filter((x,j)=>x==='Legend'&&slots[j]===r).length+rng.next()*.5})).sort((a,b)=>a.n-b.n);
    place('Legend',byRegion.map(x=>x.r));
  }
  const epics=count('Epic');
  const epicSpawns=epics<16?Math.min(3,17-epics):epics<19?1+(rng.next()<.25?1:0):epics<20?(rng.next()<.5?1:0):0;
  for(let i=0;i<epicSpawns;i++)place('Epic',rng.shuffle([...REGIONS]));
  return out.map(x=>x??rng.weighted([['Rare',22],['Uncommon',38],['Common',40]] as const));
}
export const DEFAULT_SEED=20582058;
export {START_YEAR};
