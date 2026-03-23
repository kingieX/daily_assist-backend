require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Role, UserStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedUser(email, password, role) {
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 12));
  await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { passwordHash, role, status: UserStatus.ACTIVE },
    create: {
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      status: UserStatus.ACTIVE
    }
  });
}

async function main() {
  await seedUser(
    process.env.SEED_ADMIN_EMAIL || 'admin@dailyassist.local',
    process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    Role.ADMIN
  );
  await seedUser(
    process.env.SEED_STAFF_EMAIL || 'staff@dailyassist.local',
    process.env.SEED_STAFF_PASSWORD || 'Staff@12345',
    Role.STAFF
  );
  console.log('Seed completed: admin and staff accounts are ready.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
