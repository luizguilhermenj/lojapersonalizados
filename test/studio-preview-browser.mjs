import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {PALETTES} from '../public/js/color-studio.js';
import {summarize} from '../scripts/performance-stats.mjs';
const base='http://127.0.0.1:4340',headers={Authorization:'Bearer preview-admin'};
const child=spawn(process.execPath,['test/helpers/studio-preview-server.mjs'],{env:{...process.env,PORT:'4340'},stdio:['ignore','ignore','pipe']});let browser;let stderr='';child.stderr.on('data',d=>stderr+=d);
const state=async()=>await(await fetch(base+'/__test/state',{headers})).json();
try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert(ready,stderr);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],iframeThemeCalls=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());if(r.frame().parentFrame()&&/\/api\/(theme|admin\/themes)/.test(r.url()))iframeThemeCalls.push(r.url());});
  await page.addInitScript(()=>{
    if(window.parent===window){localStorage.setItem('artize_session_v1',JSON.stringify({token:'preview-admin',user:{id:'preview-user',name:'Admin Preview',role:'admin'}}));window.__previewTimings=[];document.addEventListener('click',event=>{const palette=event.target.closest('[data-palette]');if(palette)window.__pendingPaint={id:palette.dataset.palette,start:performance.now()};},true);}
    else document.addEventListener('artize:themechange',()=>{const pending=window.parent.__pendingPaint;if(!pending)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(window.parent.__pendingPaint===pending){window.parent.__previewTimings.push({palette:pending.id,width:innerWidth,durationMs:window.parent.performance.now()-pending.start});window.parent.__pendingPaint=null;}}));});
  });
  await page.goto(base+'/pages/admin.html');await page.locator('.palette-choice').last().waitFor();assert.equal(await page.locator('.palette-choice').count(),12);assert((await page.locator('#studioState').textContent()).includes('temporária'));
  await page.locator('#tab-settings').click();assert(await page.locator('#saveStudio').isHidden());assert(await page.locator('#publishStudio').isHidden());assert(await page.locator('#publishTheme').isEnabled());
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});for(const tab of ['palettes','custom','preview','settings']){await page.locator('#tab-'+tab).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${tab}`);}}
  await page.setViewportSize({width:1440,height:1000});await page.locator('#tab-preview').click();let frame=page.frameLocator('#themePreviewFrame');await frame.locator('html[data-theme="artize"]').waitFor();await frame.locator('.product-card').first().waitFor();
  const initial=await state();
  for(const theme of ['artize','natal','pascoa','dia-das-maes']){
    await page.locator(`input[name="appearanceTheme"][value="${theme}"]`).check();await frame.locator(`html[data-theme="${theme}"]`).waitFor();
    for(const palette of PALETTES){await page.evaluate(id=>document.querySelector(`[data-palette="${id}"]`).click(),palette.id);await frame.locator('html[data-color-studio]').waitFor();await frame.locator('html').evaluate((el,expected)=>new Promise(resolve=>{const check=()=>getComputedStyle(el).getPropertyValue('--store-background').trim()===expected?resolve():requestAnimationFrame(check);check();}),palette.background);}
  }
  assert.equal((await state()).themeId,'artize');assert.equal((await state()).calls.length,initial.calls.length,'preview editing must not query or write the theme database');
  assert.deepEqual(iframeThemeCalls,[]);assert.deepEqual(writes,[]);
  await page.locator('#compareOriginal').check();await frame.locator('html:not([data-color-studio])').waitFor();await page.locator('#compareOriginal').uncheck();await frame.locator('html[data-color-studio]').waitFor();
  await page.locator('#tab-custom').click();await page.locator('#hex-background').fill('#132435');await page.locator('#glowEnabled').check();await page.locator('#glowIntensity').fill('100');await page.locator('#tab-preview').click();await frame.locator('html[data-glow-buttons]').waitFor();
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--store-glow-intensity').trim()),'1');
  await page.locator('#tab-settings').click();await page.locator('#resetStudio').click();await page.locator('#tab-preview').click();await frame.locator('html:not([data-color-studio])').waitFor();
  assert.equal((await state()).themeId,'artize');
  await page.reload();await page.locator('.palette-choice').last().waitFor();await page.locator('#tab-custom').click();assert.equal(await page.locator('#hex-background').inputValue(),'#FAF7F2','reloading discards temporary edits');
  await page.locator('input[name="appearanceTheme"][value="natal"]').check();await page.locator('#publishTheme').click();await page.waitForFunction(()=>document.getElementById('themeFeedback').textContent.includes('Tema ativado com sucesso'));assert.equal((await state()).themeId,'natal','legacy theme activation still works');
  assert(!(await state()).calls.some(c=>/\bALTER\b|SET color_studio/i.test(c.query)));
  await page.goto(base+'/pages/home.html');await page.locator('html[data-theme="natal"]').waitFor();assert.equal(await page.locator('html').getAttribute('data-color-studio'),null,'temporary colors never reach the public store');
  await page.goto(base+'/pages/admin.html');await page.locator('.palette-choice').last().waitFor();await page.locator('#tab-preview').click();await frame.locator('html[data-theme="natal"]').waitFor();await frame.locator('.product-card').first().waitFor();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{window.__previewTimings=[];window.__pendingPaint=null;});
  for(const size of ['mobile','full']){await page.locator('#previewSize').selectOption(size);await frame.locator('html').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));for(let run=0;run<3;run++)for(const palette of PALETTES){const count=await page.evaluate(()=>window.__previewTimings.length);await page.evaluate(id=>document.querySelector(`[data-palette="${id}"]`).click(),palette.id);await page.waitForFunction(n=>window.__previewTimings.length>n,count);}}
  const timings=await page.evaluate(()=>window.__previewTimings);assert.equal(timings.length,72);
  const report={metric:'Elapsed parent click handler to two animation frames after iframe theme application; not LCP or field data',conditions:{cpuSlowdown:4,widths:[390,1280],palettes:12,repetitions:3},samples:timings,summary:[390,1280].map(width=>({width,...summarize(timings.filter(s=>s.width===width).map(s=>s.durationMs))}))};
  fs.mkdirSync('work/color-studio-preview',{recursive:true});fs.writeFileSync('work/color-studio-preview/rendering.json',JSON.stringify(report,null,2)+'\n');
  await page.locator('#colorStudio').screenshot({path:'work/color-studio-preview/studio-desktop.png'});
  await page.setViewportSize({width:390,height:900});await page.locator('#previewSize').selectOption('mobile');await page.locator('#colorStudio').screenshot({path:'work/color-studio-preview/studio-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS temporary Studio: 12 palettes × 4 themes; HEX/glow; compare/reset; 4 responsive widths; no DB calls during preview; no migration/writes; reload discards; legacy activation preserved');
  console.log(JSON.stringify(report.summary));
}finally{await browser?.close();child.kill('SIGTERM');await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
