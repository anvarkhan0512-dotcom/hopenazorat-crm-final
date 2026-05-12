import TelegramBot from 'node-telegram-bot-api';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { User } from '@/models/User';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { askGemini, processVoiceWithGemini } from '@/lib/gemini';

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

export async function notifyStudentAdded(data: { studentName: string; username: string }): Promise<void> {
  const message =
    `🔔 <b>Yangi talaba qoʻshildi!</b>\n\n` +
    `👤 Ismi: ${data.studentName}\n` +
    `🔑 Logini: ${data.username}`;

  await sendTelegramMessage(message);
}

export async function handleBotCommand(chatId: string, text: string, message: any) {
  if (!bot) return;

  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const code = parts[1];
    
    if (code && code.length === 6) {
      await connectDB();
      const user = await User.findOne({ 
        telegramCode: code, 
        telegramCodeExpiry: { $gt: new Date() } 
      });
      
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          telegramChatId: chatId.toString(),
          telegramUsername: message.from?.username || '',
          telegramCode: null,
          telegramCodeExpiry: null
        });
        
        // Send welcome message based on role
        const roleEmoji: Record<string, string> = { 
          admin: '👑', teacher: '👨‍🏫', 
          student: '👨‍🎓', parent: '👪' 
        };
        const emoji = roleEmoji[user.role] || '👤';
        
        await bot.sendMessage(chatId, 
          `✅ Muvaffaqiyatli ulandi!\n\n` + 
          `${emoji} Salom, ${user.displayName}!\n` + 
          `<b>${user.centerName || 'Edu CRM'}</b> botiga xush kelibsiz!\n\n` + 
          `📋 Buyruqlar:\n` + 
          `/menu - Asosiy menyu\n` + 
          `/tolov - To'lov holati\n` + 
          `/davomat - Davomat\n` + 
          `/ai - AI yordamchi\n` + 
          `/help - Yordam` 
        , { parse_mode: 'HTML' });
      } else {
        await bot.sendMessage(chatId, 
          '❌ Kod noto\'g\'ri yoki muddati o\'tgan.\n' + 
          'Yangi kod oling va qayta urinib ko\'ring.' 
        );
      }
      return;
    }
    
    // /start without code
    const msg =
      `👋 Salom! Men tizim botiman.\n\n` +
      `Ulanish uchun:\n` +
      `1. Tizimga kiring\n` +
      `2. Telegram bo'limiga o'ting\n` +
      `3. 6 xonali kodni oling\n` +
      `4. /start KOD yuboring\n\n` +
      `Misol: /start 123456\n\n` +
      `📋 Buyruqlar:\n` +
      `👤 /me - Ma'lumotlaringizni ko'rish\n` +
      `🎓 /status - O'quvchi holatini tekshirish\n` +
      `🚪 /logout - Hisobdan chiqish`;
    await bot.sendMessage(chatId, msg);
    return;
  }

  if (text === '/me') {
    await connectDB();
    const user = await User.findOne({ telegramChatId: chatId.toString() });
    if (!user) {
      return bot.sendMessage(chatId, `Siz tizimga kirmagansiz. Iltimos, /start KOD orqali kiring.`);
    }
    const centerName = user.centerName || 'O\'quv markaz';
    await bot.sendMessage(chatId, 
      `👤 <b>Foydalanuvchi:</b> ${user.displayName || user.username}\n` +
      `🏢 <b>Markaz:</b> ${centerName}\n` +
      `🎭 <b>Rol:</b> ${user.role}`
    , { parse_mode: 'HTML' });
    return;
  } else if (text === '/status') {
    await connectDB();
    const user = await User.findOne({ telegramChatId: chatId.toString() });
    if (!user) return bot.sendMessage(chatId, `Siz tizimga kirmagansiz.`);
    const centerName = user.centerName || 'O\'quv markaz';
    await bot.sendMessage(chatId, `⏳ ${centerName} ma'lumotlari yuklanmoqda...`);
    return;
  }

  // Xavfsizlik: Faqat ADMIN_CHAT_ID dan kelgan xabarlarga javob berish
  if (String(chatId) !== String(adminChatId)) {
    console.log(`Unauthorized access attempt from ${chatId}`);
    return;
  }

  if (text === '/start') {
    await bot.sendMessage(chatId, 
      `Assalomu alaykum, Admin! 🌟\n\n` +
      `CRM botiga xush kelibsiz.\n` +
      `Buyruqlar:\n/stats - Umumiy statistika\n\n` +
      `Siz har qanday savolingizni matn yoki ovozli xabar ko'rinishida yuborishingiz mumkin. AI yordamchi sizga yordam beradi!`
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
  } else {
    // Agar buyruq bo'lmasa, Gemini AI ga yuboramiz
    const aiResponse = await askGemini(text);
    await bot.sendMessage(chatId, `<b>Menejer:</b>\n\n${aiResponse}`, { parse_mode: 'HTML' });
  }
}

/**
 * Ovozli xabarni qayta ishlash
 */
export async function handleVoiceMessage(chatId: string, voice: TelegramBot.Voice) {
  if (!bot || !token) return;

  if (String(chatId) !== String(adminChatId)) return;

  try {
    // Telegramdan audio faylni yuklab olish
    const file = await bot.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gemini AI ga yuborish
    const aiResponse = await processVoiceWithGemini(buffer, voice.mime_type || 'audio/ogg');
    await bot.sendMessage(chatId, `<b>Menejer (Ovozli xabarga javob):</b>\n\n${aiResponse}`, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Voice processing error:', error);
    await bot.sendMessage(chatId, "Ovozli xabarni qayta ishlashda xatolik yuz berdi.");
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
  
  // Webhookni avtomatik sozlash uchun fetch ishlatamiz
  fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`)
    .then(res => res.json())
    .then(data => console.log('Telegram Webhook set:', data))
    .catch(err => console.error('Telegram Webhook error:', err));

  return `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
}
