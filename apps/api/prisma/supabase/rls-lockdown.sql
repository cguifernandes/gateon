-- =============================================================================
-- Gateon — Row Level Security (Supabase)
-- =============================================================================
--
-- Run once in: Supabase Dashboard → SQL → New query → Run
--
-- Architecture:
--   - Web/Bot → NestJS API → Prisma → Postgres (custom auth, NOT Supabase Auth)
--   - RLS protects against direct access via Supabase Data API (anon/authenticated)
--   - API role (postgres / prisma) must keep full access — see section 4
--
-- Safe to re-run: drops Gateon RLS policies by name before recreating.
-- Does NOT modify Prisma migrations or application schema.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Revoke broad grants from Supabase API roles (defense in depth)
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- -----------------------------------------------------------------------------
-- 2) Enable RLS on application tables (Prisma migration history stays without RLS)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_name
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Explicit deny for anon + authenticated (Supabase REST / Realtime clients)
--    API superuser (postgres) and service_role bypass RLS on Supabase.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  table_name text;
  role_name text;
  policy_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    FOR table_name IN
      SELECT t.tablename
      FROM pg_tables t
      WHERE t.schemaname = 'public'
        AND t.tablename <> '_prisma_migrations'
    LOOP
      policy_name := format('gateon_deny_%s_%s', role_name, table_name);

      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_name,
        table_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO %I USING (false) WITH CHECK (false)',
        policy_name,
        table_name,
        role_name
      );
    END LOOP;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Dedicated Prisma DB role (optional but recommended in production)
--    Create the role in Supabase if you use a non-superuser connection string.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prisma') THEN
    CREATE ROLE prisma LOGIN;
  END IF;
END $$;

ALTER ROLE prisma BYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO prisma;
GRANT USAGE ON SCHEMA public TO prisma;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO prisma;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO prisma;

-- If prisma should run migrations, also grant (uncomment after setting a strong password):
-- ALTER ROLE prisma WITH PASSWORD 'replace-with-strong-password';

-- Prisma migration history — not app data; avoid "RLS enabled, no policy" advisor noise
ALTER TABLE public."_prisma_migrations" DISABLE ROW LEVEL SECURITY;

COMMIT;

-- -----------------------------------------------------------------------------
-- 5) Verify (run separately after COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname LIKE 'gateon_deny_%'
-- ORDER BY tablename, policyname;
