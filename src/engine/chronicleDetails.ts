import {BRANDS} from './constants';
import {CONTINENTAL_BELTS} from './belts';
import type {BeltId,CrownReign,Division,Fighter,Tournament,World} from './types';

const findF=(world:World,id:string)=>world.fighters.find(f=>f.id===id);
export function awardRows(world:World,kind:Tournament['kind']){
 return world.tournaments.filter(t=>t.kind===kind&&t.status==='complete'&&!!t.winnerId).slice().reverse().map(t=>({year:t.year,champion:findF(world,t.winnerId!),runnerUp:findF(world,t.runnerUpId??''),tournament:t}));
}

export function seasonAchievements(world:World,f:Fighter,year:number){
 const entries=(world.ledger[year]??[]).filter(e=>e.a===f.id||e.b===f.id);
 const regular=entries.filter(e=>!e.t);
 const result=(list:typeof entries)=>({wins:list.filter(e=>e.w===f.id).length,losses:list.filter(e=>!!e.w&&e.w!==f.id).length,draws:list.filter(e=>!e.w).length});
 const divisionResults=new Map<Division,ReturnType<typeof result>>();
 for(const entry of regular){const rows=regular.filter(e=>e.d===entry.d);divisionResults.set(entry.d,result(rows));}
 const lines:{label:string;description:string}[]=[];
 for(const [division,record] of divisionResults)lines.push({label:division,description:`${record.wins}–${record.losses}–${record.draws} · official circuit`});
 const surge=world.tournaments.find(t=>t.year===year&&t.kind==='SURGE'&&t.participants.includes(f.id));
 if(surge){const order=surge.surgeOrder??surge.participants;const entry=order.indexOf(f.id)+1;
  const moments=surge.surgeMoments??[];const elimination=moments.find(m=>m.eliminatedId===f.id);
  const elimOrder=moments.filter(m=>m.eliminatedId);const elimIndex=elimOrder.findIndex(m=>m.eliminatedId===f.id);
  const placing=surge.winnerId===f.id?1:elimIndex>=0?20-elimIndex:null;
  const ko=moments.filter(m=>m.byId===f.id&&m.eliminatedId).length;
  lines.push({label:'SURGE',description:`Entered #${entry} · ${placing===null?'Still competing':placing===1?'WINNER':`finished #${placing}`} · ${ko} eliminations${elimination?.minute!==undefined?` · ${elimination.minute} min`:''}`});
 }
 const crucible=world.tournaments.find(t=>t.year===year&&t.kind==='CRUCIBLE'&&t.participants.includes(f.id));
 if(crucible){const matches=crucible.matches.filter(m=>(m.fighterA===f.id||m.fighterB===f.id)&&!!m.fightId);
  const g=matches.filter(m=>m.stage.startsWith('Group'));const r=result(g.map(m=>({w:m.winnerId} as typeof entries[number])));
  const phase=crucible.winnerId===f.id?'CHAMPION':matches.some(m=>m.stage==='Final')?'Finalist':matches.some(m=>m.stage==='Semifinal')?'Semifinal':crucible.stage<3?'Group stage':'Group exit';
  lines.push({label:'CRUCIBLE',description:`Group ${r.wins}–${r.losses}–${r.draws} · ${phase}`});
 }
 const olympiad=world.tournaments.find(t=>t.year===year&&t.kind==='OLYMPIAD'&&t.participants.includes(f.id));
 if(olympiad){const matches=olympiad.matches.filter(m=>!!m.fightId&&(m.fighterA===f.id||m.fighterB===f.id));const last=matches.at(-1);
  lines.push({label:'OLYMPIAD',description:olympiad.winnerId===f.id?'Gold medalist':`${last?.stage??'Awaiting first match'} · ${matches.filter(m=>m.winnerId===f.id).length} wins`});
 }
 const tagTies=(world.tag?.ties??[]).filter(t=>t.year===year&&(t.legs.some(l=>l.a===f.id||l.b===f.id)));
 if(tagTies.length){const legs=tagTies.flatMap(t=>t.legs.filter(l=>l.a===f.id||l.b===f.id));const r=result(legs.map(l=>({w:l.w} as typeof entries[number])));
  lines.push({label:'DOUBLES',description:`${r.wins}–${r.losses}–${r.draws} · ${tagTies.filter(t=>t.winner===f.country).length} ties won`});}
 const allBelts:(readonly [BeltId,CrownReign[]])[]=[...BRANDS.map(b=>[b,world.crowns?.[b]?.reigns??[]] as const),...CONTINENTAL_BELTS.map(b=>[b,world.belts[b]?.reigns??[]] as const),['WORLD',world.crown.reigns]];
 for(const [belt,reigns] of allBelts)for(const reign of reigns){if(reign.fighterId!==f.id)continue;
  const start=reign.startYear+(Math.max(0,reign.startRound-1)/48),end=reign.endYear!==undefined?reign.endYear+Math.max(0,(reign.endRound??1)-1)/48:world.year+world.round/48;
  const overlap=Math.max(0,Math.min(end,year+1)-Math.max(start,year));
  if(overlap<=0&&reign.startYear!==year)continue;
  const defenses=(world.ledger[year]??[]).filter(e=>e.w===f.id&&e.bt===belt&&(e.f&1)!==0&&(e.f&2)===0).length;
  lines.push({label:`${belt} CROWN`,description:`${Math.round(overlap*365.2425)} days this year · ${defenses} successful defenses${reign.startYear===year?' · won title':''}`});
 }
 for(const reign of world.tag?.reigns??[]){if(!reign.fighters.includes(f.id))continue;
  const start=reign.startYear+(reign.startRound-1)/48,end=reign.endYear!==undefined?reign.endYear+((reign.endRound??1)-1)/48:world.year+world.round/48;
  const overlap=Math.max(0,Math.min(end,year+1)-Math.max(start,year));
  if(overlap>0||reign.startYear===year)lines.push({label:'DOUBLES CROWN',description:`${reign.country} · ${Math.round(overlap*365.2425)} days this year · ${reign.defenses} career defenses${reign.startYear===year?' · title won':''}`});
 }
 const p=world.pinnacle?.find(x=>x.year===year&&x.winnerId===f.id);
 if(p)lines.push({label:'PINNACLE',description:'NOVA–ONYX annual unifier champion'});
 const supreme=world.supremacy?.find(x=>x.year===year&&x.winnerId===f.id);
 if(supreme)lines.push({label:'SUPREMACY',description:'Continental Supremacy winner'});
 const awards=world.awards.find(a=>a.year===year);
 if(awards?.fighterOfYear===f.id)lines.push({label:'YEAR AWARD',description:'Fighter of the Year'});
 if(awards?.breakthrough===f.id)lines.push({label:'YEAR AWARD',description:'Breakthrough Fighter'});
 return {lines,regular:result(regular),total:entries.length};
}
