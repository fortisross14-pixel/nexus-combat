import {Play,Plus,Trash2} from 'lucide-react';
import {BrandLogo} from './BrandLogo';
import {BoardNum} from './board';
import type {World} from '../engine/types';

/** Start screen: three save slots shown as modules on the arena board. */
export function UniverseHub({slots,onOpen,onCreate,onDelete}:{slots:(World|null)[];onOpen:(slot:number)=>void;onCreate:(slot:number)=>void;onDelete:(slot:number)=>void}){
 return <main className="uh">
  <header className="uh-head">
   <BrandLogo brand="NEXUS" size={64}/>
   <div><h1>NEXUS</h1><p className="uh-sub">Combat Chronicle</p></div>
  </header>
  <section className="uh-board" aria-labelledby="uh-title">
   <div className="uh-board-head"><h2 id="uh-title">Choose a universe</h2><p>Up to three independent combat worlds, each with its own calendar, fighters, belts and permanent chronicle.</p></div>
   <ol className="uh-slots">{slots.map((world,i)=><li key={i} className={`uh-slot ${world?'is-live':'is-empty'}`}>
    <span className="uh-slot-no">Slot {i+1}</span>
    {world?<>
     <div className="uh-year"><BoardNum value={world.year} size="l"/><span className="uh-year-label">Season</span></div>
     <dl className="uh-facts">
      <div><dt>Active fighters</dt><dd>{world.fighters.filter(f=>f.status==='active').length}</dd></div>
      <div><dt>Hall of fame</dt><dd>{world.hallOfFame.length}</dd></div>
      <div><dt>Seed</dt><dd>{world.seed}</dd></div>
     </dl>
     <div className="uh-actions"><button className="bd-btn uh-open" onClick={()=>onOpen(i)}><Play size={15} fill="currentColor"/>Continue</button><button className="nx-icon uh-delete" aria-label={`Delete universe in slot ${i+1}`} onClick={()=>onDelete(i)}><Trash2 size={17}/></button></div>
    </>:<>
     <p className="uh-empty"><strong>Empty slot</strong><span>Begin a new founding roster and write a separate history.</span></p>
     <div className="uh-actions"><button className="bd-btn" onClick={()=>onCreate(i)}><Plus size={16}/>Create universe</button></div>
    </>}
   </li>)}</ol>
  </section>
 </main>;
}
