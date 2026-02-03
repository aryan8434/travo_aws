import express from "express";
import User from "../models/User.js";
import auth from "../utils/auth.js";

const router = express.Router();

/* Get wallet + bookings */
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select(
    "username wallet bookings",
  );
  res.json({
    username: user.username,
    wallet: user.wallet,
    bookings: user.bookings,
  });
});

/* Add booking + update wallet */
router.post("/book", auth, async (req, res) => {
  const { booking } = req.body;

  const price = Number(booking.price) || 0;

  // check wallet balance server-side to avoid negative balances
  const user = await User.findById(req.userId).select("wallet");
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.wallet < price) {
    return res.status(400).json({ error: "Insufficient wallet balance" });
  }

  await User.findByIdAndUpdate(req.userId, {
    $push: { bookings: booking },
    $inc: { wallet: -price },
  });

  res.json({ success: true });
});

/* Add money to wallet (optional) */
router.post("/wallet/add", auth, async (req, res) => {
  const { amount } = req.body;

  await User.findByIdAndUpdate(req.userId, {
    $inc: { wallet: amount },
  });

  res.json({ success: true });
});

export default router;
