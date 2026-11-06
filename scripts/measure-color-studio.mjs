// Local, interleaved HTTP comparison; never reads Neon/application credentials.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { summarize } from './performance-stats.mjs';
const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length+3) ?? fallback;
const baseline = option('baseline','92db5fa43f5b5493410527682d06721b4ac76fb1');
const before = option('before','5975a5395414a3dc05981791225f0c3d57616001');
const runs = Number(option('runs','3')), motion = option('motion','reduce');
const widths = option('widths','390,1440').split(',').map(Number);
const themes = option('themes','artize,natal,pascoa,dia-das-maes').split(',');
if (![baseline,before].every(v=>/^[a-f0-9]{40}$/.test(v)) || !Number.isInteger(runs) || runs<1 || !widths.every(w=>w>=320&&w<=1920) || !themes.every(t=>['artize','natal','pascoa','dia-das-maes'].includes(t)) || !['reduce','no-preference'].includes(motion)) throw Error('Invalid benchmark options');
const output = option('output','work/color-studio-v2/performance.json');
const sourceFiles = ['public/css/themes.css','public/css/admin.css','public/js/themes.js','public/js/home.js','public/pages/home.html'];
const sourceManifest = Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const artifactDir = path.dirname(output);fs.mkdirSync(artifactDir,{recursive:true});
const traceEnabled = process.argv.includes('--trace');
const root = 'work/color-studio-v2/snapshots';
for (const [build,ref] of [['baseline',baseline],['before',before]]) {
  for (const file of ['public/css/themes.css','public/css/admin.css','public/js/themes.js','public/js/home.js','public/pages/home.html']) {
    const destination=path.join(root,build,file);fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,execFileSync('git',['show',`${ref}:${file}`]));
  }
}
function cpuStats() {
  try {return Object.fromEntries(fs.readFileSync('/sys/fs/cgroup/cpu.stat','utf8').trim().split('\n').map(line=>{const [key,value]=line.split(' ');return [key,Number(value)];}));}catch{return null;}
}
const port=Number(option('port','4333')),base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['test/helpers/studio-perf-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
let browser;
try {
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
  if(!ready)throw Error('Local fixture failed to start: '+stderr);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const cases=[['baseline','original'],['before','original'],['before','premium'],['after','original'],['after','premium']];
  const samples=[];let block=0;
  // Rotate the starting case for every block; no case always receives the coldest run.
  for(let run=1;run<=runs;run++)for(const themeId of themes)for(const width of widths){
    for(let i=0;i<cases.length;i++){
      const [build,look]=cases[(i+block)%cases.length];
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion,extraHTTPHeaders:{'x-artize-perf-build':build,'x-artize-perf-look':look,'x-artize-perf-theme':themeId}});
      const page=await context.newPage(),cdp=await context.newCDPSession(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
      await page.addInitScript(()=>{
        window.studioMetrics={lcp:0,lcpEntries:[],cls:0,themeAt:0,productsAt:0,longTasks:[]};
        new PerformanceObserver(list=>{for(const e of list.getEntries()){studioMetrics.lcp=e.startTime;studioMetrics.lcpEntries.push({time:e.startTime,loadTime:e.loadTime,renderTime:e.renderTime,url:e.url?new URL(e.url).pathname:'',tag:e.element?.tagName,className:e.element?.className,size:e.size});}}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)studioMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries())studioMetrics.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
        document.addEventListener('artize:themechange',()=>studioMetrics.themeAt=performance.now(),{once:true});
        const observer=new MutationObserver(()=>{if(document.querySelector('.product-card')){studioMetrics.productsAt=performance.now();observer.disconnect();}});observer.observe(document,{subtree:true,childList:true});
      });
      if(traceEnabled)await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.stack',transferMode:'ReturnAsStream'});
      const cpuBefore=cpuStats();
      await page.goto(base+'/pages/home.html');await page.locator(`html[data-theme="${themeId}"]`).waitFor();await page.locator('.product-card').first().waitFor();
      if(look==='premium')await page.locator('html[data-color-studio]').waitFor();
      await page.waitForTimeout(1000);
      const values=await page.evaluate(()=>({...window.studioMetrics,resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,bytes:e.decodedBodySize,start:e.startTime,duration:e.duration,end:e.responseEnd})),webFonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),heroHeight:document.querySelector('[data-hero-carousel]').getBoundingClientRect().height,heroGlow:getComputedStyle(document.querySelector('.hero-copy .primary-btn')).boxShadow}));
      const perf=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount'].includes(m.name)).map(m=>[m.name,m.name.endsWith('Duration')?m.value*1000:m.value]));
      const cpuAfter=cpuStats();
      const sample={build,look,themeId,width,run,order:i,...values,...perf,cpuThrottledMs:cpuBefore&&cpuAfter?(cpuAfter.throttled_usec-cpuBefore.throttled_usec)/1000:null,errors};
      if(traceEnabled){
        const complete=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const {stream}=await complete;let trace='';
        for(;;){const chunk=await cdp.send('IO.read',{handle:stream});trace+=chunk.data;if(chunk.eof)break;}await cdp.send('IO.close',{handle:stream});
        const name=`trace-${samples.length}-${build}-${look}-${themeId}-${width}.json.gz`;
        fs.writeFileSync(path.join(artifactDir,name),gzipSync(trace));sample.trace=name;
        const events=JSON.parse(trace).traceEvents;
        sample.traceLayouts=events.filter(e=>e.name==='Layout'&&e.ph==='X').sort((a,b)=>b.dur-a.dur).slice(0,3).map(e=>({durationMs:e.dur/1000,frame:e.args?.beginData?.frame,dirtyObjects:e.args?.beginData?.dirtyObjects,roots:e.args?.endData?.layoutRoots}));
      }
      samples.push(sample);await context.close();
      if(errors.length)throw Error('Browser error: '+errors.join(', '));
    }
    block++;console.log(`MEASURED run ${run}/${runs} ${themeId}/${width}: all 5 cases`);
  }
  const summary=[];
  for(const [build,look]of cases)for(const width of widths){const rows=samples.filter(s=>s.build===build&&s.look===look&&s.width===width);summary.push({build,look,width,lcp:summarize(rows.map(s=>s.lcp)),layout:summarize(rows.map(s=>s.LayoutDuration)),clsMax:Math.max(...rows.map(s=>s.cls)),task:summarize(rows.map(s=>s.TaskDuration))});}
  const report={schemaVersion:2,sourceManifest,baseline,before,after:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,conditions:{cpuSlowdown:4,cpuQuota:fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim(),transport:'Same local HTTP middleware for all builds; no browser interception; cache disabled; no network throttling',motion,runs,observationAfterReadyMs:1000,traceEnabled,order:'Interleaved rotated blocks',percentile:'Nearest rank p75; even median averages middle two; all samples retained',note:'Laboratory distribution, not field p75. Historical 9164 ms sample remains in docs/color-studio/performance.json; no original trace exists.'},summary,samples};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  for(const row of summary)console.log(JSON.stringify(row));
}finally{await browser?.close();child.kill('SIGTERM');await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
