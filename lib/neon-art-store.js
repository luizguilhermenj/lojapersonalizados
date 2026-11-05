import { neon } from '@neondatabase/serverless';
import { FILM_SUBCATEGORIES } from './cloudinary-arts.js';

const metadataCheck = `jsonb_typeof(art) = 'object'
  AND art ?& ARRAY['id', 'asset_id', 'theme']
  AND (art->>'theme' = 'natal' OR (art->>'theme' = 'filmes' AND art ? 'subcategory'
    AND art->>'subcategory' IN (${FILM_SUBCATEGORIES.map(item => `'${item.id}'`).join(', ')})))
  AND art->>'id' = id AND art->>'asset_id' = asset_id`;

// Only this dedicated table is created or written. No theme/order/user migration.
export const ARTS_DDL = `CREATE TABLE IF NOT EXISTS public.artize_cloudinary_arts (
  asset_id TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  art JSONB NOT NULL CONSTRAINT artize_cloudinary_arts_metadata_check CHECK (${metadataCheck}),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

// Upgrade only the constraint created by our initial Natal-only arts feature.
// Add the stronger identity/category check before removing that old check.
export const ARTS_SCHEMA_UPGRADE = `DO $arts$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.artize_cloudinary_arts'::regclass
    AND conname = 'artize_cloudinary_arts_metadata_check') THEN
    ALTER TABLE public.artize_cloudinary_arts ADD CONSTRAINT artize_cloudinary_arts_metadata_check CHECK (${metadataCheck});
  END IF;
  ALTER TABLE public.artize_cloudinary_arts DROP CONSTRAINT IF EXISTS artize_cloudinary_arts_art_check;
END; $arts$`;

export const ARTS_UPSERT = `WITH incoming AS (
  SELECT value->>'asset_id' AS asset_id, value->>'id' AS id, value AS art
  FROM jsonb_array_elements($1::jsonb)
), prepared AS MATERIALIZED (
  SELECT i.asset_id, COALESCE(p.id, i.id) AS id,
    i.art || jsonb_build_object('id', COALESCE(p.id, i.id)) AS art,
    p.asset_id IS NULL AS added,
    p.asset_id IS NOT NULL AND p.art IS DISTINCT FROM (i.art || jsonb_build_object('id', p.id)) AS updated
  FROM incoming i LEFT JOIN public.artize_cloudinary_arts p USING (asset_id)
), saved AS (
  INSERT INTO public.artize_cloudinary_arts (asset_id, id, art)
  SELECT asset_id, id, art FROM prepared WHERE added OR updated
  ON CONFLICT (asset_id) DO UPDATE SET art = EXCLUDED.art, updated_at = CURRENT_TIMESTAMP
  RETURNING asset_id
)
SELECT (SELECT count(*)::int FROM prepared WHERE added) AS added,
  (SELECT count(*)::int FROM prepared WHERE updated) AS updated,
  (SELECT count(*)::int FROM prepared WHERE NOT added AND NOT updated) AS unchanged,
  (SELECT count(*)::int FROM prepared) AS received,
  (SELECT count(*)::int FROM public.artize_cloudinary_arts) + (SELECT count(*)::int FROM prepared WHERE added) AS total,
  (SELECT count(*)::int FROM saved) AS written`;

export function validateArts(arts, baseIds = new Set()) {
  if (!Array.isArray(arts)) throw new Error('Catálogo inválido');
  const assets = new Set(), ids = new Set(baseIds);
  for (const art of arts) {
    if (!art || typeof art.asset_id !== 'string' || !art.asset_id || assets.has(art.asset_id) ||
        typeof art.id !== 'string' || !art.id.startsWith('cloudinary-') || ids.has(art.id) ||
        !(art.theme === 'natal' || (art.theme === 'filmes' && FILM_SUBCATEGORIES.some(item => item.id === art.subcategory))) ||
        typeof art.name !== 'string' || !art.name || typeof art.public_id !== 'string') throw new Error('Metadados de artes inválidos');
    const url = new URL(art.image);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith('/etoqnuvw/') || url.username || url.password) throw new Error('URL de arte inválida');
    assets.add(art.asset_id); ids.add(art.id);
  }
  return arts;
}

export function createNeonArtStore(databaseUrl, { createSql = neon } = {}) {
  const sql = createSql(databaseUrl);
  const options = () => ({ fetchOptions: { signal: AbortSignal.timeout(20000) } });
  let initialization;
  const initialize = () => initialization ||= sql.transaction([
    sql.query("SELECT set_config('lock_timeout', '5s', true)"),
    sql.query('SELECT pg_advisory_xact_lock(713922105)'),
    sql.query(ARTS_DDL),
    sql.query(ARTS_SCHEMA_UPGRADE)
  ], options()).catch(error => { initialization = undefined; throw error; });
  return {
    async read() {
      try {
        const rows = await sql.query('SELECT art FROM public.artize_cloudinary_arts ORDER BY asset_id', [], options());
        return validateArts(rows.map(row => row.art));
      } catch (error) { if (error.code === '42P01') return []; throw error; }
    },
    async save(arts, baseIds) {
      validateArts(arts, baseIds);
      await initialize();
      const results = await sql.transaction([
        sql.query("SELECT set_config('lock_timeout', '5s', true)"),
        sql.query('SELECT pg_advisory_xact_lock(713922105)'),
        sql.query(ARTS_UPSERT, [JSON.stringify(arts)])
      ], options());
      const { written, ...counts } = results[2][0];
      return counts;
    }
  };
}
