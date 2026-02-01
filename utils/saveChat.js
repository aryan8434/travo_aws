import ChatSession from "../models/ChatSession.js";

export async function saveMessage(sessionId, role, content) {
    const session = await ChatSession.findOneAndUpdate({ sessionId }, {
        $push: {
            messages: {
                $each: [{ role, content }],
                $slice: -20, // keep last 20 only
            },
        },
    }, { upsert: true, new: true }, );

    return session;
}