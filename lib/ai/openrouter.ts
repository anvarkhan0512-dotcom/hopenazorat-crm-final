import 'server-only';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODELS = (
  process.env.OPENROUTER_MODELS ||
  'deepseek/deepseek-chat-v3,meta-llama/llama-3.3-70b-instruct'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export async function askOpenRouter(
  messages: any[],
  systemPrompt?: string
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY topilmadi');
  }

  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hopenazorat.vercel.app',
      'X-Title': 'Edu CRM',
    },
    body: JSON.stringify({
      models: DEFAULT_MODELS,
      provider: { allow_fallbacks: true },
      max_tokens: 1000,
      messages: fullMessages,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}
