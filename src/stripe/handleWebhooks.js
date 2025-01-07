// Processes Stripe webhooks for subscription updates.

const stripe = require('stripe');
const updateUser = require('../supabase/updateUser');

async function handleWebhooks(config, req) {
    if (config.debug) console.log('[DEBUG] Starting webhook processing...');
    
    const stripeClient = stripe(config.stripeSecretKey);
    
    const { rawBody, stripeSignature, headers } = req;

    if (config.debug && config.debugHeaders && headers) {
        console.log('[DEBUG] Received headers:', headers);
    }

    if (!stripeSignature) {
        if (config.debug) {
            console.log('[DEBUG] Error: Missing Stripe signature');
            if (headers && config.debugHeaders) {
                console.log('Available headers:', Object.keys(headers));
            }
        }
        throw new Error('No Stripe signature found in request');
    }

    if (!rawBody) {
        if (config.debug) console.log('[DEBUG] Error: Missing raw request body');
        throw new Error('No request body found');
    }

    if (config.debug) {
        console.log('[DEBUG] Verifying webhook:');
        console.log('- Signature:', stripeSignature);
        console.log('- Secret starts with:', config.stripeWebhookSecret?.slice(0, 8));
        console.log('- Raw body length:', rawBody.length);
        try {
            // Try to parse and log the body for debugging
            const parsedBody = JSON.parse(rawBody);
            console.log('- Event type:', parsedBody.type);
        } catch (e) {
            console.log('- Could not parse body for debugging');
        }
    }

    try {
        const event = stripeClient.webhooks.constructEvent(
            rawBody,
            stripeSignature,
            config.stripeWebhookSecret
        );

        if (config.debug) console.log(`[DEBUG] Processing event: ${event.type}`);

        // Handle new subscription creation from payment link
        if (event.type === 'customer.subscription.created') {
            const newSubscription = event.data.object;
            const customer = await stripeClient.customers.retrieve(newSubscription.customer);
            
            // Check for other active subscriptions that need cancellation
            const existingSubscriptions = await stripeClient.subscriptions.list({
                customer: newSubscription.customer,
                status: 'active'
            });

            // Cancel any old subscriptions immediately if we find a new one
            for (const sub of existingSubscriptions.data) {
                if (sub.id !== newSubscription.id) {
                    await stripeClient.subscriptions.cancel(sub.id, {
                        prorate: true
                    });
                }
            }
        }

        if (event.type === 'customer.subscription.updated' || 
            event.type === 'customer.subscription.deleted' ||
            event.type === 'customer.subscription.cancelled') {
            try {
                const subscription = event.data.object;
                const email = subscription.customer_email ||
                             (await stripeClient.customers.retrieve(subscription.customer)).email;
                
                // Get the correct status - important for cancellations
                const status = subscription.cancel_at_period_end ? 'canceled' : subscription.status;
                const plan = subscription.items.data[0].price.id;

                if (!email) {
                    if (config.debug) console.log('[DEBUG] Error: No email found in webhook data');
                    throw new Error('No email found in webhook data');
                }

                const updateData = {
                    [config.subscriptionField]: status,
                    [config.planField || 'plan']: plan
                };

                // Add trial status if configured
                if (config.syncedStripeFields?.trial) {
                    updateData.trial = !!subscription.trial_end;
                    if (subscription.trial_end) {
                        updateData.trial_end = new Date(subscription.trial_end * 1000);
                    }
                }

                if (config.debug) {
                    console.log(`[DEBUG] Updating user subscription details:`);
                    console.log(`- Email: ${email}`);
                    console.log(`- Status: ${status}`);
                    console.log(`- Plan: ${plan}`);
                    if (subscription.trial_end) {
                        console.log(`- Trial ends: ${new Date(subscription.trial_end * 1000)}`);
                    }
                    console.log(`- Cancel at period end: ${subscription.cancel_at_period_end}`);
                    console.log(`- Event type: ${event.type}`);
                }

                const result = await updateUser(config, email, updateData);
                
                if (config.debug) {
                    console.log('[DEBUG] Update operation result:', result);
                }

                if (config.debug) console.log('[DEBUG] Successfully updated user subscription details');
            } catch (error) {
                if (config.debug) {
                    console.error('[DEBUG] Error in subscription update:', {
                        message: error.message,
                        stack: error.stack,
                        details: error.details
                    });
                }
                throw error;
            }
        }

        return { success: true };
    } catch (error) {
        if (config.debug) {
            console.log('[DEBUG] Error processing webhook:');
            console.log(error.message);
        }
        return { success: false, error: error.message };
    }
}

module.exports = handleWebhooks;
