import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import signatureRouter from '../routes/signature';

const prisma = new PrismaClient();
const app: Express = express();

// Setup express app with session middleware
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Mock auth middleware for testing
app.use((req: any, _res, next) => {
  req.session.userId = 1; // Mock authenticated user
  next();
});

app.use('/signature', signatureRouter);

// Test data
const testUserId = 1;
const validSignature = '0x1234567890abcdef...';
const validSigner = '0xABCDEF1234567890...';
const testMessage = 'Test message to sign';

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    message: {
      create: jest.fn(),
      createMany: jest.fn()
    }
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

// Mock signature utilities
jest.mock('../utils/signature', () => ({
  verifySignature: jest.fn(),
  recoverAddress: jest.fn()
}));

import { verifySignature, recoverAddress } from '../utils/signature';

describe('Signature Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /verify-signature - Single signature verification', () => {
    it('should successfully verify a valid signature', async () => {
      const mockMessage = {
        id: 1,
        userId: testUserId,
        message: testMessage,
        signature: validSignature,
        signer: validSigner,
        valid: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (recoverAddress as jest.Mock).mockResolvedValue(validSigner);
      (verifySignature as jest.Mock).mockResolvedValue(true);
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: testMessage,
          signature: validSignature
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        isValid: true,
        signer: validSigner,
        originalMessage: testMessage
      });

      expect(recoverAddress).toHaveBeenCalledWith(testMessage, validSignature);
      expect(verifySignature).toHaveBeenCalledWith(testMessage, validSignature, validSigner);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          message: testMessage,
          signature: validSignature,
          signer: validSigner,
          valid: true
        }
      });
    });

    it('should handle invalid signature', async () => {
      (recoverAddress as jest.Mock).mockResolvedValue(validSigner);
      (verifySignature as jest.Mock).mockResolvedValue(false);
      
      const mockMessage = {
        id: 1,
        userId: testUserId,
        message: testMessage,
        signature: validSignature,
        signer: validSigner,
        valid: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: testMessage,
          signature: validSignature
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        isValid: false,
        signer: validSigner,
        originalMessage: testMessage
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          message: testMessage,
          signature: validSignature,
          signer: validSigner,
          valid: false
        }
      });
    });

    it('should return 400 for missing message field', async () => {
      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          signature: validSignature
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signature',
        status: 400,
        success: false
      });

      expect(recoverAddress).not.toHaveBeenCalled();
      expect(verifySignature).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('should return 400 for missing signature field', async () => {
      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: testMessage
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signature',
        status: 400,
        success: false
      });

      expect(recoverAddress).not.toHaveBeenCalled();
      expect(verifySignature).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('should handle signature recovery errors', async () => {
      (recoverAddress as jest.Mock).mockRejectedValue(new Error('Invalid signature format'));

      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: testMessage,
          signature: 'invalid-signature'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signature',
        status: 400,
        success: false
      });

      expect(verifySignature).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('should handle empty string inputs', async () => {
      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: '',
          signature: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signature',
        status: 400,
        success: false
      });
    });
  });

  describe('POST /verify-signature-multi - Batch signature verification', () => {
    const batchData = [
      {
        message: 'Test message 1',
        signature: '0xsig1...'
      },
      {
        message: 'Test message 2',
        signature: '0xsig2...'
      },
      {
        message: 'Test message 3',
        signature: '0xsig3...'
      }
    ];

    it('should successfully verify multiple valid signatures', async () => {
      const signers = ['0xsigner1...', '0xsigner2...', '0xsigner3...'];
      
      (recoverAddress as jest.Mock)
        .mockResolvedValueOnce(signers[0])
        .mockResolvedValueOnce(signers[1])
        .mockResolvedValueOnce(signers[2]);
      
      (verifySignature as jest.Mock).mockResolvedValue(true);
      (prisma.message.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send(batchData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        results: [
          {
            isValid: true,
            signer: signers[0],
            originalMessage: batchData[0].message
          },
          {
            isValid: true,
            signer: signers[1],
            originalMessage: batchData[1].message
          },
          {
            isValid: true,
            signer: signers[2],
            originalMessage: batchData[2].message
          }
        ],
        totalVerified: 3
      });

      expect(recoverAddress).toHaveBeenCalledTimes(3);
      expect(verifySignature).toHaveBeenCalledTimes(3);
      expect(prisma.message.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: testUserId,
            message: batchData[0].message,
            signature: batchData[0].signature,
            signer: signers[0],
            valid: true
          },
          {
            userId: testUserId,
            message: batchData[1].message,
            signature: batchData[1].signature,
            signer: signers[1],
            valid: true
          },
          {
            userId: testUserId,
            message: batchData[2].message,
            signature: batchData[2].signature,
            signer: signers[2],
            valid: true
          }
        ]
      });
    });

    it('should fail fast when one signature is invalid', async () => {
      (recoverAddress as jest.Mock)
        .mockResolvedValueOnce('0xsigner1...')
        .mockResolvedValueOnce('0xsigner2...');
      
      (verifySignature as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false); // Second signature is invalid

      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send(batchData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: `Invalid signature for message: "${batchData[1].message}"`,
        status: 400,
        success: false
      });

      expect(recoverAddress).toHaveBeenCalledTimes(2);
      expect(verifySignature).toHaveBeenCalledTimes(2);
      expect(prisma.message.createMany).not.toHaveBeenCalled();
    });

    it('should return 400 for empty array', async () => {
      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send([]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'No signatures provided',
        status: 400,
        success: false
      });

      expect(recoverAddress).not.toHaveBeenCalled();
      expect(verifySignature).not.toHaveBeenCalled();
      expect(prisma.message.createMany).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid array structure', async () => {
      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send([
          { message: 'Test', signature: '0xsig1...' },
          { message: 'Test2' } // Missing signature
        ]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signatures',
        status: 400,
        success: false
      });

      expect(recoverAddress).not.toHaveBeenCalled();
      expect(verifySignature).not.toHaveBeenCalled();
      expect(prisma.message.createMany).not.toHaveBeenCalled();
    });

    it('should handle signature recovery error in batch', async () => {
      (recoverAddress as jest.Mock)
        .mockResolvedValueOnce('0xsigner1...')
        .mockRejectedValueOnce(new Error('Invalid signature format'));

      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send(batchData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: `Failed to verify signature for message: "${batchData[1].message}"`,
        status: 400,
        success: false
      });

      expect(recoverAddress).toHaveBeenCalledTimes(2);
      expect(verifySignature).toHaveBeenCalledTimes(1);
      expect(prisma.message.createMany).not.toHaveBeenCalled();
    });

    it('should handle single item batch', async () => {
      const singleBatch = [batchData[0]];
      
      (recoverAddress as jest.Mock).mockResolvedValue('0xsigner1...');
      (verifySignature as jest.Mock).mockResolvedValue(true);
      (prisma.message.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send(singleBatch);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        results: [
          {
            isValid: true,
            signer: '0xsigner1...',
            originalMessage: singleBatch[0].message
          }
        ],
        totalVerified: 1
      });

      expect(recoverAddress).toHaveBeenCalledTimes(1);
      expect(verifySignature).toHaveBeenCalledTimes(1);
    });

    it('should handle non-array input', async () => {
      const response = await request(app)
        .post('/signature/verify-signature-multi')
        .send({ message: 'test', signature: '0xsig...' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Failed to verify signatures',
        status: 400,
        success: false
      });
    });
  });

  describe('Authentication middleware', () => {
    // Create a separate app instance without the mock auth
    const unauthApp: Express = express();
    unauthApp.use(express.json());
    unauthApp.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false
      })
    );
    unauthApp.use('/signature', signatureRouter);

    it('should require authentication for POST /verify-signature', async () => {
      const response = await request(unauthApp)
        .post('/signature/verify-signature')
        .send({
          message: testMessage,
          signature: validSignature
        });

      expect(response.status).toBe(401);
    });

    it('should require authentication for POST /verify-signature-multi', async () => {
      const response = await request(unauthApp)
        .post('/signature/verify-signature-multi')
        .send([
          {
            message: testMessage,
            signature: validSignature
          }
        ]);

      expect(response.status).toBe(401);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000);
      
      (recoverAddress as jest.Mock).mockResolvedValue(validSigner);
      (verifySignature as jest.Mock).mockResolvedValue(true);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: testUserId,
        message: longMessage,
        signature: validSignature,
        signer: validSigner,
        valid: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: longMessage,
          signature: validSignature
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Test 🚀 message with "quotes" and \'apostrophes\' & symbols!';
      
      (recoverAddress as jest.Mock).mockResolvedValue(validSigner);
      (verifySignature as jest.Mock).mockResolvedValue(true);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: testUserId,
        message: specialMessage,
        signature: validSignature,
        signer: validSigner,
        valid: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/signature/verify-signature')
        .send({
          message: specialMessage,
          signature: validSignature
        });

      expect(response.status).toBe(200);
      expect(response.body.originalMessage).toBe(specialMessage);
    });

    it('should handle malformed JSON input', async () => {
      const response = await request(app)
        .post('/signature/verify-signature')
        .set('Content-Type', 'application/json')
        .send('{"message": "test", "signature":'); // Malformed JSON

      expect(response.status).toBe(400);
    });
  });
});