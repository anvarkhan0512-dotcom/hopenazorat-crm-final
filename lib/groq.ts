import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const SYSTEM_PROMPT = `Sen "Hope Study" o'quv markazi 
AI yordamchisisisan. 

QOIDALAR: 
- Hech qachon pul, narx yoki haq so'rama 
- Hech qachon o'z xizmatlaringni sotma 
- Sen Hope Study CRM ning bir qismisan 
- Faqat o'zbek tilida gapir 
- Talaba, ustoz, ota-ona va admin uchun yordam ber: 
  * Dars jadvali, guruhlar, davomat 
  * To'lovlar va hisobotlar haqida ma'lumot 
  * O'quv materiallari va vazifalar 
- Qisqa, aniq va do'stona javob ber 
- Hech qachon freelancer yoki mustaqil xizmatchi kabi harakat qilma 
Sen bu markazning xodimisan, mijoz emas!

Sen CRM tizimini boshqara olasan:
- Talabalar ro'yxatini ko'rish
- Yangi talaba qo'shish 
- Guruhlar haqida ma'lumot berish
- To'lovlarni tekshirish
Foydalanuvchi so'raganda, tegishli amalni bajara olasan.`;

export async function askGroq(messages: { role: string; content: string }[]) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
