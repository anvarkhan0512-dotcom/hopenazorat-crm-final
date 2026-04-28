export interface TelegramConfig {
  botToken: string;
  chatId?: string;
}

export interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: any;
}

export interface StudentNotification {
  studentName: string;
  action: 'added' | 'updated' | 'deleted';
  details: string;
}

export interface PaymentNotification {
  studentName: string;
  amount: number;
  month: number;
  year: number;
}

export interface GroupNotification {
  groupName: string;
  studentsCount: number;
}

async function telegramSend(chatId: string, message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.log('Telegram not configured. Message:', message);
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

/** Default center / admin chat from env */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;
  if (!chatId) {
    console.log('Telegram not configured. Message:', message);
    return false;
  }
  return telegramSend(chatId, message);
}

/** Parent or any specific chat ID */
export async function sendTelegramToChat(chatId: string, message: string): Promise<boolean> {
  return telegramSend(chatId, message);
}

export async function notifyStudentAdded(data: StudentNotification): Promise<void> {
  const message = `👤 <b>Yangi talaba qo'shildi</b>\n\n` +
    `Ismi: ${data.studentName}\n` +
    `Holat: ${data.action}\n` +
    `Ma'lumot: ${data.details}`;
  
  await sendTelegramMessage(message);
}

export async function notifyPayment(data: PaymentNotification): Promise<void> {
  const message = `💰 <b>To'lov qabul qilindi</b>\n\n` +
    `Talaba: ${data.studentName}\n` +
    `Summa: ${data.amount.toLocaleString()} so'm\n` +
    `Oy: ${data.month}/${data.year}`;
  
  await sendTelegramMessage(message);
}

export async function notifyNewDebtor(name: string, debt: number): Promise<void> {
  const message = `⚠️ <b>Yangi qarzdor!</b>\n\n` +
    `Talaba: ${name}\n` +
    `Qarz: ${debt.toLocaleString()} so'm`;
  
  await sendTelegramMessage(message);
}

export async function notifyDailyReport(stats: {
  totalStudents: number;
  income: number;
  debtorsCount: number;
}): Promise<void> {
  const message = `📊 <b>Kunlik hisobot</b>\n\n` +
    `Talabalar: ${stats.totalStudents}\n` +
    `Daromad: ${stats.income.toLocaleString()} so'm\n` +
    `Qarzdorlar: ${stats.debtorsCount}`;
  
  await sendTelegramMessage(message);
}

export function setupTelegramWebhook(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  
  return `https://api.telegram.org/bot${token}/setWebhook`;
}