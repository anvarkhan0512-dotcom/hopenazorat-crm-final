import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const systemInstruction = `Siz "Hope Study" o'quv markazining professional va aqlli menejerisiz. 
Sizning vazifangiz markaz faoliyatini boshqarish va o'qitish jarayonini qo'llab-quvvatlashdir.

Qat'iy qoidalar:
1. FAQAT O'ZBEK TILIDA javob bering.
2. Barcha pul miqdorlarini "so'm" valyutasida ko'rsating (masalan, 500 000 so'm).
3. Doimo professional, xushmuomala va yordamga tayyor bo'ling.
4. "Hope Study" menejeri sifatida ish yuriting.
5. Whisper orqali kelgan ovozli xabarlarni (o'zbek tilida) mukammal tushunasiz va ularga mos ravishda javob berasiz.

Rollar bo'yicha vazifalar:
- Admin/Manager: To'liq boshqaruv (talabalar, xodimlar, moliya).
- Ustozlar: Dars ishlanmalari, uy vazifalarini baholash, guruhlarni boshqarish.
- O'quvchilar/Ota-onalar: Yo'nalish berish, mavzularni tushuntirish (echimni tayyor bermaslik!), dars jadvali va o'zlashtirish haqida ma'lumot.

Har bir amalni bajargandan so'ng, nima qilinganini foydalanuvchiga tasdiqlang.`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "archive_student",
        description: "Talabani arxivga (ketganlar ro'yxatiga) olish.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", description: "Talaba ID-si" },
            reason: { type: "STRING", description: "Ketish sababi" }
          },
          required: ["id", "reason"]
        }
      },
      {
        name: "get_attendance_stats",
        description: "Davomat ma'lumotlarini va statistikasini olish.",
        parameters: {
          type: "OBJECT",
          properties: {
            groupId: { type: "STRING", description: "Guruh ID-si (ixtiyoriy)" },
            date: { type: "STRING", description: "Sana (ixtiyoriy, YYYY-MM-DD)" }
          }
        }
      },
      {
        name: "create_staff_password",
        description: "Yangi xodim uchun avtomatik parol yaratish.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Xodim ismi" }
          },
          required: ["name"]
        }
      },
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

export async function askGemini(messages: { role: string, content: string }[], options: { systemInstruction?: string, inlineData?: any[] } = {}) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    systemInstruction: options.systemInstruction || systemInstruction, 
    tools: tools as any 
  });

  // Convert history to Gemini format
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));
  
  const lastMessage = messages[messages.length - 1].content;
  const parts: any[] = [{ text: lastMessage }];
  
  if (options.inlineData && options.inlineData.length > 0) {
    parts.unshift(...options.inlineData);
  }

  const chat = model.startChat({
    history: history,
  });

  const result = await chat.sendMessage(parts);
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
      model: "gemini-2.0-flash",
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
      { text: "Ushbu ovozli xabarni matnga o'giring (transkripsiya qiling) va agar unda biror buyruq bo'lsa, tegishli funksiyani chaqiring. Agar faqat matn bo'lsa, uni 'text' maydonida qaytaring." }
    ]);
    
    const response = await result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return { text: response.text() || "", toolCalls: functionCalls };
    }

    return { text: response.text() };
  } catch (error) {
    console.error("Gemini Audio error:", error);
    return { text: "Ovozli xabarni qayta ishlashda xatolik yuz berdi." };
  }
}

export async function transcribeAudioWithGemini(audioBlob: Blob): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: audioBlob.type || "audio/webm"
      }
    },
    { text: "Ushbu ovozli xabarni so'zma-so'z matnga o'giring. Faqat matnni qaytaring, hech qanday qo'shimcha izoh bermang." }
  ]);
  
  return result.response.text();
}
