import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { PALETTES } from '../public/js/color-studio.js';
import { summarize } from '../scripts/performance-stats.mjs';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'artize-save-apply-'));
const base = 'http://127.0.0.1:4341', headers = { Authorization: 'Bearer isolated-admin' };
let child, browser, stderr = '';
async function start() {
  child = spawn(process.execPath, ['test/helpers/studio-save-apply-server.mjs'], {
    env: { ...process.env, PORT: '4341', STUDIO_FIXTURE_DIR: directory }, stdio: ['ignore','ignore','pipe']
  });
  child.stderr.on('data', d => stderr += d);
  for (let i = 0; i < 200; i++) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 50));
  }
  throw Error('Isolated PostgreSQL fixture did not start: ' + stderr);
}
async function stop() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)); } }
const published = async () => (await (await fetch(base + '/api/theme')).json()).theme;
try {
  await start();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const shop = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); shop.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.addInitScript(() => localStorage.setItem('artize_session_v1', JSON.stringify({ token: 'isolated-admin', user: { id: 'isolated-user', name: 'Admin', role: 'admin' } })));
  await page.goto(base + '/pages/admin.html'); await page.locator('.palette-choice').last().waitFor();
  assert.equal((await (await fetch(base + '/api/admin/themes', { headers })).json()).colorStudioMode, 'persistent');
  const button = page.getByRole('button', { name: 'Salvar e aplicar paleta', exact: true });
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of ['palettes','custom','preview','settings']) {
      await page.locator('#tab-' + tab).click(); assert(await button.isVisible(), `${width}/${tab}: primary action visible`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${tab}: no overflow`);
    }
  }
  console.log('PASS primary action visible in all 4 tabs × 4 widths');
  const success = () => page.waitForFunction(() => document.getElementById('studioFeedback').textContent.includes('Paleta salva e aplicada'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const before = await published(), saveSamples = [], contrastResults = [];
  for (const palette of PALETTES) {
    const previous = await published();
    await page.locator('#tab-palettes').click(); await page.locator(`[data-palette="${palette.id}"]`).click();
    assert((await page.locator('#studioState').textContent()).includes('Alterações não salvas'));
    assert.deepEqual(await published(), previous, 'selection must not change the public store');
    await page.locator('#tab-preview').click();
    await page.frameLocator('#themePreviewFrame').locator('html[data-color-studio]').waitFor();
    const response = page.waitForResponse(r => r.url().includes('/color-studio/publish') && r.request().method() === 'PUT');
    await button.click(); const saved = await response; assert.equal(saved.status(), 200); await saved.finished();
    // responseEnd is relative to the request start in Playwright's ResourceTiming model.
    const timing = saved.request().timing(); saveSamples.push({ palette: palette.id, requestMs: timing.responseEnd });
    await success(); assert.equal((await published()).customization.paletteId, palette.id);
    await page.reload(); await page.locator('.palette-choice').last().waitFor();
    assert.equal(await page.locator(`[data-palette="${palette.id}"]`).getAttribute('aria-pressed'), 'true');
    await shop.goto(base + '/pages/home.html'); await shop.locator('html[data-theme="artize"][data-color-studio]').waitFor();
    await shop.locator('.product-card').first().waitFor();
    assert.equal(await shop.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--store-background').trim()), palette.background);
    const ratios = await shop.evaluate(() => {
      const lum = rgb => { const a = rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(c => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
      return [...document.querySelectorAll('.primary-btn,.chip,.product-body h3,.product-body p,.price,.footer-intro p,.footer-links a,.header-search,.desktop-navigation a')].filter(el => el.getClientRects().length).map(el => {
        let bg = el; while (bg && getComputedStyle(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
        const a = lum(getComputedStyle(el).color), b = lum(getComputedStyle(bg).backgroundColor); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
      });
    });
    assert(ratios.length > 10); assert(Math.min(...ratios) >= 4.49, `${palette.id}: contrast`);
    contrastResults.push({ palette: palette.id, minimum: Math.min(...ratios) });
  }
  assert.equal(before.customization, null);
  console.log('PASS all 12 palettes saved through UI into PostgreSQL; admin reload/public mobile colors and computed text/CTA contrast');
  // An explicit theme activation must never publish unsaved edits.
  await page.locator('#tab-palettes').click(); await page.locator('[data-palette="champagne"]').click();
  await page.locator('#publishTheme').click(); await page.waitForFunction(() => document.getElementById('themeFeedback').textContent.includes('Tema ativado com sucesso'));
  assert.equal((await published()).customization.paletteId, 'graphite');
  await page.locator('#discardStudio').click(); assert.equal(await page.locator('[data-palette="graphite"]').getAttribute('aria-pressed'), 'true');
  // Four independently saved themes survive switching and PostgreSQL/server restart.
  for (const [i,id] of ['artize','natal','pascoa','dia-das-maes'].entries()) {
    await page.locator(`input[name="appearanceTheme"][value="${id}"]`).check();
    await page.locator(`[data-palette="${PALETTES[i].id}"]`).click(); await button.click(); await success();
  }
  await stop(); await start();
  for (const [i,id] of ['artize','natal','pascoa','dia-das-maes'].entries()) {
    const response = await fetch(base + '/api/admin/themes/active', { method: 'PUT', headers: { ...headers, 'Content-Type':'application/json' }, body: JSON.stringify({ themeId: id }) });
    assert.equal(response.status, 200); assert.equal((await published()).customization.paletteId, PALETTES[i].id);
  }
  await shop.reload(); await shop.locator('html[data-theme="dia-das-maes"][data-color-studio]').waitFor();
  console.log('PASS explicit theme activation does not publish edits; four palettes survive theme changes and full server/database restart');
  await page.reload(); await page.locator('.palette-choice').last().waitFor();
  // Error keeps the draft and the public colors; loading prevents duplicate saves/theme changes.
  await page.locator('[data-palette="royal-purple"]').click();
  await page.route('**/color-studio/publish', route => route.fulfill({ status: 503, json: { error: 'Falha simulada. Tente novamente.' } }));
  await button.click(); await page.locator('#studioFeedback.error').waitFor();
  assert.equal((await published()).customization.paletteId, 'menta'); assert.equal(await page.locator('[data-palette="royal-purple"]').getAttribute('aria-pressed'), 'true');
  assert(await button.isEnabled()); await page.unroute('**/color-studio/publish');
  await page.route('**/color-studio/publish', route => route.abort('failed'));
  await button.click(); await page.waitForFunction(() => document.getElementById('studioFeedback').textContent.includes('Falha de conexão'));
  assert.equal((await published()).customization.paletteId, 'menta');
  assert(await button.isEnabled()); await page.unroute('**/color-studio/publish');
  let release, intercepted; const pending = new Promise(r => intercepted = r);
  await page.route('**/color-studio/publish', async route => { await new Promise(r => { release = r; intercepted(); }); await route.continue(); });
  await button.click(); await pending;
  assert(await page.getByRole('button', { name: 'Salvando…', exact: true }).isDisabled());
  assert.equal(await page.locator('#colorStudio').getAttribute('aria-busy'), 'true'); assert(await page.locator('input[name="appearanceTheme"]').first().isDisabled());
  release(); await success(); await page.unroute('**/color-studio/publish');
  await page.locator('#resetStudio').click(); assert.equal((await published()).customization.paletteId, 'royal-purple');
  await button.click(); await success(); assert.equal((await published()).customization, null);
  await shop.reload(); await shop.locator('html[data-theme="dia-das-maes"]:not([data-color-studio])').waitFor();
  console.log('PASS errors retain edits, loading/duplicate-submit lock, original colors restored only after explicit save/apply');
  const calls = (await (await fetch(base + '/__test/state', { headers })).json()).calls;
  assert(!calls.some(sql => /\bALTER\b/.test(sql)), 'application must not migrate automatically');
  assert.deepEqual(errors, []);
  const artifacts = 'work/color-studio-save-apply'; fs.mkdirSync(artifacts, { recursive: true });
  await page.locator('#tab-palettes').click(); await page.locator('#colorStudio').screenshot({ path: artifacts + '/desktop.png' });
  await page.setViewportSize({ width: 390, height: 900 }); await page.locator('#colorStudio').screenshot({ path: artifacts + '/mobile.png' });
  fs.writeFileSync(artifacts + '/browser-results.json', JSON.stringify({ database:'isolated PGlite on temporary disk; no live Neon', palettes:12, themes:4, widths:[320,390,768,1440], restart:true, errors, saveTiming:{ metric:'HTTP request responseEnd in local browser, includes PostgreSQL; no network/Render latency', samples:saveSamples, summary:summarize(saveSamples.map(s=>s.requestMs)) }, contrast:contrastResults }, null, 2) + '\n');
} finally { await browser?.close(); await stop(); fs.rmSync(directory, { recursive:true, force:true }); }
