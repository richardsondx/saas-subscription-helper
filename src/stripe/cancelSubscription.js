// Handles cancellations or downgrades.

const stripe = require('stripe');
const { fetchUser } = require('../supabase');

async function cancelSubscription(config, email) {
    if (config.debug) console.log('[DEBUG] Starting subscription cancellation...');
    
    const stripeClient = stripe(config.stripeSecretKey);

    try {
        // Get user's current subscription details from Supabase
        const user = await fetchUser(config, email);
        if (!user) {
            throw new Error('User not found');
        }

        // Get customer's subscriptions from Stripe
        const customer = await stripeClient.customers.list({
            email: email,
            limit: 1
        });

        if (!customer.data.length) {
            throw new Error('No Stripe customer found for this email');
        }

        const subscriptions = await stripeClient.subscriptions.list({
            customer: customer.data[0].id,
            limit: 1,
            status: 'active'
        });

        if (!subscriptions.data.length) {
            throw new Error('No active subscription found');
        }

        // Cancel the subscription
        const subscription = await stripeClient.subscriptions.update(
            subscriptions.data[0].id,
            {
                cancel_at_period_end: true
            }
        );

        if (config.debug) {
            console.log('[DEBUG] Subscription cancelled successfully');
            console.log('[DEBUG] Subscription details:', subscription);
        }

        return { success: true, subscription };
    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error cancelling subscription:', error);
        }
        throw error;
    }
}

module.exports = cancelSubscription;
