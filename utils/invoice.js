import crypto from "crypto";

/**
 * TravoAI charges a flat ₹1 confirmation fee through Razorpay for every booking
 * and wallet top-up (a token gateway charge — real payment, real signature),
 * while the *invoice* is raised for the full nominal value of the item.
 *
 * This module builds that invoice. It is a billing document only — it never
 * affects what Razorpay actually charges.
 */

export const TOKEN_PAYMENT_PAISE = 100; // ₹1
export const TOKEN_PAYMENT_RUPEES = 1;

const inr = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function invoiceNumber(seed) {
  const h = crypto.createHash("sha1").update(String(seed)).digest("hex").slice(0, 6).toUpperCase();
  const yy = new Date().getUTCFullYear().toString().slice(-2);
  return `TRV/${yy}/${h}`;
}

/**
 * @param {object} opts
 * @param {number} opts.nominalAmount   full value of the item/top-up in ₹
 * @param {string} opts.description     line-item label
 * @param {string} [opts.kind]          "booking" | "wallet"
 * @param {string} [opts.paymentId]     Razorpay payment id (seeds the invoice no.)
 * @param {string} [opts.orderId]       Razorpay order id
 * @param {string} [opts.customer]      customer name / username
 */
export function buildInvoice({
  nominalAmount,
  description = "Travel booking",
  kind = "booking",
  paymentId = "",
  orderId = "",
  customer = "Guest",
}) {
  const nominal = Math.max(0, Math.round(Number(nominalAmount) || 0));

  // Notional split of the nominal value (GST @5% on travel, inclusive).
  const taxable = Math.round((nominal / 1.05) * 100) / 100;
  const gst = Math.round((nominal - taxable) * 100) / 100;

  const number = invoiceNumber(paymentId || orderId || `${description}-${nominal}-${Date.now()}`);
  const now = new Date();

  return {
    invoice_no: number,
    issued_at: now.toISOString(),
    issued_at_display: now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    customer,
    kind,
    currency: "INR",
    line_items: [
      { label: description, amount: taxable },
      { label: "GST (5%, inclusive)", amount: gst },
    ],
    nominal_amount: nominal,
    nominal_amount_display: inr(nominal),
    amount_charged: TOKEN_PAYMENT_RUPEES,
    amount_charged_display: inr(TOKEN_PAYMENT_RUPEES),
    settlement_note: `${inr(nominal)} settled against TravoAI travel credit. A flat ${inr(
      TOKEN_PAYMENT_RUPEES,
    )} confirmation fee was charged via Razorpay${paymentId ? ` (${paymentId})` : ""}.`,
    payment_id: paymentId,
    order_id: orderId,
    gateway: "Razorpay",
  };
}
