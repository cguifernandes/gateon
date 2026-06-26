-- =============================================================================
-- Gateon — Harden public RPC / SECURITY DEFINER functions (Supabase Security Advisor)
-- =============================================================================
--
-- Run in: Supabase Dashboard → SQL → New query
--
-- Fixes warnings like:
--   "rls_auto_enable() can be executed by the anon role as SECURITY DEFINER"
--
-- Gateon does NOT use Supabase Data API from the browser — safe to block anon/authenticated.
-- =============================================================================

BEGIN;

-- 1) Revoke known Supabase helper (signature may vary — ignore if missing)
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.signature
    );
  END LOOP;
END $$;

-- 2) Block all public functions for anon/authenticated
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3) Future functions — do not auto-expose via Data API
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (run after COMMIT) — should return 0 rows:
-- -----------------------------------------------------------------------------
-- SELECT p.proname AS function_name,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.prosecdef AS security_definer
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND has_function_privilege('anon', p.oid, 'EXECUTE')
-- ORDER BY 1;
