/**
 * Marqeta API Route - Setup JIT Funding
 *
 * This API route handles the complete setup of Managed JIT Funding flow
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  setupJITFunding,
  simulateTransaction,
  clearTransaction,
  getUserBalance,
  USER_BALANCE_LIMIT
} from '../../../lib/marqeta';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, amount, webhookEndpoint } = req.body;

    // Setup complete JIT funding flow
    if (action === 'setup') {
      const result = await setupJITFunding();

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: {
            fundingSource: {
              token: result.fundingSource.token,
              name: result.fundingSource.name
            },
            cardProduct: {
              token: result.cardProduct.token,
              name: result.cardProduct.name
            },
            user: {
              token: result.user.token,
              name: `${result.user.first_name} ${result.user.last_name}`,
              balanceLimit: USER_BALANCE_LIMIT
            },
            card: {
              token: result.card.token,
              pan: result.card.pan,
              cvv: result.card.cvv_number,
              expiration: result.card.expiration,
              state: result.card.state
            },
            velocityControl: {
              token: result.velocityControl.token,
              amountLimit: USER_BALANCE_LIMIT,
              window: result.velocityControl.velocity_window
            }
          },
          message: 'JIT Funding setup completed successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
    }

    // Simulate a transaction
    if (action === 'simulate') {
      const { cardToken } = req.body;

      if (!cardToken) {
        return res.status(400).json({ error: 'cardToken is required' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const transaction = await simulateTransaction(
        cardToken,
        amount,
        webhookEndpoint
      );

      return res.status(200).json({
        success: true,
        data: transaction,
        message: 'Transaction simulated successfully'
      });
    }

    // Get user balance
    if (action === 'balance') {
      const { userToken } = req.body;

      if (!userToken) {
        return res.status(400).json({ error: 'userToken is required' });
      }

      try {
        const balance = await getUserBalance(userToken);
        return res.status(200).json({
          success: true,
          data: balance
        });
      } catch (balanceError: any) {
        // Balance check is not critical - return partial success
        console.warn('Balance check failed (non-critical):', balanceError);
        return res.status(200).json({
          success: true,
          data: { gpa: null },
          warning: 'Balance information not available'
        });
      }
    }

    // Clear a transaction
    if (action === 'clear') {
      const { transactionToken, amount } = req.body;

      if (!transactionToken) {
        return res.status(400).json({ error: 'transactionToken is required' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const clearedTransaction = await clearTransaction(transactionToken, amount);

      return res.status(200).json({
        success: true,
        data: clearedTransaction,
        message: 'Transaction cleared successfully'
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error('Marqeta API error:', error);

    // Extract detailed error information
    let errorMessage = 'Internal server error';
    let errorDetails = null;

    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.error_message) {
        errorMessage = error.error.error_message;
        errorDetails = error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Include helpful context based on error type
    if (error.status === 404) {
      errorMessage = `Resource not found: ${errorMessage}. This might be due to invalid API credentials or endpoint.`;
    } else if (error.status === 401) {
      errorMessage = `Authentication failed: ${errorMessage}. Please check your Marqeta API credentials.`;
    } else if (error.status === 403) {
      errorMessage = `Authorization failed: ${errorMessage}. You don't have permission to perform this action.`;
    } else if (error.status === 409) {
      errorMessage = `Conflict: ${errorMessage}. A resource with this token may already exist.`;
    }

    return res.status(error.status || 500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
}
