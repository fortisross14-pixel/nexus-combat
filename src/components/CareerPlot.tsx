import {fighterLedger} from '../engine/archive';
import type {LedgerEntry,World} from '../engine/types';

/** How hard a result landed: finishes reach the full height, decisions less. */
const reach=(e:LedgerEntry)=>e.m==='KO'||e.m==='TKO'?1:e.m==='SUB'?.82:e.m==='DRAW'?.25:.55;

/**
 * A fighter's whole career as one plot: every bout is a hairline from the centre,
 * up for a win and down for a loss, oldest on the left. Title fights are lit in the title lamp.
 */
export function CareerPlot({world,id,name}:{world:World;id:string;name:string}){
 const fights=fighterLedger(world,id).slice().reverse();
 if(!fights.length)return <p className="cp-empty">No bouts on record yet.</p>;
 const W=Math.max(fights.length*6,240),H=120,mid=H/2,step=W/fights.length;
 const wins=fights.filter(e=>e.w===id).length,losses=fights.filter(e=>e.w&&e.w!==id).length,draws=fights.length-wins-losses;
 const firstYear=fights[0].y,lastYear=fights[fights.length-1].y;
 return <figure className="cp">
  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${name}: ${fights.length} bouts from ${firstYear} to ${lastYear}, ${wins} wins, ${losses} losses, ${draws} draws`}>
   <line x1="0" x2={W} y1={mid} y2={mid} className="cp-axis"/>
   {fights.map((e,i)=>{const x=step*i+step/2;const won=e.w===id,lost=!!e.w&&!won;const len=(mid-6)*reach(e);
    return <line key={e.i} x1={x} x2={x} y1={won?mid-len:mid-(lost?0:len/2)} y2={won?mid:mid+(lost?len:len/2)} className={`${won?'cp-w':lost?'cp-l':'cp-d'} ${e.bt?'cp-title':''}`}/>;})}
  </svg>
  <figcaption><span>{firstYear}</span><span>{fights.length} archived bouts, tournaments and doubles included · <b>{wins}</b> W · <b>{losses}</b> L{draws?<> · <b>{draws}</b> D</>:null} · title bouts lit</span><span>{lastYear}</span></figcaption>
 </figure>;
}
