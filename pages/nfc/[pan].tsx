import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function NFCPaymentPage() {
  const router = useRouter();
  const { pan } = router.query;

  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState('10.00');

  useEffect(() => {
    // Redirect if no PAN provided
    if (!pan && router.isReady) {
      router.push('/marqeta');
    }
  }, [pan, router.isReady]);

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const clearPin = () => {
    setPin('');
  };

  const processPayment = async () => {
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/marqeta/process-pin-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pan,
          pin,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === 6 && !success && !isProcessing) {
      setTimeout(() => processPayment(), 300);
    }
  }, [pin]);

  if (!pan) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">Thank you for your payment.</p>
          <button
            onClick={() => router.push('/marqeta')}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter PIN</h1>
          <p className="text-gray-600">Enter 6-digit PIN to complete payment</p>
        </div>

        {/* Amount Display */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-2xl font-bold text-center"
            disabled={isProcessing}
          />
        </div>

        {/* PIN Display */}
        <div className="mb-8 flex justify-center gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                pin[i]
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              {pin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Numpad - 3 Columns */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePinDigit(num.toString())}
              disabled={isProcessing || success}
              className="aspect-square rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-2xl font-semibold text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={clearPin}
            disabled={isProcessing || success}
            className="aspect-square rounded-xl border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-sm font-medium text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={() => handlePinDigit('0')}
            disabled={isProcessing || success}
            className="aspect-square rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-2xl font-semibold text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isProcessing || success}
            className="aspect-square rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-indigo-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Processing payment...</span>
            </div>
          </div>
        )}

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Payment will be processed to card ending in {pan?.slice(-4)}
        </p>
      </div>
    </div>
  );
}
