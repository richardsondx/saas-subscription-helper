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
    debug: true,
    debugHeaders: false
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