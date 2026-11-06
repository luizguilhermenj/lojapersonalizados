import express from 'express';
import path from 'node:path';
// Snapshot local somente de frontend; APIs e dados continuam isolados pelo helper.
if(process.env.VISUAL_PERF_BASELINE==='1'){
 const use=express.application.use;let mounted=false;
 express.application.use=function(...args){if(!mounted){mounted=true;use.call(this,express.static(path.resolve('work/perf-baseline/public')));}return use.apply(this,args);};
}
await import('./visual-server.mjs');
