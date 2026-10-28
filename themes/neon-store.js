import { neon } from '@neondatabase/serverless';
import { DEFAULT_THEME, findTheme } from './config.js';
import { normalizeStudio, studioEntry } from './color-studio.js';
import { validateCustomization } from '../public/js/color-studio.js';

const CACHE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export function createNeonThemeStore(databaseUrl, { createSql = neon, now = Date.now, studioWritable } = {}) {
  let sql;
  let initialization;
  let cached;
  let revision = 0;
  let colorsAvailable = studioWritable === true;
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
        // Only inspect the existing schema. Migrations require explicit operator approval.
        // The override is reserved for isolated transport fixtures/legacy preview mode.
        if (studioWritable === undefined) {
          const columns = await sql.query(`SELECT data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'artize_theme_settings'
              AND column_name = 'color_studio'`, [], options());
          colorsAvailable = columns[0]?.data_type === 'jsonb';
        }
      })().catch(error => { initialization = undefined; throw error; });
    }
    await initialization;
  }
  function remember(themeId) { cached = { themeId, expiresAt: now() + CACHE_MS }; }
  async function readRecord() {
    await initialize();
    const rows = await sql.query("SELECT theme_id, to_jsonb(settings)->'color_studio' AS color_studio FROM public.artize_theme_settings AS settings WHERE id = 1", [], options());
    if (!findTheme(rows[0]?.theme_id)) throw new Error('Configuração de tema ausente ou inválida');
    return rows[0];
  }
  async function writeStudio(themeId, config, userId, publish) {
    if (studioWritable === false) throw new Error('Salvamento de paletas indisponível neste ambiente.');
    if (!findTheme(themeId)) throw new Error('Tema inválido');
    const clean = validateCustomization(config);
    await initialize();
    if (!colorsAvailable) throw new Error('Estrutura de persistência de paletas ainda não validada.');
    const entry = publish ? { draft: clean, published: clean } : null;
    // Update only this theme's path; other themes and the active ID survive draft saves.
    const document = `jsonb_build_object('version', 1, 'themes', CASE WHEN jsonb_typeof(color_studio->'themes') = 'object' THEN color_studio->'themes' ELSE '{}'::jsonb END)`;
    const query = publish ? `UPDATE public.artize_theme_settings
      SET color_studio = jsonb_set(${document}, ARRAY['themes', $1]::text[], $2::jsonb, true),
          theme_id = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $3, version = version + 1
      WHERE id = 1 RETURNING theme_id` : `UPDATE public.artize_theme_settings
      SET color_studio = jsonb_set(${document}, ARRAY['themes', $1]::text[],
          (CASE WHEN jsonb_typeof(color_studio #> ARRAY['themes', $1]::text[]) = 'object'
            THEN color_studio #> ARRAY['themes', $1]::text[] ELSE '{"draft":null,"published":null}'::jsonb END)
          || jsonb_build_object('draft', $2::jsonb), true),
          updated_at = CURRENT_TIMESTAMP, updated_by = $3, version = version + 1
      WHERE id = 1 RETURNING theme_id`;
    try {
      const rows = await sql.query(query, [themeId, JSON.stringify(publish ? entry : clean), userId], options());
      if (!findTheme(rows[0]?.theme_id)) throw new Error('Gravação não confirmada');
      revision++; cached = undefined;
    } catch (error) { revision++; cached = undefined; throw error; }
  }
  return {
    async readStudio() {
      if (studioWritable !== false) await initialize();
      return colorsAvailable ? normalizeStudio((await readRecord()).color_studio) : normalizeStudio(null);
    },
    async readPublished() {
      await initialize();
      if (!colorsAvailable) return { themeId: await this.read(), customization: null };
      const record = await readRecord();
      return { themeId: record.theme_id, customization: studioEntry(record.color_studio, record.theme_id).published };
    },
    async saveStudio(themeId, config, userId = null) { await writeStudio(themeId, config, userId, false); },
    async publishStudio(themeId, config, userId = null) { await writeStudio(themeId, config, userId, true); },
    provider: 'neon', writable: true, warning: null,
    get studioWritable() { return colorsAvailable; },
    get studioWarning() { return colorsAvailable ? null : 'Salvar paletas aguarda a validação da estrutura JSONB no banco deste ambiente. A prévia continua disponível; nenhuma migração é executada automaticamente.'; },
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
