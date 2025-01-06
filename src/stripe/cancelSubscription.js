// Handles cancellations or downgrades.

const stripe = require('stripe');

async function cancelSubscription(config, email) {
    if (config.debug) console.log(`[DEBUG] Attempting to cancel subscription for email: ${email}`);
    
    const stripeClient = stripe(config.stripeApiKey);
    
    if (config.debug) console.log('[DEBUG] Searching for customer in Stripe...');
    const customer = await stripeClient.customers.search({
        query: `email:'${email}'`,
    });

    if (customer.data.length === 0) {
        if (config.debug) console.log('[DEBUG] Customer not found in Stripe');
        throw new Error('Customer not found');
    }
    
    if (config.debug) console.log('[DEBUG] Found customer, fetching active subscriptions...');
    const subscription = await stripeClient.subscriptions.list({
        customer: customer.data[0].id,
        status: 'active',
    });

    if (subscription.data.length === 0) {
        if (config.debug) console.log('[DEBUG] No active subscription found');
        throw new Error('Active subscription not found');
    }

    if (config.debug) console.log(`[DEBUG] Cancelling subscription: ${subscription.data[0].id}`);
    await stripeClient.subscriptions.del(subscription.data[0].id);
    
    if (config.debug) console.log('[DEBUG] Subscription cancelled successfully');
    return { success: true };
}

module.exports = cancelSubscription;
