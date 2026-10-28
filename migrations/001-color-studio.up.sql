-- Manual only: inspect the target schema, back up, and obtain specific authorization first.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(713922104);
DO $$
BEGIN
  IF to_regclass('public.artize_theme_settings') IS NULL THEN
    RAISE EXCEPTION 'Expected legacy theme table is missing; inspect before migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'artize_theme_settings'
      AND column_name = 'color_studio' AND data_type <> 'jsonb'
  ) THEN
    RAISE EXCEPTION 'Existing color_studio column has incompatible type; inspect before migration';
  END IF;
END $$;
ALTER TABLE public.artize_theme_settings
  ADD COLUMN IF NOT EXISTS color_studio JSONB NOT NULL DEFAULT '{"version":1,"themes":{}}'::jsonb;
COMMIT;
