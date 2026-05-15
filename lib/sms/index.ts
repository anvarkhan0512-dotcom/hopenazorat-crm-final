import { EskizProvider } from './providers/eskiz';
import { PlaymobileProvider } from './providers/playmobile';
import { SMSProvider, SMSProviderResponse } from './types';
import { SMSLog } from '@/models/SMSLog';
import connectDB from '@/lib/db';
import { Types } from 'mongoose';

const providerType = process.env.SMS_PROVIDER || 'eskiz';

let provider: SMSProvider;

switch (providerType) {
  case 'playmobile':
    provider = new PlaymobileProvider();
    break;
  case 'eskiz':
  default:
    provider = new EskizProvider();
    break;
}

export async function sendSMS(
  to: string,
  message: string,
  centerId: string | Types.ObjectId | null = null,
  retryCount = 1
): Promise<SMSProviderResponse> {
  await connectDB();

  const cId = centerId ? (typeof centerId === 'string' ? new Types.ObjectId(centerId) : centerId) : null;

  const log = await SMSLog.create({
    to,
    message,
    provider: providerType,
    status: 'pending',
    centerId: cId,
  });

  try {
    let result = await provider.send(to, message);

    // Retry once on failure
    if (!result.success && retryCount > 0) {
      console.log(`SMS failed, retrying... (${retryCount} left)`);
      result = await provider.send(to, message);
    }

    if (result.success) {
      log.status = 'sent';
      log.messageId = result.messageId;
    } else {
      log.status = 'failed';
      log.error = result.error;
    }

    await log.save();
    return result;
  } catch (error: any) {
    log.status = 'failed';
    log.error = error.message;
    await log.save();
    return { success: false, error: error.message };
  }
}
