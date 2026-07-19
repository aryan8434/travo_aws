import ChatSession from "../models/ChatSession.js";
import mongoose from "mongoose";
import { memoryStore } from "./saveChat.js";

/**
 * Retrieves the last N conversation messages for context memory
 * @param {string} sessionId Active chat session ID
 * @param {number} limit Number of messages to retrieve (Default: 8)
 */
export async function getChatHistory(sessionId, limit = 8) {
  if (!sessionId) return [];

  // Try fetching from MongoDB first if connected
  try {
    if (mongoose.connection.readyState === 1) {
      const session = await ChatSession.findOne({ sessionId }).lean();
      if (session && session.messages && session.messages.length > 0) {
        return session.messages.slice(-limit).map((m) => ({
          role: m.role === "llm" || m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }
  } catch (err) {
    console.warn("MongoDB getHistory warning (using memory cache):", err.message);
  }

  // Fallback to in-memory sliding window cache
  if (memoryStore.has(sessionId)) {
    const memHistory = memoryStore.get(sessionId) || [];
    return memHistory.slice(-limit).map((m) => ({
      role: m.role === "llm" || m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }

  return [];
}
