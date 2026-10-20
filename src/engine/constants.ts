import type {Brand,Division,Region,Skill,Style,Rarity,Archetype,Mentality} from './types';
export const START_YEAR=2058;
export const SKILLS:readonly Skill[]=['Hands','Kicks','Clinch','Takedowns','Submissions','Ground Control','Defense','Stamina','Footwork'];
export const STYLES:readonly Style[]=['Boxing','Kickboxing','Muay Thai','Karate','Taekwondo','Freestyle Wrestling','Greco-Roman Wrestling','Judo','Brazilian Jiu-Jitsu','Sambo','Sumo','MMA Hybrid'];
export const MENTALITIES:readonly Mentality[]=['Strategist','Bold','Crazy','Cold','Conservative'];
export const ARCHETYPES:readonly Archetype[]=['Early Phenomenon','Classical Prime','Late Bloomer','Shooting Star','Durable Veteran','Volatile Talent'];
/* ───────────── Brands ─────────────
   Two world-tier brands share event nights but never cross over, except at The Pinnacle and in tournaments. */
export const BRANDS:readonly Brand[]=['NOVA','ONYX'];
export const BRAND_INFO:Record<Brand,{name:string;tagline:string;color:string;deep:string}>={
 NOVA:{name:'NOVA',tagline:'Bright lights. Fast hands.',color:'#ff8b45',deep:'#402010'},
 ONYX:{name:'ONYX',tagline:'Forged in the dark.',color:'#ba83ff',deep:'#261640'}};
export const TOP_DIVISION:Record<Brand,Division>={NOVA:'NOVA S',ONYX:'ONYX S'};
export const SECOND_DIVISION:Record<Brand,Division>={NOVA:'NOVA II',ONYX:'ONYX II'};
/** Active divisions. */
export const DIVISIONS:readonly Division[]=['NOVA S','NOVA II','ONYX S','ONYX II','AMERICAS D1','AMERICAS D2','EUROPE D1','EUROPE D2','AFRICA D1','AFRICA D2','APAC D1','APAC D2'];
export const WORLD_DIVISIONS:readonly Division[]=['NOVA S','NOVA II','ONYX S','ONYX II'];
export const isTopDivision=(d:Division|string)=>d==='S-TIER'||d==='NOVA S'||d==='ONYX S';
export const isSecondDivision=(d:Division|string)=>d==='GLOBAL D2'||d==='NOVA II'||d==='ONYX II';
export const isWorldTier=(d:Division|string)=>isTopDivision(d)||isSecondDivision(d);
export const brandOf=(d:Division|string):Brand|null=>d.startsWith('NOVA')?'NOVA':d.startsWith('ONYX')?'ONYX':null;
/** Roster size: 14 in each brand division, 20 in each continental division. */
export const DIVISION_SIZE=(d:Division)=>isWorldTier(d)?14:20;
export const ACTIVE_FIGHTERS=4*14+8*20;
/** Short label: "NOVA S", "ONYX II", "Americas D1". */
export const divisionLabel=(d:Division|string)=>d==='S-TIER'?'S Division':d==='GLOBAL D2'?'Division II':d;
export const REGIONS:readonly Region[]=['Americas','Europe & Middle East','Africa','APAC'];
export const REGION_DIVISIONS:Record<Region,readonly [Division,Division]>={Americas:['AMERICAS D1','AMERICAS D2'],'Europe & Middle East':['EUROPE D1','EUROPE D2'],Africa:['AFRICA D1','AFRICA D2'],APAC:['APAC D1','APAC D2']};
export const DIVISION_NAMES:Record<Division,string>={'NOVA S':'NOVA · S Division','NOVA II':'NOVA · Division II','ONYX S':'ONYX · S Division','ONYX II':'ONYX · Division II','S-TIER':'S Division (before the brand split)','GLOBAL D2':'Division II (before the brand split)','AMERICAS D1':'Americas · Division I','AMERICAS D2':'Americas · Division II','EUROPE D1':'Europe & Middle East · Division I','EUROPE D2':'Europe & Middle East · Division II','AFRICA D1':'Africa · Division I','AFRICA D2':'Africa · Division II','APAC D1':'APAC · Division I','APAC D2':'APAC · Division II'};
export const RARITY_COLORS:Record<Rarity,string>={Generational:'#ff6d7b',Legend:'#f6c770',Epic:'#c596ef',Rare:'#62a8f3',Uncommon:'#65cbaa',Common:'#8e99ae'};
// Nine centered archetypal skill offsets, ordered as SKILLS. Per-fighter noise makes each athlete distinct.
export const STYLE_OFFSETS:Record<Style,number[]>={
  Boxing:[10,-1,-2,-8,-10,-8,9,5,5],
  Kickboxing:[7,11,-2,-8,-8,-8,3,2,3],
  'Muay Thai':[5,10,8,-5,-8,-7,2,-1,-4],
  Karate:[6,9,-3,-8,-8,-8,6,1,9],
  Taekwondo:[0,14,-5,-9,-10,-9,4,1,14],
  'Freestyle Wrestling':[-7,-8,5,13,0,9,0,5,-7],
  'Greco-Roman Wrestling':[-6,-9,13,12,-3,7,1,3,-8],
  Judo:[-6,-7,12,12,3,7,2,-2,-7],
  'Brazilian Jiu-Jitsu':[-9,-10,3,5,16,13,3,-1,-10],
  Sambo:[-2,-7,7,10,10,9,0,-4,-7],
  Sumo:[-4,-11,16,6,-10,5,6,0,-8],
  'MMA Hybrid':[3,3,1,0,0,1,1,2,-1]
};
export const STYLE_DESCRIPTIONS:Record<Style,string>={
  Boxing:'Precise hands, counters and defensive reading.',Kickboxing:'Balanced long-range striking with dangerous combinations.',
  'Muay Thai':'Punishing knees, elbows and inside-clinch attacks.',Karate:'Blitz movement, evasive timing and distance control.',
  Taekwondo:'Spectacular explosive kicking with major ground vulnerabilities.',
  'Freestyle Wrestling':'Relentless takedown entries and positional pressure.',
  'Greco-Roman Wrestling':'Close-contact upper-body leverage and throws.',Judo:'Reactive throws, sweeps and transitional control.',
  'Brazilian Jiu-Jitsu':'Submission chains, reversals and defensive ground intelligence.',
  Sambo:'Aggressive grappling with versatile transitions.',Sumo:'Overwhelming size, balance and close-range power.',
  'MMA Hybrid':'Flexible responses across the entire combat spectrum.'
};
export const RARITY_WEIGHTS:readonly (readonly [Rarity,number])[]=[['Common',70],['Uncommon',60],['Rare',35],['Epic',19],['Legend',10],['Generational',3]];
export const MENTAL_DESCRIPTIONS:Record<Mentality,string>={Strategist:'Reads opponents and adapts. Excellent in long formats.',Bold:'Presses advantages and seeks stoppages, accepts risks.',Crazy:'Unpredictable bursts of heavy damage cost extraordinary energy and invite counters.',Cold:'Unshaken under pressure. A clinical finisher.',Conservative:'Careful defensive pacing preserves stamina and limits risk, but produces fewer attacks.'};
