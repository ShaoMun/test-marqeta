/**
 * Marqeta QR Payment API Endpoint
 *
 * This endpoint processes QR code payments with auto-clear functionality
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  simulateTransaction,
  clearTransaction
} from '../../../lib/marqeta';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardToken, amount, autoClear = true } = req.body;

    // Validation
    if (!cardToken) {
      return res.status(400).json({ error: 'cardToken is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Simulate the transaction
    const transaction = await simulateTransaction(cardToken, amountInCents);

    // If autoClear is true, immediately clear the transaction
    if (autoClear && transaction.transaction?.token) {
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
            cleared: true
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

    // Return the transaction without clearing
    return res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error: any) {
    console.error('QR payment error:', error);

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
