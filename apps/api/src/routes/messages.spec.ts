import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import messagesRouter from '../routes/messages';

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

app.use('/messages', messagesRouter);

// Test data
const testUserId = 1;
const testMessages = [
  {
    id: 1,
    message: 'Test message 1',
    signature: '0x123...',
    signer: '0xabc...',
    valid: true,
    userId: testUserId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    message: 'Test message 2',
    signature: '0x456...',
    signer: '0xdef...',
    valid: false,
    userId: testUserId,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 3,
    message: 'Test message 3',
    signature: '0x789...',
    signer: '0xghi...',
    valid: true,
    userId: testUserId,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    message: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn()
    }
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

describe('Messages Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /messages - Get paginated messages', () => {
    it('should return paginated messages with default parameters', async () => {
      const mockMessages = testMessages.slice(0, 2);
      
      (prisma.message.count as jest.Mock).mockResolvedValue(3);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const response = await request(app)
        .post('/messages')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        messages: mockMessages.map(msg => ({
          id: msg.id,
          message: msg.message,
          signature: msg.signature,
          signer: msg.signer,
          valid: msg.valid,
          createdAt: msg.createdAt.toISOString(),
          updatedAt: msg.updatedAt.toISOString()
        })),
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: { userId: testUserId }
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle custom pagination parameters', async () => {
      const mockMessages = [testMessages[1]];
      
      (prisma.message.count as jest.Mock).mockResolvedValue(3);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const response = await request(app)
        .post('/messages')
        .send({
          page: 2,
          limit: 1,
          orderBy: 'updatedAt',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 1,
        totalCount: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        skip: 1,
        take: 1,
        orderBy: { updatedAt: 'asc' }
      });
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .post('/messages')
        .send({
          page: -1,
          limit: 200
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get messages',
        status: 500,
        success: false
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.message.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/messages')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get messages',
        status: 500,
        success: false
      });
    });

    it('should return empty array when no messages exist', async () => {
      (prisma.message.count as jest.Mock).mockResolvedValue(0);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/messages')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        messages: [],
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    });

    it('should handle last page correctly', async () => {
      const mockMessages = [testMessages[2]];
      
      (prisma.message.count as jest.Mock).mockResolvedValue(3);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const response = await request(app)
        .post('/messages')
        .send({
          page: 3,
          limit: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 3,
        limit: 1,
        totalCount: 3,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true
      });
    });
  });

  describe('GET /messages/:id - Get specific message', () => {
    it('should return a specific message when it exists', async () => {
      const mockMessage = testMessages[0];
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .get('/messages/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: {
          id: mockMessage.id,
          message: mockMessage.message,
          signature: mockMessage.signature,
          signer: mockMessage.signer,
          valid: mockMessage.valid,
          createdAt: mockMessage.createdAt.toISOString(),
          updatedAt: mockMessage.updatedAt.toISOString()
        }
      });

      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: testUserId
        }
      });
    });

    it('should return 404 when message does not exist', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/messages/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Message not found',
        status: 404,
        success: false
      });
    });

    it('should return 400 for invalid message ID', async () => {
      const response = await request(app)
        .get('/messages/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid message ID',
        status: 400,
        success: false
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.message.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/messages/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get message',
        status: 500,
        success: false
      });
    });

    it('should not return messages from other users', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/messages/1');

      expect(response.status).toBe(404);
      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: testUserId
        }
      });
    });
  });

  describe('DELETE /messages/:id - Delete message', () => {
    it('should successfully delete a message', async () => {
      const mockMessage = testMessages[0];
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (prisma.message.delete as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .delete('/messages/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Message deleted successfully'
      });

      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: testUserId
        }
      });

      expect(prisma.message.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should return 404 when trying to delete non-existent message', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/messages/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Message not found',
        status: 404,
        success: false
      });

      expect(prisma.message.delete).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid message ID', async () => {
      const response = await request(app)
        .delete('/messages/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid message ID',
        status: 400,
        success: false
      });

      expect(prisma.message.findFirst).not.toHaveBeenCalled();
      expect(prisma.message.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      const mockMessage = testMessages[0];
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (prisma.message.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/messages/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to delete message',
        status: 500,
        success: false
      });
    });

    it('should not delete messages from other users', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/messages/1');

      expect(response.status).toBe(404);
      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: testUserId
        }
      });
      expect(prisma.message.delete).not.toHaveBeenCalled();
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
    unauthApp.use('/messages', messagesRouter);

    it('should require authentication for POST /messages', async () => {
      const response = await request(unauthApp)
        .post('/messages')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should require authentication for GET /messages/:id', async () => {
      const response = await request(unauthApp)
        .get('/messages/1');

      expect(response.status).toBe(401);
    });

    it('should require authentication for DELETE /messages/:id', async () => {
      const response = await request(unauthApp)
        .delete('/messages/1');

      expect(response.status).toBe(401);
    });
  });
});