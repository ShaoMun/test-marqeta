/**
 * Marqeta Managed JIT Funding Implementation
 *
 * Service for interacting with Marqeta Core API to create virtual cards
 * with Managed JIT (Just-In-Time) Funding.
 */

// Marqeta API Configuration
const MARQETA_API_BASE = 'sandbox-api.marqeta.com';
const APP_TOKEN = process.env.MARQETA_APP_TOKEN || 'be46425e-3a40-43c3-88c5-4d086d36f1c6';
const ADMIN_ACCESS_TOKEN = process.env.MARQETA_ADMIN_TOKEN || '179182fd-2702-402b-b091-986e90e486a5';

// Hard-coded user balance limit (in cents = $100.00)
export const USER_BALANCE_LIMIT = 10000;

// Storage for created resources (in-memory)
const resources = {
  fundingSource: null as any,
  cardProduct: null as any,
  user: null as any,
  card: null as any,
  velocityControl: null as any
};

interface MarqetaResponse {
  status: number;
  data: any;
}

interface MarqetaError {
  status: number;
  error: any;
}

/**
 * Make an HTTPS request to Marqeta API
 */
async function marqetaRequest(method: string, path: string, data: any = null): Promise<MarqetaResponse> {
  const url = `https://${MARQETA_API_BASE}/v3${path}`;
  const credentials = Buffer.from(`${APP_TOKEN}:${ADMIN_ACCESS_TOKEN}`).toString('base64');

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  console.log(`[Marqeta API] ${method} ${url}`);

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error(`[Marqeta API Error] ${method} ${path}`, {
      status: response.status,
      error
    });
    throw { status: response.status, error };
  }

  const responseData = await response.json().catch(() => ({}));
  return { status: response.status, data: responseData };
}

/**
 * Test API connection by listing card products
 */
export async function testConnection() {
  try {
    const response = await marqetaRequest('GET', '/cardproducts?count=1');
    console.log('✓ API Connection successful');
    return true;
  } catch (error: any) {
    console.error('✗ API Connection failed:', error);
    return false;
  }
}

/**
 * Generate a unique token with timestamp (max 36 chars for Marqeta)
 */
function generateToken(prefix: string): string {
  // Use last 8 digits of timestamp + 4 char random = total ~25 chars max
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a program funding source or use default sandbox funding
 */
export async function createProgramFundingSource() {
  try {
    const token = generateToken('fund');
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5).replace(':', '');
    const fundingSourceData = {
      token,
      name: `🚀 JIT-OneClick-${time}`
    };

    const response = await marqetaRequest('POST', '/fundingsources/program', fundingSourceData);
    resources.fundingSource = response.data;
    return response.data;
  } catch (error: any) {
    // If program funding source creation fails (404), use sandbox default
    console.warn('Could not create program funding source, using sandbox default');
    console.warn('This is normal in some sandbox environments');
    const defaultFundingSource = {
      token: 'sandbox_program_funding',
      name: 'Default Sandbox Program Funding'
    };
    resources.fundingSource = defaultFundingSource;
    return defaultFundingSource;
  }
}

/**
 * Create a card product with JIT funding configuration
 */
export async function createCardProduct(fundingSourceToken: string) {
  const token = generateToken('prod');
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5).replace(':', '');
  const cardProductData = {
    token,
    name: `⚡ OneClick-Card-${time}`,
    start_date: '2025-01-01',
    config: {
      fulfillment: {
        payment_instrument: 'VIRTUAL_PAN'
      },
      poi: {
        ecommerce: true,
        atm: false
      },
      card_life_cycle: {
        activate_upon_issue: true
      },
      jit_funding: {
        program_funding_source: {
          funding_source_token: fundingSourceToken,
          refunds_destination: 'PROGRAM_FUNDING_SOURCE',
          enabled: true
        }
      }
    }
  };

  const response = await marqetaRequest('POST', '/cardproducts', cardProductData);
  resources.cardProduct = response.data;
  return response.data;
}

/**
 * Create a user (cardholder)
 */
export async function createUser(userData?: any) {
  const token = generateToken('user');
  const timestamp = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  const data = {
    token,
    first_name: 'OneClick',
    last_name: `User-${time}`,
    email: `oneclick-${token.split('_')[2]}@test.marqeta`,
    metadata: {
      balance_limit: USER_BALANCE_LIMIT,
      notes: `Created for One-Click Pay testing - ${timestamp} ${time}`
    },
    ...userData
  };

  const response = await marqetaRequest('POST', '/users', data);
  resources.user = response.data;
  return response.data;
}

/**
 * Create a virtual card with JIT funding
 */
export async function createCard(userToken: string, cardProductToken: string) {
  const token = generateToken('card');
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5).replace(':', '');
  const cardData = {
    token,
    user_token: userToken,
    card_product_token: cardProductToken,
    metadata: {
      notes: `Virtual card for One-Click Pay - ${time}`
    }
  };

  const response = await marqetaRequest(
    'POST',
    '/cards?show_pan=true&show_cvv_number=true',
    cardData
  );
  resources.card = response.data;
  return response.data;
}

/**
 * Create velocity control for spending limits
 */
export async function createVelocityControl(userToken: string, name = 'Daily Spend Limit') {
  const velocityControlData = {
    name,
    association: {
      user_token: userToken
    },
    amount_limit: USER_BALANCE_LIMIT,
    currency_code: 'USD',
    velocity_window: 'DAY',
    active: true
  };

  const response = await marqetaRequest('POST', '/velocitycontrols', velocityControlData);
  resources.velocityControl = response.data;
  return response.data;
}

/**
 * Simulate a transaction to verify JIT funding flow
 */
export async function simulateTransaction(cardToken: string, amount: number, webhookEndpoint?: string) {
  const transactionData = {
    amount: amount.toString(),
    card_token: cardToken,
    card_acceptor: {
      mid: '1234567890',
      name: 'Test Merchant',
      street_address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country_code: 'USA'
    },
    network: 'VISA',
    webhook: webhookEndpoint ? {
      endpoint: webhookEndpoint,
      username: 'webhook_user',
      password: 'webhook_password'
    } : undefined
  };

  const response = await marqetaRequest(
    'POST',
    '/simulations/cardtransactions/authorization',
    transactionData
  );
  return response.data;
}

/**
 * Clear a transaction (move from PENDING to CLEARED state)
 */
export async function clearTransaction(transactionToken: string, amount: number) {
  // Amount should be in dollars for clearing endpoint (not cents like authorization)
  const clearingData = {
    preceding_related_transaction_token: transactionToken,
    amount: amount / 100  // Convert cents to dollars
  };

  const response = await marqetaRequest(
    'POST',
    '/simulations/cardtransactions/authorization.clearing',
    clearingData
  );
  return response.data;
}

/**
 * Get user balance and details
 */
export async function getUserBalance(userToken: string) {
  const response = await marqetaRequest('GET', `/users/${userToken}`);
  return response.data;
}

/**
 * Get all stored resources
 */
export function getResources() {
  return resources;
}

/**
 * Setup complete JIT funding flow
 */
export async function setupJITFunding() {
  try {
    console.log('Starting JIT Funding setup...');

    // Test connection first
    console.log('Testing API connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Marqeta API. Please check your credentials.');
    }

    // Step 1: Create program funding source (or use sandbox default)
    console.log('Step 1: Setting up program funding source...');
    const fundingSource = await createProgramFundingSource();
    console.log('✓ Funding source ready:', fundingSource.token);

    // Step 2: Create card product with JIT funding
    console.log('Step 2: Creating card product with JIT funding...');
    const cardProduct = await createCardProduct(fundingSource.token);
    console.log('✓ Card product created:', cardProduct.token);

    // Step 3: Create user
    console.log('Step 3: Creating user...');
    const user = await createUser();
    console.log('✓ User created:', user.token);

    // Step 4: Create virtual card
    console.log('Step 4: Creating virtual card...');
    const card = await createCard(user.token, cardProduct.token);
    console.log('✓ Card created:', card.token);

    // Step 5: Create velocity control
    console.log('Step 5: Creating velocity control...');
    const velocityControl = await createVelocityControl(user.token);
    console.log('✓ Velocity control created:', velocityControl.token);

    return {
      fundingSource,
      cardProduct,
      user,
      card,
      velocityControl,
      success: true
    };
  } catch (error: any) {
    console.error('JIT Funding setup failed:', error);
    return {
      success: false,
      error: error.error || error.message
    };
  }
}
