import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTS_ROOT, discoverArtSources, listCeramicArts, folderSlug } from '../lib/cloudinary-arts.js';
import { buildCategories, categoryPath, formatCategoryLabel } from '../public/js/art-categories.js';
import { validateArts } from '../lib/neon-art-store.js';

const env={CLOUDINARY_CLOUD_NAME:'etoqnuvw',CLOUDINARY_API_KEY:'fixture',CLOUDINARY_API_SECRET:'fixture'};
const ok=payload=>({ok:true,json:async()=>payload});
const folder=name=>({name,path:`${ARTS_ROOT}/${name}`});

test('discovers paginated folders and images with exact casing, dynamic categories and sentence-case labels',async()=>{
  const names=['natal','Filmes','Desenhos','Funko','Games','MUSICA, BANDAS, CANTORES','SÉRIES'];
  const children={Desenhos:['BOB ESPONJA','BRANCA DE NEVE','DIA DOS MORTOS','DIVERSOS','DU, DUDU E EDU','HE-MAN','RICK E MORTY','SHEREK','SIMPSONS','THUNDERCATS','TURMA DA MONICA','TURMA DO BAIRRO'],Funko:['HARRY POTTER','LA CASA DE PAPEL'],Filmes:['AÇÃO'],Games:['GTA'],'MUSICA, BANDAS, CANTORES':['BRUNO MARS'],'SÉRIES':['BLACK MIRROR']};
  const calls=[];
  const arts=await listCeramicArts({env,fetcher:async url=>{
    calls.push(url);
    if(url.pathname.includes('/folders/')){
      const parent=decodeURIComponent(url.pathname.split('/folders/')[1]);
      if(parent===ARTS_ROOT)return ok({folders:(url.searchParams.get('next_cursor')?names.slice(2):names.slice(0,2)).map(folder),...(!url.searchParams.get('next_cursor')?{next_cursor:'folders-2'}:{})});
      const name=parent.slice(ARTS_ROOT.length+1);
      return ok({folders:(children[name]||[]).map(child=>({name:child,path:parent+'/'+child}))});
    }
    const path=url.searchParams.get('asset_folder');
    const relative=path.slice(ARTS_ROOT.length+1);
    if(children[relative])return ok({resources:[]});
    const cursor=url.searchParams.get('next_cursor');
    const id=folderSlug(relative)+'-'+(cursor||'first');
    return ok({resources:[{asset_id:id,public_id:id,resource_type:'image',asset_folder:path,secure_url:`https://res.cloudinary.com/etoqnuvw/image/upload/v1/${id}.jpg`}],...(relative==='Desenhos/BOB ESPONJA'&&!cursor?{next_cursor:'images-2'}:{})});
  }});
  const drawings=arts.filter(art=>art.theme==='desenhos');
  assert.equal(drawings.length,13);
  assert.equal(new Set(drawings.map(art=>art.subcategory)).size,12);
  assert(drawings.some(art=>art.subcategoryLabel==='Rick e morty'));
  assert(arts.some(art=>art.source_folder===`${ARTS_ROOT}/Funko/HARRY POTTER`&&art.subcategoryLabel==='Harry potter'));
  assert(arts.some(art=>art.theme==='series'&&art.themeLabel==='Séries'));
  assert(calls.some(url=>url.searchParams.get('next_cursor')==='folders-2'));
  assert(calls.some(url=>url.searchParams.get('next_cursor')==='images-2'));
  assert.equal(validateArts(arts).length,arts.length);
  const categories=buildCategories(arts);
  assert.equal(categories.find(c=>c.id==='desenhos').subcategories.length,12);
  assert.equal(categoryPath('funko','harry-potter',categories),'Funko · Harry potter');
  assert.equal(categoryPath('desenhos','turma-da-monica',categories),'Desenhos · Turma da monica');
});

test('casing and accents preserve identity but folders with colliding normalized paths are rejected',async()=>{
  assert.equal(folderSlug('FUNKO'),folderSlug('Funko'));
  assert.equal(folderSlug('AÇÃO'),folderSlug('Ação'));
  assert.equal(formatCategoryLabel('LA CASA DE PAPEL'),'La casa de papel');
  assert.equal(formatCategoryLabel('RICK E MORTY'),'Rick e morty');
  assert.notEqual(folderSlug('todos'),'todos');
  await assert.rejects(discoverArtSources({env,fetcher:async()=>ok({folders:[folder('Funko'),folder('FUNKO')]})}),/mesma categoria/);
});

test('scope escape, invalid folder responses, failed listing and repeated cursors fail closed',async()=>{
  for(const folders of [[{path:'Outside/Desenhos'}],[{path:ARTS_ROOT+'/..'}],[{path:ARTS_ROOT+'/Desenhos/BOB'}]]){
    await assert.rejects(discoverArtSources({env,fetcher:async()=>ok({folders})}),/fora da coleção/);
  }
  await assert.rejects(discoverArtSources({env,fetcher:async()=>ok({resources:[]})}),/Listagem/);
  await assert.rejects(discoverArtSources({env,fetcher:async()=>({ok:false,status:403})}),/permissão/);
  await assert.rejects(discoverArtSources({env,fetcher:async()=>ok({folders:[],next_cursor:'repeat'})}),/Paginação/);
});

test('failed child discovery never reaches asset import; taxonomy is derived without mutating defaults',async()=>{
  let assetCalls=0;
  await assert.rejects(listCeramicArts({env,fetcher:async url=>{
    if(!url.pathname.includes('/folders/')){assetCalls++;return ok({resources:[]});}
    if(decodeURIComponent(url.pathname.split('/folders/')[1])===ARTS_ROOT)return ok({folders:[folder('Desenhos')]});
    return {ok:false,status:500};
  }}));
  assert.equal(assetCalls,0);
  const first=buildCategories([{theme:'funko',themeLabel:'FUNKO',subcategory:'friends',subcategoryLabel:'FRIENDS'}]);
  assert.equal(first.find(c=>c.id==='funko').label,'Funko');
  assert(!buildCategories([]).some(c=>c.id==='funko'));
});
