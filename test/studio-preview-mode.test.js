import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import { createNeonThemeStore } from '../themes/neon-store.js';
import { themeRoutes } from '../routes/themes.js';
import { fromPalette } from '../public/js/color-studio.js';
test('Neon legado sem color_studio: leitura/ativação preservadas, nenhuma migração e cores bloqueadas',async()=>{
  const db=new PGlite(),calls=[];
  const sql={query(query,params=[]){const run=async()=>{calls.push(query);return(await db.query(query,params)).rows;};return{query,params,then:(resolve,reject)=>run().then(resolve,reject)};},transaction:queries=>db.transaction(async tx=>{const rows=[];for(const q of queries){calls.push(q.query);rows.push((await tx.query(q.query,q.params)).rows);}return rows;})};
  const store=createNeonThemeStore('offline-only',{createSql:()=>sql});
  const app=express();app.use(express.json());const auth=(req,res,next)=>{if(!req.headers.authorization)return res.sendStatus(401);req.user={role:req.headers.authorization==='admin'?'admin':'customer'};next();};
  app.use('/api',themeRoutes({store,auth,adminOnly:(req,res,next)=>req.user.role==='admin'?next():res.sendStatus(403)}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
  const put=(url,data,authorization='admin')=>fetch(base+url,{method:'PUT',headers:{authorization,'Content-Type':'application/json'},body:JSON.stringify(data)});
  try{
    assert.deepEqual(await store.readPublished(),{themeId:'artize',customization:null});
    const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='artize_theme_settings'")).rows.map(r=>r.column_name);assert(!columns.includes('color_studio'));
    const info=await(await fetch(base+'/admin/themes',{headers:{authorization:'admin'}})).json();assert.equal(info.colorStudioMode,'preview');assert.equal(info.canSaveColors,false);assert.equal(info.canActivate,true);assert.equal(info.themes.length,4);assert.equal(info.palettes.length,12);
    for(const action of ['draft','publish']){
      assert.equal((await put(`/admin/themes/natal/color-studio/${action}`,{customization:fromPalette('lavanda')})).status,409);
      assert.equal((await put(`/admin/themes/natal/color-studio/${action}`,{customization:null},'customer')).status,403);
    }
    await assert.rejects(store.saveStudio('natal',null));await assert.rejects(store.publishStudio('natal',null));
    for(const id of ['artize','natal','pascoa','dia-das-maes']){assert.equal((await put('/admin/themes/active',{themeId:id})).status,200);assert.equal((await store.readPublished()).themeId,id);assert.equal((await store.readPublished()).customization,null);}
    assert(!calls.some(q=>/\bALTER\b|SET color_studio/i.test(q)));
    assert(!calls.some(q=>q.includes('to_jsonb')),'temporary mode uses only the existing theme-ID reads');
  }finally{await new Promise(r=>server.close(r));await db.close();}
});
