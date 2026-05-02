import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioWithGemini } from '@/lib/gemini';
import { getAuthUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const text = await transcribeAudioWithGemini(file);
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
