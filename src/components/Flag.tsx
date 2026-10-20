// Named imports only: the full set is 260 flags, and importing * puts every one in the bundle.
// Add a code here when a country joins engine/names.ts (tests/flags.test.ts checks this).
import {AO,AR,AU,BG,BR,CA,CD,CL,CM,CN,CO,CR,CU,CZ,DE,DO,DZ,EC,EG,ES,FR,GE,GH,GR,HR,ID,IE,IN,IR,IT,JM,JP,KE,KR,KZ,LB,MA,ML,MN,MX,MZ,NG,NL,NO,NZ,PE,PH,PL,PR,PT,RS,RU,SE,SN,TH,TN,TR,TZ,UA,US,VE,VN,ZA} from 'country-flag-icons/string/3x2';

/* Flag images. Emoji flags do not render on Windows (they show as two letters),
   so every flag is drawn from a bundled SVG, keyed by the code inside the emoji. */
const ENGLAND='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><rect x="12.5" width="5" height="20" fill="#ce1124"/><rect y="7.5" width="30" height="5" fill="#ce1124"/></svg>';
const SVG:Record<string,string>={AO,AR,AU,BG,BR,CA,CD,CL,CM,CN,CO,CR,CU,CZ,DE,DO,DZ,EC,EG,ES,FR,GE,GH,GR,HR,ID,IE,IN,IR,IT,JM,JP,KE,KR,KZ,LB,MA,ML,MN,MX,MZ,NG,NL,NO,NZ,PE,PH,PL,PR,PT,RS,RU,SE,SN,TH,TN,TR,TZ,UA,US,VE,VN,ZA};
const cache=new Map<string,string|null>();
/** ISO code hidden in a flag emoji: regional-indicator letters, or a tag sequence such as gb-eng. */
export function flagCode(emoji:string|undefined|null):string|null{
 if(!emoji)return null;
 const cps=[...emoji].map(c=>c.codePointAt(0)!);
 const ri=cps.filter(c=>c>=0x1F1E6&&c<=0x1F1FF).map(c=>String.fromCharCode(c-0x1F1E6+65)).join('');
 if(ri.length===2)return ri;
 const tag=cps.filter(c=>c>=0xE0061&&c<=0xE007A).map(c=>String.fromCharCode(c-0xE0061+97)).join('');
 return tag?tag.toUpperCase():null;
}
/** True when a flag image exists for this emoji. */
export const hasFlag=(emoji:string)=>{const code=flagCode(emoji);return code==='GBENG'||(!!code&&code in SVG);};
function srcFor(emoji:string):string|null{
 if(cache.has(emoji))return cache.get(emoji)!;
 const code=flagCode(emoji);
 const svg=code==='GBENG'?ENGLAND:code?SVG[code]:undefined;
 const src=svg?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`:null;
 cache.set(emoji,src);return src;
}
export function Flag({code,size=14}:{code:string|undefined|null;size?:number}){
 if(!code)return null;
 const src=srcFor(code);
 if(!src)return <span className="flag-fallback">{code}</span>;
 return <img className="flag-img" src={src} alt="" width={Math.round(size*1.5)} height={size} style={{width:size*1.5,height:size}} loading="lazy" decoding="async"/>;
}
