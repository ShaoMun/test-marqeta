import { useState } from 'react';

interface CardData {
  token: string;
  pan: string;
  cvv: string;
  expiration: string;
  state: string;
}

interface SetupData {
  fundingSource: { token: string; name: string };
  cardProduct: { token: string; name: string };
  user: { token: string; name: string; balanceLimit: number };
  card: CardData;
  velocityControl: { token: string; amountLimit: number; window: string };
}

interface TransactionData {
  transaction?: {
    token: string;
    state: string;
    response: { code: string };
    amount: number;
    gpa_order?: {
      token: string;
      funding: { source: { type: string } };
      amount: number;
    };
  };
  gpa_order?: {
    token: string;
    funding: { source: { type: string } };
    amount: number;
  };
}

export default function MarqetaPage() {
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('10.00');
  const [transactionResult, setTransactionResult] = useState<TransactionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ ledger_balance: number; available_balance: number } | null>(null);
  const [copiedPAN, setCopiedPAN] = useState(false);
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);

  const copyPAN = () => {
    if (setupData?.card.pan) {
      navigator.clipboard.writeText(setupData.card.pan);
      setCopiedPAN(true);
      setTimeout(() => setCopiedPAN(false), 2000);
    }
  };

  const copyPaymentLink = () => {
    if (setupData?.card.pan && typeof window !== 'undefined') {
      const paymentLink = `${window.location.origin}/nfc/${setupData.card.pan}`;
      navigator.clipboard.writeText(paymentLink);
      setCopiedPaymentLink(true);
      setTimeout(() => setCopiedPaymentLink(false), 2000);
    }
  };

  const setupJIT = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/marqeta/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' })
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data.data);
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup JIT funding');
    } finally {
      setLoading(false);
    }
  };

  const simulateTransaction = async () => {
    if (!setupData) {
      setError('Please setup JIT funding first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Always use auto-clear
      const response = await fetch('/api/marqeta/one-click-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardToken: setupData.card.token,
          amount: parseFloat(transactionAmount),
          autoClear: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setTransactionResult(data.data);
        // Fetch updated balance
        await fetchBalance();
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to simulate transaction');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    if (!setupData) return;

    try {
      const response = await fetch('/api/marqeta/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'balance',
          userToken: setupData.user.token
        })
      });

      const data = await response.json();

      if (data.success && data.data.gpa) {
        setBalance({
          ledger_balance: data.data.gpa.ledger_balance,
          available_balance: data.data.gpa.available_balance
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Marqeta Managed JIT Funding
          </h1>
          <p className="text-gray-600 mb-6">
            Virtual card with Just-In-Time funding - funds are loaded automatically when transactions occur
          </p>

          {/* Setup Section */}
          {!setupData && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Setup JIT Funding
              </h3>
              <p className="text-gray-600 mb-4">
                Create program funding source, card product, user, and virtual card
              </p>
              <button
                onClick={setupJIT}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Setup JIT Funding'}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Card Details */}
          {setupData && (
            <div className="space-y-6">
              {/* Virtual Card Display */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-sm opacity-80 mb-1">Virtual Card</p>
                    <p className="text-2xl font-mono tracking-wider">{setupData.card.pan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80 mb-1">Status</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20">
                      {setupData.card.state}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between mb-6">
                  <div>
                    <p className="text-xs opacity-80 mb-1">CVV</p>
                    <p className="text-lg font-mono">{setupData.card.cvv}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 mb-1">Expires</p>
                    <p className="text-lg font-mono">{setupData.card.expiration}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 mb-1">Cardholder</p>
                    <p className="text-lg">{setupData.user.name}</p>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={copyPAN}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copiedPAN ? 'Copied!' : 'Copy PAN'}
                  </button>
                </div>
              </div>

              {/* Payment Link */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Payment Link</h3>
                    <p className="text-sm text-gray-600">Share this link to receive payments</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-300">
                  <p className="text-xs text-green-600 mb-2 font-medium">PAYMENT LINK:</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-gray-900 break-all flex-1">
                      {typeof window !== 'undefined' ? `${window.location.origin}/nfc/${setupData.card.pan}` : `/nfc/${setupData.card.pan}`}
                    </code>
                    <button
                      onClick={copyPaymentLink}
                      className="flex-shrink-0 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copiedPaymentLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <p>Share this link via QR code, NFC tag, or message. Recipients will enter a PIN to complete payment.</p>
                </div>
              </div>

              {/* NFC Data for iOS Users */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">NFC Card Data</h3>
                    <p className="text-sm text-gray-600">For iOS users - copy this to your NFC writer app</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-300">
                  <p className="text-xs text-blue-600 mb-2 font-medium">DATA TO WRITE (NDEF Text Record):</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-lg font-mono text-gray-900 break-all">
                      {setupData.card.pan}
                    </code>
                    <button
                      onClick={copyPAN}
                      className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copiedPAN ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  <p><strong>Recommended iOS Apps:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>NFC Tools:</strong> Write → Add record → Text → Paste PAN → Write</li>
                    <li><strong>TagWriter:</strong> New tag → Text → Paste PAN → Save</li>
                  </ul>
                </div>
              </div>

              {/* Balance Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Balance Limit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(setupData.user.balanceLimit / 100).toFixed(2)}
                  </p>
                </div>
                {balance && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Ledger Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(balance.ledger_balance / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(balance.available_balance / 100).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Transaction Simulation */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Simulate Transaction</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(setupData.user.balanceLimit / 100).toFixed(2)}
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="10.00"
                  />
                </div>
                <button
                  onClick={() => simulateTransaction()}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'One-Click Pay ✓'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Transactions auto-clear and go straight to CLEARED state - mimics real payment UX
                </p>
              </div>

              {/* Transaction Result */}
              {transactionResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-green-900 mb-4">Transaction Result</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction Token:</span>
                      <span className="font-mono text-sm">{transactionResult.transaction?.token || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State:</span>
                      <span className="font-medium">
                        {transactionResult.transaction?.state || 'N/A'}
                        {transactionResult.transaction?.state === 'CLEARED' && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Cleared ✓
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Code:</span>
                      <span className="font-medium">{transactionResult.transaction?.response?.code || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        ${((transactionResult.transaction?.amount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    {(transactionResult.transaction?.gpa_order || transactionResult.gpa_order) && (
                      <div className="mt-4 pt-4 border-t border-green-300">
                        <p className="text-sm font-medium text-green-900 mb-2">✓ JIT Funding Used</p>
                        <div className="text-sm text-gray-700">
                          <p>Funding Source: <span className="font-medium">Program</span></p>
                          <p>
                            Funding Amount: <span className="font-medium">
                              ${((transactionResult.transaction?.gpa_order?.amount || transactionResult.gpa_order?.amount || 0) / 100).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Funding Source:</span>
                    <span className="font-mono">{setupData.fundingSource.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card Product:</span>
                    <span className="font-mono">{setupData.cardProduct.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User Token:</span>
                    <span className="font-mono">{setupData.user.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card Token:</span>
                    <span className="font-mono">{setupData.card.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Velocity Control:</span>
                    <span className="font-mono">{setupData.velocityControl.token}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How JIT Funding Works</h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                1
              </div>
              <div>
                <p className="font-medium">Merchant initiates transaction</p>
                <p className="text-sm text-gray-600">The merchant sends an authorization message to the card network</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                2
              </div>
              <div>
                <p className="font-medium">Marqeta validates authorization</p>
                <p className="text-sm text-gray-600">The platform uses spend controls (velocity limits) to validate the authorization</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                3
              </div>
              <div>
                <p className="font-medium">Funds are loaded (JIT Funding)</p>
                <p className="text-sm text-gray-600">If valid, Marqeta automatically moves funds from the program funding source into the cardholder's account</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                4
              </div>
              <div>
                <p className="font-medium">Authorization response</p>
                <p className="text-sm text-gray-600">Marqeta returns an authorization response through the card network to the merchant</p>
              </div>
            </div>
          </div>
        </div>

        {/* NFC Integration Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">NFC Payment Integration</h2>
              <p className="text-purple-100">Tap to pay with your NFC card</p>
            </div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
            <p className="text-white text-sm">
              <strong>Quick Start:</strong> Copy the PAN above and write it to an NFC card, then tap to process payments instantly at <a href="/nfc" className="underline font-bold">/nfc</a>
            </p>
          </div>
          <a
            href="/nfc"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Go to NFC Payment Page
          </a>
        </div>
      </div>
    </div>
  );
}
