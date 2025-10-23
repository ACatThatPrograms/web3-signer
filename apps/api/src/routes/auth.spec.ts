import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import authRouter from './auth';

// Test wallet for signing
const testWallet = ethers.Wallet.createRandom();
const testAddress = testWallet.address.toLowerCase();

// Another wallet for testing different users
const otherWallet = ethers.Wallet.createRandom();
const otherAddress = otherWallet.address;

// Helper to create signed message
async function signMessage(message: string, wallet = testWallet) {
  return await wallet.signMessage(message);
}

// Helper to generate MFA secret (matching the implementation)
function generateMFASecret(address: string): string {
  const salt = process.env.MFA_SERVER_SALT || 'default-salt-change-this';
  return crypto
    .createHash('sha256')
    .update(`${address}:${salt}`)
    .digest('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
}

describe('Auth Routes', () => {
  let app: Express;
  let prisma: PrismaClient;
  let agent: any; // Using any to avoid supertest type conflicts

  beforeAll(async () => {
    // Set up test database
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.MFA_SERVER_SALT = 'test-salt';
    
    prisma = new PrismaClient();
    
    // Run migrations or push schema for test database
    // You might need to run: npx prisma db push --force-reset
    
    // Set up Express app with session
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // For testing
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
      }
    }));
    
    // The actual auth middleware will be used by the router
    app.use('/auth', authRouter);
    
    // Create a persistent agent for cookie support
    agent = request.agent(app);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.message.deleteMany();
    await prisma.auth.deleteMany();
    await prisma.user.deleteMany();
    await prisma.session.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth - Login', () => {
    it('should successfully login with valid signature', async () => {
      const message = 'login';
      const signature = await signMessage(message);

      const response = await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        mfa: false,
        user: {
          address: testAddress,
          role: 'user'
        }
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.messages).toEqual([]);
    });

    it('should reject login with invalid signature', async () => {
      const response = await agent
        .post('/auth')
        .send({
          message: 'login',
          signature: '0xinvalidsignature',
          address: testAddress
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid signature',
        status: 401,
        success: false
      });
    });

    it('should reject login with wrong message', async () => {
      const message = 'notlogin';
      const signature = await signMessage(message);

      const response = await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid login message',
        status: 400,
        success: false
      });
    });

    it('should reject login with mismatched address', async () => {
      const message = 'login';
      const signature = await signMessage(message); // Using default testWallet

      const response = await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: otherAddress // Different address than signer
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid signature',
        status: 401,
        success: false
      });
    });

    it('should return existing user with messages on login', async () => {
      // Create user with messages
      const user = await prisma.user.create({
        data: {
          address: testAddress,
          auth: {
            create: {
              mfa: false,
              awaitingMfa: false
            }
          },
          messages: {
            create: [
              {
                message: 'Test message 1',
                signature: 'sig1',
                signer: testAddress,
                valid: true
              },
              {
                message: 'Test message 2',
                signature: 'sig2',
                signer: testAddress,
                valid: true
              }
            ]
          }
        }
      });

      const message = 'login';
      const signature = await signMessage(message);

      const response = await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].message).toBe('Test message 1'); // Actually first in array
      });

    it('should require MFA if enabled for user', async () => {
      // Create user with MFA enabled
      await prisma.user.create({
        data: {
          address: testAddress,
          auth: {
            create: {
              mfa: true,
              awaitingMfa: false
            }
          }
        }
      });

      const message = 'login';
      const signature = await signMessage(message);

      const response = await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        mfa: true
      });
      expect(response.body.mfa_bonus_phrase).toBeDefined();
      expect(response.body.mfa_bonus_phrase).toHaveLength(32);
      expect(response.body.user).toBeUndefined(); // Not fully authenticated yet
    });

    it('should handle validation errors', async () => {
      const response = await agent
        .post('/auth')
        .send({
          message: 'login'
          // Missing signature and address
        });

      expect(response.status).toBe(500); // Zod validation will throw
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth - Get current user', () => {
    it('should return user info when authenticated', async () => {
      // First login
      const message = 'login';
      const signature = await signMessage(message);

      await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      // The agent maintains cookies automatically
      const response = await agent
        .get('/auth');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        user: {
          address: testAddress,
          role: 'user',
          mfa: false
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication required',
        status: 401,
        success: false
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout', async () => {
      // First login
      const message = 'login';
      const signature = await signMessage(message);

      await agent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      // Then logout
      const response = await agent
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      });

      // Verify session is destroyed
      const authCheckResponse = await agent
        .get('/auth');
      
      expect(authCheckResponse.status).toBe(401);
    });
  });

  describe('MFA Setup Flow', () => {
    let userId: number;
    let authenticatedAgent: any;

    beforeEach(async () => {
      // Create a user and login
      const user = await prisma.user.create({
        data: {
          address: testAddress,
          auth: {
            create: {
              mfa: false,
              awaitingMfa: false
            }
          }
        }
      });
      userId = user.id;

      const message = 'login';
      const signature = await signMessage(message);

      // Create a new agent for each test
      authenticatedAgent = request.agent(app);
      
      await authenticatedAgent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });
    });

    describe('POST /auth/mfa/initialize', () => {
      it('should initialize MFA setup with valid signature', async () => {
        const message = 'enableMFA';
        const signature = await signMessage(message);

        const response = await authenticatedAgent
          .post('/auth/mfa/initialize')
          .send({
            message,
            signature
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true
        });
        expect(response.body.qrCode).toBeDefined();
        expect(response.body.qrCode).toContain('data:image/png;base64');
        expect(response.body.secret).toBeDefined();

        // Verify user auth was updated
        const updatedUser = await prisma.auth.findUnique({
          where: { userId }
        });
        expect(updatedUser?.awaitingMfa).toBe(true);
      });

      it('should reject with invalid message', async () => {
        const message = 'wrongMessage';
        const signature = await signMessage(message);

        const response = await authenticatedAgent
          .post('/auth/mfa/initialize')
          .send({
            message,
            signature
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          error: 'Invalid MFA enablement message',
          status: 400,
          success: false
        });
      });

      it('should reject with invalid signature', async () => {
        const response = await authenticatedAgent
          .post('/auth/mfa/initialize')
          .send({
            message: 'enableMFA',
            signature: '0xinvalid'
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'Invalid signature',
          status: 401,
          success: false
        });
      });

      it('should reject when not authenticated', async () => {
        const message = 'enableMFA';
        const signature = await signMessage(message);

        const response = await request(app)
          .post('/auth/mfa/initialize')
          .send({
            message,
            signature
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'Authentication required',
          status: 401,
          success: false
        });
      });
    });

    describe('POST /auth/mfa/verify', () => {
      beforeEach(async () => {
        // Set user as awaiting MFA
        await prisma.auth.update({
          where: { userId },
          data: { awaitingMfa: true }
        });
      });

      it('should enable MFA with valid code', async () => {
        const secret = generateMFASecret(testAddress);
        authenticator.options = { window: 2 };
        const validCode = authenticator.generate(secret);

        const response = await authenticatedAgent
          .post('/auth/mfa/verify')
          .send({
            mfa_code: validCode
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: 'MFA enabled successfully'
        });

        // Verify MFA was enabled
        const updatedAuth = await prisma.auth.findUnique({
          where: { userId }
        });
        expect(updatedAuth?.mfa).toBe(true);
        expect(updatedAuth?.awaitingMfa).toBe(false);
      });

      it('should reject invalid MFA code', async () => {
        const response = await authenticatedAgent
          .post('/auth/mfa/verify')
          .send({
            mfa_code: '000000'
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'Invalid MFA code',
          status: 401,
          success: false
        });
      });

      it('should reject if not awaiting MFA', async () => {
        await prisma.auth.update({
          where: { userId },
          data: { awaitingMfa: false }
        });

        const response = await authenticatedAgent
          .post('/auth/mfa/verify')
          .send({
            mfa_code: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          error: 'MFA setup not initiated',
          status: 400,
          success: false
        });
      });

      it('should reject when not authenticated', async () => {
        const response = await request(app)
          .post('/auth/mfa/verify')
          .send({
            mfa_code: '123456'
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'Authentication required',
          status: 401,
          success: false
        });
      });
    });
  });

  describe('POST /auth/mfa - Complete login with MFA', () => {
    let user: any;
    let bonusPhrase: string;
    let mfaAgent: any;

    beforeEach(async () => {
      // Create user with MFA enabled
      user = await prisma.user.create({
        data: {
          address: testAddress,
          auth: {
            create: {
              mfa: true,
              awaitingMfa: false
            }
          }
        }
      });

      // Create a new agent for MFA flow
      mfaAgent = request.agent(app);

      // Start login to get bonus phrase
      const message = 'login';
      const signature = await signMessage(message);

      const loginResponse = await mfaAgent
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress
        });

      bonusPhrase = loginResponse.body.mfa_bonus_phrase;
    });

    it('should complete login with valid MFA code and bonus phrase', async () => {
      const secret = generateMFASecret(testAddress);
      authenticator.options = { window: 2 };
      const validCode = authenticator.generate(secret);

      const response = await mfaAgent
        .post('/auth/mfa')
        .send({
          mfa_code: validCode,
          mfa_bonus_phrase: bonusPhrase
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        user: {
          address: testAddress,
          role: 'user'
        }
      });
      expect(response.body.messages).toBeDefined();
    });

    it('should reject with invalid bonus phrase', async () => {
      const secret = generateMFASecret(testAddress);
      const validCode = authenticator.generate(secret);

      const response = await mfaAgent
        .post('/auth/mfa')
        .send({
          mfa_code: validCode,
          mfa_bonus_phrase: 'wrongphrase'
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid bonus phrase',
        status: 401,
        success: false
      });
    });

    it('should reject with invalid MFA code', async () => {
      const response = await mfaAgent
        .post('/auth/mfa')
        .send({
          mfa_code: '000000',
          mfa_bonus_phrase: bonusPhrase
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid MFA code',
        status: 401,
        success: false
      });
    });

    it('should reject if no pending MFA authentication', async () => {
      const newAgent = request.agent(app);
      
      const response = await newAgent
        .post('/auth/mfa')
        .send({
          mfa_code: '123456',
          mfa_bonus_phrase: 'somephrase'
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'No pending MFA authentication',
        status: 401,
        success: false
      });
    });

    it('should handle MFA timeout', async () => {
      // Set timeout to past
      await prisma.auth.update({
        where: { userId: user.id },
        data: {
          mfaTimeoutTimestamp: new Date(Date.now() - 10000) // 10 seconds ago
        }
      });

      const secret = generateMFASecret(testAddress);
      const validCode = authenticator.generate(secret);

      const response = await mfaAgent
        .post('/auth/mfa')
        .send({
          mfa_code: validCode,
          mfa_bonus_phrase: bonusPhrase
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'MFA window expired. Please login again.',
        status: 401,
        success: false
      });
    });

    it('should clear MFA timeout after successful authentication', async () => {
      const secret = generateMFASecret(testAddress);
      authenticator.options = { window: 2 };
      const validCode = authenticator.generate(secret);

      await mfaAgent
        .post('/auth/mfa')
        .send({
          mfa_code: validCode,
          mfa_bonus_phrase: bonusPhrase
        });

      const updatedAuth = await prisma.auth.findUnique({
        where: { userId: user.id }
      });

      expect(updatedAuth?.mfaTimeoutTimestamp).toBeNull();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle concurrent login attempts', async () => {
        const message = 'login';
      
        // Add unique addresses for each concurrent request to avoid conflicts
        const requests = Array(5).fill(null).map((_,) => {
          const wallet = ethers.Wallet.createRandom();
          return signMessage(message, wallet).then(sig =>
            request(app)
              .post('/auth')
              .send({
                message,
                signature: sig,
                address: wallet.address.toLowerCase()
              })
          );
        });
      
        const responses = await Promise.all(requests);
      
        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });
    });

    it('should handle case-insensitive address comparison', async () => {
      const message = 'login';
      const signature = await signMessage(message);

      // Create separate agents for each login
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // First login with lowercase
      await agent1
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress.toLowerCase()
        });

      // Second login with uppercase
      const response = await agent2
        .post('/auth')
        .send({
          message,
          signature,
          address: testAddress.toUpperCase()
        });

      expect(response.status).toBe(200);

      // Should still only have one user
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(1);
    });
  });
});