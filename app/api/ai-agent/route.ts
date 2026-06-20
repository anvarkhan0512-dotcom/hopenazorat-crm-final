import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { askAIChain } from '@/lib/ai/router';
import { getAgentSystemPrompt } from '@/lib/ai-agent/prompts';
import { fetchContextData } from '@/lib/ai-agent/dataFetcher';
import { executeAgentAction } from '@/lib/ai-agent/actionExecutor';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history = [], page } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Xabar kiritilmagan' }, { status: 400 });
    }

    // 1. Fetch DB Context
    const contextData = await fetchContextData(message, auth.role, auth.centerId, auth.id);

    // 2. Build System Prompt
    const systemPrompt = getAgentSystemPrompt(auth.role, auth.centerName);

    // 3. Call Groq (llama-3.3-70b-versatile)
    const messages = [
      ...history.slice(-10).map((h: any) => ({
        role: h.role,
        content: h.content
      })),
      { 
        role: 'user', 
        content: `
FOYDALANUVCHI: ${message}
JORIY SAHIFA: ${page || 'dashboard'}

MA'LUMOTLAR BAZASIDAN:
${JSON.stringify(contextData, null, 2)}
`
      }
    ];

    const { text: aiResponse, provider } = await askAIChain(messages, systemPrompt);

    // 4. Check and Execute Action
    let actionResult = null;
    if (aiResponse.includes('[ACTION:')) {
      actionResult = await executeAgentAction(aiResponse, auth.role, auth.centerId);
    }

    // 5. Cleanup response (remove action tags from text for cleaner UI)
    const cleanText = aiResponse.replace(/\[ACTION:.*\]/g, '').trim();

    return NextResponse.json({
      text: cleanText,
      action: actionResult,
      provider,
      raw: aiResponse
    });

  } catch (error: any) {
    console.error('AI Agent error:', error);
    return NextResponse.json({ 
      text: 'Kechirasiz, hozirda javob bera olmayapman. Tizimda xatolik yuz berdi.',
      error: error.message 
    }, { status: 500 });
  }
}
