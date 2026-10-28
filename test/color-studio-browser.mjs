import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { PALETTES, fromPalette } from '../public/js/color-studio.js';
const base='http://127.0.0.1:4332';
const child=spawn(process.execPath,['test/helpers/visual-server.mjs'],{env:{...process.env,PORT:'4332'},stdio:['ignore','pipe','pipe']});
let browser;let stderr='';child.stderr.on('data',d=>stderr+=d);
const artifacts='work/color-studio';fs.mkdirSync(artifacts,{recursive:true});
try {
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
  const auth=await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();assert(auth.token,stderr);
  const headers={Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'};
  const pub=async(id,c)=>{const response=await fetch(`${base}/api/admin/themes/${id}/color-studio/publish`,{method:'PUT',headers,body:JSON.stringify({customization:c})});assert.equal(response.status,200);};
  const published=async()=>await(await fetch(base+'/api/theme')).json();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(auth=>localStorage.setItem('artize_session_v1',JSON.stringify(auth)),auth);
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'/pages/admin.html');await page.locator('.palette-choice').last().waitFor();assert.equal(await page.locator('.palette-choice').count(),12);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    for(const tab of ['palettes','custom','preview','settings']) {
      await page.locator(`#tab-${tab}`).click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`admin ${width}/${tab}`);
    }
  }
  console.log('PASS Studio 4 tabs × 4 widths, no page overflow');
  await page.setViewportSize({width:1440,height:1000});await page.locator('#tab-preview').click();
  let frame=page.frameLocator('#themePreviewFrame');await frame.locator('html[data-theme="artize"]').waitFor();
  for(const palette of PALETTES) {
    await page.locator('#tab-palettes').click();await page.locator(`[data-palette="${palette.id}"]`).click();
    await page.locator('#tab-preview').click();
    await frame.locator('html[data-color-studio]').waitFor();
    await frame.locator('html').evaluate((el,expected)=>new Promise(resolve=>{const check=()=>getComputedStyle(el).getPropertyValue('--store-background').trim()===expected?resolve():requestAnimationFrame(check);check();}),palette.background);
    assert.equal((await published()).theme.customization,null,`${palette.id}: public isolated`);
    assert.equal(await page.locator('html').getAttribute('data-color-studio'),null,'dashboard not changed by draft');
    assert.equal(await frame.locator('[data-hero-carousel]').getAttribute('data-hero-theme'),'artize');
    await frame.locator('.product-card').first().waitFor();
    assert(await frame.locator('#siteFooter').count());assert(await frame.locator('#categoryChips .chip').count());
  }
  console.log('PASS all 12 palettes in isolated real-store preview');
  await page.locator('#compareOriginal').check();await frame.locator('html:not([data-color-studio])').waitFor();
  await page.locator('#compareOriginal').uncheck();await frame.locator('html[data-color-studio]').waitFor();
  await page.locator('#previewSize').selectOption('full');assert.equal(await page.locator('#themePreviewFrame').evaluate(el=>el.contentWindow.innerWidth),1280);
  await page.locator('#previewSize').selectOption('mobile');assert.equal(await page.locator('#themePreviewFrame').evaluate(el=>el.contentWindow.innerWidth),390);
  await frame.locator('.choose-btn').click();assert(page.frames().some(f=>f.url().includes('themePreview=artize')),'preview navigation blocked');
  await frame.locator('html').evaluate(async()=>{const app=await import('/js/app.js');app.addToCart({productId:'preview-test',quantity:1});});
  assert.equal(await page.evaluate(()=>localStorage.getItem('artize_cart_v1')),null,'preview cannot write cart');
  await page.locator('#tab-custom').click();
  await page.locator('#hex-background').fill('#123456');await page.locator('#hex-accent').fill('#FEDCBA');
  await page.locator('#hex-text').fill('#FFFFFF');
  await page.locator('#glowEnabled').check();await page.locator('#glowIntensity').fill('100');
  await page.locator('#glowButtons').uncheck();await page.locator('#glowCards').uncheck();await page.locator('#glowBorders').uncheck();
  await page.locator('#tab-preview').click();
  await frame.locator('html:not([data-glow-buttons]):not([data-glow-cards]):not([data-glow-borders])').waitFor();
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--store-glow-intensity').trim()),'1');
  await page.locator('#tab-custom').click();await page.locator('#glowIntensity').fill('0');await page.locator('#glowEnabled').uncheck();
  await page.locator('#hex-background').fill('#oops');assert.equal(await page.locator('#hex-background').getAttribute('aria-invalid'),'true');
  await page.locator('#tab-settings').click();assert(await page.locator('#saveStudio').isDisabled());assert(await page.locator('#publishStudio').isDisabled());
  await page.locator('#tab-custom').click();await page.locator('#hex-background').fill('#123456');
  await page.locator('#tab-settings').click();await page.locator('#saveStudio').click();await page.getByText('Rascunho salvo. A loja pública permanece igual.',{exact:true}).waitFor();
  assert.equal((await published()).theme.customization,null);
  await page.reload();await page.locator('.palette-choice').last().waitFor();await page.locator('#tab-custom').click();assert.equal(await page.locator('#hex-background').inputValue(),'#123456');
  await page.locator('#hex-background').fill('#654321');await page.locator('#tab-settings').click();await page.locator('#discardStudio').click();await page.locator('#tab-custom').click();assert.equal(await page.locator('#hex-background').inputValue(),'#123456');
  await page.locator('#tab-settings').click();await page.locator('#publishStudio').click();await page.getByText('Visual publicado com sucesso. Atualize a loja para conferir.').waitFor();assert.equal((await published()).theme.customization.background,'#123456');
  console.log('PASS HEX validation, glow toggles/0–100, compare, viewport, draft save/reload/discard/publish, cart isolation');
  // Unsaved changes survive theme switching and independent saves.
  for(const [index,id] of ['artize','natal','pascoa','dia-das-maes'].entries()) {
    await page.locator(`input[name="appearanceTheme"][value="${id}"]`).check();await page.locator('#tab-palettes').click();await page.locator(`[data-palette="${PALETTES[index].id}"]`).click();
  }
  for(const [index,id] of ['artize','natal','pascoa','dia-das-maes'].entries()) {
    await page.locator(`input[name="appearanceTheme"][value="${id}"]`).check();assert.equal(await page.locator(`[data-palette="${PALETTES[index].id}"]`).getAttribute('aria-pressed'),'true');
  }
  await page.locator('#tab-settings').click();await page.locator('#resetStudio').click();await page.locator('#tab-preview').click();await frame.locator('html:not([data-color-studio])').waitFor();assert.equal((await published()).theme.customization.background,'#123456');
  await page.locator('#tab-settings').click();await page.locator('#publishStudio').click();await page.getByText('Visual publicado com sucesso. Atualize a loja para conferir.').waitFor();assert.equal((await published()).theme.id,'dia-das-maes');assert.equal((await published()).theme.customization,null);
  console.log('PASS independent drafts for 4 themes; reset original requires publication');
  // Inspect actual computed contrast on public pages, not just color formulas.
  const contrastResults=[];
  for(const [index,id] of ['artize','natal','pascoa','dia-das-maes'].entries()) {
    for(const paletteId of ['champagne','midnight-emerald']) {
      await pub(id,fromPalette(paletteId));
      for(const width of [390,1440]) {
        await page.setViewportSize({width,height:1000});await page.goto(base+'/pages/home.html');await page.locator(`html[data-theme="${id}"][data-color-studio]`).waitFor();await page.locator('.product-card').first().waitFor();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${id}/${paletteId}/${width}`);
        const ratios=await page.evaluate(()=>{
          const lum=rgb=>{const a=(rgb.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
          return [...document.querySelectorAll('.primary-btn,.chip,.product-body h3,.product-body p,.price,.meta,.footer-intro p,.footer-links a,.header-search,.desktop-navigation a')].filter(el=>el.getClientRects().length).map(el=>{
            const style=getComputedStyle(el);let parent=el;while(parent&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;
            const a=lum(style.color),b=lum(getComputedStyle(parent).backgroundColor);return {name:el.className||el.tagName,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
          });
        });
        for(const entry of ratios)assert(entry.ratio>=4.49,`${id}/${paletteId}/${entry.name} contrast ${entry.ratio}`);
        contrastResults.push({id,paletteId,width,minimum:Math.min(...ratios.map(r=>r.ratio))});
        if(id==='natal')await page.screenshot({path:`${artifacts}/${id}-${paletteId}-${width}.png`,fullPage:true});
      }
    }
  }
  fs.writeFileSync(`${artifacts}/contrast.json`,JSON.stringify(contrastResults,null,2));
  console.log('PASS public home: 4 themes × light/dark × desktop/mobile, computed text/CTA contrast AA');
  // Check glow rendering and reduced motion from actual CSS.
  await page.emulateMedia({reducedMotion:'no-preference'});await pub('artize',fromPalette('midnight-emerald'));
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/pages/home.html');await page.locator('html[data-color-studio]').waitFor();
  assert.notEqual(await page.locator('.primary-btn').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.primary-btn').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:1000});assert.equal(await page.locator('.primary-btn').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
  // A color edit is a single root style write and preserves the active carousel.
  const update=await page.evaluate(async()=>{
    const {applyTheme}=await import('/js/themes.js');
    const {theme}=await(await fetch('/api/theme')).json();applyTheme(theme);
    document.querySelector('[data-hero-index="1"]').click();
    const styles=new MutationObserver(()=>{});styles.observe(document.documentElement,{attributes:true,attributeFilter:['style']});
    const hero=new MutationObserver(()=>{});hero.observe(document.querySelector('[data-hero-carousel]'),{childList:true,subtree:true,characterData:true});
    applyTheme({...theme,customization:{...theme.customization,glowIntensity:57}});
    const result={styleWrites:styles.takeRecords().length,heroChanges:hero.takeRecords().length,slide:document.querySelector('[data-hero-carousel]').dataset.slide};
    styles.disconnect();hero.disconnect();return result;
  });
  assert.deepEqual(update,{styleWrites:1,heroChanges:0,slide:'1'});
  console.log('PASS color edit writes styles atomically and preserves carousel content/slide');
  // Purchase modules stay functional with a dark published palette.
  const products=await(await fetch(base+'/api/products')).json();
  await page.evaluate(async p=>{const app=await import('/js/app.js');app.addToCart({productId:p.id,name:p.name,price:p.price,image:p.image,quantity:1});},products[0]);
  await page.goto(base+'/pages/carrinho.html');await page.locator('.cart-item').waitFor();await page.locator('.increase').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('artize_cart_v1'))[0].quantity),2);
  await page.locator('#cepInput').fill('86010000');await page.locator('#quoteShippingBtn').click();await page.locator('.shipping-option').nth(2).waitFor();
  let checkout=false;await page.route('**/api/checkout/create-preference',route=>{checkout=true;return route.fulfill({status:503,json:{error:'Pagamento simulado indisponível.'}});});await page.locator('#checkoutBtn').click();await page.locator('#cartFeedback.error').waitFor();assert(checkout);
  for(const name of ['login','caneca-ceramica','pedidos','resultado']) {
    await page.goto(`${base}/pages/${name}.html`);await page.locator('html[data-color-studio]').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name);
    assert.equal(await page.locator('main').count(),1);
  }
  assert.deepEqual((await(await fetch(base+'/api/admin/orders',{headers})).json()).orders,[]);
  console.log('PASS glow CSS desktop/mobile/reduced-motion, dark cart/shipping/mocked checkout, forms and other store pages');
  await page.route('**/api/admin/themes',route=>route.fulfill({status:503,json:{error:'Armazenamento indisponível no teste.'}}));
  await page.goto(base+'/pages/admin.html');await page.locator('#themeFeedback.error').waitFor();
  assert(await page.locator('#colorStudio').isHidden(),'Studio remains unavailable until authenticated settings load succeeds');
  assert.deepEqual(errors,[]);console.log('PASS storage error disables Studio; zero browser JavaScript errors');
} finally {await browser?.close();child.kill('SIGTERM');await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
