import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }

  async sendOtpEmail(to: string, code: string, subject: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Payment App. Please do not reply to this email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html
    });
  }

  async sendPaymentNotification(
    to: string, 
    transactionId: string, 
    amount: number, 
    type: 'sent' | 'received',
    recipientName?: string
  ): Promise<void> {
    const subject = type === 'sent' 
      ? `Payment Sent - ${transactionId}`
      : `Payment Received - ${transactionId}`;

    const message = type === 'sent'
      ? `You have successfully sent ₱${amount.toFixed(2)} to ${recipientName || 'recipient'}.`
      : `You have received ₱${amount.toFixed(2)} from a payment.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment ${type === 'sent' ? 'Sent' : 'Received'}</h2>
        <p>${message}</p>
        <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Amount:</strong> ₱${amount.toFixed(2)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>Thank you for using our payment service!</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Payment App. Please do not reply to this email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html
    });
  }

  async sendReceipt(
    to: string,
    transactionId: string,
    amount: number,
    recipientName: string,
    description?: string
  ): Promise<void> {
    const subject = `Payment Receipt - ${transactionId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Receipt</h2>
        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Transaction Details</h3>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Amount:</strong> ₱${amount.toFixed(2)}</p>
          <p><strong>Recipient:</strong> ${recipientName}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> <span style="color: #28a745;">Completed</span></p>
        </div>
        <p>Keep this receipt for your records.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Payment App. Please do not reply to this email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html
    });
  }
}
