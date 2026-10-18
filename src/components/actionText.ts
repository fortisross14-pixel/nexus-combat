import type {FightAction} from '../engine/types';

const SUB_NAMES:Record<string,string>={kimura:'Kimura','arm-triangle':'Arm triangle',armbar:'Armbar',americana:'Americana',rnc:'RNC','body-triangle-choke':'Body-triangle choke',triangle:'Triangle',guillotine:'Guillotine',omoplata:'Omoplata','heel-hook':'Heel hook'};
const LABELS:Record<string,string>={
 cross:'Cross!',hook:'Hook!',uppercut:'Uppercut!',overhand:'Overhand right!','body-shot':'Body shot!','leg-kick':'Leg kick!','body-kick':'Body kick!','head-kick':'Head kick!','spinning-kick':'Spinning kick!',
 knee:'Knee!',elbow:'Elbow to the head!',uppercut_clinch:'Uppercut!','short-punch':'Short punches!',gnp:'Ground and pound!','gnp-elbow':'Elbow from the top!',
 clinch:'Clinch!','clinch-break':'Breaks the clinch',takedown:'Takedown!','td-stuffed':'Takedown resisted!',trip:'Trip!',throw:'Throw!',
 'half-guard':'Half guard','guard-pass':'Guard passed!',mount:'Mount!','back-take':'Takes the back!',sweep:'Sweep!','stand-up':'Back to the feet',
 knockdown:'Knocked down!',rocked:'Rocked!',ko:'KO!',tko:'TKO!',tap:'Submission!'
};
/** Short broadcast caption for an action key (e.g. "Hook!", "Armbar attempt!", "RNC escaped!"). */
export function actionLabel(k:string):string{
 if(k.startsWith('tag:'))return `TAG! ${k.slice(4)} enters`;
 if(LABELS[k])return LABELS[k];
 const m=/^(.*)-(att|esc)$/.exec(k);
 if(m){const name=SUB_NAMES[m[1]]||m[1];return m[2]==='att'?`${name} attempt!`:`${name} escaped!`;}
 return k.replace(/-/g,' ');
}
/** A full commentary sentence for the ticker. */
export function actionSentence(a:FightAction,nameA:string,nameB:string):string{
 const me=a.by===0?nameA:nameB,them=a.by===0?nameB:nameA;
 const k=a.k;
 if(k.startsWith('tag:'))return `TAG! ${k.slice(4)} steps into the fight for their country.`;
 if(k==='ko')return `${me} lands the knockout blow! ${them} is out cold.`;
 if(k==='tko')return `${me} unloads until the referee waves it off!`;
 if(k==='tap')return `${me} locks it in — ${them} taps out!`;
 if(k==='knockdown')return `${me} drops ${them}!`;
 if(k==='rocked')return `${me} has ${them} badly hurt!`;
 if(k==='td-stuffed')return `${me} stuffs the takedown.`;
 if(k==='stand-up')return `${me} scrambles back to the feet.`;
 if(k==='sweep')return `${me} sweeps and comes up on top!`;
 if(k.endsWith('-esc'))return `${me} escapes the ${actionLabel(k).replace(' escaped!','').toLowerCase()}.`;
 if(k.endsWith('-att'))return `${me} goes for a ${actionLabel(k).replace(' attempt!','').toLowerCase()}!`;
 if(a.c==='strike')return `${me} lands: ${actionLabel(k).replace('!','').toLowerCase()}.`;
 return `${me}: ${actionLabel(k).replace('!','').toLowerCase()}.`;
}
