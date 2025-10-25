import { Router } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service';
import { TTSService } from '../services/tts.service';
import { broadcastTransactionUpdate, broadcastPaymentSuccess, broadcastAudioReady } from '../websocket/socket.handler';

const router = Router();
const paymentService = new PaymentService();
const ttsService = new TTSService();

// Validation schemas
const initiateTransactionSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
});

const processPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

const cancelTransactionSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required')
});

// Initiate transaction
router.post('/initiate', async (req, res, next) => {
  try {
    const validatedData = initiateTransactionSchema.parse(req.body);
    const userId = req.user!.id;

    const transaction = await paymentService.initiateTransaction({
      senderId: userId,
      recipientId: validatedData.recipientId,
      amount: validatedData.amount,
      description: validatedData.description
    });

    // Broadcast transaction creation
    broadcastTransactionUpdate(transaction.transactionId, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      senderId: transaction.senderId,
      recipientId: transaction.recipientId
    });

    res.status(201).json({
      message: 'Transaction initiated successfully',
      transaction
    });
  } catch (error) {
    next(error);
  }
});

// Process payment
router.post('/:transactionId/process', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const validatedData = processPaymentSchema.parse(req.body);
    const userId = req.user!.id;

    const transaction = await paymentService.processPayment(
      transactionId,
      validatedData.otp,
      userId
    );

    // Generate audio confirmations
    const [userAudioUrl, merchantAudioUrl] = await Promise.all([
      ttsService.generatePaymentConfirmationAudio({
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        recipientName: transaction.recipient.fullName,
        userBalance: transaction.sender.balance,
        type: 'user'
      }),
      ttsService.generatePaymentReceivedAudio({
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        senderName: transaction.sender.fullName,
        type: 'merchant'
      })
    ]);

    // Update transaction with audio URLs
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { audioConfirmationUrl: userAudioUrl }
    });

    // Broadcast payment success
    broadcastPaymentSuccess(transaction.transactionId, userAudioUrl);

    // Broadcast audio ready notifications
    broadcastAudioReady(transaction.senderId, transaction.transactionId, userAudioUrl, 'user');
    broadcastAudioReady(transaction.recipientId, transaction.transactionId, merchantAudioUrl, 'merchant');

    res.json({
      message: 'Payment processed successfully',
      transaction,
      audioUrl: userAudioUrl
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await paymentService.getTransactionHistory(userId, page, limit);

    res.json({
      message: 'Transaction history retrieved successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    const transaction = await paymentService.getTransactionById(transactionId, userId);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    res.json({
      message: 'Transaction retrieved successfully',
      transaction
    });
  } catch (error) {
    next(error);
  }
});

// Cancel transaction
router.post('/:transactionId/cancel', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    const transaction = await paymentService.cancelTransaction(transactionId, userId);

    // Broadcast transaction cancellation
    broadcastTransactionUpdate(transaction.transactionId, {
      transactionId: transaction.transactionId,
      status: transaction.status
    });

    res.json({
      message: 'Transaction cancelled successfully',
      transaction
    });
  } catch (error) {
    next(error);
  }
});

export default router;
