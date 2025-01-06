import { NextResponse } from 'next/server';
import { SubscriptionHelper } from 'saas-subscription-helper';

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

export async function POST(request) {
    try {
        // First log to verify the route is being hit
        console.log('DEBUG: Webhook endpoint hit');

        // Get the raw request body first
        const rawBody = await request.text();
        
        // Log all headers to debug
        const allHeaders = Object.fromEntries(request.headers.entries());
        console.log('DEBUG: All headers:', allHeaders);
        console.log('DEBUG: Raw body length:', rawBody.length);

        // Get the signature header
        const sig = allHeaders['stripe-signature'];
        console.log('DEBUG: Stripe signature:', sig);

        if (!sig) {
            console.error('Missing Stripe signature. Available headers:', Object.keys(allHeaders));
            return NextResponse.json(
                { error: 'No stripe signature found in request headers' },
                { status: 400 }
            );
        }

        // Pass the raw body and signature to the handler
        const result = await subscriptionHelper.handleWebhooks(
            subscriptionHelper.config,
            {
                body: rawBody,
                signature: sig
            }
        );

        if (!result.success) {
            console.error('Webhook error:', result.error);
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Full webhook error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
} 