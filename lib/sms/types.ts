import { Types } from 'mongoose';

export interface SMSProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSProvider {
  send(to: string, message: string): Promise<SMSProviderResponse>;
}

export interface ISMSLog {
  to: string;
  message: string;
  provider: string;
  status: 'sent' | 'failed' | 'pending';
  centerId: Types.ObjectId | null;
  createdAt: Date;
  error?: string;
  messageId?: string;
}
