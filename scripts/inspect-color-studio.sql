-- READ ONLY. Run against the confirmed homologation database, never production.
-- Return metadata and aggregate counts only; do not export connection URLs or row contents.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
SELECT current_setting('server_version_num') AS server_version_num,
       to_regclass('public.artize_theme_settings') IS NOT NULL AS theme_table_exists;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'artize_theme_settings'
ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = to_regclass('public.artize_theme_settings');
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'artize_theme_settings';
SELECT has_table_privilege(current_user, to_regclass('public.artize_theme_settings'), 'SELECT') AS can_select,
       has_table_privilege(current_user, to_regclass('public.artize_theme_settings'), 'UPDATE') AS can_update;
-- If theme_table_exists is false, stop here and report the metadata; do not create it.
SELECT count(*) AS row_count, count(*) FILTER (WHERE id = 1) AS singleton_count,
       count(*) FILTER (WHERE theme_id NOT IN ('artize','natal','pascoa','dia-das-maes')) AS invalid_theme_count,
       pg_total_relation_size('public.artize_theme_settings') AS total_bytes
FROM public.artize_theme_settings;
-- to_jsonb tolerates an absent column. No palettes or user data are returned.
SELECT count(*) FILTER (WHERE to_jsonb(t) ? 'color_studio') AS rows_with_studio_column,
       count(*) FILTER (WHERE jsonb_typeof(to_jsonb(t)->'color_studio') = 'object') AS studio_object_count
FROM public.artize_theme_settings AS t;
COMMIT;
