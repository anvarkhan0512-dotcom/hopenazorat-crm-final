import { NextRequest, NextResponse } from 'next/server';
import EdgeTTS from 'edge-tts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

    const voice = process.env.TTS_VOICE || 'uz-UZ-MadinaNeural';
    
    const tts = new EdgeTTS();
    const audioBuffer = await tts.synthesize(text, voice, {
      rate: '+0%',
      pitch: '+5Hz',
      volume: '+0%'
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Edge TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
