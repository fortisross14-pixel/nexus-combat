import './nexus-refinements.css';
import {Crown,Medal,Trophy} from 'lucide-react';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {awardRows} from '../engine/chronicleDetails';
import {BRANDS} from '../engine/constants';
import {CONTINENTAL_BELTS,BELT_NAMES} from '../engine/belts';
import {reignDuration} from '../engine/legacy';
import type {BeltId,CrownReign,Fighter,World} from '../engine/types';

export function HonorsArchive({world,onFighter}:{world:World;onFighter:(id:string)=>void}){
 const f=(id:string)=>world.fighters.find(f=>f.id===id);
 const honors:(readonly [BeltId,CrownReign[]])[]=[...BRANDS.map(b=>[b,world.crowns?.[b]?.reigns??[]] as const),...CONTINENTAL_BELTS.map(b=>[b,world.belts[b]?.reigns??[]] as const),['WORLD',world.crown.reigns]];
 const fight=(person:Fighter|undefined,year:number,subtitle:string,id:string)=>person?<button className="nexus-honor-row" key={id} onClick={()=>onFighter(person.id)}><b className="nexus-honor-year">{year}</b><Avatar fighter={person} size={44}/><span><strong><Flag code={person.flag}/> {person.name}</strong><small>{subtitle}</small></span></button>:null;
 const current=world.pinnacle??[];
 return <div className="nexus-honors">
 <section className="panel nexus-history-panel"><h2><Crown size={18}/> Championship lineages</h2><p>Every individual title reign; current holders and all former champions.</p>
 {honors.map(([belt,reigns])=><div key={belt}><h3>{BELT_NAMES[belt]??belt}</h3><div className="nexus-honor-list">{reigns.slice().reverse().map((reign,i)=>fight(f(reign.fighterId),reign.startYear,`${reignDuration(world,reign)} days · ${reign.defenses} defenses · ${reign.endYear??'current'}`,`${belt}-${i}`))}{!reigns.length&&<p className="empty-msg">No champions yet.</p>}</div></div>)}
 </section>
 <section className="panel nexus-history-panel"><h2><Trophy size={18}/> Grand tournament winners</h2><p>All editions, runners-up and their paths to the final.</p>
 {(['CRUCIBLE','SURGE','OLYMPIAD'] as const).map(kind=><div key={kind}><h3>{kind==='SURGE'?'The Surge':kind==='CRUCIBLE'?'The Crucible':'World Combat Olympiad'}</h3><div className="nexus-honor-list">{awardRows(world,kind).map(row=>fight(row.champion,row.year,`Champion${row.runnerUp?` · runner-up ${row.runnerUp.name}`:''}`,row.tournament.id))}{awardRows(world,kind).length===0&&<p className="empty-msg">No edition completed.</p>}</div></div>)}
 </section>
 <section className="panel nexus-history-panel"><h2><Medal size={18}/> Doubles Crown</h2><p>Country championship reigns with title days, successful defenses and the contributing fighters.</p><div className="nexus-honor-list">{(world.tag?.reigns??[]).slice().reverse().map((reign,i)=><div className="nexus-honor-row" key={`${reign.startTie}-${i}`}><b className="nexus-honor-year">{reign.startYear}</b><span><strong>{reign.country}</strong><small>{Math.max(0,Math.round(((reign.endYear??world.year)+(reign.endRound??world.round)/48-reign.startYear-reign.startRound/48)*365.2425))} days · {reign.defenses} defenses</small><small>{reign.fighters.map(id=>f(id)?.name).filter(Boolean).join(' · ')||'Team not archived'}</small></span></div>)}{!world.tag?.reigns?.length&&<p className="empty-msg">No Doubles Crown lineage yet.</p>}</div></section>
 <section className="panel nexus-history-panel"><h2><Trophy size={18}/> Annual special honors</h2><p>Every Pinnacle unifier and Continental Supremacy winner.</p><h3>The Pinnacle</h3><div className="nexus-honor-list">{current.slice().reverse().map(p=>fight(f(p.winnerId),p.year,`defeated ${f(p.loserId)?.name??'opponent'} · ${p.winnerBrand??''}`,`pinn-${p.year}`))}</div>
 <h3>Continental Supremacy</h3><div className="nexus-honor-list">{(world.supremacy??[]).slice().reverse().map(s=>fight(s.winnerId?f(s.winnerId):undefined,s.year,`${s.table.find(p=>p.id===s.winnerId)?.pts??0} points · continental champion`,`sup-${s.year}`))}</div></section>
 </div>;
}
