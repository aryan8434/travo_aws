import mongoose from "mongoose";

export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 3000
        });
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.warn("⚠️ MongoDB Atlas connection skipped (using in-memory fallback):", err.message);
        // Do not crash the application process
    }
}