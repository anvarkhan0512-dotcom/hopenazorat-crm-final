import TelegramBot from 'node-telegram-bot-api';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { User } from '@/models/User';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;
const bot = token ? new TelegramBot(token) : null;

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
  if (!bot || !chatId) {
    console.log('Telegram bot not configured. Message:', message);
    return false;
  }
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    return true;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

/** Default center / admin chat from env */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const chatId = adminChatId || process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;
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
  const message =
    `👤 <b>Yangi oʻquvchi roʻyxatdan oʻtdi</b>\n\n` +
    `Ism: ${data.studentName}\n` +
    `Amal: ${data.action}\n` +
    `Qoʻshimcha: ${data.details}`;

  await sendTelegramMessage(message);
}

export async function handleBotCommand(chatId: string, text: string) {
  if (!bot) return;

  // Xavfsizlik: Faqat ADMIN_CHAT_ID dan kelgan xabarlarga javob berish
  if (String(chatId) !== String(adminChatId)) {
    console.log(`Unauthorized access attempt from ${chatId}`);
    return;
  }

  if (text === '/start') {
    await bot.sendMessage(chatId, 
      `Assalomu alaykum, Admin! 🌟\n\n` +
      `"Hope Study" CRM botiga xush kelibsiz.\n` +
      `Buyruqlar:\n/stats - Umumiy statistika`
    );
  } else if (text === '/stats') {
    await connectDB();
    
    const [totalStudents, totalTeachers, totalGroups] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'teacher' }),
      Group.countDocuments({ isActive: true }),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayPayments = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const incomeToday = todayPayments[0]?.total || 0;

    const message = 
      `📊 <b>Umumiy statistika (Faol):</b>\n\n` +
      `👥 Talabalar: ${totalStudents}\n` +
      `👨‍🏫 Ustozlar: ${totalTeachers}\n` +
      `📚 Guruhlar: ${totalGroups}\n\n` +
      `💰 <b>Bugungi tushum:</b> ${incomeToday.toLocaleString('uz-UZ')} so'm`;

    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }
}

export async function notifyPayment(data: PaymentNotification): Promise<void> {
  const message =
    `💰 <b>Toʻlov qabul qilindi</b>\n\n` +
    `Oʻquvchi: ${data.studentName}\n` +
    `Summa: ${data.amount.toLocaleString('uz-UZ')} soʻm\n` +
    `Oy: ${data.month}/${data.year}`;

  await sendTelegramMessage(message);
}

export async function notifyNewDebtor(name: string, debt: number): Promise<void> {
  const message =
    `⚠️ <b>Yangi qarzdor</b>\n\n` +
    `Oʻquvchi: ${name}\n` +
    `Qarz summasi: ${debt.toLocaleString('uz-UZ')} soʻm`;

  await sendTelegramMessage(message);
}

export async function notifyDailyReport(stats: {
  totalStudents: number;
  income: number;
  debtorsCount: number;
}): Promise<void> {
  const message =
    `📊 <b>Kunlik hisobot</b>\n\n` +
    `Oʻquvchilar: ${stats.totalStudents}\n` +
    `Daromad: ${stats.income.toLocaleString('uz-UZ')} soʻm\n` +
    `Qarzdorlar soni: ${stats.debtorsCount}`;

  await sendTelegramMessage(message);
}

export function setupTelegramWebhook(): string | null {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl || !token) return null;
  
  return `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
}