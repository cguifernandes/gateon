-- =============================================================================
-- Gateon — RLS tenant policies (OPTIONAL / FUTURE)
-- =============================================================================
--
-- Only use if you expose Supabase PostgREST to the browser with Supabase Auth
-- AND store Gateon user id in JWT custom claim: gateon_user_id
--
-- Today Gateon uses NestJS cookie auth — run rls-lockdown.sql instead.
-- =============================================================================

BEGIN;

-- JWT claim must be set when issuing tokens (custom auth hook / edge function).
CREATE OR REPLACE FUNCTION public.gateon_jwt_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.jwt.claim.gateon_user_id', true), '');
$$;

REVOKE ALL ON FUNCTION public.gateon_jwt_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gateon_jwt_user_id() TO authenticated, service_role;

-- Drop deny-all for authenticated so tenant policies can apply (keep anon denied).
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
      'DROP POLICY IF EXISTS %I ON public.%I',
      format('gateon_deny_authenticated_%s', table_name),
      table_name
    );
  END LOOP;
END $$;

-- Helper: group owned by current JWT user
CREATE OR REPLACE FUNCTION public.gateon_owns_group(group_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "TelegramGroups" g
    WHERE g.id = group_id
      AND g."userId" = public.gateon_jwt_user_id()
  );
$$;

REVOKE ALL ON FUNCTION public.gateon_owns_group(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gateon_owns_group(text) TO authenticated, service_role;

-- Helper: billing connection owned by current JWT user
CREATE OR REPLACE FUNCTION public.gateon_owns_connection(connection_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "StripeBillingConnections" c
    WHERE c.id = connection_id
      AND c."userId" = public.gateon_jwt_user_id()
  );
$$;

REVOKE ALL ON FUNCTION public.gateon_owns_connection(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gateon_owns_connection(text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Direct userId tables
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tables_with_user_id text[] := ARRAY[
    'Users',
    'Accounts',
    'Sessions',
    'PasswordResetTokens',
    'TelegramGroupConnectionIntents',
    'TelegramGroups',
    'TelegramAlerts',
    'TelegramAlertTemplates',
    'StripeBillingConnections',
    'StripeBillingCustomers',
    'StripeBillingSubscriptions',
    'StripeBillingPayments',
    'StripeBillingAuditLogs',
    'TelegramUserSettings',
    'StripeTelegramCheckoutSessions',
    'StripeTelegramMemberLinks'
  ];
  t text;
  p text;
BEGIN
  FOREACH t IN ARRAY tables_with_user_id
  LOOP
    p := format('gateon_tenant_%s', lower(t));

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);

    IF t = 'Users' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (id = public.gateon_jwt_user_id()) WITH CHECK (id = public.gateon_jwt_user_id())',
        p,
        t
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ("userId" = public.gateon_jwt_user_id()) WITH CHECK ("userId" = public.gateon_jwt_user_id())',
        p,
        t
      );
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Child tables (ownership via parent)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS gateon_tenant_telegram_forum_topics ON public."TelegramForumTopics";
CREATE POLICY gateon_tenant_telegram_forum_topics ON public."TelegramForumTopics"
  FOR ALL TO authenticated
  USING (public.gateon_owns_group("telegramGroupId"))
  WITH CHECK (public.gateon_owns_group("telegramGroupId"));

DROP POLICY IF EXISTS gateon_tenant_telegram_group_bot_settings ON public."TelegramGroupBotSettings";
CREATE POLICY gateon_tenant_telegram_group_bot_settings ON public."TelegramGroupBotSettings"
  FOR ALL TO authenticated
  USING (public.gateon_owns_group("telegramGroupId"))
  WITH CHECK (public.gateon_owns_group("telegramGroupId"));

DROP POLICY IF EXISTS gateon_tenant_telegram_group_members ON public."TelegramGroupMembers";
CREATE POLICY gateon_tenant_telegram_group_members ON public."TelegramGroupMembers"
  FOR ALL TO authenticated
  USING (public.gateon_owns_group("telegramGroupId"))
  WITH CHECK (public.gateon_owns_group("telegramGroupId"));

DROP POLICY IF EXISTS gateon_tenant_telegram_alert_targets ON public."TelegramAlertTargets";
CREATE POLICY gateon_tenant_telegram_alert_targets ON public."TelegramAlertTargets"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TelegramAlerts" a
      WHERE a.id = "alertId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TelegramAlerts" a
      WHERE a.id = "alertId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  );

DROP POLICY IF EXISTS gateon_tenant_telegram_alert_runs ON public."TelegramAlertRuns";
CREATE POLICY gateon_tenant_telegram_alert_runs ON public."TelegramAlertRuns"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TelegramAlerts" a
      WHERE a.id = "alertId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TelegramAlerts" a
      WHERE a.id = "alertId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  );

DROP POLICY IF EXISTS gateon_tenant_telegram_alert_deliveries ON public."TelegramAlertDeliveries";
CREATE POLICY gateon_tenant_telegram_alert_deliveries ON public."TelegramAlertDeliveries"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "TelegramAlertRuns" r
      INNER JOIN "TelegramAlerts" a ON a.id = r."alertId"
      WHERE r.id = "runId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "TelegramAlertRuns" r
      INNER JOIN "TelegramAlerts" a ON a.id = r."alertId"
      WHERE r.id = "runId"
        AND a."userId" = public.gateon_jwt_user_id()
    )
  );

DROP POLICY IF EXISTS gateon_tenant_stripe_billing_processed_webhook_events ON public."StripeBillingProcessedWebhookEvents";
CREATE POLICY gateon_tenant_stripe_billing_processed_webhook_events ON public."StripeBillingProcessedWebhookEvents"
  FOR ALL TO authenticated
  USING (public.gateon_owns_connection("connectionId"))
  WITH CHECK (public.gateon_owns_connection("connectionId"));

COMMIT;
