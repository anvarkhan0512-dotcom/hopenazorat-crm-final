import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const systemInstruction = `Siz "Hope Study" o'quv markazining aqlli va to'liq vakolatli menejerisiz.
Sizga markazni boshqarish va o'qitish jarayonini qo'llab-quvvatlash uchun barcha vositalar (tools) berilgan.

Rollar bo'yicha vazifalaringiz:
1. Admin/Manager: To'liq boshqaruv (talabalar, xodimlar, moliya).
2. Ustozlar: Dars ishlanmalari yaratish, uy vazifalarini baholash, o'z guruhlarini boshqarish.
3. O'quvchilar va Ota-onalar (Support Teacher): 
   - Qat'iy qoida: Hech qachon uy vazifasini tayyor yechib bermang!
   - O'quvchiga yo'nalish bering, mavzuni sodda misollar bilan tushuntiring.
   - Dars jadvali va o'zlashtirish haqida ma'lumot bering.

"Hope Study" metodikasi:
- O'quvchiga yo'naltirilgan ta'lim (Student-centered learning).
- Interaktiv darslar va amaliyotga asoslangan yondashuv.
- Har bir dars oxirida qayta aloqa (feedback) berish muhim.

Sizning javoblaringiz doimo o'zbek tilida, professional va xushmuomala bo'lishi kerak.
Har bir amalni bajargandan so'ng, nima qilganingizni tasdiqlang.`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_students",
        description: "Talabalar ro'yxatini olish (Admin uchun barcha, Ustoz uchun o'zining talabalari).",
        parameters: {
          type: "OBJECT",
          properties: {
            search: { type: "STRING", description: "Ism yoki telefon bo'yicha qidiruv" },
            groupId: { type: "STRING", description: "Guruh ID bo'yicha filtrlash" }
          }
        }
      },
      {
        name: "add_student",
        description: "Yangi talaba qo'shish (Faqat Admin uchun).",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Ism-sharif" },
            phone: { type: "STRING", description: "Telefon raqami" },
            groupId: { type: "STRING", description: "Guruh ID" },
            basePrice: { type: "NUMBER", description: "Oylik to'lov summasi" }
          },
          required: ["name", "phone"]
        }
      },
      {
        name: "get_groups",
        description: "Guruhlar ro'yxatini olish.",
      },
      {
        name: "get_staff",
        description: "Xodimlar ro'yxatini olish (Faqat Admin uchun).",
      },
      {
        name: "get_stats",
        description: "Umumiy statistikani olish (Faqat Admin uchun).",
      },
      {
        name: "generate_lesson_plan",
        description: "Dars ishlanmasini tayyorlash (Ustozlar uchun).",
        parameters: {
          type: "OBJECT",
          properties: {
            topic: { type: "STRING", description: "Dars mavzusi" },
            level: { type: "STRING", description: "O'quvchilar darajasi" }
          },
          required: ["topic"]
        }
      },
      {
        name: "evaluate_homework",
        description: "Uy vazifasini tahlil qilish va baholash (Ustoz va O'quvchi uchun).",
        parameters: {
          type: "OBJECT",
          properties: {
            content: { type: "STRING", description: "Uy vazifasi matni yoki tahlil uchun ma'lumot" }
          },
          required: ["content"]
        }
      },
      {
        name: "reschedule_lesson",
        description: "Dars vaqtini o'zgartirish.",
        parameters: {
          type: "OBJECT",
          properties: {
            groupId: { type: "STRING", description: "Guruh ID" },
            newTime: { type: "STRING", description: "Yangi dars vaqti" }
          },
          required: ["groupId", "newTime"]
        }
      },
      {
        name: "explain_topic",
        description: "Mavzuni tushuntirish (O'quvchilar uchun).",
        parameters: {
          type: "OBJECT",
          properties: {
            topic: { type: "STRING", description: "Tushuntirilishi kerak bo'lgan mavzu" }
          },
          required: ["topic"]
        }
      },
      {
        name: "get_homework_status",
        description: "Qilinmagan uy vazifalarini tekshirish (O'quvchi va Ota-ona uchun).",
      },
      {
        name: "check_progress",
        description: "Haftalik o'zlashtirish va yutuqlarni tekshirish (O'quvchi va Ota-ona uchun).",
      }
    ]
  }
];

export async function askGemini(prompt: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction, tools: tools as any });
  const result = await model.generateContent(prompt);
  const response = result.response;
  const toolCalls = response.functionCalls();

  return {
    text: response.text(),
    toolCalls: toolCalls
  };
}

export async function sendToolResult(callId: string, result: any) {
  // Bu funksiya Gemini API'da tool natijalarini qaytarish uchun ishlatiladi
  // Hozirgi implementation'da soddalashtirilgan
  return result;
}

export async function processVoiceWithGemini(audioData: Buffer, mimeType: string): Promise<{ text: string, toolCalls?: any[] }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      tools: tools as any
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: mimeType
        }
      },
      { text: "Ushbu ovozli xabarni eshitib, unga Hope Study menejeri sifatida javob bering yoki kerakli amalni bajaring." }
    ]);
    
    const response = await result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return { text: "", toolCalls: functionCalls };
    }

    return { text: response.text() };
  } catch (error) {
    console.error("Gemini Audio error:", error);
    return { text: "Ovozli xabarni qayta ishlashda xatolik yuz berdi." };
  }
}
