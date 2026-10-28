// Local laboratory comparison. Never uses Render/Neon or production credentials.
import fs from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fromPalette } from '../public/js/color-studio.js';
const base='http://127.0.0.1:4333';
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11)||'92db5fa43f5b5493410527682d06721b4ac76fb1';
if(!/^[a-f0-9]{40}$/.test(baseline))throw Error('Supply the full baseline commit SHA.');
const originals=Object.fromEntries(['public/css/themes.css','public/js/themes.js'].map(path=>[path.replace('public',''),execFileSync('git',['show',`${baseline}:${path}`],{encoding:'utf8'})]));
const child=spawn(process.execPath,['test/helpers/visual-server.mjs'],{env:{...process.env,PORT:'4333'},stdio:'ignore'});
let browser;
try {
  for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
  const auth=await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const samples=[];
  for(const themeId of ['artize','natal','pascoa','dia-das-maes'])for(const mode of ['baseline','original','premium']) {
    const result=await fetch(`${base}/api/admin/themes/${themeId}/color-studio/publish`,{method:'PUT',headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:JSON.stringify({customization:mode==='premium'?fromPalette('midnight-emerald'):null})});
    if(!result.ok)throw Error('Fixture publication failed');
    for(const width of [390,1440])for(let run=1;run<=2;run++) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      if(mode==='baseline')await context.route('**/*',route=>{
        const source=originals[new URL(route.request().url()).pathname];
        return source?route.fulfill({contentType:route.request().url().endsWith('.css')?'text/css':'text/javascript',body:source}):route.continue();
      });
      const page=await context.newPage(),cdp=await context.newCDPSession(page);
      await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      // All modes use identical local transport. External network effects are excluded.
      await cdp.send('Performance.enable');
      await page.addInitScript(()=>{
        window.studioMetrics={lcp:0,cls:0,longTasks:0};
        new PerformanceObserver(list=>{for(const e of list.getEntries())window.studioMetrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.studioMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list=>window.studioMetrics.longTasks+=list.getEntries().length).observe({type:'longtask',buffered:true});
      });
      await page.goto(base+'/pages/home.html');await page.locator(`html[data-theme="${themeId}"]`).waitFor();await page.locator('.product-card').first().waitFor();
      if(mode==='premium')await page.locator('html[data-color-studio]').waitFor();
      await page.waitForTimeout(1200);
      const metrics=await page.evaluate(()=>({...window.studioMetrics,resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,bytes:e.decodedBodySize})),heroHeight:document.querySelector('[data-hero-carousel]').getBoundingClientRect().height,productTop:document.querySelector('.product-card').getBoundingClientRect().top+scrollY}));
      const perf=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].includes(m.name)).map(m=>[m.name,m.value*1000]));
      samples.push({themeId,mode,width,run,...metrics,...perf});await context.close();
    }
    console.log(`MEASURED ${themeId}/${mode}: desktop + mobile, 2 runs each`);
  }
  fs.mkdirSync('work/color-studio',{recursive:true});
  const report={baseline,conditions:{cpuSlowdown:4,transport:'localhost, cache disabled, no network throttling',reducedMotion:true,runs:2,observationAfterReadyMs:1200,note:'Lab only. CLS is the sum of non-input shifts in this short window; neither field CWV nor INP p75.'},samples};
  fs.writeFileSync('work/color-studio/performance.json',JSON.stringify(report,null,2));
  for(const mode of ['baseline','original','premium']) {
    const list=samples.filter(s=>s.mode===mode);const avg=key=>Math.round(list.reduce((a,s)=>a+s[key],0)/list.length*100)/100;
    console.log(JSON.stringify({mode,meanLcpMs:avg('lcp'),maxCls:Math.max(...list.map(s=>s.cls)),meanTaskMs:avg('TaskDuration'),meanLayoutMs:avg('LayoutDuration')}));
  }
}finally{await browser?.close();child.kill('SIGTERM');await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
