import { NextRequest, NextResponse } from 'next/server';
import { handleBotCommand, handleVoiceMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Webhook orqali kelgan xabarni qayta ishlash
    if (body.message && body.message.chat) {
      const chatId = body.message.chat.id;

      if (body.message.text) {
        await handleBotCommand(chatId, body.message.text);
      } else if (body.message.voice) {
        await handleVoiceMessage(chatId, body.message.voice);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
