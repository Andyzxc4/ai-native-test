import { Router } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const router = Router();
const paymentService = new PaymentService();
const prisma = new PrismaClient();

// Validation schemas
const scanQRSchema = z.object({
  qrData: z.string().min(1, 'QR data is required')
});

const generateQRSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().optional()
});

// Generate QR code for user to receive payments
router.post('/generate-qr', async (req, res, next) => {
  try {
    const validatedData = generateQRSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify the user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, fullName: true, email: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        error: 'User not found or inactive'
      });
    }

    // Create QR data for receiving payments
    const qrData = {
      type: 'PAYMENT_REQUEST',
      recipientId: user.id,
      recipientName: user.fullName,
      amount: validatedData.amount || null,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    };

    // Generate QR code
    const qrCodeData = await QRCode.toDataURL(JSON.stringify(qrData));

    res.json({
      message: 'QR code generated successfully',
      qrCode: qrCodeData,
      qrData: JSON.stringify(qrData),
      expiresAt: qrData.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

// Get QR code for transaction
router.get('/qr/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this transaction
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
      select: { senderId: true, recipientId: true }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    if (transaction.senderId !== userId && transaction.recipientId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized to access this transaction'
      });
    }

    const qrCodeData = await paymentService.getQRCode(transactionId);

    res.json({
      message: 'QR code retrieved successfully',
      qrCodeData
    });
  } catch (error) {
    next(error);
  }
});

// Handle QR code scan
router.post('/scan', async (req, res, next) => {
  try {
    const validatedData = scanQRSchema.parse(req.body);
    const userId = req.user!.id;

    let qrData;
    try {
      qrData = JSON.parse(validatedData.qrData);
    } catch {
      return res.status(400).json({
        error: 'Invalid QR code data'
      });
    }

    // Validate QR code data
    if (!qrData.transactionId || !qrData.amount || !qrData.recipientId) {
      return res.status(400).json({
        error: 'Invalid QR code format'
      });
    }

    // Get transaction details
    const transaction = await paymentService.getTransactionById(qrData.transactionId, userId);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    // Check if transaction is still pending
    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Transaction is no longer pending'
      });
    }

    res.json({
      message: 'QR code scanned successfully',
      transaction: {
        id: transaction.id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
        sender: transaction.sender,
        recipient: transaction.recipient
      }
    });
  } catch (error) {
    next(error);
  }
});

// Process payment (alternative endpoint)
router.post('/process', async (req, res, next) => {
  try {
    const { transactionId, otp } = req.body;
    const userId = req.user!.id;

    if (!transactionId || !otp) {
      return res.status(400).json({
        error: 'Transaction ID and OTP are required'
      });
    }

    const transaction = await paymentService.processPayment(transactionId, otp, userId);

    res.json({
      message: 'Payment processed successfully',
      transaction
    });
  } catch (error) {
    next(error);
  }
});

// Get payment session status
router.get('/session/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    const session = await prisma.paymentSession.findUnique({
      where: { transactionId }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Payment session not found'
      });
    }

    // Check if session is still active
    const isActive = session.isActive && session.expiresAt > new Date();

    res.json({
      message: 'Payment session status retrieved',
      session: {
        transactionId: session.transactionId,
        isActive,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
