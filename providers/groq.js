import groq from "../groqClient.js";

export async function callGroq(systemPrompt, messages) {
    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return completion.choices[0].message.content;
}