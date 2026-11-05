import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listNatalArts, NATAL_FOLDER } from '../lib/cloudinary-arts.js';
import { createCatalog } from '../lib/art-catalog.js';
const env = { CLOUDINARY_CLOUD_NAME: 'etoqnuvw', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test' };
const asset = (id = 'a') => ({ asset_id: id, public_id: '3_MOCKUPS', resource_type: 'image', asset_folder: NATAL_FOLDER, secure_url: 'https://res.cloudinary.com/etoqnuvw/image/upload/v1/3_MOCKUPS.jpg' });
const response = payload => ({ ok: true, json: async () => payload });
test('paginates exact asset folder independently of public_id and deduplicates', async () => {
  const calls = [];
  const arts = await listNatalArts({ env, fetcher: async url => {
    calls.push(url);
    return response(calls.length === 1 ? { resources: [asset()], next_cursor: 'page2' } : { resources: [asset(), asset('b')] });
  } });
  assert.equal(arts.length, 2);
  assert.equal(calls[0].searchParams.get('asset_folder'), NATAL_FOLDER);
  assert.equal(calls[1].searchParams.get('next_cursor'), 'page2');
  assert.equal(arts[0].image, asset().secure_url);
  assert.equal(arts[0].theme, 'natal');
});
test('rejects credentials, API errors, network errors, invalid resources and repeated cursors', async () => {
  await assert.rejects(listNatalArts({ env: {} }), /credenciais/);
  for (const status of [401, 403, 420, 429, 500]) {
    await assert.rejects(listNatalArts({ env, fetcher: async () => ({ ok: false, status }) }));
  }
  await assert.rejects(listNatalArts({ env, fetcher: async () => { throw new Error('secret must not leak'); } }), error => !error.message.includes('secret'));
  for (const payload of [{}, { resources: [ { ...asset(), secure_url: 'javascript:bad' } ] }, { resources: [{ ...asset(), asset_folder: 'other' }] }, { resources: [ { ...asset(), asset_id: null } ] }]) {
    await assert.rejects(listNatalArts({ env, fetcher: async () => response(payload) }));
  }
  await assert.rejects(listNatalArts({ env, fetcher: async () => response({ resources: [], next_cursor: 'repeat' }) }), /Paginação/);
});
async function fixture(t, list) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'artize-sync-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const baseFile = new URL('../public/data/caneca-ceramica-artes.json', import.meta.url);
  const syncFile = path.join(dir, 'synced.json');
  return { dir, syncFile, catalog: createCatalog({ baseFile, syncFile, list }) };
}
test('preserves all 195 originals, updates by asset_id, never removes and is idempotent', async t => {
  let arts = await listNatalArts({ env, fetcher: async () => response({ resources: [asset(), asset('b')] }) });
  const { catalog } = await fixture(t, async () => arts);
  const before = await catalog.get();
  assert.equal(before.length, 195);
  assert.equal((await catalog.sync()).added, 2);
  assert.deepEqual(await catalog.sync(), { added: 0, updated: 0, unchanged: 2, received: 2, total: 2 });
  arts = [{ ...arts[0], name: 'Updated' }];
  assert.equal((await catalog.sync()).updated, 1);
  const after = await catalog.get();
  assert.deepEqual(after.slice(0, 195), before);
  assert.equal(after.length, 197);
  arts = [];
  await catalog.sync();
  assert.equal((await catalog.get()).length, 197);
});
test('failure on a later page leaves the last saved catalog byte-for-byte intact', async t => {
  let fail = false;
  const { catalog, syncFile, dir } = await fixture(t, async () => {
    let page = 0;
    return listNatalArts({ env, fetcher: async () => {
      if (fail && ++page === 2) throw new Error('network');
      return response({ resources: [asset()], ...(fail ? { next_cursor: 'next' } : {}) });
    } });
  });
  await catalog.sync();
  const before = await fs.readFile(syncFile, 'utf8');
  fail = true;
  await assert.rejects(catalog.sync());
  assert.equal(await fs.readFile(syncFile, 'utf8'), before);
  assert.deepEqual(await fs.readdir(dir), ['synced.json']);
});
test('blocks overlapping syncs and releases lock after failure', async t => {
  let release;
  const { catalog } = await fixture(t, () => new Promise(resolve => { release = resolve; }));
  const first = catalog.sync();
  await assert.rejects(catalog.sync(), error => error.status === 409);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release([]);
  await first;
  release = undefined;
  const next = catalog.sync();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release([]);
  await next;
});

test('HTTP endpoint requires authentication and admin role; public API preserves catalog', async t => {
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'artize-http-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const root = new URL('../', import.meta.url);
  await fs.cp(new URL('lib/', root), path.join(dir, 'lib'), { recursive: true });
  await fs.mkdir(path.join(dir, 'public', 'data'), { recursive: true });
  await fs.copyFile(new URL('public/data/caneca-ceramica-artes.json', root), path.join(dir, 'public', 'data', 'caneca-ceramica-artes.json'));
  await fs.copyFile(new URL('package.json', root), path.join(dir, 'package.json'));
  await fs.symlink(new URL('node_modules', root).pathname, path.join(dir, 'node_modules'));
  await fs.mkdir(path.join(dir, 'data'));
  const fixtures = {
    users: [{ id: 'admin', role: 'admin', lastAdminSeenAt: null }, { id: 'buyer', role: 'customer' }],
    sessions: [{ userId: 'admin', token: 'admin-test' }, { userId: 'buyer', token: 'buyer-test' }], orders: [], products: []
  };
  for (const [name, data] of Object.entries(fixtures)) await fs.writeFile(path.join(dir, 'data', `${name}.json`), JSON.stringify(data));
  let source = await fs.readFile(new URL('server.js', root), 'utf8');
  source = source.replace(/app\.listen\(PORT,[^\n]+/, "app.listen(0, function () { console.log('TEST_PORT=' + this.address().port); });");
  await fs.writeFile(path.join(dir, 'server.js'), source);
  const child = spawn(process.execPath, ['server.js'], { cwd: dir, env: { ...process.env, CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode !== null || child.signalCode !== null) return; const done = once(child, 'exit'); child.kill(); await done; });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test server startup timed out')), 10000);
    child.stdout.on('data', chunk => { const match = chunk.toString().match(/TEST_PORT=(\d+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    child.on('exit', () => { clearTimeout(timeout); reject(new Error('Test server exited')); });
  });
  const url = `http://127.0.0.1:${port}`;
  const request = token => fetch(`${url}/api/admin/arts/sync`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  assert.equal((await request()).status, 401);
  assert.equal((await request('invalid')).status, 401);
  assert.equal((await request('buyer-test')).status, 403);
  assert.equal((await request('admin-test')).status, 503);
  const catalogResponse = await fetch(`${url}/api/caneca-ceramica-arts`);
  assert.equal(catalogResponse.headers.get('cache-control'), 'no-store');
  const base = JSON.parse(await fs.readFile(new URL('public/data/caneca-ceramica-artes.json', root), 'utf8'));
  assert.deepEqual(await catalogResponse.json(), base);
});

test('failed sync releases lock for a retry; corrupted file is never silently replaced', async t => {
  let fail = true;
  const { catalog, syncFile } = await fixture(t, async () => { if (fail) throw new Error('API unavailable'); return []; });
  await assert.rejects(catalog.sync());
  fail = false;
  assert.equal((await catalog.sync()).total, 0);
  await fs.writeFile(syncFile, 'corrupt');
  await assert.rejects(catalog.sync());
  assert.equal(await fs.readFile(syncFile, 'utf8'), 'corrupt');
});
