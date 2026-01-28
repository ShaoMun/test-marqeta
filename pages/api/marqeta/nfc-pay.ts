/**
 * Marqeta NFC Payment API Endpoint
 *
 * This endpoint processes NFC card payments using the raw PAN
 * instead of card token. Supports auto-clear functionality.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  simulateTransaction,
  clearTransaction,
  getResources
} from '../../../lib/marqeta';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pan, amount, autoClear = true } = req.body;

    // Validation
    if (!pan) {
      return res.status(400).json({ error: 'PAN (card number) is required' });
    }

    // Validate PAN format (basic check for 13-19 digits)
    const panRegex = /^\d{13,19}$/;
    if (!panRegex.test(pan.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid PAN format. Must be 13-19 digits' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get stored card data to find the matching card token
    const resources = getResources();
    if (!resources.card || resources.card.pan !== pan) {
      return res.status(404).json({
        error: 'Card not found. Please setup JIT funding first.',
        hint: 'The PAN from the NFC card must match the card created in the system.'
      });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Simulate the transaction using the card token
    const transaction = await simulateTransaction(resources.card.token, amountInCents);

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
            cleared: true,
            cardLast4: pan.slice(-4)
          }
        });
      } catch (clearError: any) {
        // If clearing fails, still return the authorized transaction
        console.error('Auto-clear failed, returning authorized transaction:', clearError);
        return res.status(200).json({
          success: true,
          data: {
            ...transaction,
            warning: 'Transaction authorized but auto-clear failed',
            cardLast4: pan.slice(-4)
          }
        });
      }
    }

    // Return the transaction without clearing
    return res.status(200).json({
      success: true,
      data: {
        ...transaction,
        cardLast4: pan.slice(-4)
      }
    });

  } catch (error: any) {
    console.error('NFC payment error:', error);

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
