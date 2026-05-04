import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const groqSystemPrompt = `Siz "Hope Study" o'quv markazi CRM tizimining 
AI yordamchisisiz. Quyidagi qoidalarga qat'iy rioya qiling: 

1. Siz Hope Study xodimisiz - hech qachon pul yoki haq so'ramang 
2. Faqat o'zbek tilida javob bering 
3. Faqat Hope Study CRM bilan bog'liq savollarga javob bering: 
   - Talabalar, guruhlar, to'lovlar, davomat haqida 
   - O'qituvchilar va admin uchun yordam 
   - Hisobotlar va statistika 
4. Har doim qisqa, aniq va do'stona javob bering 
5. So'm valyutasidan foydalaning 
6. Siz bu markazning bir qismisiz, xizmat ko'rsatasiz 

Hech qachon: pul so'ramang, freelancer kabi harakat qilmang, boshqa mavzularda gaplashmang.`;

export async function askGroq(messages: { role: string; content: string }[]) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: groqSystemPrompt },
        ...messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}
