import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { PALETTES, fromPalette, validateCustomization, safeCustomization, customizationTokens, contrast } from '../public/js/color-studio.js';
import { themes } from '../themes/config.js';
import { createThemeStore } from '../themes/store.js';
import { themeRoutes } from '../routes/themes.js';

const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'artize-studio-'));
test('12 paletas exatas, grupos, HEX, limites, glow e tokens de leitura AA', () => {
  assert.equal(PALETTES.length, 12);
  assert.equal(PALETTES.filter(p => p.group === 'soft').length, 6);
  assert.equal(PALETTES.filter(p => p.group === 'premium').length, 6);
  assert.deepEqual(PALETTES.map(p => p.background), ['#FFF6E8','#F3EEFF','#FFF0F3','#E9F7F1','#ECF4FF','#FFF1E8','#091C1A','#171126','#091B2B','#240F1C','#191714','#14191F']);
  for (const p of PALETTES) {
    const c = fromPalette(p.id), tokens = customizationTokens(c);
    assert.equal(c.background,p.background); assert.equal(c.accent,p.accent);
    for (const [bg,fg] of [['--store-background','--store-page-text'],['--store-surface','--store-text'],['--store-accent','--store-on-accent']]) assert(contrast(tokens[bg], tokens[fg]) >= 4.5, `${p.id}/${bg}`);
    for (const intensity of [0,35,100]) assert.equal(customizationTokens({...c,glowEnabled:true,glowIntensity:intensity})['--store-glow-intensity'], String(intensity / 100));
    assert.equal(customizationTokens({...c,glowEnabled:false})['--store-glow-intensity'], '0');
  }
  const c = fromPalette('champagne');
  for (const bad of ['red','#fff','#12345G','url(x)','</style>']) assert.throws(() => validateCustomization({...c,background:bad}));
  for (const bad of [-1,101,NaN,Infinity,'50',null]) assert.throws(() => validateCustomization({...c,glowIntensity:bad}));
  for (const bad of [1,'false',null]) assert.throws(() => validateCustomization({...c,glowEnabled:bad}));
  assert.throws(() => validateCustomization({})); assert.throws(() => validateCustomization(undefined));
  assert.equal(safeCustomization({background:'invalid'}),null); assert.deepEqual(customizationTokens(null),{});
  const custom = validateCustomization({...c,text:'#ffffff',surface:'#ffffff',accent:'#ffffff',extra:'untrusted'});
  assert(!Object.hasOwn(custom,'extra'));
  const t = customizationTokens(custom); assert(contrast(t['--store-surface'],t['--store-text'])>=4.5);
});

test('arquivo: rascunho/publicado independentes nos quatro temas, reinício, restauração e dados legados', async () => {
  const localDir = fixture(); const store = createThemeStore({env:{},localDir});
  try {
    await store.save('natal'); // existing file before Color Studio
    assert.deepEqual(await store.readPublished(),{themeId:'natal',customization:null});
    for (const [i,t] of themes.entries()) {
      await store.saveStudio(t.id,fromPalette(PALETTES[i].id));
      assert.equal((await store.readPublished()).themeId,'natal');
      assert.equal((await store.readPublished()).customization,null);
    }
    const originalDrafts = await store.readStudio();
    for (const [i,t] of themes.entries()) {
      const c = fromPalette(PALETTES[i+6].id);
      await store.publishStudio(t.id,c);
      const restarted = createThemeStore({env:{},localDir});
      assert.deepEqual(await restarted.readPublished(),{themeId:t.id,customization:c});
      await store.saveStudio(t.id,fromPalette('champagne'));
      assert.deepEqual((await restarted.readPublished()).customization,c);
    }
    for (const [i,t] of themes.entries()) {
      await store.save(t.id); assert.deepEqual((await store.readPublished()).customization,fromPalette(PALETTES[i+6].id));
    }
    assert.equal(Object.keys(originalDrafts.themes).length,4);
    await store.publishStudio('natal',null); assert.deepEqual(await store.readPublished(),{themeId:'natal',customization:null});
    assert.equal((await store.readStudio()).themes.pascoa.published.paletteId,'ocean-neon');
    const before = fs.readFileSync(path.join(localDir,'active-theme.json'),'utf8');
    await assert.rejects(store.publishStudio('natal',{})); await assert.rejects(store.saveStudio('invalid',null));
    assert.equal(fs.readFileSync(path.join(localDir,'active-theme.json'),'utf8'),before);
    const record=JSON.parse(before); record.colorStudio.themes.natal.published={background:'bad'};
    fs.writeFileSync(path.join(localDir,'active-theme.json'),JSON.stringify(record));
    assert.equal((await store.readPublished()).customization,null,'invalid customization falls back to original');
  } finally { fs.rmSync(localDir,{recursive:true,force:true}); }
});

test('API: permissões, validação, rascunhos privados, publicação atômica, falha e restauração', async () => {
  const localDir=fixture(),store=createThemeStore({env:{},localDir});
  const app=express(); app.use(express.json());
  const auth=(req,res,next)=>{if(!req.headers.authorization)return res.sendStatus(401);req.user={id:'admin-test'};next();};
  const adminOnly=(req,res,next)=>req.headers.authorization==='admin'?next():res.sendStatus(403);
  app.use('/api',themeRoutes({store,auth,adminOnly}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const url=`http://127.0.0.1:${server.address().port}/api`;
  const request=(route,body,authorization='admin')=>fetch(url+route,{method:body===undefined?'GET':'PUT',headers:{'Content-Type':'application/json',...(authorization?{authorization}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const publicTheme=async()=>await(await request('/theme',undefined,null)).json();
  try {
    for(const id of themes.map(t=>t.id))for(const action of ['draft','publish']) {
      const route=`/admin/themes/${id}/color-studio/${action}`;
      assert.equal((await request(route,{customization:null},null)).status,401);
      assert.equal((await request(route,{customization:null},'customer')).status,403);
    }
    const c=fromPalette('royal-purple');
    assert.equal((await request('/admin/themes/natal/color-studio/draft',{customization:c})).status,200);
    assert.equal((await publicTheme()).theme.customization,null);
    assert(!JSON.stringify(await publicTheme()).includes('royal-purple'));
    assert.equal((await request('/admin/themes/natal/color-studio/publish',{})).status,400);
    assert.equal((await request('/admin/themes/natal/color-studio/publish',{customization:{...c,glowIntensity:101}})).status,400);
    assert.equal((await request('/admin/themes/invalid/color-studio/publish',{customization:c})).status,400);
    assert.equal((await request('/admin/themes/natal/color-studio/publish',{customization:c})).status,200);
    assert.equal((await publicTheme()).theme.id,'natal'); assert.deepEqual((await publicTheme()).theme.customization,c);
    const admin=await(await request('/admin/themes')).json(); assert.equal(admin.palettes.length,12); assert.deepEqual(admin.colorStudio.themes.natal.draft,c);
    const preview=await(await request('/admin/themes/pascoa/preview')).json();assert.equal(preview.theme.id,'pascoa');assert.equal((await publicTheme()).theme.id,'natal');
    const publish=store.publishStudio;store.publishStudio=async()=>{throw Error('postgresql://secret');};
    const failure=await request('/admin/themes/pascoa/color-studio/publish',{customization:c});assert.equal(failure.status,503);assert(!(await failure.text()).includes('secret'));assert.equal((await publicTheme()).theme.id,'natal');store.publishStudio=publish;
    const read=store.readPublished;store.readPublished=async()=>{throw Error('down');};
    const stale=await publicTheme();assert(stale.stale);assert.deepEqual(stale.theme.customization,c);store.readPublished=read;
    assert.equal((await request('/admin/themes/natal/color-studio/publish',{customization:null})).status,200);assert.equal((await publicTheme()).theme.customization,null);
    store.writable=false;assert.equal((await request('/admin/themes/natal/color-studio/draft',{customization:c})).status,503);
  } finally {await new Promise(r=>server.close(r));fs.rmSync(localDir,{recursive:true,force:true});}
});
