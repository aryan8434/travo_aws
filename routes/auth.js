import express from "express";
// import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Username validation endpoint for live checks (frontend can call on input)
// Query param: q (partial or full username)
router.get("/validate-username", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    // Count letters and digits
    const letters = (q.match(/[A-Za-z]/g) || []).join("");
    const digits = (q.match(/[0-9]/g) || []).join("");

    const letterCount = letters.length;
    const digitCount = digits.length;

    // Check availability (exact match)
    const exists = q ? await User.findOne({ username: q }).lean() : null;

    // Provide some suggestions / matches that start with q
    const suggestions = q
      ? await User.find({ username: { $regex: `^${q}`, $options: "i" } })
          .limit(5)
          .select("username -_id")
      : [];

    res.json({
      q,
      letterCount,
      digitCount,
      letters, // raw letters found
      digits, // raw digits found
      meets: {
        letters: letterCount >= 4,
        digits: digitCount >= 2,
      },
      available: !exists,
      suggestions: suggestions.map((s) => s.username),
    });
  } catch (err) {
    console.error("validate-username error:", err.message);
    res.status(500).json({ error: "Validation failed" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation rules
    const letterCount = (String(username).match(/[A-Za-z]/g) || []).length;
    const digitCount = (String(username).match(/[0-9]/g) || []).length;

    if (letterCount < 4 || digitCount < 2) {
      return res.status(400).json({
        error: "Username must contain at least 4 letters and 2 numbers",
        details: { letterCount, digitCount },
      });
    }

    // Password rules: at least 4 letters and 1 digit
    const passLetterCount = (String(password).match(/[A-Za-z]/g) || []).length;
    const passDigitCount = (String(password).match(/[0-9]/g) || []).length;
    if (passLetterCount < 4 || passDigitCount < 1) {
      return res.status(400).json({
        error: "Password must contain at least 4 letters and 1 number",
        details: { passLetterCount, passDigitCount },
      });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "User already exists, login" });
    }

    // ❌ bcrypt removed for testing
    await User.create({ username, password });
    res.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid username, create new one" });
    }

    // ❌ bcrypt removed
    // const ok = await bcrypt.compare(password, user.password);
    // if (!ok) {
    //   return res.status(400).json({ error: "Invalid credentials" });
    // }

    // ✅ raw password check
    if (password !== user.password) {
      return res.status(400).json({ error: "Invalid password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing when signing token");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
