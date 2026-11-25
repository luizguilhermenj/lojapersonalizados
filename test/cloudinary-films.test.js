import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_SOURCES, FILM_SUBCATEGORIES, listCeramicArts } from '../lib/cloudinary-arts.js';
import { ART_CATEGORIES } from '../public/js/art-categories.js';

const env={CLOUDINARY_CLOUD_NAME:'etoqnuvw',CLOUDINARY_API_KEY:'fixture',CLOUDINARY_API_SECRET:'fixture'};
const asset=(id,folder)=>({asset_id:id,public_id:`${id}_MOCKUPS`,resource_type:'image',asset_folder:folder,secure_url:`https://res.cloudinary.com/etoqnuvw/image/upload/v1/${id}.jpg`});
const ok=payload=>({ok:true,json:async()=>payload});

test('reads exact case/accented folders and paginates genres independently, matching UI IDs',async()=>{
  const calls=[];
  const arts=await listCeramicArts({env,sources:ART_SOURCES,fetcher:async url=>{
    const folder=url.searchParams.get('asset_folder'),cursor=url.searchParams.get('next_cursor');
    calls.push({folder,cursor});
    const index=ART_SOURCES.findIndex(source=>source.folder===folder);
    assert(index>=0);
    return ok({resources:[asset(`${index}-${cursor||'first'}`,folder)],...(index===1&&!cursor?{next_cursor:'page2'}:{})});
  }});
  assert.equal(calls.length,8); assert.equal(arts.length,8);
  assert.equal(arts[0].theme,'natal'); assert(!arts[0].subcategory);
  assert.equal(arts[1].theme,'filmes'); assert.equal(arts[1].subcategory,'acao');
  assert.equal(arts[2].subcategory,'acao');
  assert.deepEqual(ART_SOURCES.slice(1).map(s=>s.folder),[
    'Artize/Canecas ceramicas/Filmes/AÇÃO','Artize/Canecas ceramicas/Filmes/AVENTURA',
    'Artize/Canecas ceramicas/Filmes/FILMES PREMIADOS','Artize/Canecas ceramicas/Filmes/HERÓIS',
    'Artize/Canecas ceramicas/Filmes/INFANTIL','Artize/Canecas ceramicas/Filmes/TERROR']);
  assert.deepEqual(FILM_SUBCATEGORIES.map(s=>s.id),ART_CATEGORIES.find(c=>c.id==='filmes').subcategories.map(s=>s.id));
});

test('failure in a later genre or wrong folder rejects the complete import without partial results',async()=>{
  let calls=0;
  await assert.rejects(listCeramicArts({env,sources:ART_SOURCES,fetcher:async url=>{
    if(++calls===4)return {ok:false,status:403};
    return ok({resources:[asset(String(calls),url.searchParams.get('asset_folder'))]});
  }}),/permissão/);
  assert.equal(calls,4);
  await assert.rejects(listCeramicArts({env,sources:ART_SOURCES,fetcher:async()=>ok({resources:[asset('x','incorrect-folder')]})}),/pasta/);
});

test('empty genres are allowed and duplicate assets across folders are rejected',async()=>{
  assert.deepEqual(await listCeramicArts({env,sources:ART_SOURCES,fetcher:async()=>ok({resources:[]})}),[]);
  await assert.rejects(listCeramicArts({env,sources:ART_SOURCES,fetcher:async url=>ok({resources:[asset('same',url.searchParams.get('asset_folder'))]})}),/mais de uma pasta/);
});
