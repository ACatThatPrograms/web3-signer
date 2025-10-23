import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.auth.deleteMany();
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();

  // Create test wallets
  const testWallet1 = new ethers.Wallet('0x0123456789012345678901234567890123456789012345678901234567890123');
  const testWallet2 = new ethers.Wallet('0x0123456789012345678901234567890123456789012345678901234567890124');

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      address: testWallet1.address,
      role: 'user',
      auth: {
        create: {
          mfa: false,
          awaitingMfa: false
        }
      }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      address: testWallet2.address,
      role: 'user',
      auth: {
        create: {
          mfa: true,
          awaitingMfa: false
        }
      }
    }
  });

  // Create sample messages for user1
  const messages = [
    'Hello Web3!',
    'Sign this message',
    'Verify my identity',
    'Test message 1',
    'Test message 2'
  ];

  for (const msg of messages) {
    const signature = await testWallet1.signMessage(msg);
    await prisma.message.create({
      data: {
        userId: user1.id,
        message: msg,
        signature,
        signer: testWallet1.address,
        valid: true
      }
    });
  }

  // Create sample messages for user2
  const messages2 = [
    'User 2 message',
    'Another signed message'
  ];

  for (const msg of messages2) {
    const signature = await testWallet2.signMessage(msg);
    await prisma.message.create({
      data: {
        userId: user2.id,
        message: msg,
        signature,
        signer: testWallet2.address,
        valid: true
      }
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('Test wallets created:');
  console.log(`User 1 (No MFA): ${testWallet1.address}`);
  console.log(`  Private Key: 0x0123456789012345678901234567890123456789012345678901234567890123`);
  console.log(`User 2 (MFA Enabled): ${testWallet2.address}`);
  console.log(`  Private Key: 0x0123456789012345678901234567890123456789012345678901234567890124`);
  console.log('');
  console.log('Use these private keys in your frontend for testing.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });