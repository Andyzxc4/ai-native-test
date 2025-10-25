import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        balance: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { fullName, phoneNumber } = req.body;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        balance: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Get user balance
router.get('/balance', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'Balance retrieved successfully',
      balance: user.balance
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const [
      totalSent,
      totalReceived,
      transactionCount,
      recentTransactions
    ] = await Promise.all([
      // Total sent
      prisma.transaction.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      // Total received
      prisma.transaction.aggregate({
        where: {
          recipientId: userId,
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      // Transaction count
      prisma.transaction.count({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      }),
      // Recent transactions (last 5)
      prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, fullName: true }
          },
          recipient: {
            select: { id: true, fullName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    res.json({
      message: 'User statistics retrieved successfully',
      stats: {
        totalSent: totalSent._sum.amount || 0,
        totalReceived: totalReceived._sum.amount || 0,
        transactionCount,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Toggle 2FA
router.put('/2fa', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Enabled field must be a boolean'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        balance: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: `2FA ${enabled ? 'enabled' : 'disabled'} successfully`,
      user
    });
  } catch (error) {
    next(error);
  }
});

// Search users (for finding recipients)
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user!.id;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude current user
          { isActive: true },
          {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phoneNumber: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true
      },
      take: 10
    });

    res.json({
      message: 'Users found successfully',
      users
    });
  } catch (error) {
    next(error);
  }
});

export default router;
