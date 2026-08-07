// Seeds the first admin user from ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD in .env.
// Run with: npm run db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Set ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD in .env before seeding.'
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { username, passwordHash } });
  console.log(`Created admin user "${username}". Log in at /admin/login.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
