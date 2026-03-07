import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const demoHash = await bcrypt.hash('Demo1234!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@remotecare.dev' },
    update: {},
    create: {
      email: 'admin@remotecare.dev',
      password_hash: adminHash,
      name: '系統管理員',
      role: 'admin',
      timezone: 'Asia/Taipei',
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@remotecare.dev' },
    update: {},
    create: {
      email: 'demo@remotecare.dev',
      password_hash: demoHash,
      name: '王小明',
      phone: '0912345678',
      role: 'caregiver',
      timezone: 'Asia/Taipei',
    },
  });

  const existingRecipient = await prisma.recipient.findFirst({
    where: { caregiver_id: demoUser.id, name: '王奶奶', deleted_at: null },
  });

  if (!existingRecipient) {
    await prisma.recipient.create({
      data: {
        caregiver_id: demoUser.id,
        name: '王奶奶',
        date_of_birth: new Date('1945-03-15'),
        gender: 'female',
        medical_tags: ['高血壓', '糖尿病'],
        emergency_contact_name: '王小明',
        emergency_contact_phone: '0912345678',
        notes: '行動不便，需輪椅',
      },
    });
  }

  console.log('Seed completed: admin + demo user + demo recipient');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
