import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';

export class TTSService {
  private client: TextToSpeechClient;
  private audioDir: string;

  constructor() {
    this.client = new TextToSpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
    
    this.audioDir = path.join(process.cwd(), 'audio');
    this.ensureAudioDirectory();
  }

  private async ensureAudioDirectory(): Promise<void> {
    try {
      await fs.access(this.audioDir);
    } catch {
      await fs.mkdir(this.audioDir, { recursive: true });
    }
  }

  async generatePaymentConfirmationAudio(data: {
    transactionId: string;
    amount: number;
    recipientName: string;
    userBalance: number;
    type: 'user' | 'merchant';
  }): Promise<string> {
    let message: string;

    if (data.type === 'user') {
      message = `Payment successful. You have sent ${data.amount} pesos to ${data.recipientName}. Transaction ID ${data.transactionId}. Your new balance is ${data.userBalance} pesos.`;
    } else {
      message = `Payment received. ${data.amount} pesos from ${data.recipientName}. Transaction ID ${data.transactionId}.`;
    }

    return await this.generateAudio(message, data.transactionId, data.type);
  }

  async generatePaymentReceivedAudio(data: {
    transactionId: string;
    amount: number;
    senderName: string;
    type: 'user' | 'merchant';
  }): Promise<string> {
    let message: string;

    if (data.type === 'user') {
      message = `Payment received. You have received ${data.amount} pesos from ${data.senderName}. Transaction ID ${data.transactionId}.`;
    } else {
      message = `Payment received. ${data.amount} pesos from ${data.senderName}. Transaction ID ${data.transactionId}.`;
    }

    return await this.generateAudio(message, data.transactionId, data.type);
  }

  async generateTransactionFailedAudio(data: {
    transactionId: string;
    reason: string;
    type: 'user' | 'merchant';
  }): Promise<string> {
    const message = `Payment failed for transaction ${data.transactionId}. Reason: ${reason}.`;

    return await this.generateAudio(message, data.transactionId, data.type);
  }

  private async generateAudio(
    text: string, 
    transactionId: string, 
    type: 'user' | 'merchant'
  ): Promise<string> {
    try {
      const request = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Wavenet-D', // High-quality voice
          ssmlGender: 'NEUTRAL' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 0.9, // Slightly slower for clarity
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content generated');
      }

      // Generate filename
      const filename = `${transactionId}_${type}_${Date.now()}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      
      // Write audio file
      await fs.writeFile(filepath, response.audioContent, 'binary');
      
      // Return public URL (in production, this would be a CDN URL)
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      return `${baseUrl}/audio/${filename}`;
      
    } catch (error) {
      console.error('TTS generation error:', error);
      
      // Fallback to Web Speech API message
      return this.generateFallbackAudio(text, transactionId, type);
    }
  }

  private async generateFallbackAudio(
    text: string, 
    transactionId: string, 
    type: 'user' | 'merchant'
  ): Promise<string> {
    // Create a simple text file as fallback
    const filename = `${transactionId}_${type}_${Date.now()}.txt`;
    const filepath = path.join(this.audioDir, filename);
    
    await fs.writeFile(filepath, text);
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    return `${baseUrl}/audio/${filename}`;
  }

  async cleanupOldAudioFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filepath = path.join(this.audioDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
          console.log(`Cleaned up old audio file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Audio cleanup error:', error);
    }
  }

  // Method to get audio file for serving
  async getAudioFile(filename: string): Promise<Buffer | null> {
    try {
      const filepath = path.join(this.audioDir, filename);
      return await fs.readFile(filepath);
    } catch (error) {
      console.error('Audio file read error:', error);
      return null;
    }
  }
}
