// Isolated PostgreSQL on a temporary directory; never imports .env or connects to Neon.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PGlite } from '@electric-sql/pglite';
import { createNeonThemeStore } from '../../themes/neon-store.js';
import { themeRoutes } from '../../routes/themes.js';
const directory = path.resolve(process.env.STUDIO_FIXTURE_DIR || '');
if (!directory.startsWith(path.join(os.tmpdir(), 'artize-save-apply-'))) throw Error('An isolated temporary fixture directory is required');
const db = new PGlite(directory);
const calls = [];
const sql = {
  query(query, params = []) {
    const run = async () => { calls.push(query); return (await db.query(query, params)).rows; };
    return { query, params, then: (resolve, reject) => run().then(resolve, reject) };
  },
  transaction: queries => db.transaction(async tx => {
    const rows = [];
    for (const q of queries) { calls.push(q.query); rows.push((await tx.query(q.query, q.params)).rows); }
    return rows;
  })
};
await createNeonThemeStore('offline-fixture', { createSql: () => sql, studioWritable: false }).read();
// Explicit migration only in this isolated fixture, before constructing the application store.
await db.exec(fs.readFileSync('migrations/001-color-studio.up.sql', 'utf8'));
const store = createNeonThemeStore('offline-fixture', { createSql: () => sql });
const app = express(); app.use(express.json());
const auth = (req, res, next) => {
  const token = req.get('authorization');
  if (!['Bearer isolated-admin', 'Bearer isolated-customer'].includes(token)) return res.sendStatus(401);
  req.user = { id: 'isolated-user', role: token === 'Bearer isolated-admin' ? 'admin' : 'customer' }; next();
};
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.sendStatus(403);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/products', (req, res) => res.json(JSON.parse(fs.readFileSync('data/products.json','utf8'))));
app.get('/api/admin/orders', auth, adminOnly, (req, res) => res.json({ orders: [] }));
app.get('/api/admin/notifications/new-sales', auth, adminOnly, (req, res) => res.json({ hasNewSales: false }));
app.get('/__test/state', auth, adminOnly, (req, res) => res.json({ calls }));
app.use('/api', themeRoutes({ store, auth, adminOnly })); app.use(express.static('public'));
const server = app.listen(Number(process.env.PORT || 4341), '127.0.0.1');
process.on('SIGTERM', () => server.close(async () => { await db.close(); process.exit(0); }));
