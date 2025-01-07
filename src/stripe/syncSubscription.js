const stripe = require('stripe');
const { fetchUser, updateUser } = require('../supabase');
const fetchSubscription = require('./fetchSubscription');

async function syncSubscription(config, email) {
    if (config.debug) console.log('[DEBUG] Starting subscription sync...');

    try {
        // Get current data from both services
        const [supabaseUser, stripeSubscription] = await Promise.all([
            fetchUser(config, email),
            fetchSubscription(config, email)
        ]);

        if (!supabaseUser) {
            throw new Error('User not found in Supabase');
        }

        // Determine the correct status and plan
        let status, plan;

        if (stripeSubscription) {
            status = stripeSubscription.cancel_at_period_end ? 'canceled' : stripeSubscription.status;
            plan = stripeSubscription.items.data[0].price.id;
        } else {
            status = 'inactive';
            plan = null;
        }

        // Check if update is needed
        const currentStatus = supabaseUser[config.subscriptionField];
        const currentPlan = supabaseUser[config.planField || 'plan'];

        if (currentStatus !== status || currentPlan !== plan) {
            if (config.debug) {
                console.log('[DEBUG] Subscription data mismatch detected:');
                console.log('Supabase:', { status: currentStatus, plan: currentPlan });
                console.log('Stripe:', { status, plan });
            }

            // Update Supabase with Stripe data
            const updateData = {
                [config.subscriptionField]: status,
                [config.planField || 'plan']: plan
            };

            const result = await updateUser(config, email, updateData);

            if (config.debug) {
                console.log('[DEBUG] Subscription synced successfully');
                console.log('[DEBUG] Update result:', result);
            }

            return {
                success: true,
                synced: true,
                previous: { status: currentStatus, plan: currentPlan },
                current: { status, plan }
            };
        }

        if (config.debug) {
            console.log('[DEBUG] Subscription data already in sync');
        }

        return {
            success: true,
            synced: false,
            current: { status, plan }
        };

    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error syncing subscription:', error);
        }
        throw error;
    }
}

module.exports = syncSubscription; 