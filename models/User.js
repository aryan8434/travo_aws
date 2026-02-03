import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,

  wallet: { type: Number, default: 0 },
  bookings: { type: Array, default: [] },

  // link chat sessions to user
  chatSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" }],
});

export default mongoose.model("User", UserSchema);
