/** Deterministic xorshift32. The internal state is serialized with every world save. */
export class Random {
  public state: number;
  constructor(seed:number) {this.state=(seed|0)||1234567;}
  next():number { let x=this.state|0; x^=x<<13; x^=x>>>17; x^=x<<5; this.state=x|0; return (x>>>0)/4294967296; }
  int(min:number,max:number):number {return Math.floor(min+this.next()*(max-min+1));}
  pick<T>(values:readonly T[]):T {return values[this.int(0,values.length-1)];}
  shuffle<T>(values:T[]):T[] {for(let i=values.length-1;i>0;i--){const j=this.int(0,i);[values[i],values[j]]=[values[j],values[i]];}return values;}
  weighted<T>(pairs:readonly (readonly [T,number])[]):T {const total=pairs.reduce((s,p)=>s+p[1],0);let roll=this.next()*total;for(const [item,w] of pairs){roll-=w;if(roll<=0)return item;}return pairs[pairs.length-1][0];}
  float(min:number,max:number):number{return min+(max-min)*this.next();}
}
