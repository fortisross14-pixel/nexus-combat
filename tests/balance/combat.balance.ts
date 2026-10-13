import {it} from 'vitest';
import {createWorld} from '../../src/engine/world';
import {simulateCombat,matchupOdds,styleAdvantage,STAT} from '../../src/engine/combat';
import {overallOf} from '../../src/engine/career';
import {Random} from '../../src/engine/random';
import {STYLES} from '../../src/engine/constants';
import {env,fmt,pct,Report} from './shared';

/** Pure engine check on random pairings across the whole talent range. */
it('combat engine: calibration, finishes, judging and styles',()=>{
 const N=env('N',400000);
 // Several universes, so a style's result is not down to a dozen individual fighters.
 const worlds=[5150,11,222,3333,44444,555,6060].map(seed=>createWorld(seed));const rng=new Random(77);const pick=new Random(99);
 const buckets:Record<string,[number,number,number]>={};let fin=0,r1=0,r108=0,rounds=0,n=0,decisions=0,splits=0;
 const st:Record<string,[number,number]>={};const fav:[number,number]=[0,0];
 const tot={sig:0,sigL:0,td:0,tdL:0,kd:0,sub:0,ctrl:0};
 for(let i=0;i<N;i++){
  const w=worlds[i%worlds.length],F=w.fighters;
  const a=F[pick.int(0,199)],b=F[pick.int(0,199)];if(a===b)continue;
  const p=matchupOdds(a,b,w.year);const res=simulateCombat(a,b,w.year,rng,3);n++;
  if(['KO','TKO','SUB'].includes(res.method)){fin++;if(res.finishRound===1)r1++;}else{decisions++;if(res.method==='SD'||res.method==='MD')splits++;}
  for(const r of res.rounds){rounds++;if(Math.abs(r.scoreA-r.scoreB)>=2)r108++;}
  for(const s of [res.statsA,res.statsB]){tot.sig+=s[STAT.SIG];tot.sigL+=s[STAT.SIGL];tot.td+=s[STAT.TD];tot.tdL+=s[STAT.TDL];tot.kd+=s[STAT.KD];tot.sub+=s[STAT.SUBA];tot.ctrl+=s[STAT.CTRL];}
  if(!res.winnerId)continue;
  const pf=Math.max(p,1-p),favWon=(p>=.5)===(res.winnerId===a.id);const k=(Math.floor(pf*10)/10).toFixed(1);
  (buckets[k]??=[0,0,0]);buckets[k][0]+=favWon?1:0;buckets[k][1]++;buckets[k][2]+=pf;
  const gap=overallOf(a,w.year)-overallOf(b,w.year);
  if(Math.abs(gap)<=2&&a.style!==b.style&&styleAdvantage(a.style,b.style)===0)for(const f of [a,b]){(st[f.style]??=[0,0]);st[f.style][1]++;if(res.winnerId===f.id)st[f.style][0]++;}
  if(Math.abs(gap)<=2&&styleAdvantage(a.style,b.style)!==0){const strong=styleAdvantage(a.style,b.style)>0?a:b;fav[1]++;if(res.winnerId===strong.id)fav[0]++;}
 }
 const R=new Report();
 R.line(`COMBAT ENGINE · ${n} fights`);
 for(const k of Object.keys(buckets).sort()){const [won,count,exp]=buckets[k];R.check(`favourite ${k}0–${k}9 bucket: shown ${fmt(pct(exp,count))}% vs actual`,pct(won,count)-pct(exp,count),-3,3,' pts');}
 R.check('fights ending in a finish',pct(fin,n),42,55);
 R.check('finishes in round 1',pct(r1,fin),30,50);
 R.check('10-8 rounds',pct(r108,rounds),2,6);
 R.check('split/majority share of decisions',pct(splits,decisions),9,22);
 R.check('favourable style at equal rating',pct(fav[0],fav[1]),55,63);
 for(const s of STYLES)if(st[s])R.check(`${s} at equal rating, neutral matchup`,pct(st[s][0],st[s][1]),46,54);
 R.line(`per fighter per fight: sig ${fmt(tot.sigL/n/2)}/${fmt(tot.sig/n/2)} · TD ${(tot.tdL/n/2).toFixed(2)}/${(tot.td/n/2).toFixed(2)} · KD ${(tot.kd/n/2).toFixed(2)} · sub att ${(tot.sub/n/2).toFixed(2)} · control ${Math.round(tot.ctrl/n/2)}s`);
 R.finish();
});
