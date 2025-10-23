// test-setup.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Test setup script to prepare the test environment
 */
export async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.MFA_SERVER_SALT = 'test-salt-for-testing';
  
  // Remove old test database if it exists
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🗑️  Removed old test database');
  }
  
  // Create fresh test database with schema
  try {
    console.log('📦 Generating Prisma Client for tests...');
    execSync('npx prisma generate --schema=./prisma/schema.test.prisma', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'file:./test.db'
      }
    });
    
    console.log('🗄️  Creating test database...');
    execSync('npx prisma db push --skip-generate --schema=./prisma/schema.test.prisma', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'file:./test.db'
      }
    });
    
    console.log('✅ Test database created successfully');
  } catch (error) {
    console.error('❌ Failed to create test database:', error);
    throw error;
  }
}

/**
 * Clean up test environment after tests
 */
export async function teardownTestEnvironment() {
  const testDbPath = path.join(process.cwd(), 'test.db');
  const testDbJournalPath = path.join(process.cwd(), 'test.db-journal');
  
  // Remove test database files
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  if (fs.existsSync(testDbJournalPath)) {
    fs.unlinkSync(testDbJournalPath);
  }
  
  console.log('✅ Test environment cleaned up');
}

// If running directly
if (require.main === module) {
  setupTestEnvironment()
    .then(() => console.log('Test environment ready'))
    .catch(console.error);
}