import type {Fighter} from '../engine/types';
import {SKILLS} from '../engine/constants';
import {abilitiesOf} from '../engine/career';
export function CareerChart({fighter,year}:{fighter:Fighter;year:number}){
  const data=fighter.history.filter(h=>h.year<=year);const minAge=18;const maxAge=Math.max(42,data.at(-1)?.age??24);
  const x=(age:number)=>35+(age-minAge)/(maxAge-minAge)*600;const y=(v:number)=>180-(v-35)/65*145;
  const line=(field:'base'|'overall')=>data.map((d,i)=>`${i?'L':'M'}${x(d.age).toFixed(1)},${y(d[field]).toFixed(1)}`).join(' ');
  return <div className="career-graph"><svg viewBox="0 0 680 217" preserveAspectRatio="xMidYMid meet" aria-label="Career development chart: annual base versus actual current overall">
    {[40,55,70,85,100].map(v=><g key={v}><line x1="35" x2="648" y1={y(v)} y2={y(v)} stroke="#374153" strokeDasharray="3 6"/><text x="7" y={y(v)+4} fill="#8390a2" fontSize="11">{v}</text></g>)}
    {Array.from({length:7},(_,i)=>18+i*4).filter(a=>a<=maxAge).map(a=><text key={a} x={x(a)} y="207" textAnchor="middle" fill="#8390a2" fontSize="11">{a}</text>)}
    {data.length>1&&<><path d={line('base')} fill="none" stroke="#65b7ed" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/><path d={line('overall')} fill="none" stroke="#7ce3bd" strokeWidth="2.7" strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round"/></>}
    {data.map((d,i)=><circle key={i} cx={x(d.age)} cy={y(d.overall)} r={i===data.length-1?5:3} fill="#7ce3bd" stroke="#10222c" strokeWidth="2"><title>{d.year}: age {d.age}, base {d.base}, current {d.overall}</title></circle>)}
  </svg><div className="chart-key"><span><i className="key-dot blue"/> Annual base</span><span><i className="key-dot green"/> Actual overall</span><span>Historical data only · future potential hidden</span></div></div>;
}
export function RadarChart({fighter,year}:{fighter:Fighter;year:number}){
  const vals=abilitiesOf(fighter,year);const center=115;const angle=(i:number)=>i*2*Math.PI/9-Math.PI/2;
  const xy=(i:number,r:number)=>[center+Math.cos(angle(i))*r,center+Math.sin(angle(i))*r];
  const polygon=(r:number)=>SKILLS.map((_,i)=>xy(i,r).join(',')).join(' ');
  return <svg className="radar-svg" viewBox="0 0 230 230" role="img" aria-label="Nine-skill radar">
    {[25,45,65,85].map(r=><polygon key={r} points={polygon(r)} fill="none" stroke="#47556a" strokeOpacity=".52"/>)}
    {SKILLS.map((_,i)=><line key={i} x1={center} y1={center} x2={xy(i,87)[0]} y2={xy(i,87)[1]} stroke="#465569" strokeOpacity=".6"/>)}
    <polygon points={SKILLS.map((s,i)=>xy(i,Math.max(0,vals[s])*0.84).join(',')).join(' ')} fill="#63ceb3" fillOpacity=".2" stroke="#77e2c4" strokeWidth="2.5"/>
    {SKILLS.map((s,i)=>{const [x,y]=xy(i,Math.max(0,vals[s])*0.84);return <circle key={s} cx={x} cy={y} r="2.7" fill="#9dffe0"/>;})}
  </svg>;
}
