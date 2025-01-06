
# Payment Integration Setup: SaaS Subscription Helper with Next.js and React.js

This guide outlines the specific changes needed in your **Next.js** or **React.js** project to integrate payment functionality using Stripe Payment Links and SaaS Subscription Helper.

---

## **Next.js Integration**

### Required Changes

1. **Webhook Handling**
   Add a webhook handler in `pages/api/webhooks.js` to process Stripe events.

   ```javascript
    import SubscriptionHelper from "saas-subscription-helper";

    const subscriptionHelper = new SubscriptionHelper({
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY,
        table: "profiles", // Optional: defaults to 'users'
        emailField: "email", // Optional: defaults to 'email'
        subscriptionField: "subscription_status", // Optional: defaults to 'subscription_status'
    });

    export async function POST(req) {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    try {
        const response = await subscriptionHelper.handleWebhooks(rawBody, signature);
        return new Response(JSON.stringify({ received: true }), {
        status: 200,
        });
    } catch (err) {
        console.error('Error processing webhook:', err);
        return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        });
    }
    }

    export const config = {
        api: {
            bodyParser: false,
        },
    };

   ```

2. **Redirect Handling**
   Add a page to handle Stripe Payment Link success redirects, such as `pages/subscription-callback.js`.

   ```javascript
   export default function SubscriptionCallback() {
       return (
           <div>
               <h1>Subscription Successful!</h1>
               <p>You will be redirected shortly.</p>
           </div>
       );
   }
   ```

3. **Environment Variables**
   Update your `.env` file with the required configuration:

   ```plaintext
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   SUPABASE_URL=https://your_supabase_url.supabase.co
   SUPABASE_KEY=your_supabase_service_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

---

## **React.js Integration**

### Required Changes

1. **Webhook Handling (Server-Side)**
   Set up a backend server (e.g., Express) to handle Stripe webhooks. Example in `server.js`:

   ```javascript
   const express = require('express');
   const bodyParser = require('body-parser');
   const SubscriptionHelper = require('saas-subscription-helper');

   const subscriptionHelper = new SubscriptionHelper({
       stripeApiKey: process.env.STRIPE_SECRET_KEY,
       supabaseUrl: process.env.SUPABASE_URL,
       supabaseKey: process.env.SUPABASE_KEY,
       table: 'users',
       emailField: 'email',
       subscriptionField: 'subscription_status',
   });

   const app = express();

   app.post('/webhooks', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
       try {
           const result = await subscriptionHelper.handleWebhooks(req);
           res.status(200).send(result);
       } catch (error) {
           console.error('Webhook error:', error.message);
           res.status(400).send('Webhook error');
       }
   });

   app.listen(3001, () => console.log('Server listening on http://localhost:3001'));
   ```

2. **Environment Variables**
   Update your `.env` file with the required configuration:

   ```plaintext
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   SUPABASE_URL=https://your_supabase_url.supabase.co
   SUPABASE_KEY=your_supabase_service_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

## **React.js Integration with Supabase Edge Functions**

1. Set Up Supabase Edge Functions
Install the Supabase CLI:

```bash
npm install -g supabase
```

2. Initialize your Supabase project:

```bash
supabase init
```

3. Create a new Edge Function for handling Stripe webhooks:

```bash
supabase functions new stripe-webhook
```

2. Implement the Edge Function

Edit the newly created file in supabase/functions/stripe-webhook/index.ts.

Here’s the implementation:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import SubscriptionHelper from "https://esm.sh/saas-subscription-helper";

const subscriptionHelper = new SubscriptionHelper({
  stripeApiKey: Deno.env.get("STRIPE_SECRET_KEY") || "",
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  supabaseKey: Deno.env.get("SUPABASE_KEY") || "",
  table: "users",
  emailField: "email",
  subscriptionField: "subscription_status",
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSignature = req.headers.get("stripe-signature");

  if (!stripeSignature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  try {
    // Parse the raw body
    const body = await req.text();

    // Handle webhook using SubscriptionHelper
    const result = await subscriptionHelper.handleWebhooks({
      body,
      headers: {
        "stripe-signature": stripeSignature,
      },
    });

    console.log("Webhook handled successfully:", result);
    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook error", { status: 400 });
  }
});
```

3. Deploy the Edge Function
Deploy your function to Supabase:

```bash
supabase functions deploy stripe-webhook
```

4. Configure the Webhook in Stripe

Go to the Stripe Dashboard > Developers > Webhooks.
Add the deployed Edge Function URL as your webhook endpoint. Example:
```
https://your-supabase-instance.supabase.co/functions/v1/stripe-webhook
```

Subscribe to relevant events:

- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded

Add your Stripe Webhook Secret to the environment variables in Supabase:

Go to the Supabase Dashboard > Project Settings > Environment Variables.

```plaintext
STRIPE_SECRET_KEY=sk_test_your_secret_key
SUPABASE_URL=https://your_supabase_instance.supabase.co
SUPABASE_KEY=your_supabase_service_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

5. Test the Webhook

Use the Stripe CLI to test the webhook:
```bash
stripe listen --forward-to https://your-supabase-instance.supabase.co/functions/v1/stripe-webhook
```

Trigger a test event:
```bash
stripe trigger customer.subscription.updated
```

Check the Supabase logs to confirm the function was executed:
```bash
supabase logs functions
```