import { askGroq } from '@/lib/groq';
import { askGeminiText } from '@/lib/gemini';
import { askOpenRouter } from '@/lib/ai/openrouter';

type Provider = { name: string; call: () => Promise<string> };

export async function askAIChain(
  messages: any[],
  systemPrompt?: string
): Promise<{ text: string; provider: string }> {
  const chain: Provider[] = [
    { name: 'groq', call: () => askGroq(messages, systemPrompt) },
    { name: 'gemini', call: () => askGeminiText(messages, systemPrompt) },
    { name: 'openrouter', call: () => askOpenRouter(messages, systemPrompt) },
  ];

  let lastErr: any;
  for (const p of chain) {
    try {
      const text = await p.call();
      if (text && text.trim()) {
        console.log(`[AI chain] javob: ${p.name}`);
        return { text, provider: p.name };
      }
      lastErr = new Error(`${p.name} bo'sh javob qaytardi`);
    } catch (e) {
      console.error(`[AI chain] ${p.name} xato:`, e);
      lastErr = e;
    }
  }
  throw lastErr || new Error('Barcha AI provayderlar ishlamadi');
}
