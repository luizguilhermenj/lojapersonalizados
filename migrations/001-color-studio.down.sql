-- Manual rollback only. Export color_studio before removing its data.
-- Preserves the active theme, IDs, audit fields and every preexisting column.
BEGIN;
SELECT pg_advisory_xact_lock(713922104);
ALTER TABLE public.artize_theme_settings DROP COLUMN IF EXISTS color_studio;
COMMIT;
