import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true }, // 'user' or 'bot'
    text: { type: String },
    type: { type: String },
    results: { type: Array, default: [] },
    booking: { type: Object, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserChatSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserChat", UserChatSchema);
