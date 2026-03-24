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

async function seedServices() {
  const services = [
    { name: 'Personal Care', slug: 'personal-care', category: 'Care', description: 'Bathing, grooming, and hygiene assistance.', isAdditional: false },
    { name: 'Meal Preparation', slug: 'meal-preparation', category: 'Household', description: 'Planning and preparing nutritious meals.', isAdditional: false },
    { name: 'Light Housekeeping', slug: 'light-housekeeping', category: 'Household', description: 'Tidying, vacuuming, laundry and general upkeep.', isAdditional: false },
    { name: 'Medication Reminders', slug: 'medication-reminders', category: 'Care', description: 'Timely reminders for scheduled medications.', isAdditional: false },
    { name: 'Companionship', slug: 'companionship', category: 'Wellness', description: 'Social engagement, conversation, and outings.', isAdditional: false },
    { name: 'Night Care', slug: 'night-care', category: 'Care', description: 'Overnight supervision and assistance.', isAdditional: true },
    { name: 'Transportation', slug: 'transportation', category: 'Wellness', description: 'Escort to appointments and errands.', isAdditional: true }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: { ...service, isActive: true }
    });
  }
  return prisma.service.findMany({ where: { isActive: true } });
}

async function seedPackages(allServices) {
  const bySlug = (slug) => allServices.find((s) => s.slug === slug);

  const packages = [
    {
      name: 'Basic Care',
      slug: 'basic',
      description: 'Foundational daily assistance for independent seniors who need light support.',
      priceMin: 50,
      priceMax: 80,
      displayOrder: 1,
      serviceSlug: ['personal-care', 'meal-preparation', 'medication-reminders']
    },
    {
      name: 'Standard Care',
      slug: 'standard',
      description: 'Comprehensive care covering daily living and household needs.',
      priceMin: 90,
      priceMax: 130,
      displayOrder: 2,
      serviceSlug: ['personal-care', 'meal-preparation', 'light-housekeeping', 'medication-reminders', 'companionship']
    },
    {
      name: 'Premium Care',
      slug: 'premium',
      description: 'Full-service care with all standard services plus night care and transportation.',
      priceMin: 150,
      priceMax: 220,
      displayOrder: 3,
      serviceSlug: ['personal-care', 'meal-preparation', 'light-housekeeping', 'medication-reminders', 'companionship', 'night-care', 'transportation']
    }
  ];

  for (const { serviceSlug, ...pkgData } of packages) {
    const pkg = await prisma.package.upsert({
      where: { slug: pkgData.slug },
      update: {},
      create: { ...pkgData, isActive: true }
    });

    for (const slug of serviceSlug) {
      const service = bySlug(slug);
      if (service) {
        await prisma.packageService.upsert({
          where: { packageId_serviceId: { packageId: pkg.id, serviceId: service.id } },
          update: {},
          create: { packageId: pkg.id, serviceId: service.id }
        });
      }
    }
  }
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
  const services = await seedServices();
  await seedPackages(services);
  console.log('Seed completed: users, packages, and services are ready.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
