import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const SYSTEM_PROMPT = `Sen Hope Study 
 o'quv markazi CRM tizimining AI yordamchisisisan. 
 
 QOIDALAR: 
 - Faqat o'zbek tilida javob ber 
 - Hech qachon pul yoki narx so'rama 
 - Tizimdan real ma'lumot olib javob ber 
 - Qisqa va aniq gapir 
 - Sen bu markazning xodimisan 
 
 IMKONIYATLARING: 
 - Talabalar, guruhlar, to'lovlar haqida ma'lumot 
 - Statistika va hisobotlar 
 - Buyruqlarni bajarish (talaba qo'shish va h.k.)`;

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
