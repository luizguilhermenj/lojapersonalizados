import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../scripts/performance-stats.mjs';
test('estatísticas retêm amostras extremas e calculam mediana/p75 por nearest rank', () => {
  const values=[9164,704,1000,1200];
  assert.deepEqual(summarize(values),{n:4,mean:3017,min:704,median:1100,p75:1200,max:9164});
  assert.deepEqual(values,[9164,704,1000,1200]);
  assert.equal(summarize([8,1,5]).median,5);
  assert.throws(()=>summarize([1,NaN]));assert.throws(()=>summarize([]));
});
