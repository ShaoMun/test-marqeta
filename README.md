# Marqeta Managed JIT Funding Implementation

This is a [Next.js](https://nextjs.org) project that demonstrates **Managed JIT (Just-In-Time) Funding** with the Marqeta Core API. It includes a complete virtual card system with automatic funding at transaction time.

## Overview

Managed JIT Funding automatically moves funds from a funding source into a cardholder's account at the time of transaction, based on spend controls. This eliminates the need to pre-fund cards.

### Process Flow

```
Merchant → Card Network → Marqeta Platform → JIT Funding → Cardholder Account
```

1. **Merchant** sends authorization message to card network
2. **Card Network** sends authorization message to Marqeta platform
3. **Marqeta Platform** validates authorization using spend controls
4. **If Valid** → Marqeta moves funds from funding source to cardholder's account
5. **Authorization Response** returns through the network to the merchant

## Features

- ✅ Program Funding Source setup
- ✅ Virtual Card Product with JIT funding configuration
- ✅ User (cardholder) creation
- ✅ Virtual card creation with auto-activation
- ✅ Velocity controls for spending limits (hard-coded to $100.00)
- ✅ Transaction simulation to verify JIT funding
- ✅ Real-time balance tracking
- ✅ Interactive web interface

## Configuration

### Hard-coded Balance

The user balance is hard-coded to **$100.00** by default. To change this, edit [lib/marqeta.ts](lib/marqeta.ts):

```typescript
// Change this value (in cents)
export const USER_BALANCE_LIMIT = 10000;  // $100.00
```

### API Credentials

Your Marqeta sandbox credentials are pre-configured in [lib/marqeta.ts](lib/marqeta.ts):
- **Application Token**: `be46425e-3a40-43c3-88c5-4d086d36f1c6`
- **Admin Access Token**: `179182fd-2702-402b-b091-986e90e486a5`
- **Base URL**: `https://sandbox-api.marqeta.com/v3`

**For production use**, create a `.env.local` file:

```env
MARQETA_APP_TOKEN=your_production_app_token
MARQETA_ADMIN_TOKEN=your_production_admin_token
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Valid Marqeta sandbox account
- npm or yarn package manager

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000/marqeta](http://localhost:3000/marqeta)

### Using the Interface

1. **Setup JIT Funding**: Click the "Setup JIT Funding" button to create:
   - Program funding source
   - Card product with JIT configuration
   - User (cardholder)
   - Virtual card
   - Velocity control (spending limit)

2. **View Card Details**: Your virtual card will be displayed with:
   - Card number (PAN)
   - CVV
   - Expiration date
   - Cardholder name

3. **Simulate Transaction**: Enter an amount and optionally a webhook endpoint, then click "Simulate Transaction"

4. **View Results**: See the transaction result and verify JIT funding was used

## Project Structure

```
test-marqeta/
├── lib/
│   └── marqeta.ts              # Marqeta API service layer
├── pages/
│   ├── api/
│   │   └── marqeta/
│   │       └── setup.ts        # API endpoint for Marqeta operations
│   ├── marqeta.tsx             # Virtual card management UI
│   └── index.tsx               # Home page
├── public/                     # Static assets
└── package.json
```

## API Endpoints

### `POST /api/marqeta/setup`

Handles all Marqeta operations:

**Actions:**

1. **Setup JIT Funding**
   ```json
   {
     "action": "setup"
   }
   ```

2. **Simulate Transaction**
   ```json
   {
     "action": "simulate",
     "cardToken": "card_001",
     "amount": 10.00,
     "webhookEndpoint": "https://webhook.site/your-id"
   }
   ```

3. **Get User Balance**
   ```json
   {
     "action": "balance",
     "userToken": "user_001"
   }
   ```

## Customization

### Changing the Balance Limit

Edit [lib/marqeta.ts](lib/marqeta.ts):

```typescript
// For $500.00 limit
export const USER_BALANCE_LIMIT = 50000;  // Amount in cents
```

### Modifying User Details

Edit the `createUser()` function in [lib/marqeta.ts](lib/marqeta.ts):

```typescript
const data = {
  token,
  first_name: 'Jane',      // Change first name
  last_name: 'Smith',      // Change last name
  email: 'jane@example.com', // Change email
  metadata: {
    balance_limit: USER_BALANCE_LIMIT
  }
};
```

### Using Your Own Webhook

Replace the webhook endpoint in the transaction form or API call:

```json
{
  "webhookEndpoint": "https://your-domain.com/webhooks/marqeta"
}
```

## Key Resources

- [Core API Quick Start](https://www.marqeta.com/docs/developer-guides/core-api-quick-start/)
- [Configuring Managed JIT Funding](https://www.marqeta.com/docs/developer-guides/configuring-managed-jit-funding/)
- [Marqeta Developer Dashboard](https://marqeta.com/)

## Error Handling

The application includes comprehensive error handling:

- API errors are displayed in the UI
- Failed transactions show detailed error messages
- Console logs provide debugging information

Common issues:
- **Invalid credentials**: Check your Marqeta API tokens
- **Network errors**: Verify your internet connection
- **Sandbox unavailable**: Marqeta sandbox may be temporarily down

## Security Notes

⚠️ **Important Security Considerations**:

- **Never commit API credentials to version control**
- Use environment variables for production deployments
- Rotate credentials regularly
- Implement proper webhook authentication in production
- Use HTTPS for all API communications
- Add rate limiting to your API routes
- Validate and sanitize all user inputs

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Build the application:

```bash
npm run build
npm start
```

## License

MIT

## Support

For issues or questions:
- Marqeta Developer Documentation: https://www.marqeta.com/docs/
- Marqeta Support: Contact through your Marqeta dashboard

## Learn More About Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
