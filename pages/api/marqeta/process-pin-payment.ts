import type { NextApiRequest, NextApiResponse } from 'next';

// In production, store these hashed in database
// For demo, using hardcoded values
const CARD_PINS: Record<string, string> = {
  '5112345123451234': '123456', // Demo card PIN
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pan, pin, amount } = req.body;

  // Validate inputs
  if (!pan || !pin || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (pin.length !== 6) {
    return res.status(400).json({ error: 'Invalid PIN length' });
  }

  // Validate PIN
  const correctPin = CARD_PINS[pan];
  if (!correctPin || correctPin !== pin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  try {
    // Process payment via Marqeta API
    const marqetaResponse = await fetch(`${process.env.MARQETA_API_URL}/v3/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.MARQETA_APP_TOKEN}:${process.env.MARQETA_ADMIN_TOKEN}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD',
        card_token: pan,
        metadata: {
          payment_method: 'pin_entry',
        },
      }),
    });

    if (!marqetaResponse.ok) {
      const error = await marqetaResponse.text();
      throw new Error(`Marqeta API error: ${error}`);
    }

    const transaction = await marqetaResponse.json();

    res.status(200).json({
      success: true,
      data: {
        transaction,
        amount,
        cardLast4: pan.slice(-4),
      },
    });

  } catch (error: any) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: error.message || 'Payment processing failed' });
  }
}
