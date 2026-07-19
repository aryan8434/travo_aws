import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Seed default test1234 account
export async function seedTestUser() {
  try {
    const exists = await User.findOne({ username: "test1234" });
    if (!exists) {
      await User.create({
        username: "test1234",
        password: "1234",
        wallet: 10000,
      });
      console.log("✅ Default test user 'test1234' (pass: 1234) seeded in MongoDB");
    }
  } catch (err) {
    console.warn("Test user seed warning:", err.message);
  }
}

// User Signup Endpoint (allows simple 4-digit passwords & simple usernames)
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 digits" });
    }

    const exists = await User.findOne({ username: cleanUsername });
    if (exists) {
      return res.status(400).json({ error: "Username already exists. Please login instead." });
    }

    const newUser = await User.create({
      username: cleanUsername,
      password: cleanPassword,
      wallet: 10000,
    });

    const token = jwt.sign(
      { userId: newUser._id, username: cleanUsername },
      process.env.JWT_SECRET || "supersecret123",
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token,
      user: {
        username: cleanUsername,
        walletBalance: 10000,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// User Login Endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(400).json({ error: "User not found. Check username or sign up." });
    }

    if (user.password !== cleanPassword) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || "supersecret123",
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        walletBalance: user.wallet || 10000,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
