import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createNeonThemeStore } from '../themes/neon-store.js';
import { PALETTES, fromPalette } from '../public/js/color-studio.js';
const up = () => fs.readFileSync('migrations/001-color-studio.up.sql','utf8');
function fixture(db) {
  const calls = [];
  const sql = {
    query(query, params = []) { const run = async () => { calls.push(query); return (await db.query(query,params)).rows; }; return { query, params, then: (resolve,reject) => run().then(resolve,reject) }; },
    transaction: queries => db.transaction(async tx => { const result=[]; for (const q of queries) { calls.push(q.query); result.push((await tx.query(q.query,q.params)).rows); } return result; })
  };
  return { calls, make: () => createNeonThemeStore('offline-isolated', { createSql: () => sql }) };
}
test('detecção JSONB: sem migração automática, esquema incompatível bloqueado e migração abortada sem perda', async () => {
  const db = new PGlite(), { calls, make } = fixture(db);
  try {
    const store = make(); await store.save('natal','existing-admin');
    const previous = (await db.query('SELECT * FROM artize_theme_settings')).rows;
    assert.equal(store.studioWritable,false); assert.equal((await store.readPublished()).themeId,'natal');
    await assert.rejects(store.publishStudio('artize',fromPalette('lavanda')));
    assert.deepEqual((await db.query('SELECT * FROM artize_theme_settings')).rows,previous);
    await db.exec("ALTER TABLE artize_theme_settings ADD COLUMN color_studio TEXT DEFAULT 'preserve-me'");
    const incompatible = make(); await incompatible.readStudio(); assert.equal(incompatible.studioWritable,false);
    await assert.rejects(incompatible.publishStudio('artize',null));
    await assert.rejects(db.exec(up())); await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT color_studio FROM artize_theme_settings')).rows[0].color_studio,'preserve-me');
    assert(!calls.some(q => /\bALTER\b|SET color_studio/.test(q)));
  } finally { await db.close(); }
});
test('persistência isolada: migração manual preserva legado, 12 paletas × quatro temas, nova instância e restauração', async () => {
  const db = new PGlite(), { calls, make } = fixture(db);
  try {
    const legacy = make(); await legacy.save('pascoa','original-admin');
    const previous = (await db.query('SELECT * FROM artize_theme_settings')).rows[0];
    await db.exec(up()); await db.exec(up());
    const row = (await db.query('SELECT * FROM artize_theme_settings')).rows[0];
    const { color_studio, ...preserved } = row; assert.deepEqual(preserved,previous); assert.deepEqual(color_studio,{version:1,themes:{}});
    const store = make(); await store.readStudio(); assert.equal(store.studioWritable,true);
    const ids = ['artize','natal','pascoa','dia-das-maes'];
    for (const palette of PALETTES) {
      for (const id of ids) {
        const c = fromPalette(palette.id), before = await store.readPublished();
        await store.saveStudio(id,c); assert.deepEqual(await store.readPublished(),before,'draft remains private');
        await store.publishStudio(id,c,'authorized-admin'); assert.deepEqual(await make().readPublished(),{themeId:id,customization:c});
      }
      const saved = await make().readStudio();
      assert(ids.every(id => saved.themes[id].published.paletteId === palette.id));
    }
    await store.publishStudio('natal',null); assert.equal((await make().readPublished()).customization,null);
    await store.save('pascoa'); assert.equal((await make().readPublished()).customization.paletteId,'graphite');
    const before = (await db.query('SELECT * FROM artize_theme_settings')).rows;
    await assert.rejects(store.publishStudio('pascoa',{...fromPalette('champagne'),background:'url(evil)'}));
    assert.deepEqual((await db.query('SELECT * FROM artize_theme_settings')).rows,before);
    assert(!calls.some(q => /\bALTER\b/.test(q)), 'DDL occurs only in explicit isolated migration calls');
    // Validate the inspection SQL in an isolated PostgreSQL transaction as well.
    await db.exec(fs.readFileSync('scripts/inspect-color-studio.sql','utf8'));
  } finally { await db.close(); }
});
