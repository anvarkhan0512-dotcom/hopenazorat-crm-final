import { SMSProvider, SMSProviderResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlaymobileProvider implements SMSProvider {
  private login = process.env.PLAYMOBILE_LOGIN;
  private password = process.env.PLAYMOBILE_PASSWORD;

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  async send(to: string, message: string): Promise<SMSProviderResponse> {
    const phone = this.normalizePhone(to);
    const auth = Buffer.from(`${this.login}:${this.password}`).toString('base64');

    try {
      const res = await fetch('https://send.smsxabar.uz/broker-api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          messages: [
            {
              recipient: phone,
              'message-id': uuidv4(),
              sms: {
                originator: '3700',
                content: {
                  text: message,
                },
              },
            },
          ],
        }),
      });

      if (res.ok) {
        return { success: true };
      }
      const errText = await res.text();
      return { success: false, error: errText || 'Playmobile send failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
