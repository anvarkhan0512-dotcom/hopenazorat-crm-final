import { NextRequest, NextResponse } from 'next/server';
import { handleBotCommand } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Webhook orqali kelgan xabarni qayta ishlash
    if (body.message && body.message.chat && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      await handleBotCommand(chatId, text);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
