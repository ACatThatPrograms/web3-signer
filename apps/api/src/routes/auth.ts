// auth.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { verifySignature } from '../utils/signature';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
// @ts-ignore
import base32 from 'base32';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const LoginSchema = z.object({
  message: z.string(),
  signature: z.string(),
  address: z.string()
});

const MFAVerifySchema = z.object({
  mfa_code: z.string(),
  mfa_bonus_phrase: z.string().optional()
});

const MFACodeSchema = z.object({
  mfa_code: z.string()
});

export function generateMFASecret(address: string): string {
  const normalizedAddress = address.toLowerCase();
  const salt = process.env.MFA_SERVER_SALT || 'default-salt-change-this';
  const input = `${normalizedAddress}:${salt}`;
  
  // Generate hash
  const hash = crypto
    .createHash('sha256')
    .update(input)
    .digest('hex');
  
  // Convert to VALID base32 (A-Z, 2-7 only)
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < 32; i++) {
    const byte = parseInt(hash.substr(i * 2, 2), 16);
    secret += base32Chars[byte % 32];
  }
  
  return secret; // Must be uppercase A-Z, 2-7
}

// Helper to generate random bonus phrase
function generateBonusPhrase(): string {
  return crypto.randomBytes(16).toString('hex');
}

// POST /auth - Login endpoint
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, signature, address } = LoginSchema.parse(req.body);
    
    console.log('[AUTH] Login attempt:', { address, hasSession: !!req.session });
    
    // Verify the login signature
    if (message !== 'login') {
      res.status(400).json({
        error: 'Invalid login message',
        status: 400,
        success: false
      });
      return
    }
    
    const isValid = await verifySignature(message, signature, address);
    
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid signature',
        status: 401,
        success: false
      });
      return
    }
    
    // Normalize address
    const normalizedAddress = address.toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      include: {
        auth: true,
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          address:normalizedAddress,
          auth: {
            create: {
              mfa: false,
              awaitingMfa: false
            }
          }
        },
        include: {
          auth: true,
          messages: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    }
    
    // Check if MFA is enabled
    if (user.auth?.mfa) {
      const bonusPhrase = generateBonusPhrase();
      const mfaTimeout = new Date(Date.now() + 5 * 60 * 1000);
      
      await prisma.auth.update({
        where: { userId: user.id },
        data: { mfaTimeoutTimestamp: mfaTimeout }
      });
      
      // Store in session
      req.session.pendingUserId = user.id;
      req.session.mfaBonusPhrase = bonusPhrase;
      
      // CRITICAL: Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('[AUTH] Session save error:', err);
          res.status(500).json({
            error: 'Failed to save session',
            status: 500,
            success: false
          });
          return;
        }
        
        console.log('[AUTH] MFA session saved, sessionID:', req.sessionID);
        res.json({
          success: true,
          mfa: true,
          mfa_bonus_phrase: bonusPhrase
        });
      });
      return;
    }
    
    // No MFA, complete login
    req.session.userId = user.id;
    req.session.address = user.address;
    
    // CRITICAL: Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('[AUTH] Session save error:', err);
        res.status(500).json({
          error: 'Failed to save session',
          status: 500,
          success: false
        });
        return;
      }
      
      console.log('[AUTH] Login successful, sessionID:', req.sessionID);
      res.json({
        success: true,
        mfa: false,
        user: {
          id: user.id,
          address: user.address,
          role: user.role
        },
        messages: user.messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          signature: msg.signature,
          signer: msg.signer,
          valid: msg.valid,
          createdAt: msg.createdAt
        }))
      });
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      status: 500,
      success: false
    });
  }
});

// GET /auth - Get current user info
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: {
        auth: true,
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        status: 404,
        success: false
      });
      return
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        role: user.role,
        mfa: user.auth?.mfa || false
      },
      messages: user.messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        signature: msg.signature,
        signer: msg.signer,
        valid: msg.valid,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      status: 500,
      success: false
    });
  }
});

// POST /auth/logout - Logout endpoint
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        error: 'Logout failed',
        status: 500,
        success: false
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// POST /auth/mfa/initialize - Initialize MFA setup
router.post('/mfa/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, signature } = req.body;
    
    if (message !== 'enableMFA') {
      res.status(400).json({
        error: 'Invalid MFA enablement message',
        status: 400,
        success: false
      });
      return
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { auth: true }
    });
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        status: 404,
        success: false
      });
      return
    }

    const isValid = await verifySignature(message, signature, user.address);
    
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid signature',
        status: 401,
        success: false
      });
      return
    }
    
    // Generate deterministic MFA secret
    const secret = generateMFASecret(user.address);

    // Generate QR code
    const otpauth = authenticator.keyuri(
      user.address,
      'CAT Web3Signer',
      secret
    );
    
    const qrCode = await QRCode.toDataURL(otpauth);
    
    const checkToken = authenticator.generate(secret)
    const checkTokenPass = authenticator.verify({token: checkToken, secret})

    if (!checkTokenPass) {
      console.error("Generated check token for new MFA failed, investigate MFA setup!")
    }
    
    // Mark as awaiting MFA verification
    await prisma.auth.update({
      where: { userId: user.id },
      data: { awaitingMfa: true }
    });
    
    res.json({
      success: true,
      qrCode,
    });
  } catch (error) {
    console.error('MFA initialize error:', error);
    res.status(500).json({
      error: 'Failed to initialize MFA',
      status: 500,
      success: false
    });
  }
});

// POST /auth/mfa/verify - Verify MFA code to complete setup
router.post('/mfa/verify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { mfa_code } = MFACodeSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { auth: true }
    });
    
    if (!user || !user.auth) {
      res.status(404).json({
        error: 'User not found',
        status: 404,
        success: false
      });
      return
    }
    
    if (!user.auth.awaitingMfa) {
      res.status(400).json({
        error: 'MFA setup not initiated',
        status: 400,
        success: false
      });
      return
    }
    
    // Verify the MFA code
    const secret = generateMFASecret(user.address);
    console.log({verify: true, mfa_code, secret})
    const isValid = authenticator.verify({ token: mfa_code, secret });
    
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid MFA code',
        status: 401,
        success: false
      });
      return
    }
    
    // Enable MFA
    await prisma.auth.update({
      where: { userId: user.id },
      data: {
        mfa: true,
        awaitingMfa: false
      }
    });
    
    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({
      error: 'Failed to verify MFA',
      status: 500,
      success: false
    });
  }
});

// POST /auth/mfa - Complete login with MFA
router.post('/mfa', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mfa_code, mfa_bonus_phrase } = MFAVerifySchema.parse(req.body);
    
    if (!req.session.pendingUserId || !req.session.mfaBonusPhrase) {
      res.status(401).json({
        error: 'No pending MFA authentication',
        status: 401,
        success: false
      });
      return
    }
    
    if (mfa_bonus_phrase !== req.session.mfaBonusPhrase) {
      res.status(401).json({
        error: 'Invalid bonus phrase',
        status: 401,
        success: false
      });
      return
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.session.pendingUserId },
      include: {
        auth: true,
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user || !user.auth) {
      res.status(404).json({
        error: 'User not found',
        status: 404,
        success: false
      });
      return
    }
    
    // Check MFA timeout
    if (user.auth.mfaTimeoutTimestamp && new Date() > user.auth.mfaTimeoutTimestamp) {
      delete req.session.pendingUserId;
      delete req.session.mfaBonusPhrase;
      
      res.status(401).json({
        error: 'MFA window expired. Please login again.',
        status: 401,
        success: false
      });
      return
    }
    
    // Verify MFA code
    const secret = generateMFASecret(user.address);
    authenticator.options = { window: 2 };
    const isValid = authenticator.verify({ token: mfa_code, secret });
    
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid MFA code',
        status: 401,
        success: false
      });
      return
    }
    
    // Complete login
    req.session.userId = user.id;
    req.session.address = user.address;
    delete req.session.pendingUserId;
    delete req.session.mfaBonusPhrase;
    
    // Clear MFA timeout
    await prisma.auth.update({
      where: { userId: user.id },
      data: { mfaTimeoutTimestamp: null }
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        role: user.role,
        mfa: user.auth.mfa ? true : false
      },
      messages: user.messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        signature: msg.signature,
        signer: msg.signer,
        valid: msg.valid,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('MFA login error:', error);
    res.status(500).json({
      error: 'MFA authentication failed',
      status: 500,
      success: false
    });
  }
});

export default router;