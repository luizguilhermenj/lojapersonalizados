import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { themes } from '../themes/config.js';
import { PALETTES, fromPalette } from '../public/js/color-studio.js';
import { createNeonThemeStore } from '../themes/neon-store.js';
import { validateTestConnection } from './helpers/neon-test-connection.js';

// Explicit opt-in only: never loads .env or falls back to the app's DATABASE_URL.
const databaseUrl = process.env.THEME_TEST_DATABASE_URL?.trim();
test('Neon real isolado: migrações, 12 paletas, rascunhos, publicação, novos clientes e restauração', {
  skip: !databaseUrl ? 'THEME_TEST_DATABASE_URL não configurada; nenhuma conexão alternativa foi usada' : false,
  timeout: 180_000
}, async () => {
  validateTestConnection(databaseUrl, process.env.DATABASE_URL);
  const schema = `artize_studio_test_${crypto.randomUUID().replaceAll('-', '')}`;
  const table = `"${schema}".artize_theme_settings`;
  const rewrite = query => query.replaceAll('public.artize_theme_settings', table);
  const sql = neon(databaseUrl);
  const requestOptions = () => ({ fetchOptions: { signal: AbortSignal.timeout(8000) } });
  const createSql = () => ({
    query: (query, params = [], options) => sql.query(rewrite(query), params, options),
    transaction: (queries, options) => sql.transaction(queries, options)
  });
  const store = () => createNeonThemeStore(databaseUrl, { createSql, studioWritable: true });
  async function migrate(direction) {
    const source = fs.readFileSync(new URL(`../migrations/001-color-studio.${direction}.sql`, import.meta.url), 'utf8');
    const statements = source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(s => s && !['BEGIN','COMMIT'].includes(s));
    await sql.transaction(statements.map(statement => sql.query(rewrite(statement))), { fetchOptions: { signal: AbortSignal.timeout(8000) } });
  }
  let created = false;
  try {
    await sql.query(`CREATE SCHEMA "${schema}"`, [], requestOptions()); created = true;
    assert.deepEqual(await store().readPublished(), { themeId: 'artize', customization: null });
    await migrate('up'); await migrate('up'); // idempotent, on an isolated table
    const expected = new Map();
    for (const [index, palette] of PALETTES.entries()) {
      const id = themes[index % themes.length].id;
      const config = fromPalette(palette.id);
      const before = await store().readPublished();
      await store().saveStudio(id, config, 'neon-isolated-test');
      assert.deepEqual(await store().readPublished(), before, 'draft never affects public state');
      await store().publishStudio(id, config, 'neon-isolated-test');
      expected.set(id, config);
      assert.deepEqual(await store().readPublished(), { themeId: id, customization: config }, 'new client reads the committed palette');
    }
    for (const { id } of themes) {
      await store().save(id);
      assert.deepEqual((await store().readPublished()).customization, expected.get(id), 'switching themes preserves their published colors');
      await store().saveStudio(id, null);
      assert.deepEqual((await store().readPublished()).customization, expected.get(id), 'restoring a draft does not publish it');
      await store().publishStudio(id, null);
      assert.deepEqual(await store().readPublished(), { themeId: id, customization: null });
    }
    await store().saveStudio('natal', fromPalette('lavanda'));
    await store().saveStudio('pascoa', fromPalette('menta'));
    const drafts = await store().readStudio();
    assert.equal(drafts.themes.natal.draft.paletteId, 'lavanda');
    assert.equal(drafts.themes.pascoa.draft.paletteId, 'menta');
    const active = await store().read();
    await migrate('down');
    assert.equal((await sql.query(`SELECT theme_id FROM ${table} WHERE id = 1`, [], requestOptions()))[0].theme_id, active);
    await migrate('up');
    assert.deepEqual(await store().readStudio(), { version: 1, themes: {} });
  } catch (error) {
    if (error.name === 'AssertionError') throw error;
    // Test runner output must not disclose connection strings or driver request data.
    throw new Error(`Falha na validação Neon isolada (${String(error.code || 'connection-or-query').replace(/[^a-zA-Z0-9_-]/g, '')}). Verifique endpoint, TLS, rede e permissões da credencial de testes.`);
  } finally {
    if (created) await sql.query(`DROP SCHEMA "${schema}" CASCADE`, [], requestOptions()).catch(() => {
      throw new Error(`Limpeza do schema de teste pendente: ${schema}. Remova apenas este schema no banco exclusivo de homologação.`);
    });
  }
});
