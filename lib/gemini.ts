import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
          type: SchemaType.OBJECT,
          properties: {
            search: { type: SchemaType.STRING, description: "Ism yoki telefon bo'yicha qidiruv" },
            groupId: { type: SchemaType.STRING, description: "Guruh ID bo'yicha filtrlash" }
          }
        }
      },
      {
        name: "add_student",
        description: "Yangi talaba qo'shish (Faqat Admin uchun).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "Ism-sharif" },
            phone: { type: SchemaType.STRING, description: "Telefon raqami" },
            groupId: { type: SchemaType.STRING, description: "Guruh ID" },
            basePrice: { type: SchemaType.NUMBER, description: "Oylik to'lov summasi" }
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
          type: SchemaType.OBJECT,
          properties: {
            topic: { type: SchemaType.STRING, description: "Dars mavzusi" },
            level: { type: SchemaType.STRING, description: "O'quvchilar darajasi" }
          },
          required: ["topic"]
        }
      },
      {
        name: "evaluate_homework",
        description: "Uy vazifasini tahlil qilish va baholash (Ustoz va O'quvchi uchun).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content: { type: SchemaType.STRING, description: "Uy vazifasi matni yoki tahlil uchun ma'lumot" }
          },
          required: ["content"]
        }
      },
      {
        name: "reschedule_lesson",
        description: "Dars vaqtini o'zgartirish.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            groupId: { type: SchemaType.STRING, description: "Guruh ID" },
            newTime: { type: SchemaType.STRING, description: "Yangi dars vaqti" }
          },
          required: ["groupId", "newTime"]
        }
      },
      {
        name: "explain_topic",
        description: "Mavzuni qaytadan tushuntirib berish (O'quvchilar uchun).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topic: { type: SchemaType.STRING, description: "Tushuntirilishi kerak bo'lgan mavzu nomi" }
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

export async function askGemini(prompt: string): Promise<{ text: string, toolCalls?: any[] }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      tools: tools as any
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return { text: "", toolCalls: functionCalls };
    }

    return { text: response.text() };
  } catch (error) {
    console.error("Gemini AI error:", error);
    return { text: "Uzr, hozirda javob bera olmayman. Iltimos, birozdan so'ng qayta urinib ko'ring." };
  }
}

/**
 * Tool natijasini AI-ga qaytarish va yakuniy javobni olish
 */
export async function sendToolResult(prompt: string, toolResults: any[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      tools: tools as any
    });

    const chat = model.startChat();
    // Birinchi so'rovni yuboramiz
    await chat.sendMessage(prompt);
    
    // Tool natijalarini yuboramiz
    const result = await chat.sendMessage([
      {
        functionResponse: {
          name: toolResults[0].name,
          response: { content: toolResults[0].result }
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Gemini Tool Result error:", error);
    return "Amalni bajarishda xatolik yuz berdi, lekin ma'lumotlar bazada yangilangan bo'lishi mumkin.";
  }
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
