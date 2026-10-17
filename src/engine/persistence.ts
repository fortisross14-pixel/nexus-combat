import type {World} from './types';
import {upgradeWorld} from './world';

/** IndexedDB is the authoritative save.
 *  - `main` holds the live world: fighters, the current season and everything still changing.
 *  - `season-<year>` holds one closed season's ledger and key fights. Closed seasons never change,
 *    so each is written once instead of on every click. */
const DB='nexus-combat-chronicle-saves';const STORE='world';const KEY='main';
const seasonKey=(year:number)=>`season-${year}`;
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('IndexedDB unavailable'));
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Unable to open game storage'));
});}
const done=(tx:IDBTransaction)=>new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Save failed'));tx.onabort=()=>reject(tx.error||Error('Save aborted'));});
const asPromise=<T,>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});

interface SeasonRecord {world:string;ledger:World['ledger'][number];keyFights:World['keyFights'][number];}
interface MainRecord {world:World;worldId:string;archived:number[];}
/** Seasons already written for the world currently in memory (identified by seed + creation). */
let written={worldId:'',years:new Set<number>()};
const identity=(w:World)=>`${w.seed}:${w.fighters[0]?.id}:${w.fighters[0]?.name}`;

export async function readWorldDatabase():Promise<World|null>{
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
  const main=await asPromise(store.get(KEY)) as MainRecord|World|undefined;
  if(!main)return null;
  // v0.8 and earlier stored the whole world directly under `main`.
  if(!('archived' in main))return upgradeWorld(main);
  const ledger:World['ledger']={...main.world.ledger},keyFights:World['keyFights']={...main.world.keyFights};
  for(const year of main.archived){
   const season=await asPromise(store.get(seasonKey(year))) as SeasonRecord|undefined;
   if(season&&season.world===main.worldId){ledger[year]=season.ledger;keyFights[year]=season.keyFights;}
  }
  const world=upgradeWorld({...main.world,ledger,keyFights});
  if(world)written={worldId:main.worldId,years:new Set(main.archived)};
  return world;
 }finally{db.close();}
}
async function commitWorld(world:World):Promise<void>{
 const db=await database();
 try{
  const worldId=identity(world);
  if(written.worldId!==worldId)written={worldId,years:new Set()};
  const closed=Object.keys(world.ledger).map(Number).filter(y=>y<world.year);
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  for(const year of closed)if(!written.years.has(year))store.put({world:worldId,ledger:world.ledger[year],keyFights:world.keyFights[year]||[]} satisfies SeasonRecord,seasonKey(year));
  const live:World={...world,ledger:Object.fromEntries(Object.entries(world.ledger).filter(([y])=>Number(y)>=world.year)),keyFights:{}};
  store.put({world:live,worldId,archived:closed} satisfies MainRecord,KEY);
  await done(tx);
  for(const year of closed)written.years.add(year);
 }finally{db.close();}
}

/** Serialize writes so a slower earlier save never overwrites a later state. */
let writeQueue:Promise<void>=Promise.resolve();
export function storeWorldDatabase(world:World):Promise<void>{writeQueue=writeQueue.catch(()=>{}).then(()=>commitWorld(world));return writeQueue;}

/** Independent durable universe slots. Never rely on localStorage for large saves. */
export async function readUniverseSlots():Promise<(World|null)[]>{
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readonly');const store=tx.objectStore(STORE);
  const records=await Promise.all([0,1,2].map(i=>asPromise(store.get(`slot-${i}`))));
  return records.map(value=>value?upgradeWorld(value):null);
 }finally{db.close();}
}
export async function storeUniverseSlot(slot:number,world:World):Promise<void>{
 if(!Number.isInteger(slot)||slot<0||slot>2)throw Error('Invalid universe slot');
 const db=await database();try{
  const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(world,`slot-${slot}`);await done(tx);
 }finally{db.close();}
}
export async function deleteUniverseSlot(slot:number):Promise<void>{
 const db=await database();try{
  const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(`slot-${slot}`);await done(tx);
 }finally{db.close();}
}
/** Serializes slot operations so older snapshots cannot overwrite newer ones. */
let slotQueue:Promise<void>=Promise.resolve();
export function queueUniverseSlot(slot:number,world:World):Promise<void>{
 slotQueue=slotQueue.catch(()=>{}).then(()=>storeUniverseSlot(slot,world));return slotQueue;
}
export function queueDeleteUniverseSlot(slot:number):Promise<void>{
 slotQueue=slotQueue.catch(()=>{}).then(()=>deleteUniverseSlot(slot));return slotQueue;
}
