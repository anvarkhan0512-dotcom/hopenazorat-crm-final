import { SMSProvider, SMSProviderResponse } from '../types';

export class EskizProvider implements SMSProvider {
  private email = process.env.ESKIZ_EMAIL;
  private password = process.env.ESKIZ_PASSWORD;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private async login(): Promise<string | null> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      });

      const data = await res.json();
      if (data.data?.token) {
        this.token = data.data.token;
        // Eskiz tokens usually last 30 days, we'll cache for 29 days
        this.tokenExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000;
        return this.token;
      }
      return null;
    } catch (error) {
      console.error('Eskiz login error:', error);
      return null;
    }
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('998')) return cleaned;
    if (cleaned.length === 9) return `998${cleaned}`;
    return cleaned;
  }

  async send(to: string, message: string): Promise<SMSProviderResponse> {
    const token = await this.login();
    if (!token) return { success: false, error: 'Eskiz authentication failed' };

    const phone = this.normalizePhone(to);

    try {
      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile_phone: phone,
          message,
          from: '4546',
          callback_url: '',
        }),
      });

      const data = await res.json();
      if (data.status === 'waiting' || data.status === 'sent') {
        return { success: true, messageId: data.id };
      }
      return { success: false, error: data.message || 'Eskiz send failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
