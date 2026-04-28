import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, token } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
    }

    let user = null;
    if (token) {
      user = jwt.verify(token, JWT_SECRET);
    }

    let message = '';
    let parse_mode = 'HTML';

    switch (action) {
      case 'student_added':
        message = `👤 Yangi talaba: <b>${data.name}</b>\n📱 ${data.phone}\n💵 Oylik: ${data.monthlyPrice} so'm`;
        break;
      case 'student_deleted':
        message = `❌ Talaba o'chirildi: <b>${data.name}</b>`;
        break;
      case 'payment_received':
        message = `💰 To'lov: <b>${data.amount}</b> so'm\n👤 Talaba: ${data.studentName}\n📅 ${data.month}/${data.year}`;
        break;
      case 'new_debtor':
        message = `⚠️ Yangi qarzdor: <b>${data.name}</b>\n📋 Qarz: ${data.debt} so'm`;
        break;
      case 'daily_report':
        message = `📊 Kunlik hisobot\n\n` +
          `👥 Talabalar: ${data.totalStudents}\n` +
          `💵 Daromad: ${data.income} so'm\n` +
          `⚠️ Qarzdorlar: ${data.debtorsCount}`;
        break;
      default:
        message = data.message || 'Unknown message';
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode,
      }),
    });

    if (!response.ok) {
      throw new Error('Telegram API error');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram API error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ configured: false });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    return NextResponse.json({
      configured: true,
      bot: data.result,
    });
  } catch (error) {
    return NextResponse.json({ configured: false, error: 'Invalid token' });
  }
}