import {
  collectPlanUsage,
  createScriptPrisma,
  findUserByEmail,
  parseCliArgs,
  printPlanReport,
  printUsage,
} from './shared';
import type { PlanId } from '../../src/lib/zod/plan-schemas';

async function main() {
  const args = parseCliArgs();

  if (args.help || !args.email) {
    printUsage(`plan:${args.planId}:status`, args.planId);
    process.exit(args.email ? 0 : 1);
  }

  const prisma = createScriptPrisma();

  try {
    const user = await findUserByEmail(prisma, args.email);
    const usage = await collectPlanUsage(prisma, user.id, args.config);
    printPlanReport({
      email: user.email,
      planId: user.planId as PlanId,
      config: args.config,
      usage,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
