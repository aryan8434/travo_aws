import groq from "./backend/groqClient.js";

export async function extractIntent(userMsg) {
  const prompt = `
You are an intent classifier for a travel app.

User message: "${userMsg}"

Return ONLY valid JSON.

Schema:
{
  "type": "hotel_search | police | general",
  "budget": number | null
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return JSON.parse(completion.choices[0].message.content);
}
