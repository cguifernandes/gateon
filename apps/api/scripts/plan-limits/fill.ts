import { StripeBillingConnectionStatus } from '@prisma/client';
import { encryptSecretValue } from '../../src/utils/utils';
import {
  getPlanLimits,
  resolveTestGroupTargets,
  type PlanTestConfig,
} from './config';
import {
  collectPlanUsage,
  createScriptPrisma,
  findUserByEmail,
  parseCliArgs,
  printPlanReport,
  printUsage,
} from './shared';

const TEST_STRIPE_API_KEY = 'sk_test_plan_limits_script_dummy';

async function ensurePlan(
  prisma: ReturnType<typeof createScriptPrisma>,
  userId: string,
  config: PlanTestConfig,
  dryRun: boolean,
) {
  if (dryRun) {
    console.log(`[dry-run] Garantir planId=${config.planId}`);
    return;
  }

  await prisma.users.update({
    where: { id: userId },
    data: { planId: config.planId },
  });
  console.log(`Plano definido como ${config.planId}.`);
}

async function ensureTestGroups(
  prisma: ReturnType<typeof createScriptPrisma>,
  userId: string,
  config: PlanTestConfig,
  usage: Awaited<ReturnType<typeof collectPlanUsage>>,
  dryRun: boolean,
) {
  const limits = getPlanLimits(config.planId);
  const targets = resolveTestGroupTargets(config);
  const createdIds: string[] = [];

  for (const target of targets) {
    const existing = usage.groups.find(
      (group) => group.telegramChatId === target.telegramChatId,
    );
    if (existing) {
      console.log(`Grupo de teste já existe: ${existing.title} (${existing.id})`);
      createdIds.push(existing.id);
      continue;
    }

    const projectedTotal = usage.groups.length + createdIds.length;
    if (projectedTotal >= limits.groups) {
      console.log(
        `Limite de ${limits.groups} grupo(s) atingido — pulando ${target.title}. ` +
          `Remova grupos extras ou rode plan:free:reset se ainda houver [FREE-TEST].`,
      );
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Criar grupo ${target.title}`);
      createdIds.push(`dry-run-group-${target.index}`);
      continue;
    }

    const group = await prisma.telegramGroups.create({
      data: {
        userId,
        telegramChatId: target.telegramChatId,
        title: target.title,
        type: 'supergroup',
        botStatus: 'administrator',
        settings: {
          create: {
            enabled: true,
            notifyPermissionLoss: true,
          },
        },
      },
      select: { id: true, title: true },
    });

    console.log(`Grupo de teste criado: ${group.title} (${group.id})`);
    createdIds.push(group.id);
  }

  return createdIds;
}

async function ensureMembersForGroup(
  prisma: ReturnType<typeof createScriptPrisma>,
  groupId: string,
  groupIndex: number,
  memberPrefix: string,
  targetCount: number,
  dryRun: boolean,
) {
  const activeCount = await prisma.telegramGroupMembers.count({
    where: { telegramGroupId: groupId, leftAt: null },
  });

  const missing = Math.max(0, targetCount - activeCount);
  if (missing === 0) {
    console.log(`  Membros grupo ${groupIndex}: ${activeCount}/${targetCount} (ok)`);
    return;
  }

  const rows = Array.from({ length: missing }, (_, index) => {
    const sequence = String(activeCount + index + 1).padStart(5, '0');
    return {
      telegramGroupId: groupId,
      telegramUserId: `${memberPrefix}g${groupIndex}-${sequence}`,
      firstName: 'Plan',
      lastName: `Test G${groupIndex} ${sequence}`,
    };
  });

  if (dryRun) {
    console.log(
      `  [dry-run] Criar ${missing} membros no grupo ${groupIndex}`,
    );
    return;
  }

  await prisma.telegramGroupMembers.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(
    `  Membros grupo ${groupIndex}: +${missing} (total alvo ${targetCount})`,
  );
}

async function ensureMembers(
  prisma: ReturnType<typeof createScriptPrisma>,
  groupIds: string[],
  config: PlanTestConfig,
  membersTarget: number,
  dryRun: boolean,
) {
  const limits = getPlanLimits(config.planId);
  const perGroup = Math.min(membersTarget, limits.membersPerGroup);

  console.log(`Preenchendo até ${perGroup} membros por grupo...`);
  for (const [offset, groupId] of groupIds.entries()) {
    if (groupId.startsWith('dry-run')) {
      continue;
    }
    await ensureMembersForGroup(
      prisma,
      groupId,
      offset + 1,
      config.memberPrefix,
      perGroup,
      dryRun,
    );
  }
}

async function ensureTemplates(
  prisma: ReturnType<typeof createScriptPrisma>,
  userId: string,
  config: PlanTestConfig,
  dryRun: boolean,
) {
  const limits = getPlanLimits(config.planId);
  if (limits.alertTemplates === null) {
    console.log('Modelos: ilimitados no starter (não preenche automaticamente).');
    return;
  }

  const targetCount = limits.alertTemplates;
  const currentCount = await prisma.telegramAlertTemplates.count({
    where: { userId },
  });

  const needed = Math.max(0, targetCount - currentCount);
  if (needed === 0) {
    console.log(`Modelos: ${currentCount}/${targetCount} (ok)`);
    return;
  }

  const existingTest = await prisma.telegramAlertTemplates.findMany({
    where: { userId, name: { startsWith: config.templatePrefix } },
    select: { name: true },
  });
  const existingNames = new Set(existingTest.map((item) => item.name));

  const toCreate: Array<{
    userId: string;
    name: string;
    category: string;
    content: { body: string };
  }> = [];

  for (let index = 1; toCreate.length < needed; index += 1) {
    const name = `${config.templatePrefix}Template ${index}`;
    if (!existingNames.has(name)) {
      toCreate.push({
        userId,
        name,
        category: 'test',
        content: {
          body: `Modelo de teste ${index} para limite do plano ${config.planId}.`,
        },
      });
    }
  }

  if (dryRun) {
    console.log(`[dry-run] Criar ${toCreate.length} modelo(s) de alerta`);
    return;
  }

  for (const template of toCreate) {
    await prisma.telegramAlertTemplates.create({ data: template });
  }

  console.log(
    `Modelos: +${toCreate.length} (total ${currentCount + toCreate.length}/${targetCount})`,
  );
}

async function ensureStripeLinks(
  prisma: ReturnType<typeof createScriptPrisma>,
  userId: string,
  config: PlanTestConfig,
  groupIds: string[],
  usage: Awaited<ReturnType<typeof collectPlanUsage>>,
  dryRun: boolean,
) {
  const limits = getPlanLimits(config.planId);
  if (limits.stripePaymentGroups <= 0) {
    return;
  }

  const linkedGroupIds = new Set(
    usage.stripeConnections
      .map((connection) => connection.telegramGroupId)
      .filter((groupId): groupId is string => Boolean(groupId)),
  );

  const groupsToLink = groupIds
    .filter((id) => !id.startsWith('dry-run'))
    .slice(0, limits.stripePaymentGroups);

  let created = 0;
  for (const [offset, groupId] of groupsToLink.entries()) {
    if (linkedGroupIds.has(groupId)) {
      console.log(`Stripe link grupo ${offset + 1}: já vinculado`);
      continue;
    }

    const priceId = `${config.stripePriceIdPrefix}${offset + 1}`;
    const existingConnection = usage.stripeConnections.find(
      (connection) => connection.monitoredStripePriceId === priceId,
    );
    if (existingConnection) {
      if (dryRun) {
        console.log(`[dry-run] Atualizar link Stripe ${priceId} → grupo ${groupId}`);
        continue;
      }
      await prisma.stripeBillingConnections.update({
        where: { id: existingConnection.id },
        data: { telegramGroupId: groupId },
      });
      console.log(`Stripe link ${priceId} atualizado para grupo ${offset + 1}`);
      created += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Criar conexão Stripe teste ${priceId}`);
      continue;
    }

    await prisma.stripeBillingConnections.create({
      data: {
        userId,
        stripeAccountId: `acct_test_${config.planId}_${offset + 1}`,
        encryptedApiKey: encryptSecretValue(TEST_STRIPE_API_KEY),
        apiKeyLast4: TEST_STRIPE_API_KEY.slice(-4),
        status: StripeBillingConnectionStatus.CONNECTED,
        consentAcceptedAt: new Date(),
        monitoredStripePriceId: priceId,
        monitoredStripeProductId: `prod_test_${config.planId}_${offset + 1}`,
        monitoredPlanLabel: `${config.stripePlanLabelPrefix} Plano ${offset + 1}`,
        telegramGroupId: groupId,
      },
    });
    console.log(`Stripe link criado: ${priceId} → grupo ${offset + 1}`);
    created += 1;
  }

  if (created === 0 && !dryRun) {
    console.log('Stripe links: já no limite ou vinculados.');
  }
}

async function main() {
  const args = parseCliArgs();

  if (args.help || !args.email) {
    printUsage(`plan:${args.planId}:fill`, args.planId);
    process.exit(args.email ? 0 : 1);
  }

  const prisma = createScriptPrisma();

  try {
    const user = await findUserByEmail(prisma, args.email);
    let usage = await collectPlanUsage(prisma, user.id, args.config);

    console.log(
      `\nPreparando limites do plano ${args.planId} para ${user.email}...\n`,
    );

    await ensurePlan(prisma, user.id, args.config, args.dryRun);

    let groupIds: string[];
    if (args.groupId) {
      groupIds = [args.groupId];
    } else {
      groupIds = await ensureTestGroups(
        prisma,
        user.id,
        args.config,
        usage,
        args.dryRun,
      );
    }

    if (!args.dryRun && !args.groupId) {
      usage = await collectPlanUsage(prisma, user.id, args.config);
      groupIds = usage.groups.map((group) => group.id);
    }

    await ensureMembers(prisma, groupIds, args.config, args.membersTarget, args.dryRun);
    await ensureTemplates(prisma, user.id, args.config, args.dryRun);
    await ensureStripeLinks(
      prisma,
      user.id,
      args.config,
      groupIds,
      usage,
      args.dryRun,
    );

    if (!args.dryRun) {
      usage = await collectPlanUsage(prisma, user.id, args.config);
      printPlanReport({
        email: user.email,
        planId: args.config.planId,
        config: args.config,
        usage,
      });
    } else {
      console.log('\n[dry-run] Nenhuma alteração persistida.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
