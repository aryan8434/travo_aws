import React, { useEffect, useRef } from 'react';

export default function RazorpayButton({ paymentButtonId = 'pl_TEtdfcs5F3p9RR' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const form = document.createElement('form');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.setAttribute('data-payment_button_id', paymentButtonId);
      script.async = true;
      form.appendChild(script);
      containerRef.current.appendChild(form);
    }
  }, [paymentButtonId]);

  return (
    <div className="flex flex-col items-center justify-center my-3">
      <div ref={containerRef} className="min-h-[45px] flex items-center justify-center" />
    </div>
  );
}
