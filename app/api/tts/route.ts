import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text, lang = 'uz' } = await req.json();
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });
     
    // Split long text into chunks (Google TTS limit ~200 chars)
    const chunks = splitText(text, 180);
    const audioBuffers: Buffer[] = [];
     
    for (const chunk of chunks) {
      const encoded = encodeURIComponent(chunk);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob&ttsspeed=0.9`;
       
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        }
      });
       
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(buffer));
      }
    }
     
    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }
     
    const combined = Buffer.concat(audioBuffers);
     
    return new NextResponse(combined, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}

function splitText(text: string, maxLen: number): string[] {
  // Regex to split by sentence boundaries or commas
  const sentences = text.split(/(?<=[.!?])\s+|(?<=,)\s+/);
  const chunks: string[] = [];
  let current = '';
   
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}
