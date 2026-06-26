-- =============================================================================
-- Gateon — Create dedicated Prisma database user (Supabase)
-- =============================================================================
--
-- Run in: Supabase Dashboard → SQL → New query
--
-- BEFORE running:
--   1. Replace __PRISMA_PASSWORD__ with a strong random password (32+ chars).
--   2. Save the password in Render secrets only (never commit).
--
-- Connection string format on Supabase (note prisma.PROJECT_REF):
--   postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
--
-- Find [PROJECT-REF] in: Project Settings → General → Reference ID
-- =============================================================================

BEGIN;

-- 1) Role (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prisma') THEN
    CREATE ROLE prisma LOGIN;
  END IF;
END $$;

-- 2) Password — change before running
ALTER ROLE prisma WITH PASSWORD '__PRISMA_PASSWORD__';

-- 3) Required for Gateon API with RLS enabled (see rls-lockdown.sql)
ALTER ROLE prisma BYPASSRLS;

-- 4) Database + schema access
GRANT CONNECT ON DATABASE postgres TO prisma;
GRANT USAGE ON SCHEMA public TO prisma;

-- 5) Runtime (SELECT/INSERT/UPDATE/DELETE) on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO prisma;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prisma;

-- 6) Future tables created by postgres migrations (Prisma migrate)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO prisma;

-- 7) Optional: allow prisma to run `prisma migrate deploy` (DDL)
--    Uncomment if DIRECT_URL also uses prisma (not recommended for first setup).
-- GRANT CREATE ON SCHEMA public TO prisma;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prisma;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prisma;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   GRANT ALL ON TABLES TO prisma;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   GRANT ALL ON SEQUENCES TO prisma;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (run after COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT rolname, rolcanlogin, rolbypassrls
-- FROM pg_roles
-- WHERE rolname = 'prisma';
