import {useId} from 'react';
import type {Fighter} from '../engine/types';
interface Props {fighter:Fighter;size?:number;className?:string;}
const skins=['#f3ceb0','#dfb18f','#bd8d6e','#936345','#764830','#532f22','#e6ac86','#a97958'];
const hairs=['#181b24','#30231d','#6c4c35','#987044','#b7a17a','#d6c9ad','#4d3430'];
const colors:{[key:string]:string}={Boxing:'#b84c59',Kickboxing:'#b67c48','Muay Thai':'#a95f42',Karate:'#e6e8e6',Taekwondo:'#e4e8ee','Freestyle Wrestling':'#375d94','Greco-Roman Wrestling':'#2f6782',Judo:'#e6e8e6','Brazilian Jiu-Jitsu':'#244f84',Sambo:'#a95257',Sumo:'#343444','MMA Hybrid':'#353e57'};
function Hair({style,color}:{style:number;color:string}) {
  switch(style){
    case 0:return <path d="M47 76 Q42 32 89 31 Q127 29 133 77 L125 56 Q105 48 89 49 Q66 46 51 63Z" fill={color}/>;
    case 1:return <><path d="M43 87 Q36 34 83 28 Q127 20 136 77 L127 48 111 42 99 29 82 43 68 34 52 56Z" fill={color}/><path d="M50 53L57 36 63 50 72 27 81 44 91 25 97 43 108 29 115 45 127 34 128 57" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"/></>;
    case 2:return <><path d="M45 77Q37 32 90 31Q143 36 135 86L125 58Q98 47 53 62Z" fill={color}/>{Array.from({length:10},(_,i)=><circle key={i} cx={51+i*9} cy={43+((i%3)*5)} r={9} fill={color}/>)}</>;
    case 3:return <path d="M47 74Q42 39 83 37Q117 34 131 60L125 60Q105 46 91 55Q76 43 51 67Z" fill={color}/>;
    case 4:return <><path d="M46 79Q37 21 91 25Q145 25 134 84L122 66 111 43 75 44 51 67Z" fill={color}/><path d="M47 73Q38 120 51 133L59 104M133 75Q141 117 128 127" stroke={color} strokeWidth="12"/></>;
    case 5:return <path d="M46 76Q39 48 91 40Q134 45 132 79L121 65Q89 56 55 70Z" fill={color}/>;
    case 6:return <><path d="M49 64Q42 38 89 39Q123 37 131 65Q111 54 87 57Q65 57 49 64Z" fill={color}/><path d="M87 40Q92 58 78 64" stroke={color} strokeWidth="5"/></>;
    case 7:return <path d="M45 90Q35 25 91 27Q147 27 137 91L127 62Q119 46 106 49L90 42 74 54 52 64Z" fill={color}/>;
    case 8:return <><path d="M45 82Q35 38 86 32Q130 32 135 83L126 57Q95 43 51 62Z" fill={color}/><path d="M48 53Q90 29 127 53" stroke="#ffffff" strokeOpacity=".16" strokeWidth="4"/></>;
    default:return <path d="M47 79Q42 41 89 40Q128 38 132 82L124 58Q92 50 55 69Z" fill={color}/>;
  }
}
export function Avatar({fighter,size=58,className=''}:Props) {
  const id=useId().replace(/:/g,'');const p=fighter.appearance;const skin=skins[p.skin];const hair=hairs[p.hair];const robe=colors[fighter.style]||'#3b5f80';
  // Stable signature variants: every fighter has a recognizable illustrated identity.
  const signature=[...fighter.id].reduce((acc,ch)=>((acc*31+ch.charCodeAt(0))>>>0),11);
  const crest=['#d5787a','#d7b37a','#70b9c7','#8ea9eb','#a2c49c'][signature%5];
  const faceWidth=signature%3;const eyeColor=['#333329','#2f4246','#3d3026','#354752'][signature%4];
  const elite=fighter.rarity==='Generational'||fighter.rarity==='Legend'||fighter.rarity==='Epic';
  const bare=fighter.style==='Sumo'||fighter.style==='Muay Thai'||fighter.style==='Boxing';
  const gi=fighter.style==='Judo'||fighter.style==='Karate'||fighter.style==='Taekwondo'||fighter.style==='Brazilian Jiu-Jitsu';
  return <svg className={`avatar ${className}`} width={size} height={size} viewBox="0 0 180 200" role="img" aria-label={`${fighter.name} illustrated fighter portrait`}>
    <defs><linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#293f4d"/><stop offset="1" stopColor="#101926"/></linearGradient><linearGradient id={`skin-${id}`} x1="0" x2="1" y1="0" y2="0"><stop stopColor={skin}/><stop offset=".55" stopColor={skin}/><stop offset="1" stopColor="#69402e" stopOpacity=".58"/></linearGradient></defs>
    <rect width="180" height="200" rx="12" fill={`url(#bg-${id})`}/>
    <path d={`M${(signature%18)+4} 0L${50+signature%80} 200M${(signature%34)+100} 0L${130+signature%45} 200`} fill="none" stroke={crest} strokeOpacity=".10" strokeWidth="7"/>
    <path d="M10 24V10H24M156 10H170V24M10 176V190H24M156 190H170V176" stroke={crest} strokeOpacity={elite ? 0.55 : 0.23} strokeWidth={elite?3:1.4} fill="none"/><path d="M-8 170L189 -5M42 205L197 54" stroke="#8ee2d3" strokeOpacity=".11" strokeWidth="2"/>
    <circle cx="88" cy="72" r="69" fill="none" stroke="#6bb3b7" strokeOpacity=".16" strokeWidth="1.4"/>
    <path d={`M-10 204Q-7 ${142+signature%13} ${34+signature%12} 141L66 133Q71 123 69 113L109 114Q109 131 115 135L144 141Q188 ${150+signature%10} 195 201Z`} fill={bare?skin:robe}/>
    <path d="M22 160Q37 151 57 152M124 152Q145 147 164 167" fill="none" stroke={crest} strokeWidth="4" strokeOpacity={bare ? 0.20 : 0.48}/>
    {fighter.style==='Sumo'&&<path d="M59 149Q89 158 122 145" fill="none" stroke="#e0d2b0" strokeWidth="8"/>}
    {fighter.style==='Muay Thai'&&<path d="M61 144L80 168M112 142L98 170" fill="none" stroke="#e4b06c" strokeWidth="6"/>}
    {(fighter.style==='Freestyle Wrestling'||fighter.style==='Greco-Roman Wrestling'||fighter.style==='Sambo')&&<path d="M50 148L77 186M129 146L104 187" fill="none" stroke={crest} strokeWidth="9" strokeOpacity=".8"/>}
    <path d="M49 146Q85 174 133 144" fill="none" stroke="#f0f2f2" strokeWidth={gi?21:6} strokeOpacity={gi?'.85':'.08'}/>
    {gi&&<><path d="M68 132L91 171 110 133" fill="#16222e" stroke="#d5dce6" strokeWidth="10"/><path d="M52 161L128 178" stroke={fighter.style==='Brazilian Jiu-Jitsu'?'#4b286f':'#223345'} strokeWidth="7"/></>}
    {!bare&&!gi&&<><path d="M44 145L83 165 137 144" stroke="#121b25" strokeWidth="9" fill="none"/><path d="M76 166H108" stroke="#b8d6d2" strokeOpacity=".6" strokeWidth="4"/></>}
    <rect x="73" y="106" width="34" height="35" rx="12" fill={`url(#skin-${id})`}/>
    <ellipse cx="88" cy="80" rx={(p.face===0?39:p.face===1?34:p.face===2?43:37)+(faceWidth-1)} ry={p.face===3?52:p.face===4?44:48} fill={`url(#skin-${id})`}/>
    <path d={`M${61+faceWidth} 99Q88 ${110+(signature%3)} ${114-faceWidth} 98`} fill="none" stroke="#f3ded0" strokeOpacity=".17" strokeWidth="2"/>
    <ellipse cx="50" cy="87" rx="6" ry="10" fill={skin}/><ellipse cx="125" cy="87" rx="6" ry="10" fill={skin}/>
    <Hair style={p.hairStyle} color={hair}/>
    {p.facialHair===1&&<path d="M67 111Q90 128 110 111Q89 139 67 111" fill={hair} opacity=".9"/>}
    {p.facialHair===2&&<><path d="M77 111Q90 117 100 110" fill="none" stroke={hair} strokeWidth="4"/><path d="M68 110Q89 138 108 108" stroke={hair} strokeWidth="8" fill="none"/></>}
    {p.facialHair===3&&<path d="M69 109Q71 135 89 138Q106 133 107 107L100 117 88 121 77 118Z" fill={hair}/>}
    {p.facialHair===4&&<path d="M61 99Q57 135 88 143Q117 133 116 98L108 104 104 123 90 132 72 123 69 104Z" fill={hair}/>}
    {p.facialHair===5&&<><path d="M65 108Q88 132 114 107L109 126 89 134 70 124Z" fill={hair}/><path d="M78 107L86 112 94 109" fill="none" stroke={hair} strokeWidth="6"/></>}
    <path d={`M63 ${p.expression===1?72:76}Q74 ${p.expression===1?68:74} 82 77 M96 77Q108 ${p.expression===1?68:74} 117 ${p.expression===1?72:76}`} stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none"/>
    <ellipse cx="74" cy="85" rx="5.7" ry="3.5" fill="#faf7ed"/><ellipse cx="104" cy="85" rx="5.7" ry="3.5" fill="#faf7ed"/>
    <circle cx="74" cy="85" r="2.9" fill={eyeColor}/><circle cx="104" cy="85" r="2.9" fill={eyeColor}/>
    {signature%4===0&&<><path d="M60 91Q69 94 79 92M100 92Q110 95 119 90" fill="none" stroke="#623e31" strokeOpacity=".32" strokeWidth="1.6"/></>}
    {signature%5===2&&<path d="M83 64Q90 62 96 63" fill="none" stroke="#65483d" strokeOpacity=".20" strokeWidth="2"/>}
    <path d="M89 86L86 101Q88 104 94 102" fill="none" stroke="#764d3b" opacity=".55" strokeWidth="2" strokeLinecap="round"/>
    <path d={p.expression===0?'M81 114Q88 117 98 113':p.expression===1?'M82 117Q88 108 98 115':p.expression===2?'M81 113Q89 118 98 113':'M83 114H96'} stroke="#683d36" strokeWidth="2.7" strokeLinecap="round" fill="none"/>
    {p.scar&&<path d="M111 86l-7 14m9-17-7 15" stroke="#e0baa0" strokeWidth="1.3"/>}
    {p.accessory===2&&<path d="M55 66Q85 60 120 64" stroke="#dedbd1" strokeWidth="5" fill="none"/>}
    {p.accessory===3&&<rect x="55" y="72" width="68" height="6" rx="3" fill="#26384b"/>}
    {fighter.style==='Muay Thai'&&<><path d="M51 57Q87 44 125 57" fill="none" stroke={crest} strokeWidth="5"/><path d="M127 57L129 77" stroke={crest} strokeWidth="3"/></>}
    {signature%7===1&&<path d="M53 101L58 109M119 104L124 111" stroke="#efdfc8" strokeOpacity=".6" strokeWidth="1.4"/>}
    {elite&&<><path d="M17 185H60" stroke={crest} strokeWidth="3"/><path d="M120 185H164" stroke={crest} strokeWidth="3"/></>}
    <text x="90" y="195" fill="#d5e5ea" opacity=".60" fontSize="7" textAnchor="middle" letterSpacing="1.1">{fighter.nickname.toUpperCase().slice(0,20)}</text>
    <path d="M2 183H178" stroke="#dce7e7" strokeOpacity=".12" strokeWidth="2"/>
  </svg>;
}
