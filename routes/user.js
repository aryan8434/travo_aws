import express from "express";
import User from "../models/User.js";
import auth from "../utils/auth.js";

const router = express.Router();

function createOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCancellationFeePercent(createdAt) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - created) / (1000 * 60 * 60);

  if (elapsedHours <= 4) return 20;
  if (elapsedHours <= 12) return 60;
  return 100;
}

/* Get wallet + bookings */
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select(
    "username wallet bookings paymentMethods walletHistory",
  );
  res.json({
    username: user.username,
    wallet: user.wallet,
    bookings: user.bookings,
    paymentMethods: user.paymentMethods || [],
    walletHistory: user.walletHistory || [],
  });
});

/* Add booking + update wallet */
router.post("/book", auth, async (req, res) => {
  const { booking } = req.body;

  if (!booking || typeof booking !== "object") {
    return res.status(400).json({ error: "Booking payload is required" });
  }

  const price = Number(booking.price) || 0;

  // check wallet balance server-side to avoid negative balances
  const user = await User.findById(req.userId).select("wallet");
  if (!user) return res.status(404).json({ error: "User not found" });

  const normalizedLocation =
    typeof booking.location === "string" && booking.location.trim()
      ? booking.location.trim()
      : "Location not allowed";

  const bookingBase = {
    ...booking,
    orderId: booking.orderId || createOrderId(),
    location: normalizedLocation,
    createdAt: new Date(),
  };

  if (user.wallet < price) {
    const failedBooking = {
      ...bookingBase,
      status: "failed",
      failureReason: "Insufficient wallet balance",
    };

    await User.findByIdAndUpdate(req.userId, {
      $push: { bookings: failedBooking },
    });

    return res.status(400).json({
      error: "Insufficient wallet balance",
      status: "failed",
      booking: failedBooking,
    });
  }

  const successBooking = {
    ...bookingBase,
    status: "success",
  };

  await User.findByIdAndUpdate(req.userId, {
    $push: {
      bookings: successBooking,
      walletHistory: {
        type: "booking_charge",
        amount: -price,
        description: `Booking charge for ${successBooking.name || "booking"}`,
        orderId: successBooking.orderId,
        createdAt: new Date(),
      },
    },
    $inc: { wallet: -price },
  });

  res.json({ success: true, status: "success", booking: successBooking });
});

/* Add money to wallet (optional) */
router.post("/wallet/add", auth, async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  let normalizedMethod = null;

  if (paymentMethod && typeof paymentMethod === "object") {
    const type =
      paymentMethod.type === "credit" ||
      paymentMethod.type === "debit" ||
      paymentMethod.type === "upi"
        ? paymentMethod.type
        : null;

    if (type === "upi") {
      const upiId =
        typeof paymentMethod.upiId === "string"
          ? paymentMethod.upiId.trim()
          : "";

      if (upiId) {
        normalizedMethod = {
          type,
          label: upiId,
          upiId,
          savedAt: new Date(),
        };
      }
    }

    if (type === "credit" || type === "debit") {
      const last4 =
        typeof paymentMethod.last4 === "string" ? paymentMethod.last4 : "";
      const label =
        typeof paymentMethod.label === "string" && paymentMethod.label.trim()
          ? paymentMethod.label.trim()
          : `${type.toUpperCase()} •••• ${last4 || "0000"}`;

      normalizedMethod = {
        type,
        label,
        last4: last4 || "0000",
        savedAt: new Date(),
      };
    }
  }

  const updateOps = {
    $inc: { wallet: parsedAmount },
  };

  const walletHistoryEntry = {
    type: "topup",
    amount: parsedAmount,
    description: `Wallet top-up via ${normalizedMethod?.type || "manual"}`,
    paymentMethod: normalizedMethod || null,
    createdAt: new Date(),
  };

  if (normalizedMethod) {
    updateOps.$push = {
      paymentMethods: normalizedMethod,
      walletHistory: walletHistoryEntry,
    };
  } else {
    updateOps.$push = {
      walletHistory: walletHistoryEntry,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(req.userId, updateOps, {
    new: true,
  }).select("wallet paymentMethods walletHistory");

  res.json({
    success: true,
    wallet: updatedUser?.wallet ?? 0,
    paymentMethods: updatedUser?.paymentMethods || [],
    walletHistory: updatedUser?.walletHistory || [],
  });
});

router.post("/bookings/cancel", auth, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "orderId is required" });
  }

  const user = await User.findById(req.userId).select(
    "wallet bookings walletHistory",
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  const bookingIndex = user.bookings.findIndex((b) => b.orderId === orderId);
  if (bookingIndex === -1) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const booking = user.bookings[bookingIndex];

  if (booking.status !== "success") {
    return res
      .status(400)
      .json({ error: "Only successful bookings can be cancelled" });
  }

  const price = Number(booking.price) || 0;
  const feePercent = getCancellationFeePercent(booking.createdAt);
  const feeAmount = Number(((price * feePercent) / 100).toFixed(2));
  const refundAmount = Number((price - feeAmount).toFixed(2));

  const updatedBooking = {
    ...booking,
    status: "cancelled",
    cancellation: {
      cancelledAt: new Date(),
      feePercent,
      feeAmount,
      refundAmount,
    },
  };

  user.bookings[bookingIndex] = updatedBooking;
  user.wallet = Number((user.wallet + refundAmount).toFixed(2));

  user.walletHistory.push({
    type: "refund",
    amount: refundAmount,
    description: `Refund for cancelled booking ${booking.name || "booking"} (fee ${feePercent}%)`,
    orderId,
    createdAt: new Date(),
  });

  await user.save();

  return res.json({
    success: true,
    wallet: user.wallet,
    booking: updatedBooking,
    walletHistory: user.walletHistory,
    refundAmount,
    feePercent,
    feeAmount,
  });
});

export default router;
