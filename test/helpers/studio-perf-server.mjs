// Serves every benchmark build over the same HTTP stack, with isolated API fixtures.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { themes } from '../../themes/config.js';
import { fromPalette } from '../../public/js/color-studio.js';
const use = express.application.use;
let mounted = false;
express.application.use = function (...args) {
  if (!mounted) {
    mounted = true;
    use.call(this, (req, res, next) => {
      const build = req.get('x-artize-perf-build');
      if (!['baseline','before','after'].includes(build)) return next();
      if (req.path === '/api/theme') {
        const theme = themes.find(t => t.id === req.get('x-artize-perf-theme'));
        if (!theme) return res.sendStatus(400);
        res.set('Cache-Control','no-store');
        const customization = req.get('x-artize-perf-look') === 'premium' ? fromPalette('midnight-emerald') : null;
        return res.json({ theme: { ...theme, customization } });
      }
      if (!['baseline','before'].includes(build)) return next();
      // Exact allowlist: no credentials/data directories or arbitrary snapshot paths.
      if (!['/css/themes.css','/css/admin.css','/js/themes.js','/js/home.js','/pages/home.html'].includes(req.path)) return next();
      const file = path.resolve('work/color-studio-v2/snapshots',build,'public',req.path.slice(1));
      if (!fs.existsSync(file)) return res.status(500).send('Missing benchmark snapshot');
      res.set('Cache-Control','no-store'); return res.sendFile(file);
    });
  }
  return use.apply(this, args);
};
await import('./visual-server.mjs');
