import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { listCeramicArts, SyncError } from './cloudinary-arts.js';
export function createCatalog({ baseFile, syncFile, list = listCeramicArts, enabled = true }) {
  let syncing = false;
  const read = async file => {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(data)) throw new Error('Catálogo inválido');
    return data;
  };
  const synced = async () => {
    try { return await read(syncFile); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  const validateIds = arts => {
    const ids = new Set();
    for (const art of arts) {
      if (!art || typeof art.id !== 'string' || !art.id || ids.has(art.id)) throw new Error('IDs de artes inválidos ou duplicados');
      ids.add(art.id);
    }
    return arts;
  };
  return {
    async get() {
      const base = validateIds(await read(baseFile));
      if (!enabled) return base;
      try { return validateIds([...base, ...await synced()]); }
      catch { return base; } // Keep original arts available; sync still refuses damaged files.
    },
    async sync() {
      if (!enabled) throw new SyncError('Sincronização indisponível em homologação: armazenamento durável ainda não configurado.', 503);
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
          const finalArt = old ? { ...art, id: old.id } : art;
          if (!old) added++;
          else if (JSON.stringify(old) !== JSON.stringify(finalArt)) updated++;
          merged.set(art.asset_id, finalArt);
        }
        validateIds([...await read(baseFile), ...merged.values()]);
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
