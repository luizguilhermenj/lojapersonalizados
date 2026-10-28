import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
const base='http://127.0.0.1:4325';const child=spawn(process.execPath,['test/helpers/visual-server.mjs'],{env:{...process.env,PORT:'4325'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const auth=await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();const headers={Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'};
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:390,height:844}});
 const themes=(await(await fetch(base+'/api/admin/themes',{headers})).json()).themes;
 for(const theme of themes){await fetch(base+'/api/admin/themes/active',{method:'PUT',headers,body:JSON.stringify({themeId:theme.id})});
  for(const name of ['home','caneca-ceramica','carrinho']){await page.goto(`${base}/pages/${name}.html`);await page.locator(`html[data-theme="${theme.id}"]`).waitFor();const expected=name!=='carrinho'&&theme.effect?theme.effect.mobileCount:0;assert.equal(await page.locator('.seasonal-particle').count(),expected);if(!expected)continue;assert.equal(await page.locator('.seasonal-effects').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   if(name==='caneca-ceramica'){const top=await page.locator('.mobile-purchase').evaluate(el=>el.getBoundingClientRect().top);assert(await page.locator('.seasonal-effects-toggle').evaluate((el,top)=>el.getBoundingClientRect().bottom<=top,top));}
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('.seasonal-effects,.seasonal-effects-toggle').count(),0);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('.seasonal-particle').count(),expected);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.seasonal-particle'));assert.equal(await page.locator('.seasonal-particle').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(count=>document.querySelectorAll('.seasonal-particle').length===count,expected);
   await page.evaluate(async()=>{const {applyTheme}=await import('/js/themes.js');applyTheme({id:'artize'});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('.seasonal-effects,.seasonal-effects-toggle').count(),0);
  }
 }
 console.log('PASS motion: neve/pétalas mobile, nenhum efeito em padrão/mães/carrinho, visibilitychange remove/recria, reduced motion, troca limpa listeners e controle não sobrepõe compra');
}finally{await browser?.close();child.kill('SIGTERM');}
