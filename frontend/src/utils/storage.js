// Storage utilities for Transactions, Bookings & Wallet Balance

const TRANSACTIONS_KEY = 'travoai_transactions';
const BOOKINGS_KEY = 'travoai_bookings';
const WALLET_KEY = 'travoai_wallet_balance';

const INITIAL_TRANSACTIONS = [
  {
    id: 'TXN-984321',
    payment_id: 'pay_TESbUdj9GmMO9P',
    order_id: 'order_TEST6UZCjiSmdy',
    item_name: 'Goa Tropical Luxury Beach Retreat',
    item_type: 'package',
    actual_price: 28999,
    charged_amount: 1,
    status: 'PAID',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    payment_method: 'Razorpay UPI'
  },
  {
    id: 'TXN-984320',
    payment_id: 'pay_TESbF729XmMK12',
    order_id: 'order_TEST5VZBjiSmcx',
    item_name: 'Zingbus AC Sleeper (Delhi ➔ Jaipur)',
    item_type: 'bus',
    actual_price: 650,
    charged_amount: 1,
    status: 'PAID',
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    payment_method: 'Razorpay Card'
  },
  {
    id: 'TXN-984319',
    payment_id: 'pay_failed_8731',
    order_id: 'order_TEST4UZAjiSmbw',
    item_name: 'Deltin Suites Goa',
    item_type: 'hotel',
    actual_price: 5190,
    charged_amount: 0,
    status: 'FAILED',
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    payment_method: 'Razorpay NetBanking'
  }
];

const INITIAL_BOOKINGS = [
  {
    booking_id: 'BK-84301',
    pnr: 'TRV-894102',
    ticket_number: 'TCK-7749102',
    item_name: 'Goa Tropical Luxury Beach Retreat',
    destination: 'Goa',
    item_type: 'package',
    actual_price: 28999,
    status: 'CONFIRMED',
    booking_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    payment_id: 'pay_TESbUdj9GmMO9P',
    guests: 2,
    details: '5 Days / 4 Nights | Sea Breeze Beach Resort',
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BK-84301-TRV-894102'
  },
  {
    booking_id: 'BK-84300',
    pnr: 'TRV-894101',
    ticket_number: 'TCK-7749101',
    item_name: 'Zingbus AC Sleeper (Delhi ➔ Jaipur)',
    destination: 'Jaipur',
    item_type: 'bus',
    actual_price: 650,
    status: 'CONFIRMED',
    booking_date: new Date(Date.now() - 3600000 * 24).toISOString(),
    payment_id: 'pay_TESbF729XmMK12',
    guests: 1,
    details: 'Seat 14A | Departure: 19:30',
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BK-84300-TRV-894101'
  },
  {
    booking_id: 'BK-84299',
    pnr: 'TRV-894100',
    ticket_number: 'TCK-7749100',
    item_name: 'Deltin Suites Goa',
    destination: 'Goa',
    item_type: 'hotel',
    actual_price: 5190,
    status: 'FAILED',
    booking_date: new Date(Date.now() - 3600000 * 48).toISOString(),
    payment_id: 'pay_failed_8731',
    guests: 2,
    details: 'Payment cancelled by user',
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BK-84299-TRV-894100'
  }
];

export function getStoredTransactions() {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TRANSACTIONS;
  } catch (e) {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransaction(txn) {
  try {
    const txns = getStoredTransactions();
    txns.unshift(txn);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns));
    return txns;
  } catch (e) {
    console.error('Save txn error:', e);
  }
}

export function getStoredBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_BOOKINGS;
  } catch (e) {
    return INITIAL_BOOKINGS;
  }
}

export function saveBooking(booking) {
  try {
    const bookings = getStoredBookings();
    bookings.unshift(booking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    return bookings;
  } catch (e) {
    console.error('Save booking error:', e);
  }
}

/* =========================================================
   WALLET STORAGE HELPERS
   ========================================================= */

export function getWalletBalance() {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    return raw ? Number(raw) : 10000; // Default ₹10,000 balance
  } catch (e) {
    return 10000;
  }
}

export function addWalletBalance(amount) {
  try {
    const current = getWalletBalance();
    const newBal = current + Number(amount);
    localStorage.setItem(WALLET_KEY, newBal.toString());
    return newBal;
  } catch (e) {
    console.error('Add wallet error:', e);
  }
}

export function deductWalletBalance(amount) {
  try {
    const current = getWalletBalance();
    if (current >= amount) {
      const newBal = current - Number(amount);
      localStorage.setItem(WALLET_KEY, newBal.toString());
      return newBal;
    }
    return false;
  } catch (e) {
    console.error('Deduct wallet error:', e);
  }
}
