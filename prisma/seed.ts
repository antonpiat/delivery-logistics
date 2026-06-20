import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/delivery_logistics';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const company = await prisma.company.upsert({
    where: { id: 'seed-company-1' },
    update: {},
    create: {
      id: 'seed-company-1',
      name: 'Acme Logistics',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@leo.com' },
    update: {},
    create: {
      email: 'admin@leo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@leo.com' },
    update: {},
    create: {
      email: 'driver@leo.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Driver',
      role: Role.DRIVER,
      companyId: company.id,
      driver: {
        create: {
          companyId: company.id,
          phone: '+1234567890',
          vehicleInfo: 'Van - ABC123',
        },
      },
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@leo.com' },
    update: {},
    create: {
      email: 'customer@leo.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Customer',
      role: Role.CUSTOMER,
    },
  });

  console.log('Seed completed:', {
    company: company.name,
    admin: admin.email,
    driver: driverUser.email,
    customer: customer.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
