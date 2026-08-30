import axios from 'axios';
import { saveTransaction, saveBooking, getWalletBalance, deductWalletBalance } from './storage';

/**
 * Payment flow — LIVE Razorpay, strict server-side verification.
 *
 * Every gateway charge is a flat ₹1 confirmation fee. The booking / wallet
 * credit is for the FULL nominal amount, and a GST invoice is raised for that
 * full value (see utils/invoice.js on the server). Payment always happens
 * first — the booking is only created after the server verifies the payment.
 *
 * If the TravoAI wallet balance already covers the item, it is paid from the
 * wallet with no gateway step (and no ₹1 charge).
 */

const TOKEN_CHARGE = 1; // ₹

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Local invoice for the wallet-balance path (no gateway round-trip). */
function localInvoice({ nominalAmount, description, kind, customer }) {
  const nominal = Math.max(0, Math.round(Number(nominalAmount) || 0));
  const taxable = Math.round((nominal / 1.05) * 100) / 100;
  const gst = Math.round((nominal - taxable) * 100) / 100;
  const now = new Date();
  return {
    invoice_no: `TRV/${String(now.getFullYear()).slice(-2)}/W${Math.floor(100000 + Math.random() * 899999)}`,
    issued_at: now.toISOString(),
    issued_at_display: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    customer: customer || 'Guest',
    kind: kind || 'booking',
    currency: 'INR',
    line_items: [
      { label: description || 'Travel booking', amount: taxable },
      { label: 'GST (5%, inclusive)', amount: gst },
    ],
    nominal_amount: nominal,
    nominal_amount_display: rupees(nominal),
    amount_charged: 0,
    amount_charged_display: rupees(0),
    settlement_note: `${rupees(nominal)} settled in full from your TravoAI Wallet balance.`,
    gateway: 'TravoAI Wallet',
  };
}

export async function initializePayment(item, onSuccess, onError) {
  const itemTitle = item.title || item.name || item.operator || item.airline || 'Travel Booking';
  const priceInRupees = Number(item.price_inr || item.price || item.price_per_night_inr || 1000);
  const itemType =
    item.package_id === 'WALLET_TOPUP'
      ? 'wallet'
      : item.package_id
        ? 'package'
        : item.bus_id || item.operator
          ? 'bus'
          : item.flight_id || item.airline
            ? 'flight'
            : 'hotel';

  const uniqueTxnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
  const kind = itemType === 'wallet' ? 'wallet' : 'booking';
  const description = itemType === 'wallet' ? `TravoAI Wallet top-up` : itemTitle;

  /* 1 — Wallet balance path (internal balance, no gateway, no ₹1 charge) */
  if (itemType !== 'wallet') {
    const bal = getWalletBalance();
    if (bal >= priceInRupees) {
      const remaining = deductWalletBalance(priceInRupees);
      const invoice = localInvoice({ nominalAmount: priceInRupees, description, kind });
      const booking = buildBooking(uniqueTxnId, itemTitle, itemType, priceInRupees, `pay_wallet_${Date.now()}`, `ord_wallet_${Date.now()}`, item, {
        paid_via_wallet: true,
        remaining_wallet_balance: remaining,
        payment_method: 'TravoAI Wallet',
        charged_amount: 0,
        invoice,
        details: `Paid in full from TravoAI Wallet (Remaining: ${rupees(remaining)})`,
      });
      saveTransaction(booking._txn);
      saveBooking(booking._booking);
      if (onSuccess) onSuccess(booking._booking);
      return;
    }
  }

  /* 2 — ₹1 confirmation charge, invoice for the full value */
  try {
    const orderRes = await axios.post('/api/create-order', {
      nominalAmount: priceInRupees,
      description,
      kind,
      receipt: `rcpt_${Date.now()}`,
    });

    if (!orderRes.data?.success || !orderRes.data.order_id) {
      throw new Error(orderRes.data?.message || 'Could not create a payment order');
    }
    const { order_id, amount, currency, key_id, test_mode } = orderRes.data;

    /* 2a — Test mode: confirm the ₹1 step without opening a gateway */
    if (test_mode) {
      const verifyRes = await axios.post('/api/verify-payment', {
        razorpay_order_id: order_id,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'test',
        notes: orderRes.data._notes,
        customer: 'Guest',
      });
      if (!verifyRes.data?.success) throw new Error(verifyRes.data?.message || 'Confirmation failed');
      finalizeSuccess(verifyRes.data, `pay_test_${Date.now()}`, order_id);
      return;
    }

    if (!key_id) throw new Error('Payment gateway is not configured');

    const sdkOk = await loadRazorpayScript();
    if (!sdkOk || !window.Razorpay) throw new Error('Could not load the Razorpay checkout');

    const rzp = new window.Razorpay({
      key: key_id,
      order_id,
      amount,
      currency: currency || 'INR',
      name: 'TravoAI Travel Concierge',
      description: `₹${TOKEN_CHARGE} confirmation charge — ${itemTitle} (${rupees(priceInRupees)} value)`,
      theme: { color: '#0ea5e9' },
      handler: async (response) => {
        try {
          const verifyRes = await axios.post('/api/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (!verifyRes.data?.success) return failure(verifyRes.data?.message || 'Payment verification failed');
          finalizeSuccess(verifyRes.data, response.razorpay_payment_id, response.razorpay_order_id);
        } catch (err) {
          failure(err.response?.data?.message || err.message || 'Payment verification failed');
        }
      },
      modal: {
        ondismiss: () => failure('Payment cancelled'),
      },
    });

    rzp.on('payment.failed', (resp) => failure(resp.error?.description || 'Payment failed'));
    rzp.open();
  } catch (err) {
    failure(err.response?.data?.message || err.message || 'Checkout error');
  }

  function finalizeSuccess(verifyData, paymentId, orderId) {
    const invoice = verifyData?.invoice || localInvoice({ nominalAmount: priceInRupees, description, kind });

    if (itemType === 'wallet') {
      // Credit the full requested amount; only ₹1 was actually charged.
      if (onSuccess) onSuccess({ credited: priceInRupees, invoice, payment_id: paymentId });
      return;
    }

    const b = buildBooking(uniqueTxnId, itemTitle, itemType, priceInRupees, paymentId, orderId, item, {
      payment_method: verifyData?.test_mode ? 'TravoAI Test Mode' : 'Razorpay',
      charged_amount: verifyData?.test_mode ? 0 : TOKEN_CHARGE,
      invoice,
      details: item.days ? `${item.days} Days Package` : item.airline || item.operator || 'Confirmed Ticket',
    });
    saveTransaction(b._txn);
    saveBooking(b._booking);
    if (onSuccess) onSuccess(b._booking);
  }

  function failure(reason) {
    const failed = recordFailedBooking(uniqueTxnId, itemTitle, itemType, priceInRupees, reason);
    if (onError) onError({ message: reason, booking: failed });
  }
}

function buildBooking(txnId, itemTitle, itemType, price, paymentId, orderId, item, extra = {}) {
  const pnr = 'TRV-' + Math.floor(100000 + Math.random() * 900000);
  const ticket = 'TCK-' + Math.floor(10000000 + Math.random() * 90000000);
  const bookingId = 'BK-' + Math.floor(10000 + Math.random() * 90000);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}-${pnr}`;
  const charged = extra.charged_amount ?? 0;

  const _txn = {
    id: txnId,
    payment_id: paymentId,
    order_id: orderId,
    item_name: itemTitle,
    item_type: itemType,
    actual_price: price,
    nominal_amount: price,
    charged_amount: charged,
    invoice: extra.invoice || null,
    status: 'PAID',
    date: new Date().toISOString(),
    payment_method: extra.payment_method || 'Razorpay',
  };

  const _booking = {
    booking_id: bookingId,
    pnr,
    ticket_number: ticket,
    item_name: itemTitle,
    destination: item.destination || item.city || item.to || 'India',
    item_type: itemType,
    actual_price: price,
    nominal_amount: price,
    charged_amount: charged,
    invoice: extra.invoice || null,
    status: 'CONFIRMED',
    booking_date: new Date().toISOString(),
    payment_id: paymentId,
    guests: item.capacity_people || 1,
    details: extra.details || 'Confirmed',
    qr_code_url: qr,
    txn_id: txnId,
    ...(extra.paid_via_wallet ? { paid_via_wallet: true, remaining_wallet_balance: extra.remaining_wallet_balance } : {}),
  };

  return { _txn, _booking };
}

function recordFailedBooking(txnId, itemTitle, itemType, price, reason) {
  const failedTxn = {
    id: txnId,
    payment_id: 'pay_failed_' + Math.floor(1000 + Math.random() * 9000),
    order_id: 'order_failed_' + Math.floor(1000 + Math.random() * 9000),
    item_name: itemTitle,
    item_type: itemType,
    actual_price: price,
    charged_amount: 0,
    status: 'FAILED',
    date: new Date().toISOString(),
    payment_method: 'Razorpay',
  };
  const failedBooking = {
    booking_id: 'BK-' + Math.floor(10000 + Math.random() * 90000),
    pnr: 'TRV-FAILED',
    ticket_number: 'TCK-FAILED',
    item_name: itemTitle,
    destination: 'India',
    item_type: itemType,
    actual_price: price,
    status: 'FAILED',
    booking_date: new Date().toISOString(),
    payment_id: failedTxn.payment_id,
    guests: 1,
    details: `Failed: ${reason}`,
    qr_code_url: '',
    txn_id: txnId,
    failure_reason: reason,
  };
  saveTransaction(failedTxn);
  saveBooking(failedBooking);
  return failedBooking;
}
