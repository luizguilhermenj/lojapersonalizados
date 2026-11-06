import { formatCategoryLabel } from '../public/js/art-categories.js';
export const NATAL_FOLDER = 'Artize/Canecas ceramicas/natal';
export const ARTS_ROOT = 'Artize/Canecas ceramicas';
export const FILM_SUBCATEGORIES = [
  { id:'acao', folder:'AÇÃO', label:'Ação' },
  { id:'aventura', folder:'AVENTURA', label:'Aventura' },
  { id:'filmes-premiados', folder:'FILMES PREMIADOS', label:'Filmes premiados' },
  { id:'herois', folder:'HERÓIS', label:'Heróis' },
  { id:'infantil', folder:'INFANTIL', label:'Infantil' },
  { id:'terror', folder:'TERROR', label:'Terror' }
];
export const ART_SOURCES = [
  { folder:NATAL_FOLDER, theme:'natal', themeLabel:'Natal' },
  ...FILM_SUBCATEGORIES.map(category => ({ folder:`Artize/Canecas ceramicas/Filmes/${category.folder}`, theme:'filmes', themeLabel:'Filmes', subcategory:category.id, subcategoryLabel:category.label }))
];
export class SyncError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
export function cloudinaryConfig(env = process.env) {
  let cloud = env.CLOUDINARY_CLOUD_NAME, key = env.CLOUDINARY_API_KEY, secret = env.CLOUDINARY_API_SECRET;
  if ((!cloud || !key || !secret) && env.CLOUDINARY_URL) {
    try {
      const url = new URL(env.CLOUDINARY_URL);
      if (url.protocol === 'cloudinary:') {
        cloud ||= url.hostname; key ||= decodeURIComponent(url.username); secret ||= decodeURIComponent(url.password);
      }
    } catch { /* Never expose malformed credential URLs. */ }
  }
  const configured = cloud === 'etoqnuvw' && Boolean(key && secret) && !/[<>]/.test(key + secret);
  return { cloud, key, secret, configured };
}

async function readCloudinaryJson(url, { env = process.env, fetcher = fetch } = {}) {
  const { key, secret, configured } = cloudinaryConfig(env);
  if (!configured) throw new SyncError('Configure as credenciais Cloudinary no backend para etoqnuvw.', 503);
  try {
    const response = await fetcher(url, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      const messages = { 401:'Credenciais Cloudinary inválidas.', 403:'Sem permissão de leitura no Cloudinary.', 420:'Limite da API Cloudinary atingido. Tente mais tarde.', 429:'Limite da API Cloudinary atingido. Tente mais tarde.' };
      throw new SyncError(messages[response.status] || 'Falha ao consultar Cloudinary. Tente novamente.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof SyncError) throw error;
    throw new SyncError('Não foi possível consultar Cloudinary. Verifique a conexão e tente novamente.');
  }
}

export function folderSlug(name) {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if (slug) return ['todos','todas'].includes(slug) ? `colecao-${slug}` : slug;
  let hash = 2166136261;
  for (const character of name.normalize('NFC')) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return `colecao-${(hash >>> 0).toString(16)}`;
}
function folderLabel(name) {
  return formatCategoryLabel(name);
}
function sourceForFolder(folder) {
  const parts = folder.slice(ARTS_ROOT.length + 1).split('/');
  const aliases = { 'dia-das-maes':'maes', 'dia-dos-namorados':'namorados', 'dia-dos-pais':'paes', 'dia-dos-avos':'avos', 'cactus-e-flores':'flores', 'diversas':'diversos' };
  const slug = folderSlug(parts[0]), theme = aliases[slug] || slug;
  const labels = { natal:'Natal',pascoa:'Páscoa',maes:'Dia das Mães',namorados:'Dia dos Namorados',paes:'Dia dos Pais',avos:'Dia dos Avós',flores:'Cactus e Flores',diversos:'Diversas' };
  return { folder, theme, themeLabel:labels[theme] || folderLabel(parts[0]),
    ...(parts.length > 1 ? { subcategory:parts.slice(1).map(folderSlug).join('-'), subcategoryLabel:parts.slice(1).map(folderLabel).join(' · ') } : {}) };
}

export async function discoverArtSources(options = {}) {
  const { cloud, configured } = cloudinaryConfig(options.env || process.env);
  if (!configured) throw new SyncError('Configure as credenciais Cloudinary no backend para etoqnuvw.', 503);
  const queue = [ARTS_ROOT], seen = new Set([ARTS_ROOT]), identities = new Map(), sources = [];
  for (let position = 0; position < queue.length; position++) {
    const parent = queue[position], cursors = new Set(); let cursor;
    do {
      const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/folders/${parent.split('/').map(encodeURIComponent).join('/')}`);
      url.searchParams.set('max_results','500');
      if (cursor) url.searchParams.set('next_cursor',cursor);
      const payload = await readCloudinaryJson(url, options);
      if (!Array.isArray(payload.folders)) throw new SyncError('Listagem de pastas inválida do Cloudinary.');
      for (const folder of payload.folders) {
        const path = folder?.path;
        if (typeof path !== 'string' || !path.startsWith(parent + '/') || !path.slice(parent.length + 1) ||
            path.slice(parent.length + 1).includes('/') || ['.','..'].includes(path.slice(parent.length + 1))) throw new SyncError('Cloudinary retornou uma pasta fora da coleção autorizada.');
        if (seen.has(path)) continue;
        if (path.slice(ARTS_ROOT.length + 1).split('/').length > 6 || seen.size >= 2000) throw new SyncError('Limite de organização de pastas excedido.');
        const source = sourceForFolder(path), identity = `${source.theme}/${source.subcategory || ''}`;
        if (identities.has(identity) && identities.get(identity) !== path) throw new SyncError('Duas pastas geram a mesma categoria. Diferencie os nomes no Cloudinary.');
        identities.set(identity,path); seen.add(path); queue.push(path); sources.push(source);
      }
      cursor = payload.next_cursor;
      if (cursor && (typeof cursor !== 'string' || cursors.has(cursor))) throw new SyncError('Paginação de pastas inválida do Cloudinary.');
      if (cursor) cursors.add(cursor);
      if (cursors.size > 1000) throw new SyncError('Limite de páginas de pastas excedido.');
    } while (cursor);
  }
  return sources;
}
async function listFolderArts(source, { env = process.env, fetcher = fetch } = {}) {
  const { cloud, configured } = cloudinaryConfig(env);
  if (!configured) throw new SyncError('Configure as credenciais Cloudinary no backend para etoqnuvw.', 503);
  const assets = new Map();
  const cursors = new Set();
  let cursor;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/by_asset_folder`);
    url.searchParams.set('asset_folder', source.folder);
    url.searchParams.set('max_results', '100');
    if (cursor) url.searchParams.set('next_cursor', cursor);
    const payload = await readCloudinaryJson(url, { env, fetcher });
    if (!Array.isArray(payload.resources)) throw new SyncError('Resposta inválida do Cloudinary.');
    for (const item of payload.resources) {
      if (item.resource_type !== 'image') continue;
      if (item.asset_folder !== undefined && item.asset_folder !== source.folder) throw new SyncError('Cloudinary retornou uma pasta inesperada.');
      let image;
      try { image = new URL(item.secure_url); } catch { throw new SyncError('Imagem Cloudinary sem URL válida.'); }
      if (!item.asset_id || !item.public_id || image.protocol !== 'https:' || image.hostname !== 'res.cloudinary.com' || !image.pathname.startsWith('/etoqnuvw/')) throw new SyncError('Metadados de imagem inválidos.');
      assets.set(item.asset_id, {
        id: `cloudinary-${item.asset_id}`, asset_id: item.asset_id, public_id: item.public_id,
        name: item.display_name || item.public_id.split('/').pop(),
        description: source.theme === 'natal' ? 'Arte temática de Natal para caneca de cerâmica.' : source.theme === 'filmes' ? 'Arte de filmes para caneca de cerâmica.' : `Arte da coleção ${source.themeLabel} para caneca de cerâmica.`,
        theme: source.theme, themeLabel: source.themeLabel, image: item.secure_url,
        source_folder: source.folder,
        ...(source.subcategory ? { subcategory:source.subcategory, subcategoryLabel:source.subcategoryLabel } : {})
      });
    }
    cursor = payload.next_cursor;
    if (cursor && (typeof cursor !== 'string' || cursors.has(cursor))) throw new SyncError('Paginação inválida do Cloudinary.');
    if (cursor) cursors.add(cursor);
    if (cursors.size > 1000) throw new SyncError('Limite de páginas excedido.');
  } while (cursor);
  return [...assets.values()];
}
export function listNatalArts(options) { return listFolderArts(ART_SOURCES[0], options); }
export async function listCeramicArts(options = {}) {
  const assets = new Map();
  // Explicit source injection is reserved for isolated fixtures; runtime discovers folders.
  for (const source of options.sources || await discoverArtSources(options)) {
    for (const art of await listFolderArts(source, options)) {
      if (assets.has(art.asset_id)) throw new SyncError('Uma imagem foi retornada em mais de uma pasta. Verifique a organização no Cloudinary.');
      assets.set(art.asset_id, art);
    }
  }
  return [...assets.values()];
}
