import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import User from "../models/User.js";
import auth from "../utils/auth.js";
import { buildInvoice, TOKEN_PAYMENT_PAISE } from "../utils/invoice.js";

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const paymentsConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
const razorpay = paymentsConfigured
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const MAX_BOOKING_PRICE = 5_000_000; // ₹50 lakh sanity ceiling

function createOrderId() {
  return `order_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function getCancellationFeePercent(createdAt) {
  const elapsedHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (elapsedHours <= 4) return 20;
  if (elapsedHours <= 12) return 60;
  return 100;
}

/**
 * Verify a Razorpay payment server-side (signature + captured status + amount).
 */
async function verifyRazorpayPayment({ order_id, payment_id, signature }, expectedAmountPaise) {
  if (!paymentsConfigured) throw new Error("Payments not configured");
  if (!order_id || !payment_id || !signature) throw new Error("Missing payment fields");

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid payment signature");
  }

  const payment = await razorpay.payments.fetch(payment_id);
  if (!payment || payment.order_id !== order_id) throw new Error("Payment/order mismatch");
  if (!["captured", "authorized"].includes(payment.status)) throw new Error("Payment not captured");
  if (expectedAmountPaise != null && Number(payment.amount) !== Math.round(expectedAmountPaise)) {
    throw new Error("Payment amount mismatch");
  }
  return payment;
}

/* Get wallet + bookings */
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select(
    "username wallet bookings paymentMethods walletHistory",
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    username: user.username,
    wallet: user.wallet,
    bookings: user.bookings,
    paymentMethods: user.paymentMethods || [],
    walletHistory: user.walletHistory || [],
  });
});

/* Add booking + debit wallet (server-authoritative, atomic) */
router.post("/book", auth, async (req, res) => {
  const { booking } = req.body;
  if (!booking || typeof booking !== "object") {
    return res.status(400).json({ error: "Booking payload is required" });
  }

  const price = Number(booking.price);
  if (!Number.isFinite(price) || price < 0 || price > MAX_BOOKING_PRICE) {
    return res.status(400).json({ error: "Invalid booking price" });
  }

  const normalizedLocation =
    typeof booking.location === "string" && booking.location.trim()
      ? booking.location.trim().slice(0, 120)
      : "Location not provided";

  const bookingBase = {
    ...booking,
    price,
    orderId: booking.orderId || createOrderId(),
    location: normalizedLocation,
    createdAt: new Date(),
  };

  // Atomic debit: only succeeds if wallet currently covers the price.
  const updated = await User.findOneAndUpdate(
    { _id: req.userId, wallet: { $gte: price } },
    {
      $inc: { wallet: -price },
      $push: {
        bookings: { ...bookingBase, status: "success" },
        walletHistory: {
          type: "booking_charge",
          amount: -price,
          description: `Booking charge for ${bookingBase.name || "booking"}`,
          orderId: bookingBase.orderId,
          createdAt: new Date(),
        },
      },
    },
    { new: true },
  ).select("wallet");

  if (!updated) {
    const failedBooking = { ...bookingBase, status: "failed", failureReason: "Insufficient wallet balance" };
    await User.findByIdAndUpdate(req.userId, { $push: { bookings: failedBooking } });
    return res.status(400).json({ error: "Insufficient wallet balance", status: "failed", booking: failedBooking });
  }

  res.json({
    success: true,
    status: "success",
    booking: { ...bookingBase, status: "success" },
    wallet: updated.wallet,
  });
});

/* Wallet top-up.
   Any amount can be added; Razorpay only charges the flat ₹1 confirmation fee.
   We verify that ₹1 token payment, then credit the full requested amount. */
router.post("/wallet/topup", auth, async (req, res) => {
  const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const rupees = Math.round(Number(amount));

  if (!Number.isFinite(rupees) || rupees <= 0 || rupees > 1_000_000) {
    return res.status(400).json({ error: "Amount must be between ₹1 and ₹10,00,000" });
  }
  if (!paymentsConfigured) {
    return res.status(503).json({ error: "Payments are not configured on this server" });
  }

  try {
    // Expect exactly the ₹1 token charge — not the nominal top-up value.
    await verifyRazorpayPayment(
      { order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature },
      TOKEN_PAYMENT_PAISE,
    );
  } catch (err) {
    return res.status(400).json({ error: `Top-up rejected: ${err.message}` });
  }

  const invoice = buildInvoice({
    nominalAmount: rupees,
    description: `TravoAI Wallet top-up`,
    kind: "wallet",
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    customer: req.username || "Guest",
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.userId,
    {
      $inc: { wallet: rupees },
      $push: {
        walletHistory: {
          type: "topup",
          amount: rupees,
          description: `Wallet top-up ₹${rupees.toLocaleString("en-IN")} (₹1 charged via Razorpay ${razorpay_payment_id})`,
          orderId: razorpay_order_id,
          invoice,
          createdAt: new Date(),
        },
      },
    },
    { new: true },
  ).select("wallet walletHistory");

  res.json({
    success: true,
    wallet: updatedUser?.wallet ?? 0,
    credited: rupees,
    invoice,
    walletHistory: updatedUser?.walletHistory || [],
  });
});

/* Cancel booking + partial refund */
router.post("/bookings/cancel", auth, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const user = await User.findById(req.userId).select("wallet bookings walletHistory");
  if (!user) return res.status(404).json({ error: "User not found" });

  const idx = user.bookings.findIndex((b) => b.orderId === orderId);
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });

  const booking = user.bookings[idx];
  if (booking.status !== "success") {
    return res.status(400).json({ error: "Only successful bookings can be cancelled" });
  }

  const price = Number(booking.price) || 0;
  const feePercent = getCancellationFeePercent(booking.createdAt);
  const feeAmount = Number(((price * feePercent) / 100).toFixed(2));
  const refundAmount = Number((price - feeAmount).toFixed(2));

  const updatedBooking = {
    ...booking,
    status: "cancelled",
    cancellation: { cancelledAt: new Date(), feePercent, feeAmount, refundAmount },
  };

  user.bookings[idx] = updatedBooking;
  user.wallet = Number((user.wallet + refundAmount).toFixed(2));
  user.walletHistory.push({
    type: "refund",
    amount: refundAmount,
    description: `Refund for cancelled booking ${booking.name || "booking"} (fee ${feePercent}%)`,
    orderId,
    createdAt: new Date(),
  });

  await user.save();
  res.json({ success: true, wallet: user.wallet, booking: updatedBooking, walletHistory: user.walletHistory, refundAmount, feePercent, feeAmount });
});

export default router;
