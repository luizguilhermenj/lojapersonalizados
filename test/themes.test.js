import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createThemeStore } from '../themes/store.js';
import { themeRoutes } from '../routes/themes.js';

test('persistência, restauração, validação e bloqueio de armazenamento efêmero', () => {
  const localDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artize-themes-'));
  try {
    const store = createThemeStore({ env: {}, localDir });
    assert.equal(store.read(), 'artize');
    store.save('dia-das-maes');
    assert.equal(createThemeStore({ env: {}, localDir }).read(), 'dia-das-maes');
    assert.throws(() => store.save('../invalid'));
    assert.equal(store.read(), 'dia-das-maes');
    store.save('artize'); assert.equal(store.read(), 'artize');
    const blocked = createThemeStore({ env: { RENDER: 'true' }, localDir });
    assert.equal(blocked.writable, false); assert.throws(() => blocked.save('dia-das-maes'));
    const configured = createThemeStore({ env: { NODE_ENV: 'production', THEME_STORAGE_DIR: localDir, THEME_STORAGE_DURABLE: 'true' }, localDir });
    configured.save('dia-das-maes'); assert.equal(configured.read(), 'dia-das-maes');
    fs.writeFileSync(path.join(localDir, 'active-theme.json'), '{');
    assert.throws(() => configured.read());
  } finally { fs.rmSync(localDir, { recursive: true, force: true }); }
});

test('rotas negam visitantes e clientes; preview não altera o tema; falha de gravação retorna erro', async () => {
  let active = 'artize';
  const store = { read: () => active, save: id => { active = id; }, writable: true };
  const app = express(); app.use(express.json());
  const auth = (req, res, next) => req.headers.authorization ? next() : res.sendStatus(401);
  const adminOnly = (req, res, next) => req.headers.authorization === 'admin' ? next() : res.sendStatus(403);
  app.use('/api', themeRoutes({ store, auth, adminOnly }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const request = (route, method = 'GET', authorization, body) => fetch(url + route, { method, headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const [route, method] of [['/admin/themes', 'GET'], ['/admin/themes/dia-das-maes/preview', 'GET'], ['/admin/themes/active', 'PUT']]) {
      assert.equal((await request(route, method)).status, 401);
      assert.equal((await request(route, method, 'customer')).status, 403);
    }
    assert.equal((await request('/admin/themes/dia-das-maes/preview', 'GET', 'admin')).status, 200);
    assert.equal(active, 'artize');
    assert.equal((await request('/admin/themes/active', 'PUT', 'admin', { themeId: 'invalid' })).status, 400);
    assert.equal((await request('/admin/themes/active', 'PUT', 'admin', { themeId: 'dia-das-maes' })).status, 200);
    assert.equal((await (await request('/theme')).json()).theme.id, 'dia-das-maes');
    store.save = () => { throw new Error('disk failure'); };
    assert.equal((await request('/admin/themes/active', 'PUT', 'admin', { themeId: 'artize' })).status, 503);
    assert.equal(active, 'dia-das-maes');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
