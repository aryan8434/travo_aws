import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "llm"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    activeCity: {
      type: String,
      default: null,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("ChatSession", ChatSessionSchema);
