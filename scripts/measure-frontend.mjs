// Medição de laboratório local, não representa percentil 75 de usuários reais.
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const baseline=process.argv.includes('--baseline');
const output=process.argv.find(arg=>arg.endsWith('.json'))||`work/performance-${baseline?'before':'after'}.json`;
const snapshot='work/perf-baseline';fs.mkdirSync(snapshot,{recursive:true});
if(baseline){const archive=execFileSync('git',['archive','bb57b50','public/pages','public/css','public/js']);execFileSync('tar',['-x','-C',snapshot],{input:archive});}
const base='http://127.0.0.1:4323';const child=spawn(process.execPath,['test/helpers/visual-perf-server.mjs'],{env:{...process.env,PORT:'4323',VISUAL_PERF_BASELINE:baseline?'1':'0'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const auth=await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@visual.invalid',password:'VisualOnly!234'})})).json();
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const samples=[];
 for(const theme of ['artize','natal','pascoa']){
  await fetch(base+'/api/admin/themes/active',{method:'PUT',headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:JSON.stringify({themeId:theme})});
  for(const name of ['home','caneca-ceramica'])for(let run=1;run<=3;run++){
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:75000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.addInitScript(()=>{window.metrics={lcp:0,cls:0,longTasks:0,maxLongTask:0,eventDuration:0};new PerformanceObserver(list=>{for(const e of list.getEntries())window.metrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.metrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries()){window.metrics.longTasks++;window.metrics.maxLongTask=Math.max(window.metrics.maxLongTask,e.duration);}}).observe({type:'longtask',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.metrics.eventDuration=Math.max(window.metrics.eventDuration,e.duration);}).observe({type:'event',durationThreshold:16,buffered:true});});
   let requests=0,completed=0,bytes=0;cdp.on('Network.requestWillBeSent',()=>requests++);cdp.on('Network.loadingFinished',e=>{completed++;bytes+=e.encodedDataLength;});
   await page.goto(`${base}/pages/${name}.html`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(6500);
   if(name==='caneca-ceramica'){const second=page.locator('.art-card').nth(1);if(await second.count())await second.click({timeout:30000});await page.waitForTimeout(500);}
   const values=await page.evaluate(()=>({...window.metrics,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime||null,domNodes:document.querySelectorAll('*').length,images:document.images.length,artCards:document.querySelectorAll('.art-card').length}));samples.push({theme,page:name,run,requests,completed,completedBytes:bytes,...values});console.log(JSON.stringify(samples.at(-1)));await context.close();
  }
 }
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({baseline,workingTree:!baseline&&Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),revision:baseline?'bb57b50':execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),conditions:{viewport:'390x844',cpuSlowdown:4,latencyMs:150,downloadBytesPerSecond:200000,windowAfterDOMContentLoadedMs:6500,runs:3,note:'Laboratório local; bytes apenas de transferências concluídas; evento amostrado não é INP p75; sem pagamentos.'},samples},null,2));
}finally{await browser?.close();child.kill('SIGTERM');}
