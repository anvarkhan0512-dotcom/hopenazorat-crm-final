import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const systemInstruction = `Siz "Hope Study" o'quv markazining aqlli va xushmuomala menejerisiz. 
Sizning vazifangiz markaz haqidagi savollarga javob berish, talabalarga yordam berish va o'quv markazi xizmatlarini taklif qilishdir.
Sizning javoblaringiz doimo o'zbek tilida, qisqa va mazmunli bo'lishi kerak. 
Agar sizdan markaz haqida umumiy ma'lumot so'rashsa: 
- Manzil: Toshkent sh., Chilonzor tumani
- Tel: +998 90 123 45 67
- Kurslar: Matematika, Ingliz tili, IT, Mental arifmetika.`;

export async function askGemini(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Uzr, hozirda javob bera olmayman. Iltimos, birozdan so'ng qayta urinib ko'ring.";
  }
}

/**
 * Ovozli xabarni matnga aylantirish uchun Gemini 1.5-flash modeli 
 * audio fayllarni ham qabul qila oladi.
 */
export async function processVoiceWithGemini(audioData: Buffer, mimeType: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: mimeType
        }
      },
      { text: "Ushbu ovozli xabarni eshitib, unga Hope Study menejeri sifatida javob bering." }
    ]);
    
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Audio error:", error);
    return "Ovozli xabarni qayta ishlashda xatolik yuz berdi.";
  }
}
