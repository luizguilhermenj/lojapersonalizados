export const NATAL_FOLDER = 'Artize/Canecas ceramicas/natal';
export class SyncError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
export async function listNatalArts({ env = process.env, fetcher = fetch } = {}) {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = env;
  if (cloud !== 'etoqnuvw' || !key || !secret) throw new SyncError('Configure as credenciais Cloudinary no backend para etoqnuvw.', 503);
  const assets = new Map();
  const cursors = new Set();
  let cursor;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/by_asset_folder`);
    url.searchParams.set('asset_folder', NATAL_FOLDER);
    url.searchParams.set('max_results', '100');
    if (cursor) url.searchParams.set('next_cursor', cursor);
    let response, payload;
    try {
      response = await fetcher(url, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const messages = { 401: 'Credenciais Cloudinary inválidas.', 403: 'Sem permissão de leitura no Cloudinary.', 420: 'Limite da API Cloudinary atingido. Tente mais tarde.', 429: 'Limite da API Cloudinary atingido. Tente mais tarde.' };
        throw new SyncError(messages[response.status] || 'Falha ao consultar Cloudinary. Tente novamente.');
      }
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyncError) throw error;
      throw new SyncError('Não foi possível consultar Cloudinary. Verifique a conexão e tente novamente.');
    }
    if (!Array.isArray(payload.resources)) throw new SyncError('Resposta inválida do Cloudinary.');
    for (const item of payload.resources) {
      if (item.resource_type !== 'image') continue;
      if (item.asset_folder !== undefined && item.asset_folder !== NATAL_FOLDER) throw new SyncError('Cloudinary retornou uma pasta inesperada.');
      let image;
      try { image = new URL(item.secure_url); } catch { throw new SyncError('Imagem Cloudinary sem URL válida.'); }
      if (!item.asset_id || !item.public_id || image.protocol !== 'https:' || image.hostname !== 'res.cloudinary.com' || !image.pathname.startsWith('/etoqnuvw/')) throw new SyncError('Metadados de imagem inválidos.');
      assets.set(item.asset_id, {
        id: `cloudinary-${item.asset_id}`, asset_id: item.asset_id, public_id: item.public_id,
        name: item.display_name || item.public_id.split('/').pop(),
        description: 'Arte temática de Natal para caneca de cerâmica.',
        theme: 'natal', themeLabel: 'Natal', image: item.secure_url
      });
    }
    cursor = payload.next_cursor;
    if (cursor && (typeof cursor !== 'string' || cursors.has(cursor))) throw new SyncError('Paginação inválida do Cloudinary.');
    if (cursor) cursors.add(cursor);
    if (cursors.size > 1000) throw new SyncError('Limite de páginas excedido.');
  } while (cursor);
  return [...assets.values()];
}
