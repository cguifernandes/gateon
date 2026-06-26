import { resolveTestGroupTargets } from './config';
import {
  createScriptPrisma,
  findUserByEmail,
  parseCliArgs,
  printUsage,
} from './shared';

async function main() {
  const args = parseCliArgs();

  if (args.help || !args.email) {
    printUsage(`plan:${args.planId}:reset`, args.planId);
    process.exit(args.email ? 0 : 1);
  }

  const prisma = createScriptPrisma();
  const targets = resolveTestGroupTargets(args.config);
  const testChatIds = targets.map((target) => target.telegramChatId);

  try {
    const user = await findUserByEmail(prisma, args.email);

    const testGroups = await prisma.telegramGroups.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { startsWith: args.config.groupTitlePrefix } },
          { telegramChatId: { in: testChatIds } },
        ],
      },
      select: { id: true, title: true },
    });

    const memberCount = await prisma.telegramGroupMembers.count({
      where: {
        telegramUserId: { startsWith: args.config.memberPrefix },
        group: { userId: user.id },
      },
    });

    const templateCount = await prisma.telegramAlertTemplates.count({
      where: {
        userId: user.id,
        name: { startsWith: args.config.templatePrefix },
      },
    });

    const stripeCount = await prisma.stripeBillingConnections.count({
      where: {
        userId: user.id,
        monitoredStripePriceId: { startsWith: args.config.stripePriceIdPrefix },
      },
    });

    if (args.dryRun) {
      console.log('[dry-run] Removeria:');
      console.log(`  - ${testGroups.length} grupo(s) ${args.config.groupTitlePrefix}`);
      console.log(`  - ${memberCount} membro(s) de teste`);
      console.log(`  - ${templateCount} modelo(s) de teste`);
      console.log(`  - ${stripeCount} conexão(ões) Stripe de teste`);
      return;
    }

    await prisma.stripeBillingConnections.deleteMany({
      where: {
        userId: user.id,
        monitoredStripePriceId: { startsWith: args.config.stripePriceIdPrefix },
      },
    });

    const deletedMembers = await prisma.telegramGroupMembers.deleteMany({
      where: {
        telegramUserId: { startsWith: args.config.memberPrefix },
        group: { userId: user.id },
      },
    });

    const deletedTemplates = await prisma.telegramAlertTemplates.deleteMany({
      where: {
        userId: user.id,
        name: { startsWith: args.config.templatePrefix },
      },
    });

    if (testGroups.length > 0) {
      await prisma.telegramGroups.deleteMany({
        where: { id: { in: testGroups.map((group) => group.id) } },
      });
    }

    console.log('\nDados de teste removidos:');
    console.log(`  - Grupos ${args.config.groupTitlePrefix}: ${testGroups.length}`);
    console.log(`  - Membros ${args.config.memberPrefix}*: ${deletedMembers.count}`);
    console.log(`  - Modelos ${args.config.templatePrefix}*: ${deletedTemplates.count}`);
    console.log(`  - Stripe ${args.config.stripePriceIdPrefix}*: ${stripeCount}`);
    console.log(`\nRode npm run plan:${args.planId}:status para conferir.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
