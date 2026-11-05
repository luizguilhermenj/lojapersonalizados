import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_CATEGORIES, buildCategories, filterArts, categoryPath } from '../public/js/art-categories.js';

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

test('planned upload groups show complete structures and merge actual artwork without duplicate filters', () => {
  const empty=buildCategories([]);
  for (const [id,count] of [['funko',7],['games',24],['musica-bandas-cantores',30],['series',20]]) {
    const category=empty.find(c=>c.id===id);
    assert.equal(category.upcoming,true);assert.equal(category.subcategories.length,count);
    assert.equal(new Set(category.subcategories.map(c=>c.id)).size,count);
    assert.deepEqual(filterArts([],id),[]);
  }
  const populated=buildCategories([{theme:'funko',themeLabel:'FUNKO',subcategory:'harry-potter',subcategoryLabel:'HARRY POTTER'}]);
  assert.equal(populated.filter(c=>c.id==='funko').length,1);
  assert.equal(populated.find(c=>c.id==='funko').subcategories.length,7);
  assert.equal(categoryPath('funko','harry-potter',populated),'Funko · Harry potter');
  assert.equal(categoryPath('games','the-last-of-us-part-2',empty),'Games · The last of us part 2');
  assert.equal(categoryPath('series','game-of-thrones',empty),'Séries · Game of thrones');
});
