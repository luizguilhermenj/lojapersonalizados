-- Deferred: never applied by the application initializer. Frontend preview needs no migration.
-- Run manually only against the intended environment, after backup.
BEGIN;
SELECT pg_advisory_xact_lock(713922104);
ALTER TABLE public.artize_theme_settings
  ADD COLUMN IF NOT EXISTS color_studio JSONB NOT NULL DEFAULT '{"version":1,"themes":{}}'::jsonb;
COMMIT;
