import { neon } from '@neondatabase/serverless';
import { DEFAULT_THEME, findTheme } from './config.js';

const CACHE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export function createNeonThemeStore(databaseUrl, { createSql = neon, now = Date.now } = {}) {
  let sql;
  let initialization;
  let cached;
  let revision = 0;
  // Um novo sinal por operação permite recuperação depois de um timeout.
  const options = () => ({ fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) } });
  async function initialize() {
    if (!initialization) {
      initialization = (async () => {
        sql ||= createSql(databaseUrl);
        await sql.transaction([
          // Serializa a criação entre instâncias, inclusive no primeiro deploy.
          sql.query('SELECT pg_advisory_xact_lock(713922104)'),
          sql.query(`CREATE TABLE IF NOT EXISTS public.artize_theme_settings (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            theme_id TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT,
            version BIGINT NOT NULL DEFAULT 1
          )`),
          sql.query(`INSERT INTO public.artize_theme_settings (id, theme_id)
            VALUES (1, $1) ON CONFLICT (id) DO NOTHING`, [DEFAULT_THEME])
        ], options());
      })().catch(error => { initialization = undefined; throw error; });
    }
    await initialization;
  }
  function remember(themeId) { cached = { themeId, expiresAt: now() + CACHE_MS }; }
  return {
    provider: 'neon', writable: true, warning: null,
    async read({ fresh = false } = {}) {
      if (!fresh && cached && now() < cached.expiresAt) return cached.themeId;
      const readRevision = revision;
      await initialize();
      const rows = await sql.query('SELECT theme_id FROM public.artize_theme_settings WHERE id = 1', [], options());
      const themeId = rows[0]?.theme_id;
      if (!findTheme(themeId)) throw new Error('Configuração de tema ausente ou inválida');
      // Uma leitura iniciada antes da publicação não deve repor o cache antigo.
      if (readRevision !== revision) return cached?.themeId || themeId;
      remember(themeId);
      return themeId;
    },
    async save(themeId, userId = null) {
      if (!findTheme(themeId)) throw new Error('Tema inválido');
      await initialize();
      // Nenhum dado do administrador é concatenado ao SQL.
      try {
        const rows = await sql.query(`UPDATE public.artize_theme_settings
          SET theme_id = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2, version = version + 1
          WHERE id = 1 RETURNING theme_id`, [themeId, userId], options());
        if (rows[0]?.theme_id !== themeId) throw new Error('Gravação não confirmada');
        revision++;
        remember(themeId);
      } catch (error) {
        // Um timeout pode ocorrer depois do commit; force reconciliação na próxima leitura.
        revision++;
        cached = undefined;
        throw error;
      }
    }
  };
}
