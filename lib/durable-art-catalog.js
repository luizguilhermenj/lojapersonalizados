import fs from 'node:fs/promises';
import { listCeramicArts, SyncError } from './cloudinary-arts.js';
import { validateArts } from './neon-art-store.js';

export function createDurableCatalog({ baseFile, store, list = listCeramicArts, credentialsReady = false }) {
  let syncing = false, lastGood = [], warning = null;
  const base = async () => JSON.parse(await fs.readFile(baseFile, 'utf8'));
  const read = async originals => {
    lastGood = validateArts(await store.read(), new Set(originals.map(art => art.id)));
    warning = null;
    return lastGood;
  };
  const catalog = {
    async get() {
      const originals = await base();
      try { return [...originals, ...await read(originals)]; }
      catch { warning = 'Catálogo sincronizado temporariamente indisponível. Tente novamente.'; return [...originals, ...lastGood]; }
    },
    async status() {
      try { await read(await base()); } catch { warning = 'Não foi possível consultar o catálogo salvo no Neon. Tente novamente.'; }
      const categories = lastGood.reduce((counts, art) => { counts[art.theme] = (counts[art.theme] || 0) + 1; return counts; }, {});
      return { enabled: credentialsReady, durable: true, provider: 'neon', total: lastGood.length, categories, warning,
        message: !credentialsReady ? 'Configure as credenciais Cloudinary no Render para sincronizar.'
          : warning || `Catálogo salvo no Neon: ${lastGood.length} artes sincronizadas. Natal: ${categories.natal || 0} · Filmes: ${categories.filmes || 0}.` };
    },
    async sync() {
      if (!credentialsReady) throw new SyncError('Configure as credenciais Cloudinary no backend.', 503);
      if (syncing) throw new SyncError('Uma sincronização já está em andamento.', 409);
      syncing = true;
      try {
        const originals = await base();
        const incoming = validateArts(await list(), new Set(originals.map(art => art.id)));
        const result = await store.save(incoming, new Set(originals.map(art => art.id)));
        // Commit already succeeded. A failed refresh must not misreport a failed save.
        try { await read(originals); } catch { warning = 'Sincronização salva. Atualize a página para consultar o catálogo.'; }
        return result;
      } catch (error) {
        if (error instanceof SyncError) throw error;
        throw new SyncError('Não foi possível salvar as artes no Neon. Nenhuma exclusão foi realizada; tente novamente.', 503);
      } finally { syncing = false; }
    },
    async bootstrap() {
      if (!credentialsReady) return;
      // Import the newly authorized film sources once; later deploys reuse Neon.
      if (!(await store.read()).some(art => art.theme === 'filmes')) return catalog.sync();
    }
  };
  return catalog;
}
