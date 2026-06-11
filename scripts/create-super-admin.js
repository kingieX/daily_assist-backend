require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Role, UserStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function getArgValue(name) {
  const prefix = `--${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (inlineArg) return inlineArg.slice(prefix.length);

  const argIndex = process.argv.indexOf(`--${name}`);
  if (argIndex >= 0) return process.argv[argIndex + 1];

  return undefined;
}

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

function getRequiredConfig() {
  const email = getArgValue('email') || process.env.SUPER_ADMIN_EMAIL;
  const password = getArgValue('password') || process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required. ' +
        'Example: SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD="StrongPassword123!" npm run create:super-admin'
    );
  }

  if (password.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  return {
    email: normalizeEmail(email),
    password
  };
}

async function main() {
  const { email, password } = getRequiredConfig();
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 12));

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE
    },
    create: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      updatedAt: true
    }
  });

  console.log('Super admin user is ready.');
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    updatedAt: user.updatedAt.toISOString()
  });
}

main()
  .catch((error) => {
    console.error('Failed to create super admin user:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
