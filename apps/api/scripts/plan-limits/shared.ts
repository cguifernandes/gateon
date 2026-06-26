import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import {
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
} from '../../src/lib/plan/plan-limits';
import { getMaxStripePaymentGroupsForPlan } from '../../src/lib/plan/stripe-payment-group-limits';
import { getMaxAlertTemplatesForPlan } from '../../src/lib/plan/plan-features';
import type { PlanId } from '../../src/lib/zod/plan-schemas';
import {
  getPlanLimits,
  isTestGroup,
  PLAN_TEST_CONFIG,
  type PlanTestConfig,
  type SupportedTestPlanId,
} from './config';

loadDotenv({ path: resolve(__dirname, '../../.env') });

export function createScriptPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida. Configure apps/api/.env');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const [key, value] = arg.slice(2).split('=');
    flags[key] = value ?? true;
  }

  const planArg =
    typeof flags.plan === 'string' ? flags.plan : process.env.PLAN_TEST_PLAN;
  const planId = (planArg === 'starter' ? 'starter' : 'free') as SupportedTestPlanId;

  const email =
    (typeof flags.email === 'string' ? flags.email : undefined) ??
    positional[0] ??
    process.env.PLAN_TEST_EMAIL?.trim();

  const groupId =
    typeof flags['group-id'] === 'string' ? flags['group-id'] : undefined;

  const planLimits = getPlanLimits(planId);
  const membersTarget =
    typeof flags.members === 'string'
      ? Number.parseInt(flags.members, 10)
      : planLimits.membersPerGroup;

  return {
    planId,
    config: PLAN_TEST_CONFIG[planId],
    email,
    groupId,
    membersTarget: Number.isFinite(membersTarget)
      ? membersTarget
      : planLimits.membersPerGroup,
    dryRun: flags['dry-run'] === true,
    help: flags.help === true,
  };
}

export function printUsage(script: string, planId: SupportedTestPlanId) {
  const limits = getPlanLimits(planId);
  const planLabel = planId === 'free' ? 'gratuito' : 'Starter';

  console.log(`
Uso (a partir de apps/api/):
  npm run ${script} -- --email=seu@email.com

Comandos relacionados:
  npm run plan:users          Lista e-mails cadastrados (local)
  npm run plan:free:fill        Preenche limites do plano free
  npm run plan:starter:fill     Preenche limites do plano starter
  npm run plan:free:status      Relatório free
  npm run plan:starter:status   Relatório starter
  npm run plan:free:reset       Remove dados [FREE-TEST]
  npm run plan:starter:reset    Remove dados [STARTER-TEST]

Opções:
  --email=...       E-mail do usuário (ou PLAN_TEST_EMAIL no .env)
  --plan=free|starter  Plano alvo (scripts plan:* já definem)
  --group-id=...    Grupo alvo para membros (fill, plano free)
  --members=N       Membros ativos por grupo (fill)
  --dry-run         Só mostra o que seria feito

Limites do plano ${planLabel}:
  - ${limits.groups} grupo(s) conectado(s)
  - ${limits.membersPerGroup} membros rastreados por grupo
  - ${limits.stripePaymentGroups} grupo(s) Stripe linkado(s)
  - ${limits.alertTemplates ?? '∞'} modelo(s) de alerta
`);
}

export async function findUserByEmail(prisma: PrismaClient, email: string) {
  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true, email: true, planId: true },
  });

  if (!user) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  return user;
}

export async function collectPlanUsage(
  prisma: PrismaClient,
  userId: string,
  config: PlanTestConfig,
) {
  const groups = await prisma.telegramGroups.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      telegramChatId: true,
      members: {
        where: { leftAt: null },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const templateCount = await prisma.telegramAlertTemplates.count({
    where: { userId },
  });

  const stripeConnections = await prisma.stripeBillingConnections.findMany({
    where: { userId, disconnectedAt: null },
    select: {
      id: true,
      telegramGroupId: true,
      monitoredPlanLabel: true,
      monitoredStripePriceId: true,
    },
  });

  const linkedStripeGroupIds = new Set(
    stripeConnections
      .map((connection) => connection.telegramGroupId)
      .filter((groupId): groupId is string => Boolean(groupId)),
  );

  const testGroups = groups.filter((group) => isTestGroup(config, group));
  const testStripeConnections = stripeConnections.filter(
    (connection) =>
      connection.monitoredStripePriceId?.startsWith(
        config.stripePriceIdPrefix,
      ) ?? false,
  );

  return {
    groups,
    templateCount,
    stripeConnections,
    linkedStripeGroupIds: linkedStripeGroupIds.size,
    testGroups,
    testStripeConnections,
  };
}

export function printPlanReport(input: {
  email: string;
  planId: PlanId;
  config: PlanTestConfig;
  usage: Awaited<ReturnType<typeof collectPlanUsage>>;
}) {
  const { email, planId, config, usage } = input;
  const maxGroups = getMaxGroupsForPlan(planId);
  const maxMembers = getMaxManagedMembersPerGroupForPlan(planId);
  const maxTemplates = getMaxAlertTemplatesForPlan(planId);
  const maxStripeGroups = getMaxStripePaymentGroupsForPlan(planId);

  console.log('\n=== Gateon — uso do plano ===\n');
  console.log(`Usuário: ${email}`);
  console.log(`Plano:   ${planId}`);
  console.log('');
  console.log(
    `Grupos:            ${usage.groups.length}/${maxGroups} ${
      usage.groups.length >= maxGroups ? '(LIMITE)' : ''
    }`,
  );

  for (const group of usage.groups) {
    const activeMembers = group.members.length;
    const marker = isTestGroup(config, group) ? ' [teste]' : '';
    console.log(
      `  - ${group.title ?? group.telegramChatId}${marker}: ${activeMembers}/${maxMembers} membros ativos`,
    );
  }

  console.log(
    `Modelos de alerta: ${usage.templateCount}/${maxTemplates ?? '∞'} ${
      maxTemplates !== null && usage.templateCount >= maxTemplates
        ? '(LIMITE)'
        : ''
    }`,
  );
  console.log(
    `Grupos Stripe link: ${usage.linkedStripeGroupIds}/${maxStripeGroups} ${
      usage.linkedStripeGroupIds >= maxStripeGroups ? '(LIMITE)' : ''
    }`,
  );
  console.log(
    `Grupos de teste:    ${usage.testGroups.length} (${config.groupTitlePrefix})`,
  );

  printPlanChecklist(config.planId);
}

function printPlanChecklist(planId: SupportedTestPlanId) {
  if (planId === 'free') {
    console.log('\n--- O que testar na UI (plano free) ---\n');
    console.log('1. Conectar 2º grupo → bloquear (GROUP_LIMIT_REACHED)');
    console.log('2. Criar 3º modelo de alerta → bloquear');
    console.log('3. Bulk action em 2+ membros → gate de plano');
    console.log('4. Webhook Stripe / checkout bot / alertas Stripe → starter+');
    console.log('5. Card de plano no dashboard → upgrade para /subscription');
    console.log('');
    return;
  }

  console.log('\n--- O que testar na UI (plano starter) ---\n');
  console.log('1. Conectar 4º grupo → bloquear (GROUP_LIMIT_REACHED)');
  console.log('2. Modelos de alerta → ilimitados (criar vários)');
  console.log('3. Bulk action em 2+ membros → permitido');
  console.log('4. Webhook Stripe / checkout bot / alertas Stripe → permitido');
  console.log('5. Linkar 4º grupo Stripe no /start → bloquear');
  console.log('6. Alertas em tópicos de fórum → gate Pro');
  console.log('7. Card de plano → upgrade para Pro em /subscription');
  console.log('');
}
