import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { verifySignature, recoverAddress } from '../utils/signature';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const VerifySignatureSchema = z.object({
  message: z.string(),
  signature: z.string()
});

const VerifySignatureMultiSchema = z.array(
  z.object({
    message: z.string(),
    signature: z.string()
  })
);

// POST /verify-signature - Verify a single signature
router.post('/verify-signature', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, signature } = VerifySignatureSchema.parse(req.body);
    
    // Recover the signer address
    const signer = await recoverAddress(message, signature);
    
    // Verify the signature
    const isValid = await verifySignature(message, signature, signer);
    
    // Save to database
    if (req.session.userId) {
      await prisma.message.create({
        data: {
          userId: req.session.userId,
          message,
          signature,
          signer,
          valid: isValid
        }
      });
    }
    
    res.json({
      success: true,
      isValid,
      signer,
      originalMessage: message
    });
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(400).json({
      error: 'Failed to verify signature',
      status: 400,
      success: false
    });
  }
});

// POST /verify-signature-multi - Verify multiple signatures (batch)
router.post('/verify-signature-multi', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const signatures = VerifySignatureMultiSchema.parse(req.body);
    
    if (signatures.length === 0) {
      res.status(400).json({
        error: 'No signatures provided',
        status: 400,
        success: false
      });
      return
    }
    
    // Verify all signatures first (fail fast if any are invalid)
    const verificationResults = [];
    
    for (const { message, signature } of signatures) {
      try {
        const signer = await recoverAddress(message, signature);
        const isValid = await verifySignature(message, signature, signer);
        
        if (!isValid) {
          res.status(400).json({
            error: `Invalid signature for message: "${message}"`,
            status: 400,
            success: false
          });
          return
        }
        
        verificationResults.push({
          message,
          signature,
          signer,
          valid: isValid
        });
      } catch (err) {
        res.status(400).json({
          error: `Failed to verify signature for message: "${message}"`,
          status: 400,
          success: false
        });
        return
      }
    }
    
    // All signatures are valid, save to database
    if (req.session.userId) {
      await prisma.message.createMany({
        data: verificationResults.map(result => ({
          userId: req.session.userId!,
          message: result.message,
          signature: result.signature,
          signer: result.signer,
          valid: result.valid
        }))
      });
    }
    
    res.json({
      success: true,
      results: verificationResults.map(result => ({
        isValid: result.valid,
        signer: result.signer,
        originalMessage: result.message
      })),
      totalVerified: verificationResults.length
    });
  } catch (error) {
    console.error('Batch signature verification error:', error);
    res.status(400).json({
      error: 'Failed to verify signatures',
      status: 400,
      success: false
    });
  }
});

export default router;