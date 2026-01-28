import type { NextApiRequest, NextApiResponse } from 'next';
import {
  simulateTransaction,
  clearTransaction
} from '../../../lib/marqeta';

// Demo mode: Universal PIN for all cards during development
// In production, store card-specific hashed PINs in database
const DEMO_PIN = '123456';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cardToken, pin, amount } = req.body;

  // Validate inputs
  if (!cardToken || !pin || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (pin.length !== 6) {
    return res.status(400).json({ error: 'Invalid PIN length' });
  }

  // Validate PIN (Demo mode: accept universal PIN for any card)
  if (pin !== DEMO_PIN) {
    return res.status(401).json({ error: 'Invalid PIN. Use demo PIN: 123456' });
  }

  try {
    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Simulate the transaction (authorize)
    const transaction = await simulateTransaction(cardToken, amountInCents);

    // Immediately clear the transaction to CLEARED state
    if (transaction.transaction?.token) {
      try {
        const clearedTransaction = await clearTransaction(
          transaction.transaction.token,
          amountInCents
        );

        // Return the cleared transaction with original data merged
        return res.status(200).json({
          success: true,
          data: {
            transaction: {
              ...transaction.transaction,
              state: 'CLEARED'
            },
            gpa_order: transaction.gpa_order,
            cleared: true,
            cardLast4: cardToken.slice(-4),
            amount,
          }
        });
      } catch (clearError: any) {
        // If clearing fails, still return the authorized transaction
        console.error('Auto-clear failed, returning authorized transaction:', clearError);
        return res.status(200).json({
          success: true,
          data: {
            ...transaction,
            warning: 'Transaction authorized but auto-clear failed'
          }
        });
      }
    }

    // Return the transaction without clearing (shouldn't reach here)
    return res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error: any) {
    console.error('Payment processing error:', error);

    // Extract detailed error information
    let errorMessage = 'Payment processing failed';
    let errorDetails = null;

    if (error?.error) {
      errorMessage = error.error.message || error.error;
      errorDetails = error.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return res.status(error?.status || 500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
}
