import nexus from '../assets/brands/nexus.webp';
import nova from '../assets/brands/nova.webp';
import onyx from '../assets/brands/onyx.webp';
import type {Brand} from '../engine/types';
const asset={NEXUS:nexus,NOVA:nova,ONYX:onyx};
/** The three official, bundled combat-promotion marks, used throughout the game. */
export function BrandLogo({brand,size=48,className=''}:{brand:Brand|'NEXUS';size?:number;className?:string}){
 return <img className={`nexus-brand-logo ${className}`} src={asset[brand]}
  width={size} height={size} alt={`${brand} emblem`} loading="lazy" draggable={false}/>;
}
