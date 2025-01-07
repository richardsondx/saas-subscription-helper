const stripe = require('stripe');

async function fetchSubscription(config, email) {
    if (config.debug) console.log('[DEBUG] Fetching subscription details from Stripe...');
    
    const stripeClient = stripe(config.stripeSecretKey);

    try {
        // Get customer from Stripe
        const customers = await stripeClient.customers.list({
            email: email,
            limit: 1
        });

        if (!customers.data.length) {
            if (config.debug) console.log('[DEBUG] No Stripe customer found for email:', email);
            return null;
        }

        // Get active subscription
        const subscriptions = await stripeClient.subscriptions.list({
            customer: customers.data[0].id,
            limit: 1,
            status: 'active'
        });

        if (!subscriptions.data.length) {
            if (config.debug) console.log('[DEBUG] No active subscription found for customer');
            return null;
        }

        const subscription = subscriptions.data[0];

        if (config.debug) {
            console.log('[DEBUG] Found subscription:', {
                id: subscription.id,
                status: subscription.status,
                plan: subscription.items.data[0].price.id,
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            });
        }

        return subscription;
    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error fetching subscription:', error);
        }
        throw error;
    }
}

module.exports = fetchSubscription; 