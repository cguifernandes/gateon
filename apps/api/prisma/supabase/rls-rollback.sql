-- =============================================================================
-- Gateon — Rollback RLS (Supabase)
-- =============================================================================
-- Run only if you need to remove Gateon RLS policies and disable RLS.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  table_name text;
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    FOR table_name IN
      SELECT t.tablename
      FROM pg_tables t
      WHERE t.schemaname = 'public'
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        format('gateon_deny_%s_%s', role_name, table_name),
        table_name
      );
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        format('gateon_tenant_%s', lower(table_name)),
        table_name
      );
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS gateon_tenant_telegram_forum_topics ON public."TelegramForumTopics";
DROP POLICY IF EXISTS gateon_tenant_telegram_group_bot_settings ON public."TelegramGroupBotSettings";
DROP POLICY IF EXISTS gateon_tenant_telegram_group_members ON public."TelegramGroupMembers";
DROP POLICY IF EXISTS gateon_tenant_telegram_alert_targets ON public."TelegramAlertTargets";
DROP POLICY IF EXISTS gateon_tenant_telegram_alert_runs ON public."TelegramAlertRuns";
DROP POLICY IF EXISTS gateon_tenant_telegram_alert_deliveries ON public."TelegramAlertDeliveries";
DROP POLICY IF EXISTS gateon_tenant_stripe_billing_processed_webhook_events ON public."StripeBillingProcessedWebhookEvents";

DROP FUNCTION IF EXISTS public.gateon_owns_connection(text);
DROP FUNCTION IF EXISTS public.gateon_owns_group(text);
DROP FUNCTION IF EXISTS public.gateon_jwt_user_id();

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
      'ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY',
      table_name
    );
  END LOOP;
END $$;

COMMIT;
