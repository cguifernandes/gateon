import { createScriptPrisma } from './shared';

async function main() {
  const prisma = createScriptPrisma();
  try {
    const users = await prisma.users.findMany({
      select: { email: true, planId: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    console.log(JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
