import ChatSession from "../models/ChatSession.js";

export async function getChatHistory(sessionId, limit = 6) {
    const session = await ChatSession.findOne({ sessionId }).lean();

    if (!session || !session.messages) return [];

    return session.messages.slice(-limit).map((m) => ({
        role: m.role === "llm" ? "assistant" : "user",
        content: m.content,
    }));
}