import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const groqSystemPrompt = `Siz Hope Study o'quv markazi AI yordamchisisiz. 
Faqat o'zbek tilida javob bering. 
So'm valyutasidan foydalaning. 
Professional va xushmuomala bo'ling.`;

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
