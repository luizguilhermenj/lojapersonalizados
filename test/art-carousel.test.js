import test from 'node:test';
import assert from 'node:assert/strict';
import { mixedArts } from '../public/js/art-carousel.js';

function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const counts = {pascoa:50,natal:59,maes:64,namorados:21,paes:8,avos:15,flores:22,diversos:15};
const arts = Object.entries(counts).flatMap(([theme,count]) => Array.from({length:count},(_,n)=>({id:`${theme}-${n}`,theme,image:`/${theme}-${n}.jpg`})));

test('all 254 arts appear once, every theme opens each cycle, no adjacent categories across 100 shuffles', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const deck = mixedArts(arts, seeded(seed));
    assert.equal(deck.length,254); assert.equal(new Set(deck.map(art=>art.id)).size,254);
    assert.equal(new Set(deck.slice(0,8).map(art=>art.theme)).size,8);
    for(let i=1;i<deck.length;i++)assert.notEqual(deck[i].theme,deck[i-1].theme);
    assert.deepEqual(arts.map(a=>a.id).sort(),deck.map(a=>a.id).sort());
  }
});
test('new cycle and images are shuffled without changing input, preserving category alternation at the boundary', () => {
  const original=structuredClone(arts), first=mixedArts(arts,seeded(7));
  const second=mixedArts(arts,seeded(19),first.at(-1).theme);
  assert.notEqual(second[0].theme,first.at(-1).theme);
  assert.notDeepEqual(first.map(a=>a.id),second.map(a=>a.id));
  assert.deepEqual(arts,original);
});
test('empty, duplicate, invalid and single-category data remain finite and unique', () => {
  assert.deepEqual(mixedArts([]),[]);
  assert.equal(mixedArts([null,arts[0],arts[0],{id:'bad'}]).length,1);
  const single=arts.filter(art=>art.theme==='natal');
  assert.equal(mixedArts(single).length,59);
  const uneven=[...single,{id:'other',theme:'pascoa',image:'/p.jpg'}];
  assert.equal(new Set(mixedArts(uneven).map(art=>art.id)).size,60);
});
