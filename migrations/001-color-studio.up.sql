-- Applied idempotently by the existing Neon initializer under its advisory lock.
-- Run manually only against the intended environment, after backup.
BEGIN;
SELECT pg_advisory_xact_lock(713922104);
ALTER TABLE public.artize_theme_settings
  ADD COLUMN IF NOT EXISTS color_studio JSONB NOT NULL DEFAULT '{"version":1,"themes":{}}'::jsonb;
COMMIT;
