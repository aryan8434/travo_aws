import React from 'react';
import { X, CreditCard, ShieldCheck, Sparkles, CheckCircle2, Wallet } from 'lucide-react';
import RazorpayButton from './RazorpayButton';
import { saveTransaction, saveBooking, getWalletBalance, deductWalletBalance } from '../../utils/storage';

export default function PaymentGatewayModal({ item, onClose, onSuccess }) {
  if (!item) return null;

  const itemTitle = item.title || item.name || item.operator || item.airline || "Travel Booking";
  const actualPriceInRupees = Number(item.price_inr || item.price || item.price_per_night_inr || 1000);
  const itemType = item.package_id ? 'package' : item.bus_id ? 'bus' : item.flight_id ? 'flight' : 'hotel';
  const walletBal = getWalletBalance();

  const handleInstantConfirm = () => {
    let paidViaWallet = false;
    let remainingBal = walletBal;

    if (walletBal >= actualPriceInRupees) {
      remainingBal = deductWalletBalance(actualPriceInRupees);
      paidViaWallet = true;
    }

    const randomPNR = 'TRV-' + Math.floor(100000 + Math.random() * 900000);
    const randomTicketNo = 'TCK-' + Math.floor(10000000 + Math.random() * 90000000);
    const bookingId = 'BK-' + Math.floor(10000 + Math.random() * 90000);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}-${randomPNR}`;

    const newTxn = {
      id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      payment_id: paidViaWallet ? `pay_wallet_${Date.now()}` : `pay_rzp_btn_${Date.now()}`,
      order_id: `ord_${Date.now()}`,
      item_name: itemTitle,
      item_type: itemType,
      actual_price: actualPriceInRupees,
      charged_amount: paidViaWallet ? actualPriceInRupees : 1,
      status: 'PAID',
      date: new Date().toISOString(),
      payment_method: paidViaWallet ? 'TravoAI Wallet' : 'Razorpay Payment Button (pl_TEtdfcs5F3p9RR)'
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
      details: `${item.days ? item.days + ' Days Package' : item.bus_type || item.airline || item.address || 'Confirmed Pass'}`,
      qr_code_url: qrUrl,
      paid_via_wallet: paidViaWallet,
      remaining_wallet_balance: remainingBal
    };

    saveTransaction(newTxn);
    saveBooking(newBooking);

    if (onSuccess) onSuccess(newBooking);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel bg-[#0f172a] rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl space-y-0 text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">TravoAI Checkout</h3>
              <span className="text-[10px] text-cyan-400 font-mono">Official Razorpay Gateway</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Order Summary Box */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">BOOKING ITEM</span>
            <h4 className="text-base font-extrabold text-white leading-tight">{itemTitle}</h4>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Price</span>
                <span className="text-xl font-extrabold text-cyan-400">
                  ₹{actualPriceInRupees.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Wallet Balance</span>
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-cyan-400" /> ₹{walletBal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Official Razorpay Payment Button Component */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-2">
            <span className="text-xs text-slate-300 font-semibold block">
              Pay via Official Razorpay Payment Button (ID: <code className="text-cyan-400">pl_TEtdfcs5F3p9RR</code>):
            </span>
            <RazorpayButton paymentButtonId="pl_TEtdfcs5F3p9RR" />
          </div>

          {/* Instant Demo Confirmation Option */}
          <button
            onClick={handleInstantConfirm}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Booking & Generate Ticket Pass</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-bit Encrypted SSL Gateway • Official Razorpay Integration</span>
        </div>
      </div>
    </div>
  );
}
