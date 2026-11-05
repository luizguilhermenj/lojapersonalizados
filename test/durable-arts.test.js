import test from 'node:test';
import assert from 'node:assert/strict';
import { createDurableCatalog } from '../lib/durable-art-catalog.js';
import { createNeonArtStore, ARTS_DDL, ARTS_UPSERT, ARTS_SCHEMA_UPGRADE, validateArts } from '../lib/neon-art-store.js';
import { cloudinaryConfig } from '../lib/cloudinary-arts.js';

const baseFile = new URL('../public/data/caneca-ceramica-artes.json', import.meta.url);
const art = (id = 'a') => ({ id: `cloudinary-${id}`, asset_id: id, public_id: id, name: id, description: 'Natal', theme: 'natal', themeLabel: 'Natal', image: `https://res.cloudinary.com/etoqnuvw/image/upload/v1/${id}.jpg` });
function durableFixture() {
  const records = new Map(); let readsFail = false, writesFail = false;
  const store = {
    async read() { if (readsFail) throw new Error('private database URL'); return [...records.values()]; },
    async save(incoming) {
      if (writesFail) throw new Error('private database URL');
      let added = 0, updated = 0;
      for (const incomingArt of incoming) {
        const previous = records.get(incomingArt.asset_id);
        const finalArt = previous ? { ...incomingArt, id: previous.id } : incomingArt;
        if (!previous) added++; else if (JSON.stringify(previous) !== JSON.stringify(finalArt)) updated++;
        records.set(incomingArt.asset_id, finalArt);
      }
      return { added, updated, unchanged: incoming.length - added - updated, received: incoming.length, total: records.size };
    }
  };
  return { store, records, failReads: value => { readsFail = value; }, failWrites: value => { writesFail = value; } };
}
test('durable catalog survives service recreation, keeps 195 originals and imports only once', async () => {
  const fixture = durableFixture(); let calls = 0;
  const make = () => createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: async () => { calls++; return [art(), {...art('b'),theme:'filmes',subcategory:'acao'}]; } });
  const first = make(); assert.equal((await first.bootstrap()).total, 2);
  const original = (await first.get()).slice(0,195);
  const restarted = make(); await restarted.bootstrap(); assert.equal(calls, 1);
  assert.deepEqual((await restarted.get()).slice(0,195), original);
  assert.equal((await restarted.get()).length, 197);
  assert.equal((await restarted.status()).durable, true);
  assert.equal((await restarted.sync()).unchanged, 2);
});
test('Cloudinary pagination failure never calls durable save; database failure is sanitized', async () => {
  const fixture = durableFixture(); fixture.records.set('a', art());
  const failed = createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: async () => { throw new Error('private upstream details'); } });
  await assert.rejects(failed.sync(), error => error.status === 503 && !error.message.includes('private'));
  assert.equal(fixture.records.size, 1);
  fixture.failWrites(true);
  const catalog = createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: async () => [art('b')] });
  await assert.rejects(catalog.sync(), error => error.status === 503 && !error.message.includes('private'));
  assert.equal(fixture.records.size, 1);
  fixture.failWrites(false); assert.equal((await catalog.sync()).added, 1);
});
test('database outage keeps last readable arts; fresh process preserves originals and exposes warning', async () => {
  const fixture = durableFixture(); fixture.records.set('a', art());
  const catalog = createDurableCatalog({ baseFile, store: fixture.store });
  assert.equal((await catalog.get()).length, 196);
  fixture.failReads(true); assert.equal((await catalog.get()).length, 196);
  assert.equal((await createDurableCatalog({ baseFile, store: fixture.store }).get()).length, 195);
  const status = await catalog.status(); assert(status.warning); assert(!JSON.stringify(status).includes('private'));
});
test('missing credentials and invalid/colliding input never write; overlapping sync rejected', async () => {
  const fixture = durableFixture();
  await assert.rejects(createDurableCatalog({ baseFile, store: fixture.store }).sync(), error => error.status === 503);
  for (const incoming of [[{ ...art(), id: 'base-id' }], [art(), art()], [{ ...art(), image: 'https://example.com/x' }]]) {
    await assert.rejects(createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: async () => incoming }).sync());
  }
  assert.equal(fixture.records.size, 0);
  let release; const catalog = createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: () => new Promise(resolve => { release = resolve; }) });
  const pending = catalog.sync();
  await assert.rejects(catalog.sync(), error => error.status === 409);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release([art()]); await pending;
});
test('committed sync is reported as successful even if following refresh fails', async () => {
  const fixture = durableFixture(); const originalSave = fixture.store.save;
  fixture.store.save = async arts => { const counts = await originalSave(arts); fixture.failReads(true); return counts; };
  const catalog = createDurableCatalog({ baseFile, store: fixture.store, credentialsReady: true, list: async () => [art()] });
  assert.equal((await catalog.sync()).added, 1); assert.equal(fixture.records.size, 1);
});
test('Neon adapter batches lock+upsert, parameterizes metadata and retries failed initialization', async () => {
  let fail = true; const transactions = [];
  const sql = { query: (query, params = []) => ({ query, params }), transaction: async queries => {
    transactions.push(queries);
    if (fail) { fail = false; throw new Error('offline failure'); }
    return [[], [], queries[2].query === ARTS_UPSERT ? [{added:1,updated:0,unchanged:0,received:1,total:1,written:1}] : []];
  } };
  const store = createNeonArtStore('offline-fixture', { createSql: () => sql });
  await assert.rejects(store.save([art()]));
  assert.equal((await store.save([art()])).added, 1);
  assert.equal(transactions.length, 3);
  assert.equal(transactions[1][2].query, ARTS_DDL);
  assert.equal(transactions[1][3].query, ARTS_SCHEMA_UPGRADE);
  assert.match(transactions[2][1].query, /pg_advisory_xact_lock/);
  assert.deepEqual(JSON.parse(transactions[2][2].params[0]), [art()]);
  assert(!ARTS_DDL.includes('ALTER')); assert(!ARTS_UPSERT.includes('DELETE'));
  const tables = [...(ARTS_DDL + ARTS_UPSERT).matchAll(/public\.(\w+)/g)].map(match => match[1]);
  assert(tables.every(table => table === 'artize_cloudinary_arts'));
});

test('new film bootstrap preserves saved Natal; approved schema upgrade touches only arts constraint', async () => {
  const fixture = durableFixture(); fixture.records.set('a',art());
  const film = {...art('movie'),theme:'filmes',subcategory:'acao'};
  const catalog = createDurableCatalog({baseFile,store:fixture.store,credentialsReady:true,list:async()=>[art(),film]});
  assert.equal((await catalog.bootstrap()).total,2);
  assert.equal((await catalog.status()).categories.filmes,1);
  assert.deepEqual(fixture.records.get('a'),art());
  assert.deepEqual(validateArts([film]),[film]);
  assert.throws(()=>validateArts([{...film,subcategory:'unknown'}]));
  assert.throws(()=>validateArts([{...film,subcategory:undefined}]));
  assert(!/DROP\s+(TABLE|COLUMN)|ALTER\s+COLUMN|DELETE\s+FROM/i.test(ARTS_SCHEMA_UPGRADE));
  assert(ARTS_SCHEMA_UPGRADE.includes("'artize_cloudinary_arts_check'"));
  assert(ARTS_SCHEMA_UPGRADE.includes("'artize_cloudinary_arts_art_check'"));
  assert(ARTS_SCHEMA_UPGRADE.includes('pg_get_constraintdef'));
  const tables = [...ARTS_SCHEMA_UPGRADE.matchAll(/public\.(\w+)/g)].map(match=>match[1]);
  assert(tables.every(table=>table==='artize_cloudinary_arts'));
});

test('operational diagnostics expose only stage, SQLSTATE and counts without secrets', async () => {
  const fixture=durableFixture();
  fixture.store.save=async()=>{const error=new Error('postgresql://private-password@private-host');error.code='23514';throw error;};
  const catalog=createDurableCatalog({baseFile,store:fixture.store,credentialsReady:true,list:async()=>[art()]});
  await assert.rejects(catalog.sync(),error=>/validação/.test(error.message)&&!error.message.includes('private'));
  assert.deepEqual(catalog.operationalStatus(),{state:'failed',stage:'neon',code:'23514'});
  fixture.store.save=async()=>{throw {code:'private-password',message:'private-host'};};
  await assert.rejects(catalog.sync());
  assert.equal(catalog.operationalStatus().code,null);
});
test('Cloudinary URL supported without accepting placeholder secrets', () => {
  assert.equal(cloudinaryConfig({ CLOUDINARY_URL:'cloudinary://key:secret@etoqnuvw' }).configured, true);
  assert.equal(cloudinaryConfig({ CLOUDINARY_URL:'cloudinary://<your_api_key>:<your_api_secret>@etoqnuvw' }).configured, false);
  assert.equal(cloudinaryConfig({ CLOUDINARY_URL:'malformed secret' }).configured, false);
});
