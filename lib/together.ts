import OpenAI from "openai";

const together = new OpenAI({
  apiKey: process.env.TOGETHER_AI_API_KEY || process.env.TOGETHER_API_KEY || "",
  baseURL: "https://api.together.xyz/v1",
});

const systemPrompt = `Siz "Hope Study" o'quv markazining aqlli va to'liq vakolatli menejerisiz.
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
Siz o'zbekcha nutqni (Whisper orqali olingan matnni) mukammal tushunasiz.
Har bir amalni bajargandan so'ng, nima qilganingizni tasdiqlang.`;

export const tools = [
  {
    type: "function",
    function: {
      name: "archive_student",
      description: "Talabani arxivga (ketganlar ro'yxatiga) olish.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Talaba ID-si" },
          reason: { type: "string", description: "Ketish sababi" }
        },
        required: ["id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_stats",
      description: "Davomat ma'lumotlarini va statistikasini olish.",
      parameters: {
        type: "object",
        properties: {
          groupId: { type: "string", description: "Guruh ID-si (ixtiyoriy)" },
          date: { type: "string", description: "Sana (ixtiyoriy, YYYY-MM-DD)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_staff_password",
      description: "Yangi xodim uchun avtomatik parol yaratish.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Xodim ismi" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_students",
      description: "Talabalar ro'yxatini olish.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Ism yoki telefon bo'yicha qidiruv" },
          groupId: { type: "string", description: "Guruh ID bo'yicha filtrlash" }
        }
      }
    }
  }
];

export async function askTogether(messages: any[]) {
  const response = await together.chat.completions.create({
    model: "meta-llama/Llama-3-70b-chat-hf",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    tools: tools as any,
    tool_choice: "auto",
  });

  return response.choices[0].message;
}

export async function transcribeAudio(audioBlob: Blob) {
  const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
  const response = await together.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
  });
  return response.text;
}
