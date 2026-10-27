import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('../work/node_modules/playwright'); }
const { chromium } = playwright;
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const root = process.cwd();
const runtime = path.join(root, 'work/runtime');
fs.mkdirSync(runtime + '/data', { recursive: true });
for (const file of ['server.js', 'package.json']) fs.copyFileSync(file, path.join(runtime, file));
for (const dir of ['public','node_modules','themes','routes']) { const target = path.join(runtime, dir); if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, dir), target); }
fs.copyFileSync('data/products.json', runtime + '/data/products.json');
const password = 'ThemeTestOnly!234';
const salt = 'local-test-fixture';
const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password,salt,64).toString('base64')}`;
fs.writeFileSync(runtime+'/data/users.json', JSON.stringify([{ id:'test-admin',name:'Admin Test',email:'admin@test.invalid',role:'admin',passwordHash,lastAdminSeenAt:null },{ id:'test-customer',name:'Customer Test',email:'customer@test.invalid',role:'customer',passwordHash }]));
for (const file of ['orders','sessions']) fs.writeFileSync(`${runtime}/data/${file}.json`,'[]');
fs.rmSync(runtime+'/data/appearance', {recursive:true,force:true});
const base = 'http://127.0.0.1:3198';
let server;
async function start() {
 server = spawn(process.execPath,['server.js'], {cwd:runtime,env:{...process.env,PORT:'3198',BASE_URL:base,MP_ACCESS_TOKEN:'',NODE_ENV:'test',RENDER:'',THEME_STORAGE_DIR:'',THEME_STORAGE_DURABLE:''},stdio:['ignore','pipe','pipe']});
 let failure = ''; server.stderr.on('data', d=>failure+=d);
 for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok)return;}catch{} await new Promise(r=>setTimeout(r,100));}
 throw Error('Startup failed: '+failure);
}
async function stop(){if(server?.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}}
const json = async (url,options={}) => {const res=await fetch(base+url,options);return {status:res.status,data:await res.json()};};
const login = async email => (await json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})).data;
let browser;
try {
 await start(); console.log('PASS server startup');
 const admin = await login('admin@test.invalid'); const customer = await login('customer@test.invalid');
 assert.equal(admin.user.role,'admin');
 for(const [route,method] of [['/api/admin/themes','GET'],['/api/admin/themes/dia-das-maes/preview','GET'],['/api/admin/themes/active','PUT']]){
  assert.equal((await json(route,{method})).status,401);
  assert.equal((await json(route,{method,headers:{Authorization:`Bearer ${customer.token}`}})).status,403);
 }
 console.log('PASS real admin login / visitor 401 / customer 403');
 const catalogBefore = (await json('/api/products')).data;
 browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/pages/admin.html');
 await page.evaluate(session=>localStorage.setItem('artize_session_v1',JSON.stringify(session)),admin);
 await page.reload();
 await page.locator('.theme-option').first().waitFor();
 for (const width of [360,390,768,1280]) {
  await page.setViewportSize({width,height:900});
  assert(await page.evaluate(()=>document.getElementById('appearancePanel').getBoundingClientRect().right <= innerWidth), `Theme panel overflow at ${width}`);
 }
 console.log('PASS theme panel responsive 360 / 390 / 768 / 1280 px');
 await page.getByLabel('Dia das Mães', {exact:false}).check();
 await page.getByRole('button',{name:'Pré-visualizar',exact:true}).click();
 await page.frameLocator('#themePreviewFrame').locator('html[data-theme="dia-das-maes"]').waitFor();
 assert.equal((await json('/api/theme')).data.theme.id,'artize');
 console.log('PASS admin UI preview without publication');
 await page.getByRole('button',{name:'Ativar tema selecionado'}).click();
 await page.waitForFunction(()=>document.getElementById('themeFeedback').textContent.includes('Tema ativado com sucesso'));
 assert.equal((await json('/api/theme')).data.theme.id,'dia-das-maes');
 await stop();await start();assert.equal((await json('/api/theme')).data.theme.id,'dia-das-maes');
 console.log('PASS activation and persistence across server process restart');
 for(const width of [360,390,768,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/pages/home.html');
  await page.locator('html[data-theme="dia-das-maes"]').waitFor();await page.locator('.product-card').first().waitFor();
  assert(await page.locator('.mothers-gifts').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
 }
 console.log('PASS responsive home 360 / 390 / 768 / 1280 px');
 await page.goto(base+'/pages/caneca-ceramica.html'); await page.locator('html[data-theme="dia-das-maes"]').waitFor();
 // O carrinho usa os módulos reais; o fixture contém somente um produto real do catálogo.
 const product = catalogBefore[0];
 await page.evaluate(async p=>{const app=await import('/js/app.js');app.addToCart({productId:p.id,name:p.name,price:p.price,image:p.image,quantity:1});},product);
 await page.goto(base+'/pages/carrinho.html');
 await page.locator('.cart-item').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('artize_cart_v1'))[0].quantity),1);
 await page.locator('.increase').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('artize_cart_v1'))[0].quantity),2);
 await page.locator('#cepInput').fill('86010000');await page.locator('#quoteShippingBtn').click();
 await page.locator('.shipping-option').first().waitFor();
 assert.equal(await page.locator('.shipping-option').count(),3);
 const quote=await json('/api/shipping/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cep:'86010000',items:[{productId:product.id,quantity:1}]})});
 assert.equal(quote.status,200);assert.equal(quote.data.options.length,3);
 assert.equal((await json('/api/checkout/create-preference',{method:'POST'})).status,401);
 assert.equal((await json('/api/checkout/create-preference',{method:'POST',headers:{Authorization:`Bearer ${customer.token}`,'Content-Type':'application/json'},body:JSON.stringify({items:[]})})).status,400);
 assert.deepEqual((await json('/api/products')).data,catalogBefore);
 console.log('PASS catalog unchanged / cart storage / shipping / checkout auth and empty-cart guard (no payment)');
 await page.goto(base+'/pages/admin.html');
 await page.getByRole('button',{name:'Restaurar tema padrão'}).click();
 await page.waitForFunction(()=>document.getElementById('themeFeedback').textContent.includes('Tema ativado com sucesso'));
 await stop();await start();assert.equal((await json('/api/theme')).data.theme.id,'artize');
 await page.goto(base+'/pages/home.html');await page.locator('html[data-theme="artize"]').waitFor();assert.equal(await page.locator('.mothers-gifts').isVisible(),false);
 console.log('PASS restore standard and persistence');assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
} finally {await browser?.close();await stop();}
