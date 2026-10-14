export type Region = 'Americas' | 'Europe & Middle East' | 'Africa' | 'APAC';
/** The two world-tier brands. Each runs its own S and II divisions and its own world title. */
export type Brand = 'NOVA' | 'ONYX';
/** 'S-TIER' and 'GLOBAL D2' are the single-brand divisions of saves from before the brand split; they survive only in history. */
export type Division = 'NOVA S' | 'NOVA II' | 'ONYX S' | 'ONYX II' | 'S-TIER' | 'GLOBAL D2' | 'AMERICAS D1' | 'AMERICAS D2' | 'EUROPE D1' | 'EUROPE D2' | 'AFRICA D1' | 'AFRICA D2' | 'APAC D1' | 'APAC D2';
export type Skill = 'Hands' | 'Kicks' | 'Clinch' | 'Takedowns' | 'Submissions' | 'Ground Control' | 'Defense' | 'Stamina' | 'Footwork';
export type Style = 'Boxing' | 'Kickboxing' | 'Muay Thai' | 'Karate' | 'Taekwondo' | 'Freestyle Wrestling' | 'Greco-Roman Wrestling' | 'Judo' | 'Brazilian Jiu-Jitsu' | 'Sambo' | 'Sumo' | 'MMA Hybrid';
export type Mentality = 'Strategist' | 'Bold' | 'Crazy' | 'Cold';
export type Archetype = 'Early Phenomenon' | 'Classical Prime' | 'Late Bloomer' | 'Shooting Star' | 'Durable Veteran' | 'Volatile Talent';
export type Rarity = 'Generational' | 'Legend' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
export interface ProfileAppearance {skin:number;hair:number;hairStyle:number;facialHair:number;face:number;expression:number;accessory:number;scar:boolean;}
export interface FightRecord {wins:number;losses:number;draws:number;kos:number;submissions:number;decisions:number;streak:number;longestWinStreak:number;}
export interface CareerSnapshot {year:number;age:number;division:Division;base:number;shape:number;overall:number;condition:number;rank:number;event:string;wins?:number;losses?:number;rankingPoints?:number;}

/** Per-fighter fight statistics, stored as a fixed-order number array (see STAT in combat.ts):
 *  [strikes thrown, strikes landed, significant thrown, significant landed, power thrown, power landed,
 *   takedowns attempted, takedowns landed, submission attempts, knockdowns, control seconds, damage dealt] */
export type StatLine = number[];
/** Lifetime totals, kept on the fighter so career numbers survive archive compaction. */
export interface CareerStats {fights:number;seconds:number;s:StatLine;kdTaken:number;oppTd:number;oppTdLanded:number;dmgTaken:number;}

export interface Fighter {fame:number;id:string;name:string;nickname:string;country:string;flag:string;region:Region;birthYear:number;height:number;weight:number;reach:number;style:Style;mentality:Mentality;archetype:Archetype;rarity:Rarity;appearance:ProfileAppearance;potential:number;curve:number[];skillOffsets:number[];skillNoise:number[];shape:number;condition:number;division:Division;rank:number;status:'active'|'retired';joinedYear:number;retiredYear?:number;history:CareerSnapshot[];rankingPoints:number;record:FightRecord;injuryUntil:number;injuryName?:string;injurySeverity?:'minor'|'moderate'|'major';career?:CareerStats;}
/** The World Crown plus one Continental belt per region. */
/** NOVA and ONYX: the brand world titles. WORLD: the single World Crown from before the brand split (history only). */
export type BeltId='NOVA'|'ONYX'|'WORLD'|'AMERICAS'|'EUROPE'|'AFRICA'|'APAC';
/** title: regular or vacant title bout · interim: champion unavailable · unification: champion vs interim · eliminator: winner becomes mandatory challenger. */
/** pinnacle: the year's NOVA v ONYX unifier · contract: the Pinnacle bout for a guaranteed title shot. */
export type BoutKind='title'|'interim'|'unification'|'eliminator'|'pinnacle'|'contract';
export interface PendingFight {fighterA:string;fighterB:string;year:number;roundIndex:number;division:Division;titleFight:boolean;eventName:string;belt?:BeltId;kind?:BoutKind;
 /** Doubles leg: tie id, leg number and the two countries. */tag?:{tie:string;leg:1|2;a:string;b:string;title:boolean};
 /** Continental Supremacy round-robin bout at The Pinnacle. */supremacy?:boolean;
 /** World-tier bouts beyond the main card: resolved with the event, shown as prelim results. */prelim?:boolean;}
export interface CrownReign {fighterId:string;startYear:number;startRound:number;startFightId:string;endYear?:number;endRound?:number;endFightId?:string;defenses:number;
 /** interim: elevated after the champion left · split: carried over from the World Crown when the brands split. */via?:'interim'|'split';}
export interface CrownState {championId:string|null;reigns:CrownReign[];
 /** Interim champion while the champion is unavailable, and that lineage. */
 interimId?:string|null;interimReigns?:CrownReign[];
 /** Next in line after winning an eliminator. */
 mandatoryId?:string|null;}
export type FightMethod = 'KO'|'TKO'|'SUB'|'UD'|'SD'|'MD'|'DRAW';
export type FightPosition = 'Stand-up'|'Clinch'|'Ground';
/** Action categories drive the live broadcast's colour coding. */
export type ActionCategory = 'strike'|'grapple'|'sub'|'impact'|'finish';
/** One visible moment inside an exchange. `k` is an action key; text is rendered by the UI. */
export interface FightAction {t:number;by:0|1;k:string;c:ActionCategory;}
/** One ~25-second exchange. `sa`/`sb` are cumulative round StatLines for A and B at the end of the exchange. */
export interface ExchangeBeat {elapsed:number;position:FightPosition;top?:0|1;acts:FightAction[];sa:StatLine;sb:StatLine;staminaA:number;staminaB:number;damageA:number;damageB:number;}
export interface RoundReport {number:number;scoreA:number;scoreB:number;cards?:[number,number][];a?:StatLine;b?:StatLine;staminaA:number;staminaB:number;notes:string[];timeline?:ExchangeBeat[];
 /** Legacy (≤0.8) fields, still read for old saves. */
 strikesA?:number;strikesB?:number;grapplingA?:number;grapplingB?:number;}
export interface Fight {tournamentId?:string;tournamentStage?:string;scheduledRounds?:number;id:string;year:number;roundIndex:number;division:Division;fighterA:string;fighterB:string;winnerId:string|null;method:FightMethod;finishRound:number;finishTime:string;rounds:RoundReport[];statsA?:StatLine;statsB?:StatLine;rankBeforeA:number;rankBeforeB:number;rankAfterA:number;rankAfterB:number;overallBeforeA:number;overallBeforeB:number;oddsA:number;ratingDeltaA:number;ratingDeltaB:number;shapeDeltaA:number;shapeDeltaB:number;conditionDeltaA:number;conditionDeltaB:number;injuredIds:string[];injuries?:{fighterId:string;diagnosis:string;weeks:number;severity:string}[];underdogVictory:boolean;headline:string;eventName?:string;titleFight?:boolean;titleChange?:boolean;belt?:BeltId;kind?:BoutKind;
 /** True when only the ledger summary survives (no rounds or stats). */
 archived?:boolean;}

/** Compact permanent record of every bout. Short keys keep decades of history small.
 *  i id · y year · e event index (1-based) · d division · a/b fighters · w winner · m method · r finish round
 *  o pre-fight win chance of A · f flags (LEDGER_FLAGS) · t tournament id · s tournament stage */
export interface LedgerEntry {i:string;y:number;e:number;d:Division;a:string;b:string;w:string|null;m:FightMethod;r:number;o:number;f:number;t?:string;s?:string;
 /** Belt at stake (title, interim and unification bouts). */bt?:BeltId;}

export interface WorldEvent {year:number;type:'debut'|'retirement'|'promotion'|'relegation'|'anniversary'|'upset'|'injury'|'streak'|'title'|'defense'|'vacancy'|'tournament'|'iconic'|'interim'|'eliminator';fighterId:string;description:string;fightId?:string;}
export interface SeasonSummary {year:number;newcomers:number;retirements:number;promotions:number;relegations:number;averageAge:number;sTierAverage:number;fights?:number;knockouts?:number;submissions?:number;}
export type TournamentKind='CRUCIBLE'|'SURGE'|'OLYMPIAD';
export interface TournamentMatch {id:string;stage:string;fighterA:string;fighterB:string;winnerId:string|null;fightId?:string;group?:'A'|'B';}
export interface SurgeMoment {wave:number;entrantId:string|null;eliminatedId:string|null;byId:string|null;remaining:string[];}
export interface Tournament {id:string;kind:TournamentKind;year:number;status:'active'|'complete';participants:string[];matches:TournamentMatch[];stage:number;winnerId:string|null;runnerUpId?:string;surgeOrder?:string[];surgeActive?:string[];surgeMoments?:SurgeMoment[];}
export interface IconicMoment {id:string;year:number;category:'Dynasty'|'Comeback'|'Upset'|'Double'|'Olympiad'|'Surge';score:number;title:string;description:string;subjectIds:string[];fightId?:string;}
export interface SeasonAwards {year:number;fighterOfYear:string|null;breakthrough:string|null;fightOfYear:string|null;knockoutOfYear:string|null;submissionOfYear:string|null;upsetOfYear:string|null;}
export interface HallInductee {fighterId:string;inductedYear:number;score:number;reason:string;}
export interface World {version:'0.9.0';
 /** 48 = four events a month. Saves without it use the old 60-event calendar and are converted on load. */
 calendar?:48;iconicMoments:IconicMoment[];awards:SeasonAwards[];hallOfFame:HallInductee[];tournaments:Tournament[];activeTournamentId:string|null;year:number;seed:number;rngState:number;nextId:number;fighters:Fighter[];events:WorldEvent[];seasons:SeasonSummary[];round:number;nextFightId:number;
 /** Full-detail bouts of the CURRENT season only. */
 fights:Fight[];
 /** Every bout ever, compact, grouped by season year. Closed seasons are never mutated. */
 ledger:Record<number,LedgerEntry[]>;
 /** Title fights, tournament knockouts and award/iconic bouts kept in detail (no minute data) after their season closes. */
 keyFights:Record<number,Fight[]>;
 /** Brand world titles. `crown` keeps the single World Crown lineage from before the split. */
 crowns?:Record<Brand,CrownState>;
 /** Guaranteed shot at the next title night of the holder's brand (won at The Pinnacle). */
 titleShot?:{fighterId:string;brand:Brand;year:number}|null;
 pinnacle?:PinnacleHonor[];supremacy?:SupremacyHonor[];tag?:TagState;
 /** Big-event bookings made at the start of the month. */
 marquees?:{year:number;month:number;list:{brand?:Brand;a:string;b:string;kind:BoutKind}[]}|null;
 /** Year the brands split (saves migrated from a single top tier). */
 splitYear?:number;
 /** Player acts as brand manager: the season stops at the offseason Draft Room. */manager?:boolean;
 /** Open Draft Room (promotions, relegations, signings) waiting for the player. */draft?:DraftState|null;
 /** Moves of the last completed Draft Room, for the offseason report. */lastDraft?:{year:number;moves:{id:string;from:Division;to:Division}[];retired:string[];declined:string[]}|null;
 lastFightIds:string[];pendingFight:PendingFight|null;
 /** The prepared world-tier card (S-Tier and Global D2), main event first. Unplayed until the event starts. */
 pendingCard?:PendingFight[]|null;
 /** Fight ids of the last world-tier card that was fought, main event first. */
 lastCardIds?:string[];marqueeReservation?:{year:number;month:number;a:string;b:string;kind?:BoutKind}|null;
 /** The World Crown (S-Tier). */
 crown:CrownState;
 /** Continental belts, one per regional Division I. */
 belts:Record<'AMERICAS'|'EUROPE'|'AFRICA'|'APAC',CrownState>;
 /** Continental title-night bookings for the current month: belt → [champion or #1, challenger]. */
 beltReservations?:{year:number;month:number;pairs:Partial<Record<BeltId,[string,string]>>}|null;
 /** The player's own state: followed fighters and main-event picks. Never read by the simulation. */
 user?:UserState;}
/** Country doubles: two fighters per nation, best two of each country. The title belongs to the country. */
/** One offseason move made in the Draft Room. Applied to the roster at once; undone from `from`. */
export interface DraftMove {id:string;from:Division;to:Division;points:number;}
export interface DraftState {
 /** The season about to begin. */year:number;
 /** Fighters who retired this offseason. */retired:string[];
 /** Continental fighters who want to sign with a brand (ambition rolled once). */applicants:string[];
 /** Continental fighters invited who declined (veterans, champions defending at home). */declined:string[];
 moves:DraftMove[];
}
export interface TagReign {country:string;startYear:number;startRound:number;endYear?:number;endRound?:number;defenses:number;fighters:string[];startTie:string;}
export interface TagTie {id:string;year:number;round:number;a:string;b:string;title:boolean;legs:{fightId:string;a:string;b:string;w:string|null}[];winner:string|null;}
export interface TagState {ratings:Record<string,number>;champion:string|null;reigns:TagReign[];ties:TagTie[];}
/** The Pinnacle unifier: NOVA champion v ONYX champion. The winner takes the year. */
export interface PinnacleHonor {year:number;winnerId:string;loserId:string;fightId:string;winnerBrand?:Brand;}
/** Continental Supremacy: the four continental champions, all against all, at The Pinnacle. */
export interface SupremacyHonor {year:number;winnerId:string|null;table:{id:string;pts:number;w:number;l:number;d:number}[];}
export interface PickRecord {fightId:string;pick:string;correct:boolean|null;odds:number;year:number;}
export interface UserState {followed:string[];picks:PickRecord[];pendingPick?:{key:string;pick:string}|null;}
