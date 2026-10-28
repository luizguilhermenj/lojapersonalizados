import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base='http://127.0.0.1:4321';let browser;
const server=spawn(process.execPath,['test/helpers/visual-server.mjs'],{env:{...process.env,PORT:'4321'},stdio:'ignore'});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const auth=await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();const headers={Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'};
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({reducedMotion:'reduce'});
 for(const theme of ['artize','natal','pascoa','dia-das-maes']){
  await fetch(base+'/api/admin/themes/active',{method:'PUT',headers,body:JSON.stringify({themeId:theme})});
  for(const width of [320,360,390,430,768,1440]){
   await page.setViewportSize({width,height:844});await page.goto(base+'/pages/home.html');await page.locator(`html[data-theme="${theme}"]`).waitFor();await page.locator('.product-card').first().waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const bounds=await page.evaluate(()=>{const hero=document.querySelector('#seasonalCampaign:not([hidden]),.promo-carousel:not([hidden])');const link=hero.querySelector('.primary-btn');return {height:hero.getBoundingClientRect().height,contained:link.getBoundingClientRect().bottom<=hero.getBoundingClientRect().bottom-8};});assert.equal(bounds.height,440);assert(bounds.contained,`${theme}/${width}: CTA clipped`);
   if(width<500)assert.equal(await page.locator('#productsGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
  }
 }
 await page.locator('#globalSearch').fill('ceramica');await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1);
 await page.locator('#globalSearch').fill('zzzz');await page.locator('#clearProductFilters').click();await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===10);
 assert.equal(await page.locator('.choose-btn').count(),1);assert.equal(await page.locator('.soon-btn').count(),9);
 await fetch(base+'/api/admin/themes/active',{method:'PUT',headers,body:JSON.stringify({themeId:'pascoa'})});
 let release;const gate=new Promise(resolve=>release=resolve);await page.route('**/api/theme',async route=>{await gate;await route.continue();});
 await page.goto(base+'/pages/home.html',{waitUntil:'domcontentloaded'});const categoryBefore=await page.locator('#categorias').evaluate(el=>el.getBoundingClientRect().top+scrollY);release();await page.locator('html[data-theme="pascoa"]').waitFor();const categoryAfter=await page.locator('#categorias').evaluate(el=>el.getBoundingClientRect().top+scrollY);assert.equal(categoryAfter,categoryBefore,'tema tardio não desloca categorias');
 console.log('PASS home: 4 temas × 6 larguras; hero 440px e CTA visível; 2 colunas mobile; busca sem acento; estado vazio; disponibilidade preservada');
}finally{await browser?.close();server.kill('SIGTERM');}
