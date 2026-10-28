import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createNeonThemeStore } from '../themes/neon-store.js';
import { fromPalette } from '../public/js/color-studio.js';

// Runs the real parameterized PostgreSQL statements in an isolated WASM database.
// Does not connect to Neon or use any environment credential.
test('PostgreSQL: migrações reversíveis, JSONB por tema, publicação, instâncias e parâmetros', async () => {
  const db = new PGlite(); const calls = []; let fail = false, loseResponse = false;
  const sql = {
    query(query,params=[]) {
      const execute = async () => {
        calls.push({query,params});
        if(fail) throw Error('fixture offline');
        const result=await db.query(query,params);
        if(loseResponse && query.includes('SET color_studio')) throw Error('response lost after commit');
        return result.rows;
      };
      return {query,params,then:(resolve,reject)=>execute().then(resolve,reject)};
    },
    transaction(queries) { return db.transaction(async tx=>{const results=[];for(const q of queries)results.push((await tx.query(q.query,q.params)).rows);return results;}); }
  };
  const make=()=>createNeonThemeStore('isolated-pglite',{createSql:()=>sql});
  try {
    const store=make();assert.deepEqual(await store.readPublished(),{themeId:'artize',customization:null});
    const actor="admin'; DROP TABLE artize_theme_settings; --";
    const c=fromPalette('midnight-emerald');
    await store.saveStudio('natal',c,actor);
    assert.equal((await store.readPublished()).themeId,'artize');assert.equal((await store.readPublished()).customization,null);
    await store.publishStudio('natal',c,actor);assert.deepEqual(await make().readPublished(),{themeId:'natal',customization:c});
    await Promise.all([store.saveStudio('pascoa',fromPalette('lavanda'),actor),store.saveStudio('dia-das-maes',fromPalette('rosa-blush'),actor)]);
    const draft=await make().readStudio();assert.equal(draft.themes.natal.published.paletteId,'midnight-emerald');assert.equal(draft.themes.pascoa.draft.paletteId,'lavanda');assert.equal(draft.themes['dia-das-maes'].draft.paletteId,'rosa-blush');
    assert(calls.filter(c=>c.query.includes('SET color_studio')).every(c=>c.params[2]===actor&&!c.query.includes(actor)));
    assert.equal((await db.query('SELECT updated_by FROM artize_theme_settings')).rows[0].updated_by,actor);
    await store.save('pascoa');assert.equal((await store.readPublished()).customization,null);
    await store.save('natal');assert.deepEqual((await store.readPublished()).customization,c);
    await store.saveStudio('natal',null);assert.deepEqual((await store.readPublished()).customization,c,'saving original draft does not reset published');
    fail=true;await assert.rejects(store.publishStudio('natal',null));fail=false;assert.deepEqual((await store.readPublished()).customization,c);
    loseResponse=true;await assert.rejects(store.publishStudio('natal',null));loseResponse=false;assert.equal((await store.readPublished()).customization,null);
    for (const corrupted of [{}, {version:1,themes:null}, {version:1,themes:{natal:null}}]) {
      await db.query('UPDATE artize_theme_settings SET color_studio = $1::jsonb',[JSON.stringify(corrupted)]);
      assert.equal((await store.readPublished()).customization,null);
      await store.saveStudio('natal',c);assert.deepEqual((await store.readStudio()).themes.natal.draft,c);
      await store.publishStudio('natal',c);assert.deepEqual((await store.readPublished()).customization,c);
    }
    await db.exec(fs.readFileSync('migrations/001-color-studio.up.sql','utf8'));assert.equal((await store.read()).toString(),'natal');
    await db.exec(fs.readFileSync('migrations/001-color-studio.down.sql','utf8'));
    assert.equal((await db.query('SELECT theme_id FROM artize_theme_settings')).rows[0].theme_id,'natal');
    await db.exec(fs.readFileSync('migrations/001-color-studio.up.sql','utf8'));
    assert.deepEqual(await make().readStudio(),{version:1,themes:{}});
  } finally { await db.close(); }
});
