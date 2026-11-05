import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { listNatalArts, SyncError } from './cloudinary-arts.js';
export function createCatalog({ baseFile, syncFile, list = listNatalArts }) {
  let syncing = false;
  const read = async file => {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(data)) throw new Error('Catálogo inválido');
    return data;
  };
  const synced = async () => {
    try { return await read(syncFile); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  return {
    async get() { return [...await read(baseFile), ...await synced()]; },
    async sync() {
      if (syncing) throw new SyncError('Uma sincronização já está em andamento.', 409);
      syncing = true;
      let temporary;
      try {
        const previous = await synced();
        const incoming = await list();
        const merged = new Map(previous.map(art => [art.asset_id, art]));
        let added = 0, updated = 0;
        for (const art of incoming) {
          const old = merged.get(art.asset_id);
          if (!old) added++;
          else if (JSON.stringify(old) !== JSON.stringify(art)) updated++;
          merged.set(art.asset_id, old ? { ...art, id: old.id } : art);
        }
        temporary = `${syncFile}.${randomUUID()}.tmp`;
        await fs.writeFile(temporary, JSON.stringify([...merged.values()], null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await fs.rename(temporary, syncFile);
        return { added, updated, unchanged: incoming.length - added - updated, received: incoming.length, total: merged.size };
      } finally {
        if (temporary) await fs.rm(temporary, { force: true });
        syncing = false;
      }
    }
  };
}
