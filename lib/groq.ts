import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const getGroqSystemPrompt = (centerName: string = 'O\'quv markaz') => `Sen ${centerName} 
 o'quv markazi CRM tizimining AI yordamchisisisan. 
 
 QOIDALAR: 
 - Faqat o'zbek tilida javob ber 
 - Hech qachon pul yoki narx so'rama 
 - Tizimdan real ma'lumot olib javob ber 
 - Qisqa va aniq gapir 
 - Sen bu markazning xodimisan 
 - Faqat ${centerName} haqida gapir, boshqa markazlar haqida ma'lumot berma.`;

export const SYSTEM_PROMPT = getGroqSystemPrompt();

export async function askGroq(
  messages: any[],
  systemPrompt?: string
): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: systemPrompt || SYSTEM_PROMPT
        },
        ...messages
      ]
    });
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}
