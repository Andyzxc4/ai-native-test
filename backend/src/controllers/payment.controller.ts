import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { PrismaClient } from '@prisma/client';

const paymentService = new PaymentService();
const prisma = new PrismaClient();

export class PaymentController {
  async getQRCode(req: Request, res: Response, next: NextFunction) {
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
  }

  async scanQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { qrData } = req.body;
      const userId = req.user!.id;

      let qrDataParsed;
      try {
        qrDataParsed = JSON.parse(qrData);
      } catch {
        return res.status(400).json({
          error: 'Invalid QR code data'
        });
      }

      // Validate QR code data
      if (!qrDataParsed.transactionId || !qrDataParsed.amount || !qrDataParsed.recipientId) {
        return res.status(400).json({
          error: 'Invalid QR code format'
        });
      }

      // Get transaction details
      const transaction = await paymentService.getTransactionById(qrDataParsed.transactionId, userId);

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
  }

  async processPayment(req: Request, res: Response, next: NextFunction) {
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
  }

  async getPaymentSession(req: Request, res: Response, next: NextFunction) {
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
  }
}
