import { useState, useEffect } from 'react';

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
  cleared?: boolean;
  cardLast4?: string;
}

export default function NFCPage() {
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [scannedPAN, setScannedPAN] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('10.00');
  const [transactionResult, setTransactionResult] = useState<TransactionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  // Check for Web NFC support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for NDEFReader which indicates Web NFC support
      setIsNFCSupported('NDEFReader' in window);
    }
  }, []);

  const startNFCReading = async () => {
    setError(null);
    setTransactionResult(null);
    setSetupRequired(false);

    if (!isNFCSupported) {
      setError('NFC is not supported in this browser. Please use Chrome on Android or a React Native app with NFC capabilities.');
      return;
    }

    try {
      setIsReading(true);

      // @ts-ignore - NDEFReader is not in standard TypeScript types yet
      const ndef = new NDEFReader();

      // @ts-ignore
      await ndef.scan();

      // @ts-ignore
      ndef.onreading = (event: any) => {
        setIsReading(false);

        // Extract the PAN from the NFC card
        const textDecoder = new TextDecoder();
        const textRecord = event.message.records[0]; // Assuming first record contains the data

        if (textRecord) {
          const pan = textDecoder.decode(textRecord.data);
          setScannedPAN(pan.trim());
          // Auto-process payment after scanning
          processPayment(pan.trim());
        } else {
          setError('No data found on NFC card. Please ensure the card contains the PAN.');
          setIsReading(false);
        }
      };

      // @ts-ignore
      ndef.onreadingerror = () => {
        setError('Failed to read NFC card. Please try again.');
        setIsReading(false);
      };

    } catch (err: any) {
      setIsReading(false);
      setError(err.message || 'Failed to start NFC reading');
    }
  };

  const processPayment = async (pan: string) => {
    try {
      const response = await fetch('/api/marqeta/nfc-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pan,
          amount: parseFloat(transactionAmount),
          autoClear: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setTransactionResult(data.data);
      } else {
        if (data.error?.includes('Card not found')) {
          setSetupRequired(true);
        }
        setError(data.error || 'Transaction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    }
  };

  const handleManualPANSubmit = () => {
    if (!scannedPAN) {
      setError('Please enter a PAN or scan an NFC card');
      return;
    }
    setError(null);
    setTransactionResult(null);
    processPayment(scannedPAN);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  NFC One-Click Pay
                </h1>
                <p className="text-gray-600">
                  Tap your NFC card to process payment instantly
                </p>
              </div>
            </div>
          </div>

          {/* NFC Support Status */}
          <div className={`mb-6 p-4 rounded-lg ${isNFCSupported ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {isNFCSupported ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${isNFCSupported ? 'text-green-800' : 'text-yellow-800'}`}>
                  {isNFCSupported ? 'NFC Supported' : 'NFC Not Supported'}
                </p>
                <p className={`text-xs ${isNFCSupported ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isNFCSupported
                    ? 'Your browser supports Web NFC. You can tap NFC cards to process payments.'
                    : 'Web NFC is not supported in this browser. Use Chrome on Android or implement React Native NFC integration.'}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100.00"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              placeholder="10.00"
            />
          </div>

          {/* NFC Reading Button */}
          {isNFCSupported && (
            <button
              onClick={startNFCReading}
              disabled={isReading}
              className="w-full mb-6 px-6 py-4 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isReading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Hold NFC card near reader...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Tap to Scan NFC Card
                </>
              )}
            </button>
          )}

          {/* Manual PAN Input (for testing without NFC card) */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Manual PAN Entry (for testing)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={scannedPAN || ''}
                onChange={(e) => setScannedPAN(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                placeholder="Enter card PAN (e.g., 5112345123451234)"
              />
              <button
                onClick={handleManualPANSubmit}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
              >
                Process
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  {setupRequired && (
                    <a href="/marqeta" className="mt-2 inline-block text-sm text-red-700 underline hover:text-red-900">
                      Go to JIT Funding Setup →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scanned Card Display */}
          {scannedPAN && !transactionResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Card Scanned</p>
                  <p className="text-xs text-blue-700 font-mono">**** **** **** {scannedPAN.slice(-4)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Result */}
          {transactionResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-green-900 mb-3">Payment Successful</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Card:</span>
                      <span className="font-medium">**** **** **** {transactionResult.cardLast4}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        ${((transactionResult.transaction?.amount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction Token:</span>
                      <span className="font-mono text-xs">{transactionResult.transaction?.token || 'N/A'}</span>
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
                    {(transactionResult.transaction?.gpa_order || transactionResult.gpa_order) && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <p className="text-sm font-medium text-green-900 mb-1">✓ JIT Funding Used</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NFC Data Format Guide */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-indigo-900 mb-3">NFC Card Data Format</h3>
            <p className="text-sm text-indigo-800 mb-4">
              Store the following data on your NFC card as plain text (NDEF Text Record):
            </p>
            <div className="bg-white rounded-lg p-4 border border-indigo-300">
              <p className="text-xs text-indigo-600 mb-2">Copy this exact PAN to your NFC card:</p>
              <code className="text-sm font-mono text-indigo-900 break-all">
                5112345123451234
              </code>
            </div>
            <p className="text-xs text-indigo-700 mt-3">
              Note: Replace with your actual card PAN after setting up JIT funding at{' '}
              <a href="/marqeta" className="underline hover:text-indigo-900">/marqeta</a>
            </p>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use NFC Payments</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                1
              </div>
              <div>
                <p className="font-medium">Setup JIT Funding</p>
                <p className="text-sm text-gray-600">Go to <a href="/marqeta" className="text-indigo-600 underline">/marqeta</a> to create your virtual card and get the PAN</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                2
              </div>
              <div>
                <p className="font-medium">Write PAN to NFC Card</p>
                <p className="text-sm text-gray-600">Use an NFC writer tool (like NFC Tools on Android) to store the card PAN as a plain text NDEF record</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                3
              </div>
              <div>
                <p className="font-medium">Set Transaction Amount</p>
                <p className="text-sm text-gray-600">Enter the amount you want to charge to the card</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                4
              </div>
              <div>
                <p className="font-medium">Tap NFC Card</p>
                <p className="text-sm text-gray-600">Tap your NFC card to the device reader to instantly process the payment with auto-clear</p>
              </div>
            </div>
          </div>
        </div>

        {/* React Native Integration Note */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-xl p-8 border border-purple-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            React Native NFC Integration
          </h2>
          <p className="text-gray-700 mb-4">
            For production mobile apps, use React Native with NFC libraries:
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">iOS:</p>
              <code className="text-purple-700 bg-white px-2 py-1 rounded">react-native-nfc-manager</code>
            </div>
            <div>
              <p className="font-medium text-gray-900">Android:</p>
              <code className="text-purple-700 bg-white px-2 py-1 rounded">react-native-nfc-manager</code>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            The React Native app would read the PAN from the NFC card and call the <code className="bg-gray-200 px-1 rounded">/api/marqeta/nfc-pay</code> endpoint.
          </p>
        </div>
      </div>
    </div>
  );
}
