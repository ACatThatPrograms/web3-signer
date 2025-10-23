import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schema for pagination
const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc')
});

// POST /messages - Get paginated messages
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, orderBy, order } = PaginationSchema.parse({
      page: req.body.page || 1,
      limit: req.body.limit || 10,
      orderBy: req.body.orderBy || 'createdAt',
      order: req.body.order || 'desc'
    });
    
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: { userId: req.session.userId }
    });
    
    // Get paginated messages
    const messages = await prisma.message.findMany({
      where: { userId: req.session.userId },
      skip,
      take: limit,
      orderBy: {
        [orderBy]: order
      }
    });
    
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        signature: msg.signature,
        signer: msg.signer,
        valid: msg.valid,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      status: 500,
      success: false
    });
  }
});

// GET /messages/:id - Get a specific message
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      res.status(400).json({
        error: 'Invalid message ID',
        status: 400,
        success: false
      });
      return
    }
    
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        userId: req.session.userId
      }
    });
    
    if (!message) {
      res.status(404).json({
        error: 'Message not found',
        status: 404,
        success: false
      });
      return
    }
    
    res.json({
      success: true,
      message: {
        id: message.id,
        message: message.message,
        signature: message.signature,
        signer: message.signer,
        valid: message.valid,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      error: 'Failed to get message',
      status: 500,
      success: false
    });
  }
});

// DELETE /messages/:id - Delete a specific message
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      res.status(400).json({
        error: 'Invalid message ID',
        status: 400,
        success: false
      });
      return
    }
    
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        userId: req.session.userId
      }
    });
    
    if (!message) {
      res.status(404).json({
        error: 'Message not found',
        status: 404,
        success: false
      });
      return
    }
    
    await prisma.message.delete({
      where: { id: messageId }
    });
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      status: 500,
      success: false
    });
  }
});

export default router;