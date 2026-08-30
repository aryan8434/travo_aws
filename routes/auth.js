import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

/**
 * JWT secret is required — no insecure fallback. index.js also guards this on boot.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not configured (min 16 chars)");
  }
  return secret;
}

function issueToken(user) {
  return jwt.sign(
    { userId: user._id, username: user.username },
    getJwtSecret(),
    { expiresIn: "30d" },
  );
}

// Seed default test account (hashed password).
export async function seedTestUser() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("Skipping test user seed — MongoDB not connected");
    return;
  }
  try {
    const username = "test1234";
    const existing = await User.findOne({ username });
    const passwordHash = await User.hashPassword(
      process.env.SEED_TEST_PASSWORD || "test12345",
    );

    if (!existing) {
      await User.create({ username, passwordHash, wallet: 10000 });
      console.log("✅ Default test user 'test1234' seeded (bcrypt-hashed password)");
    } else if (!existing.passwordHash) {
      // Migrate a legacy plaintext record.
      existing.passwordHash = passwordHash;
      existing.set("password", undefined);
      await existing.save();
      console.log("✅ Migrated legacy 'test1234' record to hashed password");
    }
  } catch (err) {
    console.warn("Test user seed warning:", err.message);
  }
}

// User Signup Endpoint
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 32) {
      return res.status(400).json({ error: "Username must be 3-32 characters" });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res
        .status(400)
        .json({ error: "Username may only contain letters, numbers, and _ . -" });
    }

    if (cleanPassword.length < 6 || cleanPassword.length > 128) {
      return res.status(400).json({ error: "Password must be 6-128 characters" });
    }

    const exists = await User.findOne({ username: cleanUsername });
    if (exists) {
      return res
        .status(400)
        .json({ error: "Username already exists. Please login instead." });
    }

    const passwordHash = await User.hashPassword(cleanPassword);
    const newUser = await User.create({
      username: cleanUsername,
      passwordHash,
      wallet: 10000,
    });

    res.json({
      success: true,
      token: issueToken(newUser),
      user: { username: cleanUsername, walletBalance: 10000 },
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

    // Generic message — do not disclose whether the username exists.
    const invalid = () =>
      res.status(400).json({ error: "Invalid username or password" });

    if (!user || !user.passwordHash) return invalid();

    const ok = await user.verifyPassword(cleanPassword);
    if (!ok) return invalid();

    res.json({
      success: true,
      token: issueToken(user),
      user: {
        username: user.username,
        walletBalance: user.wallet ?? 10000,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
