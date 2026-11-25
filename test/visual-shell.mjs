import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const base='http://127.0.0.1:4320';
const child=spawn(process.execPath,['test/helpers/visual-server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:'4320'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',buffer=>stderr+=buffer);let browser;
try{
 let ready=false;for(let n=0;n<100;n++){try{ready=(await fetch(base+'/api/health')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,50));}assert(ready,stderr);
 const auth=await (await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();
 const headers={Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'};
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/img/artes/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
 await page.goto(base+'/pages/home.html');await page.evaluate(session=>localStorage.setItem('artize_session_v1',JSON.stringify(session)),auth);
 const sizes=[[320,568],[360,800],[390,844],[430,932],[768,1024],[1440,900]];
 const themes=(await(await fetch(base+'/api/admin/themes',{headers})).json()).themes;
 for(const theme of themes){
  const activated=await fetch(base+'/api/admin/themes/active',{method:'PUT',headers,body:JSON.stringify({themeId:theme.id})});assert.equal(activated.status,200);
  for(const [width,height]of sizes){await page.setViewportSize({width,height});
   for(const name of ['home','caneca-ceramica','carrinho','pedidos','admin']){
    await page.goto(`${base}/pages/${name}.html`,{waitUntil:'domcontentloaded'});await page.locator(`html[data-theme="${theme.id}"]`).waitFor();
    assert.equal(await page.locator('.site-header').count(),1);assert.equal(await page.locator('#siteFooter').count(),1);
    assert.equal(await page.locator('#seasonalFooter').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme.id}/${name}/${width} overflow`);
   }
  }
  console.log(`PASS shell ${theme.id}: 6 viewports / 5 pages / footer unique / no overflow`);
 }
 await fetch(base+'/api/admin/themes/active',{method:'PUT',headers,body:JSON.stringify({themeId:'artize'})});
 await page.setViewportSize({width:320,height:568});
 let release;const gate=new Promise(r=>release=r);await page.route('**/api/products',async route=>{await gate;await route.continue();});
 await page.goto(base+'/pages/home.html',{waitUntil:'domcontentloaded'});
 await page.locator('#menuToggle').click();assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'true');
 assert.equal(await page.locator('#sideMenu').evaluate(el=>el.inert),false);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'sideClose');
 await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>document.activeElement.closest('#sideMenu')!==null));
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'menuToggle');
 assert.equal(await page.locator('#sideMenu').evaluate(el=>el.inert&&el.hidden),true);
 await page.locator('#sideMenu a').first().evaluate(el=>el.focus());assert.notEqual(await page.evaluate(()=>document.activeElement.closest('#sideMenu')?.id),'sideMenu');
 const response=page.waitForResponse(r=>r.url()===base+'/api/products');release();await response;await page.unroute('**/api/products');
 console.log('PASS navigation independent from catalog / focus trap / Escape / inert closed');
 await page.evaluate(()=>localStorage.removeItem('artize_session_v1'));await page.goto(base+'/pages/login.html');
 assert.equal(await page.locator('#login-email').getAttribute('autocomplete'),'email');
 assert.equal(await page.locator('#login-password').getAttribute('autocomplete'),'current-password');
 assert.equal(await page.locator('#register-password').getAttribute('autocomplete'),'new-password');
 assert.equal(await page.locator('input').evaluateAll(elements=>elements.filter(el=>!el.labels.length).length),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#globalSearch').fill('cerâmica');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.locator('.product-card').first().waitFor();assert.equal(await page.locator('.product-card').count(),1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#menuToggle').click();await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS labels / autofill / cross-page search / reduced motion / no JS errors');
}finally{await browser?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}}
