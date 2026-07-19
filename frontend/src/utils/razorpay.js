import axios from 'axios';
import { saveTransaction, saveBooking, getWalletBalance, deductWalletBalance } from './storage';

/**
 * Standard Razorpay Web Checkout Integration
 * Key ID: rzp_test_TEtmwlSyuosS9Y
 * Key Secret: JuzfbnC9T7vJOs6Y3DIC6kUP
 */
export async function initializePayment(item, onSuccess, onError) {
  const itemTitle = item.title || item.name || item.operator || item.airline || "Travel Booking";
  const actualPriceInRupees = Number(item.price_inr || item.price || item.price_per_night_inr || 1000);
  const itemType = item.package_id === 'WALLET_TOPUP' ? 'wallet' : item.package_id ? 'package' : item.bus_id ? 'bus' : item.flight_id ? 'flight' : 'hotel';

  const uniqueTxnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

  // 1. WALLET BALANCE DEDUCTION CHECK
  if (itemType !== 'wallet') {
    const currentWalletBal = getWalletBalance();
    if (currentWalletBal >= actualPriceInRupees) {
      const remainingBal = deductWalletBalance(actualPriceInRupees);

      const randomPNR = 'TRV-' + Math.floor(100000 + Math.random() * 900000);
      const randomTicketNo = 'TCK-' + Math.floor(10000000 + Math.random() * 90000000);
      const bookingId = 'BK-' + Math.floor(10000 + Math.random() * 90000);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}-${randomPNR}`;

      const newTxn = {
        id: uniqueTxnId,
        payment_id: 'pay_wallet_' + Math.floor(100000 + Math.random() * 900000),
        order_id: 'ord_wallet_' + Math.floor(100000 + Math.random() * 900000),
        item_name: itemTitle,
        item_type: itemType,
        actual_price: actualPriceInRupees,
        charged_amount: actualPriceInRupees,
        status: 'PAID',
        date: new Date().toISOString(),
        payment_method: 'TravoAI Wallet'
      };

      const newBooking = {
        booking_id: bookingId,
        pnr: randomPNR,
        ticket_number: randomTicketNo,
        item_name: itemTitle,
        destination: item.destination || item.city || item.to || 'India',
        item_type: itemType,
        actual_price: actualPriceInRupees,
        status: 'CONFIRMED',
        booking_date: new Date().toISOString(),
        payment_id: newTxn.payment_id,
        guests: item.capacity_people || 1,
        details: `Paid via TravoAI Wallet (Remaining: ₹${remainingBal.toLocaleString('en-IN')})`,
        qr_code_url: qrUrl,
        paid_via_wallet: true,
        remaining_wallet_balance: remainingBal,
        txn_id: uniqueTxnId
      };

      saveTransaction(newTxn);
      saveBooking(newBooking);

      if (onSuccess) onSuccess(newBooking);
      return;
    }
  }

  // 2. RAZORPAY STANDARD WEB CHECKOUT
  try {
    const orderRes = await axios.post('/api/create-order', {
      amount: 100, // Fixed 100 paise = ₹1 test charge
      receipt: `receipt_${Date.now()}`
    });

    const orderData = orderRes.data || {};
    const orderId = orderData.order_id || `order_test_${Date.now()}`;
    const keyId = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TEtmwlSyuosS9Y";

    // If order creation was in simulation mode due to test credentials
    if (orderData.is_simulated) {
      const simPaymentId = `pay_sim_${Date.now()}`;
      try {
        await axios.post('/api/verify-payment', {
          razorpay_order_id: orderId,
          razorpay_payment_id: simPaymentId,
          razorpay_signature: "simulated_signature"
        });
      } catch (e) {}

      completeBookingSuccess(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, simPaymentId, orderId, item, onSuccess);
      return;
    }

    const options = {
      key: keyId,
      amount: orderData.amount || 100,
      currency: orderData.currency || "INR",
      name: "TravoAI Travel Concierge",
      description: `Booking for ${itemTitle}`,
      image: "https://cdn-icons-png.flaticon.com/512/201/201623.png",
      order_id: orderId,
      handler: async function (response) {
        try {
          const verifyRes = await axios.post('/api/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          if (verifyRes.data && verifyRes.data.success) {
            completeBookingSuccess(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, response.razorpay_payment_id, response.razorpay_order_id, item, onSuccess);
          } else {
            const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, 'Signature Verification Failed');
            if (onError) onError({ message: 'Signature verification failed', booking: failedBooking });
          }
        } catch (vErr) {
          const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, 'Payment Verification Exception');
          if (onError) onError({ message: 'Payment verification failed', booking: failedBooking });
        }
      },
      prefill: {
        name: "Traveler",
        email: "arkrraj@gmail.com",
        contact: "9876543210"
      },
      theme: { color: "#0ea5e9" },
      modal: {
        ondismiss: function () {
          console.log("Razorpay checkout modal dismissed by user.");
          const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, 'User Cancelled Checkout Modal');
          if (onError) onError({ message: 'Payment cancelled by user.', booking: failedBooking });
        }
      }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.warn('Razorpay payment.failed event:', response.error);
        const reason = response.error?.description || 'Payment Failed';
        const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, reason);
        if (onError) onError({ message: reason, booking: failedBooking });
      });

      rzp.open();
    } else {
      const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, 'Razorpay SDK Not Loaded');
      if (onError) onError({ message: 'Razorpay SDK not loaded', booking: failedBooking });
    }
  } catch (err) {
    console.error('Checkout error:', err);
    const failedBooking = recordFailedBooking(uniqueTxnId, itemTitle, itemType, actualPriceInRupees, err.message || 'Checkout Error');
    if (onError) onError({ message: err.message, booking: failedBooking });
  }
}

function completeBookingSuccess(txnId, itemTitle, itemType, actualPrice, paymentId, orderId, item, onSuccess) {
  const randomPNR = 'TRV-' + Math.floor(100000 + Math.random() * 900000);
  const randomTicketNo = 'TCK-' + Math.floor(10000000 + Math.random() * 90000000);
  const bookingId = 'BK-' + Math.floor(10000 + Math.random() * 90000);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}-${randomPNR}`;

  const newTxn = {
    id: txnId,
    payment_id: paymentId,
    order_id: orderId,
    item_name: itemTitle,
    item_type: itemType,
    actual_price: actualPrice,
    charged_amount: 1,
    status: 'PAID',
    date: new Date().toISOString(),
    payment_method: 'Razorpay Standard Checkout'
  };

  const newBooking = {
    booking_id: bookingId,
    pnr: randomPNR,
    ticket_number: randomTicketNo,
    item_name: itemTitle,
    destination: item.destination || item.city || item.to || 'India',
    item_type: itemType,
    actual_price: actualPrice,
    status: 'CONFIRMED',
    booking_date: new Date().toISOString(),
    payment_id: paymentId,
    guests: item.capacity_people || 1,
    details: `${item.days ? item.days + ' Days Package' : item.bus_type || item.airline || item.address || 'Confirmed Ticket'}`,
    qr_code_url: qrUrl,
    txn_id: txnId
  };

  saveTransaction(newTxn);
  saveBooking(newBooking);

  if (onSuccess) onSuccess(newBooking);
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
    payment_method: 'Razorpay Standard Checkout'
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
    failure_reason: reason
  };

  saveTransaction(failedTxn);
  saveBooking(failedBooking);
  return failedBooking;
}
