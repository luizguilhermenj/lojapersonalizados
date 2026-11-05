import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_CATEGORIES, filterArts, categoryPath } from '../public/js/art-categories.js';

test('nested filters preserve base catalog, separate genres and support all films', () => {
  const arts = [{id:'n',theme:'natal'},{id:'a',theme:'filmes',subcategory:'acao'},{id:'v',theme:'filmes',subcategory:'aventura'}];
  assert.equal(filterArts(arts).length,3);
  assert.deepEqual(filterArts(arts,'filmes').map(a=>a.id),['a','v']);
  assert.deepEqual(filterArts(arts,'filmes','acao').map(a=>a.id),['a']);
  assert.deepEqual(filterArts(arts,'filmes','terror'),[]);
  assert.deepEqual(filterArts(arts,'natal'),[arts[0]]);
  assert.equal(categoryPath('filmes','filmes-premiados'),'Filmes · Filmes premiados');
  assert.equal(ART_CATEGORIES.find(a=>a.id==='filmes').subcategories.length,6);
});
