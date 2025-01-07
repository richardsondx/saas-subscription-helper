const stripe = require('stripe');
const { fetchUser } = require('../supabase');

async function changePlan(config, email, newPriceId, options = {}) {
    if (config.debug) console.log('[DEBUG] Starting plan change process...');
    
    const stripeClient = stripe(config.stripeSecretKey);

    try {
        // Get user's current subscription details
        const user = await fetchUser(config, email);
        if (!user) {
            throw new Error('User not found');
        }

        // Get customer's current subscription
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
            if (config.debug) console.log('[DEBUG] No active subscription found');
            return {
                action: 'USE_PAYMENT_LINK',
                customerId: customer.data[0].id
            };
        }

        const currentSubscription = subscriptions.data[0];
        const currentPriceId = currentSubscription.items.data[0].price.id;

        // Don't process if trying to change to the same plan
        if (currentPriceId === newPriceId) {
            if (config.debug) console.log('[DEBUG] User already on this plan');
            return {
                action: 'ALREADY_ON_PLAN',
                subscriptionId: currentSubscription.id
            };
        }

        // Determine if this is an upgrade or downgrade
        const currentPrice = await stripeClient.prices.retrieve(currentPriceId);
        const newPrice = await stripeClient.prices.retrieve(newPriceId);
        const isUpgrade = newPrice.unit_amount > currentPrice.unit_amount;

        // Set proration behavior based on direction and config
        const prorationBehavior = config.prorationBehavior || 
                                (isUpgrade ? 'create_prorations' : 'always_invoice');

        // Prepare update parameters
        const updateParams = {
            items: [{
                id: currentSubscription.items.data[0].id,
                price: newPriceId,
            }],
            proration_behavior: prorationBehavior,
        };

        // Handle trial period preservation if configured
        if (config.preserveTrialPeriods && currentSubscription.trial_end) {
            const remainingTrialDays = Math.ceil(
                (currentSubscription.trial_end - Date.now() / 1000) / 86400
            );
            
            if (remainingTrialDays > 0) {
                if (config.debug) console.log(`[DEBUG] Preserving trial period: ${remainingTrialDays} days`);
                updateParams.trial_period_days = remainingTrialDays;

                // Update trial status in Supabase if configured
                if (config.syncedStripeFields?.trial) {
                    await updateUser(config, email, {
                        trial: true,
                        trial_end: new Date(currentSubscription.trial_end * 1000)
                    });
                }
            }
        }

        // Update the subscription
        const updatedSubscription = await stripeClient.subscriptions.update(
            currentSubscription.id,
            updateParams
        );

        if (config.debug) {
            console.log('[DEBUG] Plan change successful');
            console.log('- From:', currentPriceId);
            console.log('- To:', newPriceId);
            console.log('- Proration:', prorationBehavior);
            console.log('- Updated subscription:', updatedSubscription.id);
        }

        return {
            action: 'PLAN_CHANGED',
            subscriptionId: updatedSubscription.id,
            proration: prorationBehavior,
            effectiveDate: new Date(updatedSubscription.current_period_end * 1000)
        };

    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error in plan change:', error);
        }
        throw error;
    }
}

module.exports = changePlan; 