import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function callGemini(systemPrompt, messages) {
    const model = genAI.getGenerativeModel({
        model: "gemini-pro",

        generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
        },
    });

    const prompt = `
${systemPrompt}

Conversation:
${messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}