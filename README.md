# SaaS Subscription Helper 🚧 (in development)

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" height="40" style="margin-right: 20px"/>
  <img src="https://images.seeklogo.com/logo-png/43/1/supabase-logo-png_seeklogo-435677.png?v=1957124687587900112" alt="Supabase" height="40"/>
</p>

⚠️ This is not production ready yet.

SaaS Subscription Helper is an open-source Node.js package designed to streamline Stripe and Supabase integration in your SaaS applications. It focuses on handling subscription updates, cancellations, and syncing data with your database.

## Features
- **Stripe Webhook Handling:** Automatically update subscription data in your Supabase table.
- **Manage Upgrades and Downgrades:** Simplify logic for user-initiated subscription changes.
- **Supabase Integration:** Keep your database in sync with Stripe for subscription status and plans.
- **Minimal Setup:** Focus only on what's essential—5-minute setup!

### How It Works ( A 5 minute setup)

1. Install the package 📦
2. Add environment variables for Stripe and Supabase 🔑
3. Set Up Webhook Endpoint 🔄
4. Create Payment Links in Stripe, add the links to your app 💳
DONE ✅ ☕️

The experience is seamless for you and your users:
- User Pays via Payment Link: You can easily create payment links in Stripe, where the user's email is captured.
- Stripe Webhook Triggers: Stripe sends updates (e.g., subscription.updated) to your webhook endpoint which the package handles for you.
- Helper Syncs Supabase: The package updates your Supabase table with the user's subscription details, keeping your app in sync.
- Subscriptions Management: Adding upgrade, dowgrade and cancellation logic is as easy as adding a link to your app.


▶️ View test project where we used the package here: https://github.com/richardsondx/subscription-helper-demo
[![Image from Gyazo](https://i.gyazo.com/2c75e13f6e5dcbb62e076b19ea71b4d6.png)](https://gyazo.com/2c75e13f6e5dcbb62e076b19ea71b4d6)

## Installation


```bash
npm install saas-subscription-helper
```

Make sure you have the following dependencies installed:

```bash
npm install stripe
npm install @supabase/supabase-js
```

## Quick Setup

### 1. Initialize the Helper

```javascript
const SubscriptionHelper = require('saas-subscription-helper');

const subscriptionHelper = new SubscriptionHelper({
    stripeApiKey: 'your-stripe-secret-key',
    supabaseUrl: 'https://your-supabase-url.supabase.co',
    supabaseKey: 'your-supabase-service-key',
    table: 'users',
    emailField: 'email',
    subscriptionField: 'subscription_status',
});
```

Make sure you have an .env file in the root of your project with the following variables:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key
SUPABASE_URL=https://your_supabase_instance.supabase.co
SUPABASE_KEY=your_supabase_service_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 2. Create a Payment Link

[![Image from Gyazo](https://i.gyazo.com/d08642d79c353807e8b429a0e1b2ad47.png)](https://gyazo.com/d08642d79c353807e8b429a0e1b2ad47)

Stripe Payment Links allow you to generate URLs for your subscription plans.

Here’s how to set them up for development and production environments.

#### Development:
1. Go to the Stripe Dashboard (Test Mode).
2. Create a Payment Link:
- Set up your products and pricing.
- Generate a Payment Link.
3. Set the Success URL:
- Success URL: http://localhost:3000/subscription-callback

#### Production:
1. Switch to Live Mode in the Stripe Dashboard.
2. Create a Payment Link:
- Use your production products and pricing.
- Generate a Payment Link.
3. Set the Success URLx:
- Success URL: https://yourdomain.com/subscription-callback

In both environments, the success URL should redirect to your app, where users can complete onboarding after payment.

[![Image from Gyazo](https://i.gyazo.com/f63114a6963fd8cccffb3d06b44a0350.png)](https://gyazo.com/f63114a6963fd8cccffb3d06b44a0350)

### 3. Set Up Webhooks

#### Next.js App Router (13+)
```javascript
// app/api/webhooks/route.js
import { NextResponse } from 'next/server';
import SubscriptionHelper from 'saas-subscription-helper';

const subscriptionHelper = new SubscriptionHelper({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    table: "profiles",
    emailField: "email",
    subscriptionField: "subscription_status",
    debug: true,           // Enable debug logging
    debugHeaders: false    // Keep webhook headers private
});

export async function POST(req) {
    const rawBody = await req.text();
    const stripeSignature = req.headers.get("stripe-signature");

    try {
        const response = await subscriptionHelper.handleWebhooks({
            rawBody,
            stripeSignature,
            headers: Object.fromEntries(req.headers)
        });
        
        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('Error processing webhook:', err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
```

#### React with Express Backend
```javascript
// server.js
const express = require('express');
const SubscriptionHelper = require('saas-subscription-helper');

const subscriptionHelper = new SubscriptionHelper({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    table: "profiles",
    emailField: "email",
    subscriptionField: "subscription_status",
    debug: true
});

const app = express();

// Important: Use raw body for Stripe
app.post('/api/webhooks', 
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        try {
            const response = await subscriptionHelper.handleWebhooks({
                rawBody: req.body,
                stripeSignature: req.headers['stripe-signature'],
                headers: req.headers
            });
            res.json({ received: true });
        } catch (err) {
            console.error('Webhook error:', err);
            res.status(400).json({ error: err.message });
        }
    }
);

app.listen(3001);
```

#### React with Supabase Edge Functions
```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SubscriptionHelper } from 'saas-subscription-helper'

const subscriptionHelper = new SubscriptionHelper({
    stripeSecretKey: Deno.env.get('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    supabaseUrl: Deno.env.get('SUPABASE_URL'),
    supabaseKey: Deno.env.get('SUPABASE_KEY'),
    table: "profiles",
    emailField: "email",
    subscriptionField: "subscription_status"
})

serve(async (req) => {
    try {
        const body = await req.text()
        
        const response = await subscriptionHelper.handleWebhooks({
            rawBody: body,
            stripeSignature: req.headers.get('stripe-signature'),
            headers: Object.fromEntries(req.headers)
        })
        
        return new Response(JSON.stringify({ received: true }))
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }), 
            { status: 400 }
        )
    }
})
```

Deploy your Edge Function:
```bash
supabase functions deploy stripe-webhook
```

**Note:** For both setups, configure your webhook URL in Stripe Dashboard:
- Express: `http://your-domain.com/api/webhooks`
- Edge Function: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`



#### Test the Webhook
```bash
stripe listen --forward-to localhost:3000/api/webhooks
```

This will print a webhook secret (whsec_xxx) that you should set as `STRIPE_WEBHOOK_SECRET` in your environment variables.

**Important Notes:**
- Use the webhook secret from `stripe listen` for local development
- Use the webhook secret from Stripe Dashboard for production
- Don't parse the request body before passing it to the webhook handler
- Keep the `stripe-signature` header intact
- Consider setting `debugHeaders: false` in production to keep webhook headers private

### 4. Manage Upgrades and Cancellations

All subscription management operations must be performed server-side for security. Here's how to implement upgrades and cancellations in different setups:

#### Upgrade Subscription
#### Next.js App Router (13+)
```javascript
// app/api/subscription/upgrade/route.js
import { NextResponse } from 'next/server';
import { SubscriptionHelper } from 'saas-subscription-helper';

export async function POST(req) {
    try {
        const { email, newPriceId } = await req.json();
        
        await subscriptionHelper.upgradeUserSubscription(email, newPriceId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
```

#### Cancel Subscription
```javascript
// app/api/subscription/cancel/route.js
export async function POST(req) {
    try {
        const { email } = await req.json();
        
        await subscriptionHelper.cancelUserSubscription(email);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
```

#### React with Express Backend
```javascript
// server.js
app.post('/api/subscription/upgrade', async (req, res) => {
    try {
        const { email, newPriceId } = req.body;
        
        await subscriptionHelper.upgradeUserSubscription(email, newPriceId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/subscription/cancel', async (req, res) => {
    try {
        const { email } = req.body;
        
        await subscriptionHelper.cancelUserSubscription(email);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
```

#### React with Supabase Edge Functions
```typescript
// supabase/functions/subscription-manage/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SubscriptionHelper } from 'saas-subscription-helper'

const subscriptionHelper = new SubscriptionHelper({
    stripeSecretKey: Deno.env.get('STRIPE_SECRET_KEY'),
    // ... other config
})

serve(async (req) => {
    try {
        const { action, email, newPriceId } = await req.json()
        
        if (action === 'upgrade') {
            await subscriptionHelper.upgradeUserSubscription(email, newPriceId)
        } else if (action === 'cancel') {
            await subscriptionHelper.cancelUserSubscription(email)
        }
        
        return new Response(JSON.stringify({ success: true }))
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }), 
            { status: 400 }
        )
    }
})
```

#### Client-Side Usage Example
```javascript
// React component example
function SubscriptionManager({ userEmail }) {
    const handleUpgrade = async (newPriceId) => {
        try {
            const res = await fetch('/api/subscription/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, newPriceId })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            // Handle success (e.g., show toast, redirect)
        } catch (error) {
            // Handle error
        }
    };

    const handleCancel = async () => {
        try {
            const res = await fetch('/api/subscription/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            // Handle success
        } catch (error) {
            // Handle error
        }
    };

    const handleDowngrade = async (newPriceId) => {
        try {
            const res = await fetch('/api/subscription/downgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, newPriceId })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            // Handle success
        } catch (error) {
            // Handle error
        }
    };

    return (
        <div>
            <button onClick={() => handleUpgrade('price_premium')}>
                Upgrade to Premium
            </button>
            <button onClick={() => handleDowngrade('price_basic')}>
                Downgrade to Basic
            </button>
            <button onClick={handleCancel}>
                Cancel Subscription
            </button>
        </div>
    );
}
```

For best practices and advanced configuration tips, see our [Best Practices Guide](./best_practise.md).

**Important Security Notes:**
- Never expose Stripe or Supabase keys on the client side
- Always verify user authentication before processing subscription changes
- Use environment variables for sensitive configuration
- Implement rate limiting on your subscription management endpoints

### Configuration

Required Fields:
- stripeSecretKey: Your Stripe secret key
- stripeWebhookSecret: The Stripe webhook signing secret
- supabaseUrl: Your Supabase project URL
- supabaseKey: Your Supabase service key
- table: The Supabase table storing user data
- emailField: The column in Supabase for user email
- subscriptionField: The column for subscription status

Optional Fields:
- planField: The column for storing plan/price IDs (default: 'plan')
- debug: Enable debug logging (default: false)
- debugHeaders: Log webhook headers (default: false, recommended false in production)
- prorationBehavior: Stripe proration behavior for subscription changes (default: 'always_invoice')
  - Options: 'always_invoice', 'create_prorations', 'none'
- syncedStripeFields: Additional Stripe fields to sync with your database (all default to false)
  - Available fields:
    - stripe_customer_id: The Stripe Customer ID
    - default_payment_method: The default payment method ID
    - payment_last4: Last 4 digits of the card/payment method
    - payment_brand: Card brand (visa, mastercard, etc.)
    - payment_exp_month: Card expiration month
    - payment_exp_year: Card expiration year
    - current_period_start: Subscription period start date
    - current_period_end: Subscription period end date
    - cancel_at_period_end: Whether subscription will cancel at period end
    - canceled_at: When the subscription was canceled
    - trial: Whether the subscription is in trial period
    - trial_start: Trial period start date
    - trial_end: Trial period end date
    - subscription_created_at: When the subscription was created

Example configuration:
```javascript
const subscriptionHelper = new SubscriptionHelper({
    // Required fields
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    table: "profiles",
    emailField: "email",
    subscriptionField: "subscription_status",
    
    // Optional fields
    planField: "stripe_plan",
    debug: true,
    debugHeaders: false,
    prorationBehavior: 'create_prorations',
    
    // OPTIONAL – Sync additional Stripe fields with your database
    syncedStripeFields: {
        stripe_customer_id: true,        // Store Stripe Customer ID
        payment_last4: true,             // Store last 4 digits of card
        payment_brand: true,             // Store card brand
        trial: true,                     // Track trial status
        current_period_end: true,        // Store subscription end date
        cancel_at_period_end: true,      // Store cancellation status
        trial_end: true                  // Store trial end date
    }
});
```

syncedStripeFields are all set to false by default, unless explicitly set to true in the configuration.

**Note:** When using `syncedStripeFields`, make sure your database table has the corresponding columns:

```sql
ALTER TABLE users 
    ADD COLUMN stripe_customer_id text,
    ADD COLUMN payment_last4 text,
    ADD COLUMN payment_brand text,
    ADD COLUMN payment_exp_month integer,
    ADD COLUMN payment_exp_year integer,
    ADD COLUMN trial boolean,
    ADD COLUMN current_period_end timestamp with time zone,
    ADD COLUMN cancel_at_period_end boolean,
    ADD COLUMN trial_end timestamp with time zone;
```

All `syncedStripeFields` default to `false` unless explicitly set to `true` in the configuration.

### Database Schema

By default, the library expects a table with the following structure (using default names):

```sql
CREATE TABLE users (
    -- Required columns
    email text PRIMARY KEY,           -- User's email (emailField)
    subscription_status text,         -- Subscription status (subscriptionField)
    plan text,                        -- Stripe plan/price ID (planField)
    
    -- Other columns can be added as needed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

Some fields are required, but you can customize the table and column names in the configuration:
You can customize the table and column names in the configuration:

```javascript
const subscriptionHelper = new SubscriptionHelper({
    // ... other config
    table: "profiles",              // Custom table name (default: 'users')
    emailField: "email",            // Custom email column (default: 'email')
    subscriptionField: "sub_status", // Custom status column (default: 'subscription_status')
    planField: "stripe_plan",       // Custom plan column (default: 'plan')
});
```

#### Column Descriptions:
- `email`: Stores the user's email address (used as identifier)
- `subscription_status`: Stores the Stripe subscription status (e.g., 'active', 'canceled')
- `plan`: Stores the Stripe Price ID of the current subscription plan


### Example with Debug Mode

```javascript
const subscriptionHelper = new SubscriptionHelper({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    table: "profiles",
    emailField: "email",
    subscriptionField: "subscription_status",
    debug: true  // Enable debug logging
});
```

When debug mode is enabled, you'll see detailed logs about:
- Stripe API calls and responses
- Supabase operations
- Webhook processing
- Subscription updates and cancellations
- Error details

### Helper Functions

- `upgradeUserSubscription(email, newPriceId)`: Upgrade a user's subscription to a new plan
- `cancelUserSubscription(email)`: Cancel a user's subscription
- `fetchSubscription(email)`: Fetch a user's subscription details from Stripe
- `changePlan(email, newPriceId)`: Change a user's subscription plan
- `syncSubscription(email)`: Sync a user's subscription details with Supabase

### File Structure

```
saas-subscription-helper/
├── src/
│   ├── index.js                  # Main entry point for the package
│   ├── stripe/
│   │   ├── handleWebhooks.js     # Handles Stripe webhook events
│   │   ├── upgradeSubscription.js # Logic for upgrading subscriptions
│   │   ├── cancelSubscription.js  # Logic for canceling subscriptions
│   │   ├── fetchSubscription.js   # Retrieves subscription details from Stripe
│   │   ├── changePlan.js         # Handles plan changes (upgrades/downgrades)
│   |   ├── syncSubscription.js   # Syncs Stripe subscription data with Supabase
│   │   └── index.js             # Exports Stripe-related functions
│   └── supabase/
│       ├── updateUser.js         # Updates user subscription data in Supabase
│       ├── fetchUser.js          # Fetches user data from Supabase
│       └── index.js             # Exports Supabase-related functions
│   └── utils/
│       ├── validateConfig.js     # Validates the configuration object
├── examples/
│   ├── react-server.js           # Example: Handling webhooks with a React backend
│   ├── nextjs-webhooks.js        # Example: Handling webhooks with Next.js API routes
├── README.md                     # Documentation for the package
├── package.json                  # NPM metadata and dependencies
├── LICENSE                       # MIT license file
├── .env                          # Environment variables for development (ignored in production)
└── .gitignore                    # Git ignored files and folders
```


### License
This project is licensed under the MIT License. See the [LICENSE.md](./LICENSE.md) file for details.

### Contributing
Contributions are welcome! Feel free to fork the repository and submit pull requests.

Author
Created by Richardson Dackam.
Follow me on GitHub.

