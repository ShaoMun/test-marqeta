import type { NextApiRequest, NextApiResponse } from 'next';

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

  const { pan, pin, amount } = req.body;

  // Validate inputs
  if (!pan || !pin || !amount) {
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
    // Process payment via Marqeta API
    const MARQETA_API_BASE = 'https://sandbox-api.marqeta.com';
    const APP_TOKEN = process.env.MARQETA_APP_TOKEN || 'be46425e-3a40-43c3-88c5-4d086d36f1c6';
    const ADMIN_ACCESS_TOKEN = process.env.MARQETA_ADMIN_TOKEN || '179182fd-2702-402b-b091-986e90e486a5';

    const marqetaResponse = await fetch(`${MARQETA_API_BASE}/v3/simulations/cardtransactions/authorization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_TOKEN}:${ADMIN_ACCESS_TOKEN}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: (amount * 100).toString(), // Convert to cents, then to string
        card_token: pan,
        card_acceptor: {
          mid: '1234567890',
          name: 'PIN Payment',
          street_address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
          country_code: 'USA'
        },
        network: 'VISA',
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
