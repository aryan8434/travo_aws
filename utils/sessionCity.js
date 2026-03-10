import ChatSession from "../models/ChatSession.js";

export async function getSessionCity(sessionId) {
  if (!sessionId) return null;

  const session = await ChatSession.findOne({ sessionId })
    .select("activeCity")
    .lean();

  return session?.activeCity || null;
}

export async function setSessionCity(sessionId, city) {
  if (!sessionId || !city) return null;

  const session = await ChatSession.findOneAndUpdate(
    { sessionId },
    { $set: { activeCity: city } },
    { upsert: true, new: true },
  ).lean();

  return session?.activeCity || null;
}
