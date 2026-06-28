import dotenv from 'dotenv';
import prisma from '../lib/prisma';

dotenv.config();

async function main() {
  const roles = ['admin', 'customer'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log('Seeded roles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
