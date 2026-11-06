// Browser fixture: legacy Neon transport only, no remote DB or new schema column.
import express from 'express';
import fs from 'node:fs';
import { createNeonThemeStore } from '../../themes/neon-store.js';
import { themeRoutes } from '../../routes/themes.js';
const state={themeId:'artize',calls:[]};
const execute=({query,params=[]})=>{
  state.calls.push({query,params});
  if (/\bALTER\b|SET color_studio/i.test(query)) throw Error('Studio DDL/write forbidden');
  if(query.startsWith('UPDATE'))state.themeId=params[0];
  return query.startsWith('SELECT theme_id')||query.startsWith('UPDATE')?[{theme_id:state.themeId,color_studio:null}]:[];
};
const sql={query:(query,params=[])=>({query,params,then:(resolve,reject)=>Promise.resolve().then(()=>execute({query,params})).then(resolve,reject)}),transaction:async queries=>queries.map(execute)};
const store=createNeonThemeStore('offline-transport-only',{createSql:()=>sql});
const app=express();app.use(express.json());
const auth=(req,res,next)=>{const token=req.get('authorization');if(!['Bearer preview-admin','Bearer preview-customer'].includes(token))return res.sendStatus(401);req.user={id:'preview-user',role:token==='Bearer preview-admin'?'admin':'customer'};next();};
const adminOnly=(req,res,next)=>req.user.role==='admin'?next():res.sendStatus(403);
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.get('/api/products',(req,res)=>res.json(JSON.parse(fs.readFileSync('data/products.json','utf8'))));
app.get('/api/admin/orders',auth,adminOnly,(req,res)=>res.json({orders:[]}));
app.get('/api/admin/notifications/new-sales',auth,adminOnly,(req,res)=>res.json({hasNewSales:false}));
app.get('/__test/state',auth,adminOnly,(req,res)=>res.json(state));
app.use('/api',themeRoutes({store,auth,adminOnly}));
app.use(express.static('public'));
const server=app.listen(Number(process.env.PORT||4340),'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
