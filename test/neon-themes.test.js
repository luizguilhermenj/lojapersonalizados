import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { neonConfig } from '@neondatabase/serverless';
import { createThemeStore } from '../themes/store.js';
import { createNeonThemeStore } from '../themes/neon-store.js';
import { themeRoutes } from '../routes/themes.js';

// Fixture de transporte: usa o driver oficial e inspeciona o SQL e os parâmetros
// realmente serializados. Não representa um banco Neon real.
function neonTransport() {
  const state = { theme: null, fail: false, commitThenFail: false, calls: [], user: null, version: 0 };
  function execute({ query, params }) {
    if (query.startsWith('INSERT')) {
      assert.match(query, /ON CONFLICT \(id\) DO NOTHING/);
      if (state.theme === null) { state.theme = params[0]; state.version = 1; }
    }
    if (query.startsWith('UPDATE')) {
      assert.match(query, /theme_id = \$1/); assert.match(query, /updated_by = \$2/);
      state.theme = params[0]; state.user = params[1]; state.version++;
    }
    const returnsTheme = query.startsWith('SELECT theme_id') || query.startsWith('UPDATE');
    return { fields: returnsTheme ? [{ name: 'theme_id', dataTypeID: 25 }] : [], rows: returnsTheme ? [[state.theme]] : [], rowCount: returnsTheme ? 1 : 0, command: query.split(' ')[0] };
  }
  state.fetch = async (url, options) => {
    assert.equal(new URL(url).protocol, 'https:');
    assert(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body); state.calls.push(body);
    if (state.fail) throw new Error('connection refused (fixture)');
    const result = body.queries ? { results: body.queries.map(execute) } : execute(body);
    if (state.delaySelect && body.query?.startsWith('SELECT theme_id')) await state.delaySelect;
    if (state.commitThenFail && body.query?.startsWith('UPDATE')) throw new Error('response lost after commit');
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  };
  return state;
}
const url = 'postgresql://fixture:fixture@ep-fixture.us-east-2.aws.neon.tech/fixture?sslmode=require';

// Sequenciais: fetchFunction é uma configuração global do driver apenas neste processo de teste.
test('driver Neon: criação idempotente, parâmetros, cache, ativação, reinicialização e restauração', async () => {
  const original = neonConfig.fetchFunction; const db = neonTransport(); neonConfig.fetchFunction = db.fetch;
  let now = 0;
  try {
    const store = createThemeStore({ env: { RENDER: 'true', DATABASE_URL: url }, neonOptions: { now: () => now } });
    assert.equal(store.provider, 'neon');
    assert.equal(await store.read(), 'artize');
    const bootstrap = db.calls[0].queries;
    assert.match(bootstrap[0].query, /pg_advisory_xact_lock/);
    assert.match(bootstrap[1].query, /CREATE TABLE IF NOT EXISTS/);
    assert.deepEqual(bootstrap[2].params, ['artize']);
    const actor = "admin'; DROP TABLE anything; --";
    await store.save('dia-das-maes', actor);
    assert.equal(db.user, actor);
    assert(!db.calls.at(-1).query.includes(actor));
    assert.deepEqual(db.calls.at(-1).params, ['dia-das-maes', actor]);
    const count = db.calls.length; assert.equal(await store.read(), 'dia-das-maes'); assert.equal(db.calls.length, count);
    // Simula outra instância e uma mudança externa: admin ignora cache.
    const restarted = createNeonThemeStore(url);
    assert.equal(await restarted.read(), 'dia-das-maes');
    assert.equal(db.version, 2, 'bootstrap não sobrescreve o registro');
    await restarted.save('artize', 'admin');
    assert.equal(await store.read({ fresh: true }), 'artize');
    await store.save('dia-das-maes'); now += 15 * 60 * 1000;
    db.theme = 'artize'; assert.equal(await store.read(), 'artize', 'cache expira');
    assert.equal(await createNeonThemeStore(url).read(), 'artize');
    let release;
    db.delaySelect = new Promise(resolve => { release = resolve; });
    const inFlightRead = store.read({ fresh: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    await store.save('dia-das-maes'); release(); db.delaySelect = undefined;
    assert.equal(await inFlightRead, 'dia-das-maes', 'leitura antiga não desfaz publicação no cache');
    assert.equal(await store.read(), 'dia-das-maes');
    const before = db.calls.length; await assert.rejects(store.save('invalid')); assert.equal(db.calls.length, before);
  } finally { neonConfig.fetchFunction = original; }
});

test('driver Neon: falha inicial permite retry; erro não apaga tema e timeout após commit é reconciliado', async () => {
  const original = neonConfig.fetchFunction; const db = neonTransport(); neonConfig.fetchFunction = db.fetch;
  try {
    const store = createNeonThemeStore(url); db.fail = true;
    await assert.rejects(store.read()); assert.equal(db.theme, null);
    db.fail = false; await store.save('dia-das-maes');
    db.fail = true; await assert.rejects(store.save('artize')); assert.equal(db.theme, 'dia-das-maes');
    await assert.rejects(store.read({ fresh: true }));
    db.fail = false; assert.equal(await store.read(), 'dia-das-maes');
    db.commitThenFail = true;
    await assert.rejects(store.save('artize'));
    db.commitThenFail = false;
    assert.equal(await store.read(), 'artize', 'não mantém cache anterior após resposta perdida');
    db.theme = 'invalid'; await assert.rejects(store.read({ fresh: true })); assert.equal(db.theme, 'invalid');
    await assert.rejects(createNeonThemeStore('invalid connection string').read());
  } finally { neonConfig.fetchFunction = original; }
});

test('rotas aguardam banco; retornam 503 sem vazar credenciais e preservam último tema público', async () => {
  let active = 'artize'; let fail = false; let actor;
  const store = {
    writable: true, provider: 'neon',
    async read() { if (fail) throw new Error('postgresql://secret'); return active; },
    async save(id, userId) { await new Promise(r => setTimeout(r, 10)); if (fail) throw new Error('postgresql://secret'); active = id; actor = userId; }
  };
  const app = express(); app.use(express.json());
  const auth = (req, res, next) => { req.user = { id: 'admin-fixture' }; next(); };
  app.use('/api', themeRoutes({ store, auth, adminOnly: (req, res, next) => next() }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const put = themeId => fetch(base + '/admin/themes/active', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeId }) });
  try {
    assert.equal((await put('dia-das-maes')).status, 200); assert.equal(active, 'dia-das-maes'); assert.equal(actor, 'admin-fixture');
    fail = true;
    const response = await put('artize'); assert.equal(response.status, 503); assert(!(await response.text()).includes('postgresql://'));
    assert.equal((await fetch(base + '/admin/themes')).status, 503);
    const publicData = await (await fetch(base + '/theme')).json(); assert.equal(publicData.theme.id, 'dia-das-maes'); assert.equal(publicData.stale, true);
    assert.equal(active, 'dia-das-maes');
    fail = false; assert.equal((await put('artize')).status, 200);
  } finally { await new Promise(r => server.close(r)); }
});
