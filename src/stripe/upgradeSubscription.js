// Handles user subscription upgrades.

const stripe = require('stripe');

async function upgradeSubscription(config, email, newPlan) {
    if (config.debug) console.log(`[DEBUG] Attempting to upgrade subscription for email: ${email} to plan: ${newPlan}`);
    
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

    if (config.debug) console.log(`[DEBUG] Updating subscription to new plan: ${newPlan}`);
    const updatedSubscription = await stripeClient.subscriptions.update(
        subscription.data[0].id,
        { items: [{ id: subscription.data[0].items.data[0].id, price: newPlan }] }
    );

    if (config.debug) console.log('[DEBUG] Subscription upgraded successfully');
    return updatedSubscription;
}

module.exports = upgradeSubscription;
