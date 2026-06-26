-- =============================================================================
-- Gateon — Fix _prisma_migrations RLS (Security Advisor: "RLS enabled, no policy")
-- =============================================================================
--
-- Prisma internal table — not exposed via Gateon app.
-- Supabase rls_auto_enable() may enable RLS without policies on new tables.
--
-- Run in: Supabase Dashboard → SQL → New query
-- =============================================================================

BEGIN;

-- Option A (recommended): internal infra table — disable RLS
ALTER TABLE public."_prisma_migrations" DISABLE ROW LEVEL SECURITY;

-- Option B: keep RLS + explicit deny (uncomment if you prefer RLS on all tables)
-- ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS gateon_deny_anon__prisma_migrations ON public."_prisma_migrations";
-- DROP POLICY IF EXISTS gateon_deny_authenticated__prisma_migrations ON public."_prisma_migrations";
-- CREATE POLICY gateon_deny_anon__prisma_migrations ON public."_prisma_migrations"
--   AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
-- CREATE POLICY gateon_deny_authenticated__prisma_migrations ON public."_prisma_migrations"
--   AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMIT;

-- Verify:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = '_prisma_migrations';
