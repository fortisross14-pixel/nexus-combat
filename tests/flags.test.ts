import {describe,expect,it} from 'vitest';
import {COUNTRIES} from '../src/engine/names';
import {hasFlag} from '../src/components/Flag';

describe('flags',()=>{
 it('bundles an image for every country fighters can come from',()=>{
  const missing=COUNTRIES.filter(c=>!hasFlag(c.flag)).map(c=>c.name);
  expect(missing).toEqual([]);
 });
});
