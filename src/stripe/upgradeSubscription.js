// Handles user subscription upgrades.

const stripe = require('stripe');
const { fetchUser } = require('../supabase');

async function upgradeSubscription(config, email, newPriceId) {
    if (config.debug) console.log('[DEBUG] Starting subscription upgrade...');
    
    const stripeClient = stripe(config.stripeSecretKey);

    try {
        // Get user's current subscription details
        const user = await fetchUser(config, email);
        if (!user) {
            throw new Error('User not found');
        }

        // Find customer in Stripe
        const customer = await stripeClient.customers.search({
            query: `email:'${email}'`,
        });

        if (!customer.data.length) {
            throw new Error('No Stripe customer found for this email');
        }

        // Get active subscription
        const subscriptions = await stripeClient.subscriptions.list({
            customer: customer.data[0].id,
            status: 'active',
            limit: 1
        });

        if (!subscriptions.data.length) {
            throw new Error('Active subscription not found');
        }

        // Update the subscription
        const subscription = await stripeClient.subscriptions.update(
            subscriptions.data[0].id,
            {
                items: [{
                    id: subscriptions.data[0].items.data[0].id,
                    price: newPriceId
                }],
                proration_behavior: 'always_invoice'
            }
        );

        return {
            success: true,
            subscription
        };
    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error in subscription upgrade:', error);
        }
        throw error;
    }
}

module.exports = upgradeSubscription;
